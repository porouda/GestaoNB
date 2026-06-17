import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import session from "express-session";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import admin from "firebase-admin";
import { initializeApp as adminInitializeApp, getApp as getAdminApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import axios from "axios";
import { initializeApp as initializeClientApp } from "firebase/app";
import { 
    initializeFirestore as initializeClientFirestore, 
    collection as clientCollection, 
    query as clientQuery, 
    where as clientWhere, 
    getDocs as clientGetDocs, 
    doc as clientDoc, 
    getDoc as clientGetDoc,
    setDoc as clientSetDoc,
    updateDoc as clientUpdateDoc,
    addDoc as clientAddDoc,
    serverTimestamp as clientServerTimestamp
} from "firebase/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega config do Firebase
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "firebase-applet-config.json"), "utf8"));

// Inicializa Firebase Admin (Bypasses security rules)
let adminApp;
try {
  adminApp = adminInitializeApp({
    projectId: firebaseConfig.projectId
  });
} catch (e: any) {
  if (e.code === 'app/duplicate-app') {
    adminApp = getAdminApp();
  } else {
    // Tenta inicializar sem config se falhar
    try {
      adminApp = adminInitializeApp();
    } catch (e2) {
      console.error("[SERVER] Failed to initialize Firebase Admin:", e2);
    }
  }
}

const adminDb = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);

// Test Admin DB on startup
(async () => {
  try {
    const testSnapshot = await adminDb.collection("staffs").limit(1).get();
    console.log(`[SERVER] Firebase Admin test: SUCCESS. Found ${testSnapshot.size} staffs.`);
  } catch (error: any) {
    console.error("[SERVER] Firebase Admin test: FAILED.", error.message);
  }
})();

// Inicializa Firebase CLIENT SDK para o servidor (Apenas para GETs/Checks se necessário, mas preferimos adminDb)
const clientApp = initializeClientApp(firebaseConfig);
const clientDb = initializeClientFirestore(clientApp, {
    experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId);

console.log("[SERVER] Firebase Admin initialized for Project:", firebaseConfig.projectId, "Database:", firebaseConfig.firestoreDatabaseId);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());
  
  // Configuração de sessão robusta para ambiente HTTPS com Proxy
  app.set('trust proxy', 1); 
  app.use(session({
    secret: "northbrasil-secret-2026",
    resave: true, // Forçar resave para garantir que a sessão persista
    saveUninitialized: true, // Forçar inicialização
    name: 'north_session',
    proxy: true,
    cookie: { 
        secure: true, // Deve ser true para SameSite: 'none' em iframes
        sameSite: 'none', // Essencial para iframes cross-site no AI Studio
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000 
    }
  }));

  // Rotas de conveniência para quem tenta acessar os .html antigos
  app.get("/login.html", (req, res) => res.redirect("/login"));
  app.get("/home.html", (req, res) => res.redirect("/"));
  app.get("/index.html", (req, res) => res.redirect("/"));

  // 1. API routes FIRST (Para login, logs, etc)
  // Helper to get user from session or fallback header
  const getSessionUser = (req: any) => {
    let u = req.session?.user;
    if (!u && req.headers['x-auth-user']) {
      try {
        u = JSON.parse(req.headers['x-auth-user'] as string);
      } catch (e) {}
    }
    return u;
  };

  app.post("/api/login-cpf", async (req, res) => {
    const { cpf, senha } = req.body;
    console.log(`[AUTH] Tentativa de login para CPF: ${cpf}`);
    
    if (!cpf || !senha) {
        return res.status(400).json({ status: "error", message: "Preencha todos os campos." });
    }

    const cpfClean = cpf.replace(/\D/g, '');
    console.log(`[AUTH] CPF limpo: ${cpfClean}`);

    try {
        // Tenta buscar pelo CPF limpo (apenas números)
        let q = clientQuery(clientCollection(clientDb, 'staffs'), clientWhere('cpf', '==', cpfClean));
        let snapshot = await clientGetDocs(q);
        console.log(`[AUTH] Busca 1 (limpo) retornou ${snapshot.size} documentos`);

        // Se não encontrar, tenta buscar com a formatação comum (000.000.000-00)
        if (snapshot.empty && cpfClean.length === 11) {
            const cpfFormatted = `${cpfClean.slice(0,3)}.${cpfClean.slice(3,6)}.${cpfClean.slice(6,9)}-${cpfClean.slice(9,11)}`;
            console.log(`[AUTH] Tentando busca 2 com formato: ${cpfFormatted}`);
            q = clientQuery(clientCollection(clientDb, 'staffs'), clientWhere('cpf', '==', cpfFormatted));
            snapshot = await clientGetDocs(q);
            console.log(`[AUTH] Busca 2 retornou ${snapshot.size} documentos`);
        }

        if (snapshot.empty) {
            console.warn(`[AUTH] Usuário não encontrado para CPF: ${cpf}`);
            return res.status(401).json({ status: "error", message: "Usuário não cadastrado." });
        }

        const staffDoc = snapshot.docs[0];
        const staff = staffDoc.data();
        const staffId = staffDoc.id;
        console.log(`[AUTH] Usuário encontrado: ${staff.nomeCompleto || staff.nome_completo} (ID: ${staffId})`);

        if (staff.ativo !== 'sim') {
            console.warn(`[AUTH] Conta inativa para ID: ${staffId}`);
            return res.status(401).json({ status: "error", message: "Sua conta está inativa." });
        }

        // Senha (hash bcrypt)
        let hash = staff.senha || "";
        console.log(`[AUTH] Hash encontrado: ${hash ? 'Sim' : 'Não'}`);
        
        if (hash.startsWith('$2y$')) {
            hash = hash.replace('$2y$', '$2a$');
        }

        if (!hash) {
            return res.status(401).json({ status: "error", message: "Senha não configurada para este acesso." });
        }

        const pMatch = await bcrypt.compare(senha, hash);
        console.log(`[AUTH] Comparação de senha: ${pMatch ? 'Sucesso' : 'Falha'}`);
        
        if (!pMatch) {
            return res.status(401).json({ status: "error", message: "Senha ou CPF incorretos." });
        }

        // Sucesso
        const nomeFinal = staff.nomeAbreviado || staff.nome_abreviado || (staff.nomeCompleto || staff.nome_completo ? (staff.nomeCompleto || staff.nome_completo).split(' ')[0] : 'Usuário');
        const nivelFinal = staff.nivel_acesso || staff.nivel || 'comum';

        const userSession = {
            id: staffId,
            nome: nomeFinal,
            nivel: nivelFinal,
            nivel_acesso: nivelFinal,
            perfil_id: staff.perfil_id || staff.perfil || 'staff_comum',
            customPermissions: staff.customPermissions || staff.excecoes_acesso || {},
            permissions: (nivelFinal === 'admin') ? ['all'] : (staff.permissions || [])
        };

        (req.session as any).user = userSession;
        
        // Salva a sessão e retorna o usuário explicitamente para o frontend salvar localmente
        req.session.save((err) => {
            if (err) {
                console.error("[AUTH] Erro ao salvar sessão:", err);
                return res.status(500).json({ status: "error", message: "Erro ao salvar sessão." });
            }
            console.log(`[AUTH] Sessão salva e token enviado para: ${nomeFinal}`);
            res.json({ 
                status: "success", 
                user: userSession, // Enviamos o usuário para o React salvar no LocalStorage
                redirect: "/" 
              });
          });

    } catch (fError: any) {
        console.error("[AUTH ERROR]", fError);
        res.status(500).json({ status: "error", message: "Erro interno no servidor.", details: fError.message });
    }
  });

  app.get("/api/check-session-node", async (req, res) => {
    const sessionUser = getSessionUser(req);
    
    if (sessionUser && sessionUser.id) {
      try {
        // Busca sempre do Firestore a versão em tempo real das permissões do usuário
        const staffDocRef = clientDoc(clientDb, 'staffs', sessionUser.id);
        const staffSnap = await clientGetDoc(staffDocRef);
        
        if (staffSnap.exists()) {
          const staff = staffSnap.data();
          const nomeFinal = staff.nomeAbreviado || staff.nome_abreviado || (staff.nomeCompleto || staff.nome_completo ? (staff.nomeCompleto || staff.nome_completo).split(' ')[0] : 'Usuário');
          const nivelFinal = staff.nivel_acesso || staff.nivel || 'comum';
          
          const updatedUser = {
            id: sessionUser.id,
            nome: nomeFinal,
            nivel: nivelFinal,
            nivel_acesso: nivelFinal,
            perfil_id: staff.perfil_id || staff.perfil || 'staff_comum',
            customPermissions: staff.customPermissions || staff.excecoes_acesso || {},
            permissions: (nivelFinal === 'admin') ? ['all'] : (staff.permissions || [])
          };
          
          // Sincroniza a sessão de cookie com os dados atualizados
          (req.session as any).user = updatedUser;
          
          console.log(`[AUTH] Check-session real-time synced for user: ${nomeFinal} | Perfil: ${updatedUser.perfil_id}`);
          return res.json({ status: "authorized", user: updatedUser });
        }
      } catch (dbErr) {
        console.error("[AUTH] Error checking real-time permissions for user:", dbErr);
      }
      
      // Fallback
      res.json({ status: "authorized", user: sessionUser });
    } else {
      res.status(401).json({ status: "unauthorized" });
    }
  });

  app.post("/api/logout-node", (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('north_session');
        res.json({ status: "success" });
    });
  });

  // TEMPORARY SEED ENDPOINT
  app.get("/api/seed-checklist", async (req, res) => {
    try {
      const csvPath = path.join(process.cwd(), 'master_checklist.csv');
      const content = fs.readFileSync(csvPath, 'utf-8');
      const lines = content.split('\n');
      const headerLine = lines[0];
      const headers = headerLine.split(';');

      const programs = headers.slice(0, 20).map(p => p.trim());
      const tasks: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(';');
        if (cols.length < 24) continue;

        const description = cols[24]?.trim();
        const phase = cols[23]?.trim();

        if (!description || description === 'DESCRIÇÃO') continue;

        const activePrograms: string[] = [];
        for (let pIdx = 0; pIdx < 20; pIdx++) {
          const val = cols[pIdx]?.toLowerCase().trim();
          if (val === 'x' || val === 's' || val === '?') {
            activePrograms.push(programs[pIdx]);
          }
        }

        if (activePrograms.length > 0) {
          tasks.push({
            descricao: description,
            fase: phase || 'Geral',
            programas: activePrograms,
            ordem: i
          });
        }
      }

      console.log(`[SEED] Found ${tasks.length} tasks. Starting upload...`);

      // Simple batch upload
      const batchSize = 100;
      for (let i = 0; i < tasks.length; i += batchSize) {
        const chunk = tasks.slice(i, i + batchSize);
        const writeBatch = adminDb.batch();

        chunk.forEach(task => {
          const docRef = adminDb.collection('checklist_templates').doc();
          writeBatch.set(docRef, task);
        });

        await writeBatch.commit();
        console.log(`[SEED] Uploaded tasks ${i + 1} to ${Math.min(i + batchSize, tasks.length)}`);
      }

      res.json({ status: "success", count: tasks.length });
    } catch (error: any) {
      console.error("[SEED ERROR]", error);
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.post("/api/staff-save", async (req, res) => {
      const { id, data } = req.body;
      const sessionUser = getSessionUser(req);
      
      const isAdmin = sessionUser && (sessionUser.nivel === 'admin' || sessionUser.nivel_acesso === 'admin' || sessionUser.role === 'admin' || sessionUser.email === 'northbrasil@northbrasil.com.br');
      
      if (!isAdmin) {
        return res.status(403).json({ status: "error", message: "Only admins can save staff records." });
      }
  
      try {
        const payload = { ...data };
        
        // Hash password if provided
        if (payload.senha && payload.senha.length >= 6) {
          const salt = await bcrypt.genSalt(10);
          payload.senha = await bcrypt.hash(payload.senha, salt);
        } else {
          delete payload.senha; // Don't overwrite if empty
        }
  
        payload.updatedAt = clientServerTimestamp();
        payload.updatedBy = sessionUser.nome || 'Admin';
  
        const staffColl = clientCollection(clientDb, "staffs");
  
        if (id) {
          await clientSetDoc(clientDoc(staffColl, id), payload, { merge: true });
          res.json({ status: "success", id });
        } else {
          payload.createdAt = clientServerTimestamp();
          const docRef = await clientAddDoc(staffColl, payload);
          res.json({ status: "success", id: docRef.id });
        }
      } catch (error: any) {
        console.error("[STAFF SAVE ERROR]", error);
        res.status(500).json({ status: "error", message: error.message });
      }
    });

  // HUBSPOT PREVIEW ENDPOINT
  app.get("/api/hubspot/preview", async (req, res) => {
    const accessToken = process.env.HUBSPOT_ACCESS_TOKEN;
    
    const sessionUser = getSessionUser(req);
    if (!sessionUser || sessionUser.nivel !== 'admin') {
      return res.status(403).json({ status: "error", message: "Only admins can perform sync." });
    }

    if (!accessToken) {
      return res.status(500).json({ status: "error", message: "HubSpot Access Token is not configured." });
    }

    try {
      console.log("[HUBSPOT] Fetching pipelines for stage translation...");
      // 1. Fetch Pipelines to map Stage ID -> Stage Label
      const pipelinesResponse = await axios.get("https://api.hubapi.com/crm/v3/pipelines/deals", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      const stageMap: Record<string, string> = {};
      pipelinesResponse.data.results.forEach((pipeline: any) => {
        pipeline.stages.forEach((stage: any) => {
          stageMap[stage.id] = stage.label;
        });
      });

      console.log("[HUBSPOT] Fetching latest deals using Search API (with pagination)...");
      let allDeals: any[] = [];
      let nextPageAfter = undefined;
      const MAX_DEALS = 200; // Limite solicitado pelo usuário

      while (allDeals.length < MAX_DEALS) {
        const searchPayload: any = {
          sorts: [
            {
              propertyName: "createdate",
              direction: "DESCENDING"
            }
          ],
          properties: [
            "dealname", 
            "dealstage", 
            "hs_object_id", 
            "data_do_evento", 
            "data_evento",
            "data_do_treinamento",
            "programa_nb_principal",
            "programa_nb",
            "programa",
            "produto",
            "participantes",
            "quantidade_de_participantes",
            "pax",
            "num_participantes",
            "local_do_evento",
            "local_evento",
            "cidade_do_evento",
            "cidade",
            "description",
            "observacoes",
            "obs",
            "associatedcontactids"
          ],
          associations: ["contacts"],
          limit: 100
        };

        if (nextPageAfter) {
          searchPayload.after = nextPageAfter;
        }

        const response = await axios.post("https://api.hubapi.com/crm/v3/objects/deals/search", searchPayload, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        const results = response.data.results || [];
        allDeals = [...allDeals, ...results];
        
        nextPageAfter = response.data.paging?.next?.after;
        
        console.log(`[HUBSPOT DEBUG] Fetched ${results.length} deals. Total: ${allDeals.length}`);
        
        if (!nextPageAfter || results.length < 100) break;
      }

      const deals = allDeals;
      console.log(`[HUBSPOT DEBUG] Final total found: ${deals.length} deals.`);
      
      // 3. Collect all contact IDs (from associations and legacy properties)
      const allContactIds = new Set<string>();
      const dealToContacts: Record<string, string[]> = {};

      deals.forEach((deal: any) => {
        dealToContacts[deal.id] = [];
        const contactAssocs = deal.associations?.contacts?.results || deal.associations?.contact?.results || [];
        contactAssocs.forEach((ca: any) => {
          const cid = String(ca.id);
          allContactIds.add(cid);
          dealToContacts[deal.id].push(cid);
        });

        // Legacy property fallback
        const propAssocIds = deal.properties?.associatedcontactids;
        if (propAssocIds && typeof propAssocIds === 'string') {
          propAssocIds.split(';').forEach(id => {
            const cleanId = id.trim();
            if (cleanId && !dealToContacts[deal.id].includes(cleanId)) {
              allContactIds.add(cleanId);
              dealToContacts[deal.id].push(cleanId);
            }
          });
        }
      });

      // 4. Fallback: Fetch missing associations using Associations API v3
      const dealsMissingAssocs = deals.filter((d: any) => dealToContacts[d.id].length === 0).map((d: any) => d.id);
      if (dealsMissingAssocs.length > 0) {
        console.log(`[HUBSPOT DEBUG] Fetching v3 associations for ${dealsMissingAssocs.length} deals...`);
        try {
          const assocBatchResponse = await axios.post("https://api.hubapi.com/crm/v3/associations/deals/contacts/batch/read", {
            inputs: dealsMissingAssocs.map(id => ({ id }))
          }, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });

          assocBatchResponse.data.results.forEach((assoc: any) => {
            const fromId = assoc.from.id;
            const toIds = assoc.to.map((t: any) => String(t.id));
            toIds.forEach((tid: string) => {
              allContactIds.add(tid);
              if (!dealToContacts[fromId].includes(tid)) {
                dealToContacts[fromId].push(tid);
              }
            });
          });
        } catch (assocErr) {
          console.error("[HUBSPOT ASSOC BATCH ERROR] Proceeding...");
        }
      }

      // 5. Fetch contact details in batches of 100 (HubSpot API limit)
      const contactMap: Record<string, string> = {};
      if (allContactIds.size > 0) {
        try {
          const contactIdsArray = Array.from(allContactIds);
          for (let i = 0; i < contactIdsArray.length; i += 100) {
            const batch = contactIdsArray.slice(i, i + 100);
            console.log(`[HUBSPOT DEBUG] Fetching contact batch ${i/100 + 1}...`);
            
            const contactBatchResponse = await axios.post("https://api.hubapi.com/crm/v3/objects/contacts/batch/read", {
              inputs: batch.map(id => ({ id })),
              properties: ["firstname", "lastname", "email", "phone", "mobilephone", "phone_number", "telefone", "num_telefone"]
            }, {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            
            contactBatchResponse.data.results.forEach((contact: any) => {
              const props = contact.properties;
              const firstName = props.firstname || '';
              const lastName = props.lastname || '';
              const name = `${firstName} ${lastName}`.trim() || props.email || `ID: ${contact.id}`;
              
              const email = props.email;
              const phone = props.phone || props.mobilephone || props.phone_number;
              
              let display = name;
              const details = [];
              if (email) details.push(email);
              if (phone) details.push(phone);
              
              if (details.length > 0) {
                display += ` (${details.join(' | ')})`;
              }
              contactMap[contact.id] = display;
            });
          }
        } catch (contactErr: any) {
          console.error("[HUBSPOT CONTACT FETCH ERROR]", contactErr.response?.data || contactErr.message);
        }
      }

      const mappedDeals = deals.map((deal: any) => {
        const props = deal.properties;
        const assocIds = dealToContacts[deal.id] || [];
        
        const contactNames = assocIds.map((id: string) => contactMap[id]).filter(Boolean).join(', ');
        const finalContacts = contactNames || (assocIds.length > 0 ? `IDs: ${assocIds.join(', ')}` : "Sem Contatos");
        
        return {
          hubspotId: deal.id,
          nome_negocio: props.dealname || "Sem Nome",
          etapa: stageMap[props.dealstage] || props.dealstage || "Não Definido",
          data_evento: props.data_do_evento || props.data_evento || props.data_do_treinamento || null,
          programa_nb: props.programa_nb_principal || props.programa_nb || props.programa || props.produto || props.nome_do_programa || null,
          participantes: props.participantes || props.quantidade_de_participantes || props.pax || props.num_participantes || props.numero_de_participantes || null,
          local_evento: props.local_do_evento || props.local_evento || props.local || props.venue || null,
          cidade: props.cidade_do_evento || props.cidade || props.city || null,
          observacoes: props.description || props.observacoes || props.obs || props.notes || null,
          contatos: finalContacts,
          raw_props_debug: Object.keys(props).filter(k => props[k]).slice(0, 15).join(', ')
        };
      });

      res.json({ status: "success", deals: mappedDeals });
    } catch (error: any) {
      console.error("[HUBSPOT PREVIEW ERROR]", error.response?.data || error.message);
      res.status(500).json({ status: "error", message: "Failed to fetch HubSpot deals", details: error.response?.data || error.message });
    }
  });

  // HUBSPOT SYNC ENDPOINT (Now expects a list of deals to sync)
  app.post("/api/hubspot/sync", async (req, res) => {
    const accessToken = process.env.HUBSPOT_ACCESS_TOKEN;
    const { deals } = req.body;

    const sessionUser = getSessionUser(req);
    if (!sessionUser || sessionUser.nivel !== 'admin') {
      return res.status(403).json({ status: "error", message: "Only admins can perform sync." });
    }

    if (!accessToken) {
      return res.status(500).json({ status: "error", message: "HubSpot Access Token is not configured." });
    }

    if (!deals || !Array.isArray(deals)) {
      return res.status(400).json({ status: "error", message: "No deals provided for sync." });
    }

    try {
      const results = { updated: 0, created: 0, errors: 0 };

      for (const dealData of deals) {
        try {
          const hubspotId = dealData.hubspotId;
          if (!hubspotId) continue;

          const trainingData: any = {
            hubspotId: String(hubspotId),
            nome_negocio: dealData.nome_negocio || "Sem Nome (HubSpot)",
            nomeNegocio: dealData.nome_negocio || "Sem Nome (HubSpot)",
            etapa: dealData.etapa || "Não Definido",
            dataEvento: dealData.data_evento || null,
            data_evento: dealData.data_evento || null,
            programa_nb: dealData.programa_nb || null,
            participantes: dealData.participantes || null,
            local_evento: dealData.local_evento || null,
            cidade: dealData.cidade || null,
            observacoes: dealData.observacoes || null,
            contatos: dealData.contatos || null,
            lastSyncedAt: clientServerTimestamp(),
          };

          const docId = String(hubspotId);
          const docRef = clientDoc(clientDb, "trainings", docId);
          const docSnap = await clientGetDoc(docRef);
          
          if (docSnap.exists()) {
            await clientUpdateDoc(docRef, trainingData);
            results.updated++;
          } else {
            // Se não encontrou pelo ID do documento, tenta buscar pelo campo hubspotId (legado)
            const q = clientQuery(clientCollection(clientDb, "trainings"), clientWhere("hubspotId", "==", String(hubspotId)));
            const qSnap = await clientGetDocs(q);
            
            if (!qSnap.empty) {
              await clientUpdateDoc(clientDoc(clientDb, "trainings", qSnap.docs[0].id), trainingData);
              results.updated++;
            } else {
              // Cria novo usando o ID do HubSpot como ID do documento
              await clientSetDoc(docRef, {
                ...trainingData,
                createdAt: clientServerTimestamp(),
              });
              results.created++;
            }
          }
        } catch (innerError: any) {
          console.error(`[HUBSPOT SYNC] Error syncing deal ${dealData.hubspotId}:`, innerError.message);
          results.errors++;
        }
      }

      console.log(`[HUBSPOT SYNC] Finished. Created: ${results.created}, Updated: ${results.updated}, Errors: ${results.errors}`);
      res.json({ status: "success", results });
    } catch (error: any) {
      console.error("[HUBSPOT SYNC CRITICAL ERROR]", error);
      res.status(500).json({ 
        status: "error", 
        message: "Failed to execute sync", 
        details: error.message 
      });
    }
  });

  // 2. Servir o React App (SPA Fallback)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Em produção, servimos o dist
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  // 3. Arquivos legados apenas se nada acima capturar (Fallback de recursos como imagens antigas)
  app.use(express.static(__dirname));

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} (Firebase Pure Mode)`);
  });
}

startServer();

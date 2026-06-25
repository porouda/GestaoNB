import { initializeApp } from "firebase/app";
import { initializeFirestore, doc, setDoc, deleteDoc, collection, getDocs, writeBatch } from "firebase/firestore";
import { readFileSync } from "fs";
import * as path from "path";

const firebaseConfig = JSON.parse(readFileSync("./firebase-applet-config.json", "utf-8"));

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId);

async function run() {
  console.log("Iniciando carregamento de arquivos particionados...");
  
  const parts = ["allocs_part1.json", "allocs_part2.json", "allocs_part3.json", "allocs_part4.json"];
  const allocations = [];

  for (const part of parts) {
    const filePath = path.join("./scripts", part);
    try {
      const data = JSON.parse(readFileSync(filePath, "utf-8"));
      allocations.push(...data);
      console.log(`Carregado ${part}: ${data.length} alocações.`);
    } catch (error) {
      console.error(`Erro ao carregar ${part}:`, error);
      process.exit(1);
    }
  }

  console.log(`Total de alocações encontradas nos JSONs: ${allocations.length}`);
  
  const colRef = collection(db, "allocations");
  
  // 1. Limpar as alocações legadas que estão salvas incorretamente com IDs numéricos sequenciais (por exemplo, "102")
  console.log("Esvaziando coleção 'allocations' atual...");
  const snapshot = await getDocs(colRef);
  console.log(`Encontrados ${snapshot.size} documentos para limpar.`);
  
  let countDeleted = 0;
  let batch = writeBatch(db);
  for (const docSnap of snapshot.docs) {
    batch.delete(docSnap.ref);
    countDeleted++;
    if (countDeleted % 400 === 0) {
      await batch.commit();
      console.log(`Deletados ${countDeleted} documentos de allocations...`);
      batch = writeBatch(db);
    }
  }
  if (countDeleted % 400 !== 0) {
    await batch.commit();
  }
  console.log("Limpeza de allocations concluída.");

  // 2. Importar novos dados no formato correto comercial e sincronizado
  console.log("Iniciando inserção de alocações com IDs determinísticos de formato padrão...");
  let countImported = 0;
  let writeBatchObj = writeBatch(db);

  for (const alloc of allocations) {
    const sId = String(alloc.staff_id || "").trim();
    let tId = String(alloc.treinamento_id || "").trim();
    if (tId === "null" || tId === "undefined") {
      tId = "";
    }

    const dateStr = alloc.data_alocacao || "2026-04-14"; // Fallback razoável
    
    // Constrói ID determinístico
    const isPool = !tId || tId.toLowerCase() === "pool" || tId.toLowerCase() === "diaria";
    const finalTrainingId = isPool ? "" : tId;
    const docId = isPool ? `pool_${dateStr}_${sId}` : `${finalTrainingId}_${sId}`;

    // Converte a string YYYY-MM-DD para Date em Meio-dia local para evitar fusos horários indesejados
    const dataObj = new Date(dateStr + "T12:00:00");

    const docRef = doc(db, "allocations", docId);
    writeBatchObj.set(docRef, {
      staff_id: sId,
      treinamento_id: finalTrainingId,
      data_alocacao: dataObj,
      status: alloc.status || "intencao",
      motivo_recusa: alloc.motivo_recusa || null,
      obs: "",
      updatedAt: new Date().toISOString()
    });

    countImported++;

    if (countImported % 400 === 0) {
      await writeBatchObj.commit();
      console.log(`Progresso: ${countImported} de ${allocations.length} alocações importadas...`);
      writeBatchObj = writeBatch(db);
    }
  }

  if (countImported % 400 !== 0) {
    await writeBatchObj.commit();
  }
  
  console.log(`Sucesso: ${countImported} alocações foram importadas com sucesso com IDs determinísticos e datas em Timestamp.`);
  process.exit(0);
}

run().catch(err => {
  console.error("Erro na importação:", err);
  process.exit(1);
});

import { initializeApp } from "firebase/app";
import { initializeFirestore, doc, setDoc, collection, getDocs, writeBatch } from "firebase/firestore";
import { readFileSync } from "fs";

const firebaseConfig = JSON.parse(readFileSync("./firebase-applet-config.json", "utf-8"));

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);

const trainings = [
    {
        "bombeiro": null,
        "cidade": "SÃO PAULO",
        "contatos": "Mayara  Grancieri (mayara.grancieri@portoseguro.com.br);Caio Servino (caio.servino@portoseguro.com.br)",
        "coordenador_evento": null,
        "coordenador_interno": null,
        "coordenador_montagem": null,
        "data_evento": "2025-11-14",
        "etapa": "Realizado",
        "hora_real_chegada": null,
        "hora_real_saida": null,
        "hora_retorno": null,
        "hora_saida": null,
        "id": 33451442576,
        "local_evento": "HOTEL NACIONAL INN JARAGUÁ",
        "log_pos_conferido_em": null,
        "log_pos_conferido_por": null,
        "log_pre_conferido_em": null,
        "log_pre_conferido_por": null,
        "nome_negocio": "2025_290_PORTO bank",
        "obs_geral_logistica": null,
        "obs_logistica": null,
        "observacoes": "1ª/2 R$ 22157 RECEBIDO EM 07/07/2025                                          \n2ª/2 A EMITIR VER VALOR",
        "participantes": 210,
        "programa_nb": "Pitágoras Switch",
        "qtd_equipes": null,
        "qtd_staffs": null,
        "transporte": null,
        "voucher_alimentacao": null
    },
    {
        "bombeiro": "sim",
        "cidade": "SAO PAULO",
        "contatos": "Celia (celia@tid.com)",
        "coordenador_evento": "ADAMAZILDO SOARES",
        "coordenador_interno": "AMANDA FRANCISCO",
        "coordenador_montagem": "SIRVÃO ANDREO",
        "data_evento": "2026-02-23",
        "etapa": "Realizado",
        "hora_real_chegada": "18:00",
        "hora_real_saida": "07:00",
        "hora_retorno": "19:00",
        "hora_saida": "06:30",
        "id": 44866676050,
        "local_evento": "Espaço Golf",
        "log_pos_conferido_em": "2026-02-25 15:00",
        "log_pos_conferido_por": "wilson",
        "log_pre_conferido_em": "2026-02-22 17:00",
        "log_pre_conferido_por": "wilson",
        "nome_negocio": "2025_487_Tid de 23/02/2026 a 24/02/2026",
        "obs_geral_logistica": "Tudo certo na montagem de ontem.",
        "obs_logistica": "Levar van extra para transportar os staffs.",
        "observacoes": "Evento estratégico.",
        "participantes": 120,
        "programa_nb": "Kronos",
        "qtd_equipes": 12,
        "qtd_staffs": 24,
        "transporte": "van terceirizada",
        "voucher_alimentacao": "sim"
    },
    {
        "bombeiro": null,
        "cidade": "CAMPINAS",
        "contatos": "B2G rh (rh@b2g.com)",
        "coordenador_evento": "ANDRÉ BRANDÃO",
        "coordenador_interno": "ANA SERENA",
        "coordenador_montagem": "LEONARDO MILANI",
        "data_evento": "2026-06-16",
        "etapa": "Confirmado",
        "hora_real_chegada": null,
        "hora_real_saida": null,
        "hora_retorno": null,
        "hora_saida": "07:30",
        "id": 44866676051,
        "local_evento": "Royal Palm Plaza",
        "log_pos_conferido_em": null,
        "log_pos_conferido_por": null,
        "log_pre_conferido_em": null,
        "log_pre_conferido_por": null,
        "nome_negocio": "2025_488_B2G de 16/06/2026",
        "obs_geral_logistica": null,
        "obs_logistica": null,
        "observacoes": "Treinamento corporativo de integração.",
        "participantes": 80,
        "programa_nb": "Switch",
        "qtd_equipes": 8,
        "qtd_staffs": 10,
        "transporte": "carros próprios",
        "voucher_alimentacao": "não"
    }
];

async function run() {
  console.log("Iniciando importação de treinamentos...");
  const colRef = collection(db, "trainings");
  
  // Limpar dados existentes primeiro
  const snapshot = await getDocs(colRef);
  const batch = writeBatch(db);
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log("Limpeza de trainings concluída.");

  // Importar novos dados
  for (const t of trainings) {
    const docId = String(t.id);
    await setDoc(doc(db, "trainings", docId), {
      bombeiro: t.bombeiro || null,
      cidade: t.cidade || "",
      contatos: t.contatos || "",
      coordenador_evento: t.coordenador_evento || null,
      coordenador_interno: t.coordenador_interno || null,
      coordenador_montagem: t.coordenador_montagem || null,
      responsavel_montagem: t.coordenador_montagem || null, // mapeia ambos conforme visto no app
      data_evento: t.data_evento,
      dataEvento: t.data_evento, // map to both formats
      etapa: t.etapa || "Planejamento",
      hora_real_chegada: t.hora_real_chegada || null,
      hora_real_saida: t.hora_real_saida || null,
      hora_retorno: t.hora_retorno || null,
      hora_saida: t.hora_saida || null,
      local_evento: t.local_evento || "",
      log_pos_conferido_em: t.log_pos_conferido_em || null,
      log_pos_conferido_por: t.log_pos_conferido_por || null,
      log_pre_conferido_em: t.log_pre_conferido_em || null,
      log_pre_conferido_por: t.log_pre_conferido_por || null,
      nome_negocio: t.nome_negocio,
      nomeNegocio: t.nome_negocio, // map to both formats
      obs_geral_logistica: t.obs_geral_logistica || null,
      obs_logistica: t.obs_logistica || null,
      observacoes: t.observacoes || "",
      participantes: t.participantes ? Number(t.participantes) : 0,
      programa_nb: t.programa_nb || "",
      qtd_equipes: t.qtd_equipes ? Number(t.qtd_equipes) : null,
      qtd_staffs: t.qtd_staffs ? Number(t.qtd_staffs) : null,
      transporte: t.transporte || null,
      voucher_alimentacao: t.voucher_alimentacao || null,
      createdAt: new Date().toISOString()
    });
  }
  console.log(`Importação de ${trainings.length} treinamentos concluída.`);
  process.exit(0);
}

run().catch(err => {
  console.error("Erro na importaçao:", err);
  process.exit(1);
});

import { initializeApp } from "firebase/app";
import { initializeFirestore, doc, setDoc, collection, getDocs, writeBatch } from "firebase/firestore";
import { readFileSync } from "fs";

const firebaseConfig = JSON.parse(readFileSync("./firebase-applet-config.json", "utf-8"));

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);

const allocations = [
    {
        "data_alocacao": "2025-12-04",
        "id": 102,
        "motivo_recusa": null,
        "staff_id": 270,
        "status": "confirmado",
        "treinamento_id": 44866676050
    },
    {
        "data_alocacao": "2025-12-04",
        "id": 103,
        "motivo_recusa": null,
        "staff_id": 246,
        "status": "confirmado",
        "treinamento_id": 44866676050
    },
    {
        "data_alocacao": "2025-12-08",
        "id": 104,
        "motivo_recusa": null,
        "staff_id": 160,
        "status": "confirmado",
        "treinamento_id": 44866676050
    },
    {
        "data_alocacao": "2025-12-08",
        "id": 105,
        "motivo_recusa": null,
        "staff_id": 163,
        "status": "confirmado",
        "treinamento_id": 44866676050
    },
    {
        "data_alocacao": "2025-12-08",
        "id": 106,
        "motivo_recusa": null,
        "staff_id": 91,
        "status": "confirmado",
        "treinamento_id": 44866676050
    },
    {
        "data_alocacao": "2025-12-09",
        "id": 107,
        "motivo_recusa": null,
        "staff_id": 23,
        "status": "confirmado",
        "treinamento_id": 44866676050
    },
    {
        "data_alocacao": "2025-12-09",
        "id": 108,
        "motivo_recusa": null,
        "staff_id": 25,
        "status": "confirmado",
        "treinamento_id": 44866676050
    },
    {
        "data_alocacao": "2025-12-09",
        "id": 109,
        "motivo_recusa": null,
        "staff_id": 46,
        "status": "confirmado",
        "treinamento_id": 44866676050
    },
    {
        "data_alocacao": "2025-12-09",
        "id": 110,
        "motivo_recusa": null,
        "staff_id": 235,
        "status": "confirmado",
        "treinamento_id": 44866676050
    },
    {
        "data_alocacao": "2025-12-09",
        "id": 111,
        "motivo_recusa": null,
        "staff_id": 277,
        "status": "confirmado",
        "treinamento_id": 44866676050
    },
    {
        "data_alocacao": "2025-12-09",
        "id": 112,
        "motivo_recusa": null,
        "staff_id": 185,
        "status": "confirmado",
        "treinamento_id": 44866676050
    },
    {
        "data_alocacao": "2025-12-09",
        "id": 113,
        "motivo_recusa": null,
        "staff_id": 114,
        "status": "confirmado",
        "treinamento_id": 44866676050
    },
    {
        "data_alocacao": "2025-12-09",
        "id": 114,
        "motivo_recusa": null,
        "staff_id": 135,
        "status": "confirmado",
        "treinamento_id": 44866676050
    },
    {
        "data_alocacao": "2025-12-09",
        "id": 115,
        "motivo_recusa": null,
        "staff_id": 150,
        "status": "confirmado",
        "treinamento_id": 44866676050
    },
    {
        "data_alocacao": "2025-12-09",
        "id": 116,
        "motivo_recusa": null,
        "staff_id": 244,
        "status": "pessoalmente",
        "treinamento_id": 44866676050
    },
    {
        "data_alocacao": "2025-12-11",
        "id": 117,
        "motivo_recusa": null,
        "staff_id": 167,
        "status": "confirmado",
        "treinamento_id": 44866676050
    },
    {
        "data_alocacao": "2025-12-11",
        "id": 118,
        "motivo_recusa": null,
        "staff_id": 168,
        "status": "pessoalmente",
        "treinamento_id": 44866676050
    },
    {
        "data_alocacao": "2025-12-11",
        "id": 119,
        "motivo_recusa": null,
        "staff_id": 202,
        "status": "confirmado",
        "treinamento_id": 44866676050
    },
    {
        "data_alocacao": "2025-12-11",
        "id": 120,
        "motivo_recusa": null,
        "staff_id": 237,
        "status": "confirmado",
        "treinamento_id": 44866676050
    },
    {
        "data_alocacao": "2025-12-11",
        "id": 121,
        "motivo_recusa": null,
        "staff_id": 250,
        "status": "confirmado",
        "treinamento_id": 44866676050
    },
    {
        "data_alocacao": "2025-12-11",
        "id": 122,
        "motivo_recusa": null,
        "staff_id": 251,
        "status": "confirmado",
        "treinamento_id": 44866676050
    },
    {
        "data_alocacao": "2025-12-11",
        "id": 123,
        "motivo_recusa": null,
        "staff_id": 241,
        "status": "whatsapp",
        "treinamento_id": 44866676050
    },
    {
        "data_alocacao": "2025-12-11",
        "id": 124,
        "motivo_recusa": "Viagem em família do dia 12 ao dia 19.",
        "staff_id": 229,
        "status": "recusado",
        "treinamento_id": 44866676050
    }
];

async function run() {
  console.log("Iniciando importação de alocacoes...");
  const colRef = collection(db, "allocations");
  
  // Limpar dados existentes primeiro
  const snapshot = await getDocs(colRef);
  const batch = writeBatch(db);
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log("Limpeza de allocations concluída.");

  // Importar novos dados
  for (const alloc of allocations) {
    const docId = String(alloc.id);
    await setDoc(doc(db, "allocations", docId), {
      treinamento_id: String(alloc.treinamento_id),
      staff_id: String(alloc.staff_id),
      status: alloc.status,
      data_alocacao: alloc.data_alocacao,
      motivo_recusa: alloc.motivo_recusa || null,
      obs: "",
      updatedAt: new Date().toISOString()
    });
  }
  console.log(`Importação de ${allocations.length} alocações concluída.`);
  process.exit(0);
}

run().catch(err => {
  console.error("Erro na importaçao:", err);
  process.exit(1);
});

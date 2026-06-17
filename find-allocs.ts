import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function findAllocationsByTraining() {
  const trainingIds = ['41703461255', '55922299428'];
  const snap = await getDocs(collection(db, 'allocations'));
  
  console.log("--- Alocações por ID de Treinamento ---");
  snap.forEach(doc => {
    const d = doc.data();
    if (trainingIds.includes(String(d.treinamento_id))) {
        console.log(`PONTO!! Encontrada alocação para Treinamento ${d.treinamento_id} | Staff: ${d.staff_id} | Status: ${d.status}`);
    }
  });

  console.log("\n--- Buscando Alocações pelo ID do documento (pattern: IDTREINAMENTO_IDSTAFF) ---");
  snap.forEach(doc => {
    if (trainingIds.some(tid => doc.id.startsWith(tid))) {
        console.log(`MATCH ID DOC: ${doc.id} | Data: ${JSON.stringify(doc.data())}`);
    }
  });
}
findAllocationsByTraining();

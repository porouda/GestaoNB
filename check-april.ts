import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function checkApril() {
  const snap = await getDocs(collection(db, 'allocations'));
  console.log("--- Alocações de Abril de 2026 ---");
  let found = 0;
  snap.forEach(doc => {
    const d = doc.data();
    const dateVal = d.data_alocacao || d.dataAlocacao || d.data_evento;
    
    let dateObj: Date | null = null;
    if (dateVal && dateVal.toDate) dateObj = dateVal.toDate();
    else if (typeof dateVal === 'string') dateObj = new Date(dateVal);

    if (dateObj && dateObj.getFullYear() === 2026 && dateObj.getMonth() === 3) {
        found++;
        console.log(`Dia ${dateObj.getDate()}: ID: ${doc.id} | Staff: ${d.staff_id} | Treinamento: ${d.treinamento_id} | Status: ${d.status}`);
    }
  });
  console.log(`\nTotal encontrado em Abril/2026: ${found}`);
}
checkApril();

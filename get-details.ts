import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function getDetails() {
  const staffId = '46';
  const staffDoc = await getDoc(doc(db, 'staffs', staffId));
  
  if (staffDoc.exists()) {
    console.log("--- Detalhes do Staff 46 ---");
    console.log(JSON.stringify(staffDoc.data(), null, 2));
  } else {
    console.log("Staff 46 não encontrado na coleção 'staffs'.");
    // Talvez o ID seja numérico?
  }

  // Tentar buscar mais alocações para 14/04 sem o filtro de timestamp exato do Firebase, buscando por strings
  console.log("\n--- Buscando Alocações em 14/04/2026 (Busca exaustiva) ---");
  const allocs = await getDocs(collection(db, 'allocations'));
  allocs.forEach(d => {
    const data = d.data();
    const dateVal = data.data_alocacao || data.dataAlocacao || data.data_evento;
    
    let isMatch = false;
    if (dateVal) {
        if (typeof dateVal === 'string' && (dateVal.includes('2026-04-14') || dateVal.includes('14/04/2026'))) isMatch = true;
        if (dateVal.toDate) {
            const date = dateVal.toDate();
            if (date.getFullYear() === 2026 && date.getMonth() === 3 && date.getDate() === 14) isMatch = true;
        }
    }

    if (isMatch) {
        console.log(`Alocação ID: ${d.id} | Staff ID: ${data.staff_id} | Treinamento ID: ${data.treinamento_id} | Status: ${data.status}`);
    }
  });
}
getDetails();

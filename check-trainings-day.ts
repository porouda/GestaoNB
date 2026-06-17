import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function checkTrainings() {
  const snap = await getDocs(collection(db, 'trainings'));
  console.log("--- Treinamentos em 14/04/2026 ---");
  snap.forEach(doc => {
    const d = doc.data();
    const dateVal = d.data_evento || d.dataEvento;
    let isMatch = false;
    
    if (dateVal) {
        if (typeof dateVal === 'string' && (dateVal.includes('2026-04-14') || dateVal.includes('14/04/2026'))) isMatch = true;
        if (dateVal.toDate) {
            const date = dateVal.toDate();
            if (date.getFullYear() === 2026 && date.getMonth() === 3 && date.getDate() === 14) isMatch = true;
        }
    }

    if (isMatch) {
       console.log(`ID: ${doc.id} | Nome: ${d.nome_negocio || d.nomeNegocio} | Cidade: ${d.cidade}`);
    }
  });
}
checkTrainings();

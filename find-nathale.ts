import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function findNathale() {
  const staffs = await getDocs(query(collection(db, 'staffs'), where('nome_completo', '>=', 'NATHALE'), where('nome_completo', '<=', 'NATHALE' + '\uf8ff')));
  const nathaleId = staffs.empty ? null : staffs.docs[0].id;
  
  if (nathaleId) {
    console.log(`ID da Nathale: ${nathaleId}`);
    const allocs = await getDocs(query(collection(db, 'allocations'), where('staff_id', '==', nathaleId)));
    console.log(`Encontradas ${allocs.size} alocações para Nathale.`);
    allocs.forEach(d => {
        console.log(`ID: ${d.id} | Training: ${d.data().treinamento_id} | Data: ${JSON.stringify(d.data().data_alocacao)}`);
    });
  } else {
    console.log("Nathale não encontrada pelo nome completo.");
  }
}
findNathale();

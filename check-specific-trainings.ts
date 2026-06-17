import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function checkIds() {
  const ids = ['57397638972', '57789852035', '41703461255', '55922299428'];
  for (const id of ids) {
    const d = await getDoc(doc(db, 'trainings', id));
    if (d.exists()) {
        const data = d.data();
        console.log(`Treinamento ${id}: Data: ${JSON.stringify(data.data_evento || data.dataEvento)} | Nome: ${data.nome_negocio || data.nomeNegocio}`);
    } else {
        console.log(`Treinamento ${id} NÃO ENCONTRADO.`);
    }
  }
}
checkIds();

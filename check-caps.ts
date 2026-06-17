import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function checkCaps() {
  const variations = ['Alocacoes', 'Alocações', 'ALOCACOES', 'ALOCAÇÕES', 'alocacao', 'Alocacao'];
  for (const v of variations) {
    try {
        const snap = await getDocs(collection(db, v));
        console.log(`Coleção '${v}': ${snap.size} documentos.`);
    } catch (e) {
        console.log(`Erro '${v}': ${e.message}`);
    }
  }
}
checkCaps();

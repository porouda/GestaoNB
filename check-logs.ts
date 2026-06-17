import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function checkLogs() {
  const snap = await getDocs(query(collection(db, 'logs'), limit(50)));
  console.log("--- Últimos Logs do Sistema ---");
  snap.forEach(doc => {
    const d = doc.data();
    console.log(`[${d.timestamp || '?'}] Tabela: ${d.tabela_afetada || d.tabela} | Ação: ${d.acao} | Desc: ${d.descricao}`);
  });
}
checkLogs();

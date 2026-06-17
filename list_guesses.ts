import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function inspectFinance() {
  const funcs = await getDocs(collection(db, 'finance_functions'));
  console.log('Finance Functions:');
  funcs.docs.forEach(d => console.log(`- ${d.id}: ${d.data().nome}`));

  const staffs = await getDocs(query(collection(db, 'staffs'), limit(10)));
  console.log('Staffs Sample:');
  staffs.docs.forEach(d => console.log(`- ${d.id}: ${d.data().nomeAbreviado || d.data().nomeCompleto} (Funcao: ${d.data().funcaoId})`));
}

inspectFinance();

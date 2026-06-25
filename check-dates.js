import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  console.log("=== Quick Allocations Check ===");
  const q = query(collection(db, "allocations"), limit(20));
  const snap = await getDocs(q);
  console.log(`Found ${snap.size} docs in query`);
  
  snap.forEach(doc => {
     const data = doc.data();
     console.log(`Doc ID: ${doc.id}`);
     console.log(`  staff_id: ${data.staff_id} (${typeof data.staff_id})`);
     console.log(`  treinamento_id: ${data.treinamento_id} (${typeof data.treinamento_id})`);
     console.log(`  data_alocacao: ${JSON.stringify(data.data_alocacao)}`);
     console.log(`  status: ${data.status}`);
  });
  process.exit(0);
}

run().catch(console.error);

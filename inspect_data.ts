import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function inspectData() {
  const collections = ['staffs', 'allocations', 'daily_allocations', 'trainings', 'users'];
  
  for (const col of collections) {
    console.log(`\n--- SAMPLE FROM ${col.toUpperCase()} ---`);
    const q = query(collection(db, col), limit(2));
    const snap = await getDocs(q);
    snap.forEach(doc => {
      console.log(`ID: ${doc.id}`);
      console.log(JSON.stringify(doc.data(), null, 2));
    });
  }
}

inspectData();

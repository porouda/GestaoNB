import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs, limit, query, getDoc, doc } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId);

async function run() {
  console.log("=== INSPECTING DB WITH CLIENT CORRECT CONFIG ===");
  
  const collections = ["staffs", "allocations", "trainings"];
  for (const col of collections) {
    console.log(`\n--- SAMPLE FROM ${col.toUpperCase()} ---`);
    try {
      const q = query(collection(db, col), limit(2));
      const snap = await getDocs(q);
      console.log(`Size of ${col}: ${snap.size}`);
      snap.forEach(doc => {
        console.log(`ID: ${doc.id}`);
        console.log(JSON.stringify(doc.data(), null, 2));
      });
    } catch (e: any) {
      console.error(`Error loading collection ${col}:`, e.message);
    }
  }
  process.exit(0);
}

run().catch(err => {
  console.error("Critical: ", err);
  process.exit(1);
});

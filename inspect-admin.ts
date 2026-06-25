import admin from "firebase-admin";
import fs from "fs";
import path from "path";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));

const app = admin.initializeApp({
  projectId: firebaseConfig.projectId
}, "inspect-app");

const db = admin.firestore(app);
if (firebaseConfig.firestoreDatabaseId) {
  // Use specific database if provided
  db.settings({ databaseId: firebaseConfig.firestoreDatabaseId });
}

async function run() {
  console.log("=== INSPECTING DB WITH FIREBASE ADMIN ===");
  
  const collections = ["staffs", "allocations", "trainings"];
  for (const col of collections) {
    console.log(`\n--- SAMPLE FROM ${col.toUpperCase()} ---`);
    const snap = await db.collection(col).limit(3).get();
    console.log(`Size of ${col}: ${snap.size}`);
    snap.forEach(doc => {
      console.log(`ID: ${doc.id}`);
      console.log(JSON.stringify(doc.data(), null, 2));
    });
  }
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

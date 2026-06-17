import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const firebaseConfig = JSON.parse(readFileSync("./firebase-applet-config.json", "utf-8"));

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId
  });
}

// Pass database ID as second argument to getFirestore
const db = getFirestore(admin.apps[0]!, firebaseConfig.firestoreDatabaseId);

async function run() {
  console.log(`Listing users in database: ${firebaseConfig.firestoreDatabaseId}...`);
  const usersCol = db.collection("users");
  const snapshot = await usersCol.get();
  console.log(`Total users found: ${snapshot.size}`);
  snapshot.forEach(doc => {
    console.log(`User ID: ${doc.id}`);
    console.log(JSON.stringify(doc.data(), null, 2));
  });
}

run().catch(console.error);

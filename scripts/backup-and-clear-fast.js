import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { readFileSync, writeFileSync } from "fs";

const firebaseConfig = JSON.parse(readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  console.log("=== STARTING BACKUP AND WIPE PROCESS ===");

  // 1. Back up 'allocations'
  console.log("Backing up 'allocations' collection...");
  const allocRef = collection(db, "allocations");
  const allocSnap = await getDocs(allocRef);
  const allocationsList = [];
  allocSnap.forEach(d => {
    allocationsList.push({
      _id: d.id,
      ...d.data()
    });
  });
  const allocBackupPath = "./allocations_backup_manual.json";
  writeFileSync(allocBackupPath, JSON.stringify(allocationsList, null, 2), "utf-8");
  console.log(`Saved ${allocationsList.length} allocations to ${allocBackupPath}`);

  // 2. Back up 'daily_allocations' (just in case)
  console.log("Backing up 'daily_allocations' collection...");
  const dailyRef = collection(db, "daily_allocations");
  const dailySnap = await getDocs(dailyRef);
  const dailyList = [];
  dailySnap.forEach(d => {
    dailyList.push({
      _id: d.id,
      ...d.data()
    });
  });
  const dailyBackupPath = "./daily_allocations_backup_manual.json";
  writeFileSync(dailyBackupPath, JSON.stringify(dailyList, null, 2), "utf-8");
  console.log(`Saved ${dailyList.length} daily allocations to ${dailyBackupPath}`);

  // 3. Delete 'allocations' documents
  if (allocationsList.length > 0) {
    console.log(`Deleting ${allocationsList.length} documents from 'allocations'...`);
    let batch = writeBatch(db);
    let count = 0;
    for (const d of allocSnap.docs) {
      batch.delete(d.ref);
      count++;
      if (count % 400 === 0) {
        await batch.commit();
        console.log(`Deleted ${count} allocations...`);
        batch = writeBatch(db);
      }
    }
    if (count % 400 !== 0) {
      await batch.commit();
    }
    console.log("Completed deletion of 'allocations' collection.");
  } else {
    console.log("No allocations found to delete.");
  }

  // 4. Delete 'daily_allocations' documents
  if (dailyList.length > 0) {
    console.log(`Deleting ${dailyList.length} documents from 'daily_allocations'...`);
    let batch = writeBatch(db);
    let count = 0;
    for (const d of dailySnap.docs) {
      batch.delete(d.ref);
      count++;
      if (count % 400 === 0) {
        await batch.commit();
        console.log(`Deleted ${count} daily allocations...`);
        batch = writeBatch(db);
      }
    }
    if (count % 400 !== 0) {
      await batch.commit();
    }
    console.log("Completed deletion of 'daily_allocations' collection.");
  } else {
    console.log("No daily allocations found to delete.");
  }

  // 5. Verification
  console.log("Verifying Firestore status...");
  const verifyAllocSnap = await getDocs(allocRef);
  const verifyDailySnap = await getDocs(dailyRef);
  console.log(`Verified remaining allocations count: ${verifyAllocSnap.size}`);
  console.log(`Verified remaining daily allocations count: ${verifyDailySnap.size}`);

  console.log("=== PROCESS SUCCESSFUL ===");
  process.exit(0);
}

run().catch(err => {
  console.error("Critical error in backup and clear process:", err);
  process.exit(1);
});

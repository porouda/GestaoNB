import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs } from "firebase/firestore";
import { readFileSync, writeFileSync } from "fs";

async function backup() {
  console.log("Iniciando backup das alocações atuais no Firestore...");
  const firebaseConfig = JSON.parse(readFileSync("./firebase-applet-config.json", "utf-8"));
  
  const app = initializeApp(firebaseConfig);
  const db = initializeFirestore(app, {
    experimentalForceLongPolling: true
  }, firebaseConfig.firestoreDatabaseId);
  
  const colRef = collection(db, "allocations");
  const snapshot = await getDocs(colRef);
  
  const currentAllocations: any[] = [];
  snapshot.forEach(doc => {
    currentAllocations.push({
      _id: doc.id, // we save the exact document ID in Firestore
      ...doc.data()
    });
  });
  
  const backupPath = "./allocations_backup_before_new_import.json";
  writeFileSync(backupPath, JSON.stringify(currentAllocations, null, 2), "utf-8");
  
  console.log(`Backup concluído com sucesso! Salvas ${currentAllocations.length} alocações em ${backupPath}`);
}

backup().catch(err => {
  console.error("Erro ao realizar backup das alocações:", err);
  process.exit(1);
});

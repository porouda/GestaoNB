import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs, query, where } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId);

async function run() {
  console.log("=== TRAININGS IN DECEMBER 2025 ===");
  const snap = await getDocs(collection(db, "trainings"));
  let total = 0;
  let matches = 0;
  
  const targetDates = ["2025-12-04", "2025-12-08", "2025-12-09", "2025-12-11", "2025-12-01", "2025-12-02"];
  
  snap.forEach(doc => {
    total++;
    const d = doc.data();
    const dateVal = d.dataEvento || d.data_evento;
    if (typeof dateVal === 'string' && targetDates.some(td => dateVal.includes(td))) {
      matches++;
      console.log(`ID: ${doc.id}`);
      console.log(`  Nome: ${d.nomeNegocio || d.nome_negocio}`);
      console.log(`  Data: ${dateVal}`);
      console.log(`  Etapa: ${d.etapa || d.Etapa}`);
      console.log(`  Ativo/Campos: ${Object.keys(d).join(', ')}`);
      console.log('---------------------------');
    }
  });
  
  console.log(`Total trainings scanned: ${total}`);
  console.log(`Trainings in target December 2025 dates: ${matches}`);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

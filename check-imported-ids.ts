import { initializeApp } from "firebase/app";
import { initializeFirestore, doc, getDoc, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId);

async function run() {
  const targetIds = ["44866676050", "40683133593", "42229001294", "45725825836", "46794708277", "36962053809"];
  console.log("=== CHECKING IMPORTED TRAINING IDS IN DB ===");
  
  for (const id of targetIds) {
    const docRef = doc(db, "trainings", id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      console.log(`ID ${id}: Found! Nome: ${snap.data().nomeNegocio} | Data: ${snap.data().dataEvento} | Etapa: ${snap.data().etapa}`);
    } else {
      console.log(`ID ${id}: NOT found in 'trainings' collection.`);
    }
  }
  
  console.log("\n=== SEARCHING ALL TRAININGS FOR ANY OF THESE IDS ===");
  const snapAll = await getDocs(collection(db, "trainings"));
  let foundCount = 0;
  snapAll.forEach(d => {
    const data = d.data();
    const str = JSON.stringify(data);
    for (const id of targetIds) {
      if (str.includes(id) || d.id === id) {
        console.log(`Found string match in doc ID: ${d.id}`);
        console.log(data);
        foundCount++;
      }
    }
  });
  console.log(`Found overall: ${foundCount} trainings.`);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

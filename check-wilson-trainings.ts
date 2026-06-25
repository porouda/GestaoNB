import { initializeApp } from "firebase/app";
import { initializeFirestore, doc, getDoc } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId);

const wilsonTrainings = [
  "44866676050",
  "53343167043",
  "53897828942",
  "55475655048",
  "54955880783",
  "44491241118",
  "56175336541",
  "48887036050",
  "50435919433",
  "48878202798",
  "45092712219"
];

async function run() {
  console.log("=== CHECKING WILSON'S TRAININGS IN DB ===");
  for (const id of wilsonTrainings) {
    const docRef = doc(db, "trainings", id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      console.log(`ID ${id}: Found! Nome: ${data.nomeNegocio} | Data: ${data.dataEvento} | Etapa: ${data.etapa}`);
    } else {
      console.log(`ID ${id}: NOT found in 'trainings'`);
    }
  }
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

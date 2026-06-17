import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function checkTrainingDetails() {
  const ids = ['41703461255', '55922299428'];
  for (const id of ids) {
    const d = await getDocs(collection(db, 'trainings'));
    d.forEach(doc => {
        if (doc.id === id) {
            console.log(`--- Detalhes Treinamento ${id} ---`);
            console.log(JSON.stringify(doc.data(), null, 2));
        }
    });
  }
}
checkTrainingDetails();

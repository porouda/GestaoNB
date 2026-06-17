import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs } from "firebase/firestore";
import { readFileSync } from "fs";

const firebaseConfig = JSON.parse(readFileSync("./firebase-applet-config.json", "utf-8"));

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);

async function run() {
  console.log("Searching for Wilson Hirai / CPF 22156929874...");
  
  // Search in staffs
  const staffsSnap = await getDocs(collection(db, "staffs"));
  console.log(`Checking ${staffsSnap.size} staffs...`);
  
  let foundStaffCount = 0;
  staffsSnap.forEach(doc => {
    const data = doc.data();
    const nome = (data.nome_completo || "").toLowerCase();
    const nomeAbrev = (data.nome_abreviado || "").toLowerCase();
    const cpf = String(data.cpf || "").replace(/\D/g, "");
    
    if (nome.includes("wilson") || cpf.includes("22156929874") || nomeAbrev.includes("wilson")) {
      console.log(`[STAFF MATCH] ID: ${doc.id}`);
      console.log(JSON.stringify({ id: doc.id, ...data }, null, 2));
      foundStaffCount++;
    }
  });
  
  // Search in users
  const usersSnap = await getDocs(collection(db, "users"));
  console.log(`Checking ${usersSnap.size} users...`);
  
  let foundUserCount = 0;
  usersSnap.forEach(doc => {
    const data = doc.data();
    const name = (data.name || "").toLowerCase();
    const email = (data.email || "").toLowerCase();
    
    if (name.includes("wilson") || email.includes("wilson")) {
      console.log(`[USER MATCH] ID: ${doc.id}`);
      console.log(JSON.stringify({ id: doc.id, ...data }, null, 2));
      foundUserCount++;
    }
  });

  console.log(`Done. Found ${foundStaffCount} staffs and ${foundUserCount} users.`);
  process.exit(0);
}

run().catch(console.error);

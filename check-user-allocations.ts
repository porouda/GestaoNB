import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs, query, where } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId);

async function run() {
  console.log("=== CHECKING USER AND ALLOCATIONS ===");
  
  const staffSnap = await getDocs(collection(db, "staffs"));
  let userStaff: any = null;
  
  staffSnap.forEach(d => {
    const data = d.data();
    if (data.email && data.email.toLowerCase().trim() === "northbrasil@northbrasil.com.br") {
      userStaff = { id: d.id, ...data };
    }
  });
  
  if (!userStaff) {
    console.log("No staff found with email northbrasil@northbrasil.com.br");
    process.exit(0);
  }
  
  console.log("Found Staff:");
  console.log(`  ID: ${userStaff.id}`);
  console.log(`  Nome: ${userStaff.nome_completo || userStaff.nomeFormatar || userStaff.nome}`);
  console.log(`  CPF: ${userStaff.cpf}`);
  
  const allocSnap = await getDocs(collection(db, "allocations"));
  let formalCount = 0;
  console.log("\n=== ALL ALLOCATIONS FOR THIS STAFF ===");
  allocSnap.forEach(doc => {
    const d = doc.data();
    if (String(d.staff_id) === String(userStaff.id)) {
      formalCount++;
      console.log(`ID: ${doc.id}`);
      console.log(`  Status: ${d.status}`);
      console.log(`  Data Alocação: ${d.data_alocacao}`);
      console.log(`  Treinamento ID: ${d.treinamento_id}`);
    }
  });
  console.log(`\nTotal formal allocations found for this staff: ${formalCount}`);
  
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs, limit, query } from "firebase/firestore";
import { readFileSync } from "fs";

async function check() {
  const firebaseConfig = JSON.parse(readFileSync("./firebase-applet-config.json", "utf-8"));
  const app = initializeApp(firebaseConfig);
  const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);

  const collections = [
    { name: "staffs", type: "Active (App)" },
    { name: "trainings", type: "Active (App)" },
    { name: "allocations", type: "Active (App)" },
    { name: "daily_allocations", type: "Active (App/Legacy)" },
    { name: "tasks", type: "Active (App - Kanban)" },
    { name: "inventory", type: "Active (App - Stock)" },
    { name: "inventory_moves", type: "Active (App - Stock)" },
    { name: "finance_functions", type: "Active (App - Rates)" },
    { name: "finance_additionals", type: "Active (App - Rates)" },
    { name: "checklist_templates", type: "Active (App - Checklists)" },
    { name: "training_checklists", type: "Active (App - Checklists)" },
    { name: "allocation_logs", type: "Active (App - Logs)" },
    { name: "perfis_acesso", type: "Active (App - Access Profiles)" },
    { name: "checklist_programs", type: "Active (App - Config)" },
    { name: "checklist_phases", type: "Active (App - Config)" },
    { name: "users", type: "Identified in codebase" },
    { name: "logs", type: "Legacy Logs" },
    { name: "training_types", type: "Legacy Checklists" },
    { name: "checklist_tasks", type: "Legacy Checklists" },
    { name: "estoque", type: "Legacy Stock" },
    { name: "treinamentos", type: "Legacy Training" }
  ];

  console.log("\n=== DETECTANDO COLECÕES NO FIRESTORE (SUPER FAST CHECK) ===");
  console.log(`Database ID: ${firebaseConfig.firestoreDatabaseId}\n`);

  for (const col of collections) {
    try {
      // Usamos limit(1) para verificar presença instantaneamente sem puxar todo o banco!
      const q = query(collection(db, col.name), limit(1));
      const snap = await getDocs(q);
      
      console.log(`- Coleção: "${col.name}" [${col.type}]`);
      if (snap.empty) {
        console.log("  Status: Vazia ou Sem documentos");
      } else {
        console.log(`  Status: EM USO / ATIVA`);
        console.log(`  Exemplo de ID encontrado: "${snap.docs[0].id}"`);
      }
    } catch (e: any) {
      console.log(`- Coleção: "${col.name}" [${col.type}] -> Falha de leitura (Pode não existir ou restrição de regras): ${e.message}`);
    }
  }
}

check().catch(console.error);

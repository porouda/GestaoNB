import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function verify() {
  const collectionsToCheck = ['allocations', 'alocacoes', 'alocações', 'alocação', 'vagas'];
  const dateToSearchStarting = new Date('2026-04-14T00:00:00');
  const dateToSearchEnding = new Date('2026-04-14T23:59:59');

  console.log("--- Verificando Coleções de Alocação ---");

  for (const colName of collectionsToCheck) {
    try {
      const q = query(collection(db, colName));
      const snap = await getDocs(q);
      console.log(`Coleção '${colName}': ${snap.size} documentos totais.`);
      
      if (!snap.empty) {
        // Tentar filtrar pelo dia 14 de Abril
        const qDate = query(collection(db, colName), 
          where('data_alocacao', '>=', dateToSearchStarting),
          where('data_alocacao', '<=', dateToSearchEnding)
        );
        const snapDate = await getDocs(qDate);
        console.log(`  -> Documentos em 14/04/2026: ${snapDate.size}`);
        
        if (snapDate.empty) {
          // Se vazio, talvez a data esteja salva como string?
          const snapAll = await getDocs(collection(db, colName));
          let countStringDate = 0;
          snapAll.forEach(doc => {
            const d = doc.data();
            const dateVal = d.data_alocacao || d.dataAlocacao || d.data_evento || d.dataEvento || d.data;
            if (typeof dateVal === 'string' && (dateVal.includes('2026-04-14') || dateVal.includes('14/04/2026'))) {
                countStringDate++;
                console.log(`    [MATCH STRING] ID: ${doc.id} | Staff: ${d.staff_id} | Treinamento: ${d.treinamento_id}`);
            }
          });
          if (countStringDate > 0) {
            console.log(`  -> Encontrados ${countStringDate} registros com data em formato string.`);
          }
        } else {
            snapDate.forEach(doc => {
                const d = doc.data();
                console.log(`    [MATCH TIMESTAMP] ID: ${doc.id} | Staff: ${d.staff_id} | Treinamento: ${d.treinamento_id} | Status: ${d.status}`);
            });
        }
      }
    } catch (e) {
      console.log(`Erro ao acessar '${colName}': ${e.message}`);
    }
  }

  // Buscar informações dos staffs de April 14 se encontramos IDs
  console.log("\n--- Buscando Detalhes dos Staffs Encontrados ---");
  // (Omiting for now to keep it simple, will do in next turn if needed)
}

verify();

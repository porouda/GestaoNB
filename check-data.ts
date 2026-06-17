import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function checkData() {
  try {
    const snapshot = await getDocs(query(collection(db, 'staffs'), limit(5)));
    console.log(`Total de documentos encontrados (amostra): ${snapshot.size}`);
    
    if (snapshot.empty) {
      console.log("A coleção 'staffs' está VAZIA.");
    } else {
      snapshot.forEach(doc => {
        console.log(`ID: ${doc.id} | CPF: ${doc.data().cpf} | Nome: ${doc.data().nome_completo || doc.data().nomeCompleto}`);
      });
    }

    const usersSnap = await getDocs(query(collection(db, 'users'), limit(1)));
    console.log(`Coleção 'users' está ${usersSnap.empty ? 'VAZIA' : 'com dados'}.`);

  } catch (error) {
    console.error("Erro ao verificar dados:", error);
  }
}

checkData();

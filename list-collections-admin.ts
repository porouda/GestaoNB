import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const firebaseConfig = JSON.parse(readFileSync("./firebase-applet-config.json", "utf-8"));

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId
  });
}

const db = getFirestore(admin.apps[0]!, firebaseConfig.firestoreDatabaseId);

async function listCollections() {
  console.log(`--- [ADMIN] Verificando Database: ${firebaseConfig.firestoreDatabaseId} ---`);
  try {
    const collections = await db.listCollections();
    if (collections.length === 0) {
        console.log("Nenhuma coleção encontrada no root.");
    }
    collections.forEach(collection => {
      console.log(`Coleção encontrada: ${collection.id}`);
    });
  } catch (e: any) {
    console.error("Erro ao listar coleções:", e.message);
  }
}

listCollections();

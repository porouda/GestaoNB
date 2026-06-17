import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc, setDoc } from "firebase/firestore";
import { readFileSync } from "fs";
import bcrypt from "bcryptjs";

const firebaseConfig = JSON.parse(readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  console.log("Configurando Wilson Hirai (CPF 22156929874) como Administrador...");

  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash("admin", salt);

    // 1. Atualizar na coleção 'staffs' com ID '270'
    const staffRef = doc(db, "staffs", "270");
    await updateDoc(staffRef, {
      senha: hash,
      ativo: "sim",
      role: "admin",
      nivel: "admin",
      nivel_acesso: "admin",
      perfil_id: "admin",
      email: "northbrasil@northbrasil.com.br"
    });
    console.log("Coleção 'staffs' (ID '270') de Wilson Hirai atualizada com sucesso!");

    // 2. Atualizar ou criar na coleção 'users' com ID '270'
    const userRef = doc(db, "users", "270");
    await setDoc(userRef, {
      id: "270",
      userId: "270",
      cpf: "22156929874",
      name: "WILSON HIRAI",
      email: "logistica@northbrasil.com.br", // Mantém email de login preferencial
      role: "admin",
      nivel: "admin",
      nivel_acesso: "admin",
      permissions: ["all"],
      customPermissions: { all: "write" }
    }, { merge: true });
    console.log("Coleção 'users' (ID '270') de Wilson Hirai atualizada com sucesso!");

    console.log("Configuração concluída com sucesso!");
    process.exit(0);
  } catch (error: any) {
    console.error("Erro ao configurar senha e permissões de Wilson Hirai:", error.message);
    process.exit(1);
  }
}

run();

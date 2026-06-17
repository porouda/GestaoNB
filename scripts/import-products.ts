import { initializeApp } from "firebase/app";
import { initializeFirestore, doc, setDoc, collection, getDocs, writeBatch } from "firebase/firestore";
import { readFileSync } from "fs";

const firebaseConfig = JSON.parse(readFileSync("./firebase-applet-config.json", "utf-8"));

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);

const products = [
    {
        "id": 1,
        "nome": "Potinho tinta AZUL",
        "observacoes": "",
        "quantidade": 108,
        "quantidade_minima": 60
    },
    {
        "id": 2,
        "nome": "Potinho tinta VERMELHA",
        "observacoes": "",
        "quantidade": 114,
        "quantidade_minima": 60
    },
    {
        "id": 3,
        "nome": "Potinho tinta AMARELA",
        "observacoes": "",
        "quantidade": 245,
        "quantidade_minima": 60
    },
    {
        "id": 4,
        "nome": "Potinho tinta PRETA",
        "observacoes": "",
        "quantidade": 290,
        "quantidade_minima": 60
    },
    {
        "id": 5,
        "nome": "Potinho tinta BRANCA",
        "observacoes": "",
        "quantidade": 214,
        "quantidade_minima": 60
    },
    {
        "id": 6,
        "nome": "Pratinho plástico pacote",
        "observacoes": "",
        "quantidade": 24,
        "quantidade_minima": 6
    },
    {
        "id": 7,
        "nome": "-",
        "observacoes": "",
        "quantidade": 0,
        "quantidade_minima": 0
    },
    {
        "id": 8,
        "nome": "Saco sanito grande 100L",
        "observacoes": "unidade",
        "quantidade": 34,
        "quantidade_minima": 10
    },
    {
        "id": 9,
        "nome": "Perfex Rolo",
        "observacoes": "",
        "quantidade": 2,
        "quantidade_minima": 1
    },
    {
        "id": 10,
        "nome": "Lápis de cor unidade caixa c 12 lapis",
        "observacoes": "unidades",
        "quantidade": 74,
        "quantidade_minima": 120
    },
    {
        "id": 11,
        "nome": "TNT Base Amarelo",
        "observacoes": "",
        "quantidade": 5,
        "quantidade_minima": 4
    },
    {
        "id": 12,
        "nome": "Barbante Colorido",
        "observacoes": "rolo",
        "quantidade": 2,
        "quantidade_minima": 1
    },
    {
        "id": 13,
        "nome": "Embrulho de presente Grande",
        "observacoes": "Unidades",
        "quantidade": 220,
        "quantidade_minima": 200
    },
    {
        "id": 14,
        "nome": "Avental descartável",
        "observacoes": "pacote com 100un",
        "quantidade": 4,
        "quantidade_minima": 2
    },
    {
        "id": 15,
        "nome": "Zip Lock 17x24 (pacote)",
        "observacoes": "pacote com 100un",
        "quantidade": 2,
        "quantidade_minima": 1
    },
    {
        "id": 16,
        "nome": "Rolo plástico",
        "observacoes": "",
        "quantidade": 5,
        "quantidade_minima": 2
    },
    {
        "id": 17,
        "nome": "TNT Base Azul Royal",
        "observacoes": "",
        "quantidade": 1,
        "quantidade_minima": 4
    },
    {
        "id": 18,
        "nome": "TNT Base Verde Escuro",
        "observacoes": "",
        "quantidade": 2,
        "quantidade_minima": 4
    },
    {
        "id": 19,
        "nome": "TNT Base Preto",
        "observacoes": "",
        "quantidade": 3,
        "quantidade_minima": 4
    },
    {
        "id": 20,
        "nome": "TNT Base Branco",
        "observacoes": "",
        "quantidade": 3,
        "quantidade_minima": 4
    },
    {
        "id": 21,
        "nome": "TNT Base Lilás",
        "observacoes": "",
        "quantidade": 12,
        "quantidade_minima": 4
    },
    {
        "id": 22,
        "nome": "TNT Base Vermelho",
        "observacoes": "",
        "quantidade": 3,
        "quantidade_minima": 4
    },
    {
        "id": 23,
        "nome": "TNT Base Rosa",
        "observacoes": "",
        "quantidade": 16,
        "quantidade_minima": 4
    },
    {
        "id": 24,
        "nome": "TNT Base Laranja",
        "observacoes": "",
        "quantidade": 1,
        "quantidade_minima": 4
    },
    {
        "id": 25,
        "nome": "TNT Base Marrom",
        "observacoes": "",
        "quantidade": 1,
        "quantidade_minima": 4
    },
    {
        "id": 26,
        "nome": "Retalho TNT Verde Escuro",
        "observacoes": "",
        "quantidade": 15,
        "quantidade_minima": 4
    },
    {
        "id": 27,
        "nome": "Retalho TNT Azul Royal",
        "observacoes": "",
        "quantidade": 15,
        "quantidade_minima": 4
    },
    {
        "id": 28,
        "nome": "Retalho TNT Preto",
        "observacoes": "",
        "quantidade": 5,
        "quantidade_minima": 4
    },
    {
        "id": 29,
        "nome": "Retalho TNT Lilas",
        "observacoes": "",
        "quantidade": 6,
        "quantidade_minima": 4
    },
    {
        "id": 30,
        "nome": "Retalho TNT Laranja",
        "observacoes": "",
        "quantidade": 14,
        "quantidade_minima": 4
    },
    {
        "id": 31,
        "nome": "Retalho TNT Branco",
        "observacoes": "",
        "quantidade": 1,
        "quantidade_minima": 4
    },
    {
        "id": 32,
        "nome": "Retalho TNT Vermelho",
        "observacoes": "",
        "quantidade": 6,
        "quantidade_minima": 4
    },
    {
        "id": 33,
        "nome": "Retalho TNT Amarelo",
        "observacoes": "",
        "quantidade": 3,
        "quantidade_minima": 4
    },
    {
        "id": 34,
        "nome": "Retalho TNT Rosa",
        "observacoes": "",
        "quantidade": 5,
        "quantidade_minima": 4
    },
    {
        "id": 35,
        "nome": "Retalho TNT Azul Marinho",
        "observacoes": "",
        "quantidade": 1,
        "quantidade_minima": 4
    },
    {
        "id": 36,
        "nome": "Retalho TNT Azul Claro",
        "observacoes": "",
        "quantidade": 5,
        "quantidade_minima": 4
    },
    {
        "id": 37,
        "nome": "Retalho TNT Marrom",
        "observacoes": "",
        "quantidade": 14,
        "quantidade_minima": 4
    },
    {
        "id": 38,
        "nome": "Fita de Cetim VERDE ESCURA",
        "observacoes": "",
        "quantidade": 14,
        "quantidade_minima": 5
    },
    {
        "id": 39,
        "nome": "Fita de Cetim ROXA",
        "observacoes": "",
        "quantidade": 15,
        "quantidade_minima": 5
    },
    {
        "id": 40,
        "nome": "Fita de Cetim PRETA",
        "observacoes": "",
        "quantidade": 16,
        "quantidade_minima": 5
    },
    {
        "id": 41,
        "nome": "Fita de Cetim LARANJA",
        "observacoes": "",
        "quantidade": 16,
        "quantidade_minima": 5
    },
    {
        "id": 42,
        "nome": "Fita de Cetim AMARELA",
        "observacoes": "",
        "quantidade": 21,
        "quantidade_minima": 5
    },
    {
        "id": 43,
        "nome": "Fita de Cetim VERMELHA",
        "observacoes": "",
        "quantidade": 14,
        "quantidade_minima": 5
    },
    {
        "id": 44,
        "nome": "Fita de Cetim VINHO",
        "observacoes": "",
        "quantidade": 19,
        "quantidade_minima": 5
    },
    {
        "id": 45,
        "nome": "Fita de Cetim AZUL ROYAL",
        "observacoes": "",
        "quantidade": 17,
        "quantidade_minima": 5
    },
    {
        "id": 46,
        "nome": "Fita de Cetim LILAS",
        "observacoes": "",
        "quantidade": 17,
        "quantidade_minima": 5
    },
    {
        "id": 47,
        "nome": "Fita de Cetim ROSA",
        "observacoes": "",
        "quantidade": 19,
        "quantidade_minima": 5
    },
    {
        "id": 48,
        "nome": "Fita de Cetim VERDE CLARO",
        "observacoes": "",
        "quantidade": 47,
        "quantidade_minima": 5
    },
    {
        "id": 49,
        "nome": "Bexiga BRANCA",
        "observacoes": "",
        "quantidade": 62,
        "quantidade_minima": 40
    },
    {
        "id": 50,
        "nome": "Bexiga LARANJA",
        "observacoes": "",
        "quantidade": 42,
        "quantidade_minima": 40
    },
    {
        "id": 51,
        "nome": "Bexiga VERMELHA",
        "observacoes": "",
        "quantidade": 193,
        "quantidade_minima": 40
    },
    {
        "id": 52,
        "nome": "Bexiga AZUL CLARO",
        "observacoes": "",
        "quantidade": 30,
        "quantidade_minima": 40
    },
    {
        "id": 53,
        "nome": "Bexiga AZUL ESCURO",
        "observacoes": "",
        "quantidade": 9,
        "quantidade_minima": 40
    },
    {
        "id": 54,
        "nome": "Bexiga VERDE CLARO",
        "observacoes": "",
        "quantidade": 16,
        "quantidade_minima": 40
    },
    {
        "id": 55,
        "nome": "Bexiga LILAS",
        "observacoes": "",
        "quantidade": 34,
        "quantidade_minima": 40
    },
    {
        "id": 56,
        "nome": "Bexiga AMARELA",
        "observacoes": "",
        "quantidade": 33,
        "quantidade_minima": 40
    },
    {
        "id": 57,
        "nome": "Bexiga ROSA",
        "observacoes": "",
        "quantidade": 96,
        "quantidade_minima": 40
    },
    {
        "id": 58,
        "nome": "Bexiga ROXA",
        "observacoes": "",
        "quantidade": 107,
        "quantidade_minima": 40
    },
    {
        "id": 59,
        "nome": "Bexiga VERDE ESCURO",
        "observacoes": "",
        "quantidade": 16,
        "quantidade_minima": 40
    },
    {
        "id": 60,
        "nome": "Bexiga PRETA",
        "observacoes": "",
        "quantidade": 7,
        "quantidade_minima": 40
    },
    {
        "id": 61,
        "nome": "Kit descartável oficina",
        "observacoes": "",
        "quantidade": 76,
        "quantidade_minima": 20
    },
    {
        "id": 62,
        "nome": "TNT Base Azul Claro",
        "observacoes": "",
        "quantidade": 9,
        "quantidade_minima": 4
    }
];

async function run() {
  console.log("Iniciando importação de produtos/estoque...");
  const colRef = collection(db, "inventory");
  
  // Limpar dados existentes primeiro
  const snapshot = await getDocs(colRef);
  const batch = writeBatch(db);
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log("Limpeza de inventory concluída.");

  // Importar novos dados
  for (const prod of products) {
    const docId = String(prod.id);
    await setDoc(doc(db, "inventory", docId), {
      nome: prod.nome,
      observacoes: prod.observacoes,
      quantidade: prod.quantidade,
      quantidade_minima: prod.quantidade_minima,
      quantidadeMinima: prod.quantidade_minima, // manter mapeado para ambos
      updatedAt: new Date().toISOString()
    });
  }
  console.log("Importação de inventory concluída.");
  process.exit(0);
}

run().catch(err => {
  console.error("Erro na importaçao:", err);
  process.exit(1);
});

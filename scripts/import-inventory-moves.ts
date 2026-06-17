import { initializeApp } from "firebase/app";
import { initializeFirestore, doc, setDoc, collection, getDocs, writeBatch } from "firebase/firestore";
import { readFileSync } from "fs";

const firebaseConfig = JSON.parse(readFileSync("./firebase-applet-config.json", "utf-8"));

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);

const moves = [
    {
        "data_movimentacao": "2026-02-23",
        "id": 1,
        "observacoes": "",
        "produto_id": 7,
        "quantidade": 20,
        "responsavel": "wilson",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-02-23",
        "id": 2,
        "observacoes": "",
        "produto_id": 7,
        "quantidade": 2,
        "responsavel": "wilson",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-02-23",
        "id": 3,
        "observacoes": "Ajuste de qtde inicial",
        "produto_id": 7,
        "quantidade": 18,
        "responsavel": "Wilson",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-02-24",
        "id": 4,
        "observacoes": "",
        "produto_id": 11,
        "quantidade": 10,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-02-24",
        "id": 5,
        "observacoes": "",
        "produto_id": 11,
        "quantidade": 10,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-02-25",
        "id": 6,
        "observacoes": "",
        "produto_id": 1,
        "quantidade": 135,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-02-25",
        "id": 7,
        "observacoes": "",
        "produto_id": 2,
        "quantidade": 171,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-02-25",
        "id": 8,
        "observacoes": "",
        "produto_id": 2,
        "quantidade": 100,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-02-25",
        "id": 9,
        "observacoes": "",
        "produto_id": 5,
        "quantidade": 209,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-02-26",
        "id": 10,
        "observacoes": "",
        "produto_id": 4,
        "quantidade": 127,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-02-26",
        "id": 11,
        "observacoes": "",
        "produto_id": 6,
        "quantidade": 40,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-02-26",
        "id": 12,
        "observacoes": "",
        "produto_id": 13,
        "quantidade": 8,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-02-26",
        "id": 13,
        "observacoes": "",
        "produto_id": 10,
        "quantidade": 15,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-02-26",
        "id": 14,
        "observacoes": "",
        "produto_id": 7,
        "quantidade": 2,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-02-26",
        "id": 15,
        "observacoes": "",
        "produto_id": 14,
        "quantidade": 3,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-02-26",
        "id": 16,
        "observacoes": "",
        "produto_id": 15,
        "quantidade": 4,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-02-26",
        "id": 17,
        "observacoes": "",
        "produto_id": 13,
        "quantidade": 3,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-02-27",
        "id": 18,
        "observacoes": "",
        "produto_id": 6,
        "quantidade": 2,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-02-27",
        "id": 19,
        "observacoes": "",
        "produto_id": 3,
        "quantidade": 64,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-02-27",
        "id": 20,
        "observacoes": "",
        "produto_id": 1,
        "quantidade": 64,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-02-27",
        "id": 21,
        "observacoes": "",
        "produto_id": 2,
        "quantidade": 64,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-02-27",
        "id": 22,
        "observacoes": "",
        "produto_id": 5,
        "quantidade": 34,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-02-27",
        "id": 23,
        "observacoes": "",
        "produto_id": 4,
        "quantidade": 34,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-02-27",
        "id": 24,
        "observacoes": "",
        "produto_id": 10,
        "quantidade": 18,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-02-27",
        "id": 25,
        "observacoes": "",
        "produto_id": 10,
        "quantidade": 102,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-02-27",
        "id": 26,
        "observacoes": "",
        "produto_id": 10,
        "quantidade": 4,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-02-27",
        "id": 27,
        "observacoes": "",
        "produto_id": 14,
        "quantidade": 3,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-03-02",
        "id": 28,
        "observacoes": "",
        "produto_id": 3,
        "quantidade": 341,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-03-02",
        "id": 29,
        "observacoes": "",
        "produto_id": 1,
        "quantidade": 181,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-03-02",
        "id": 30,
        "observacoes": "",
        "produto_id": 2,
        "quantidade": 213,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-03-02",
        "id": 31,
        "observacoes": "",
        "produto_id": 6,
        "quantidade": 1,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-03-03",
        "id": 32,
        "observacoes": "",
        "produto_id": 8,
        "quantidade": 45,
        "responsavel": "wilson",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-03-03",
        "id": 33,
        "observacoes": "",
        "produto_id": 13,
        "quantidade": 1,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-03-03",
        "id": 34,
        "observacoes": "",
        "produto_id": 13,
        "quantidade": 1,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-03-03",
        "id": 35,
        "observacoes": "",
        "produto_id": 5,
        "quantidade": 108,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-03-03",
        "id": 36,
        "observacoes": "",
        "produto_id": 4,
        "quantidade": 199,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-03-03",
        "id": 37,
        "observacoes": "",
        "produto_id": 13,
        "quantidade": 7,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-03-03",
        "id": 38,
        "observacoes": "",
        "produto_id": 13,
        "quantidade": 5,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-03-03",
        "id": 39,
        "observacoes": "",
        "produto_id": 13,
        "quantidade": 2,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-03-03",
        "id": 40,
        "observacoes": "",
        "produto_id": 12,
        "quantidade": 1,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-03-03",
        "id": 41,
        "observacoes": "",
        "produto_id": 13,
        "quantidade": 1,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-03-04",
        "id": 42,
        "observacoes": "",
        "produto_id": 3,
        "quantidade": 50,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-03-04",
        "id": 43,
        "observacoes": "",
        "produto_id": 1,
        "quantidade": 50,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-03-04",
        "id": 44,
        "observacoes": "",
        "produto_id": 5,
        "quantidade": 50,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-03-04",
        "id": 45,
        "observacoes": "",
        "produto_id": 4,
        "quantidade": 50,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-03-04",
        "id": 46,
        "observacoes": "",
        "produto_id": 2,
        "quantidade": 50,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-03-04",
        "id": 47,
        "observacoes": "",
        "produto_id": 8,
        "quantidade": 10,
        "responsavel": "grilo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-03-04",
        "id": 48,
        "observacoes": "",
        "produto_id": 3,
        "quantidade": 95,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-03-04",
        "id": 49,
        "observacoes": "",
        "produto_id": 1,
        "quantidade": 95,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-03-04",
        "id": 50,
        "observacoes": "",
        "produto_id": 5,
        "quantidade": 65,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-03-04",
        "id": 51,
        "observacoes": "",
        "produto_id": 4,
        "quantidade": 65,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-03-04",
        "id": 52,
        "observacoes": "",
        "produto_id": 2,
        "quantidade": 95,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-03-04",
        "id": 53,
        "observacoes": "",
        "produto_id": 10,
        "quantidade": 300,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-03-04",
        "id": 54,
        "observacoes": "",
        "produto_id": 10,
        "quantidade": 204,
        "responsavel": "grilo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-03-04",
        "id": 55,
        "observacoes": "",
        "produto_id": 10,
        "quantidade": 6,
        "responsavel": "grilo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-03-06",
        "id": 56,
        "observacoes": "",
        "produto_id": 13,
        "quantidade": 14,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-03-10",
        "id": 57,
        "observacoes": "",
        "produto_id": 13,
        "quantidade": 1,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-03-10",
        "id": 58,
        "observacoes": "",
        "produto_id": 10,
        "quantidade": 65,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-03-11",
        "id": 59,
        "observacoes": "",
        "produto_id": 13,
        "quantidade": 1,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-03-11",
        "id": 60,
        "observacoes": "",
        "produto_id": 13,
        "quantidade": 4,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-03-11",
        "id": 61,
        "observacoes": "",
        "produto_id": 3,
        "quantidade": 70,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-03-11",
        "id": 62,
        "observacoes": "",
        "produto_id": 1,
        "quantidade": 70,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-03-11",
        "id": 63,
        "observacoes": "",
        "produto_id": 2,
        "quantidade": 70,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-03-11",
        "id": 64,
        "observacoes": "",
        "produto_id": 5,
        "quantidade": 54,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-03-11",
        "id": 65,
        "observacoes": "",
        "produto_id": 4,
        "quantidade": 38,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-03-11",
        "id": 66,
        "observacoes": "",
        "produto_id": 13,
        "quantidade": 1,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-03-11",
        "id": 67,
        "observacoes": "",
        "produto_id": 5,
        "quantidade": 32,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-03-11",
        "id": 68,
        "observacoes": "",
        "produto_id": 4,
        "quantidade": 32,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-03-11",
        "id": 69,
        "observacoes": "",
        "produto_id": 3,
        "quantidade": 37,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-03-11",
        "id": 70,
        "observacoes": "",
        "produto_id": 2,
        "quantidade": 24,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-03-11",
        "id": 71,
        "observacoes": "",
        "produto_id": 1,
        "quantidade": 37,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-03-13",
        "id": 72,
        "observacoes": "",
        "produto_id": 8,
        "quantidade": 5,
        "responsavel": "grilo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-03-13",
        "id": 73,
        "observacoes": "",
        "produto_id": 10,
        "quantidade": 24,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-03-13",
        "id": 74,
        "observacoes": "",
        "produto_id": 3,
        "quantidade": 16,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-03-13",
        "id": 75,
        "observacoes": "",
        "produto_id": 1,
        "quantidade": 16,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-03-13",
        "id": 76,
        "observacoes": "",
        "produto_id": 5,
        "quantidade": 9,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-03-13",
        "id": 77,
        "observacoes": "",
        "produto_id": 4,
        "quantidade": 9,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-03-13",
        "id": 78,
        "observacoes": "",
        "produto_id": 2,
        "quantidade": 16,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-03-17",
        "id": 79,
        "observacoes": "",
        "produto_id": 10,
        "quantidade": 52,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-03-17",
        "id": 80,
        "observacoes": "",
        "produto_id": 8,
        "quantidade": 3,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-03-19",
        "id": 81,
        "observacoes": "",
        "produto_id": 8,
        "quantidade": 4,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-03-19",
        "id": 82,
        "observacoes": "",
        "produto_id": 8,
        "quantidade": 2,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-03-23",
        "id": 83,
        "observacoes": "",
        "produto_id": 3,
        "quantidade": 2,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-03-23",
        "id": 84,
        "observacoes": "",
        "produto_id": 1,
        "quantidade": 2,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-03-23",
        "id": 85,
        "observacoes": "",
        "produto_id": 5,
        "quantidade": 2,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-03-23",
        "id": 86,
        "observacoes": "",
        "produto_id": 4,
        "quantidade": 2,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-04-02",
        "id": 87,
        "observacoes": "",
        "produto_id": 11,
        "quantidade": 6,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-04-06",
        "id": 88,
        "observacoes": "",
        "produto_id": 8,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-04-08",
        "id": 89,
        "observacoes": "",
        "produto_id": 8,
        "quantidade": 1,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-13",
        "id": 90,
        "observacoes": "Emb. Concilig 10 bexigas para jogo e + 5 reservas.",
        "produto_id": 53,
        "quantidade": 15,
        "responsavel": "Léo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-13",
        "id": 91,
        "observacoes": "Emb. Concilig 10 bexigas para o jogo e + 5 reservas",
        "produto_id": 49,
        "quantidade": 15,
        "responsavel": "Léo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-13",
        "id": 92,
        "observacoes": "Emb. Concilig 2 bases vermelhas jogo + reserva.",
        "produto_id": 22,
        "quantidade": 2,
        "responsavel": "Léo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-13",
        "id": 93,
        "observacoes": "Emb. Concilig 2 bases Jogo + reserva.",
        "produto_id": 19,
        "quantidade": 2,
        "responsavel": "Léo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-13",
        "id": 94,
        "observacoes": "Emb. Concilig. 2 bases jogo + reserva.",
        "produto_id": 17,
        "quantidade": 2,
        "responsavel": "Léo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-13",
        "id": 95,
        "observacoes": "Emb. Concilig. 2 bases jogo + reserva.",
        "produto_id": 18,
        "quantidade": 2,
        "responsavel": "Léo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-13",
        "id": 96,
        "observacoes": "Emb. Concilig. 1 retalho amarelo usado no jogo.",
        "produto_id": 33,
        "quantidade": 1,
        "responsavel": "Léo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-13",
        "id": 97,
        "observacoes": "Emb. Concilig. 1 jogo + 1 reserva.",
        "produto_id": 35,
        "quantidade": 2,
        "responsavel": "Léo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-13",
        "id": 98,
        "observacoes": "Emb. Concilig. 1 jogo + 1 reserva.",
        "produto_id": 26,
        "quantidade": 2,
        "responsavel": "Léo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-13",
        "id": 99,
        "observacoes": "Emb. Concilig. 1 jogo + 1 reserva.",
        "produto_id": 31,
        "quantidade": 2,
        "responsavel": "Léo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-13",
        "id": 100,
        "observacoes": "Emb. Concilig. 1 jogo+ 1 reserva.",
        "produto_id": 28,
        "quantidade": 2,
        "responsavel": "Léo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-13",
        "id": 101,
        "observacoes": "Emb. Concilig. 1 jogo + 1 reserva.",
        "produto_id": 30,
        "quantidade": 2,
        "responsavel": "Léo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-13",
        "id": 102,
        "observacoes": "Emb. Concilig. 1 jogo + 1 reserva.",
        "produto_id": 34,
        "quantidade": 2,
        "responsavel": "Léo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-13",
        "id": 103,
        "observacoes": "Emb. Concilig. 2 jogo + 1 reserva.",
        "produto_id": 47,
        "quantidade": 3,
        "responsavel": "Léo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-13",
        "id": 104,
        "observacoes": "Emb. Concilig. 1 fita para jogo.",
        "produto_id": 46,
        "quantidade": 1,
        "responsavel": "Léo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-13",
        "id": 105,
        "observacoes": "",
        "produto_id": 43,
        "quantidade": 1,
        "responsavel": "Léo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-13",
        "id": 106,
        "observacoes": "",
        "produto_id": 45,
        "quantidade": 2,
        "responsavel": "Léo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-13",
        "id": 107,
        "observacoes": "",
        "produto_id": 41,
        "quantidade": 1,
        "responsavel": "Léo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-13",
        "id": 108,
        "observacoes": "",
        "produto_id": 41,
        "quantidade": 1,
        "responsavel": "Léo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-13",
        "id": 109,
        "observacoes": "",
        "produto_id": 38,
        "quantidade": 2,
        "responsavel": "Léo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-15",
        "id": 110,
        "observacoes": "",
        "produto_id": 13,
        "quantidade": 2,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-15",
        "id": 111,
        "observacoes": "",
        "produto_id": 14,
        "quantidade": 1,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-15",
        "id": 112,
        "observacoes": "",
        "produto_id": 6,
        "quantidade": 3,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-15",
        "id": 113,
        "observacoes": "",
        "produto_id": 3,
        "quantidade": 40,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-15",
        "id": 114,
        "observacoes": "",
        "produto_id": 1,
        "quantidade": 40,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-15",
        "id": 115,
        "observacoes": "",
        "produto_id": 5,
        "quantidade": 30,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-15",
        "id": 116,
        "observacoes": "",
        "produto_id": 4,
        "quantidade": 30,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-15",
        "id": 117,
        "observacoes": "",
        "produto_id": 2,
        "quantidade": 40,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-15",
        "id": 118,
        "observacoes": "",
        "produto_id": 10,
        "quantidade": 36,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-15",
        "id": 119,
        "observacoes": "",
        "produto_id": 8,
        "quantidade": 3,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-19",
        "id": 120,
        "observacoes": "",
        "produto_id": 41,
        "quantidade": 2,
        "responsavel": "grilo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-19",
        "id": 121,
        "observacoes": "",
        "produto_id": 46,
        "quantidade": 2,
        "responsavel": "grilo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-19",
        "id": 122,
        "observacoes": "",
        "produto_id": 43,
        "quantidade": 2,
        "responsavel": "grilo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-19",
        "id": 123,
        "observacoes": "",
        "produto_id": 47,
        "quantidade": 2,
        "responsavel": "grilo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-19",
        "id": 124,
        "observacoes": "",
        "produto_id": 38,
        "quantidade": 2,
        "responsavel": "grilo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-19",
        "id": 125,
        "observacoes": "",
        "produto_id": 45,
        "quantidade": 2,
        "responsavel": "grilo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-19",
        "id": 126,
        "observacoes": "",
        "produto_id": 35,
        "quantidade": 2,
        "responsavel": "grilo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-19",
        "id": 127,
        "observacoes": "",
        "produto_id": 30,
        "quantidade": 2,
        "responsavel": "grilo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-19",
        "id": 128,
        "observacoes": "",
        "produto_id": 28,
        "quantidade": 2,
        "responsavel": "grilo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-19",
        "id": 129,
        "observacoes": "",
        "produto_id": 34,
        "quantidade": 2,
        "responsavel": "grilo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-19",
        "id": 130,
        "observacoes": "",
        "produto_id": 26,
        "quantidade": 2,
        "responsavel": "grilo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-19",
        "id": 131,
        "observacoes": "",
        "produto_id": 32,
        "quantidade": 2,
        "responsavel": "grilo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-19",
        "id": 132,
        "observacoes": "",
        "produto_id": 21,
        "quantidade": 2,
        "responsavel": "grilo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-19",
        "id": 133,
        "observacoes": "",
        "produto_id": 22,
        "quantidade": 2,
        "responsavel": "grilo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-19",
        "id": 134,
        "observacoes": "",
        "produto_id": 11,
        "quantidade": 2,
        "responsavel": "grilo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-19",
        "id": 135,
        "observacoes": "",
        "produto_id": 52,
        "quantidade": 20,
        "responsavel": "grilo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-19",
        "id": 136,
        "observacoes": "",
        "produto_id": 52,
        "quantidade": 20,
        "responsavel": "grilo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-05-21",
        "id": 137,
        "observacoes": "",
        "produto_id": 21,
        "quantidade": 10,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-21",
        "id": 138,
        "observacoes": "",
        "produto_id": 23,
        "quantidade": 14,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-21",
        "id": 139,
        "observacoes": "",
        "produto_id": 36,
        "quantidade": 4,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-21",
        "id": 140,
        "observacoes": "",
        "produto_id": 29,
        "quantidade": 2,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-21",
        "id": 141,
        "observacoes": "",
        "produto_id": 34,
        "quantidade": 2,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-22",
        "id": 142,
        "observacoes": "",
        "produto_id": 53,
        "quantidade": 9,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-22",
        "id": 143,
        "observacoes": "",
        "produto_id": 49,
        "quantidade": 8,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-22",
        "id": 144,
        "observacoes": "",
        "produto_id": 41,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-22",
        "id": 145,
        "observacoes": "",
        "produto_id": 45,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-22",
        "id": 146,
        "observacoes": "",
        "produto_id": 47,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-22",
        "id": 147,
        "observacoes": "",
        "produto_id": 38,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-22",
        "id": 148,
        "observacoes": "",
        "produto_id": 46,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-22",
        "id": 149,
        "observacoes": "",
        "produto_id": 44,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-22",
        "id": 150,
        "observacoes": "",
        "produto_id": 33,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-22",
        "id": 151,
        "observacoes": "",
        "produto_id": 35,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-22",
        "id": 152,
        "observacoes": "",
        "produto_id": 31,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-22",
        "id": 153,
        "observacoes": "",
        "produto_id": 30,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-22",
        "id": 154,
        "observacoes": "",
        "produto_id": 28,
        "quantidade": 3,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-22",
        "id": 155,
        "observacoes": "",
        "produto_id": 34,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-22",
        "id": 156,
        "observacoes": "",
        "produto_id": 26,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-22",
        "id": 157,
        "observacoes": "",
        "produto_id": 32,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-22",
        "id": 158,
        "observacoes": "",
        "produto_id": 22,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-22",
        "id": 159,
        "observacoes": "",
        "produto_id": 18,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-22",
        "id": 160,
        "observacoes": "",
        "produto_id": 19,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-22",
        "id": 161,
        "observacoes": "",
        "produto_id": 17,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-28",
        "id": 162,
        "observacoes": "",
        "produto_id": 52,
        "quantidade": 16,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-28",
        "id": 163,
        "observacoes": "",
        "produto_id": 54,
        "quantidade": 8,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-28",
        "id": 164,
        "observacoes": "",
        "produto_id": 59,
        "quantidade": 5,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-28",
        "id": 165,
        "observacoes": "",
        "produto_id": 41,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-28",
        "id": 166,
        "observacoes": "",
        "produto_id": 46,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-28",
        "id": 167,
        "observacoes": "",
        "produto_id": 47,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-28",
        "id": 168,
        "observacoes": "",
        "produto_id": 38,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-28",
        "id": 169,
        "observacoes": "",
        "produto_id": 44,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-28",
        "id": 170,
        "observacoes": "",
        "produto_id": 45,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-28",
        "id": 171,
        "observacoes": "",
        "produto_id": 33,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-28",
        "id": 172,
        "observacoes": "",
        "produto_id": 27,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-28",
        "id": 173,
        "observacoes": "",
        "produto_id": 30,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-28",
        "id": 174,
        "observacoes": "",
        "produto_id": 28,
        "quantidade": 2,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-28",
        "id": 175,
        "observacoes": "",
        "produto_id": 34,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-28",
        "id": 176,
        "observacoes": "",
        "produto_id": 26,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-28",
        "id": 177,
        "observacoes": "",
        "produto_id": 32,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-28",
        "id": 178,
        "observacoes": "",
        "produto_id": 11,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-28",
        "id": 179,
        "observacoes": "",
        "produto_id": 21,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-05-28",
        "id": 180,
        "observacoes": "",
        "produto_id": 22,
        "quantidade": 1,
        "responsavel": "grilo",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-06-01",
        "id": 181,
        "observacoes": "",
        "produto_id": 3,
        "quantidade": 20,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-06-01",
        "id": 182,
        "observacoes": "",
        "produto_id": 1,
        "quantidade": 20,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-06-01",
        "id": 183,
        "observacoes": "",
        "produto_id": 5,
        "quantidade": 11,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-06-01",
        "id": 184,
        "observacoes": "",
        "produto_id": 4,
        "quantidade": 14,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-06-01",
        "id": 185,
        "observacoes": "",
        "produto_id": 2,
        "quantidade": 10,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-06-01",
        "id": 186,
        "observacoes": "",
        "produto_id": 8,
        "quantidade": 2,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-06-01",
        "id": 187,
        "observacoes": "",
        "produto_id": 10,
        "quantidade": 4,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-06-01",
        "id": 188,
        "observacoes": "",
        "produto_id": 3,
        "quantidade": 15,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-06-01",
        "id": 189,
        "observacoes": "",
        "produto_id": 1,
        "quantidade": 15,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-06-01",
        "id": 190,
        "observacoes": "",
        "produto_id": 5,
        "quantidade": 15,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-06-01",
        "id": 191,
        "observacoes": "",
        "produto_id": 4,
        "quantidade": 15,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-06-01",
        "id": 192,
        "observacoes": "",
        "produto_id": 2,
        "quantidade": 15,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-06-01",
        "id": 193,
        "observacoes": "",
        "produto_id": 10,
        "quantidade": 26,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-06-01",
        "id": 194,
        "observacoes": "",
        "produto_id": 8,
        "quantidade": 2,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-06-12",
        "id": 195,
        "observacoes": "",
        "produto_id": 13,
        "quantidade": 3,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-06-12",
        "id": 196,
        "observacoes": "",
        "produto_id": 10,
        "quantidade": 8,
        "responsavel": "Nath",
        "tipo": "entrada"
    },
    {
        "data_movimentacao": "2026-06-12",
        "id": 197,
        "observacoes": "",
        "produto_id": 14,
        "quantidade": 1,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-06-15",
        "id": 198,
        "observacoes": "180 embrulhos oficina HST.",
        "produto_id": 13,
        "quantidade": 180,
        "responsavel": "Léo",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-06-15",
        "id": 199,
        "observacoes": "",
        "produto_id": 3,
        "quantidade": 54,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-06-15",
        "id": 200,
        "observacoes": "",
        "produto_id": 1,
        "quantidade": 54,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-06-15",
        "id": 201,
        "observacoes": "",
        "produto_id": 5,
        "quantidade": 54,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-06-15",
        "id": 202,
        "observacoes": "",
        "produto_id": 4,
        "quantidade": 54,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-06-15",
        "id": 203,
        "observacoes": "",
        "produto_id": 2,
        "quantidade": 54,
        "responsavel": "Nath",
        "tipo": "saida"
    },
    {
        "data_movimentacao": "2026-06-16",
        "id": 204,
        "observacoes": "",
        "produto_id": 15,
        "quantidade": 2,
        "responsavel": "Nath",
        "tipo": "saida"
    }
];

async function run() {
  console.log("Iniciando importação de movimentacoes_estoque...");
  const colRef = collection(db, "inventory_moves");
  
  // Limpar dados existentes primeiro
  const snapshot = await getDocs(colRef);
  const batch = writeBatch(db);
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log("Limpeza de inventory_moves concluída.");

  // Importar novos dados
  const pSnapshot = await getDocs(collection(db, "inventory"));
  const pMap = new Map<string, string>();
  pSnapshot.docs.forEach(doc => {
    pMap.set(doc.id, doc.data().nome || "");
  });

  for (const move of moves) {
    const docId = String(move.id);
    const pId = String(move.produto_id);
    const nomeProd = pMap.get(pId) || "-";

    await setDoc(doc(db, "inventory_moves", docId), {
      produtoId: pId,
      nomeProduto: nomeProd,
      tipo: move.tipo,
      quantidade: move.quantidade,
      data: move.data_movimentacao,
      responsavel: move.responsavel,
      observacoes: move.observacoes || ""
    });
  }
  console.log(`Importação de ${moves.length} movimentações concluída.`);
  process.exit(0);
}

run().catch(err => {
  console.error("Erro na importaçao:", err);
  process.exit(1);
});

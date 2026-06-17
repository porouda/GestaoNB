import { initializeApp } from "firebase/app";
import { initializeFirestore, doc, setDoc, collection, getDocs, writeBatch } from "firebase/firestore";
import { readFileSync } from "fs";

const firebaseConfig = JSON.parse(readFileSync("./firebase-applet-config.json", "utf-8"));

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);

const tasks = [
    {
        "created_at": "2026-02-11 20:03:20",
        "data_conclusao": "2026-04-28",
        "id": 2,
        "nome": "Inventário dos materiais do Pitágoras",
        "observacoes": "",
        "prazo": "2026-04-10",
        "prioridade": "urgente",
        "responsaveis": "Leo e Wilson",
        "status": "done",
        "updated_at": "2026-04-28 13:52:15"
    },
    {
        "created_at": "2026-02-11 20:04:28",
        "data_conclusao": "2026-02-20",
        "id": 3,
        "nome": "Arrumar armário do Novo Mundo, guardar todo o material",
        "observacoes": "Concluido 20/02",
        "prazo": "2026-02-23",
        "prioridade": "normal",
        "responsaveis": "Grilo e Lucas",
        "status": "done",
        "updated_at": "2026-02-26 12:55:21"
    },
    {
        "created_at": "2026-02-11 20:04:59",
        "data_conclusao": "2026-02-22",
        "id": 4,
        "nome": "Manutenção dos materiais do Pitágoras - 2 caixas de domino (sala pitagoras) + 1 caixa (sala jogos externos) com material",
        "observacoes": "Concluído em 22/02",
        "prazo": "2026-02-24",
        "prioridade": "normal",
        "responsaveis": "Leo",
        "status": "done",
        "updated_at": "2026-02-26 12:57:52"
    },
    {
        "created_at": "2026-02-11 20:05:36",
        "data_conclusao": "2026-04-16",
        "id": 5,
        "nome": "Inventário e numerar todos os uniformes",
        "observacoes": "Aguardando a chegada das etiquetas DTF para iniciar\nEtiquetas chegaram!",
        "prazo": "2026-02-27",
        "prioridade": "normal",
        "responsaveis": "Grilo; Léo",
        "status": "done",
        "updated_at": "2026-04-16 16:52:07"
    },
    {
        "created_at": "2026-02-11 20:06:04",
        "data_conclusao": "2026-02-22",
        "id": 6,
        "nome": "Manutenção dos uniformes",
        "observacoes": "Etiquetas novas ok\nUniformes antigos retirar tags ok",
        "prazo": "2026-02-22",
        "prioridade": "normal",
        "responsaveis": "Grilo e Wilson",
        "status": "done",
        "updated_at": "2026-02-26 13:04:10"
    },
    {
        "created_at": "2026-02-11 20:06:58",
        "data_conclusao": "2026-02-27",
        "id": 7,
        "nome": "Etiquetas de identificação das prateleiras dos materiais",
        "observacoes": "",
        "prazo": "2026-02-23",
        "prioridade": "normal",
        "responsaveis": "Grilo, Wilson e Rafa",
        "status": "done",
        "updated_at": "2026-02-27 13:05:58"
    },
    {
        "created_at": "2026-02-11 20:07:42",
        "data_conclusao": "2026-02-22",
        "id": 8,
        "nome": "Etiquetas das malas novas",
        "observacoes": "Concluído em 22/02",
        "prazo": "2026-02-24",
        "prioridade": "normal",
        "responsaveis": "Rafa",
        "status": "done",
        "updated_at": "2026-02-26 12:57:14"
    },
    {
        "created_at": "2026-02-11 20:08:10",
        "data_conclusao": null,
        "id": 9,
        "nome": "Revisar e guardar materiais dos jogos externos",
        "observacoes": "",
        "prazo": "2026-02-28",
        "prioridade": "importante",
        "responsaveis": "Grilo, Nath e Leo",
        "status": "doing",
        "updated_at": "2026-04-10 14:48:17"
    },
    {
        "created_at": "2026-02-11 20:08:37",
        "data_conclusao": "2026-03-16",
        "id": 10,
        "nome": "Organizar armários da Oficina do Bem",
        "observacoes": "",
        "prazo": "2026-02-24",
        "prioridade": "normal",
        "responsaveis": "Grilo e Nath",
        "status": "done",
        "updated_at": "2026-03-16 17:03:52"
    },
    {
        "created_at": "2026-02-11 20:09:09",
        "data_conclusao": "2026-02-22",
        "id": 11,
        "nome": "Limpar e organizar salas de produção e expedição",
        "observacoes": "Concluído em 22/02",
        "prazo": "2026-02-22",
        "prioridade": "normal",
        "responsaveis": "Lucas e Grilo",
        "status": "done",
        "updated_at": "2026-02-26 12:57:44"
    },
    {
        "created_at": "2026-02-12 18:01:48",
        "data_conclusao": "2026-02-20",
        "id": 13,
        "nome": "Arrumar armário de material de escritório",
        "observacoes": "Concluiído em 20/02",
        "prazo": "2026-02-27",
        "prioridade": "normal",
        "responsaveis": "Rafa e Wilson",
        "status": "done",
        "updated_at": "2026-02-26 12:57:32"
    },
    {
        "created_at": "2026-02-13 14:40:26",
        "data_conclusao": "2026-03-12",
        "id": 14,
        "nome": "Testar caixinhas novas de imã do Kronos",
        "observacoes": "Vamos precisar das 25 caixas funcionando bem e mais algumas reservas.\nVamos usar todas na Althaia dia 13/03",
        "prazo": "2026-03-09",
        "prioridade": "urgente",
        "responsaveis": "Leo",
        "status": "done",
        "updated_at": "2026-03-12 12:04:05"
    },
    {
        "created_at": "2026-02-13 14:45:20",
        "data_conclusao": "2026-03-10",
        "id": 15,
        "nome": "Terminar Máquina nova Kronos",
        "observacoes": "Finalizar a caixa pequena e trocar leds das luminárias",
        "prazo": "2026-02-27",
        "prioridade": "importante",
        "responsaveis": "Wilson",
        "status": "done",
        "updated_at": "2026-03-10 16:02:58"
    },
    {
        "created_at": "2026-02-18 19:19:02",
        "data_conclusao": "2026-04-15",
        "id": 16,
        "nome": "Caixa teste de madeira do Kronos",
        "observacoes": "",
        "prazo": "2026-02-27",
        "prioridade": "normal",
        "responsaveis": "Wilson",
        "status": "done",
        "updated_at": "2026-04-15 14:07:11"
    },
    {
        "created_at": "2026-02-23 18:55:15",
        "data_conclusao": "2026-03-25",
        "id": 17,
        "nome": "Inventário dos materiais escritório e atividades para incluir no sistema",
        "observacoes": "",
        "prazo": "2026-02-27",
        "prioridade": "normal",
        "responsaveis": "Nath",
        "status": "done",
        "updated_at": "2026-03-25 13:08:47"
    },
    {
        "created_at": "2026-03-10 20:04:47",
        "data_conclusao": "2026-04-01",
        "id": 19,
        "nome": "Criar roteiro coordenador do evento",
        "observacoes": "",
        "prazo": "2026-03-12",
        "prioridade": "importante",
        "responsaveis": "Wilson e Lucas",
        "status": "done",
        "updated_at": "2026-04-01 12:37:20"
    },
    {
        "created_at": "2026-03-10 20:10:19",
        "data_conclusao": "2026-03-16",
        "id": 20,
        "nome": "Painel de lovebacks impresso",
        "observacoes": "",
        "prazo": "2026-03-20",
        "prioridade": "normal",
        "responsaveis": "Tati Dentini e Yugi",
        "status": "done",
        "updated_at": "2026-03-16 17:04:24"
    },
    {
        "created_at": "2026-04-01 12:40:09",
        "data_conclusao": null,
        "id": 21,
        "nome": "Prototipo carro de Madeira",
        "observacoes": "",
        "prazo": "2026-04-10",
        "prioridade": "importante",
        "responsaveis": "Wilson",
        "status": "todo",
        "updated_at": "2026-04-01 19:51:44"
    },
    {
        "created_at": "2026-04-08 19:50:03",
        "data_conclusao": "2026-05-20",
        "id": 22,
        "nome": "Comprar celular novo Staff",
        "observacoes": "",
        "prazo": "2026-04-17",
        "prioridade": "urgente",
        "responsaveis": "wilson",
        "status": "done",
        "updated_at": "2026-05-20 12:35:38"
    },
    {
        "created_at": "2026-04-08 19:51:06",
        "data_conclusao": "2026-04-09",
        "id": 23,
        "nome": "Comprar papeleiras",
        "observacoes": "Organizar papeis nos armarios",
        "prazo": "2026-04-10",
        "prioridade": "normal",
        "responsaveis": "Wilson e Lucas",
        "status": "done",
        "updated_at": "2026-04-09 18:04:56"
    },
    {
        "created_at": "2026-04-08 19:51:49",
        "data_conclusao": null,
        "id": 24,
        "nome": "fazer caixas padrao para guardar tinta",
        "observacoes": "Pedir para o sirvão fazer",
        "prazo": "2026-04-17",
        "prioridade": "normal",
        "responsaveis": "wilson",
        "status": "doing",
        "updated_at": "2026-04-09 18:05:00"
    },
    {
        "created_at": "2026-04-09 19:38:19",
        "data_conclusao": null,
        "id": 25,
        "nome": "Fazer caixas para chocolate",
        "observacoes": "",
        "prazo": "2026-04-30",
        "prioridade": "normal",
        "responsaveis": "Wilson",
        "status": "doing",
        "updated_at": "2026-05-20 12:36:55"
    },
    {
        "created_at": "2026-04-22 12:05:34",
        "data_conclusao": null,
        "id": 26,
        "nome": "Conserto Malas",
        "observacoes": "",
        "prazo": "2026-04-20",
        "prioridade": "normal",
        "responsaveis": "Léo",
        "status": "done",
        "updated_at": "2026-04-22 12:06:05"
    },
    {
        "created_at": "2026-04-22 12:07:56",
        "data_conclusao": "2026-04-27",
        "id": 27,
        "nome": "Conserto Malas",
        "observacoes": "",
        "prazo": "2026-04-20",
        "prioridade": "normal",
        "responsaveis": "Léo",
        "status": "done",
        "updated_at": "2026-04-27 17:58:23"
    },
    {
        "created_at": "2026-04-28 13:54:08",
        "data_conclusao": "2026-05-20",
        "id": 28,
        "nome": "Limpar caixas pitágoras",
        "observacoes": "Limpar e concertar caixas. ",
        "prazo": "2026-05-05",
        "prioridade": "normal",
        "responsaveis": "Léo, Nath e Grilo",
        "status": "done",
        "updated_at": "2026-05-20 13:56:47"
    },
    {
        "created_at": "2026-05-20 13:52:04",
        "data_conclusao": null,
        "id": 29,
        "nome": "Luvas Cidade Luz",
        "observacoes": "Testar com tinta da oficina. ",
        "prazo": "2026-06-15",
        "prioridade": "normal",
        "responsaveis": "Léo e Nath",
        "status": "todo",
        "updated_at": "2026-05-20 13:52:04"
    },
    {
        "created_at": "2026-05-21 20:32:54",
        "data_conclusao": "2026-06-09",
        "id": 30,
        "nome": "Montar kits CBTD",
        "observacoes": "Aguardando chegar folders NB.",
        "prazo": "2026-05-29",
        "prioridade": "importante",
        "responsaveis": "Léo, Grilo e Nath",
        "status": "done",
        "updated_at": "2026-06-09 13:12:21"
    },
    {
        "created_at": "2026-05-21 20:37:14",
        "data_conclusao": "2026-06-09",
        "id": 31,
        "nome": "Separar materiais CBTD",
        "observacoes": "Separar jogos, decoration...",
        "prazo": "2026-05-29",
        "prioridade": "importante",
        "responsaveis": "Léo, Nath e Grilo",
        "status": "done",
        "updated_at": "2026-06-09 13:13:04"
    },
    {
        "created_at": "2026-05-21 20:39:19",
        "data_conclusao": "2026-06-09",
        "id": 32,
        "nome": "Separar uniformes CBTD",
        "observacoes": "",
        "prazo": "2026-05-29",
        "prioridade": "importante",
        "responsaveis": "Léo e Grilo",
        "status": "done",
        "updated_at": "2026-06-09 13:12:56"
    },
    {
        "created_at": "2026-05-22 20:44:52",
        "data_conclusao": null,
        "id": 33,
        "nome": "Reformar materiais de jogos externos",
        "observacoes": "",
        "prazo": "2026-06-15",
        "prioridade": "normal",
        "responsaveis": "Léo, Nath e Grilo",
        "status": "todo",
        "updated_at": "2026-05-22 20:44:52"
    },
    {
        "created_at": "2026-06-01 12:32:57",
        "data_conclusao": null,
        "id": 34,
        "nome": "Colocar espumas mala Kronos antes do CBTD",
        "observacoes": "Tirar os papelões e colocar as espumas pra proteger a máquina do Kronos antes do CBTD",
        "prazo": "2026-06-05",
        "prioridade": "urgente",
        "responsaveis": "Léo, Grilo e Nath",
        "status": "todo",
        "updated_at": "2026-06-01 12:33:08"
    },
    {
        "created_at": "2026-06-01 14:57:27",
        "data_conclusao": null,
        "id": 35,
        "nome": "Trocar Lousa de vidro de local",
        "observacoes": "tirar lousa que esta atras da TV e colocar na sala, para centralizar principalmente pedidos de compras.",
        "prazo": "2026-06-12",
        "prioridade": "importante",
        "responsaveis": "Leo e Wilson",
        "status": "todo",
        "updated_at": "2026-06-01 14:57:27"
    }
];

async function run() {
  console.log("Iniciando importação de tarefas/tarefas...");
  const colRef = collection(db, "tasks");
  
  // Limpar dados existentes primeiro
  const snapshot = await getDocs(colRef);
  const batch = writeBatch(db);
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log("Limpeza de tasks concluída.");

  // Importar novos dados
  for (const task of tasks) {
    const docId = String(task.id);
    let finalPrioridade: "normal" | "alta" | "baixa" = "normal";
    if (task.prioridade === "urgente" || task.prioridade === "alta" || task.prioridade === "importante") {
      finalPrioridade = "alta";
    } else if (task.prioridade === "baixa") {
      finalPrioridade = "baixa";
    }

    await setDoc(doc(db, "tasks", docId), {
      nome: task.nome,
      responsaveis: task.responsaveis,
      prazo: task.prazo,
      prioridade: finalPrioridade,
      status: task.status,
      observacoes: task.observacoes,
      data_conclusao: task.data_conclusao,
      createdAt: task.created_at || new Date().toISOString()
    });
  }
  console.log("Importação de tasks concluída.");
  process.exit(0);
}

run().catch(err => {
  console.error("Erro na importaçao:", err);
  process.exit(1);
});

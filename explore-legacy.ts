import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const configPath = path.resolve('./firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
    const collectionsToTry = [
        'inventory_moves', 'movimentacoes', 'movimentacoes_estoque', 'estoque_movimentacoes', 'historico_estoque',
        'tasks', 'tarefas', 'kanban_tasks', 'tarefas_kanban', 'boards', 'kanban'
    ];
    
    for (const col of collectionsToTry) {
        try {
            const snap = await getDocs(query(collection(db, col), limit(2)));
            if (!snap.empty) {
                console.log(`\n=== Collection: ${col} ===`);
                snap.docs.forEach(d => console.log(d.id, d.data()));
            }
        } catch (e) {
            console.error(e);
        }
    }
    
    process.exit(0);
}
run();

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const configPath = path.resolve('./firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
    const snap = await getDocs(collection(db, 'trainings'));
    const allTrainings = snap.docs.map(d => ({id: d.id, ...d.data()} as any));
    
    const snapAllocs = await getDocs(collection(db, 'allocations'));
    const allAllocs = snapAllocs.docs.map(d => ({id: d.id, ...d.data()} as any));
    
    console.log("=== TRAININGS ON THE 14TH AND 15TH OF APRIL ===");
    
    allTrainings.forEach((t: any) => {
        let is14 = false;
        let is15 = false;
        
        const de = t.data_evento || t.dataEvento;
        let strDe = '';
        if (typeof de === 'string') strDe = de;
        else if (de?.toDate) strDe = de.toDate().toISOString();
        else if (de?.seconds) strDe = new Date(de.seconds * 1000).toISOString();
        
        if (strDe.includes('2026-04-14') || strDe.includes('14/04/2026')) is14 = true;
        if (strDe.includes('2026-04-15') || strDe.includes('15/04/2026')) is15 = true;
        
        if (is14 || is15) {
            console.log(`\n> Training Date: ${is14 ? '14/04' : '15/04'} | Nome: ${t.nome_negocio} | id collection: ${t.id} | id firestore: ${t.id}`);
            
            // Find allocs for this training
            const allocsForT = allAllocs.filter(a => {
                const tid = a.treinamento_id?.id || a.treinamento_id || a.treinamento?.id || a.treinamento;
                return tid == t.id || tid == t.nome_negocio;
            });
            console.log(`  Allocations associated in DB: ${allocsForT.length}`);
            allocsForT.forEach(a => console.log(`    - Staff: left ID ${a.staff_id?.id || a.staff_id}`));
        }
    });

    process.exit(0);
}
run().catch(console.error);

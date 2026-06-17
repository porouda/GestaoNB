import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const configPath = path.resolve('./firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
    console.log("Fetching all allocations...");
    const snap = await getDocs(collection(db, 'allocations'));
    const allocs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    
    console.log(`Total allocations in DB: ${allocs.length}`);
    
    const targets = ['2026_107_COOPER ITAIPU', '2026_267_NTT DATA_Sales', '2026_302_CEVA'];
    
    const relevant = allocs.filter(a => {
        const tid = a.treinamento_id?.id || a.treinamento_id || a.treinamento?.id || a.treinamento;
        if (!tid) return false;
        
        return targets.some(t => typeof tid === 'string' && tid.includes(t)) || 
               targets.some(t => typeof tid === 'string' && tid.includes(t.split('_')[1]));
    });
    
    console.log(`\nAllocations linked to target trainings (14/04 or 15/04 expected): ${relevant.length}`);
    relevant.forEach(r => {
        const tid = r.treinamento_id?.id || r.treinamento_id || r.treinamento?.id || r.treinamento;
        console.log(`- Alloc ID: ${r.id} | Treinamento: ${tid}`);
        console.log(`  Data Alocacao:`, r.data_alocacao);
        console.log(`  Data Evento:`, r.data_evento);
        console.log(`  Staff ID:`, r.staff_id?.id || r.staff_id);
    });
    
    console.log("\nSearching for any allocations on April 14 or 15 by parsing their timestamps/dates...");
    let cnt14 = 0;
    let cnt15 = 0;
    let ex14 = [];
    let ex15 = [];
    
    allocs.forEach(a => {
        const da = a.data_alocacao;
        const de = a.data_evento;
        
        const checkDate = (d: any) => {
            if (!d) return null;
            if (typeof d === 'string') return d;
            if (d.toDate && typeof d.toDate === 'function') return d.toDate().toISOString();
            if (d.seconds) return new Date(d.seconds * 1000).toISOString();
            return null;
        };
        
        const strDa = checkDate(da) || '';
        const strDe = checkDate(de) || '';
        
        if (strDa.includes('2026-04-14') || strDe.includes('2026-04-14') || strDa.includes('14/04/2026') || strDe.includes('14/04/2026')) {
            cnt14++;
            ex14.push(a);
        }
        if (strDa.includes('2026-04-15') || strDe.includes('2026-04-15') || strDa.includes('15/04/2026') || strDe.includes('15/04/2026')) {
            cnt15++;
            ex15.push(a);
        }
    });
    
    console.log(`Found ${cnt14} allocations with dates resolving to 14/04.`);
    ex14.forEach((r: any) => {
        const tid = r.treinamento_id?.id || r.treinamento_id || r.treinamento?.id || r.treinamento;
        console.log(`  - Alloc ID: ${r.id} | Treinamento: ${tid} | Data Alocacao:`, r.data_alocacao);
    });
    
    console.log(`Found ${cnt15} allocations with dates resolving to 15/04.`);
    ex15.forEach((r: any) => {
        const tid = r.treinamento_id?.id || r.treinamento_id || r.treinamento?.id || r.treinamento;
        console.log(`  - Alloc ID: ${r.id} | Treinamento: ${tid} | Data Alocacao:`, r.data_alocacao);
    });
    
    process.exit(0);
}
run().catch(console.error);

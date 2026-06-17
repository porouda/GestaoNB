import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const configPath = path.resolve('./firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
    const snap = await getDocs(collection(db, 'inventory'));
    const items = snap.docs.map(doc => doc.data());
    
    if (items.length > 0) {
        console.log("FIRST 5 ITEMS:");
        console.log(items.slice(0, 5));
    } else {
        // Maybe it operates differently? Let me check another collection
        const snap2 = await getDocs(collection(db, 'estoque'));
        const items2 = snap2.docs.map(doc => doc.data());
        console.log("FIRST 5 ITEMS IN ESTOQUE:");
        console.log(items2.slice(0, 5));
    }
    process.exit(0);
}
run();

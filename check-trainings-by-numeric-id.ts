import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const configPath = path.resolve('./firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
    const tids = ['57397638972', '57789852035'];
    
    for (const tid of tids) {
        console.log(`Checking training config for ID: ${tid}`);
        let d = await getDoc(doc(db, 'treinamentos', tid));
        if (d.exists()) {
            console.log(`=> Found in 'treinamentos' collection:`);
            console.log(d.data());
        } else {
            d = await getDoc(doc(db, 'trainings', tid));
            if (d.exists()) {
                console.log(`=> Found in 'trainings' collection:`);
                console.log(d.data());
            } else {
                console.log(`=> Not found by document ID! Searching values...`);
                // Check all collections for the id string somehow
            }
        }
    }
    
    // Also lets just search treinamentos collection directly for the text
    const snap = await getDocs(collection(db, 'treinamentos'));
    console.log(`Scanning ${snap.docs.length} treinamentos for these IDs...`);
    snap.docs.forEach(doc => {
       const str = JSON.stringify(doc.data());
       if (str.includes(tids[0]) || str.includes(tids[1])) {
           console.log(`Found string match in doc ID: ${doc.id}`);
           console.log(doc.data());
       }
    });
    
    process.exit(0);
}
run().catch(console.error);

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from "firebase/app";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    writeBatch, 
    doc 
} from "firebase/firestore";

async function seed() {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

  const csvPath = path.join(process.cwd(), 'master_checklist.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n');
  const headerLine = lines[0];
  const headers = headerLine.split(';');

  const programs = headers.slice(0, 20).map(p => p.trim());
  const tasks: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(';');
    if (cols.length < 24) continue;

    const description = cols[24]?.trim();
    const phase = cols[23]?.trim();

    if (!description || description === 'DESCRIÇÃO') continue;

    const activePrograms: string[] = [];
    for (let pIdx = 0; pIdx < 20; pIdx++) {
      const val = cols[pIdx]?.toLowerCase().trim();
      if (val === 'x' || val === 's' || val === '?') {
        activePrograms.push(programs[pIdx]);
      }
    }

    if (activePrograms.length > 0) {
      tasks.push({
        descricao: description,
        fase: phase || 'Geral',
        programas: activePrograms,
        ordem: i
      });
    }
  }

  console.log(`Found ${tasks.length} tasks. Starting upload to ${firebaseConfig.projectId}/${firebaseConfig.firestoreDatabaseId} (Client SDK)...`);

  // Simple batch upload
  const batchSize = 100;
  for (let i = 0; i < tasks.length; i += batchSize) {
    const chunk = tasks.slice(i, i + batchSize);
    const batch = writeBatch(db);

    chunk.forEach(task => {
      const docRef = doc(collection(db, 'checklist_templates'));
      batch.set(docRef, task);
    });

    try {
      await batch.commit();
      console.log(`Uploaded tasks ${i + 1} to ${Math.min(i + batchSize, tasks.length)}`);
    } catch (e: any) {
        console.error(`Batch ${i} failed:`, e.message);
        throw e;
    }
  }

  console.log('Seeding completed successfully!');
}

seed().catch(err => {
  console.error('Error seeding checklist:', err);
  process.exit(1);
});

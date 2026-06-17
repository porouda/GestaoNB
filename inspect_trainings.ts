
import { db } from './src/lib/firebase';
import { collection, getDocs, limit, query } from 'firebase/firestore';

async function inspectTrainings() {
  console.log('--- INSPECTING TRAININGS ---');
  const q = query(collection(db, 'trainings'), limit(10));
  const snap = await getDocs(q);
  
  snap.forEach(doc => {
    console.log('ID:', doc.id);
    const d = doc.data();
    console.log('Nome:', d.nomeNegocio || d.nome_negocio || d.cliente);
    console.log('Data:', d.dataEvento || d.data_evento);
    console.log('---------------------------');
  });
  process.exit(0);
}

inspectTrainings().catch(console.error);

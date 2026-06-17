import { db } from './src/lib/firebase';
import { collection, getDocs, limit, query } from 'firebase/firestore';

async function checkIds() {
  console.log('--- CHECKING IDs ---');
  
  // Get a few allocations
  const allocs = await getDocs(query(collection(db, 'allocations'), limit(5)));
  allocs.forEach(doc => {
      const d = doc.data();
      console.log('Alloc ID:', doc.id, 'TrainID:', d.treinamento_id);
  });

  // Get a few trainings
  const trains = await getDocs(query(collection(db, 'trainings'), limit(5)));
  trains.forEach(doc => {
      console.log('Train ID:', doc.id);
  });
}

checkIds().catch(console.error);

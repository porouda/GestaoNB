
import { db } from './src/lib/firebase';
import { collection, getDocs, limit, query } from 'firebase/firestore';

async function inspectAllocations() {
  console.log('--- INSPECTING ALLOCATIONS ---');
  const q = query(collection(db, 'allocations'), limit(10));
  const snap = await getDocs(q);
  
  snap.forEach(doc => {
    console.log('ID:', doc.id);
    console.log('Data:', JSON.stringify(doc.data(), null, 2));
    console.log('---------------------------');
  });
}

inspectAllocations().catch(console.error);

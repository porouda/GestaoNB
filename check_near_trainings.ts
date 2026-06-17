
import { db } from './src/lib/firebase';
import { collection, getDocs, limit, query } from 'firebase/firestore';

async function checkNearDates() {
  console.log('--- CHECKING TRAININGS NEAR 2026-05-23 ---');
  const snap = await getDocs(collection(db, 'trainings'));
  
  const target = new Date('2026-05-23T12:00:00Z');
  
  snap.forEach(doc => {
    const d = doc.data();
    const rawDate = d.dataEvento || d.data_evento || d.data;
    if (!rawDate) return;
    
    let dVal;
    if (rawDate.toDate) dVal = rawDate.toDate();
    else dVal = new Date(rawDate);
    
    if (dVal.getFullYear() === 2026 && dVal.getMonth() === 4) { // May is 4
        console.log('ID:', doc.id);
        console.log('Nome:', d.nomeNegocio || d.cliente);
        console.log('Data:', dVal.toISOString());
        console.log('---------------------------');
    }
  });
}

checkNearDates().catch(console.error);


import { db } from './src/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

async function checkStaffs() {
  const ids = ['107', '202', '275'];
  for (const id of ids) {
    const d = await getDoc(doc(db, 'staffs', id));
    console.log(`Staff ${id}: exists=${d.exists()}`, d.exists() ? d.data() : '');
  }
}

checkStaffs().catch(console.error);

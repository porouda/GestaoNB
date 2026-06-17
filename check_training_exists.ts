
import { db } from './src/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

async function checkTraining() {
  const tId = '36962053809';
  const d = await getDoc(doc(db, 'trainings', tId));
  console.log(`Training ${tId}: exists=${d.exists()}`);
  if (d.exists()) {
    console.log(d.data());
  }
}

checkTraining().catch(console.error);

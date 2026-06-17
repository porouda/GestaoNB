
import { db } from './src/lib/firebase';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';

async function findRosaneAllocations() {
  const rosaneId = '237';
  const allocSnap = await getDocs(collection(db, 'allocations'));
  
  let found = 0;
  for (const docSnapshot of allocSnap.docs) {
      const a = docSnapshot.data();
      
      const getRefId = (ref: any): string => {
        if (!ref) return "";
        if (typeof ref === "string") {
            const s = ref.trim();
            if (s.includes("/")) return String(s.split("/").pop());
            return s;
        }
        if (ref.id) return String(ref.id);
        try { return String(ref).trim(); } catch { return ""; }
      };
      
      const sid = getRefId(a.staff_id || a.staffId || a.id_staff || a.staff || a.facilitador_id || a.facilitador || a.staff_ref || a.id_facilitador);
      const staffSid = String(sid).trim().toLowerCase();
      
      if (staffSid === rosaneId) {
          found++;
          console.log('Match found! ID:', docSnapshot.id, 'Status:', a.status);
      }
  }
  
  console.log('Total de alocações encontradas:', found);
}

findRosaneAllocations().catch(console.error);

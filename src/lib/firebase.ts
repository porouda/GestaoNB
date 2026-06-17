import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// IMPORTANTE: experimentalForceLongPolling é essencial para não quebrar a conexão no AI Studio
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

// Helper to handle both String and Timestamp from Firestore for display
export function formatarDataParaExibicao(val: any) {
  if (!val) return '';
  let d: Date;
  
  if (val && typeof val.toDate === 'function') {
      d = val.toDate();
      // Ajuste de timezone para datas puras (salvas como 00:00 UTC)
      if (d.getHours() >= 20) {
        d = new Date(d.getTime() + (6 * 60 * 60 * 1000));
      }
      return d.toLocaleDateString('pt-BR');
  }
  
  if (typeof val === 'string' && val.includes('-')) {
      const parts = val.split('-');
      if (parts.length === 3) {
          // Se for YYYY-MM-DD
          if (parts[0].length === 4) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
          }
          // Se for DD-MM-YYYY
          return `${parts[0]}/${parts[1]}/${parts[2]}`;
      }
  }
  return val;
}

// Helper to handle both String and Timestamp from Firestore for <input type="date">
export function formatarDataParaInput(val: any) {
  if (!val) return '';
  let d: Date;
  if (val && typeof val.toDate === 'function') {
      d = val.toDate();
  } else if (typeof val === 'string' && val.includes('-')) {
      const parts = val.split('-').map(Number);
      if (parts.length === 3) {
          d = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
      } else {
          d = new Date(val);
      }
  } else {
      d = new Date(val);
  }
  
  if (isNaN(d.getTime())) return '';
  
  // Se for Timestamp carregado e estiver perto da meia-noite (recuo de timezone), ajusta
  if (d.getHours() >= 20) {
    d = new Date(d.getTime() + (6 * 60 * 60 * 1000));
  }
  
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function normalizeDate(dateVal: any) {
  if (!dateVal) return null;
  if (dateVal.toDate && typeof dateVal.toDate === 'function') return dateVal.toDate();
  if (typeof dateVal === 'string') {
    if (dateVal.includes('/')) {
      const [d, m, y] = dateVal.split('/').map(Number);
      const date = new Date(y, m - 1, d, 12, 0, 0);
      return isNaN(date.getTime()) ? null : date;
    }
    // Fix: Handle YYYY-MM-DD string as UTC date
    if (dateVal.includes('-')) {
      const parts = dateVal.split('-').map(Number);
      if (parts.length === 3) {
        const [y, m, d] = parts;
        // Use ISO string to force UTC parsing
        const date = new Date(`${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T12:00:00Z`);
        return isNaN(date.getTime()) ? null : date;
      }
    }
    const date = new Date(dateVal);
    date.setUTCHours(12, 0, 0, 0);
    return isNaN(date.getTime()) ? null : date;
  }
  const d = new Date(dateVal);
  d.setUTCHours(12, 0, 0, 0);
  return isNaN(d.getTime()) ? null : d;
}

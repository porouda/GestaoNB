// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  initializeFirestore,
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  getDocFromServer 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  projectId: "ai-studio-applet-webapp-7b401",
  appId: "1:1011578674189:web:cd71161032b5e7d8df4944",
  apiKey: "AIzaSyBhZF3e8OvNJcRBOZ-bJI8SRvS8mp2y9-E",
  authDomain: "ai-studio-applet-webapp-7b401.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-f1057566-a24d-4948-8dc9-abee9cf01c34",
  storageBucket: "ai-studio-applet-webapp-7b401.firebasestorage.app",
  messagingSenderId: "1011578674189",
  measurementId: ""
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// IMPORTANT: Force Long Polling to avoid 10s delay in sandboxed iframes/proxies
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false
}, firebaseConfig.firestoreDatabaseId);

const googleProvider = new GoogleAuthProvider();

// Error handling helper
function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  alert(`Erro no Firestore (${operationType} em ${path}): ${errInfo.error}\n\nVerifique as regras do Firestore ou se você está logado corretamente.`);
  throw new Error(JSON.stringify(errInfo));
}

// Test connection removed for performance
async function testConnection() {
  console.time('Firestore Connection Test');
  try {
    await getDocs(query(collection(db, 'staffs'), where('id', '==', -1)));
    console.log("Firestore connection established.");
  } catch (error) {
    console.error("Firestore connection error:", error);
  } finally {
    console.timeEnd('Firestore Connection Test');
  }
}

// Global debug
window.debugFirestore = { db, auth, testConnection };

// Helper to handle both String and Timestamp from Firestore for display
function formatarDataParaExibicao(val) {
  if (!val) return '';
  if (val.toDate && typeof val.toDate === 'function') {
      const d = val.toDate();
      return d.toLocaleDateString('pt-BR');
  }
  if (typeof val === 'string' && val.includes('-')) {
      return val.split('-').reverse().join('/');
  }
  return val;
}

// Helper to handle both String and Timestamp from Firestore for <input type="date">
function formatarDataParaInput(val) {
  if (!val) return '';
  let d;
  if (val.toDate && typeof val.toDate === 'function') {
      d = val.toDate();
  } else if (typeof val === 'string') {
      d = new Date(val);
  } else {
      d = new Date(val);
  }
  
  if (isNaN(d.getTime())) return '';
  
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export { app, auth, db, googleProvider, handleFirestoreError, onAuthStateChanged, signInWithPopup, signOut, doc, getDoc, getDocs, setDoc, collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, formatarDataParaExibicao, formatarDataParaInput };

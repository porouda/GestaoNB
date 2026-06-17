import { db } from './firebase';
import { collection, addDoc, serverTimestamp, FieldValue } from 'firebase/firestore';

export const registrarLogAlocacao = async (
  negocioId: string | null,
  message: string,
  user: any,
  changes: any[] | null = null
) => {
  try {
    await addDoc(collection(db, 'allocation_logs'), {
      treinamento_id: negocioId,
      negocio_id: negocioId,
      message: message,
      changes: changes || null,
      timestamp: serverTimestamp(),
      user: user?.nome || "Sistema",
      userId: user?.id || null,
    });
  } catch (e) {
    console.error('Erro ao registrar log de alocação:', e);
  }
};

import { db, doc, setDoc, deleteDoc, serverTimestamp, handleFirestoreError } from './firebase-config.js';
import { registrarLog, atualizarNumeracaoStaffs } from './alocacao-core.js';

// js/alocacao-dragdrop.js

export function initDragDrop() {
    // 1. Delegação de Eventos para as Colunas de Treinamento (ENTRADA / TRANSFERÊNCIA)
    const treinamentosParent = document.getElementById('treinamentosContainer');
    if (treinamentosParent && !treinamentosParent.dataset.delegated) {
        
        treinamentosParent.addEventListener('dragover', e => e.preventDefault());

        treinamentosParent.addEventListener('drop', async (e) => {
            e.preventDefault();
            
            // LIMPEZA DE SEGURANÇA: Remove a transparência de qualquer card na tela
            document.querySelectorAll('.staff-item').forEach(item => {
                item.classList.remove('dragging-source');
            });

            const targetCol = e.target.closest('.staffs-allocated');
            if (!targetCol) return;

            const staffId = e.dataTransfer.getData('staff-id');
            const origemId = e.dataTransfer.getData('origem-id');
            const destinoId = targetCol.getAttribute('data-treinamento-id');

            if (origemId === destinoId) return;

            const alocId = `${destinoId}_${staffId}`;
            const dataObj = new Date(window.dataSelecionada + 'T12:00:00'); // Garante meio-dia para evitar problemas de fuso
            
            const alocData = {
                staff_id: staffId,
                treinamento_id: destinoId,
                data_alocacao: dataObj,
                status: 'intencao',
                updatedAt: serverTimestamp()
            };

            try {
                await setDoc(doc(db, 'allocations', alocId), alocData);
                if (origemId) {
                    await deleteDoc(doc(db, 'allocations', `${origemId}_${staffId}`));
                    registrarLog('transferência', `Staff [${window.staffCache[staffId]}] transferido do treinamento [${origemId}] para [${destinoId}]`, destinoId);
                } else {
                    registrarLog('alocação', `Staff [${window.staffCache[staffId]}] alocado ao treinamento [${destinoId}]`, destinoId);
                }
            } catch (err) {
                handleFirestoreError(err, 'WRITE', 'allocations');
            }
        });
        
        treinamentosParent.dataset.delegated = "true";
    }

    // 2. Delegação de Eventos para a Coluna de Disponíveis (EXCLUSÃO / VOLTA)
    const staffsParent = document.getElementById('staffsContainer');
    if (staffsParent && !staffsParent.dataset.delegated) {
        
        staffsParent.addEventListener('dragover', e => e.preventDefault());

        staffsParent.addEventListener('drop', async (e) => {
            e.preventDefault();
            const staffId = e.dataTransfer.getData('staff-id');
            const origemId = e.dataTransfer.getData('origem-id');

            if (!origemId) return;

            try {
                await deleteDoc(doc(db, 'allocations', `${origemId}_${staffId}`));
                registrarLog('exclusão', `Staff [${window.staffCache[staffId]}] removido do treinamento [${origemId}]`, origemId);
            } catch (err) {
                handleFirestoreError(err, 'DELETE', 'allocations');
            }

            // Limpeza de transparência
            document.querySelectorAll('.staff-item').forEach(item => item.classList.remove('dragging-source'));
        });

        staffsParent.dataset.delegated = "true";
    }
}

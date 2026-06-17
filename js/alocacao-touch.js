import { db, doc, setDoc, deleteDoc, serverTimestamp, handleFirestoreError } from './firebase-config.js';
import { registrarLog, atualizarNumeracaoStaffs } from './alocacao-core.js';

// js/alocacao-touch.js

let selectedStaffElement = null;

const isTouchDevice = () => {
    return (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0));
};

export function initTouchSupport() {
    if (!isTouchDevice()) return;
    
    console.log("Modo Touch: Ativando clique em qualquer área da coluna.");

    document.addEventListener('click', async function(e) {
        const clickedStaff = e.target.closest('.staff-item');
        const targetContainer = e.target.closest('.staffs-allocated, .staffs-column, #staffsContainer');

        if (!selectedStaffElement) {
            if (clickedStaff) {
                selectedStaffElement = clickedStaff;
                selectedStaffElement.classList.add('selected-touch');
                destacarAlvos(selectedStaffElement.parentElement);
            }
            return;
        }

        if (clickedStaff === selectedStaffElement) {
            desmarcarSelecao();
            return;
        }

        if (targetContainer && targetContainer !== selectedStaffElement.parentElement) {
            let finalTarget = targetContainer;
            if (targetContainer.classList.contains('staffs-column')) {
                finalTarget = document.getElementById('staffsContainer');
            } else if (!targetContainer.classList.contains('staffs-allocated') && targetContainer.id !== 'staffsContainer') {
                finalTarget = targetContainer.querySelector('.staffs-allocated') || document.getElementById('staffsContainer');
            }

            await processarMovimentacaoTouch(selectedStaffElement, finalTarget);
            desmarcarSelecao();
        } else {
            desmarcarSelecao();
        }
    });
}

async function processarMovimentacaoTouch(el, containerDestino) {
    const staffId = el.getAttribute('data-staff-id');
    const origemId = el.parentElement.getAttribute('data-treinamento-id') || "";
    const destinoId = containerDestino.getAttribute('data-treinamento-id') || ""; 
    const dataAlocacao = window.dataSelecionada;

    if (destinoId === "") {
        if (!origemId) return;
        try {
            await deleteDoc(doc(db, 'allocations', `${origemId}_${staffId}`));
            registrarLog('exclusão', `Staff [${window.staffCache[staffId]}] removido do treinamento [${origemId}] via touch`, origemId);
        } catch (err) {
            handleFirestoreError(err, 'DELETE', 'allocations');
        }
    } else {
        const alocId = `${destinoId}_${staffId}`;
        const alocData = {
            staff_id: staffId,
            treinamento_id: destinoId,
            data_alocacao: dataAlocacao,
            status: 'intencao',
            updatedAt: serverTimestamp()
        };

        try {
            await setDoc(doc(db, 'allocations', alocId), alocData);
            if (origemId) {
                await deleteDoc(doc(db, 'allocations', `${origemId}_${staffId}`));
                registrarLog('transferência', `Staff [${window.staffCache[staffId]}] transferido do treinamento [${origemId}] para [${destinoId}] via touch`, destinoId);
            } else {
                registrarLog('alocação', `Staff [${window.staffCache[staffId]}] alocado ao treinamento [${destinoId}] via touch`, destinoId);
            }
        } catch (err) {
            handleFirestoreError(err, 'WRITE', 'allocations');
        }
    }
}

function destacarAlvos(containerOrigem) {
    document.querySelectorAll('.staffs-allocated, #staffsContainer').forEach(el => {
        if (el !== containerOrigem) {
            el.classList.add('can-drop-touch');
        }
    });
}

function desmarcarSelecao() {
    if (selectedStaffElement) {
        selectedStaffElement.classList.remove('selected-touch');
    }
    selectedStaffElement = null;
    document.querySelectorAll('.can-drop-touch').forEach(el => el.classList.remove('can-drop-touch'));
}

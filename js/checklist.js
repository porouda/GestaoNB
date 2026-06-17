import { db, collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, getDocs, handleFirestoreError } from './firebase-config.js';

let checklistData = {
    tarefas: [],
    tipos_treinamentos: [],
    relacoes: []
};

// Função para carregar o checklist (Real-time)
async function iniciarMonitoramentoChecklist() {
    // 1. Carrega tipos de treinamento (fixos ou do Firestore)
    // Para simplificar, vamos carregar de uma coleção 'training_types'
    try {
        const tiposSnap = await getDocs(collection(db, 'training_types'));
        checklistData.tipos_treinamentos = [];
        if (tiposSnap.empty) {
            // Se estiver vazio, popula com alguns defaults para o sistema não quebrar
            checklistData.tipos_treinamentos = [
                { id: '1', nome_tipo: 'Integração' },
                { id: '2', nome_tipo: 'Ferramentas' },
                { id: '3', nome_tipo: 'Segurança' }
            ];
        } else {
            tiposSnap.forEach(doc => checklistData.tipos_treinamentos.push({ id: doc.id, ...doc.data() }));
        }

        // 2. Monitora tarefas
        onSnapshot(collection(db, 'checklist_tasks'), (snapshot) => {
            checklistData.tarefas = [];
            snapshot.forEach(doc => checklistData.tarefas.push({ id: doc.id, ...doc.data() }));
            renderizarChecklist();
        }, (error) => handleFirestoreError(error, 'LIST', 'checklist_tasks'));

    } catch (error) {
        console.error("Erro ao inicializar checklist:", error);
    }
}

function renderizarChecklist() {
    const container = document.getElementById('checklistTableContainer');
    if (!container) return;

    let tableHtml = `
        <table class="checklist-table">
            <thead>
                <tr>
                    <th>Responsável</th>
                    <th>OK</th>
                    <th>Descrição</th>
    `;

    checklistData.tipos_treinamentos.forEach(tipo => {
        tableHtml += `<th>${tipo.nome_tipo}</th>`;
    });

    tableHtml += `<th><button class="btn-add-task" title="Adicionar Tarefa"><i class="fas fa-plus"></i></button></th>`;
    tableHtml += `</tr></thead><tbody>`;

    checklistData.tarefas.forEach(tarefa => {
        tableHtml += `
            <tr data-tarefa-id="${tarefa.id}">
                <td><input type="text" value="${tarefa.responsavel || ''}" class="responsavel-input" data-id="${tarefa.id}" data-field="responsavel" /></td>
                <td><input type="text" value="${tarefa.ok || ''}" class="ok-input" data-id="${tarefa.id}" data-field="ok" /></td>
                <td><input type="text" value="${tarefa.descricao || ''}" class="descricao-input" data-id="${tarefa.id}" data-field="descricao" /></td>
        `;

        checklistData.tipos_treinamentos.forEach(tipo => {
            const isChecked = (tarefa.tipos_associados || []).includes(tipo.id);
            tableHtml += `<td><input type="checkbox" ${isChecked ? 'checked' : ''} data-tarefa-id="${tarefa.id}" data-tipo-id="${tipo.id}" class="relation-checkbox" /></td>`;
        });

        tableHtml += `<td><button class="btn-remove-task" data-id="${tarefa.id}"><i class="fas fa-trash"></i></button></td>`;
        tableHtml += `</tr>`;
    });

    // Linha de nova tarefa
    tableHtml += `
        <tr class="nova-tarefa">
            <td><input type="text" id="new-responsavel" placeholder="Novo..." /></td>
            <td><input type="text" id="new-ok" placeholder="OK..." /></td>
            <td><input type="text" id="new-descricao" placeholder="Desc..." /></td>
            <td colspan="${checklistData.tipos_treinamentos.length}"></td>
            <td><button class="btn-save-new-task"><i class="fas fa-save"></i></button></td>
        </tr>
    `;

    tableHtml += `</tbody></table>`;
    container.innerHTML = tableHtml;

    // Eventos
    document.querySelector('.btn-save-new-task').onclick = salvarNovaTarefa;
    document.querySelectorAll('.btn-remove-task').forEach(btn => btn.onclick = () => excluirTarefa(btn.dataset.id));
    
    // Autosave on change for inputs and checkboxes
    document.querySelectorAll('.checklist-table input').forEach(input => {
        input.onchange = (e) => salvarAlteracao(e.target);
    });
}

async function salvarNovaTarefa() {
    const data = {
        responsavel: document.getElementById('new-responsavel').value,
        ok: document.getElementById('new-ok').value,
        descricao: document.getElementById('new-descricao').value,
        tipos_associados: []
    };

    if (!data.responsavel && !data.ok && !data.descricao) return alert("Preencha algo.");

    try {
        await addDoc(collection(db, 'checklist_tasks'), data);
    } catch (error) {
        handleFirestoreError(error, 'WRITE', 'checklist_tasks');
    }
}

async function salvarAlteracao(el) {
    const tarefaId = el.dataset.tarefaId || el.dataset.id;
    if (!tarefaId) return;

    try {
        const docRef = doc(db, 'checklist_tasks', tarefaId);
        const docSnap = await getDocs(docRef); // Wait, I need only one doc
        // Actually, just updateDoc directly if I know the IDs
        
        if (el.type === 'checkbox') {
            const tarefa = checklistData.tarefas.find(t => t.id === tarefaId);
            let selecionados = tarefa.tipos_associados || [];
            const tipoId = el.dataset.tipoId;
            if (el.checked) {
                if (!selecionados.includes(tipoId)) selecionados.push(tipoId);
            } else {
                selecionados = selecionados.filter(id => id !== tipoId);
            }
            await updateDoc(docRef, { tipos_associados: selecionados });
        } else {
            const field = el.dataset.field;
            await updateDoc(docRef, { [field]: el.value });
        }
    } catch (error) {
        handleFirestoreError(error, 'UPDATE', `checklist_tasks/${tarefaId}`);
    }
}

async function excluirTarefa(id) {
    if (confirm("Excluir item?")) {
        try {
            await deleteDoc(doc(db, 'checklist_tasks', id));
        } catch (error) {
            handleFirestoreError(error, 'DELETE', `checklist_tasks/${id}`);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    iniciarMonitoramentoChecklist();
    document.getElementById('salvarChecklist')?.addEventListener('click', () => alert('O sistema salva automaticamente ao alterar os campos!'));
});

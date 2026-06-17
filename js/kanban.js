import { db, collection, onSnapshot, doc, getDoc, addDoc, updateDoc, deleteDoc, serverTimestamp, handleFirestoreError, formatarDataParaInput } from './firebase-config.js';

// Variáveis globais
let tarefas = [];
let tarefaEditando = null;

// Funções de Drag & Drop
window.allowDrop = function(ev) {
    ev.preventDefault();
    ev.currentTarget.classList.add('drag-over');
}

window.removeDragHighlight = function(ev) {
    ev.currentTarget.classList.remove('drag-over');
}

window.drag = function(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
}

window.drop = async function(ev) {
    ev.preventDefault();
    window.removeDragHighlight(ev);

    const taskIdRaw = ev.dataTransfer.getData("text");
    const taskId = taskIdRaw.replace('task-', '');
    
    let newStatus = 'todo';
    if (ev.currentTarget.parentElement.id === 'doingColumn') {
        newStatus = 'doing';
    } else if (ev.currentTarget.parentElement.id === 'doneColumn') {
        newStatus = 'done';
    }

    let dataConclusao = null;
    if (newStatus === 'done' && confirm('Deseja marcar esta tarefa como concluída hoje?')) {
        dataConclusao = new Date().toISOString().split('T')[0];
    }

    try {
        await updateDoc(doc(db, 'tasks', taskId), {
            status: newStatus,
            data_conclusao: dataConclusao
        });
    } catch (error) {
        handleFirestoreError(error, 'UPDATE', `tasks/${taskId}`);
    }
}

// Carregar Tarefas (Real-time)
function iniciarMonitoramentoTarefas() {
    onSnapshot(collection(db, 'tasks'), (snapshot) => {
        tarefas = [];
        snapshot.forEach(doc => tarefas.push({ id: doc.id, ...doc.data() }));
        renderizarKanban();
    }, (error) => handleFirestoreError(error, 'LIST', 'tasks'));
}

function renderizarKanban() {
    const todoContainer = document.querySelector('#todoColumn .tasks-container');
    const doingContainer = document.querySelector('#doingColumn .tasks-container');
    const doneContainer = document.querySelector('#doneColumn .tasks-container');

    if (!todoContainer || !doingContainer || !doneContainer) return;

    todoContainer.innerHTML = '';
    doingContainer.innerHTML = '';
    doneContainer.innerHTML = '';

    tarefas.forEach(tarefa => {
        const card = criarElementoTarefa(tarefa);
        if (tarefa.status === 'todo') todoContainer.appendChild(card);
        else if (tarefa.status === 'doing') doingContainer.appendChild(card);
        else if (tarefa.status === 'done') doneContainer.appendChild(card);
    });

    atualizarContagem();
}

function criarElementoTarefa(tarefa) {
    const card = document.createElement('div');
    card.className = `task-card prioridade-${tarefa.prioridade || 'normal'}`;
    card.id = `task-${tarefa.id}`;
    card.draggable = true;
    card.ondragstart = window.drag;

    card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        abrirMenuContexto(e, tarefa);
    });

    const dataFormatada = formatarData(tarefa.prazo);
    const dataConclusao = tarefa.data_conclusao ? formatarData(tarefa.data_conclusao) : '';

    card.innerHTML = `
        <div class="task-name">${tarefa.nome || 'Sem nome'}</div>
        <div class="task-responsibles"><i class="fas fa-user"></i> ${tarefa.responsaveis || '--'}</div>
        <div class="task-deadline"><i class="fas fa-calendar-alt"></i> Prazo: ${dataFormatada}</div>
        <div class="task-priority"><i class="fas fa-exclamation-circle"></i> Prioridade: ${tarefa.prioridade || 'Normal'}</div>
        ${tarefa.status === 'done' && dataConclusao ? `<div class="task-completion-date"><i class="fas fa-check-circle"></i> Concluído em: ${dataConclusao}</div>` : ''}
    `;

    // Tooltip logic (truncated for brevity, same as original logic but adaptable)
    card.addEventListener('mouseenter', (e) => mostrarTooltip(e, tarefa.observacoes, card));
    card.addEventListener('mouseleave', esconderTooltip);

    return card;
}

// Menu de Contexto
function abrirMenuContexto(event, tarefa) {
    document.querySelectorAll('.context-menu').forEach(menu => menu.remove());
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.innerHTML = `
        <div class="context-option" id="ctx-editar">Editar</div>
        <div class="context-option" id="ctx-excluir">Excluir</div>
    `;
    menu.style.position = 'fixed';
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
    document.body.appendChild(menu);

    menu.querySelector('#ctx-editar').onclick = () => { editarTarefa(tarefa.id); menu.remove(); };
    menu.querySelector('#ctx-excluir').onclick = () => { excluirTarefa(tarefa.id); menu.remove(); };

    const closeHandler = (e) => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', closeHandler); } };
    document.addEventListener('click', closeHandler);
}

window.editarTarefa = function(id) {
    const tarefa = tarefas.find(t => t.id === id);
    if (!tarefa) return;

    tarefaEditando = tarefa;
    document.getElementById('editTaskId').value = id;
    document.getElementById('editTaskName').value = tarefa.nome;
    document.getElementById('editTaskResponsibles').value = tarefa.responsaveis;
    document.getElementById('editTaskDeadline').value = formatarDataParaInput(tarefa.prazo);
    document.getElementById('editTaskObservations').value = tarefa.observacoes || '';
    document.getElementById('editTaskPriority').value = tarefa.prioridade || 'normal';

    const completionField = document.getElementById('editTaskCompletionDate');
    const completionLabel = document.getElementById('completionDateLabel');
    if (tarefa.status === 'done' && tarefa.data_conclusao) {
        completionField.value = formatarDataParaInput(tarefa.data_conclusao);
        completionField.style.display = 'block';
        completionLabel.style.display = 'block';
    } else {
        completionField.style.display = 'none';
        completionLabel.style.display = 'none';
    }

    document.getElementById('editModal').style.display = 'block';
}

window.salvarEdicaoTarefa = async function() {
    const id = document.getElementById('editTaskId').value;
    const data = {
        nome: document.getElementById('editTaskName').value,
        responsaveis: document.getElementById('editTaskResponsibles').value,
        prazo: document.getElementById('editTaskDeadline').value,
        observacoes: document.getElementById('editTaskObservations').value,
        prioridade: document.getElementById('editTaskPriority').value
    };

    if (!data.nome || !data.responsaveis || !data.prazo) return alert('Campos obrigatórios: Nome, Responsável, Prazo');

    try {
        if (id) {
            await updateDoc(doc(db, 'tasks', id), data);
        } else {
            data.status = 'todo';
            await addDoc(collection(db, 'tasks'), data);
        }
        window.fecharModal();
    } catch (error) {
        handleFirestoreError(error, 'WRITE', 'tasks');
    }
}

window.excluirTarefa = async function(id) {
    if (confirm('Excluir tarefa?')) {
        try {
            await deleteDoc(doc(db, 'tasks', id));
        } catch (error) {
            handleFirestoreError(error, 'DELETE', `tasks/${id}`);
        }
    }
}

window.fecharModal = function() {
    document.getElementById('editModal').style.display = 'none';
    tarefaEditando = null;
}

window.abrirModalInclusao = function() {
    tarefaEditando = null;
    document.getElementById('editTaskId').value = '';
    document.getElementById('editTaskName').value = '';
    document.getElementById('editTaskResponsibles').value = '';
    document.getElementById('editTaskDeadline').value = '';
    document.getElementById('editTaskObservations').value = '';
    document.getElementById('completionDateLabel').style.display = 'none';
    document.getElementById('editTaskCompletionDate').style.display = 'none';
    document.getElementById('editModal').style.display = 'block';
}

function formatarData(data) {
    if (!data) return '';
    
    // Handle Firestore Timestamp
    if (data.toDate && typeof data.toDate === 'function') {
        const d = data.toDate();
        const dia = String(d.getDate()).padStart(2, '0');
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const ano = d.getFullYear();
        return `${dia}/${mes}/${ano}`;
    }

    if (typeof data === 'string' && data.includes('-')) {
        const parts = data.split('-');
        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : data;
    }
    
    return data;
}

function atualizarContagem() {
    document.getElementById('todoCount').textContent = tarefas.filter(t => t.status === 'todo').length;
    document.getElementById('doingCount').textContent = tarefas.filter(t => t.status === 'doing').length;
    document.getElementById('doneCount').textContent = tarefas.filter(t => t.status === 'done').length;
}

// Tooltip helpers
let currentTooltip = null;
function mostrarTooltip(e, obs, card) {
    if (!obs) return;
    currentTooltip = document.createElement('div');
    currentTooltip.className = 'tooltip-dinamico';
    currentTooltip.innerHTML = obs.replace(/\n/g, '<br>');
    document.body.appendChild(currentTooltip);
    const rect = card.getBoundingClientRect();
    currentTooltip.style.left = `${rect.left}px`;
    currentTooltip.style.top = `${rect.top - currentTooltip.offsetHeight - 5}px`;
}
function esconderTooltip() { if (currentTooltip) { currentTooltip.remove(); currentTooltip = null; } }

document.addEventListener('DOMContentLoaded', () => {
    iniciarMonitoramentoTarefas();
    document.getElementById('add-task-btn')?.addEventListener('click', window.abrirModalInclusao);
    
    // Bind global events for tasks-containers
    document.querySelectorAll('.tasks-container').forEach(container => {
        container.ondragover = window.allowDrop;
        container.ondragleave = window.removeDragHighlight;
        container.ondrop = window.drop;
    });
});
// Adicionar ESC para sair do modal
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && document.getElementById('editModal').style.display === 'block') {
        window.fecharModal();
    }
});

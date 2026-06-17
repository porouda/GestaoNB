// js/alocacao-main.js - Unified Module for Staff Allocation Dashboard
import { db, auth, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, onSnapshot, addDoc, serverTimestamp, handleFirestoreError } from './firebase-config.js';

// --- STATE & CONFIG ---
window.dataSelecionada = new Date().toISOString().split('T')[0];
window.staffCache = {}; 
window.allStaffsCache = [];
window.staffsAllocatedToday = new Set();
let unsubTrainings = null;
let unsubStaffs = null;
let unsubAllocationsGlobal = null;
let unsubAlocacoesPorTreinamento = {};
let unsubCalendarTrainings = null;

// Mini-Calendar State
let mesAtualCal = new Date().getMonth();
let anoAtualCal = new Date().getFullYear();
let treinamentosCacheCal = {}; 

// --- UTILS ---

export function formatarDataBR(dateValue) {
    if (!dateValue) return '';
    let d;
    if (typeof dateValue.toDate === 'function') d = dateValue.toDate();
    else if (dateValue instanceof Date) d = dateValue;
    else d = new Date(dateValue);
    if (isNaN(d.getTime())) return dateValue;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function formatarDataHoraHover(dateValue) {
    if (!dateValue) return "--:--";
    let d;
    if (typeof dateValue.toDate === 'function') d = dateValue.toDate();
    else if (dateValue instanceof Date) d = dateValue;
    else d = new Date(dateValue);
    if (isNaN(d.getTime())) return dateValue;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export async function registrarLog(acao, descricao, registroId = null) {
    try {
        await addDoc(collection(db, 'logs'), {
            acao: acao,
            descricao: descricao,
            registro_id: registroId,
            usuario_id: auth.currentUser?.uid,
            usuario_nome: window.usuarioLogado?.nome || 'Sistema',
            data: serverTimestamp()
        });
    } catch (e) { console.error("Erro ao registrar log:", e); }
}

export function atualizarNumeracaoStaffs(treinamentoId) {
    const container = document.querySelector(`.staffs-allocated[data-treinamento-id="${treinamentoId}"]`);
    if (!container) return;
    Array.from(container.children).forEach((el, i) => {
        let texto = el.textContent.replace(/^\d+\.\s*/, '').replace(/⚠️/g, '').trim();
        const motivo = el.getAttribute('data-motivo');
        const icone = (motivo && motivo.trim() !== "") ? ' ⚠️' : '';
        if (el.classList.contains('status-recusado')) el.textContent = `${texto}${icone}`;
        else el.textContent = `${i + 1}. ${texto}${icone}`;
    });
}

export function verificarDuplicidadeStaffsNoDia() {
    const alocados = document.querySelectorAll('.staffs-allocated .staff-item');
    const contagem = {};
    alocados.forEach(el => {
        const sid = el.getAttribute('data-staff-id');
        contagem[sid] = (contagem[sid] || 0) + 1;
    });
    alocados.forEach(el => {
        const sid = el.getAttribute('data-staff-id');
        if (contagem[sid] > 1) el.classList.add('is-duplicate');
        else el.classList.remove('is-duplicate');
    });
}

// --- CORE LOGIC: DATA HANDLING ---

export function loadStaffs() {
    if (unsubStaffs) unsubStaffs();
    unsubStaffs = onSnapshot(collection(db, 'staffs'), (snapshot) => {
        window.allStaffsCache = [];
        snapshot.forEach(docSnap => {
            const s = docSnap.data();
            const id = docSnap.id;
            if (s.ativo === 'sim' || s.ativo === 'Sim' || !s.ativo) {
                window.staffCache[id] = s.nome_abreviado || s.nome_completo || 'Staff sem nome';
                window.allStaffsCache.push({ id, ...s });
            }
        });
        renderAvailableStaffs();
    });
}

export function renderAvailableStaffs() {
    const container = document.getElementById('staffsContainer');
    if (!container) return;
    container.innerHTML = '';

    const disponiveis = window.allStaffsCache.filter(s => {
        const isAlocated = window.staffsAllocatedToday.has(String(s.id));
        return !isAlocated;
    });

    disponiveis.sort((a, b) => {
        const nomeA = (a.nome_abreviado || a.nome_completo || '').toLowerCase();
        const nomeB = (b.nome_abreviado || b.nome_completo || '').toLowerCase();
        return nomeA.localeCompare(nomeB);
    });

    disponiveis.forEach(s => {
        const el = criarElementoStaff(s.id, s.nome_abreviado || s.nome_completo);
        container.appendChild(el);
    });
}

export function criarElementoStaff(id, nome, isAllocated = false) {
    const el = document.createElement('div');
    el.classList.add('staff-item');
    el.textContent = nome;
    el.setAttribute('data-staff-id', id);
    el.setAttribute('draggable', 'true');

    // Context Menu for status change
    el.addEventListener('contextmenu', (e) => {
        if (el.closest('.staffs-allocated')) {
            window.criarMenuStatus(e, id, el);
        }
    });

    el.addEventListener('dragstart', e => {
        e.dataTransfer.setData('staff-id', id);
        const container = el.parentElement;
        const treinamentoId = container ? container.getAttribute('data-treinamento-id') : null;
        if (treinamentoId) e.dataTransfer.setData('origem-id', treinamentoId);
        el.classList.add('dragging-source');
    });

    el.addEventListener('dragend', () => el.classList.remove('dragging-source'));
    return el;
}

export function loadTreinamentosForDate(dateStr) {
    window.dataSelecionada = dateStr;
    const container = document.getElementById('treinamentosContainer');
    if (!container) return;
    container.innerHTML = '<div style="padding:20px; color:white;">Carregando treinamentos...</div>';

    if (unsubTrainings) unsubTrainings();
    if (unsubAllocationsGlobal) unsubAllocationsGlobal();
    Object.values(unsubAlocacoesPorTreinamento).forEach(u => u());
    unsubAlocacoesPorTreinamento = {};

    const dStart = new Date(dateStr + 'T00:00:00');
    const dEnd = new Date(dateStr + 'T23:59:59');

    // Load trainings with status filter
    const qTrain = query(collection(db, 'trainings'), 
        where('data_evento', '>=', dStart),
        where('data_evento', '<=', dEnd)
    );

    unsubTrainings = onSnapshot(qTrain, (snapshot) => {
        container.innerHTML = '';
        const filteredDocs = snapshot.docs.filter(doc => {
            const t = doc.data();
            return ['Confirmado', 'Realizado'].includes(t.etapa);
        });

        if (filteredDocs.length === 0) {
            container.innerHTML = '<div style="padding:40px; color:white; text-align:center; flex:1;">Nenhum treinamento confirmado/realizado para este dia.</div>';
            window.staffsAllocatedToday = new Set();
            renderAvailableStaffs();
            return;
        }

        filteredDocs.forEach(docSnap => {
            const t = docSnap.data();
            const id = docSnap.id;
            const col = document.createElement('div');
            col.classList.add('treinamento-column');
            col.setAttribute('data-id', id);
            const dataFormatada = formatarDataBR(t.data_evento || dateStr);

            col.innerHTML = `
                <div class="treinamento-header">
                    <div class="info-treinamento">
                        <div class="nome-negocio" data-action="open-detail">
                            ${t.nome_negocio}
                            <div class="logistica-hover-card">
                                <div class="hover-card-column">
                                    <div class="hover-col-title"><i class="fas fa-truck"></i> Logística</div>
                                    <div class="hover-card-row"><span class="hover-card-label">Saída:</span> <span>${formatarDataHoraHover(t.hora_saida)}</span></div>
                                    <div class="hover-card-row"><span class="hover-card-label">Retorno:</span> <span>${formatarDataHoraHover(t.hora_retorno)}</span></div>
                                    <div class="hover-card-row"><span class="hover-card-label">Transporte:</span> <span>${t.transporte || '--'}</span></div>
                                </div>
                                <div class="hover-card-column">
                                    <div class="hover-col-title"><i class="fas fa-user-friends"></i> Responsáveis</div>
                                    <div class="hover-card-row"><span>Interno:</span> <span>${t.coordenador_interno || '--'}</span></div>
                                    <div class="hover-card-row"><span>Evento:</span> <span>${t.coordenador_evento || '--'}</span></div>
                                </div>
                                <div class="hover-card-column">
                                    <div class="hover-col-title"><i class="fas fa-align-left"></i> Obs</div>
                                    <div class="hover-text-box">${t.obs_geral_logistica || 'Nenhuma obs.'}</div>
                                </div>
                            </div>
                        </div>
                        <div class="programa-nb">${t.programa_nb || '---'}</div>
                        <div class="local-evento">${t.local_evento || '---'}</div>
                        <div class="participantes-data">
                            <span class="pax-box">${t.participantes || 0} PAX</span>
                            <span class="data-evento-box">${dataFormatada}</span>
                        </div>
                    </div>
                    <div class="botoes-container">
                        <button type="button" class="btn-uniformes" title="Uniformes" data-action="report" data-type="uniformes"><i class="fas fa-tshirt"></i></button>
                        <button type="button" class="btn-facilitadores" title="Facilitadores" data-action="report" data-type="facilitadores"><i class="fas fa-users"></i></button>
                        <button type="button" class="btn-logs" title="Histórico" data-action="report" data-type="logs"><i class="fas fa-history"></i></button>
                    </div>
                </div>
                <div class="staffs-allocated" data-treinamento-id="${id}"></div>
            `;
            container.appendChild(col);
            iniciarMonitoramentoAlocacoesParaTreinamento(id, dateStr);
        });

        // Configura Delegação de Cliques para o Painel Lateral e Botões
        if (!container.dataset.clickBound) {
            container.addEventListener('click', (e) => {
                const btn = e.target.closest('button[data-action="report"]');
                const title = e.target.closest('[data-action="open-detail"]');
                const col = e.target.closest('.treinamento-column');
                if (!col) return;
                const id = col.getAttribute('data-id');

                if (btn) {
                    e.stopPropagation();
                    const type = btn.getAttribute('data-type');
                    if (type === 'uniformes') window.abrirImpressaoUniformes(id, window.dataSelecionada);
                    else if (type === 'facilitadores') window.abrirListaFacilitadores(id, window.dataSelecionada);
                    else if (type === 'logs') window.abrirModalLogs(id);
                } else if (title) {
                    window.abrirSidePanel(id);
                }
            });
            container.dataset.clickBound = "true";
        }
        ativarHoverCards();
    });

    const qAlloc = query(collection(db, 'allocations'), 
        where('data_alocacao', '>=', dStart),
        where('data_alocacao', '<=', dEnd)
    );

    unsubAllocationsGlobal = onSnapshot(qAlloc, (snapshot) => {
        window.staffsAllocatedToday = new Set();
        snapshot.forEach(doc => {
            const aloc = doc.data();
            if (aloc.staff_id) window.staffsAllocatedToday.add(String(aloc.staff_id));
        });
        renderAvailableStaffs();
    });
}

export function iniciarMonitoramentoAlocacoesParaTreinamento(treinamentoId, dateStr) {
    const dStart = new Date(dateStr + 'T00:00:00');
    const dEnd = new Date(dateStr + 'T23:59:59');

    const q = query(collection(db, 'allocations'), 
        where('treinamento_id', '==', treinamentoId),
        where('data_alocacao', '>=', dStart),
        where('data_alocacao', '<=', dEnd)
    );

    if (unsubAlocacoesPorTreinamento[treinamentoId]) unsubAlocacoesPorTreinamento[treinamentoId]();

    unsubAlocacoesPorTreinamento[treinamentoId] = onSnapshot(q, (snapshot) => {
        const containerDestino = document.querySelector(`.staffs-allocated[data-treinamento-id="${treinamentoId}"]`);
        if (!containerDestino) return;
        
        containerDestino.innerHTML = '';
        snapshot.forEach(docSnap => {
            const aloc = docSnap.data();
            const staffId = aloc.staff_id;
            const nomeStaff = window.staffCache[staffId] || `Staff ${staffId}`;
            const el = criarElementoStaff(staffId, nomeStaff, true);
            el.classList.add('allocated');
            if (aloc.motivo_recusa) el.setAttribute('data-motivo', aloc.motivo_recusa);
            if (aloc.status) el.classList.add(`status-${aloc.status}`);
            containerDestino.appendChild(el);
        });
        
        atualizarNumeracaoStaffs(treinamentoId);
        verificarDuplicidadeStaffsNoDia();
    });
}

// --- INTERACTIVE UI HELPERS ---

export function ativarHoverCards() {
    document.querySelectorAll('.nome-negocio').forEach(titulo => {
        titulo.addEventListener('mouseenter', () => {
            const card = titulo.querySelector('.logistica-hover-card');
            if (!card) return;
            const rect = titulo.getBoundingClientRect();
            card.style.top = (rect.bottom + 5) + 'px';
            card.style.left = rect.left + 'px';
            if (rect.left + 500 > window.innerWidth) card.style.left = (window.innerWidth - 520) + 'px';
            card.style.display = 'grid';
        });
        titulo.addEventListener('mouseleave', () => {
            const card = titulo.querySelector('.logistica-hover-card');
            if (card) card.style.display = 'none';
        });
    });
}

window.handleHeaderAction = function(event, type, id, dateStr) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    if (type === 'uniformes') window.abrirImpressaoUniformes(id, dateStr);
    else if (type === 'facilitadores') window.abrirListaFacilitadores(id, dateStr);
    else if (type === 'logs') window.abrirModalLogs(id);
};

// --- MINI CALENDAR MODULE ---

export function iniciarMonitoramentoCalendario() {
    const startDate = new Date(anoAtualCal, mesAtualCal - 1, 1);
    const endDate = new Date(anoAtualCal, mesAtualCal + 4, 0);

    if (unsubCalendarTrainings) unsubCalendarTrainings();

    const q = query(collection(db, 'trainings'), 
        where('data_evento', '>=', startDate),
        where('data_evento', '<=', endDate)
    );

    unsubCalendarTrainings = onSnapshot(q, (snapshot) => {
        treinamentosCacheCal = {};
        snapshot.forEach(docSnap => {
            const t = docSnap.data();
            if (!['Confirmado', 'Realizado'].includes(t.etapa)) return;
            const dateValue = t.data_evento;
            let dateStr = "";
            if (dateValue && typeof dateValue.toDate === 'function') {
                const d = dateValue.toDate();
                dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            } else if (typeof dateValue === 'string') dateStr = dateValue;

            if (dateStr && dateStr.length >= 10) {
                const pureDate = dateStr.substring(0, 10);
                treinamentosCacheCal[pureDate] = (treinamentosCacheCal[pureDate] || 0) + 1;
            }
        });
        renderMonthsCal();
    });
}

export function generateCalendar() {
    const calendarContainer = document.getElementById('calendarContainer');
    if (!calendarContainer) return;
    calendarContainer.innerHTML = '';
    
    const nav = document.createElement('div');
    nav.classList.add('calendar-nav');

    const prev = document.createElement('button');
    prev.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prev.onclick = () => { mesAtualCal--; if(mesAtualCal<0){mesAtualCal=11; anoAtualCal--;} updateCalendarDisplay(); };

    const next = document.createElement('button');
    next.innerHTML = '<i class="fas fa-chevron-right"></i>';
    next.onclick = () => { mesAtualCal++; if(mesAtualCal>11){mesAtualCal=0; anoAtualCal++;} updateCalendarDisplay(); };

    const today = document.createElement('button');
    today.innerHTML = '<i class="fas fa-clock"></i>';
    today.onclick = () => { 
        const n = new Date(); 
        mesAtualCal = n.getMonth(); 
        anoAtualCal = n.getFullYear(); 
        updateCalendarDisplay(); 
        loadTreinamentosForDate(n.toISOString().split("T")[0]); 
    };

    nav.append(prev, today, next);
    calendarContainer.append(nav);
    updateCalendarDisplay();
}

function updateCalendarDisplay() {
    const cont = document.getElementById('calendarContainer');
    if (!cont) return;
    renderMonthsCal();
    if (!unsubCalendarTrainings) iniciarMonitoramentoCalendario();
}

function renderMonthsCal() {
    const cont = document.getElementById('calendarContainer');
    if (!cont) return;
    const old = cont.querySelector('.calendar-months-container');
    if (old) old.remove();

    const monthsCont = document.createElement('div');
    monthsCont.classList.add('calendar-months-container');

    for (let i = 0; i < 2; i++) {
        const d = new Date(anoAtualCal, mesAtualCal + i, 1);
        monthsCont.appendChild(createMonthElement(d));
    }
    cont.appendChild(monthsCont);
}

function createMonthElement(monthDate) {
    const div = document.createElement('div');
    div.classList.add('calendar-month');
    const h4 = document.createElement('h4');
    h4.textContent = monthDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    div.appendChild(h4);

    const daysDiv = document.createElement('div');
    daysDiv.classList.add('calendar-days');

    ['D','S','T','Q','Q','S','S'].forEach(d => {
        const el = document.createElement('div');
        el.classList.add('calendar-day', 'week-day');
        el.textContent = d;
        daysDiv.appendChild(el);
    });

    const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getDay();
    const last = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();

    for (let i = 0; i < first; i++) {
        const e = document.createElement('div');
        e.classList.add('calendar-day', 'empty');
        daysDiv.appendChild(e);
    }

    const hoje = new Date().toISOString().split('T')[0];

    for (let d = 1; d <= last; d++) {
        const el = document.createElement('div');
        el.classList.add('calendar-day');
        el.textContent = d;
        const curDate = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        
        if (curDate === hoje) el.classList.add('today-highlight');
        if (treinamentosCacheCal[curDate]) el.classList.add(`has-${Math.min(treinamentosCacheCal[curDate], 3)}`);
        if (curDate === window.dataSelecionada) el.classList.add('selected');

        el.onclick = () => {
            document.querySelectorAll('.calendar-day.selected').forEach(x => x.classList.remove('selected'));
            el.classList.add('selected');
            loadTreinamentosForDate(curDate);
        };
        daysDiv.appendChild(el);
    }
    div.appendChild(daysDiv);
    return div;
}

// --- DRAG & DROP LOGIC ---

export function initDragDrop() {
    const treinosCont = document.getElementById('treinamentosContainer');
    if (treinosCont && !treinosCont.dataset.delegated) {
        treinosCont.ondragover = e => e.preventDefault();
        treinosCont.ondrop = async (e) => {
            e.preventDefault();
            const targetCol = e.target.closest('.staffs-allocated');
            if (!targetCol) return;

            const staffId = e.dataTransfer.getData('staff-id');
            const origemId = e.dataTransfer.getData('origem-id');
            const destinoId = targetCol.getAttribute('data-treinamento-id');

            if (origemId === destinoId) return;

            const alocId = `${destinoId}_${staffId}`;
            const dataObj = new Date(window.dataSelecionada + 'T12:00:00');
            
            try {
                await setDoc(doc(db, 'allocations', alocId), {
                    staff_id: staffId,
                    treinamento_id: destinoId,
                    data_alocacao: dataObj,
                    status: 'intencao',
                    updatedAt: serverTimestamp()
                });
                if (origemId) {
                    await deleteDoc(doc(db, 'allocations', `${origemId}_${staffId}`));
                    registrarLog('transferência', `Staff transferido do [${origemId}] para [${destinoId}]`, destinoId);
                } else {
                    registrarLog('alocação', `Staff alocado ao treinamento [${destinoId}]`, destinoId);
                }
            } catch (err) { handleFirestoreError(err, 'WRITE', 'allocations'); }
        };
        treinosCont.dataset.delegated = "true";
    }

    const staffsCont = document.getElementById('staffsContainer');
    if (staffsCont && !staffsCont.dataset.delegated) {
        staffsCont.ondragover = e => e.preventDefault();
        staffsCont.ondrop = async (e) => {
            e.preventDefault();
            const staffId = e.dataTransfer.getData('staff-id');
            const origemId = e.dataTransfer.getData('origem-id');
            if (!origemId) return;
            try {
                await deleteDoc(doc(db, 'allocations', `${origemId}_${staffId}`));
                registrarLog('exclusão', `Staff removido do treinamento [${origemId}]`, origemId);
            } catch (err) { handleFirestoreError(err, 'DELETE', 'allocations'); }
        };
        staffsCont.dataset.delegated = "true";
    }
}

// --- MODALS & REPORTS ---

export async function abrirModalObservacao(staffId, treinamentoId, elemento, obrigatorio = false) {
    const motivoAtual = elemento.getAttribute('data-motivo') || "";

    const overlay = document.createElement('div');
    overlay.className = 'modal-obs-overlay';
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:9999;';
    
    overlay.innerHTML = `
        <div class="modal-obs-content" style="background:white; padding:25px; border-radius:12px; width:450px; box-shadow:0 15px 50px rgba(0,0,0,0.5);">
            <div style="margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">
                <h3 style="margin:0; font-size:18px; color:#1e293b;">${obrigatorio ? 'Motivo da Recusa' : 'Observação'}</h3>
            </div>
            <div style="margin-bottom:20px;">
                <textarea id="txt-modal-obs" style="width:100%; height:120px; padding:12px; border:1px solid #ddd; border-radius:8px; font-family:inherit; resize:none;" placeholder="Digite as observações aqui...">${motivoAtual}</textarea>
            </div>
            <div style="display:flex; justify-content:flex-end; gap:12px;">
                ${!obrigatorio ? '<button type="button" id="btn-obs-cancel" style="padding:10px 20px; border-radius:6px; border:1px solid #ddd; background:white; cursor:pointer;">Cancelar</button>' : ''}
                <button type="button" id="btn-obs-save" style="padding:10px 25px; border-radius:6px; border:none; background:#2563eb; color:white; font-weight:600; cursor:pointer;">Salvar</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    const textarea = document.getElementById('txt-modal-obs');
    textarea.focus();

    document.getElementById('btn-obs-save').onclick = async () => {
        const novoMotivo = textarea.value.trim();
        if (obrigatorio && !novoMotivo) { alert("Por favor, informe o motivo."); return; }
        const alocId = `${treinamentoId}_${staffId}`;
        
        try {
            await updateDoc(doc(db, 'allocations', alocId), { motivo_recusa: novoMotivo });
            registrarLog('observação', `Observação atualizada para staff [${window.staffCache[staffId]}] no treinamento [${treinamentoId}]: ${novoMotivo}`, treinamentoId);
            overlay.remove();
        } catch (err) { handleFirestoreError(err, 'UPDATE', 'allocations'); }
    };

    if (!obrigatorio) document.getElementById('btn-obs-cancel').onclick = () => overlay.remove();
}

window.criarMenuStatus = (e, staffId, elemento) => {
    e.preventDefault();
    const menuAntigo = document.getElementById('context-menu-status');
    if (menuAntigo) menuAntigo.remove();

    const treinamentoId = elemento.parentElement.getAttribute('data-treinamento-id');

    const menu = document.createElement('div');
    menu.id = 'context-menu-status';
    menu.style.cssText = `position:absolute; top:${e.pageY}px; left:${e.pageX}px; background:white; border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.2); border:1px solid #e2e8f0; z-index:10000; overflow:hidden; min-width:160px;`;

    const opcoes = [
        { label: 'Intenção', status: 'intencao' },
        { label: 'WhatsApp', status: 'whatsapp' },
        { label: 'Pessoalmente', status: 'pessoalmente' },
        { label: 'Confirmado', status: 'confirmado' },
        { label: 'Recusado', status: 'recusado' },
        { label: '---', separator: true },
        { label: 'Observação', action: 'observacao', status: 'pessoalmente' },
        { label: 'Duplicar Staff', action: 'duplicar', status: 'duplicar' }
    ];

    opcoes.forEach(opt => {
        if (opt.separator) {
            const hr = document.createElement('hr');
            hr.style.margin = '4px 0'; hr.style.border = '0'; hr.style.borderTop = '1px solid #e2e8f0';
            menu.appendChild(hr);
            return;
        }

        const item = document.createElement('div');
        item.style.cssText = 'padding:10px 15px; font-size:13px; cursor:pointer; transition:background 0.2s;';
        item.textContent = opt.label;
        item.onmouseenter = () => item.style.background = '#f8fafc';
        item.onmouseleave = () => item.style.background = 'white';

        item.onclick = async () => {
            if (opt.action === 'duplicar') {
                duplicarStaffNoLayout(staffId);
            } else if (opt.action === 'observacao') {
                abrirModalObservacao(staffId, treinamentoId, elemento, false);
            } else {
                await atualizarStatusAlocacao(staffId, treinamentoId, opt.status);
                if (opt.status === 'recusado') abrirModalObservacao(staffId, treinamentoId, elemento, true);
            }
            menu.remove();
        };
        menu.appendChild(item);
    });

    document.body.appendChild(menu);
    const fecharMenu = () => { menu.remove(); document.removeEventListener('click', fecharMenu); };
    setTimeout(() => document.addEventListener('click', fecharMenu), 10);
};

async function atualizarStatusAlocacao(staffId, treinamentoId, novoStatus) {
    const alocId = `${treinamentoId}_${staffId}`;
    try {
        await updateDoc(doc(db, 'allocations', alocId), { status: novoStatus });
        registrarLog('status', `Status do staff [${window.staffCache[staffId]}] alterado para [${novoStatus}]`, treinamentoId);
    } catch (err) { handleFirestoreError(err, 'UPDATE', 'allocations'); }
}

function duplicarStaffNoLayout(staffId) {
    const nome = window.staffCache[staffId] || 'Staff';
    const novoCard = criarElementoStaff(staffId, nome, false);
    novoCard.classList.add('is-duplicate');
    document.getElementById('staffsContainer').prepend(novoCard);
}

// --- SIDE PANEL DASHBOARD (NEW REPLACEMENT FOR MODAL) ---

export async function abrirSidePanel(id) {
    const panel = document.getElementById('sidePanelTreinamento');
    if (!panel) return;

    // Destacar coluna selecionada
    document.querySelectorAll('.treinamento-column').forEach(c => c.classList.remove('active-training'));
    const col = document.querySelector(`.treinamento-column[data-id="${id}"]`);
    if (col) col.classList.add('active-training');

    try {
        const docSnap = await getDoc(doc(db, 'trainings', id));
        if (!docSnap.exists()) return;
        
        const t = docSnap.data();
        const dataStr = t.data_evento ? (t.data_evento.toDate ? t.data_evento.toDate().toISOString().split('T')[0] : t.data_evento) : '';

        const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val || ''; };
        const setDateTimeVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val || (dataStr ? `${dataStr}T00:00` : ''); };

        document.getElementById('sidePanelTitle').textContent = t.nome_negocio;
        setVal('modalTreinamentoId', id);
        setVal('modalNomeNegocio', t.nome_negocio);
        setVal('modalDataEvento', dataStr);
        setVal('modalParticipantes', t.participantes);
        setVal('modalLocalEvento', t.local_evento);
        setVal('modalObservacoes', t.observacoes);
        
        setDateTimeVal('modalHoraSaida', t.hora_saida);
        setDateTimeVal('modalHoraRetorno', t.hora_retorno);
        setVal('modalTransporte', t.transporte);
        setVal('modalCoordInterno', t.coordenador_interno);
        setVal('modalQtdStaffs', t.qtd_staffs);
        setVal('modalQtdEquipes', t.qtd_equipes);
        setVal('modalObsLogistica', t.obs_logistica);

        // Reset tabs
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.querySelector('.tab-btn[onclick*="tab-logistica"]').classList.add('active');
        document.getElementById('tab-logistica').classList.add('active');

        panel.style.display = 'flex';
        document.querySelectorAll('.logistica-hover-card').forEach(c => c.style.display = 'none');
    } catch (err) { console.error("Erro side panel:", err); }
}

window.fecharSidePanel = () => {
    document.getElementById('sidePanelTreinamento').style.display = 'none';
    document.querySelectorAll('.treinamento-column').forEach(c => c.classList.remove('active-training'));
};

window.abrirSidePanel = abrirSidePanel;
window.abrirModalTreinamento = abrirSidePanel; // Legado para evitar erros se houver outro lugar chamando

window.switchTab = (event, tabId) => {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    event.currentTarget.classList.add('active');
    const target = document.getElementById(tabId);
    if (target) target.classList.add('active');
    if (tabId === 'tab-historico') {
        const id = document.getElementById('modalTreinamentoId').value;
        const cont = document.getElementById('lista-logs-interna');
        if (cont) {
            cont.innerHTML = "Carregando histórico...";
            const q = query(collection(db, 'logs'), where('registro_id', '==', id));
            getDocs(q).then(snap => {
                if(snap.empty) cont.innerHTML = "Nenhum histórico.";
                else cont.innerHTML = snap.docs.map(d => {
                    const l = d.data();
                    const dateStr = l.data && l.data.toDate ? l.data.toDate().toLocaleString() : '---';
                    return `<div style="padding:10px; border-bottom:1px solid #eee; font-size:12px;"><b>${dateStr}</b>: ${l.descricao}</div>`;
                }).join('');
            });
        }
    }
};

// --- FORM SUBMISSION SIDE PANEL ---
document.getElementById('treinamentoFormSide')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('modalTreinamentoId').value;
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
        const updateObj = {
            local_evento: data.localEvento,
            participantes: Number(document.getElementById('modalParticipantes').value),
            obs_geral_logistica: data.observacoes,
            transporte: data.transporte,
            coordenador_interno: data.coordenador_interno,
            qtd_staffs: Number(document.getElementById('modalQtdStaffs').value),
            qtd_equipes: Number(document.getElementById('modalQtdEquipes').value),
            obs_logistica: data.obs_logistica,
            updatedAt: serverTimestamp()
        };

        if (data.hora_saida) updateObj.hora_saida = new Date(data.hora_saida);
        if (data.horario_retorno) updateObj.hora_retorno = new Date(data.horario_retorno);

        await updateDoc(doc(db, 'trainings', id), updateObj);
        registrarLog('edição', `Treinamento [${id}] editado via painel lateral`, id);
        fecharSidePanel();
    } catch (err) { handleFirestoreError(err, 'UPDATE', 'trainings'); }
});

// --- LOGS MODAL ---
window.fecharModalLogs = () => document.getElementById('JANELA_LOGS_FINAL').style.display = 'none';

window.abrirModalLogs = async function(id) {
    const modal = document.getElementById('JANELA_LOGS_FINAL');
    const container = document.getElementById('CONTEUDO_LOGS_FINAL');
    if (!modal || !container) return;

    modal.style.display = 'flex';
    container.innerHTML = `
        <div class="bento-report-header">
            <h3><i class="fas fa-history"></i> HISTÓRICO DE ALTERAÇÕES</h3>
            <button type="button" class="close-side-panel" onclick="window.fecharModalLogs()">&times;</button>
        </div>
        <div class="bento-report-body">
            <div style="padding:20px; text-align:center;"><i class="fas fa-spinner fa-spin fa-2x"></i><br>Buscando histórico...</div>
        </div>
    `;

    try {
        const q = query(collection(db, 'logs'), where('registro_id', '==', id));
        const snap = await getDocs(q);
        
        const body = container.querySelector('.bento-report-body');
        if (snap.empty) {
            body.innerHTML = `<div class="bento-card" style="text-align:center; padding:40px; color:#64748b;">Nenhum histórico encontrado para este treinamento.</div>`;
            return;
        }

        const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        logs.sort((a,b) => (b.data?.seconds || 0) - (a.data?.seconds || 0));

        body.innerHTML = `
            <div class="bento-grid-report" style="grid-template-columns: 1fr;">
                ${logs.map(l => {
                    const dt = l.data?.toDate ? l.data.toDate().toLocaleString('pt-BR') : '---';
                    return `
                        <div class="bento-card" style="display:flex; justify-content:space-between; align-items:center; padding:15px 25px;">
                            <div style="flex:1;">
                                <div style="font-weight:700; color:#1e293b; margin-bottom:4px;">${l.descricao}</div>
                                <div style="font-size:12px; color:#64748b;">
                                    <i class="fas fa-user-circle"></i> ${l.usuario_nome || 'Sistema'} 
                                    <span style="margin: 0 10px; color:#e2e8f0;">|</span>
                                    <i class="fas fa-calendar-alt"></i> ${dt}
                                </div>
                            </div>
                            <div style="width:10px; height:10px; border-radius:50%; background:#3b82f6;"></div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="report-actions-bar">
                <button class="btn-bento btn-bento-outline no-print" onclick="window.fecharModalLogs()">Fechar Histórico</button>
            </div>
        `;
    } catch (e) { 
        container.querySelector('.bento-report-body').innerHTML = `<div style="padding:40px; color:red;">Erro ao carregar logs: ${e.message}</div>`; 
    }
};

// --- TOUCH SUPPORT ---
let selectedStaffElement = null;
export function initTouchSupport() {
    if (!('ontouchstart' in window || navigator.maxTouchPoints > 0)) return;
    
    document.addEventListener('click', async (e) => {
        const clickedStaff = e.target.closest('.staff-item');
        const targetContainer = e.target.closest('.staffs-allocated, #staffsContainer');

        if (!selectedStaffElement) {
            if (clickedStaff) {
                selectedStaffElement = clickedStaff;
                selectedStaffElement.classList.add('selected-touch');
                document.querySelectorAll('.staffs-allocated, #staffsContainer').forEach(el => {
                    if (el !== selectedStaffElement.parentElement) el.classList.add('can-drop-touch');
                });
            }
            return;
        }

        if (clickedStaff === selectedStaffElement) {
            desmarcarTouch();
            return;
        }

        if (targetContainer && targetContainer !== selectedStaffElement.parentElement) {
            const staffId = selectedStaffElement.getAttribute('data-staff-id');
            const origemId = selectedStaffElement.parentElement.getAttribute('data-treinamento-id') || "";
            const destinoId = targetContainer.getAttribute('data-treinamento-id') || "";

            try {
                if (destinoId === "") {
                    if (origemId) {
                        await deleteDoc(doc(db, 'allocations', `${origemId}_${staffId}`));
                        registrarLog('exclusão', `Staff removido via touch`, origemId);
                    }
                } else {
                    await setDoc(doc(db, 'allocations', `${destinoId}_${staffId}`), {
                        staff_id: staffId,
                        treinamento_id: destinoId,
                        data_alocacao: new Date(window.dataSelecionada + 'T12:00:00'),
                        status: 'intencao',
                        updatedAt: serverTimestamp()
                    });
                    if (origemId) await deleteDoc(doc(db, 'allocations', `${origemId}_${staffId}`));
                    registrarLog('alocação', `Staff movido via touch`, destinoId);
                }
            } catch (err) { handleFirestoreError(err, 'WRITE', 'allocations'); }
            desmarcarTouch();
        } else {
            desmarcarTouch();
        }
    });
}

function desmarcarTouch() {
    if (selectedStaffElement) selectedStaffElement.classList.remove('selected-touch');
    selectedStaffElement = null;
    document.querySelectorAll('.can-drop-touch').forEach(el => el.classList.remove('can-drop-touch'));
}

// --- INITIALIZATION ---

export function init() {
    console.log("Iniciando Alocacao Operational Unified Module...");
    loadStaffs();
    initDragDrop();
    generateCalendar();
    
    // Carregar data de hoje por padrão se não houver selecionada
    const hoje = new Date().toISOString().split('T')[0];
    loadTreinamentosForDate(hoje);

    // Delegação de evento de clique em staffs para Touch/Mobile
    initTouchSupport();

    // Listener para o formulário do painel lateral de edição de treinamento
    const sideForm = document.getElementById('treinamentoFormSide');
    if (sideForm) {
        sideForm.onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('modalTreinamentoId').value;
            if (!id) return;

            const updateData = {
                data_evento: new Date(document.getElementById('modalDataEvento').value + 'T12:00:00'),
                qtd_staffs: parseInt(document.getElementById('modalQtdStaffs').value) || 0,
                participantes: parseInt(document.getElementById('modalParticipantes').value) || 0,
                hora_saida: new Date(document.getElementById('modalHoraSaida').value),
                hora_retorno: new Date(document.getElementById('modalHoraRetorno').value),
                transporte: document.getElementById('modalTransporte').value,
                coordenador_interno: document.getElementById('modalCoordInterno').value,
                obs_logistica: document.getElementById('modalObsLogistica').value,
                observacoes: document.getElementById('modalObservacoes').value
            };

            try {
                await updateDoc(doc(db, 'trainings', id), updateData);
                window.fecharSidePanel();
            } catch (err) { 
                console.error("Erro ao salvar side panel:", err);
                handleFirestoreError(err, 'UPDATE', 'trainings');
            }
        };
    }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(init, 100);
else document.addEventListener('DOMContentLoaded', init);

// Exposição global final para garantir compatibilidade com onclick
window.loadTreinamentosForDate = loadTreinamentosForDate;
window.generateCalendar = generateCalendar;

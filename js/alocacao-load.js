import { db, collection, query, where, onSnapshot, handleFirestoreError } from './firebase-config.js';
import { criarMenuStatus } from './alocacao-menu.js';
import { registrarLog, atualizarNumeracaoStaffs, verificarDuplicidadeStaffsNoDia } from './alocacao-core.js';
import { formatarDataBR, formatarDataHoraHover, ativarHoverCards } from './alocacao-ui.js';

// alocacao-load.js
window.staffCache = {}; 
window.dataSelecionada = null;
window.allStaffsCache = [];
window.staffsAllocatedToday = new Set();
let unsubStaffsGlobal = null;
let unsubAllocationsGlobal = null;

export function criarElementoStaff(staffId, nome, isClone = false) {
    const el = document.createElement('div');
    el.className = 'staff-item';
    
    const domId = `staff-dom-${staffId}-${Math.floor(Math.random() * 1000000)}`;
    el.id = domId;
    el.setAttribute('data-staff-id', staffId);
    el.setAttribute('data-persisted', isClone ? 'false' : 'true');
    el.setAttribute('draggable', 'true');
    
    const nomeFinal = nome || window.staffCache[staffId] || `Staff ${staffId}`;
    el.textContent = nomeFinal;

    if (isClone) el.classList.add('status-duplicado');

    el.addEventListener('contextmenu', (e) => {
        if (el.closest('.staffs-allocated')) criarMenuStatus(e, staffId, el);
    });

    el.addEventListener('dragstart', (e) => {
        const origemId = el.parentElement.getAttribute('data-treinamento-id') || "";
        e.dataTransfer.setData('dom-id', domId);
        e.dataTransfer.setData('staff-id', staffId);
        e.dataTransfer.setData('origem-id', origemId);
        e.dataTransfer.setData('persisted', el.getAttribute('data-persisted'));

        setTimeout(() => {
            el.classList.add('dragging-source');
        }, 0);
    });

    el.addEventListener('dragend', () => {
        document.querySelectorAll('.staff-item').forEach(item => {
            item.classList.remove('dragging-source');
        });
    });

    return el;
}

export async function loadStaffs() {
    const container = document.getElementById('staffsContainer');
    if (!container) return;
    
    if (unsubStaffsGlobal) unsubStaffsGlobal();

    console.log("Iniciando monitoramento global de staffs...");
    unsubStaffsGlobal = onSnapshot(collection(db, 'staffs'), (snapshot) => {
        window.allStaffsCache = [];
        snapshot.forEach(docSnap => {
            const staff = docSnap.data();
            const staffId = docSnap.id;
            if (staff.ativo === 'sim' || !staff.ativo) {
                window.staffCache[staffId] = staff.nome_abreviado || staff.nome_completo;
                window.allStaffsCache.push({ id: staffId, ...staff });
            }
        });
        renderAvailableStaffs();
    }, (error) => handleFirestoreError(error, 'LIST', 'staffs'));
}

export function renderAvailableStaffs() {
    const container = document.getElementById('staffsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Sort staffs alphabetically by name (prefer name_abreviado, fallback to name_completo)
    const sortedStaffs = [...window.allStaffsCache].sort((a, b) => {
        const nameA = (a.nome_abreviado || a.nome_completo || "").toLowerCase();
        const nameB = (b.nome_abreviado || b.nome_completo || "").toLowerCase();
        return nameA.localeCompare(nameB);
    });

    sortedStaffs.forEach(staff => {
        // Only show if NOT allocated today (ensuring we match string IDs)
        const isAllocated = window.staffsAllocatedToday.has(String(staff.id));
        if (!isAllocated) {
            const el = criarElementoStaff(staff.id, window.staffCache[staff.id]);
            container.appendChild(el);
        }
    });
}

let unsubTreinamentosAlocacao = null;
let unsubAlocacoesPorTreinamento = {};

export async function loadTreinamentosForDate(dateStr) {
    console.log(`Carregando treinamentos para: ${dateStr}`);
    window.dataSelecionada = dateStr;
    const container = document.getElementById('treinamentosContainer');
    if (!container) return;

    if (unsubTreinamentosAlocacao) unsubTreinamentosAlocacao();
    if (unsubAllocationsGlobal) unsubAllocationsGlobal();
    Object.values(unsubAlocacoesPorTreinamento).forEach(u => u());
    unsubAlocacoesPorTreinamento = {};

    container.innerHTML = '<div class="loading">Carregando treinamentos...</div>';

    try {
        const dStart = new Date(dateStr + 'T00:00:00');
        const dEnd = new Date(dateStr + 'T23:59:59');

        // 1. Monitor global allocations for this date to update Available List
        const qAlloc = query(collection(db, 'allocations'),
            where('data_alocacao', '>=', dStart),
            where('data_alocacao', '<=', dEnd)
        );
        unsubAllocationsGlobal = onSnapshot(qAlloc, (snapshot) => {
            window.staffsAllocatedToday = new Set();
            snapshot.forEach(doc => {
                const aloc = doc.data();
                if (aloc.staff_id) {
                    window.staffsAllocatedToday.add(String(aloc.staff_id));
                }
            });
            renderAvailableStaffs();
        });

        // 2. Load trainings
        const q = query(
            collection(db, 'trainings'), 
            where('data_evento', '>=', dStart),
            where('data_evento', '<=', dEnd),
            where('etapa', 'in', ['Confirmado', 'Realizado'])
        );
        
        unsubTreinamentosAlocacao = onSnapshot(q, (snapshot) => {
            container.innerHTML = '';
            if (snapshot.empty) {
                container.innerHTML = '<p class="no-data">Nenhum treinamento confirmado/realizado para esta data.</p>';
                return;
            }

            snapshot.forEach(docSnap => {
                const t = docSnap.data();
                const id = docSnap.id;
                const col = document.createElement('div');
                col.classList.add('treinamento-column');
                const dataFormatada = formatarDataBR(t.data_evento || dateStr);

                col.innerHTML = `
                    <div class="treinamento-header">
                        <div class="info-treinamento">
                            <div class="nome-negocio" onclick="abrirModalTreinamento('${id}')">
                                ${t.nome_negocio}
                                <div class="logistica-hover-card">
                                    <div class="hover-card-column">
                                        <div class="hover-col-title"><i class="fas fa-truck"></i> Logística Completa</div>
                                        <div class="hover-card-row"><span class="hover-card-label">Saída:</span> <span class="hover-card-value">${formatarDataHoraHover(t.hora_saida)}</span></div>
                                        <div class="hover-card-row"><span class="hover-card-label">Retorno:</span> <span class="hover-card-value">${formatarDataHoraHover(t.hora_retorno)}</span></div>
                                        <div class="hover-card-row"><span class="hover-card-label">Transporte:</span> <span class="hover-card-value">${t.transporte || '--'}</span></div>
                                        <hr style="margin: 10px 0; border: 0; border-top: 1px solid #eee;">
                                        <div class="hover-card-row"><span class="hover-card-label">Obs. Logística:</span> <div class="hover-text-box">${t.obs_logistica || 'Sem observações.'}</div></div>
                                    </div>
                                    <div class="hover-card-column">
                                        <div class="hover-col-title"><i class="fas fa-user-friends"></i> Responsáveis</div>
                                        <div class="hover-card-row"><span class="hover-card-label">Coord. Interno:</span> <span class="hover-card-value">${t.coordenador_interno || '--'}</span></div>
                                        <div class="hover-card-row"><span class="hover-card-label">Montagem:</span> <span class="hover-card-value">${t.coordenador_montagem || '--'}</span></div>
                                        <div class="hover-card-row"><span class="hover-card-label">Evento:</span> <span class="hover-card-value">${t.coordenador_evento || '--'}</span></div>
                                        <hr style="margin: 10px 0; border: 0; border-top: 1px solid #eee;">
                                        <div class="hover-card-row"><span class="hover-card-label">Staffs Necessários:</span> <span class="hover-card-value">${t.qtd_staffs || 0}</span></div>
                                        <div class="hover-card-row"><span class="hover-card-label">Equipes:</span> <span class="hover-card-value">${t.qtd_equipes || 0}</span></div>
                                    </div>
                                    <div class="hover-card-column">
                                        <div class="hover-col-title"><i class="fas fa-align-left"></i> Obs. Gerais</div>
                                        <div class="hover-text-box">${t.obs_geral_logistica || 'Nenhuma observação cadastrada.'}</div>
                                    </div>
                                </div>
                            </div>
                            <div class="programa-nb">${t.programa_nb || '---'}</div>
                            <div class="local-evento">${t.local_evento || '---'} | ${t.cidade || '---'}</div>
                            <div class="participantes-data">
                                <span class="pax-box">${t.participantes || 0} PAX</span>
                                <span class="data-evento-box">${dataFormatada}</span>
                            </div>
                        </div>
                        <div class="botoes-container">
                            <button class="btn-financeiro" title="Financeiro" onclick="abrirFinanceiroTreinamento('${id}')" style="background: #059669; color: white;"><i class="fas fa-hand-holding-usd"></i></button>
                            <button class="btn-uniformes" title="Uniformes" onclick="abrirImpressaoUniformes('${id}', '${dateStr}')"><i class="fas fa-tshirt"></i></button>
                            <button class="btn-facilitadores" title="Facilitadores" onclick="abrirListaFacilitadores('${id}', '${dateStr}')"><i class="fas fa-users"></i></button>
                            <button class="btn-logs" title="Histórico" onclick="abrirModalLogs('${id}')"><i class="fas fa-history"></i></button>
                        </div>
                    </div>
                    <div class="staffs-allocated" data-treinamento-id="${id}"></div>
                `;
                container.appendChild(col);
                iniciarMonitoramentoAlocacoesParaTreinamento(id, dateStr);
            });
            ativarHoverCards();
        }, (error) => handleFirestoreError(error, 'LIST', 'trainings'));
    } catch (err) {
        console.error("Erro ao carregar treinamentos:", err);
    }
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
            el.setAttribute('data-persisted', 'true');
            if (aloc.motivo_recusa) el.setAttribute('data-motivo', aloc.motivo_recusa);
            if (aloc.status) el.classList.add(`status-${aloc.status}`);
            containerDestino.appendChild(el);
        });
        
        atualizarNumeracaoStaffs(treinamentoId);
        verificarDuplicidadeStaffsNoDia();
    });
}

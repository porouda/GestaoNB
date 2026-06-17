import { db, auth, doc, getDoc, updateDoc, collection, query, where, orderBy, onSnapshot, handleFirestoreError } from './firebase-config.js';

// Função auxiliar para ajustar a altura
export function autoResizeModal(textarea) {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

function setVal(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.value = value || '';
    } else {
        console.warn(`Aviso: Elemento ID '${id}' não encontrado no HTML.`);
    }
}

let logsCacheInterno = [];

// 1. Função para trocar de abas
export function switchTab(event, tabId) {
    console.log("Trocando para a aba:", tabId);
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.currentTarget.classList.add('active');
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');

    if (tabId === 'tab-historico') {
        const idTreinamento = document.getElementById('modalTreinamentoId').value;
        carregarLogsAbaInterna(idTreinamento);
    }

    if (tabId === 'tab-financeiro') {
        const idTreinamento = document.getElementById('modalTreinamentoId').value;
        if (window.financeiro) {
            window.financeiro.carregarFinanceiro(idTreinamento);
        }
    }
}

// 2. Função para buscar os logs no Firestore
export async function carregarLogsAbaInterna(id) {
    const container = document.getElementById('lista-logs-interna');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">Buscando histórico...</div>';

    const q = query(collection(db, 'logs'), where('registro_id', '==', id), orderBy('data', 'desc'));
    
    onSnapshot(q, (snapshot) => {
        window.logsCacheInterno = [];
        snapshot.forEach(docSnap => {
            const log = docSnap.data();
            const dataF = log.data?.toDate ? log.data.toDate().toLocaleString('pt-BR') : '---';
            window.logsCacheInterno.push({ ...log, data_f: dataF });
        });
        filtrarLogsInternos();
    });
}

window.filtrarLogsInternos = function() {
    const container = document.getElementById('lista-logs-interna');
    if (!container) return;

    const elemTipo = document.getElementById('filtroTipoTab');
    const elemBusca = document.getElementById('filtroBuscaTab');
    const tipo = elemTipo ? elemTipo.value : 'todos';
    const busca = elemBusca ? elemBusca.value.toLowerCase() : '';

    if (!window.logsCacheInterno || window.logsCacheInterno.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; padding:40px;">Nenhum histórico encontrado para este treinamento.</p>';
        return;
    }

    const filtrados = window.logsCacheInterno.filter(log => {
        const matchType = tipo === 'todos' || log.acao.toLowerCase() === tipo;
        const matchText = (log.descricao || '').toLowerCase().includes(busca) || (log.usuario_nome || '').toLowerCase().includes(busca);
        return matchType && matchText;
    });

    if (filtrados.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; padding:40px;">Nenhum registro encontrado para este filtro.</p>';
        return;
    }

    container.innerHTML = filtrados.map(log => {
        const cores = { 'alocação':'#22c55e', 'transferência':'#eab308', 'exclusão':'#ef4444', 'status':'#3b82f6', 'edição':'#8b5cf6' };
        const cor = cores[log.acao.toLowerCase()] || '#64748b';
        const desc = (log.descricao || '').replace(/\[(.*?)\]/g, '<strong>$1</strong>');

        return `
            <div style="background:white; border:1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                    <span style="font-weight:800; color:#1e293b; font-size:12px;">${(log.usuario_nome || 'SISTEMA').toUpperCase()}</span>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:11px; color:#64748b;">${log.data_f}</span>
                        <span style="background:${cor}; color:white; font-size:9px; font-weight:bold; padding:2px 8px; border-radius:10px; text-transform:uppercase; min-width:70px; text-align:center;">${log.acao}</span>
                    </div>
                </div>
                <div style="display: flex; align-items: center; min-height: 30px; border-left: 3px solid ${cor}; padding-left: 10px; font-size:13px; color:#475569; line-height:1.4; white-space: pre-wrap; text-align: left;">
                    <span>${desc}</span>
                </div>
            </div>
        `;
    }).join('');
};

function gerenciarBloqueioSecao(prefixo, bloquear) {
    const idContainer = prefixo === 'pre' ? 'container-pre-evento' : 'container-pos-evento';
    const container = document.getElementById(idContainer);
    if (!container) return;

    const campos = container.querySelectorAll('input, select, textarea');
    campos.forEach(campo => {
        if (campo.type !== 'hidden') {
            campo.disabled = bloquear;
            campo.style.opacity = bloquear ? "0.6" : "1";
            campo.style.cursor = bloquear ? "not-allowed" : "auto";
        }
    });
}

function renderizarAreaConferir(prefixo, nome, data) {
    const container = document.getElementById(`area-conferir-${prefixo}`);
    if (!container) return;

    if (nome && data) {
        container.innerHTML = `
            <div class="conferido-info">
                <i class="fas fa-check-circle"></i> Conferido por ${nome} em ${data}
                <span style="color: #ef4444; cursor: pointer; margin-left: 8px; font-size: 10px; text-decoration: underline;" 
                      onclick="window.limparConferencia('${prefixo}')"> (Desfazer)</span>
            </div>
        `;
        gerenciarBloqueioSecao(prefixo, true);
    } else {
        container.innerHTML = `
            <button type="button" class="btn-conferir" onclick="window.confirmarConferenciaAuto('${prefixo}')">
                <i class="fas fa-check"></i> Conferir
            </button>
        `;
        gerenciarBloqueioSecao(prefixo, false);
    }
}

window.confirmarConferenciaAuto = async function(prefixo) {
    const nomeLogado = window.usuarioLogado ? window.usuarioLogado.nome : auth.currentUser?.email || "Usuário";
    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR') + ' ' + agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (prefixo === 'pre') {
        document.getElementById('modalLogPrePor').value = nomeLogado;
        document.getElementById('modalLogPreEm').value = dataFormatada;
    } else {
        document.getElementById('modalLogPosPor').value = nomeLogado;
        document.getElementById('modalLogPosEm').value = dataFormatada;
    }

    renderizarAreaConferir(prefixo, nomeLogado, dataFormatada);
    await salvarTreinamentoSilencioso();
};

window.limparConferencia = async function(prefixo) {
    if (prefixo === 'pre') {
        document.getElementById('modalLogPrePor').value = '';
        document.getElementById('modalLogPreEm').value = '';
    } else {
        document.getElementById('modalLogPosPor').value = '';
        document.getElementById('modalLogPosEm').value = '';
    }
    
    renderizarAreaConferir(prefixo, '', '');
    await salvarTreinamentoSilencioso();
};

export async function abrirModalTreinamento(id) {
    try {
        const tabLogistica = document.querySelector('.tab-btn:nth-child(1)');
        if (tabLogistica) switchTab({ currentTarget: tabLogistica }, 'tab-logistica');

        const docSnap = await getDoc(doc(db, 'trainings', id));
        if (!docSnap.exists()) throw new Error("Treinamento não encontrado");
        
        const t = docSnap.data();
        const data = t.dataEvento || t.data_evento;
        const dataEventoRaw = data?.toDate ? data.toDate().toISOString().split('T')[0] : data;
        const dataHoraPadrao = dataEventoRaw ? `${dataEventoRaw}T00:00` : "";

        const setDateTimeVal = (id, valor) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.value = valor || dataHoraPadrao;
        };

        setVal('modalTreinamentoId', id);
        setVal('modalNomeNegocio', t.nomeNegocio || t.nome_negocio);
        setVal('modalEtapa', t.etapa);
        setVal('modalProgramaNb', t.programaNb || t.programa_nb);
        setVal('modalDataEvento', dataEventoRaw);
        setVal('modalParticipantes', t.participantes);
        setVal('modalLocalEvento', t.localEvento || t.local_evento);
        setVal('modalCidade', t.cidade);
        setVal('modalContatos', t.contatos || t.contatos_associados);
        setVal('modalObservacoes', t.observacoes);
        
        setDateTimeVal('modalHoraSaida', t.hora_saida);
        setDateTimeVal('modalHoraRetorno', t.hora_retorno);
        setVal('modalTransporte', t.transporte);
        setVal('modalCoordInterno', t.coordenador_interno);
        setVal('modalCoordMontagem', t.coordenador_montagem);
        setVal('modalCoordEvento', t.coordenador_evento);
        setVal('modalQtdStaffs', t.qtd_staffs);
        setVal('modalQtdEquipes', t.qtd_equipes);

        setVal('modalLogPrePor', t.log_pre_conferido_por);
        setVal('modalLogPreEm', t.log_pre_conferido_em);
        setVal('modalLogPosPor', t.log_pos_conferido_por);
        setVal('modalLogPosEm', t.log_pos_conferido_em);
        
        setVal('modalVoucher', t.voucher_alimentacao || 'nao');
        setVal('modalBombeiro', t.bombeiro || 'nao');
        setDateTimeVal('modalHoraRealSaida', t.hora_real_saida);
        setDateTimeVal('modalHoraRealChegada', t.hora_real_chegada);
        setVal('modalObsLogistica', t.obs_logistica);
        setVal('modalObsGeralLogistica', t.obs_geral_logistica);

        const sidePanel = document.getElementById('sidePanelTreinamento');
        if (sidePanel) sidePanel.style.display = 'flex';
        
        renderizarAreaConferir('pre', t.log_pre_conferido_por, t.log_pre_conferido_em);
        renderizarAreaConferir('pos', t.log_pos_conferido_por, t.log_pos_conferido_em);

    } catch (error) {
        console.error("Erro ao abrir modal:", error);
    }
}

export function fecharModalTreinamento() {
    const sidePanel = document.getElementById('sidePanelTreinamento');
    if (sidePanel) sidePanel.style.display = 'none';
}

function obterDadosCompletosDoModal() {
    return {
        nomeNegocio: document.getElementById('modalNomeNegocio').value,
        etapa: document.getElementById('modalEtapa').value,
        programaNb: document.getElementById('modalProgramaNb').value,
        dataEvento: document.getElementById('modalDataEvento').value,
        participantes: document.getElementById('modalParticipantes').value,
        localEvento: document.getElementById('modalLocalEvento').value,
        cidade: document.getElementById('modalCidade').value,
        contatos: document.getElementById('modalContatos').value,
        observacoes: document.getElementById('modalObservacoes').value,
        hora_saida: document.getElementById('modalHoraSaida').value,
        hora_retorno: document.getElementById('modalHoraRetorno').value,
        transporte: document.getElementById('modalTransporte').value,
        coordenador_interno: document.getElementById('modalCoordInterno').value,
        coordenador_montagem: document.getElementById('modalCoordMontagem').value,
        coordenador_evento: document.getElementById('modalCoordEvento').value,
        voucher_alimentacao: document.getElementById('modalVoucher').value,
        bombeiro: document.getElementById('modalBombeiro').value,
        hora_real_saida: document.getElementById('modalHoraRealSaida').value,
        hora_real_chegada: document.getElementById('modalHoraRealChegada').value,
        obs_logistica: document.getElementById('modalObsLogistica').value,
        obs_geral_logistica: document.getElementById('modalObsGeralLogistica').value,
        log_pre_conferido_por: document.getElementById('modalLogPrePor').value,
        log_pre_conferido_em: document.getElementById('modalLogPreEm').value,
        log_pos_conferido_por: document.getElementById('modalLogPosPor').value,
        log_pos_conferido_em: document.getElementById('modalLogPosEm').value,
        qtd_staffs: document.getElementById('modalQtdStaffs').value,
        qtd_equipes: document.getElementById('modalQtdEquipes').value
    };
}

export async function salvarTreinamentoSilencioso() {
    const id = document.getElementById('modalTreinamentoId').value;
    const dados = obterDadosCompletosDoModal();
    try {
        await updateDoc(doc(db, 'trainings', id), dados);
        console.log("Treinamento salvo silenciosamente.");
    } catch (error) {
        console.error("Erro ao salvar silenciosamente:", error);
    }
}

// Global actions
window.abrirModalTreinamento = abrirModalTreinamento;
window.fecharModalTreinamento = fecharModalTreinamento;
window.fecharSidePanel = fecharModalTreinamento;
window.switchTab = switchTab;

window.abrirFinanceiroTreinamento = async function(id) {
    console.log("Financeiro: Abrindo painel para id:", id);
    await abrirModalTreinamento(id);
    
    // Pequeno delay para garantir que o sidebar abriu e o DOM atualizou
    setTimeout(() => {
        const tabBtns = document.querySelectorAll('.tab-btn');
        let btnFin = null;
        tabBtns.forEach(btn => {
            if (btn.textContent.includes('Financeiro')) btnFin = btn;
        });

        if (btnFin) {
            console.log("Financeiro: Clicando na aba financeira automaticamente");
            switchTab({ currentTarget: btnFin }, 'tab-financeiro');
        } else {
            console.error("Financeiro: Aba financeira não encontrada no DOM por texto");
            // Fallback pelo seletor que usamos antes
            const fallback = document.querySelector('.tab-btn[onclick*="tab-financeiro"]');
            if (fallback) switchTab({ currentTarget: fallback }, 'tab-financeiro');
        }
    }, 150);
};

// Inicialização automática robusta
const initModals = () => {
    // No HTML o form é treinamentoFormSide
    const form = document.getElementById('treinamentoFormSide');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const id = document.getElementById('modalTreinamentoId').value;
            const dados = obterDadosCompletosDoModal();

            try {
                await updateDoc(doc(db, 'trainings', id), dados);
                fecharModalTreinamento();
                // Notificar atualização se necessário
                if (typeof window.loadTreinamentosForDate === 'function') {
                    window.loadTreinamentosForDate(document.getElementById('modalDataEvento').value);
                }
            } catch (error) {
                console.error("Erro ao salvar treinamento pelo form:", error);
            }
        });
    }

    const txtObs = document.getElementById('modalObservacoes');
    if (txtObs) {
        txtObs.addEventListener('input', function() {
            autoResizeModal(this);
        });
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModals);
} else {
    initModals();
}

import { db, doc, setDoc, updateDoc, handleFirestoreError } from './firebase-config.js';
import { registrarLog, atualizarNumeracaoStaffs } from './alocacao-core.js';
import { criarElementoStaff } from './alocacao-load.js';

// alocacao-menu.js

export function abrirModalObservacao(staffId, treinamentoId, elemento, obrigatorio = false) {
    const dataAlocacao = window.dataSelecionada;
    const motivoAtual = elemento.getAttribute('data-motivo') || "";

    const overlay = document.createElement('div');
    overlay.className = 'modal-obs-overlay';
    
    overlay.innerHTML = `
        <div class="modal-obs-content">
            <div class="header-modal" style="padding: 15px 20px; border-bottom: 1px solid #eee;">
                <h3 style="margin: 0; font-size: 16px;">${obrigatorio ? 'Motivo da Recusa' : 'Observação'}</h3>
            </div>
            <div class="modal-obs-body-small">
                <textarea id="txt-modal-obs" placeholder="Digite as observações aqui...">${motivoAtual}</textarea>
            </div>
            <div class="modal-footer" style="padding: 10px 20px;">
                ${!obrigatorio ? '<button type="button" class="modal-obs-btn-cancel" id="btn-obs-cancel">Cancelar</button>' : ''}
                <button type="button" class="modal-obs-btn-save" id="btn-obs-save">Salvar</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    const textarea = document.getElementById('txt-modal-obs');
    textarea.focus();

    document.getElementById('btn-obs-save').onclick = async () => {
        const novoMotivo = textarea.value.trim();
        const alocId = `${treinamentoId}_${staffId}`;
        
        try {
            await updateDoc(doc(db, 'allocations', alocId), {
                motivo_recusa: novoMotivo
            });
            registrarLog('observação', `Observação atualizada para staff [${window.staffCache[staffId]}] no treinamento [${treinamentoId}]: ${novoMotivo}`, treinamentoId);
            overlay.remove();
        } catch (err) {
            handleFirestoreError(err, 'UPDATE', 'allocations');
        }
    };

    if (!obrigatorio) {
        document.getElementById('btn-obs-cancel').onclick = () => overlay.remove();
    }
}

export function criarMenuStatus(e, staffId, elemento) {
    e.preventDefault();
    const menuAntigo = document.getElementById('context-menu-status');
    if (menuAntigo) menuAntigo.remove();

    const treinamentoId = elemento.parentElement.getAttribute('data-treinamento-id');
    const dataAlocacao = window.dataSelecionada;

    const menu = document.createElement('div');
    menu.id = 'context-menu-status';
    menu.style.top = `${e.pageY}px`;
    menu.style.left = `${e.pageX}px`;

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
            hr.style.margin = '4px 0'; hr.style.border = '0'; hr.style.borderTop = '1px solid #eee';
            menu.appendChild(hr);
            return;
        }

        const item = document.createElement('div');
        item.className = `menu-item-status status-${opt.status}`;
        item.textContent = opt.label;

        item.onclick = async () => {
            if (opt.action === 'duplicar') {
                duplicarStaffNoLayout(staffId, elemento);
            } else if (opt.action === 'observacao') {
                abrirModalObservacao(staffId, treinamentoId, elemento, false);
            } else {
                await atualizarStatusAlocacao(staffId, treinamentoId, opt.status);
                if (opt.status === 'recusado') {
                    abrirModalObservacao(staffId, treinamentoId, elemento, true);
                }
            }
            menu.remove();
        };

        menu.appendChild(item);
    });

    document.body.appendChild(menu);
    const fecharMenu = () => { menu.remove(); document.removeEventListener('click', fecharMenu); };
    setTimeout(() => document.addEventListener('click', fecharMenu), 10);
}

export async function atualizarStatusAlocacao(staffId, treinamentoId, novoStatus) {
    const alocId = `${treinamentoId}_${staffId}`;
    try {
        await updateDoc(doc(db, 'allocations', alocId), {
            status: novoStatus
        });
        registrarLog('status', `Status do staff [${window.staffCache[staffId]}] alterado para [${novoStatus}] no treinamento [${treinamentoId}]`, treinamentoId);
    } catch (err) {
        handleFirestoreError(err, 'UPDATE', 'allocations');
    }
}

export function duplicarStaffNoLayout(staffId, elementoOriginal) {
    const nomeStaff = window.staffCache[staffId] || `Staff ${staffId}`;
    const novoCard = criarElementoStaff(staffId, nomeStaff, true);
    novoCard.setAttribute('data-persisted', 'false');
    novoCard.classList.add('is-duplicate');
    novoCard.classList.add('status-intencao');

    const containerDisponiveis = document.getElementById('staffsContainer');
    if (containerDisponiveis) {
        containerDisponiveis.insertBefore(novoCard, containerDisponiveis.firstChild);
    }
}

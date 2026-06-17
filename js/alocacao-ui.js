// alocacao-ui.js

import { db, doc, getDoc, query, collection, where, getDocs } from './firebase-config.js';

export function formatarDataBR(dateValue) {
    if (!dateValue) return '';
    let d;
    if (typeof dateValue.toDate === 'function') {
        d = dateValue.toDate();
    } else if (dateValue instanceof Date) {
        d = dateValue;
    } else {
        d = new Date(dateValue);
    }
    
    if (isNaN(d.getTime())) return dateValue;
    
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    return `${dia}/${mes}/${ano}`;
}

export function formatarDataHoraHover(dateValue) {
    if (!dateValue) return "--:--";
    let d;
    if (typeof dateValue.toDate === 'function') {
        d = dateValue.toDate();
    } else if (dateValue instanceof Date) {
        d = dateValue;
    } else {
        d = new Date(dateValue);
    }

    if (isNaN(d.getTime())) return dateValue;

    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes} ${hora}:${min}`;
}

export function ativarHoverCards() {
    const titulos = document.querySelectorAll('.nome-negocio');
    titulos.forEach(titulo => {
        titulo.addEventListener('mouseenter', () => {
            const card = titulo.querySelector('.logistica-hover-card');
            if (!card) return;

            const rect = titulo.getBoundingClientRect();
            card.style.top = (rect.bottom + 5) + 'px';
            card.style.left = rect.left + 'px';

            const larguraCard = 850;
            if (rect.left + larguraCard > window.innerWidth) {
                card.style.left = (window.innerWidth - larguraCard - 20) + 'px';
            }
        });
    });
}

export function ordenarStaffsDisponiveis() {
    const container = document.getElementById('staffsContainer');
    if (!container) return;
    const staffs = Array.from(container.children);
    
    staffs.sort((a, b) => {
        const nomeA = a.textContent.toLowerCase();
        const nomeB = b.textContent.toLowerCase();
        return nomeA.localeCompare(nomeB);
    });
    
    container.innerHTML = '';
    staffs.forEach(s => container.appendChild(s));
}
// Expondo para window para acesso via onclick no HTML
window.formatarDataBR = formatarDataBR;
window.formatarDataHoraHover = formatarDataHoraHover;
window.ativarHoverCards = ativarHoverCards;
window.ordenarStaffsDisponiveis = ordenarStaffsDisponiveis;

window.abrirImpressaoUniformes = async function(treinamentoId, dataAlocacao) {
    const modal = document.getElementById('JANELA_IMPRESSAO_SISTEMA');
    const container = document.getElementById('CONTEUDO_IMPRESSAO_SISTEMA');
    const titulo = document.getElementById('titulo_janela_impressao');
    if (!modal) return;

    modal.style.cssText = "display: flex !important; position: fixed !important; z-index: 2000; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8);";
    container.innerHTML = "Carregando...";
    titulo.innerText = "Relação de Uniformes";

    try {
        const docSnap = await getDoc(doc(db, 'trainings', treinamentoId));
        const t = docSnap.data();
        
        // Date range query for Timestamp support
        const dStart = new Date(dataAlocacao + 'T00:00:00');
        const dEnd = new Date(dataAlocacao + 'T23:59:59');

        const q = query(collection(db, 'allocations'), 
            where('treinamento_id', '==', treinamentoId),
            where('data_alocacao', '>=', dStart),
            where('data_alocacao', '<=', dEnd)
        );
        const snapshot = await getDocs(q);
        const alocs = [];
        snapshot.forEach(d => {
            const data = d.data();
            // Apenas status que fazem sentido para o uniforme (não recusado/pendente talvez?)
            // Por enquanto vamos mostrar todos alocados para não sumirem
            if (data.status !== 'recusado') {
                alocs.push(data);
            }
        });

        const html = `
            <style>
                .u-table { width: 100%; border-collapse: collapse; font-size: 12px; }
                .u-table th, .u-table td { border: 1px solid #000; padding: 5px; text-align: center; }
                .u-table th { background: #f0f0f0; }
            </style>
            <div style="text-align:center; margin-bottom:20px;">
                <h3>RELAÇÃO DE ENTREGA DE UNIFORMES</h3>
                <p>Evento: ${t.nome_negocio} | Data: ${dataAlocacao.split('-').reverse().join('/')}</p>
            </div>
            <table class="u-table">
                <thead>
                    <tr><th>#</th><th>Nome</th><th colspan="2">Camiseta</th><th colspan="2">Calça</th><th colspan="2">Agasalho</th><th>Obs</th></tr>
                    <tr><th></th><th></th><th>ret</th><th>dev</th><th>ret</th><th>dev</th><th>ret</th><th>dev</th><th></th></tr>
                </thead>
                <tbody>
                    ${alocs.map((a, i) => `<tr><td>${i+1}</td><td style="text-align:left;">${window.staffCache[a.staff_id] || 'Staff ' + a.staff_id}</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`).join('')}
                </tbody>
            </table>
        `;
        container.innerHTML = html;
    } catch (e) { container.innerHTML = "Erro ao carregar."; }
};

window.abrirListaFacilitadores = async function(treinamentoId, dataAlocacao) {
    const modal = document.getElementById('JANELA_IMPRESSAO_SISTEMA');
    const container = document.getElementById('CONTEUDO_IMPRESSAO_SISTEMA');
    const titulo = document.getElementById('titulo_janela_impressao');
    if (!modal) return;

    modal.style.cssText = "display: flex !important; position: fixed !important; z-index: 2000; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8);";
    container.innerHTML = "Carregando...";
    titulo.innerText = "Lista de Facilitadores";

    try {
        const docSnap = await getDoc(doc(db, 'trainings', treinamentoId));
        const t = docSnap.data();
        
        // Date range query for Timestamp support
        const dStart = new Date(dataAlocacao + 'T00:00:00');
        const dEnd = new Date(dataAlocacao + 'T23:59:59');

        const q = query(collection(db, 'allocations'), 
            where('treinamento_id', '==', treinamentoId),
            where('data_alocacao', '>=', dStart),
            where('data_alocacao', '<=', dEnd)
        );
        const snapshot = await getDocs(q);
        const staffs = [];
        for (const d of snapshot.docs) {
            const a = d.data();
            if (a.status !== 'recusado') {
                const sSnap = await getDoc(doc(db, 'staffs', a.staff_id));
                if (sSnap.exists()) staffs.push(sSnap.data());
            }
        }

        const html = `
            <style>
                .p-table { width: 100%; border-collapse: collapse; margin-top:20px; }
                .p-table th, .p-table td { border: 1px solid #000; padding: 10px; text-align: left; }
                @media print { .no-print { display: none; } }
            </style>
            <h3>LISTA DE FACILITADORES NORTHBRASIL</h3>
            <p><strong>EVENTO:</strong> ${t.nome_negocio}</p>
            <p><strong>DATA:</strong> ${dataAlocacao.split('-').reverse().join('/')}</p>
            <table class="p-table" id="tabelaFacilitadoresExport">
                <thead><tr><th>#</th><th>Nome</th><th>RG</th><th>CPF</th><th>Nascimento</th></tr></thead>
                <tbody>
                    ${staffs.map((s, i) => `
                        <tr>
                            <td>${i+1}</td>
                            <td class="nome-cell" data-full="${s.nome_completo}" data-short="${s.nome_abreviado || s.nome_completo}">${s.nome_abreviado || s.nome_completo}</td>
                            <td>${s.rg || ''}</td>
                            <td>${s.cpf || ''}</td>
                            <td>${s.dt_nascimento ? s.dt_nascimento.split('-').reverse().join('/') : ''}</td>
                        </tr>`).join('')}
                </tbody>
            </table>
            <div class="no-print" style="margin-top:20px; display:flex; gap:10px;">
                <button onclick="window.alternarNomes()" class="btn-primary">Alternar Nomes</button>
                <button onclick="window.exportarExcel('${t.nome_negocio}')" class="btn-save">Excel</button>
            </div>
        `;
        container.innerHTML = html;
    } catch (e) { container.innerHTML = "Erro ao carregar."; }
};

window.alternarNomes = function() {
    document.querySelectorAll('.nome-cell').forEach(c => {
        c.textContent = (c.textContent === c.dataset.short) ? c.dataset.full : c.dataset.short;
    });
};

window.exportarExcel = function(nome) {
    if (typeof XLSX === 'undefined') {
        const sc = document.createElement('script');
        sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        sc.onload = () => {
            const wb = XLSX.utils.table_to_book(document.getElementById('tabelaFacilitadoresExport'));
            XLSX.writeFile(wb, `Lista_${nome}.xlsx`);
        };
        document.head.appendChild(sc);
    } else {
        const wb = XLSX.utils.table_to_book(document.getElementById('tabelaFacilitadoresExport'));
        XLSX.writeFile(wb, `Lista_${nome}.xlsx`);
    }
};

window.fecharModalImpressao = () => document.getElementById('JANELA_IMPRESSAO_SISTEMA').style.display = 'none';
window.imprimirConteudoTabela = () => window.print();

window.abrirModalLogs = async function(id) {
    const modal = document.getElementById('JANELA_LOGS_FINAL');
    const container = document.getElementById('CONTEUDO_LOGS_FINAL');
    if (!modal || !container) return;

    modal.style.display = 'flex';
    container.innerHTML = "Buscando histórico...";

    try {
        const q = query(collection(db, 'logs'), where('registro_id', '==', id));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            container.innerHTML = "Nenhum histórico encontrado.";
            return;
        }

        let logs = [];
        snapshot.forEach(d => logs.push(d.data()));
        logs.sort((a,b) => (b.data?.seconds || 0) - (a.data?.seconds || 0));

        container.innerHTML = logs.map(l => {
            const d = l.data?.toDate ? l.data.toDate().toLocaleString() : '---';
            return `<div style="padding:10px; border-bottom:1px solid #eee;">
                <strong>${d}</strong> - ${l.usuario_nome || 'Sistema'}: ${l.descricao}
            </div>`;
        }).join('');
    } catch (e) { container.innerHTML = "Erro ao carregar histórico."; }
};

window.fecharModalLogs = () => document.getElementById('JANELA_LOGS_FINAL').style.display = 'none';

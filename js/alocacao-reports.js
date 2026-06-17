// alocacao-reports.js
import { db, doc, getDoc, getDocs, query, collection, where } from './firebase-config.js';

/**
 * Função utilitária para buscar staffs em lote de 30 IDs para performance máxima
 */
async function fetchStaffsByIds(staffIds) {
    const staffs = [];
    if (staffIds.length === 0) return staffs;
    
    // Batch fetch in chunks of 30 (Firestore limit for 'in' operator)
    for (let i = 0; i < staffIds.length; i += 30) {
        const chunk = staffIds.slice(i, i + 30);
        const qStaffs = query(collection(db, 'staffs'), where('__name__', 'in', chunk));
        const sSnap = await getDocs(qStaffs);
        sSnap.forEach(sd => staffs.push({ id: sd.id, ...sd.data() }));
    }
    return staffs;
}

/**
 * Gera o relatório de uniformes otimizado para papel
 */
export async function abrirImpressaoUniformes(treinamentoId, dataAlocacao) {
    const modal = document.getElementById('JANELA_IMPRESSAO_SISTEMA');
    const container = document.getElementById('CONTEUDO_IMPRESSAO_SISTEMA');
    const titulo = document.getElementById('titulo_janela_impressao');
    if (!modal || !container) return;

    modal.style.display = 'flex';
    titulo.innerText = "Relatório de Uniformes (Confirmados)";
    container.innerHTML = `<div style="padding:50px; text-align:center; color:#666;">
        <i class="fas fa-spinner fa-spin fa-3x"></i><br><br>
        Gerando grade administrativa de uniformes...
    </div>`;

    try {
        const dStart = new Date(dataAlocacao + 'T00:00:00');
        const dEnd = new Date(dataAlocacao + 'T23:59:59');

        const [docSnap, snapAloc] = await Promise.all([
            getDoc(doc(db, 'trainings', treinamentoId)),
            getDocs(query(collection(db, 'allocations'), 
                where('treinamento_id', '==', treinamentoId), 
                where('data_alocacao', '>=', dStart), 
                where('data_alocacao', '<=', dEnd)
            ))
        ]);
        
        const t = docSnap.data();
        const staffIds = [];
        snapAloc.forEach(d => {
            const data = d.data();
            if (data.status === 'confirmado') staffIds.push(data.staff_id);
        });

        // Buscar nomes dos staffs
        const staffsData = await fetchStaffsByIds(staffIds);
        staffsData.sort((a,b) => (a.nome_completo || "").localeCompare(b.nome_completo || ""));

        container.innerHTML = `
            <style>
                @media print {
                    @page { margin: 1cm; size: landscape; }
                    body * { visibility: hidden; }
                    #AREA_IMPRESSAO_SISTEMA_WRAP, #AREA_IMPRESSAO_SISTEMA_WRAP * { visibility: visible; }
                    #AREA_IMPRESSAO_SISTEMA_WRAP { position: absolute; left: 0; top: 0; width: 100%; border:none; }
                    .no-print { display: none !important; }
                    .spreadsheet-table { width: 100% !important; border-collapse: collapse !important; border: 2.5px solid #000 !important; }
                    .spreadsheet-table th, .spreadsheet-table td { border: 1.5px solid #000 !important; color: #000 !important; font-weight: bold; }
                    .spreadsheet-table th { background: #f2f2f2 !important; -webkit-print-color-adjust: exact; }
                }
                #AREA_IMPRESSAO_SISTEMA_WRAP { background: white; color: black; font-family: Arial, sans-serif; }
                .report-header-box { border: 3px solid #333; padding: 20px; margin-bottom: 20px; text-align: left; }
                .report-header-box h2 { margin: 0 0 10px 0; font-size: 22px; color: #000; border-bottom: 1px solid #333; padding-bottom: 10px; }
                .spreadsheet-table { width: 100%; border-collapse: collapse; border: 2px solid #333; }
                .spreadsheet-table th, .spreadsheet-table td { border: 1px solid #666; padding: 12px 5px; text-align: center; font-size: 11px; height: 55px; }
                .spreadsheet-table th { background: #f8fafc; color: #333; font-weight: 800; font-size: 10px; text-transform: uppercase; }
                .meta-fill-line { border-bottom: 1px solid #000; display: block; height: 16px; margin: 5px auto 0; width: 85%; }
            </style>
            <div id="AREA_IMPRESSAO_SISTEMA_WRAP">
                <div class="report-header-box">
                    <h2>RELAÇÃO PARA ENTREGA E DEVOLUÇÃO DE UNIFORMES</h2>
                    <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: bold;">
                        <span>EVENTO: ${t.nome_negocio}</span>
                        <span>DATA: ${dataAlocacao.split('-').reverse().join('/')}</span>
                    </div>
                </div>

                <table class="spreadsheet-table">
                    <thead>
                        <tr>
                            <th rowspan="4" style="width:30px;">#</th>
                            <th rowspan="4" style="text-align:left; width:220px; font-size:12px;">NOME DO FACILITADOR</th>
                            <th colspan="2">CAMISETA<br><span class="meta-fill-line"></span></th>
                            <th colspan="2">CAMI. MONTAGEM<br><span class="meta-fill-line"></span></th>
                            <th colspan="2">CALÇA<br><span class="meta-fill-line"></span></th>
                            <th colspan="2">AGASALHO<br><span class="meta-fill-line"></span></th>
                            <th colspan="2">OUTRO<br><span class="meta-fill-line"></span></th>
                            <th rowspan="4" style="width:130px;">ASSINATURA / OBS</th>
                        </tr>
                        <tr>
                            <th style="height:15px; font-size:9px;">RET</th><th style="height:15px; font-size:9px;">DEV</th>
                            <th style="height:15px; font-size:9px;">RET</th><th style="height:15px; font-size:9px;">DEV</th>
                            <th style="height:15px; font-size:9px;">RET</th><th style="height:15px; font-size:9px;">DEV</th>
                            <th style="height:15px; font-size:9px;">RET</th><th style="height:15px; font-size:9px;">DEV</th>
                            <th style="height:15px; font-size:9px;">RET</th><th style="height:15px; font-size:9px;">DEV</th>
                        </tr>
                        <tr>
                            <th style="height:12px;"></th><th style="height:12px;"></th>
                            <th style="height:12px;"></th><th style="height:12px;"></th>
                            <th style="height:12px;"></th><th style="height:12px;"></th>
                            <th style="height:12px;"></th><th style="height:12px;"></th>
                            <th style="height:12px;"></th><th style="height:12px;"></th>
                        </tr>
                        <tr>
                            <th style="height:12px;"></th><th style="height:12px;"></th>
                            <th style="height:12px;"></th><th style="height:12px;"></th>
                            <th style="height:12px;"></th><th style="height:12px;"></th>
                            <th style="height:12px;"></th><th style="height:12px;"></th>
                            <th style="height:12px;"></th><th style="height:12px;"></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${staffsData.map((s, i) => `
                            <tr>
                                <td>${i+1}</td>
                                <td style="text-align:left; font-weight:900; font-size:13px; text-transform: uppercase;">${s.nome_abreviado || s.nome_completo}</td>
                                <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
                            </tr>
                        `).join('')}
                        ${Array.from({length: 6}).map((_, j) => `
                            <tr>
                                <td>${staffsData.length + j + 1}</td>
                                <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div style="margin-top:20px; font-size:10px; color:#666; text-align:right;" class="no-print">
                    * Apenas staffs com status <strong>Confirmado</strong> são listados automaticamente.
                </div>
            </div>
        `;
    } catch (e) {
        console.error("Erro Relatório Uniformes:", e);
        container.innerHTML = `<div style="padding:40px; color:red; text-align:center;">
            Erro crítico ao gerar relatório.<br>${e.message}
        </div>`;
    }
}

/**
 * Gera a lista de facilitadores otimizada para papel
 */
export async function abrirListaFacilitadores(treinamentoId, dataAlocacao) {
    const modal = document.getElementById('JANELA_IMPRESSAO_SISTEMA');
    const container = document.getElementById('CONTEUDO_IMPRESSAO_SISTEMA');
    const titulo = document.getElementById('titulo_janela_impressao');
    if (!modal || !container) return;

    modal.style.display = 'flex';
    titulo.innerText = "Lista de Facilitadores (Confirmados)";
    container.innerHTML = `<div style="padding:50px; text-align:center; color:#666;">
        <i class="fas fa-spinner fa-spin fa-3x"></i><br><br>
        Buscando dados cadastrais dos facilitadores...
    </div>`;

    try {
        const dStart = new Date(dataAlocacao + 'T00:00:00');
        const dEnd = new Date(dataAlocacao + 'T23:59:59');

        const [docSnap, snapAloc] = await Promise.all([
            getDoc(doc(db, 'trainings', treinamentoId)),
            getDocs(query(collection(db, 'allocations'), 
                where('treinamento_id', '==', treinamentoId), 
                where('data_alocacao', '>=', dStart), 
                where('data_alocacao', '<=', dEnd)
            ))
        ]);
        
        const t = docSnap.data();
        const staffIds = [];
        snapAloc.forEach(d => {
            if (d.data().status === 'confirmado') staffIds.push(d.data().staff_id);
        });

        const staffs = await fetchStaffsByIds(staffIds);
        staffs.sort((a,b) => (a.nome_completo || "").localeCompare(b.nome_completo || ""));

        container.innerHTML = `
            <style>
                @media print {
                    @page { margin: 1cm; size: portrait; }
                    body * { visibility: hidden; }
                    #AREA_IMPRESSAO_LISTA_WRAP, #AREA_IMPRESSAO_LISTA_WRAP * { visibility: visible; }
                    #AREA_IMPRESSAO_LISTA_WRAP { position: absolute; left: 0; top: 0; width: 100%; border:none; }
                    .no-print { display: none !important; }
                    .spreadsheet-table { width: 100% !important; border-collapse: collapse !important; border: 2.5px solid #000 !important; }
                    .spreadsheet-table th, .spreadsheet-table td { border: 1.5px solid #000 !important; color: #000 !important; }
                    .spreadsheet-table th { background: #f2f2f2 !important; -webkit-print-color-adjust: exact; }
                }
                .report-header-box { border: 3px solid #333; padding: 20px; margin-bottom: 20px; text-align: left; background: #fff; }
                .report-header-box h2 { margin: 0 0 10px 0; font-size: 22px; color: #000; border-bottom: 1px solid #333; padding-bottom: 10px; }
                .spreadsheet-table { width: 100%; border-collapse: collapse; border: 2px solid #333; }
                .spreadsheet-table th, .spreadsheet-table td { border: 1px solid #666; padding: 15px 10px; text-align: left; font-size: 12px; height: 40px; }
                .spreadsheet-table th { background: #f1f5f9; font-weight: 800; text-transform: uppercase; }
            </style>
            <div id="AREA_IMPRESSAO_LISTA_WRAP" style="background: white; color: black; font-family: Arial, sans-serif;">
                <div class="report-header-box">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 15px;">
                        <h2 style="border:none; margin:0; padding:0;">LISTA DE FACILITADORES NORTHBRASIL</h2>
                        <div class="no-print" style="display:flex; gap:10px;">
                            <button class="btn-bento btn-bento-outline" style="font-size:11px;" onclick="window.alternarNomesRelatorio()"><i class="fas fa-sync"></i> ALTERAR NOMES</button>
                            <button class="btn-bento btn-bento-success" style="font-size:11px;" onclick="window.exportarListaExcel('${t.nome_negocio}')"><i class="fas fa-file-excel"></i> EXCEL</button>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: bold;">
                        <span>EVENTO: ${t.nome_negocio}</span>
                        <span>DATA: ${dataAlocacao.split('-').reverse().join('/')}</span>
                    </div>
                </div>

                <table class="spreadsheet-table" id="tabelaFacilitadoresReport">
                    <thead>
                        <tr>
                            <th style="width:40px;">#</th>
                            <th>NOME COMPLETO / ABREVIADO</th>
                            <th style="width:130px;">RG</th>
                            <th style="width:150px;">CPF</th>
                            <th style="width:130px;">DATA NASC.</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${staffs.map((s, i) => {
                            let dtNasc = '--';
                            if(s.dt_nascimento) {
                                if (typeof s.dt_nascimento === 'string') dtNasc = s.dt_nascimento.split('-').reverse().join('/');
                                else if (s.dt_nascimento.toDate) {
                                    const d = s.dt_nascimento.toDate();
                                    dtNasc = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
                                }
                            }
                            return `
                                <tr>
                                    <td>${i+1}</td>
                                    <td class="nome-cell-relatorio" data-full="${s.nome_completo}" data-short="${s.nome_abreviado || s.nome_completo}" style="font-weight:900; text-transform: uppercase;">${s.nome_abreviado || s.nome_completo}</td>
                                    <td>${s.rg || '--'}</td>
                                    <td>${s.cpf || '--'}</td>
                                    <td>${dtNasc}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (e) {
        console.error("Erro Lista Facilitadores:", e);
        container.innerHTML = `<div style="padding:40px; color:red; text-align:center;">Erro ao carregar lista.<br>${e.message}</div>`;
    }
}

// Vinculando ao window para facilitar acesso no HTML dinâmico
window.abrirImpressaoUniformes = abrirImpressaoUniformes;
window.abrirListaFacilitadores = abrirListaFacilitadores;
window.fecharModalImpressao = () => document.getElementById('JANELA_IMPRESSAO_SISTEMA').style.display = 'none';

window.imprimirConteudoTabela = () => {
    window.focus(); 
    window.print();
};

window.alternarNomesRelatorio = function() {
    document.querySelectorAll('.nome-cell-relatorio').forEach(c => {
        c.textContent = (c.textContent === c.dataset.short) ? c.dataset.full : c.dataset.short;
    });
};

window.exportarListaExcel = function(nomeEvento) {
    if (typeof XLSX === 'undefined') {
        const sc = document.createElement('script');
        sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        sc.onload = () => {
            const table = document.getElementById('tabelaFacilitadoresReport');
            const wb = XLSX.utils.table_to_book(table);
            XLSX.writeFile(wb, `Lista_Staffs_${nomeEvento}.xlsx`);
        };
        document.head.appendChild(sc);
    } else {
        const table = document.getElementById('tabelaFacilitadoresReport');
        const wb = XLSX.utils.table_to_book(table);
        XLSX.writeFile(wb, `Lista_Staffs_${nomeEvento}.xlsx`);
    }
};

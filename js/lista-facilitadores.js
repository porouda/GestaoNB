// lista-facilitadores.js

window.abrirListaFacilitadores = async function(treinamentoId, dataAlocacao) {
    console.log("Iniciando abertura de Facilitadores para Excel/Impressão...");

    const modal = document.getElementById('JANELA_IMPRESSAO_SISTEMA');
    const container = document.getElementById('CONTEUDO_IMPRESSAO_SISTEMA');
    const titulo = document.getElementById('titulo_janela_impressao');

    if (!modal) {
        alert("Erro: Container de impressão não encontrado.");
        return;
    }

    // Garante que o modal esteja na raiz do body para evitar cortes de CSS
    document.body.appendChild(modal);
    modal.style.cssText = "display: flex !important; position: fixed !important; z-index: 2147483647 !important; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); visibility: visible !important; opacity: 1 !important;";
    
    container.innerHTML = "<div style='text-align:center; padding:50px;'><h3>Carregando dados...</h3></div>";
    titulo.innerText = "Lista de Facilitadores";

    try {
        const responseTreinamento = await fetch(`api/buscar-treinamento.php?id=${treinamentoId}`);
        const treinamento = await responseTreinamento.json();

        const responseAlocacoes = await fetch(`api/listar-alocacoes.php?treinamento_id=${treinamentoId}&data=${dataAlocacao}`);
        const alocacoes = await responseAlocacoes.json();

        const staffsAlocados = alocacoes.filter(alocacao => alocacao.status == 'confirmado');
        const staffsCompletos = await Promise.all(
            staffsAlocados.map(async (alocado) => {
                const response = await fetch(`api/buscar-staff.php?id=${alocado.staff_id}`);
                return await response.json();
            })
        );

        const dataFormatada = dataAlocacao.split('-').reverse().join('/');

        // Construção do HTML interno do modal
        const htmlContent = `
            <style>
                .print-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-family: sans-serif; color: #000; }
                .print-table th, .print-table td { border: 1px solid #000; padding: 10px; text-align: left; }
                .print-table th { background-color: #f2f2f2; font-weight: bold; }
                .report-info-box { margin-bottom: 20px; font-family: sans-serif; }
                @media print { .no-print { display: none !important; } }
            </style>

            <div class="report-info-box">
                <h2 style="text-align:center; margin-bottom:15px;">LISTA DE FACILITADORES NORTHBRASIL</h2>
                <p><strong>EVENTO:</strong> ${treinamento.nome_negocio}</p>
                <p><strong>DATA:</strong> ${dataFormatada}</p>
                <p><strong>LOCAL:</strong> ${treinamento.local_evento}, ${treinamento.cidade}</p>
            </div>

            <table class="print-table" id="tabelaFacilitadoresExport">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Nome</th>
                        <th>RG</th>
                        <th>CPF</th>
                        <th>Data de Nascimento</th>
                    </tr>
                </thead>
                <tbody>
                    ${staffsCompletos.map((staff, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td class="nome-cell" data-full="${staff.nome_completo}" data-short="${staff.nome_abreviado}">${staff.nome_abreviado}</td>
                            <td>${staff.rg || ''}</td>
                            <td>${staff.cpf || ''}</td>
                            <td>${staff.dt_nascimento ? staff.dt_nascimento.split('-').reverse().join('/') : ''}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="no-print" style="margin-top:30px; display:flex; gap:15px; justify-content:center;">
                <button onclick="alternarNomes()" style="padding:12px 20px; cursor:pointer; background:#f39c12; color:white; border:none; border-radius:6px; font-weight:bold;">
                    <i class="fas fa-sync"></i> Alternar Nome Completo/Abreviado
                </button>
                <button onclick="window.exportarParaExcel('${treinamento.nome_negocio.replace(/[^a-z0-9]/gi, '_')}')" style="padding:12px 20px; cursor:pointer; background:#27ae60; color:white; border:none; border-radius:6px; font-weight:bold;">
                    <i class="fas fa-file-excel"></i> Exportar para Excel
                </button>
            </div>
        `;

        container.innerHTML = htmlContent;

    } catch (error) {
        console.error('Erro ao gerar lista:', error);
        container.innerHTML = "<div style='color:red; text-align:center; padding:50px;'>Erro ao carregar os dados.</div>";
    }
};

// --- FUNÇÃO DE EXPORTAÇÃO CORRIGIDA ---
window.exportarParaExcel = function(nomeArquivo) {
    console.log("Iniciando exportação para Excel...");

    // 1. Verifica se a biblioteca XLSX está carregada, se não, carrega na hora
    if (typeof XLSX === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        script.onload = () => processarPlanilha(nomeArquivo);
        document.head.appendChild(script);
    } else {
        processarPlanilha(nomeArquivo);
    }
};

function processarPlanilha(nomeArquivo) {
    try {
        const table = document.getElementById('tabelaFacilitadoresExport');
        if (!table) {
            alert("Tabela não encontrada para exportação.");
            return;
        }

        // Converte a tabela HTML em um objeto de planilha
        const wb = XLSX.utils.table_to_book(table, { sheet: "Facilitadores" });

        // Gera o arquivo e inicia o download
        const dataHoje = new Date().toISOString().slice(0,10);
        XLSX.writeFile(wb, `Lista_${nomeArquivo}_${dataHoje}.xlsx`);
        
        console.log("Excel gerado com sucesso!");
    } catch (e) {
        console.error("Erro no SheetJS:", e);
        alert("Erro ao gerar o arquivo Excel.");
    }
}

// Auxiliares Globais
window.alternarNomes = function() {
    document.querySelectorAll('.nome-cell').forEach(c => {
        c.textContent = (c.textContent === c.dataset.short) ? c.dataset.full : c.dataset.short;
    });
};

window.fecharModalImpressao = function() {
    const modal = document.getElementById('JANELA_IMPRESSAO_SISTEMA');
    if (modal) modal.style.setProperty('display', 'none', 'important');
};
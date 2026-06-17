// impressao-uniformes.js

window.abrirImpressaoUniformes = async function(treinamentoId, dataAlocacao) {
    console.log("CLIQUE DETECTADO: Abrindo Uniformes", {treinamentoId, dataAlocacao});

    const modal = document.getElementById('JANELA_IMPRESSAO_SISTEMA');
    const container = document.getElementById('CONTEUDO_IMPRESSAO_SISTEMA');
    const titulo = document.getElementById('titulo_janela_impressao');

    if (!modal) return;

    document.body.appendChild(modal);
    modal.style.cssText = "display: flex !important; position: fixed !important; z-index: 2147483647 !important; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); visibility: visible !important; opacity: 1 !important;";
    
    container.innerHTML = "<div style='text-align:center; padding:50px;'><h3>Carregando...</h3></div>";
    titulo.innerText = "Relação de Uniformes";

    try {
        const [treinamento, alocacoes] = await Promise.all([
            fetch(`api/buscar-treinamento.php?id=${treinamentoId}`).then(r => r.json()),
            fetch(`api/listar-alocacoes-uniformes.php?treinamento_id=${treinamentoId}&data=${dataAlocacao}`).then(r => r.json())
        ]);

        const dataFormatada = dataAlocacao.split('-').reverse().join('/');

        const htmlContent = `
            <style>
                .u-table { width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 12px; }
                .u-table th, .u-table td { border: 1px solid #000; padding: 5px; text-align: center; }
                .u-table th { background: #f0f0f0; }
            </style>
            <div style="text-align:center; margin-bottom:20px; font-family:sans-serif;">
                <h3>RELAÇÃO DE ENTREGA DE UNIFORMES</h3>
                <p>Evento: ${treinamento.nome_negocio} | Data: ${dataFormatada}</p>
            </div>
            <table class="u-table">
                <thead>
                    <tr><th>#</th><th>Nome</th><th colspan="2">Camiseta</th><th colspan="2">Calça</th><th colspan="2">Agasalho</th><th>Obs</th></tr>
                    <tr><th></th><th></th><th>ret</th><th>dev</th><th>ret</th><th>dev</th><th>ret</th><th>dev</th><th></th></tr>
                </thead>
                <tbody>
                    ${alocacoes.map((a, i) => `<tr><td>${i+1}</td><td style="text-align:left;">${a.nome_staff}</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`).join('')}
                    <tr><td style="height:25px;"></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                </tbody>
            </table>
        `;
        container.innerHTML = htmlContent;
    } catch (e) {
        container.innerHTML = "Erro ao carregar.";
    }
}
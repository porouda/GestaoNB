// Função para carregar dados do treinamento e staffs alocados
async function carregarDadosImpressao(treinamentoId, dataAlocacao) {
    try {
        // Carrega os dados do treinamento
        const responseTreinamento = await fetch(`api/buscar-treinamento.php?id=${treinamentoId}`);
        const treinamento = await responseTreinamento.json();

        // Carrega os staffs alocados para o treinamento na data especificada
        const responseAlocacoes = await fetch(`api/listar-alocacoes-uniformes.php?treinamento_id=${treinamentoId}&data=${dataAlocacao}`);
        const alocacoes = await responseAlocacoes.json();

        // Preenche os dados do cabeçalho
        document.getElementById('dataEvento').textContent = treinamento.data_evento || '';
        document.getElementById('localEvento').textContent = `${treinamento.local_evento}, ${treinamento.cidade}` || '';
        document.getElementById('nomeNegocio').textContent = treinamento.nome_negocio || '';
        document.getElementById('programaNb').textContent = treinamento.programa_nb || '';

        // Preenche a tabela com os staffs alocados
        const tbody = document.getElementById('uniformeTableBody');
        tbody.innerHTML = '';

        alocacoes.forEach((alocacao, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${alocacao.nome_staff || ''}</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Erro ao carregar dados para impressão:', error);
    }
}

// Função para inicializar a página de impressão
function initImpressao() {
    const urlParams = new URLSearchParams(window.location.search);
    const treinamentoId = urlParams.get('treinamento_id');
    const dataAlocacao = urlParams.get('data');

    if (treinamentoId && dataAlocacao) {
        carregarDadosImpressao(treinamentoId, dataAlocacao);
    } else {
        console.error('Parâmetros de treinamento ou data ausentes');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initImpressao();
});
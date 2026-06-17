// Função para carregar treinamentos do backend
async function carregarTreinamentos(filtroEtapa = '', busca = '') {
    try {
        // Codifica os parâmetros para URL
        const params = new URLSearchParams();
        if (filtroEtapa) params.append('etapa', filtroEtapa);
        if (busca) params.append('busca', busca);

        const response = await fetch(`api/listar-treinamentos.php?${params}`);
        const treinamentos = await response.json();

        const tbody = document.getElementById('treinamentoTableBody');
        tbody.innerHTML = '';

        treinamentos.forEach(treinamento => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${treinamento.nome_negocio || ''}</td>
                <td>${treinamento.etapa || ''}</td>
                <td>${treinamento.programa_nb || ''}</td>
                <td>${treinamento.data_evento || ''}</td>
                <td>${treinamento.local_evento || ''}</td>
                <td>${treinamento.cidade || ''}</td>
            `;
            row.addEventListener('click', () => {
                window.location.href = `cadastro-treinamentos.html?id=${treinamento.id}`;
            });
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Erro ao carregar treinamentos:', error);
    }
}
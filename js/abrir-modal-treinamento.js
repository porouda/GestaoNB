// Função para abrir o modal e carregar os dados
async function abrirModalTreinamento(id) {
    try {
        // Busca os dados do treinamento específico
        const response = await fetch(`api/buscar-treinamento.php?id=${id}`);
        const t = await response.json();

        // Preenche o formulário do modal
        document.getElementById('modalTreinamentoId').value = t.id;
        document.getElementById('modalNomeNegocio').value = t.nome_negocio || '';
        document.getElementById('modalEtapa').value = t.etapa || '';
        document.getElementById('modalProgramaNb').value = t.programa_nb || '';
        document.getElementById('modalDataEvento').value = t.data_evento || '';
        document.getElementById('modalParticipantes').value = t.participantes || 0;
        document.getElementById('modalLocalEvento').value = t.local_evento || '';
        document.getElementById('modalCidade').value = t.cidade || '';
        document.getElementById('modalObservacoes').value = t.observacoes || '';

        // Mostra o modal
        document.getElementById('modalTreinamento').style.display = 'flex';
    } catch (error) {
        console.error("Erro ao carregar dados do treinamento:", error);
        alert("Erro ao carregar dados para edição.");
    }
}

function fecharModalTreinamento() {
    document.getElementById('modalTreinamento').style.display = 'none';
}

// Manipular o envio do formulário do modal
document.getElementById('treinamentoFormModal').addEventListener('submit', async function(e) {
    e.preventDefault();

    const formData = new FormData(this);
    const dados = Object.fromEntries(formData.entries());

    try {
        // Aqui chamamos o seu PHP original de salvar treinamento
        const response = await fetch('api/salvar-treinamento.php', {
            method: 'POST',
            body: JSON.stringify(dados),
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();

        if (result.status === 'success') {
            fecharModalTreinamento();
            // ATUALIZAÇÃO EM TEMPO REAL: 
            // Recarrega as colunas da data atual para refletir as mudanças (Nome, PAX, etc)
            if (typeof loadTreinamentosForDate === 'function') {
                loadTreinamentosForDate(window.dataSelecionada);
            }
        } else {
            alert("Erro ao salvar: " + result.message);
        }
    } catch (error) {
        console.error("Erro ao salvar treinamento:", error);
    }
});
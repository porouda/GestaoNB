// Função para obter a data atual no formato YYYY-MM-DD
function getCurrentDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Função para ordenar staffs disponíveis em ordem alfabética
function ordenarStaffsDisponiveis() {
    const container = document.getElementById('staffsContainer');
    const staffs = Array.from(container.children);
    
    staffs.sort((a, b) => {
        const nomeA = a.textContent.trim().toLowerCase();
        const nomeB = b.textContent.trim().toLowerCase();
        return nomeA.localeCompare(nomeB);
    });
    
    container.innerHTML = '';
    staffs.forEach(staff => container.appendChild(staff));
}

// Exporta funções para serem usadas em outros arquivos
window.ordenarStaffsDisponiveis = ordenarStaffsDisponiveis;
import { loadStaffs, loadTreinamentosForDate } from './alocacao-load.js';
import { initDragDrop } from './alocacao-dragdrop.js';
import { initTouchSupport } from './alocacao-touch.js';

// Importa para garantir que os scripts de UI e Modais executem e registrem funções no 'window'
import './alocacao-ui.js';
import './alocacao-modal-treinamento.js';

// alocacao-init.js

// Exposição global imediata para evitar problemas com outros scripts (como mini-calendario)
window.loadStaffs = loadStaffs;
window.loadTreinamentosForDate = loadTreinamentosForDate;

export function initAlocacao() {
    console.log("Iniciando scripts de alocação (Modular)...");
    
    // 1. Carregar lista de staffs disponíveis
    loadStaffs();
    
    // 2. Ativar interações
    initDragDrop();
    initTouchSupport();

    // 3. Carregar treinamentos de hoje por padrão
    const hoje = new Date();
    const dateStrToday = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    loadTreinamentosForDate(dateStrToday);
    
    // 4. Integrar com o Mini Calendário se ele existir
    // Usamos um pequeno timeout para garantir que o mini-calendario.js (que corre como módulo paralelo)
    // já tenha registrado suas funções no window
    setTimeout(() => {
        if (typeof window.generateCalendar === 'function') {
            console.log("Executando a geração do mini-calendário...");
            window.generateCalendar();
        } else {
            console.warn("window.generateCalendar ainda não está disponível.");
        }
    }, 100);
}

// Inicialização automática robusta: verifica se o DOM já está pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAlocacao);
} else {
    // Se já estiver pronto (o que ocorre em modules), damos um micro-delay
    setTimeout(initAlocacao, 0);
}

// Exposição global da função de inicialização
window.initAlocacao = initAlocacao;


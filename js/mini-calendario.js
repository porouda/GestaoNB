import { db, collection, query, where, getDocs, onSnapshot, handleFirestoreError } from './firebase-config.js';

// Variáveis para controle do calendário
let mesAtual = new Date().getMonth();
let anoAtual = new Date().getFullYear();
let treinamentosCache = {}; 
let unsubscribeTrainings = null;

// Função para carregar treinamentos via Snapshot para performance instantânea
function iniciarMonitoramentoCalendario() {
    console.log("Iniciando monitoramento de treinamentos para o calendário...");
    
    // Monitors a wide range to avoid frequent re-fetches during navigation
    // Let's monitor from previous month to 6 months ahead
    const startDate = new Date(anoAtual, mesAtual - 1, 1);
    const endDate = new Date(anoAtual, mesAtual + 6, 0);

    if (unsubscribeTrainings) unsubscribeTrainings();

    // Query mais simples para evitar necessidade de índices compostos complexos no Firestore
    const q = query(collection(db, 'trainings'), 
        where('data_evento', '>=', startDate),
        where('data_evento', '<=', endDate)
    );

    console.time('Calendar Snapshot Initial Load');
    unsubscribeTrainings = onSnapshot(q, (snapshot) => {
        treinamentosCache = {};
        snapshot.forEach(docSnap => {
            const t = docSnap.data();
            
            // Filtro em memória para garantir compatibilidade sem índices extras
            if (!['Confirmado', 'Realizado'].includes(t.etapa)) return;

            const dateValue = t.data_evento;
            let dateStr = "";

            if (dateValue && typeof dateValue.toDate === 'function') {
                const d = dateValue.toDate();
                // Use local date to avoid timezone shift from ISO UTC
                const ano = d.getFullYear();
                const mes = String(d.getMonth() + 1).padStart(2, '0');
                const dia = String(d.getDate()).padStart(2, '0');
                dateStr = `${ano}-${mes}-${dia}`;
            } else if (dateValue instanceof Date) {
                const ano = dateValue.getFullYear();
                const mes = String(dateValue.getMonth() + 1).padStart(2, '0');
                const dia = String(dateValue.getDate()).padStart(2, '0');
                dateStr = `${ano}-${mes}-${dia}`;
            } else if (typeof dateValue === 'string') {
                dateStr = dateValue;
            }

            if (dateStr && dateStr.length >= 10) {
                const pureDate = dateStr.substring(0, 10);
                treinamentosCache[pureDate] = (treinamentosCache[pureDate] || 0) + 1;
            }
        });

        console.log('Cache do calendário atualizado via Snapshot. Itens:', snapshot.size);
        console.timeEnd('Calendar Snapshot Initial Load');
        renderMonths(document.getElementById('calendarContainer'));
    }, (error) => {
        handleFirestoreError(error, 'LIST', 'trainings-calendar');
    });
}

// Atualizar o título do mês com a contagem (Agora síncrona usando o cache)
function atualizarContagemTituloMes(ano, mes) {
    const mesPad = String(mes + 1).padStart(2, '0');
    const mesFormatado = `${ano}-${mesPad}`;
    
    const count = Object.keys(treinamentosCache)
        .filter(date => date.startsWith(mesFormatado))
        .reduce((sum, date) => sum + treinamentosCache[date], 0);

    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const tituloComContagem = `${monthNames[mes]} (${count})`;

    const selector = `h4[data-mes-ano="${mesFormatado}"]`;
    const tituloAlvo = document.querySelector(selector);
    if (tituloAlvo) tituloAlvo.textContent = tituloComContagem;
}

// Função para gerar mini calendário de 3 meses com navegação
function generateCalendar() {
    const calendarContainer = document.getElementById('calendarContainer');
    if (!calendarContainer) return;
    calendarContainer.innerHTML = '';
    
    const navContainer = document.createElement('div');
    navContainer.classList.add('calendar-nav');

    const prevBtn = document.createElement('button');
    prevBtn.classList.add('calendar-nav-btn', 'prev-btn');
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>'; 
    prevBtn.title = "Mês Anterior";
    prevBtn.addEventListener('click', () => {
        mesAtual--;
        if (mesAtual < 0) {
            mesAtual = 11;
            anoAtual--;
        }
        updateCalendarDisplay();
    });

    const nextBtn = document.createElement('button');
    nextBtn.classList.add('calendar-nav-btn', 'next-btn');
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>'; 
    nextBtn.title = "Próximo Mês";
    nextBtn.addEventListener('click', () => {
        mesAtual++;
        if (mesAtual > 11) {
            mesAtual = 0;
            anoAtual++;
        }
        updateCalendarDisplay();
    });

    const currentBtn = document.createElement('button');
    currentBtn.classList.add('calendar-today-btn');
    
    currentBtn.innerHTML = '<i class="fas fa-clock"></i> Hoje';
    
    currentBtn.addEventListener('click', () => {
        const agora = new Date();
        mesAtual = agora.getMonth();
        anoAtual = agora.getFullYear();
        updateCalendarDisplay();

        const dateStrToday = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
        
        if (typeof window.loadTreinamentosForDate === 'function') {
            window.loadTreinamentosForDate(dateStrToday);
        }
    });

    navContainer.appendChild(prevBtn);
    navContainer.appendChild(currentBtn);
    navContainer.appendChild(nextBtn);
    calendarContainer.appendChild(navContainer);

    updateCalendarDisplay();
}

function renderMonths(container) {
    const oldContainer = container.querySelector('.calendar-months-container');
    if (oldContainer) oldContainer.remove();

    const monthsContainer = document.createElement('div');
    monthsContainer.classList.add('calendar-months-container');

    for (let i = 0; i < 2; i++) {
        const monthDate = new Date(anoAtual, mesAtual + i, 1);
        const monthDiv = createMonthElement(monthDate);
        monthsContainer.appendChild(monthDiv);
    }

    container.appendChild(monthsContainer);
}

function createMonthElement(month) {
    const monthDiv = document.createElement('div');
    monthDiv.classList.add('calendar-month');
    
    const monthTitle = document.createElement('h4');
    const mesAnoId = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
    monthTitle.dataset.mesAno = mesAnoId;
    monthTitle.textContent = month.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

    monthDiv.appendChild(monthTitle);

    setTimeout(() => {
        atualizarContagemTituloMes(month.getFullYear(), month.getMonth());
    }, 0);

    const daysDiv = document.createElement('div');
    daysDiv.classList.add('calendar-days');

    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    weekDays.forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.classList.add('calendar-day', 'week-day');
        dayElement.textContent = day;
        daysDiv.appendChild(dayElement);
    });

    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const startDay = firstDay.getDay();

    for (let j = 0; j < startDay; j++) {
        const emptyDay = document.createElement('div');
        emptyDay.classList.add('calendar-day', 'empty');
        daysDiv.appendChild(emptyDay);
    }

    const hojeStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('calendar-day');
        dayElement.textContent = day;

        const dateStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        if (dateStr === hojeStr) {
            dayElement.classList.add('today-highlight');
        }

        if (treinamentosCache[dateStr] && treinamentosCache[dateStr] > 0) {
            dayElement.classList.add(`has-${Math.min(treinamentosCache[dateStr], 3)}`);
        }

        dayElement.addEventListener('click', () => {
            document.querySelectorAll('.calendar-day.selected').forEach(el => el.classList.remove('selected'));
            dayElement.classList.add('selected');

            if (typeof window.loadTreinamentosForDate === 'function') {
                window.loadTreinamentosForDate(dateStr);
            }
        });

        daysDiv.appendChild(dayElement);
    }

    monthDiv.appendChild(daysDiv);
    return monthDiv;
}

function updateCalendarDisplay() {
    const calendarContainer = document.getElementById('calendarContainer');
    if (!calendarContainer) return;
    
    // Renderiza a estrutura básica IMEDIATAMENTE antes do snapshot chegar
    // Isso garante que o componente não fique "invisível" enquanto carrega
    renderMonths(calendarContainer);

    if (!unsubscribeTrainings) {
        iniciarMonitoramentoCalendario();
    }
}

// Nota: Deixamos o controle da inicialização para o alocacao-init.js
// para evitar duplicidade de chamadas e garantir que as dependências globais existam.

window.generateCalendar = generateCalendar;
window.updateCalendarDisplay = updateCalendarDisplay;

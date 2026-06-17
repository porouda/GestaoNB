import { db, collection, query, where, onSnapshot, handleFirestoreError, formatarDataParaInput } from './firebase-config.js';

let treinamentos = [];

function generateCalendario() {
    const today = new Date();
    const firstDay = new Date(today);
    firstDay.setDate(today.getDate() - today.getDay());

    for (let semana = 0; semana < 4; semana++) {
        const semanaElement = document.getElementById(`semana${semana + 1}`);
        if (!semanaElement) continue;
        semanaElement.innerHTML = '';

        const semanaInicio = new Date(firstDay);
        semanaInicio.setDate(firstDay.getDate() + (semana * 7));

        for (let dia = 0; dia < 7; dia++) {
            const dataDia = new Date(semanaInicio);
            dataDia.setDate(semanaInicio.getDate() + dia);
            const dataStr = `${dataDia.getFullYear()}-${String(dataDia.getMonth() + 1).padStart(2, '0')}-${String(dataDia.getDate()).padStart(2, '0')}`;

            const diaElement = document.createElement('div');
            diaElement.classList.add('dia-calendario');

            const diaTitulo = document.createElement('div');
            diaTitulo.classList.add('dia-titulo');
            diaTitulo.textContent = `${dataDia.getDate()}/${dataDia.getMonth() + 1}`;
            diaElement.appendChild(diaTitulo);

            const treinamentosDoDia = treinamentos.filter(t => {
                const rawData = t.dataEvento || t.data_evento;
                const data = formatarDataParaInput(rawData);
                return data === dataStr;
            });
            treinamentosDoDia.forEach(t => {
                const item = document.createElement('div');
                item.classList.add('treinamento-item');
                const nome = t.nomeNegocio || t.nome_negocio || 'Evento';
                const programa = t.programaNb || t.programa_nb || '';
                item.innerHTML = `
                    <div><strong>${nome}</strong></div>
                    <div>${programa}</div>
                `;
                item.onclick = () => window.location.href = `cadastro-treinamentos.html?id=${t.id}`;
                diaElement.appendChild(item);
            });

            semanaElement.appendChild(diaElement);
        }
    }
}

function iniciarMonitoramentoTreinamentos() {
    onSnapshot(collection(db, 'trainings'), (snapshot) => {
        treinamentos = [];
        snapshot.forEach(doc => treinamentos.push({ id: doc.id, ...doc.data() }));
        generateCalendario();
    }, (error) => handleFirestoreError(error, 'LIST', 'trainings'));
}

document.addEventListener('DOMContentLoaded', () => {
    iniciarMonitoramentoTreinamentos();
});

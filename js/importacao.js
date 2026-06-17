import { db, collection, addDoc, doc, updateDoc, getDocs, query, where } from './firebase-config.js';

// Função para converter data do Excel para YYYY-MM-DD (corrigido)
function converterDataExcel(dataExcel) {
    if (!dataExcel) return '';
    // Verifica se é um número (formato serial do Excel)
    if (typeof dataExcel === 'number') {
        const data = new Date((dataExcel - 25569) * 86400000); 
        const ano = data.getUTCFullYear();
        const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
        const dia = String(data.getUTCDate()).padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
    }
    
    if (typeof dataExcel === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dataExcel)) {
        return dataExcel;
    }
    
    if (typeof dataExcel === 'string') {
        const partes = dataExcel.split(/[\/\-]/);
        if (partes.length === 3) {
            const d = partes[0].padStart(2, '0');
            const m = partes[1].padStart(2, '0');
            const a = partes[2].length === 2 ? '20' + partes[2] : partes[2];
            return `${a}-${m}-${d}`;
        }
    }
    return dataExcel;
}

let dadosExcel = [];

// Função para carregar o arquivo Excel
function carregarArquivoExcel(arquivo) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                
                // Mapeia para camelCase (padrão do sistema)
                const dadosConvertidos = jsonData.map(row => ({
                    externalId: row['ID do registro'] || row['ID'] || row['id'] || null,
                    nomeNegocio: row['Nome do negócio'] || row['Nome do Negócio'] || row['nome_negocio'] || '',
                    etapa: row['Etapa do negócio'] || row['Etapa'] || row['etapa'] || '',
                    programaNb: row['Programa NB Principal'] || row['Programa NB'] || row['programa_nb'] || '',
                    dataEvento: converterDataExcel(row['Data do Evento']),
                    participantes: row['Participantes'] || row['participantes'] || '',
                    localEvento: row['Local do Evento'] || row['local_evento'] || row['Local Evento'] || row['Local'] || '',
                    cidade: row['Cidade'] || row['cidade'] || '',
                    contatos: row['Associated Contact'] || row['Contatos'] || row['contatos'] || row['Contatos Associados'] || '',
                    observacoes: row['Observações'] || row['observacoes'] || row['Observacoes'] || ''
                }));
                resolve(dadosConvertidos);
            } catch (error) { reject(error); }
        };
        reader.onerror = () => reject(new Error('Erro ao ler o arquivo'));
        reader.readAsArrayBuffer(arquivo);
    });
}

// Função para importar dados para o Firestore (Substituindo PHP)
async function importarDados() {
    const progressArea = document.getElementById('progressArea');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const resultsArea = document.getElementById('resultsArea');
    const resultsContent = document.getElementById('resultsContent');

    if (dadosExcel.length === 0) {
        alert('Nenhum dado para importar!');
        return;
    }

    progressArea.style.display = 'block';
    resultsArea.style.display = 'none';

    let sucesso = 0;
    let atualizacoes = 0;
    let falhas = 0;
    const erros = [];

    const total = dadosExcel.length;

    for (let i = 0; i < total; i++) {
        const item = dadosExcel[i];
        try {
            // Tenta encontrar por externalId ou nomeNegocio + dataEvento para evitar duplicidade
            let docId = null;
            if (item.externalId) {
                const q = query(collection(db, 'trainings'), where('externalId', '==', item.externalId));
                const snap = await getDocs(q);
                if (!snap.empty) docId = snap.docs[0].id;
            }

            if (docId) {
                await updateDoc(doc(db, 'trainings', docId), item);
                atualizacoes++;
            } else {
                await addDoc(collection(db, 'trainings'), item);
                sucesso++;
            }
        } catch (error) {
            console.error('Erro no item:', item, error);
            falhas++;
            erros.push(`${item.nomeNegocio || 'Sem nome'}: ${error.message}`);
        }

        const pct = Math.round(((i + 1) / total) * 100);
        progressFill.style.width = `${pct}%`;
        progressText.textContent = `${pct}% (${i + 1}/${total})`;
    }

    progressArea.style.display = 'none';
    resultsArea.style.display = 'block';

    resultsContent.innerHTML = `
        <div class="import-result import-success"><strong>Sucesso:</strong> ${sucesso} registros criados</div>
        <div class="import-result import-warning"><strong>Atualizações:</strong> ${atualizacoes} registros atualizados</div>
        <div class="import-result import-error"><strong>Falhas:</strong> ${falhas} registros com erro</div>
        ${erros.length > 0 ? `<div class="import-result import-error"><strong>Erros sugeridos:</strong><ul>${erros.slice(0, 5).map(e => `<li>${e}</li>`).join('')}${erros.length > 5 ? '<li>...</li>' : ''}</ul></div>` : ''}
    `;
}

// Função para inicializar a página de importação
function initImportacao() {
    const uploadArea = document.getElementById('uploadArea');
    const excelFile = document.getElementById('excelFile');
    const importBtn = document.getElementById('importBtn');

    // Evento de clique na área de upload
    uploadArea.addEventListener('click', () => {
        excelFile.click();
    });

    // Evento de arrastar e soltar
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#2ecc71';
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#ccc';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#ccc';

        const arquivo = e.dataTransfer.files[0];
        if (arquivo && (arquivo.name.endsWith('.xlsx') || arquivo.name.endsWith('.xls'))) {
            processarArquivo(arquivo);
        } else {
            alert('Por favor, selecione um arquivo Excel (.xlsx ou .xls)');
        }
    });

    // Evento de seleção de arquivo
    excelFile.addEventListener('change', async (e) => {
        const arquivo = e.target.files[0];
        if (arquivo) {
            try {
                dadosExcel = await carregarArquivoExcel(arquivo);
                
                alert(`Arquivo carregado com sucesso!\n${dadosExcel.length} registros encontrados.`);
                
                // Exibe o botão de importação
                document.getElementById('importBtn').style.display = 'block';
            } catch (error) {
                console.error('Erro ao processar arquivo:', error);
                alert('Erro ao processar o arquivo Excel. Verifique o formato e tente novamente.');
            }
        }
    });

    // Evento de clique no botão de importar
    importBtn.addEventListener('click', () => {
        importarDados();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initImportacao();
});
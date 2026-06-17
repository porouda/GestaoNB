import { db, collection, onSnapshot, doc, getDoc, addDoc, updateDoc, query, where, serverTimestamp, handleFirestoreError, formatarDataParaExibicao, formatarDataParaInput } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchProduto');
    const estoqueLista = document.getElementById('estoque-lista');
    const statTotal = document.getElementById('stat-total-itens');
    const statAlerta = document.getElementById('stat-alerta-estoque');

    let produtos = [];
    let mostrarApenasBaixo = false;

    // Função para carregar produtos com onSnapshot (Real-time)
    function iniciarMonitoramentoProdutos() {
        const q = collection(db, 'inventory');
        onSnapshot(q, (snapshot) => {
            produtos = [];
            snapshot.forEach(doc => {
                produtos.push({ id: doc.id, ...doc.data() });
            });
            // Ordenação Alfabética Global
            produtos.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

            atualizarEstatisticas(produtos);
            aplicarFiltros();
        }, (error) => handleFirestoreError(error, 'LIST', 'inventory'));
    }

    function atualizarEstatisticas(lista) {
        if (statTotal) {
            statTotal.textContent = lista.length;
            const pillTotal = statTotal.closest('.stat-pill');
            if (pillTotal) {
                pillTotal.style.cursor = 'pointer';
                pillTotal.title = "Clique para ver todos os itens";
                if (!pillTotal.onclick) {
                    pillTotal.onclick = () => {
                        mostrarApenasBaixo = false;
                        resetarVisualPills();
                        aplicarFiltros();
                    };
                }
            }
        }

        if (statAlerta) {
            const baixos = lista.filter(p => p.quantidade < p.quantidade_minima).length;
            statAlerta.textContent = baixos;
            
            // Adiciona classe de alerta se houver itens baixos
            const statPillAlerta = statAlerta.closest('.stat-pill');
            if (statPillAlerta) {
                if (baixos > 0) {
                    statPillAlerta.classList.add('alerta');
                    statPillAlerta.style.cursor = 'pointer';
                    statPillAlerta.title = "Clique para filtrar itens em alerta";
                    
                    // Listener para o filtro (apenas se houver itens baixos)
                    if (!statPillAlerta.onclick) {
                        statPillAlerta.onclick = () => {
                            mostrarApenasBaixo = !mostrarApenasBaixo;
                            atualizarVisualFiltro();
                            aplicarFiltros();
                        };
                    }
                } else {
                    statPillAlerta.classList.remove('alerta');
                    statPillAlerta.style.cursor = 'default';
                    statPillAlerta.style.background = '';
                    statPillAlerta.style.borderColor = '';
                    statPillAlerta.onclick = null;
                    mostrarApenasBaixo = false;
                }
            }
        }
        atualizarVisualFiltro();
    }

    function resetarVisualPills() {
        const statPillAlerta = statAlerta?.closest('.stat-pill');
        if (statPillAlerta) {
            statPillAlerta.style.background = '';
            statPillAlerta.style.borderColor = '';
        }
    }

    function atualizarVisualFiltro() {
        const statPillAlerta = statAlerta?.closest('.stat-pill');
        if (statPillAlerta) {
            if (mostrarApenasBaixo) {
                statPillAlerta.style.background = '#ffbebe';
                statPillAlerta.style.borderColor = '#e11d48';
                statPillAlerta.style.boxShadow = '0 0 0 2px rgba(225, 29, 72, 0.2)';
            } else {
                statPillAlerta.style.background = '';
                statPillAlerta.style.borderColor = '';
                statPillAlerta.style.boxShadow = '';
            }
        }
    }

    function aplicarFiltros() {
        const termo = searchInput.value ? searchInput.value.toLowerCase() : '';
        let filtrados = produtos.filter(p => (p.nome || '').toLowerCase().includes(termo));
        
        if (mostrarApenasBaixo) {
            filtrados = filtrados.filter(p => p.quantidade < p.quantidade_minima);
        }
        
        renderizarLista(filtrados);
    }

    function renderizarLista(produtosFiltrados) {
        if (!estoqueLista) return;
        estoqueLista.innerHTML = '';
        
        if (produtosFiltrados.length === 0) {
            estoqueLista.innerHTML = `
                <div style="text-align: center; padding: 40px; background: white;">
                    <i class="fas fa-search" style="font-size: 2rem; color: var(--border-color); margin-bottom: 10px; display: block;"></i>
                    <p style="color: var(--text-muted); font-size: 0.9rem;">Nenhum material encontrado.</p>
                </div>
            `;
            return;
        }

        produtosFiltrados.forEach(produto => {
            const isBaixo = produto.quantidade < produto.quantidade_minima;
            const item = document.createElement('div');
            item.className = 'lista-item-estoque';
            
            item.innerHTML = `
                <div class="status-indicator" style="background: ${isBaixo ? 'var(--danger-color)' : 'var(--success-color)'};"></div>
                <div style="display: flex; flex-direction: column; min-width: 0; padding-right: 10px;">
                    <span style="font-weight: 700; color: var(--primary-color); font-size: 0.9rem;">${produto.nome}</span>
                    <span style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.3;">${produto.observacoes || '--'}</span>
                </div>
                <div style="text-align: center;">
                    <span style="font-size: 1.1rem; font-weight: 800; color: ${isBaixo ? 'var(--danger-color)' : 'var(--success-color)'};">${produto.quantidade}</span>
                </div>
                <div style="text-align: center;">
                    <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">${produto.quantidade_minima}</span>
                </div>
                <div style="display: flex; gap: 4px; justify-content: center;">
                    <button class="btn-mini btn-in" title="Entrada" style="background: var(--success-color);"><i class="fas fa-arrow-up"></i></button>
                    <button class="btn-mini btn-out" title="Saída" style="background: var(--danger-color);"><i class="fas fa-arrow-down"></i></button>
                    <button class="btn-mini btn-edit" title="Editar" style="background: var(--primary-color);"><i class="fas fa-edit"></i></button>
                    <button class="btn-mini btn-mini-history btn-history" title="Histórico"><i class="fas fa-history"></i></button>
                </div>
            `;

            // Eventos
            item.querySelector('.btn-in').onclick = () => window.abrirModalMovimentacao(produto.id, 'entrada');
            item.querySelector('.btn-out').onclick = () => window.abrirModalMovimentacao(produto.id, 'saida');
            item.querySelector('.btn-edit').onclick = () => window.editarProduto(produto.id);
            item.querySelector('.btn-history').onclick = () => window.abrirModalRelatorio(produto.id);
            
            estoqueLista.appendChild(item);
        });
    }

    searchInput.addEventListener('input', aplicarFiltros);

    iniciarMonitoramentoProdutos();

    // --- MODAL DE PRODUTO ---
    const produtoModal = document.getElementById('produtoModal');
    const produtoModalTitle = document.getElementById('produtoModalTitle');
    const closeProdutoButtons = document.querySelectorAll('.close-produto');
    const saveProdutoBtn = document.getElementById('saveProdutoBtn');

    window.adicionarProduto = function() {
        produtoModalTitle.textContent = 'Adicionar Produto';
        document.getElementById('editProdutoId').value = '';
        document.getElementById('editNome').value = '';
        document.getElementById('editQuantidade').value = '0';
        document.getElementById('editQuantidadeMinima').value = '0';
        document.getElementById('editObservacoes').value = '';
        produtoModal.style.display = 'block';
    }

    window.editarProduto = async function(id) {
        try {
            const docSnap = await getDoc(doc(db, 'inventory', id));
            if (docSnap.exists()) {
                const produto = docSnap.data();
                produtoModalTitle.textContent = 'Editar Produto';
                document.getElementById('editProdutoId').value = id;
                document.getElementById('editNome').value = produto.nome;
                document.getElementById('editQuantidade').value = produto.quantidade;
                document.getElementById('editQuantidadeMinima').value = produto.quantidade_minima;
                document.getElementById('editObservacoes').value = produto.observacoes || '';
                produtoModal.style.display = 'block';
            }
        } catch (error) {
            handleFirestoreError(error, 'GET', `inventory/${id}`);
        }
    };

    saveProdutoBtn.addEventListener('click', async () => {
        const id = document.getElementById('editProdutoId').value;
        const nome = document.getElementById('editNome').value.trim();
        const quantidade = parseInt(document.getElementById('editQuantidade').value);
        const quantidadeMinima = parseInt(document.getElementById('editQuantidadeMinima').value);
        const observacoes = document.getElementById('editObservacoes').value.trim();

        if (!nome) return alert('Preencha o nome.');

        const dados = { nome, quantidade, quantidade_minima: quantidadeMinima, observacoes };

        try {
            if (id) {
                await updateDoc(doc(db, 'inventory', id), dados);
            } else {
                await addDoc(collection(db, 'inventory'), dados);
            }
            produtoModal.style.display = 'none';
        } catch (error) {
            handleFirestoreError(error, 'WRITE', 'inventory');
        }
    });

    // --- MODAL DE MOVIMENTAÇÃO ---
    const movimentacaoModal = document.getElementById('movimentacaoModal');
    const saveMovimentacaoBtn = document.getElementById('saveMovimentacaoBtn');

    window.abrirModalMovimentacao = async function(id, tipo) {
        try {
            const docSnap = await getDoc(doc(db, 'inventory', id));
            if (docSnap.exists()) {
                const produto = docSnap.data();
                document.getElementById('movProdutoId').value = id;
                document.getElementById('movTipo').value = tipo;
                document.getElementById('movNomeProduto').value = produto.nome;
                document.getElementById('movimentacaoModalTitle').textContent = tipo === 'entrada' ? 'Registrar Entrada' : 'Registrar Saída';
                document.getElementById('movQuantidade').value = '';
                document.getElementById('movData').valueAsDate = new Date();
                document.getElementById('movResponsavel').value = window.usuarioLogado?.nome || '';
                movimentacaoModal.style.display = 'block';
            }
        } catch (error) {
            handleFirestoreError(error, 'GET', `inventory/${id}`);
        }
    };

    saveMovimentacaoBtn.addEventListener('click', async () => {
        const id = document.getElementById('movProdutoId').value;
        const tipo = document.getElementById('movTipo').value;
        const quantidade = parseInt(document.getElementById('movQuantidade').value);
        const data = document.getElementById('movData').value;
        const responsavel = document.getElementById('movResponsavel').value.trim();
        const observacoes = document.getElementById('movObservacoesMov').value.trim();

        if (quantidade <= 0) return alert('Quantidade deve ser > 0');

        try {
            const docRef = doc(db, 'inventory', id);
            const docSnap = await getDoc(docRef);
            const atual = docSnap.data().quantidade;
            const novaQtd = tipo === 'entrada' ? atual + quantidade : atual - quantidade;

            await updateDoc(docRef, { quantidade: novaQtd });
            
            // Registra no log de inventário
            await addDoc(collection(db, 'inventory_moves'), {
                produto_id: id,
                tipo,
                quantidade,
                data_movimentacao: data,
                responsavel,
                observacoes,
                timestamp: serverTimestamp()
            });

            movimentacaoModal.style.display = 'none';
        } catch (error) {
            handleFirestoreError(error, 'WRITE', 'inventory_moves');
        }
    });

    // --- RELATÓRIO ---
    const relatorioModal = document.getElementById('relatorioModal');
    const relatorioTableBody = document.getElementById('relatorioTableBody');
    let unsubscribeRelatorio = null;

    window.abrirModalRelatorio = async function(id) {
        // Limpa listener anterior se existir
        if (unsubscribeRelatorio) unsubscribeRelatorio();
        
        try {
            const q = query(collection(db, 'inventory_moves'), where('produto_id', '==', id));
            unsubscribeRelatorio = onSnapshot(q, (snapshot) => {
                const logs = [];
                snapshot.forEach(doc => logs.push(doc.data()));
                
                // Ordenação por timestamp (mais recente primeiro)
                logs.sort((a, b) => {
                    const timeA = a.timestamp?.seconds || 0;
                    const timeB = b.timestamp?.seconds || 0;
                    if (timeB !== timeA) return timeB - timeA;
                    return (b.data_movimentacao || '').localeCompare(a.data_movimentacao || '');
                });
                
                if (relatorioTableBody) {
                    relatorioTableBody.innerHTML = '';
                    if (logs.length === 0) {
                        relatorioTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 0.85rem;">Nenhuma movimentação registrada.</td></tr>';
                    } else {
                        logs.forEach(mov => {
                            const row = document.createElement('tr');
                            row.innerHTML = `
                                <td class="${mov.tipo === 'entrada' ? 'tipo-entrada' : 'tipo-saida'}" style="font-size: 0.85rem;">
                                    <i class="fas fa-arrow-${mov.tipo === 'entrada' ? 'up' : 'down'}" style="margin-right: 5px;"></i>
                                    ${mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                                </td>
                                <td style="font-weight: 700;">${mov.quantidade}</td>
                                <td style="font-size: 0.85rem;">${formatarDataParaExibicao(mov.data_movimentacao)}</td>
                                <td style="font-size: 0.8rem; color: var(--text-muted);">${mov.responsavel || '--'}</td>
                                <td style="font-size: 0.75rem; color: var(--text-muted); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${mov.observacoes || ''}">${mov.observacoes || '--'}</td>
                            `;
                            relatorioTableBody.appendChild(row);
                        });
                    }
                }
                relatorioModal.style.display = 'block';
            });
        } catch (error) {
            handleFirestoreError(error, 'LIST', 'inventory_moves');
        }
    };

    // Fechar modais
    const closeAllModals = () => {
        produtoModal.style.display = 'none';
        movimentacaoModal.style.display = 'none';
        relatorioModal.style.display = 'none';
        if (unsubscribeRelatorio) {
            unsubscribeRelatorio();
            unsubscribeRelatorio = null;
        }
    };

    closeProdutoButtons.forEach(b => b.onclick = closeAllModals);
    document.querySelectorAll('.close-movimentacao').forEach(b => b.onclick = closeAllModals);
    document.querySelectorAll('.close-relatorio').forEach(b => b.onclick = closeAllModals);
    
    // Fechar ao clicar fora
    window.onclick = (event) => {
        if (event.target == produtoModal || event.target == movimentacaoModal || event.target == relatorioModal) {
            closeAllModals();
        }
    };
});


// Função para formatar data (opcional, se for exibir em outro formato)
function formatarData(dataISO) {
    const data = new Date(dataISO);
    return data.toLocaleDateString('pt-BR');
}
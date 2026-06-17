// Variável para controlar se o carregamento está em andamento
let carregandoDados = false;

// Função para salvar alocação sem refresh
async function salvarAlocacao(staffId, treinamentoId, dataAlocacao, action = 'save', status = 'intencao', motivoRecusa = null) {
    try {
        const response = await fetch('api/salvar-alocacao.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                staff_id: staffId,
                treinamento_id: treinamentoId,
                data_alocacao: dataAlocacao,
                status: status,
                motivo_recusa: motivoRecusa,
                action: action
            })
        });
        
        const result = await response.json();
        if (result.status !== 'success') {
            console.error('Erro ao salvar alocação:', result.message);
        } else {
            console.log('Alocação salva com sucesso:', { staffId, treinamentoId, dataAlocacao, action });
            
            // Atualiza a numeração automaticamente após salvar
            if (typeof atualizarNumeracaoStaffs === 'function') {
                atualizarNumeracaoStaffs(treinamentoId);
            }
        }
    } catch (error) {
        console.error('Erro de conexão ao salvar alocação:', error);
    }
}

// Função para atualizar a numeração dos staffs em um treinamento
function atualizarNumeracaoStaffs(treinamentoId) {
    const container = document.querySelector(`.staffs-allocated[data-treinamento-id="${treinamentoId}"]`);
    if (container) {
        const elementos = Array.from(container.children);
        
        // Separa em recusados e normais
        const recusados = [];
        const normais = [];
        
        elementos.forEach(elemento => {
            const textoSemNumero = elemento.textContent.replace(/^\d+\.\s/, '');
            elemento.textContent = textoSemNumero;
            
            if (elemento.classList.contains('status-recusado')) {
                recusados.push(elemento);
            } else {
                normais.push(elemento);
            }
        });
        
        container.innerHTML = '';
        
        normais.forEach((elemento, indice) => {
            elemento.textContent = `${indice + 1}. ${elemento.textContent}`;
            container.appendChild(elemento);
        });
        
        recusados.forEach(elemento => {
            elemento.textContent = elemento.textContent.replace(/^\d+\.\s/, '');
            container.appendChild(elemento);
        });
    }
}

// Função para inicializar a página de alocação
function initAlocacao() {
    if (typeof generateCalendar === 'function') {
        generateCalendar();
    }
    if (typeof loadStaffs === 'function') {
        loadStaffs();
    }

    const staffsContainer = document.getElementById('staffsContainer');
    if (staffsContainer) {
        staffsContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        staffsContainer.addEventListener('dragenter', (e) => {
            e.preventDefault();
            staffsContainer.classList.add('drag-over');
        });

        staffsContainer.addEventListener('dragleave', () => {
            staffsContainer.classList.remove('drag-over');
        });

        staffsContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            staffsContainer.classList.remove('drag-over');

            const staffId = e.dataTransfer.getData('staff-id');
            const treinamentoOrigem = e.dataTransfer.getData('treinamento-origem');
            const dataOrigem = e.dataTransfer.getData('data-origem');

            const staffIdMatch = staffId.match(/(\d+)/);
            const originalStaffId = staffIdMatch ? staffIdMatch[1] : null;

            let draggedElement = document.getElementById(`staff-${originalStaffId}`);
            if (!draggedElement) {
                draggedElement = document.querySelector(`[data-original-id="${originalStaffId}"]`);
            }
            if (!draggedElement) {
                draggedElement = document.querySelector(`[id^="staff-${originalStaffId}-copy-"]`);
            }

            if (draggedElement) {
                staffsContainer.appendChild(draggedElement);
                draggedElement.classList.remove('allocated');

                const nomeOriginal = draggedElement.textContent.replace(/^\d+\.\s/, '');
                draggedElement.textContent = nomeOriginal;

                if (treinamentoOrigem && dataOrigem) {
                    salvarAlocacao(parseInt(originalStaffId), parseInt(treinamentoOrigem), dataOrigem, 'delete');
                    
                    setTimeout(() => {
                        if (typeof atualizarNumeracaoStaffs === 'function') {
                            atualizarNumeracaoStaffs(parseInt(treinamentoOrigem));
                        }
                    }, 50);
                } else {
                    if (typeof ordenarStaffsDisponiveis === 'function') {
                        ordenarStaffsDisponiveis();
                    }
                }
            }
        });
    }
}

// Função para carregar treinamentos do dia
async function loadTreinamentosForDate(dateStr) {
    try {
        const response = await fetch(`api/listar-treinamentos-alocacao.php?data=${dateStr}`);
        const treinamentos = await response.json();
        const container = document.getElementById('treinamentosContainer');
        container.innerHTML = '';

        treinamentos.forEach(t => {
            const col = document.createElement('div');
            col.classList.add('treinamento-column');
            col.setAttribute('data-treinamento-id', t.id);
            col.setAttribute('data-date', dateStr);
            col.setAttribute('draggable', false);

            const header = document.createElement('div');
            header.classList.add('treinamento-header');
            
            const botoesContainer = document.createElement('div');
            botoesContainer.classList.add('botoes-container');
            
            const printButton = document.createElement('button');
            printButton.classList.add('btn-uniformes');
            printButton.innerHTML = '<i class="fas fa-tshirt"></i>';
            printButton.title = 'Imprimir Lista de Uniformes';
            printButton.addEventListener('click', () => {
                abrirImpressaoUniformes(t.id, dateStr);
            });
            
            const facilitadoresButton = document.createElement('button');
            facilitadoresButton.classList.add('btn-facilitadores');
            facilitadoresButton.innerHTML = '<i class="fas fa-users"></i>';
            facilitadoresButton.title = 'Lista de Facilitadores';
            facilitadoresButton.addEventListener('click', () => {
                abrirListaFacilitadores(t.id, dateStr);
            });
            
            botoesContainer.appendChild(printButton);
            botoesContainer.appendChild(facilitadoresButton);

            const infoDiv = document.createElement('div');
            infoDiv.classList.add('info-treinamento');
            
            const nomeNegocio = document.createElement('div');
            nomeNegocio.classList.add('nome-negocio');
            nomeNegocio.textContent = t.nome_negocio;
            nomeNegocio.title = (t.observacoes || '').trim() || 'Sem observações';
            nomeNegocio.style.cursor = 'pointer';
            nomeNegocio.addEventListener('click', () => {
                window.location.href = `cadastro-treinamentos.html?id=${t.id}`;
            });
            
            const programaNb = document.createElement('div');
            programaNb.classList.add('programa-nb');
            programaNb.textContent = t.programa_nb || 'Programa não informado';
            
            const localEvento = document.createElement('div');
            localEvento.classList.add('local-evento');
            localEvento.textContent = `${t.local_evento}, ${t.cidade}`;
            
            const participantes = document.createElement('div');
            participantes.classList.add('participantes');
            participantes.textContent = `${t.participantes || 0} pax`;

            infoDiv.appendChild(nomeNegocio);
            infoDiv.appendChild(programaNb);
            infoDiv.appendChild(localEvento);
            infoDiv.appendChild(participantes);

            header.appendChild(infoDiv);
            header.appendChild(botoesContainer);

            const staffsContainer = document.createElement('div');
            staffsContainer.classList.add('staffs-allocated');
            staffsContainer.setAttribute('data-treinamento-id', t.id);

            staffsContainer.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                staffsContainer.classList.add('drag-over');
            });

            staffsContainer.addEventListener('dragenter', (e) => {
                e.preventDefault();
                staffsContainer.classList.add('drag-over');
            });

            staffsContainer.addEventListener('dragleave', () => {
                staffsContainer.classList.remove('drag-over');
            });

            staffsContainer.addEventListener('drop', (e) => {
                e.preventDefault();
                staffsContainer.classList.remove('drag-over');

                const staffId = e.dataTransfer.getData('staff-id');
                let staffElement = document.getElementById(`staff-${staffId}`);
                if (!staffElement) {
                    staffElement = document.querySelector(`[data-original-id="${staffId}"]`);
                }
                if (!staffElement) {
                    staffElement = document.querySelector(`[id^="staff-${staffId}-copy-"]`);
                }

                if (staffElement) {
                    const containerAnterior = staffElement.parentElement;
                    
                    const outrosTreinamentos = document.querySelectorAll(`.staffs-allocated[data-treinamento-id]:not([data-treinamento-id="${t.id}"])`);
                    const jaAlocado = Array.from(outrosTreinamentos).some(container => 
                        container.querySelector(`#staff-${staffId}`) || container.querySelector(`[data-original-id="${staffId}"]`)
                    );

                    let staffElementParaAlocar = staffElement;
                    
                    if (jaAlocado) {
                        // CRIAÇÃO LIMPA: Novo elemento sem herança de eventos
                        staffElementParaAlocar = document.createElement('div');
                        staffElementParaAlocar.classList.add('staff-item', 'status-multiplo');
                        staffElementParaAlocar.id = `staff-${staffId}-copy-${t.id}`;
                        staffElementParaAlocar.setAttribute('data-original-id', staffId);
                        staffElementParaAlocar.setAttribute('draggable', 'true');
                        
                        // Copia o conteúdo textual (nome do staff)
                        staffElementParaAlocar.textContent = staffElement.textContent;
                        
                        // Copia atributos personalizados
                        if (staffElement.hasAttribute('data-motivo')) {
                            staffElementParaAlocar.setAttribute('data-motivo', staffElement.getAttribute('data-motivo'));
                        }
                        if (staffElement.hasAttribute('data-observacao')) {
                            staffElementParaAlocar.setAttribute('data-observacao', staffElement.getAttribute('data-observacao'));
                        }

                        // Adiciona evento de dragstart para a nova cópia
                        staffElementParaAlocar.addEventListener('dragstart', (e) => {
                            const originalId = staffElementParaAlocar.getAttribute('data-original-id') || staffId;
                            
                            const origem = staffElementParaAlocar.closest('.staffs-allocated');
                            if (origem) {
                                const treinamentoId = origem.getAttribute('data-treinamento-id');
                                const dateStr = origem.closest('.treinamento-column').getAttribute('data-date');
                                
                                e.dataTransfer.setData('treinamento-origem', treinamentoId);
                                e.dataTransfer.setData('data-origem', dateStr);
                                
                                console.log('Origem guardada para nova cópia:', { treinamentoId, dateStr, originalId });
                            }
                            
                            e.dataTransfer.setData('staff-id', originalId);
                            e.dataTransfer.effectAllowed = 'move';
                        });
                    } else {
                        staffElement.classList.add('allocated');
                        staffElement.classList.add('status-intencao');
                    }

                    staffsContainer.appendChild(staffElementParaAlocar);

                    staffElementParaAlocar.addEventListener('contextmenu', (e) => {
                        e.preventDefault();
                        criarMenuStatus(staffElementParaAlocar, e);
                    });

                    salvarAlocacao(parseInt(staffId), parseInt(t.id), dateStr, 'save', 'intencao');
                    
                    if (containerAnterior && containerAnterior !== staffsContainer && !jaAlocado) {
                        const treinamentoAnteriorId = containerAnterior.getAttribute('data-treinamento-id');
                        if (treinamentoAnteriorId) {
                            salvarAlocacao(parseInt(staffId), parseInt(treinamentoAnteriorId), dateStr, 'delete');
                            
                            setTimeout(() => {
                                if (typeof atualizarNumeracaoStaffs === 'function') {
                                    atualizarNumeracaoStaffs(parseInt(treinamentoAnteriorId));
                                }
                            }, 50);
                        }
                    }
                    
                    setTimeout(() => {
                        if (typeof atualizarNumeracaoStaffs === 'function') {
                            atualizarNumeracaoStaffs(t.id);
                        }
                    }, 50);
                }
            });

            col.appendChild(header);
            col.appendChild(staffsContainer);
            container.appendChild(col);
        });

        await loadAlocacoes(dateStr);
    } catch (error) {
        console.error('Erro ao carregar treinamentos:', error);
    }
}

// Função para carregar alocações existentes
async function loadAlocacoes(dateStr) {
    if (carregandoDados) {
        console.log('Carregamento já em andamento, aguardando...');
        return;
    }
    
    carregandoDados = true;
    
    try {
        const response = await fetch(`api/listar-alocacoes.php?data=${dateStr}`);
        const alocacoes = await response.json();

        document.querySelectorAll('.staffs-allocated').forEach(container => {
            container.innerHTML = '';
        });

        const alocacoesPorStaff = {};
        alocacoes.forEach(alocacao => {
            if (!alocacoesPorStaff[alocacao.staff_id]) {
                alocacoesPorStaff[alocacao.staff_id] = [];
            }
            alocacoesPorStaff[alocacao.staff_id].push(alocacao);
        });

        alocacoes.forEach(alocacao => {
            const staffElement = document.getElementById(`staff-${alocacao.staff_id}`);
            const treinamentoContainer = document.querySelector(`.staffs-allocated[data-treinamento-id="${alocacao.treinamento_id}"]`);

            if (staffElement && treinamentoContainer) {
                const staffEstaDuplicado = alocacoesPorStaff[alocacao.staff_id].length > 1;

                if (staffEstaDuplicado) {
                    // CRIAÇÃO LIMPA: Novo elemento sem herança de eventos
                    const staffElementParaAlocar = document.createElement('div');
                    staffElementParaAlocar.classList.add('staff-item', 'status-multiplo');
                    staffElementParaAlocar.id = `staff-${alocacao.staff_id}-copy-${alocacao.treinamento_id}`;
                    staffElementParaAlocar.setAttribute('data-original-id', alocacao.staff_id);
                    staffElementParaAlocar.setAttribute('draggable', 'true');
                    
                    // Copia o conteúdo textual (nome do staff)
                    staffElementParaAlocar.textContent = staffElement.textContent;
                    
                    // Copia atributos personalizados
                    if (alocacao.motivo_recusa) {
                        staffElementParaAlocar.setAttribute('data-motivo', alocacao.motivo_recusa);
                    }

                    if (alocacao.status) {
                        staffElementParaAlocar.classList.add(`status-${alocacao.status}`);
                    }

                    staffElementParaAlocar.addEventListener('contextmenu', (e) => {
                        e.preventDefault();
                        criarMenuStatus(staffElementParaAlocar, e);
                    });

                    staffElementParaAlocar.addEventListener('dragstart', (e) => {
                        e.dataTransfer.setData('staff-id', alocacao.staff_id);
                        e.dataTransfer.setData('treinamento-origem', alocacao.treinamento_id);
                        e.dataTransfer.setData('data-origem', dateStr);
                        e.dataTransfer.effectAllowed = 'move';
                    });

                    treinamentoContainer.appendChild(staffElementParaAlocar);
                } else {
                    if (alocacao.status) {
                        staffElement.classList.add(`status-${alocacao.status}`);
                        if (alocacao.status === 'recusado' && alocacao.motivo_recusa) {
                            staffElement.setAttribute('data-motivo', alocacao.motivo_recusa);
                        }
                    }
                    
                    staffElement.classList.add('allocated');

                    if (!staffElement.hasAttribute('data-dragstart-added')) {
                        staffElement.addEventListener('dragstart', (e) => {
                            e.dataTransfer.setData('staff-id', alocacao.staff_id);
                            e.dataTransfer.setData('treinamento-origem', alocacao.treinamento_id);
                            e.dataTransfer.setData('data-origem', dateStr);
                            e.dataTransfer.effectAllowed = 'move';
                        });
                        staffElement.setAttribute('data-dragstart-added', 'true');
                    }

                    if (!staffElement.hasAttribute('data-contextmenu-added')) {
                        staffElement.addEventListener('contextmenu', (e) => {
                            e.preventDefault();
                            criarMenuStatus(staffElement, e);
                        });
                        staffElement.setAttribute('data-contextmenu-added', 'true');
                    }

                    treinamentoContainer.appendChild(staffElement);
                }
            }
        });

        document.querySelectorAll('.staffs-allocated').forEach(container => {
            const treinamentoId = container.getAttribute('data-treinamento-id');
            if (treinamentoId) {
                const elementos = Array.from(container.children);
                
                const recusados = [];
                const normais = [];
                
                elementos.forEach(elemento => {
                    const textoSemNumero = elemento.textContent.replace(/^\d+\.\s/, '');
                    elemento.textContent = textoSemNumero;
                    
                    if (elemento.classList.contains('status-recusado')) {
                        recusados.push(elemento);
                    } else {
                        normais.push(elemento);
                    }
                });
                
                container.innerHTML = '';
                
                normais.forEach((elemento, indice) => {
                    elemento.textContent = `${indice + 1}. ${elemento.textContent}`;
                    container.appendChild(elemento);
                });
                
                recusados.forEach(elemento => {
                    elemento.textContent = elemento.textContent.replace(/^\d+\.\s/, '');
                    container.appendChild(elemento);
                });
            }
        });
        
        console.log('Alocações carregadas com sucesso para ', dateStr);
    } catch (error) {
        console.error('Erro ao carregar alocações:', error);
    } finally {
        carregandoDados = false;
    }
}

// Função para alterar status de um staff
function alterarStatus(staffElement, status) {
    staffElement.classList.remove('status-intencao', 'status-whatsapp', 'status-pessoalmente', 'status-confirmado', 'status-recusado', 'status-multiplo');
    
    staffElement.classList.add(`status-${status}`);

    if (status === 'recusado') {
        const motivo = prompt('Digite o motivo da recusa:');
        if (motivo) {
            staffElement.setAttribute('data-motivo', motivo);
        }
    } else {
        staffElement.removeAttribute('data-motivo');
    }

    const treinamentoContainer = staffElement.closest('.staffs-allocated');
    if (treinamentoContainer) {
        const treinamentoId = treinamentoContainer.getAttribute('data-treinamento-id');
        const dateStr = treinamentoContainer.closest('.treinamento-column').getAttribute('data-date');
        
        const staffIdMatch = staffElement.id.match(/staff-(\d+)(?:-copy-\d+)?/);
        if (staffIdMatch) {
            const staffId = staffIdMatch[1];
            salvarAlocacao(parseInt(staffId), parseInt(treinamentoId), dateStr, 'save', status, staffElement.getAttribute('data-motivo'));
            
            setTimeout(() => {
                if (typeof atualizarNumeracaoStaffs === 'function') {
                    atualizarNumeracaoStaffs(parseInt(treinamentoId));
                }
            }, 50);
        }
    }
}

// Função para criar menu de status
function criarMenuStatus(staffElement, event) {
    document.querySelectorAll('.status-menu').forEach(menu => menu.remove());
    const menu = document.createElement('div');
    menu.classList.add('status-menu');
    menu.innerHTML = `
        <div class="status-option status-intencao" data-status="intencao">Intenção</div>
        <div class="status-option status-whatsapp" data-status="whatsapp">WhatsApp</div>
        <div class="status-option status-pessoalmente" data-status="pessoalmente">Pessoalmente</div>
        <div class="status-option status-confirmado" data-status="confirmado">Confirmado</div>
        <div class="status-option status-recusado" data-status="recusado">Recusado</div>
    `;

    const screenHeight = window.innerHeight;
    const menuHeight = 150;
    const clickY = event.clientY;

    if (clickY + menuHeight > screenHeight) {
        menu.style.top = `${event.clientY - menuHeight}px`;
    } else {
        menu.style.top = `${event.clientY}px`;
    }

    menu.style.left = `${event.clientX}px`;

    menu.querySelectorAll('.status-option').forEach(option => {
        option.addEventListener('click', () => {
            alterarStatus(staffElement, option.getAttribute('data-status'));
            menu.remove();
        });
    });

    document.addEventListener('click', function fecharMenu(e) {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', fecharMenu);
        }
    });

    document.body.appendChild(menu);
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

// Função para carregar staffs e alocações para uma data específica
async function loadStaffsAndAlocacoesForDate(dateStr) {
    if (typeof loadStaffs === 'function') {
        await loadStaffs();
    }
    await loadAlocacoes(dateStr);
}

// Inicialização da página
document.addEventListener('DOMContentLoaded', () => {
    initAlocacao();
});
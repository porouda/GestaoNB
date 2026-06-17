// js/script.js
import { db, doc, getDoc, setDoc, collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, handleFirestoreError, formatarDataParaExibicao, formatarDataParaInput } from './firebase-config.js';

// Apply saved theme immediately
const savedTheme = localStorage.getItem('nb_theme') || 'default';
if (savedTheme !== 'default') document.body.classList.add(`theme-${savedTheme}`);

// Função para registrar logs no Firestore
async function registrarLog(acao, tabela, registroId, descricao) {
    try {
        await addDoc(collection(db, 'logs'), {
            usuario_id: window.usuarioLogado?.id || '0',
            usuario_nome: window.usuarioLogado?.nome || 'Sistema',
            acao: acao,
            tabela_afetada: tabela,
            registro_id: registroId,
            descricao: descricao,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.warn("Falha ao registrar log (não bloqueante):", error);
    }
}

// Função para carregar o menu lateral
async function loadMenu() {
    try {
        const sidebar = document.querySelector('.sidebar') || document.getElementById('sidebar');
        
        if (sidebar) {
            sidebar.innerHTML = `
                <div class="sidebar-logo">
                    <div class="logo-icon"><i class="fas fa-layer-group"></i></div>
                    <span class="text">NB Gestão</span>
                </div>
                <ul>
                    <li data-page="home.html">
                        <a href="home.html">
                            <i class="fas fa-chart-line"></i>
                            <span class="text">Dashboard</span>
                        </a>
                    </li>
                    <li class="menu-item">
                        <a href="#" class="has-submenu">
                            <i class="fas fa-users"></i>
                            <span class="text">Staffs</span>
                            <i class="fas fa-chevron-right arrow"></i>
                        </a>
                        <ul class="submenu">
                            <li data-page="cadastro-staffs.html"><a href="cadastro-staffs.html"><i class="fas fa-user-plus"></i><span class="text">Cadastro</span></a></li>
                            <li data-page="consulta-staffs.html"><a href="consulta-staffs.html"><i class="fas fa-search"></i><span class="text">Consulta</span></a></li>
                        </ul>
                    </li>
                    <li data-page="calendario-treinamentos.html">
                        <a href="calendario-treinamentos.html">
                            <i class="fas fa-calendar-alt"></i>
                            <span class="text">Calendário</span>
                        </a>
                    </li>
                    <li data-page="alocacao-staffs.html">
                        <a href="alocacao-staffs.html">
                            <i class="fas fa-users-cog"></i>
                            <span class="text">Alocação Operacional</span>
                        </a>
                    </li>
                    
                    <li class="menu-item">
                        <a href="#" class="has-submenu">
                            <i class="fas fa-graduation-cap"></i>
                            <span class="text">Treinamentos</span>
                            <i class="fas fa-chevron-right arrow"></i>
                        </a>
                        <ul class="submenu">
                           <li data-page="cadastro-treinamentos.html"><a href="cadastro-treinamentos.html"><i class="fas fa-plus"></i><span class="text">Novo Evento</span></a></li>
                           <li data-page="consulta-treinamentos.html"><a href="consulta-treinamentos.html"><i class="fas fa-search"></i><span class="text">Gerenciar</span></a></li>
                        </ul>
                    </li>
                    <li data-page="kanban.html"><a href="kanban.html"><i class="fas fa-columns"></i><span class="text">Fluxo de Tarefas</span></a></li>
                    <li data-page="estoque.html"><a href="estoque.html"><i class="fas fa-box-open"></i><span class="text">Controle de Estoque</span></a></li>
                    
                    <li class="menu-item">
                        <a href="#" class="has-submenu">
                            <i class="fas fa-cog"></i>
                            <span class="text">Configurações</span>
                            <i class="fas fa-chevron-right arrow"></i>
                        </a>
                        <ul class="submenu">
                           <li data-page="importar-treinamentos.html"><a href="importar-treinamentos.html"><i class="fas fa-file-import"></i><span class="text">Importar Dados</span></a></li>
                           <li data-page="gestao-acessos.html"><a href="gestao-acessos.html"><i class="fas fa-user-shield"></i><span class="text">Acessos</span></a></li>
                        </ul>
                    </li>
                    <li><a href="#" id="btnThemeToggle" title="Alternar Tema"><i class="fas fa-moon"></i><span class="text">Mudar Clima</span></a></li>
                    <li><a href="#" id="btnLogout"><i class="fas fa-power-off"></i><span class="text">Sair do Sistema</span></a></li>
                </ul>

                <div class="sidebar-user-footer">
                    <div class="user-avatar" id="userAvatar">NB</div>
                    <div class="user-details">
                        <span class="user-name" id="userNameFooter">Carregando...</span>
                        <span class="user-role" id="userRoleFooter">Usuário</span>
                    </div>
                </div>
            `;

            document.getElementById('btnLogout')?.addEventListener('click', window.fazerLogout);
            
            // Se já estiver logado, atualiza o footer imediatamente
            if (window.authReady) {
                updateUserFooter();
            }
            
            // Theme Toggle Listener
            document.getElementById('btnThemeToggle')?.addEventListener('click', (e) => {
                e.preventDefault();
                const isDark = document.body.classList.contains('theme-dark');
                document.body.classList.toggle('theme-dark', !isDark);
                localStorage.setItem('nb_theme', !isDark ? 'dark' : 'default');
            });
            
            marcarPaginaAtiva();
            initSubmenus();
            filtrarAcessosMenu();
            updateUserFooter();
        }
    } catch (error) {
        console.error('Erro ao carregar o menu:', error);
    }
}

function marcarPaginaAtiva() {
    const path = window.location.pathname.split('/').pop() || 'home.html';
    const activeItem = document.querySelector(`.sidebar [data-page="${path}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
        const parentMenuItem = activeItem.closest('.menu-item');
        if (parentMenuItem) {
            parentMenuItem.classList.add('active');
            parentMenuItem.classList.add('open'); // Garante que o submenu do item ativo fique aberto
        }
    }
}

function updateUserFooter() {
    const user = window.usuarioLogado;
    const nome = user?.nome || 'Usuário';
    const nivel = user?.nivel || 'Acesso';
    const sigla = nome !== 'Usuário' ? nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'NB';

    const avatar = document.getElementById('userAvatar');
    const nameFooter = document.getElementById('userNameFooter');
    const roleFooter = document.getElementById('userRoleFooter');

    if (avatar) avatar.textContent = sigla;
    if (nameFooter) nameFooter.textContent = nome;
    if (roleFooter) roleFooter.textContent = nivel.charAt(0).toUpperCase() + nivel.slice(1);
}

function filtrarAcessosMenu() {
    if (!window.permissoesUsuario) return;

    if (window.permissoesUsuario.includes('all')) {
        document.querySelectorAll('.sidebar .menu-item, .sidebar [data-page]').forEach(el => {
            el.style.display = ''; 
        });
        return; 
    }

    const menuItemsComData = document.querySelectorAll('.sidebar [data-page]');
    menuItemsComData.forEach(item => {
        const paginaSlug = item.getAttribute('data-page');
        if (window.permissoesUsuario.includes(paginaSlug)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });

    limparGruposVazios();
}

function limparGruposVazios() {
    const gruposPrincipais = document.querySelectorAll('.sidebar .menu-item');
    gruposPrincipais.forEach(grupo => {
        const submenu = grupo.querySelector('.submenu');
        if (submenu) {
            const subItemsVisiveis = Array.from(submenu.children).filter(li => li.style.display !== 'none');
            grupo.style.display = subItemsVisiveis.length === 0 ? 'none' : '';
        }
    });
}

window.addEventListener('permissionsLoaded', () => {
    filtrarAcessosMenu();
    updateUserFooter();
});

// Global snapshots logic
let allTreinamentos = [];
let allStaffs = [];
let unsubTreinamentos = null;
let unsubStaffs = null;

// Real-time Trainings with onSnapshot (optimized to avoid multiple subscriptions)
async function carregarTreinamentos() {
    if (unsubTreinamentos) return; // Already monitoring

    const q = collection(db, 'trainings');
    console.log('Iniciando monitoramento global de treinamentos...');
    unsubTreinamentos = onSnapshot(q, (snapshot) => {
        console.log(`Snapshot de treinamentos recebido. Total: ${snapshot.size}`);
        allTreinamentos = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            allTreinamentos.push({ id, ...data });
        });
        aplicarFiltrosTreinamentos();
    }, (error) => handleFirestoreError(error, 'LIST', 'trainings'));
}

function aplicarFiltrosTreinamentos() {
    const filtroEtapa = document.getElementById('filtroEtapa')?.value || '';
    const busca = document.getElementById('buscaTreinamento')?.value || '';
    
    const filtrados = allTreinamentos.filter(t => {
        const matchesEtapa = !filtroEtapa || (t.etapa || '') === filtroEtapa;
        const nome = t.nomeNegocio || t.nome_negocio || '';
        const matchesBusca = !busca || nome.toLowerCase().includes(busca.toLowerCase());
        return matchesEtapa && matchesBusca;
    });

    renderizarTreinamentos(filtrados);
}

function renderizarTreinamentos(treinamentos) {
    const tbody = document.getElementById('treinamentoTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    treinamentos.forEach(treinamento => {
        const row = document.createElement('tr');
        const data = treinamento.dataEvento || treinamento.data_evento;
        const dataEventoStr = formatarDataParaExibicao(data);
        row.innerHTML = `
            <td>${treinamento.nomeNegocio || treinamento.nome_negocio || ''}</td>
            <td>${treinamento.etapa || ''}</td>
            <td>${treinamento.programaNb || treinamento.programa_nb || ''}</td>
            <td>${dataEventoStr}</td>
            <td>${treinamento.localEvento || treinamento.local_evento || ''}</td>
            <td>${treinamento.cidade || ''}</td>
        `;
        row.addEventListener('click', () => {
            window.location.href = `cadastro-treinamentos.html?id=${treinamento.id}`;
        });
        tbody.appendChild(row);
    });
}

// Real-time Staffs
async function carregarStaffs() {
    if (unsubStaffs) return; // Already monitoring

    const q = collection(db, 'staffs');
    console.log('Iniciando monitoramento global de staffs...');
    unsubStaffs = onSnapshot(q, (snapshot) => {
        console.log(`Snapshot de staffs recebido. Total: ${snapshot.size}`);
        allStaffs = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            allStaffs.push({ id, ...data });
        });
        aplicarFiltrosStaffs();
    }, (error) => {
        console.error("Erro no onSnapshot de staffs:", error);
        handleFirestoreError(error, 'LIST', 'staffs');
    });
}

function aplicarFiltrosStaffs() {
    const filtroAtivo = document.getElementById('filtroAtivo')?.value || '';
    const busca = document.getElementById('buscaNome')?.value || '';

    const filtrados = allStaffs.filter(s => {
        const matchesAtivo = !filtroAtivo || s.ativo === filtroAtivo;
        const nomeCompleto = s.nomeCompleto || s.nome_completo || '';
        const nomeAbreviado = s.nomeAbreviado || s.nome_abreviado || '';
        const matchesBusca = !busca || 
                           nomeCompleto.toLowerCase().includes(busca.toLowerCase()) || 
                           nomeAbreviado.toLowerCase().includes(busca.toLowerCase());
        return matchesAtivo && matchesBusca;
    });

    renderizarStaffs(filtrados);
}

function renderizarStaffs(staffs) {
    const tbody = document.getElementById('staffTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    staffs.forEach(staff => {
        const row = document.createElement('tr');
        const dtNasc = staff.dtNasc || staff.dt_nascimento;
        let dtNascStr = formatarDataParaExibicao(dtNasc);

        row.innerHTML = `
            <td>${staff.nomeAbreviado || staff.nome_abreviado || staff.nomeCompleto || staff.nome_completo || ''}</td>
            <td>${staff.rg || ''}</td>
            <td>${staff.cpf || ''}</td>
            <td>${dtNascStr}</td>
            <td>${staff.celular || ''}</td>
        `;
        row.addEventListener('click', () => {
            window.location.href = `cadastro-staffs.html?id=${staff.id}`;
        });
        tbody.appendChild(row);
    });
}

async function carregarDadosStaff(id) {
    try {
        const docSnap = await getDoc(doc(db, 'staffs', id));
        if (docSnap.exists()) {
            const staff = docSnap.data();
            
            const setVal = (fieldId, val) => {
                const el = document.getElementById(fieldId);
                if (el) el.value = val || '';
            };

            setVal('ativo', staff.ativo);
            setVal('nomeCompleto', staff.nomeCompleto || staff.nome_completo);
            setVal('nomeAbreviado', staff.nomeAbreviado || staff.nome_abreviado);
            setVal('rg', staff.rg);
            setVal('cpf', staff.cpf);
            setVal('dtNasc', formatarDataParaInput(staff.dtNasc || staff.dt_nascimento));
            setVal('celular', staff.celular);
            setVal('endereco', staff.endereco);
            setVal('email', staff.email);
            setVal('dtEntrada', formatarDataParaInput(staff.dtEntrada || staff.dt_entrada));
            setVal('formaPagamento', staff.formaPagamento || staff.forma_pagamento);
            setVal('banco', staff.banco);
            setVal('agencia', staff.agencia);
            setVal('conta', staff.conta);
            setVal('tipoConta', staff.tipoConta || staff.tipo_conta);
            setVal('vencimentoASO', formatarDataParaInput(staff.vencimentoASO || staff.vencimento_aso));
            setVal('integracaoEmbraer', staff.integracaoEmbraer || staff.integracao_embraer);
            setVal('vencimentoContrato', formatarDataParaInput(staff.vencimentoContrato || staff.vencimento_contrato));
            setVal('observacoes', staff.observacoes);
            setVal('staffId', id);
        }
    } catch (error) {
        console.error("Erro ao carregar dados do staff:", error);
        alert("Erro ao carregar os dados do staff. Verifique o console.");
    }
}

function atualizarSaudacao() {
    const saudacaoEl = document.getElementById('dash-saudacao');
    const diaEl = document.getElementById('dash-dia');
    const mesAnoEl = document.getElementById('dash-mes-ano');
    
    if (saudacaoEl) {
        const hora = new Date().getHours();
        let saudacao = "Bom dia";
        if (hora >= 12 && hora < 18) saudacao = "Boa tarde";
        else if (hora >= 18) saudacao = "Boa noite";
        
        const user = window.usuarioLogado;
        const nomeUsuario = user?.nome ? user.nome.split(' ')[0] : 'Usuário';
        saudacaoEl.textContent = `${saudacao}, ${nomeUsuario}!`;
    }

    if (diaEl && mesAnoEl) {
        const agora = new Date();
        const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        diaEl.textContent = agora.getDate();
        mesAnoEl.textContent = `${meses[agora.getMonth()]}, ${agora.getFullYear()}`;
    }
}

async function initDashboard() {
    console.log("Dashboard em modo 'Bento Canvas' inicializada.");
    
    // 1. Saudação Inicial
    if (window.authReady) {
        atualizarSaudacao();
    }
    
    // Atualizar saudação quando as permissões/usuário carregarem (caso demore)
    window.addEventListener('permissionsLoaded', atualizarSaudacao);

    // 2. Monitoramento de Dados para o Dashboard
    function monitorDashboard() {
        console.log("Iniciando escutas em tempo real para o Dashboard...");
        
        // Monitorar Treinamentos
        onSnapshot(collection(db, 'trainings'), (snapshot) => {
            const treinamentos = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                treinamentos.push({ id: doc.id, ...data });
            });
            console.log(`Dashboard: ${treinamentos.length} treinamentos carregados.`);
            atualizarWidgetsTreinamento(treinamentos);
        }, (error) => console.error("Erro no onSnapshot Dashboard Treinamentos:", error));

        // Monitorar Estoque
        onSnapshot(collection(db, 'inventory'), (snapshot) => {
            const produtos = [];
            snapshot.forEach(doc => produtos.push({ id: doc.id, ...doc.data() }));
            atualizarWidgetEstoque(produtos);
        }, (error) => console.error("Erro no onSnapshot Dashboard Estoque:", error));
    }

    function atualizarWidgetsTreinamento(treinamentos) {
        const agora = new Date();
        const anoAtual = agora.getFullYear();
        const mesAtual = agora.getMonth();
        
        // Treinamentos do Mês (Confirmado ou Realizado)
        const doMes = treinamentos.filter(t => {
            const rawData = t.dataEvento || t.data_evento;
            const dataStr = formatarDataParaInput(rawData);
            if (!dataStr) return false;
            
            const [ano, mes] = dataStr.split('-').map(Number);
            const matchesMonth = (ano === anoAtual && (mes - 1) === mesAtual);
            const isConfirmedOrRealized = ['Confirmado', 'Realizado'].includes(t.etapa);
            
            return matchesMonth && isConfirmedOrRealized;
        });
        
        const countMesEl = document.getElementById('dash-count-mes');
        if (countMesEl) countMesEl.textContent = doMes.length;

        // Próximos 10 Treinamentos (Confirmados, hoje em diante)
        const hojeLocal = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
        
        const proximos = treinamentos
            .filter(t => {
                const rawData = t.dataEvento || t.data_evento;
                const dataStr = formatarDataParaInput(rawData);
                return t.etapa === 'Confirmado' && dataStr && dataStr >= hojeLocal;
            })
            .sort((a, b) => {
                const dataA = formatarDataParaInput(a.dataEvento || a.data_evento) || '';
                const dataB = formatarDataParaInput(b.dataEvento || b.data_evento) || '';
                return dataA.localeCompare(dataB);
            })
            .slice(0, 10);
            
        const containerProximos = document.getElementById('dash-proximos-treinamentos');
        if (containerProximos) {
            if (proximos.length === 0) {
                containerProximos.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 20px;">Nenhum treinamento confirmado de hoje em diante.</p>';
                return;
            }

            containerProximos.innerHTML = proximos.map(t => {
                const rawData = t.dataEvento || t.data_evento;
                const dataStr = formatarDataParaInput(rawData);
                const dataFormatada = formatarDataParaExibicao(rawData);
                const isHoje = dataStr === hojeLocal;
                const nome = t.nomeNegocio || t.nome_negocio || 'Treinamento';
                
                return `
                    <div style="display: flex; align-items: center; gap: 8px; background: var(--bg-color); padding: 6px 12px; border-radius: 10px; border: 1px solid var(--border-color); cursor: pointer;" onclick="window.location.href='cadastro-treinamentos.html?id=${t.id}'">
                        <div style="min-width: 38px; text-align: center; border-right: 1px solid var(--border-color); padding-right: 8px;">
                            <span style="display: block; font-size: 0.9rem; font-weight: 800; color: var(--primary-color); line-height: 1;">${dataStr.split('-')[2]}</span>
                            <span style="font-size: 0.6rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted);">${dataFormatada.split('/')[1]}</span>
                        </div>
                        <div style="flex: 1; overflow: hidden;">
                            <span style="display: block; font-size: 0.8rem; font-weight: 700; color: var(--primary-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">${nome}</span>
                            <span style="font-size: 0.7rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${t.localEvento || t.local_evento || 'Local não definido'}</span>
                        </div>
                        ${isHoje ? '<span style="background: var(--success-color); color: white; font-size: 0.6rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">Hoje</span>' : ''}
                    </div>
                `;
            }).join('');
        }
    }

    function atualizarWidgetEstoque(produtos) {
        const baixos = produtos.filter(p => p.quantidade < p.quantidade_minima);
        const containerAlerts = document.getElementById('dash-estoque-alerts');
        
        if (containerAlerts) {
            if (baixos.length === 0) {
                containerAlerts.innerHTML = '<p style="font-size: 0.85rem; color: var(--success-color); font-weight: 600; text-align: center; padding: 10px;"><i class="fas fa-check-circle" style="margin-right: 5px;"></i> Tudo em ordem!</p>';
                return;
            }

            containerAlerts.innerHTML = baixos.slice(0, 3).map(p => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
                    <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">${p.nome}</span>
                    <span style="font-size: 0.75rem; font-weight: 700; color: #e11d48; margin-left: 10px;">${p.quantidade} <span style="font-weight: 400; opacity: 0.7; font-size: 0.65rem;">/ min ${p.quantidade_minima}</span></span>
                </div>
            `).join('');

            if (baixos.length > 3) {
                const extras = document.createElement('p');
                extras.style.cssText = "font-size: 0.75rem; color: #9f1239; margin-top: 5px; text-align: center; font-style: italic;";
                extras.textContent = `+ ${baixos.length - 3} outros itens em baixa`;
                containerAlerts.appendChild(extras);
            }
        }
    }

    monitorDashboard();
}

async function carregarDadosTreinamento(id) {
    try {
        const docSnap = await getDoc(doc(db, 'trainings', id));
        if (docSnap.exists()) {
            const training = docSnap.data();
            
            const setVal = (fieldId, val) => {
                const el = document.getElementById(fieldId);
                if (el) el.value = val || '';
            };

            setVal('nomeNegocio', training.nomeNegocio || training.nome_negocio);
            setVal('etapa', training.etapa);
            setVal('programaNb', training.programaNb || training.programa_nb);
            setVal('dataEvento', formatarDataParaInput(training.dataEvento || training.data_evento));
            setVal('participantes', training.participantes);
            setVal('localEvento', training.localEvento || training.local_evento);
            setVal('cidade', training.cidade);
            setVal('contatos', training.contatos);
            setVal('observacoes', training.observacoes);
            setVal('treinamentoId', id);
        }
    } catch (error) {
        console.error("Erro ao carregar dados do treinamento:", error);
        alert("Erro ao carregar os dados do treinamento. Verifique o console.");
    }
}

function initSubmenus() {
    document.querySelectorAll('.menu-item > a').forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.nextElementSibling && this.nextElementSibling.classList.contains('submenu')) {
                e.preventDefault();
                const item = this.parentElement;
                
                // Fecha outros menus abertos
                document.querySelectorAll('.menu-item.open').forEach(otherItem => {
                    if (otherItem !== item) otherItem.classList.remove('open');
                });
                
                item.classList.toggle('open');
            }
        });
    });
}

function initFormTreinamentos() {
    const form = document.querySelector('.form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const rawData = Object.fromEntries(formData);
            const id = document.getElementById('treinamentoId').value;

            // Mapeia camelCase do formulário para snake_case do blueprint
            const dados = {
                nome_negocio: rawData.nomeNegocio || '',
                etapa: rawData.etapa || '',
                programa_nb: rawData.programaNb || '',
                data_evento: rawData.dataEvento || '',
                participantes: Number(rawData.participantes) || 0,
                local_evento: rawData.localEvento || '',
                cidade: rawData.cidade || '',
                contatos: rawData.contatos || '',
                observacoes: rawData.observacoes || '',
                lastSyncedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            try {
                if (id) {
                    await updateDoc(doc(db, 'trainings', id), dados);
                    try { await registrarLog('edição', 'treinamentos', id, `Editou treinamento: ${dados.nome_negocio}`); } catch(e) {}
                } else {
                    dados.createdAt = serverTimestamp();
                    const docRef = await addDoc(collection(db, 'trainings'), dados);
                    try { await registrarLog('criação', 'treinamentos', docRef.id, `Criou treinamento: ${dados.nome_negocio}`); } catch(e) {}
                }
                alert('Treinamento salvo com sucesso!');
                if (!id) form.reset();
            } catch (error) {
                console.error("Erro ao salvar treinamento:", error);
                handleFirestoreError(error, 'WRITE', 'trainings');
            }
        });
    }
}

function initForm() {
    const form = document.querySelector('.form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const rawData = Object.fromEntries(formData);
            const id = document.getElementById('staffId').value;

            // Mapeia camelCase do formulário para snake_case do blueprint
            const dados = {
                ativo: rawData.ativo || 'sim',
                nome_completo: rawData.nomeCompleto || '',
                nome_abreviado: rawData.nomeAbreviado || '',
                rg: rawData.rg || '',
                cpf: rawData.cpf || '',
                dt_nascimento: rawData.dtNasc || '',
                celular: rawData.celular || '',
                endereco: rawData.endereco || '',
                email: rawData.email || '',
                dt_entrada: rawData.dtEntrada || '',
                forma_pagamento: rawData.formaPagamento || '',
                banco: rawData.banco || '',
                agencia: rawData.agencia || '',
                conta: rawData.conta || '',
                tipo_conta: rawData.tipoConta || '',
                vencimento_aso: rawData.vencimentoASO || '',
                integracao_embraer: rawData.integracaoEmbraer || '',
                vencimento_contrato: rawData.vencimentoContrato || '',
                observacoes: rawData.observacoes || '',
                updatedAt: serverTimestamp()
            };

            try {
                if (id) {
                    await setDoc(doc(db, 'staffs', id), dados, { merge: true });
                    try { await registrarLog('edição', 'staffs', id, `Editou staff: ${dados.nome_completo}`); } catch(e) {}
                } else {
                    dados.createdAt = serverTimestamp();
                    const docRef = await addDoc(collection(db, 'staffs'), dados);
                    try { await registrarLog('criação', 'staffs', docRef.id, `Criou staff: ${dados.nome_completo}`); } catch(e) {}
                }
                alert('Staff salvo com sucesso!');
                if (!id) form.reset();
            } catch (error) {
                console.error("Erro ao salvar staff:", error);
                handleFirestoreError(error, 'WRITE', id ? `staffs/${id}` : 'staffs');
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadMenu();
    
    const toggleBtn = document.getElementById('toggleBtn');
    const sidebar = document.querySelector('.sidebar');
    
    // Persistência do estado expandido para evitar flicker na navegação
    if (sidebar) {
        // Verifica se o mouse estava no menu antes do reload
        if (sessionStorage.getItem('sidebar_hovered') === 'true') {
            sidebar.classList.add('expanded');
        }

        sidebar.addEventListener('mouseenter', () => {
            sessionStorage.setItem('sidebar_hovered', 'true');
            sidebar.classList.add('expanded');
        });

        sidebar.addEventListener('mouseleave', () => {
            sessionStorage.setItem('sidebar_hovered', 'false');
            sidebar.classList.remove('expanded');
        });

        // Clique no botão Hamburguer (Mobile/Desktop Toggle - Removido se o botão for retirado do HTML)
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                sidebar.classList.toggle('mobile-open');
            });
        } else {
            // Se não houver botão, permite abrir a sidebar no mobile clicando na beirada visível
            sidebar.addEventListener('click', (e) => {
                if (window.innerWidth <= 768 && !sidebar.classList.contains('mobile-open')) {
                    sidebar.classList.add('mobile-open');
                }
            });
        }

        // Fecha ao clicar em um link no mobile (apenas mobile)
        sidebar.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && e.target.closest('a[href]:not([href="#"])')) {
                sidebar.classList.remove('mobile-open');
            }
        });

        // Fecha ao clicar fora (apenas mobile)
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && sidebar.classList.contains('mobile-open')) {
                if (!sidebar.contains(e.target) && (!toggleBtn || !toggleBtn.contains(e.target))) {
                    sidebar.classList.remove('mobile-open');
                }
            }
        });
    }

    if (document.querySelector('.treinamento-table')) {
        const filtroSelect = document.getElementById('filtroEtapa');
        const buscaInput = document.getElementById('buscaTreinamento');
        
        filtroSelect?.addEventListener('change', aplicarFiltrosTreinamentos);
        buscaInput?.addEventListener('input', aplicarFiltrosTreinamentos);
        carregarTreinamentos();
    }

    if (document.querySelector('.staff-table')) {
        const filtroSelect = document.getElementById('filtroAtivo');
        const buscaInput = document.getElementById('buscaNome');
        
        filtroSelect?.addEventListener('change', aplicarFiltrosStaffs);
        buscaInput?.addEventListener('input', aplicarFiltrosStaffs);
        carregarStaffs();
    }

    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (window.location.pathname.includes('cadastro-treinamentos.html')) {
        if (id) await carregarDadosTreinamento(id);
        initFormTreinamentos();
    }

    if (window.location.pathname.includes('cadastro-staffs.html')) {
        if (id) await carregarDadosStaff(id);
        initForm();
    }

    if (window.location.pathname.includes('home.html') || window.location.pathname === '/') {
        initDashboard();
    }
});

window.fazerLogout = async function() {
    if (confirm("Deseja sair do sistema?")) {
        try {
            await fetch('/api/logout-node', { method: 'POST' });
            window.location.href = 'login.html';
        } catch (e) {
            console.error("Erro ao deslogar:", e);
            window.location.href = 'login.html';
        }
    }
};

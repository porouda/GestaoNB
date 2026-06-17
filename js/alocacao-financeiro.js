import { db, collection, getDocs, doc, getDoc, updateDoc, query, where, onSnapshot, handleFirestoreError } from './firebase-config.js';

class AlocacaoFinanceiro {
    constructor() {
        this.currentTrainingId = null;
        this.functions = {}; // { id: { nome, valor_diaria, valor_meio_periodo } }
        this.additionals = []; // [ { id, nome, valor_padrao } ]
        this.allocations = [];
        this.staffData = {};
        this.voucherValue = 0;
        this.isLoading = false;
        this.unsubscribeAllocations = null;
        
        // Inicializa metadados assim que carregar o script
        this.loadMetadata();
    }

    async loadMetadata() {
        console.log("Financeiro: Iniciando carregamento de metadados...");
        try {
            // Load Functions
            const funcSnap = await getDocs(collection(db, 'finance_functions'));
            this.functions = {};
            funcSnap.forEach(d => {
                this.functions[d.id] = { id: d.id, ...d.data() };
            });

            // Load Additionals (Bonuses and Voucher)
            const addSnap = await getDocs(collection(db, 'finance_additionals'));
            this.additionals = [];
            addSnap.forEach(d => {
                const data = d.data();
                this.additionals.push({ id: d.id, ...data });
                
                // Tentar identificar o valor do voucher se existir especificamente
                if (data.nome.toLowerCase().includes('voucher') || data.nome.toLowerCase().includes('alimentação')) {
                    this.voucherValue = parseFloat(data.valor_padrao) || 0;
                }
            });

            console.log("Financeiro: Metadados carregados com sucesso", { 
                funcoes: Object.keys(this.functions).length, 
                adicionais: this.additionals.length,
                valorVoucher: this.voucherValue
            });
            
            // Se já tiver uma renderização pendente, re-renderiza
            if (this.allocations.length > 0) this.render();
        } catch (error) {
            console.error("Financeiro: Erro ao carregar metadados:", error);
        }
    }

    async carregarFinanceiro(trainingId) {
        console.log(`Financeiro: Carregando dados para o treinamento ${trainingId}`);
        if (this.currentTrainingId === trainingId && this.unsubscribeAllocations) {
            this.render(); // Reaplica render se já estiver no mesmo treino
            return;
        }
        
        this.currentTrainingId = trainingId;
        if (this.unsubscribeAllocations) this.unsubscribeAllocations();

        // Garante que temos metadados (no caso de falha anterior)
        if (Object.keys(this.functions).length === 0) {
            await this.loadMetadata();
        }
        
        const q = query(collection(db, 'allocations'), where('treinamento_id', '==', trainingId), where('status', '==', 'confirmado'));
        
        this.unsubscribeAllocations = onSnapshot(q, async (snapshot) => {
            console.log(`Financeiro: Recebida atualização de alocados (${snapshot.size} docs)`);
            const tempAllocations = [];
            const staffIds = new Set();
            
            snapshot.forEach(d => {
                const alloc = { id: d.id, ...d.data() };
                tempAllocations.push(alloc);
                staffIds.add(alloc.staff_id);
            });

            // Load staff details for functions
            for (const sid of staffIds) {
                if (!this.staffData[sid]) {
                    const sDoc = await getDoc(doc(db, 'staffs', sid));
                    if (sDoc.exists()) {
                        this.staffData[sid] = sDoc.data();
                    }
                }
            }

            this.allocations = tempAllocations;
            this.render();
        }, (error) => {
            console.error("Financeiro: Erro no onSnapshot de alocações:", error);
            handleFirestoreError(error, 'LIST', 'allocations');
        });
    }

    async aplicarPeriodoGlobal(periodo) {
        for (const alloc of this.allocations) {
            // Se não foi editado manualmente, atualiza
            if (!alloc.finance_is_manual) {
                await this.atualizarAlloc(alloc.id, { 
                    finance_period: periodo 
                });
            }
        }
    }

    async atualizarAlloc(id, dados) {
        try {
            const alloc = this.allocations.find(a => a.id === id);
            if (!alloc) return;

            // Recalcular total se necessário
            const novosDados = { ...dados };
            
            // Se mudou o valor da diária, marca como manual
            if (dados.finance_base_value !== undefined && dados.finance_base_value !== alloc.finance_base_value) {
                novosDados.finance_is_manual = true;
            }

            await updateDoc(doc(db, 'allocations', id), novosDados);
        } catch (error) {
            console.error("Erro ao atualizar financeiro da alocação:", error);
        }
    }

    calcularTotal(alloc) {
        const staff = this.staffData[alloc.staff_id];
        const func = staff ? this.functions[staff.funcaoId] : null;
        
        let base = parseFloat(alloc.finance_base_value);
        
        // Se não tem valor base definido ou não é manual, pega da função e período
        if (isNaN(base) || !alloc.finance_is_manual) {
            const periodo = alloc.finance_period || document.getElementById('financeGlobalPeriod').value || 'cheio';
            if (func) {
                base = periodo === 'meio' ? parseFloat(func.valor_meio_periodo) : parseFloat(func.valor_diaria);
            } else {
                base = 0;
            }
        }

        let bonusVal = 0;
        if (alloc.finance_bonus_id) {
            const add = this.additionals.find(a => a.id === alloc.finance_bonus_id);
            if (add) bonusVal = parseFloat(add.valor_padrao) || 0;
        }

        let voucherVal = 0;
        if (alloc.finance_voucher === 'sim') {
            voucherVal = this.voucherValue;
        }

        return base + bonusVal + voucherVal;
    }

    render() {
        const tbody = document.getElementById('financeStaffTableBody');
        if (!tbody) return;

        if (this.allocations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="padding: 30px; text-align: center; color: #94a3b8;">Nenhum staff confirmado para este treinamento.</td></tr>';
            document.getElementById('financeTotalGeral').innerText = 'R$ 0,00';
            return;
        }

        let totalGeral = 0;

        tbody.innerHTML = this.allocations.map(alloc => {
            const staff = this.staffData[alloc.staff_id] || { nome_completo: 'Staff Desconhecido' };
            const func = staff.funcaoId ? this.functions[staff.funcaoId] : null;
            const funcNome = func ? func.nome : 'Sem Função';
            
            const total = this.calcularTotal(alloc);
            totalGeral += total;

            const baseVal = parseFloat(alloc.finance_base_value) || (alloc.finance_period === 'meio' ? func?.valor_meio_periodo : func?.valor_diaria) || 0;

            const bonusOptions = this.additionals
                .filter(a => a.nome.toLowerCase().startsWith('bonus') || a.nome.toLowerCase().startsWith('bônus'))
                .map(a => `<option value="${a.id}" ${alloc.finance_bonus_id === a.id ? 'selected' : ''}>${a.nome} (R$ ${a.valor_padrao})</option>`)
                .join('');

            return `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 12px;">
                        <div style="font-weight: 600; color: #1e293b;">${staff.nome_completo}</div>
                        <div style="font-size: 0.75rem; color: #64748b;">${funcNome}</div>
                    </td>
                    <td style="padding: 12px;">
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <input type="number" step="0.01" value="${baseVal}" 
                                   style="width: 80px; padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px;"
                                   onchange="window.financeiro.atualizarAlloc('${alloc.id}', { finance_base_value: parseFloat(this.value), finance_is_manual: true })">
                            ${alloc.finance_is_manual ? '<span title="Editado Manualmente" style="background: #e2e8f0; color: #475569; font-size: 10px; padding: 2px 5px; border-radius: 3px; font-weight: bold;">M</span>' : ''}
                        </div>
                    </td>
                    <td style="padding: 12px;">
                        <select style="width: 100%; padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px;"
                                onchange="window.financeiro.atualizarAlloc('${alloc.id}', { finance_bonus_id: this.value })">
                            <option value="">Nenhum</option>
                            ${bonusOptions}
                        </select>
                    </td>
                    <td style="padding: 12px;">
                        <select style="width: 100%; padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px;"
                                onchange="window.financeiro.atualizarAlloc('${alloc.id}', { finance_voucher: this.value })">
                            <option value="nao" ${alloc.finance_voucher !== 'sim' ? 'selected' : ''}>Não</option>
                            <option value="sim" ${alloc.finance_voucher === 'sim' ? 'selected' : ''}>Sim</option>
                        </select>
                    </td>
                    <td style="padding: 12px; text-align: right; font-weight: bold; color: #1e293b;">
                        R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                </tr>
            `;
        }).join('');

        document.getElementById('financeTotalGeral').innerText = `R$ ${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }
}

window.financeiro = new AlocacaoFinanceiro();
export default window.financeiro;

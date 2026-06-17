import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  onSnapshot,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  format, 
  isWithinInterval, 
  startOfDay, 
  endOfDay,
  subDays,
  addDays
} from 'date-fns';
import { AppLayout } from '../components/AppLayout';
import { 
  Search, 
  Calendar as CalendarIcon,
  FileText,
  AlertCircle,
  ArrowUpDown,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Staff {
  id: string;
  nome: string;
  nomeAbreviado: string;
  funcaoId?: string;
}

interface Training {
  id: string;
  nome: string;
  dataEvento: any;
  programa_nb?: string;
  local?: string;
  cidade?: string;
  nome_do_negocio?: string;
}

interface Allocation {
  id: string;
  staff_id: string;
  treinamento_id: string;
  status: string;
  finance_base_value?: number;
  finance_period?: 'cheio' | 'meio';
  finance_voucher?: 'sim' | 'nao';
  finance_voucher_value?: number;
  finance_bonus_id?: string;
  finance_extras?: { id: string; description: string; value: number }[];
}

interface FinancialAdditional {
  id: string;
  nome: string;
  valor_padrao: number;
}

interface FinancialFunction {
  id: string;
  nome: string;
  valor_diaria: number;
}

interface PaymentItem {
  id: string;
  staffName: string;
  staffAbreviado: string;
  eventName: string;
  program: string;
  eventDate: Date;
  functionName: string;
  type: 'Diária' | 'Voucher' | 'Bônus' | 'Extra';
  period: 'Inteira' | 'Meia' | '-';
  value: number;
  allocationId: string;
  extraDescription?: string;
  trainingLocation?: string;
  trainingCity?: string;
  businessName?: string;
}

const normalizeDate = (dateVal: any) => {
  if (!dateVal) return null;
  if (dateVal.toDate && typeof dateVal.toDate === 'function') return dateVal.toDate();
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? null : d;
};

const getRefId = (ref: any): string => {
  if (!ref) return '';
  if (typeof ref === 'string') {
    const s = ref.trim();
    if (s.includes('/')) {
      const parts = s.split('/');
      return String(parts[parts.length - 1]);
    }
    return String(s);
  }
  if (ref.id) return String(ref.id);
  return String(ref).trim();
};

const getPaymentWeeks = (year: number) => {
  const weeks = [];
  let current = new Date(year, 0, 1);
  while (current.getDay() !== 5) {
    current = subDays(current, 1);
  }

  for (let i = 1; i <= 53; i++) {
    const start = startOfDay(current);
    const end = endOfDay(addDays(current, 6)); 
    
    if (start.getFullYear() > year && i > 50) break;

    weeks.push({
      number: i,
      start,
      end,
      label: `Semana ${i} (${format(start, 'dd/MM')} a ${format(end, 'dd/MM')})`
    });
    current = addDays(current, 7);
  }
  return weeks;
};

export const StaffPaymentReport = ({ user: currentUser }: { user?: any }) => {
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [additionals, setAdditionals] = useState<FinancialAdditional[]>([]);
  const [functions, setFunctions] = useState<FinancialFunction[]>([]);
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedWeek, setSelectedWeek] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'name' | 'event'>('name');
  const [searchTerm, setSearchTerm] = useState('');

  const weeks = useMemo(() => getPaymentWeeks(selectedYear), [selectedYear]);

  useEffect(() => {
    const now = new Date();
    const currentWeek = weeks.find(w => isWithinInterval(now, { start: w.start, end: w.end }));
    if (currentWeek) {
      setSelectedWeek(currentWeek.number);
    } else if (weeks.length > 0) {
      setSelectedWeek(weeks[0].number);
    }
  }, [weeks]);

  useEffect(() => {
    const unsubStaffs = onSnapshot(collection(db, 'staffs'), (snap) => {
      setStaffs(snap.docs.map(doc => {
        const d = doc.data() as any;
        return {
          id: doc.id,
          nome: d.nomeCompleto || d.nome_completo || d.nome || d.Nome || 'Sem Nome',
          nomeAbreviado: d.nomeAbreviado || d.nome_abreviado || d.nome_completo || d.nome || d.Abreviado || 'STF',
          funcaoId: d.funcaoId || d.id_funcao || d.funcao || d.id_especialidade
        } as Staff;
      }));
    });
    const unsubTrainings = onSnapshot(collection(db, 'trainings'), (snap) => {
      setTrainings(snap.docs.map(doc => {
        const d = doc.data() as any;
        return {
          ...d,
          id: doc.id,
          nome: d.nome_negocio || d.nomeNegocio || d.negocio || d.nome_do_negocio || d.nome || d.Nome || 'Sem Nome',
          dataEvento: d.dataEvento || d.data_evento || d.data || d.Data || d.data_evento_nb,
          programa_nb: d.programaNb || d.programa_nb || d.programa || d.Programa || d.programa_nb_evento || 'N/A',
          local: d.local || d.local_evento || '-',
          cidade: d.cidade || d.cidade_evento || '-',
          nome_do_negocio: d.nome_do_negocio || d.nome_negocio || d.negocio || '-'
        } as Training;
      }));
    });
    const unsubAllocations = onSnapshot(query(collection(db, 'allocations'), where('status', '==', 'confirmado')), (snap) => {
      setAllocations(snap.docs.map(doc => {
        const d = doc.data() as any;
        return {
          ...d,
          id: doc.id,
          staff_id: getRefId(d.staff_id || d.staffId || d.id_staff || d.staff || d.facilitador_id || d.facilitador || d.staff_ref),
          treinamento_id: getRefId(d.treinamento_id || d.treinamentoId || d.id_treinamento || d.treinamento || d.id_evento || d.evento || d.treinamento_ref)
        } as Allocation;
      }));
    });
    const unsubAdds = onSnapshot(collection(db, 'finance_additionals'), (snap) => {
      setAdditionals(snap.docs.map(d => ({ id: d.id, ...d.data() } as FinancialAdditional)));
    });
    const unsubFuncs = onSnapshot(collection(db, 'finance_functions'), (snap) => {
      setFunctions(snap.docs.map(d => ({ id: d.id, ...d.data() } as FinancialFunction)));
    });

    return () => {
      unsubStaffs();
      unsubTrainings();
      unsubAllocations();
      unsubAdds();
      unsubFuncs();
    };
  }, []);

  const paymentItems = useMemo(() => {
    const activeWeek = weeks.find(w => w.number === selectedWeek);
    if (!activeWeek) return [];

    const items: PaymentItem[] = [];

    allocations.forEach(aloc => {
      const training = trainings.find(t => t.id === aloc.treinamento_id);
      if (!training) return;

      const eventDate = normalizeDate(training.dataEvento);
      if (!eventDate || !isWithinInterval(eventDate, { start: activeWeek.start, end: activeWeek.end })) return;

      const staff = staffs.find(s => s.id === aloc.staff_id);
      const staffFunc = functions.find(f => f.id === staff?.funcaoId);
      
      const baseValue = (aloc.finance_base_value !== undefined && aloc.finance_base_value !== null)
        ? aloc.finance_base_value 
        : (staffFunc?.valor_diaria || 0);
      
      const periodMultiplier = aloc.finance_period === 'meio' ? 0.5 : 1;
      const finalDailyValue = Number(baseValue) * periodMultiplier;

      // Inclui tudo que tenha valor base (mesmo que 0)
      if (baseValue !== undefined) {
        items.push({
          id: `${aloc.id}-daily`,
          staffName: staff?.nome || 'Staff Desconhecido',
          staffAbreviado: staff?.nomeAbreviado || 'STF',
          eventName: training.nome,
          program: training.programa_nb || 'N/A',
          eventDate,
          functionName: staffFunc?.nome || 'N/D',
          type: 'Diária',
          period: aloc.finance_period === 'meio' ? 'Meia' : 'Inteira',
          value: finalDailyValue,
          allocationId: aloc.id,
          trainingLocation: training.local,
          trainingCity: training.cidade,
          businessName: training.nome_do_negocio
        });
      }

      const isVoucherActive = aloc.finance_voucher === 'sim' || training.voucher_alimentacao === 'Sim';
      const genericVoucher = additionals.find(a => a.nome?.toLowerCase() === 'voucher' || a.nome?.toLowerCase().includes('alimentação'));

      if (isVoucherActive) {
        const genericVoucherValue = genericVoucher ? (Number(genericVoucher.valor_padrao) || 0) : 0;
        const vValue = (aloc.finance_voucher_value !== undefined && aloc.finance_voucher_value !== null) 
          ? aloc.finance_voucher_value 
          : genericVoucherValue;

        if (vValue > 0) {
          items.push({
            id: `${aloc.id}-voucher`,
            staffName: staff?.nome || 'Staff Desconhecido',
            staffAbreviado: staff?.nomeAbreviado || 'STF',
            eventName: training.nome,
            program: training.programa_nb || 'N/A',
            eventDate,
            functionName: staffFunc?.nome || 'N/D',
            type: 'Voucher',
            period: '-',
            value: vValue,
            allocationId: aloc.id,
            trainingLocation: training.local,
            trainingCity: training.cidade,
            businessName: training.nome_do_negocio
          });
        }
      }

      if (aloc.finance_bonus_id) {
        const bonus = additionals.find(a => a.id === aloc.finance_bonus_id);
        if (bonus) {
          items.push({
            id: `${aloc.id}-bonus`,
            staffName: staff?.nome || 'Staff Desconhecido',
            staffAbreviado: staff?.nomeAbreviado || 'STF',
            eventName: training.nome,
            program: training.programa_nb || 'N/A',
            eventDate,
            functionName: staffFunc?.nome || 'N/D',
            type: 'Bônus',
            period: '-',
            value: bonus.valor_padrao || 0,
            allocationId: aloc.id,
            trainingLocation: training.local,
            trainingCity: training.cidade,
            businessName: training.nome_do_negocio
          });
        }
      }

      // NOVO: Adicionais Extras
      if (aloc.finance_extras && aloc.finance_extras.length > 0) {
        aloc.finance_extras.forEach((extra: any) => {
          items.push({
            id: `${aloc.id}-extra-${extra.id}`,
            staffName: staff?.nome || 'Staff Desconhecido',
            staffAbreviado: staff?.nomeAbreviado || 'STF',
            eventName: training.nome,
            program: training.programa_nb || 'N/A',
            eventDate,
            functionName: staffFunc?.nome || 'N/D',
            type: 'Extra',
            period: '-',
            value: Number(extra.value) || 0,
            allocationId: aloc.id,
            extraDescription: extra.description,
            trainingLocation: training.local,
            trainingCity: training.cidade,
            businessName: training.nome_do_negocio
          });
        });
      }
    });

    const filtered = items.filter(item => 
      item.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.program.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.staffName.localeCompare(b.staffName) || a.eventDate.getTime() - b.eventDate.getTime();
      } else {
        return a.eventName.localeCompare(b.eventName) || a.staffName.localeCompare(b.staffName);
      }
    });
  }, [allocations, trainings, staffs, additionals, functions, selectedWeek, weeks, searchTerm, sortBy]);

  const totalValue = useMemo(() => paymentItems.reduce((acc, item) => acc + item.value, 0), [paymentItems]);

  const groupedItems = useMemo(() => {
    const groups: { [key: string]: PaymentItem[] } = {};
    paymentItems.forEach(item => {
      const key = sortBy === 'name' ? item.staffName : item.eventName;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [paymentItems, sortBy]);

  const handleExportCSV = () => {
    // Organiza por staff para o CSV, indiferente do sortBy da tela se o usuário quiser fixo por staff na exportação
    const groups: { [key: string]: PaymentItem[] } = {};
    paymentItems.forEach(item => {
      const key = item.staffName;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    const csvRows = [];
    // Header
    csvRows.push(['NOME DO STAFF', 'FUNÇÃO', 'VALOR', '', 'DETALHES DO EVENTO'].join(';'));

    Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0])).forEach(([staffName, items]) => {
      items.forEach(item => {
        const functionLabel = item.type === 'Extra' ? item.extraDescription : (item.type === 'Diária' ? item.functionName : item.type);
        const concatenated = `${item.businessName}_${format(item.eventDate, 'dd/MM/yyyy')}_ ${item.trainingLocation} _${item.trainingCity}`;
        
        csvRows.push([
          staffName.toUpperCase(),
          functionLabel?.toUpperCase() || '-',
          item.value.toFixed(2).replace('.', ','),
          '',
          concatenated.toUpperCase()
        ].join(';'));
      });
      // Pular linha entre staffs
      csvRows.push(['', '', '', '', ''].join(';'));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const fileName = `pagamento_staffs_semana_${selectedWeek}_${selectedYear}.csv`;
    
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(n => n.length > 0)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <AppLayout user={currentUser}>
      <div className="flex-1 flex flex-col min-h-0">
        <div className="w-full space-y-6">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-black text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-emerald-500 rounded-xl text-white">
                  <FileText size={20} />
                </div>
                RELATÓRIO DE PAGAMENTO STAFFS
              </h1>
              <p className="text-slate-500 font-bold ml-11 text-[10px] uppercase tracking-wider">Ciclo Semanal: Sexta a Quinta</p>
            </div>

            <div className="flex items-center gap-2">
               <div className="bg-emerald-600 px-6 py-3 rounded-2xl shadow-lg border-2 border-emerald-500">
                  <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest text-center">Total Geral</p>
                  <p className="text-2xl font-black text-white tabular-nums">
                     R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
               </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-3xl border-2 border-slate-100 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 flex items-center gap-1.5">
                  <CalendarIcon size={12} /> Ano
                </label>
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full h-11 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {[selectedYear - 1, selectedYear, selectedYear + 1].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-1 space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 flex items-center gap-1.5">
                  <FileText size={12} /> Semana de Pagamento
                </label>
                <select 
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                  className="w-full h-11 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {weeks.map(w => (
                    <option key={w.number} value={w.number}>{w.label}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-1 space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 flex items-center gap-1.5">
                  <Search size={12} /> Buscar Staff ou Evento
                </label>
                <input 
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ex: Fulano ou Treinamento XP"
                  className="w-full h-11 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-slate-400 uppercase ml-2 flex items-center gap-1.5">
                  <ArrowUpDown size={12} /> Ordenar por
                </label>
                <div className="flex bg-slate-100 rounded-2xl p-1 h-11">
                  <button 
                    onClick={() => setSortBy('name')}
                    className={`flex-1 rounded-xl text-[10px] font-black uppercase transition-all ${sortBy === 'name' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Staff
                  </button>
                  <button 
                    onClick={() => setSortBy('event')}
                    className={`flex-1 rounded-xl text-[10px] font-black uppercase transition-all ${sortBy === 'event' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Evento
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[32px] border-2 border-slate-100 shadow-xl overflow-hidden min-h-[400px]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b-2 border-slate-100">
                    <th className="px-6 py-2.5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 sticky left-0 z-10 w-[200px]">
                      {sortBy === 'name' ? 'Evento / Treinamento' : 'Staff / Função'}
                    </th>
                    <th className="px-6 py-2.5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">
                      {sortBy === 'name' ? 'Função / Detalhes' : 'Evento / Detalhes'}
                    </th>
                    <th className="px-6 py-2.5 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                    <th className="px-6 py-2.5 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                    <th className="px-6 py-2.5 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest">Período</th>
                    <th className="px-6 py-2.5 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {(Object.entries(groupedItems) as [string, PaymentItem[]][]).map(([groupName, items]) => (
                      <React.Fragment key={groupName}>
                        {/* SECTION HEADER */}
                        <tr className="bg-slate-800">
                          <td colSpan={6} className="px-6 py-2.5 border-y border-slate-700">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-black text-white border border-white/10 shadow-sm">
                                  {getInitials(groupName)}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">
                                    {sortBy === 'name' ? 'EQUIPE' : 'TREINAMENTO'}
                                  </span>
                                  <span className="text-[14px] font-black text-white uppercase tracking-tight leading-none">
                                    {groupName}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-6">
                                <div className="flex flex-col items-end">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total do Grupo</span>
                                  <span className="text-[13px] font-black text-emerald-400 tabular-nums leading-none">
                                    R$ {items.reduce((sum, i) => sum + i.value, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div className="h-8 w-px bg-slate-700"></div>
                                <div className="flex flex-col items-end">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Lançamentos</span>
                                  <span className="text-[13px] font-black text-white tabular-nums leading-none">
                                    {items.length}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>

                        {items.map((item) => (
                          <motion.tr 
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            key={item.id} 
                            className="hover:bg-slate-50/50 transition-colors group"
                          >
                            <td className="px-6 py-1.5 sticky left-0 bg-white group-hover:bg-slate-50/50 transition-colors z-10 border-r border-slate-100/50">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white ${
                                  item.type === 'Diária' ? 'bg-indigo-500' : 
                                  item.type === 'Voucher' ? 'bg-purple-500' : 
                                  item.type === 'Bônus' ? 'bg-emerald-500' : 'bg-blue-500'
                                }`}>
                                  {getInitials(sortBy === 'name' ? item.eventName : item.staffName)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[12px] font-black text-slate-800 uppercase leading-none truncate">
                                    {sortBy === 'name' ? item.eventName : item.staffName}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-1.5">
                              <p className="text-[12px] font-black text-slate-700 uppercase leading-tight truncate">
                                {sortBy === 'name' ? item.functionName : item.eventName}
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase truncate">
                                {sortBy === 'name' ? 'DIÁRIA' : item.program}
                              </p>
                            </td>
                            <td className="px-6 py-1.5 text-center">
                              <p className="text-[11px] font-bold text-slate-600 uppercase tabular-nums whitespace-nowrap">
                                {format(item.eventDate, 'dd/MM/yyyy')}
                              </p>
                            </td>
                            <td className="px-6 py-1.5 text-center">
                              <div className={`inline-flex px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                                item.type === 'Diária' ? 'bg-blue-100 text-blue-700' :
                                item.type === 'Voucher' ? 'bg-purple-100 text-purple-700' :
                                item.type === 'Bônus' ? 'bg-emerald-100 text-emerald-700' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {item.type === 'Extra' ? item.extraDescription : item.type}
                              </div>
                            </td>
                            <td className="px-6 py-1.5 text-center">
                              <span className={`text-[11px] font-bold uppercase ${item.period === 'Meia' ? 'text-amber-600' : 'text-slate-400'}`}>
                                {item.period}
                              </span>
                            </td>
                            <td className="px-6 py-1.5 text-right">
                              <p className={`text-[13px] font-black tabular-nums ${
                                item.type === 'Diária' ? 'text-slate-900' : 
                                item.type === 'Voucher' ? 'text-purple-600' : 
                                item.type === 'Bônus' ? 'text-emerald-600' : 'text-blue-600'
                              }`}>
                                R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            </td>
                          </motion.tr>
                        ))}
                        
                        {/* GROUP SUB-TOTAL */}
                        <tr className="bg-slate-50/30">
                          <td colSpan={5} className="px-6 py-2 text-right">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtotal:</span>
                          </td>
                          <td className="px-6 py-2 text-right">
                            <span className="text-[11px] font-black text-slate-800 tabular-nums">
                              R$ {items.reduce((sum, i) => sum + i.value, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                  
                  {paymentItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-4 bg-slate-50 rounded-full text-slate-300">
                            <AlertCircle size={48} />
                          </div>
                          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nenhum pagamento encontrado para este período.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4 px-2">
             <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <div className="flex items-center gap-1.5">
                   <div className="w-2 h-2 rounded-full bg-blue-500"></div> Diária
                </div>
                <div className="flex items-center gap-1.5">
                   <div className="w-2 h-2 rounded-full bg-purple-500"></div> Voucher
                </div>
                <div className="flex items-center gap-1.5">
                   <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Bônus
                </div>
                <div className="flex items-center gap-1.5">
                   <div className="w-2 h-2 rounded-full bg-blue-500"></div> Extras
                </div>
             </div>
             
             <button 
               onClick={handleExportCSV}
               className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-slate-800 transition-all shadow-lg"
             >
                <Download size={14} /> Exportar Relatório
             </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

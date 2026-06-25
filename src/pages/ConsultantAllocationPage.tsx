import React, { useEffect, useState, useMemo } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc,
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppLayout } from '../components/AppLayout';
import { usePagePermission } from '../lib/permissions';
import { TrainingFormModal } from '../components/TrainingFormModal';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  UserPlus,
  X,
  Download,
  CheckCircle2,
  Clock,
  Unlock,
  MessageSquare,
  User,
  XCircle,
  Plane,
  Copy,
  Check,
  FileImage,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isSameMonth,
  startOfWeek,
  endOfWeek,
  addDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import * as htmlToImage from 'html-to-image';

// Tipos
interface Training {
  id: string;
  nomeNegocio: string;
  cliente?: string;
  dataEvento: any;
  etapa: string;
  cidade?: string;
  programa?: string;
  programaNb?: string;
  participantes?: number;
  localEvento?: string;
  dateOffsets?: any[];
  offset?: number;
  baseOpLabel?: string;
  opLabel?: string;
}

interface Staff {
  id: string;
  nomeCompleto: string;
  nomeAbreviado: string;
  ativo: string;
  funcaoId?: string;
}

interface Allocation {
  id: string;
  staff_id: string;
  treinamento_id?: string;
  data_alocacao: any;
  status: string;
  observacao?: string;
  type?: 'formal' | 'daily'; // Used for UI distinction
}

const normalizeDate = (dateVal: any) => {
  if (!dateVal) return null;
  let d: Date;

  if (dateVal.toDate && typeof dateVal.toDate === 'function') {
    d = dateVal.toDate();
  } else if (dateVal instanceof Date) {
    d = new Date(dateVal);
  } else if (dateVal && typeof dateVal.seconds === 'number') {
    d = new Date(dateVal.seconds * 1000);
  } else if (typeof dateVal === 'number') {
    d = new Date(dateVal > 9999999999 ? dateVal : dateVal * 1000);
  } else if (typeof dateVal === 'string') {
    const parts = dateVal.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
      } else {
        d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]), 12, 0, 0);
      }
    } else {
      d = new Date(dateVal);
    }
  } else {
    d = new Date(dateVal);
  }
  
  if (isNaN(d.getTime())) return null;
  d.setHours(12, 0, 0, 0);
  return d;
};

const getRefId = (ref: any): string => {
  if (!ref) return '';
  if (typeof ref === 'string') return ref.trim();
  if (ref.id) return String(ref.id).trim();
  if (ref._key && ref._key.path && ref._key.path.segments) {
    return ref._key.path.segments[ref._key.path.segments.length - 1];
  }
  return String(ref).trim();
};

export const ConsultantAllocationPage = ({ user }: { user?: any }) => {
  const { canWrite } = usePagePermission('alocacao-consultores', user);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [financeFunctions, setFinanceFunctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataReady, setDataReady] = useState({
    trainings: false,
    staffs: false,
    funcs: false,
    allocations: false
  });

  // Modal State
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(true);
  const [editingTrainingIdModal, setEditingTrainingIdModal] = useState<string | null>(null);

  // Export Modal States
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportConsultantId, setExportConsultantId] = useState('');
  const [exportStartDate, setExportStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [copiedImage, setCopiedImage] = useState(false);
  const [exportingImage, setExportingImage] = useState(false);
  const imageTableRef = React.useRef<HTMLDivElement>(null);

  // Filter allocations for selected consultant, starting from exportStartDate
  const exportFilteredAllocations = useMemo(() => {
    if (!exportConsultantId) return [];
    const startD = normalizeDate(exportStartDate);
    if (!startD) return [];

    const filtered = allocations.filter(al => {
      if (al.staff_id !== exportConsultantId) return false;
      const aDate = normalizeDate(al.data_alocacao);
      if (!aDate) return false;
      return aDate >= startD;
    });

    // Sort ascending by date
    return filtered.sort((a, b) => {
      const da = normalizeDate(a.data_alocacao);
      const db = normalizeDate(b.data_alocacao);
      if (!da || !db) return 0;
      return da.getTime() - db.getTime();
    });
  }, [allocations, exportConsultantId, exportStartDate]);

  const selectedExportStaff = useMemo(() => {
    return staffs.find(s => s.id === exportConsultantId);
  }, [staffs, exportConsultantId]);

  const monthlyStats = useMemo(() => {
    const uniqueConfirmados = new Set<string>();
    const uniqueRealizados = new Set<string>();
    const uniqueAConfirmar = new Set<string>();

    trainings.forEach(t => {
      const tDate = normalizeDate(t.dataEvento);
      if (tDate && isSameMonth(tDate, currentDate)) {
        const e = (t.etapa || '').trim().toLowerCase();
        const trainingId = t.id || '';
        if (e === 'confirmado' || e === 'confirmada') {
          if (trainingId) uniqueConfirmados.add(trainingId);
        } else if (e === 'realizado' || e === 'realizada' || e === 'concluído' || e === 'concluido') {
          if (trainingId) uniqueRealizados.add(trainingId);
        } else {
          if (trainingId) uniqueAConfirmar.add(trainingId);
        }
      }
    });

    return {
      confirmados: uniqueConfirmados.size,
      realizados: uniqueRealizados.size,
      aConfirmar: uniqueAConfirmar.size
    };
  }, [trainings, currentDate]);

  const handleExportToExcel = () => {
    if (sortedStaffs.length > 0) {
      setExportConsultantId(sortedStaffs[0].id);
    }
    setIsExportModalOpen(true);
  };

    const handleDownloadExcel = async () => {
    if (exportFilteredAllocations.length === 0) {
      alert("Nenhuma alocação encontrada para exportar no período selecionado.");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Alocações');

    // Define columns
    worksheet.columns = [
      { header: 'Data', key: 'data', width: 15 },
      { header: 'Consultor', key: 'consultor', width: 25 },
      { header: 'Status de Alocação', key: 'status', width: 22 },
      { header: 'Detalhes do Treinamento (Cliente, Local, Cidade)', key: 'detalhes', width: 55 }
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.font = {
        name: 'Segoe UI',
        family: 4,
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' }
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' } // Professional Navy Blue
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: false
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF1E3A8A' } },
        left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        bottom: { style: 'medium', color: { argb: 'FF334155' } },
        right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
      };
    });

    // Populate rows
    exportFilteredAllocations.forEach(al => {
      const dDate = normalizeDate(al.data_alocacao);
      const dateStr = dDate ? format(dDate, 'dd/MM/yyyy') : '---';
      const consultantName = selectedExportStaff ? (selectedExportStaff.nomeAbreviado || selectedExportStaff.nomeCompleto) : '---';
      
      const rawStatus = (al.status || '').toLowerCase().trim();
      let statusLabel = rawStatus;
      
      let fillBg = 'FFFFFFFF';
      let textColor = 'FF000000';

      switch (rawStatus) {
        case 'confirmado':
          statusLabel = 'Confirmado';
          fillBg = 'FFE6F7ED'; // Soft emerald bg
          textColor = 'FF047857'; // emerald text
          break;
        case 'pre_reserva':
          statusLabel = 'Pré-Reserva';
          fillBg = 'FFFFF7ED'; // orange bg
          textColor = 'FFC2410C'; // orange text
          break;
        case 'data_liberada':
          statusLabel = 'Data Liberada';
          fillBg = 'FFF1F5F9'; // slate-100 bg
          textColor = 'FF475569'; // slate text
          break;
        case 'whatsapp':
          statusLabel = 'Contato via WhatsApp';
          fillBg = 'FFE6FBF7'; // teal bg
          textColor = 'FF0F766E'; // teal text
          break;
        case 'pessoalmente':
          statusLabel = 'Contato Pessoalmente';
          fillBg = 'FFE0F2FE'; // sky bg
          textColor = 'FF0369A1'; // sky text
          break;
        case 'deslocamento':
          statusLabel = 'Deslocamento';
          fillBg = 'FFEEF2FF'; // indigo bg
          textColor = 'FF4338CA'; // indigo text
          break;
        case 'recusado':
          statusLabel = 'Recusado';
          fillBg = 'FFFEF2FF'; // rose-50 bg
          textColor = 'FFBE123C'; // rose-700 text
          break;
        case 'intencao':
        case 'pendencia':
          statusLabel = 'Pendência';
          fillBg = 'FFFAFAFA'; // zinc-50 bg
          textColor = 'FF3F3F46'; // zinc-700 text
          break;
        default:
          statusLabel = al.status ? (al.status.charAt(0).toUpperCase() + al.status.slice(1)) : '---';
          fillBg = 'FFF8FAFC';
          textColor = 'FF475569';
          break;
      }

      let concatenatedDetails = '-';
      if (al.type !== 'daily' && al.treinamento_id) {
        const t = trainings.find(tr => tr.id === al.treinamento_id);
        if (t) {
          const client = t.cliente || t.nomeNegocio || '';
          const local = t.localEvento || t.local_evento || '';
          const city = t.cidade || t.local_cidade || '';
          const str = [client, local, city].filter(p => p && p.trim() !== '').join(', ');
          if (str.trim()) {
            concatenatedDetails = str;
          }
        }
      }

      const row = worksheet.addRow({
        data: dateStr,
        consultor: consultantName,
        status: statusLabel,
        detalhes: concatenatedDetails
      });

      row.height = 22;

      row.eachCell((cell, colNumber) => {
        cell.font = {
          name: 'Segoe UI',
          size: 10,
          color: { argb: 'FF334155' }
        };

        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };

        if (colNumber === 1 || colNumber === 3) {
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
        }

        if (colNumber === 3) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: fillBg }
          };
          cell.font = {
            name: 'Segoe UI',
            size: 10,
            bold: true,
            color: { argb: textColor }
          };
        }
      });
    });

    // Auto-fit widths with limits
    worksheet.columns.forEach((col) => {
      let maxLen = col.header ? col.header.length : 12;
      col.eachCell({ includeEmpty: false }, (cell) => {
        const valStr = String(cell.value || '');
        if (valStr.length > maxLen) {
          maxLen = valStr.length;
        }
      });
      col.width = Math.min(65, Math.max(col.width || 12, maxLen + 4));
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const namePrefix = selectedExportStaff ? (selectedExportStaff.nomeAbreviado || selectedExportStaff.nomeCompleto).replace(/\s+/g, '_') : 'Consultor';
    const fileName = `Alocacoes_${namePrefix}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyAsImage = async () => {
    if (!imageTableRef.current) return;
    setExportingImage(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const blob = await htmlToImage.toBlob(imageTableRef.current, {
        pixelRatio: 2.5,
        backgroundColor: '#FFFFFF',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          width: '800px'
        }
      });
      if (!blob) {
        alert("Erro ao obter blob da imagem.");
        setExportingImage(false);
        return;
      }
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob
          })
        ]);
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2500);
      } catch (err) {
        console.error("Clipboard API failure, trying fallback:", err);
        alert("A área de transferência foi bloqueada por restrição de segurança no navegador. Por favor, clique em 'Salvar Imagem (PNG)' para baixar o arquivo diretamente!");
      }
      setExportingImage(false);
    } catch (error) {
      console.error(error);
      alert("Erro ao rasterizar alocações em imagem.");
      setExportingImage(false);
    }
  };

  const handleSaveAsImage = async () => {
    if (!imageTableRef.current) return;
    setExportingImage(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const dataUrl = await htmlToImage.toPng(imageTableRef.current, {
        pixelRatio: 2.5,
        backgroundColor: '#FFFFFF',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          width: '800px'
        }
      });
      const namePrefix = selectedExportStaff ? (selectedExportStaff.nomeAbreviado || selectedExportStaff.nomeCompleto).replace(/\s+/g, '_') : 'Consultor';
      const fileName = `Alocacoes_${namePrefix}_${format(new Date(), 'yyyyMMdd_HHmmss')}.png`;

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setExportingImage(false);
    } catch (error) {
      console.error(error);
      alert("Erro ao gravar imagem localmente.");
      setExportingImage(false);
    }
  };

  useEffect(() => {
    // Buscar Treinamentos
    const qTrainings = query(collection(db, 'trainings'));
    const unsubTrainings = onSnapshot(qTrainings, (snap) => {
      const list = snap.docs.map(doc => {
        const d = doc.data();
        return { 
          id: doc.id, 
          ...d,
          dataEvento: d.dataEvento || d.data_evento || d.data || d.Data,
          nomeNegocio: d.nomeNegocio || d.nome_negocio || d.cliente || d.negocio || 'Sem Nome',
          cliente: d.cliente || d.nome_cliente || d.empresa || d.nomeNegocio || d.nome_negocio || 'Sem Cliente',
          programaNb: d.programaNb || d.programa_nb || d.atividade || d.programa || d.programa_nb_evento || d.programa || '',
          participantes: Number(d.participantes || d.qtd_participantes || d.numero_participantes || d.qtd_part || 0),
          localEvento: d.localEvento || d.local_evento || d.local || d.local_evento_nb || '',
          cidade: d.cidade || d.cidade_evento || d.municipio || d.local_cidade || ''
        } as Training;
      });
      
      // Ocultar os que são cancelados, não realizados ou suspensos
      const filtered = list.filter(t => {
        const s = String(t.etapa || '').toLowerCase().trim();
        const isExcluded = 
          s === 'cancelado' || 
          s === 'cancelada' || 
          s === 'suspenso' || 
          s === 'suspensa' || 
          s === 'não realizado' || 
          s === 'nao realizado' || 
          s === 'não realizada' || 
          s === 'nao realizada';
        return !isExcluded;
      });

      const expandedList: Training[] = [];
      filtered.forEach(t => {
        const hasExtraDates = Array.isArray(t.dateOffsets) && t.dateOffsets.some(item => {
          if (typeof item === 'number') return item !== 0;
          if (item && typeof item === 'object' && typeof item.offset === 'number') return item.offset !== 0;
          return false;
        });
        const bLabel = hasExtraDates ? (t.baseOpLabel || 'Op 1') : '';
        expandedList.push({
          ...t,
          offset: 0,
          opLabel: bLabel
        });

        if (Array.isArray(t.dateOffsets)) {
          t.dateOffsets.forEach((item, index) => {
            let offsetNum = 0;
            let opLabel = '';
            if (typeof item === 'number') {
              offsetNum = item;
              opLabel = `Op ${index + 2}`;
            } else if (item && typeof item === 'object' && typeof item.offset === 'number') {
              offsetNum = item.offset;
              opLabel = item.opLabel || `Op ${index + 2}`;
            }

            if (offsetNum !== 0) {
              const baseD = normalizeDate(t.dataEvento);
              if (baseD) {
                const dOffset = addDays(baseD, offsetNum);
                expandedList.push({
                  ...t,
                  dataEvento: dOffset,
                  offset: offsetNum,
                  opLabel: opLabel
                });
              }
            }
          });
        }
      });

      setTrainings(expandedList);
      setDataReady(prev => ({ ...prev, trainings: true }));
    });

    // Buscar Staffs (Consultores e outros)
    const qStaffs = query(collection(db, 'staffs'));
    const unsubStaffs = onSnapshot(qStaffs, (snap) => {
      const list = snap.docs.map(doc => {
        const d = doc.data() as any;
        const fId = getRefId(d.funcaoId || d.id_funcao || d.idFuncao || d._funcaoId);
        return {
          id: doc.id,
          nomeCompleto: d.nomeCompleto || d.nome_completo || d.nome || "Sem Nome",
          nomeAbreviado: d.nomeAbreviado || d.nome_abreviado || d.nome_completo || d.nome || "Sem Nome",
          ativo: String(d.ativo || "sim").toLowerCase(),
          funcaoId: fId,
        } as Staff;
      });
      // Filtrar apenas ativos
      const actives = list.filter(s => s.ativo === 'sim' || s.ativo === 'true');
      setStaffs(actives);
      setDataReady(prev => ({ ...prev, staffs: true }));
    });

    // Buscar Funções
    const qFuncs = query(collection(db, 'finance_functions'));
    const unsubFuncs = onSnapshot(qFuncs, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFinanceFunctions(list);
      setDataReady(prev => ({ ...prev, funcs: true }));
    });

    // Buscar Alocações (Unificadas)
    const qAllocations = query(collection(db, 'allocations'));
    const unsubAllocations = onSnapshot(qAllocations, (snap) => {
      const list = snap.docs.map(doc => {
        const d = doc.data();
        const trId = getRefId(d.treinamento_id || d.treinamentoId || d.id_treinamento || d.treinamento || d.id_evento || d.id_projeto || d.projeto_id);
        
        // Se tem treinamento_id, é formal. Se não, é daily (pool)
        const type = trId ? 'formal' : 'daily';
        
        return { 
          id: doc.id, 
          ...d,
          staff_id: getRefId(d.staff_id || d.staffId || d.id_staff || d.staff || d.facilitador_id),
          treinamento_id: trId,
          data_alocacao: d.data_alocacao || d.data_referencia || d.dataAlocacao || d.data || d.Data || d.data_evento,
          status: String(d.status || d.Status || '').toLowerCase().trim(),
          type
        } as Allocation;
      });
      setAllocations(list);
      setDataReady(prev => ({ ...prev, allocations: true }));
    });

    return () => {
      unsubTrainings();
      unsubStaffs();
      unsubFuncs();
      unsubAllocations();
    };
  }, []);

  useEffect(() => {
    if (Object.values(dataReady).every(v => v === true)) {
      setLoading(false);
    }
  }, [dataReady]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  // Staffs filtrados (apenas consultores) e ordenados
  const sortedStaffs = React.useMemo(() => {
    return staffs.filter(s => {
      const fid = s.funcaoId;
      if (!fid) return false;
      const func = financeFunctions.find(f => f.id === fid);
      if (!func) return false;
      const funcName = (func.nome || func.Nome || '').toLowerCase();
      // Filtro rigoroso: deve conter a palavra consultor
      return funcName.includes('consultor');
    }).sort((a, b) => {
      const nameA = a.nomeAbreviado || a.nomeCompleto || '';
      const nameB = b.nomeAbreviado || b.nomeCompleto || '';
      return nameA.localeCompare(nameB);
    });
  }, [staffs, financeFunctions]);

  // Pre-calculate consultant IDs for fast lookup
  const consultantIds = React.useMemo(() => new Set(sortedStaffs.map(s => s.id)), [sortedStaffs]);

  const getStaffStatusColor = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    switch (s) {
      case 'confirmado':
        return 'bg-emerald-100 border-emerald-300 text-emerald-800';
      case 'pre_reserva':
        return 'bg-orange-100 border-orange-300 text-orange-850';
      case 'whatsapp':
        return 'bg-teal-100 border-teal-300 text-teal-850';
      case 'pessoalmente':
        return 'bg-sky-100 border-sky-300 text-sky-850';
      case 'deslocamento':
        return 'bg-indigo-100 border-indigo-300 text-indigo-850';
      case 'data_liberada':
        return 'bg-slate-100 border-slate-250 text-slate-700';
      case 'recusado':
        return 'bg-rose-100 border-rose-300 text-rose-850';
      default:
        return 'bg-zinc-100 border-zinc-250 text-zinc-600';
    }
  };

  const getStaffStatusColorModal = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    switch (s) {
      case 'confirmado':
        return 'bg-emerald-50/80 border-emerald-200 text-emerald-800';
      case 'pre_reserva':
        return 'bg-orange-50/80 border-orange-200 text-orange-800';
      case 'whatsapp':
        return 'bg-teal-50/80 border-teal-200 text-teal-850';
      case 'pessoalmente':
        return 'bg-sky-50/80 border-sky-200 text-sky-850';
      case 'deslocamento':
        return 'bg-indigo-50/80 border-indigo-200 text-indigo-850';
      case 'data_liberada':
        return 'bg-slate-50 border-slate-200 text-slate-700';
      case 'recusado':
        return 'bg-rose-50 border-rose-200 text-rose-800';
      default:
        return 'bg-zinc-50 border-zinc-200 text-zinc-700';
    }
  };

  const getStaffStatusColorSelect = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    switch (s) {
      case 'confirmado':
        return 'bg-emerald-100 border-emerald-300 text-emerald-950';
      case 'pre_reserva':
        return 'bg-orange-100 border-orange-300 text-orange-950';
      case 'whatsapp':
        return 'bg-teal-100 border-teal-300 text-teal-950';
      case 'pessoalmente':
        return 'bg-sky-100 border-sky-300 text-sky-950';
      case 'deslocamento':
        return 'bg-indigo-100 border-indigo-300 text-indigo-950';
      case 'data_liberada':
        return 'bg-slate-100 border-slate-300 text-slate-800';
      case 'recusado':
        return 'bg-rose-100 border-rose-300 text-rose-950';
      default:
        return 'bg-zinc-150 border-zinc-300 text-zinc-800';
    }
  };

  const getStaffStatusLabel = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    switch (s) {
      case 'confirmado': return 'Confirmado';
      case 'pre_reserva': return 'Pré-Reserva';
      case 'whatsapp': return 'Chamado no Zap';
      case 'pessoalmente': return 'Pessoalmente';
      case 'deslocamento': return 'Deslocamento';
      case 'data_liberada': return 'Data Liberada';
      case 'recusado': return 'Recusado';
      case 'intencao': return 'Intenção';
      default: return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pendente';
    }
  };

  const renderStatusIcon = (status: string, size = 12, className = "shrink-0") => {
    const s = (status || '').toLowerCase().trim();
    switch (s) {
      case 'confirmado':
        return <CheckCircle2 size={size} className={className} />;
      case 'pre_reserva':
        return <Clock size={size} className={className} />;
      case 'whatsapp':
        return <MessageSquare size={size} className={className} />;
      case 'pessoalmente':
        return <User size={size} className={className} />;
      case 'deslocamento':
        return <Plane size={size} className={className} />;
      case 'data_liberada':
        return <Unlock size={size} className={className} />;
      case 'recusado':
        return <XCircle size={size} className={className} />;
      default:
        return <Clock size={size} className={className} />;
    }
  };

  // Determine card color based on stage
  const getTrainingColorClass = (etapa: string) => {
    const e = (etapa || '').trim().toLowerCase();
    if (e === 'confirmado' || e === 'confirmada') return 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-800';
    if (e === 'realizado' || e === 'realizada' || e === 'concluído' || e === 'concluido') return 'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-800';
    if (['cancelado', 'cancelada', 'suspenso', 'suspensa', 'não realizado', 'nao realizado', 'não realizada', 'nao realizada'].includes(e)) return 'bg-red-50 border-red-200 hover:bg-red-100 text-red-800';
    return 'bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-800';
  };

  // Build card staff label "Silvia + Cambises + 5 stf"
  const getCardStaffLabel = (trainingAllocations: Allocation[]) => {
    if (trainingAllocations.length === 0) return '0 ALOC';

    const allocatedStaffs = trainingAllocations
      .map(al => staffs.find(s => s.id === al.staff_id))
      .filter(Boolean) as Staff[];

    // Find consultants among them
    const consultants = allocatedStaffs.filter(s => {
      const fn = financeFunctions.find(f => f.id === s.funcaoId)?.nome?.toLowerCase() || '';
      return fn.includes('consultor');
    });

    const standardStaffsCount = allocatedStaffs.length - consultants.length;

    let parts = consultants.map(c => {
      const name = c.nomeAbreviado || c.nomeCompleto || '';
      return name.split(' ')[0]; // first name only
    });

    if (standardStaffsCount > 0) {
      parts.push(`${standardStaffsCount} stf`);
    }

    if (parts.length === 0 && standardStaffsCount === 0) {
      return `${trainingAllocations.length} ALOC`; // fallback
    }

    return parts.join(' + ');
  };

  // Gera dias do calendário
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Domingo
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 }); // Sábado
  
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const getTrainingsForDay = (date: Date) => {
    return trainings.filter(t => {
      const tDate = normalizeDate(t.dataEvento);
      if (!tDate) return false;
      return isSameDay(tDate, date);
    });
  };

  const getAllocationsForTraining = (trainingId: string) => {
    return allocations.filter(a => a.treinamento_id === trainingId && consultantIds.has(getRefId(a.staff_id)));
  };

  const handleAddConsultantToDay = async (staffId: string) => {
    if (!canWrite) {
      alert("Acesso negado: Você não possui a permissão de escrita necessária.");
      return;
    }
    if (!selectedDate || !staffId) return;
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const newRef = doc(collection(db, 'allocations'));
      await setDoc(newRef, {
        staff_id: staffId,
        treinamento_id: '', // Empty means Pool/Daily
        data_alocacao: dateStr,
        status: 'pre_reserva',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error adding to day', err);
      alert('Erro ao alocar no dia');
    }
  };

  const handleUpdateAssignment = async (
    staffId: string, 
    oldDocType: 'daily' | 'formal', 
    oldDocId: string, 
    newTargetType: 'daily' | 'formal', 
    newTrainingId: string, 
    status: string
  ) => {
    if (!canWrite) {
      alert("Acesso negado: Você não possui a permissão de escrita necessária.");
      return;
    }
    if (!selectedDate) return;
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Now everything is in 'allocations', we just update the fields
      await updateDoc(doc(db, 'allocations', oldDocId), { 
        treinamento_id: newTargetType === 'formal' ? newTrainingId : '', 
        data_alocacao: dateStr, // Ensure date matches selected day
        status, 
        updatedAt: serverTimestamp() 
      });
    } catch (err) {
      console.error('Error updating assignment', err);
    }
  };

  // State for confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleRemoveAssignment = async (docType: 'daily' | 'formal', docId: string) => {
    if (!canWrite) {
      alert("Acesso negado: Você não possui a permissão de escrita necessária.");
      return;
    }
    if (!docId) return;
    try {
      await deleteDoc(doc(db, 'allocations', docId));
      setDeleteConfirmId(null);
    } catch (err: any) {
      console.error('Error deleting assignment', err);
      alert('Erro ao excluir alocação');
    }
  };

  const handleUpdateObservation = async (docType: 'daily' | 'formal', docId: string, observacao: string) => {
    if (!canWrite) {
      alert("Acesso negado: Você não possui a permissão de escrita necessária.");
      return;
    }
    try {
      await updateDoc(doc(db, 'allocations', docId), { observacao, updatedAt: serverTimestamp() });
    } catch (err) {
      console.error('Error updating observation', err);
    }
  };

  return (
    <AppLayout user={user}>
      <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between p-4 gap-4 border-b border-slate-100 shrink-0">
          
          {/* Left: Title & Month Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                <CalendarIcon size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">Alocação de Consultores</h1>
                <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
                  Visão de calendário mensal
                </p>
              </div>
            </div>

            {/* Month Pagination & Toggle Event Details */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 border border-slate-200 p-1 bg-slate-50 rounded-xl max-w-fit">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg hover:bg-white text-slate-600 transition-all shadow-sm"
                >
                  <ChevronLeft size={16} />
                </button>
                <h2 className="text-xs font-bold text-slate-705 w-32 text-center capitalize">
                  {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                </h2>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg hover:bg-white text-slate-600 transition-all shadow-sm"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <button
                onClick={() => setShowEventDetails(!showEventDetails)}
                className="flex items-center justify-center p-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-blue-600 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer h-9 w-9 shrink-0"
                title={showEventDetails ? "Ocultar detalhes dos eventos no calendário" : "Mostrar detalhes dos eventos no calendário"}
              >
                {showEventDetails ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Right: Stats & Export Button */}
          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            {/* Stats Badges Group */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-xl text-[11px] font-bold">
              {/* Confirmados */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-50 text-green-700 border border-green-100">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span>Confirmados: <strong className="text-green-800 font-black">{monthlyStats.confirmados}</strong></span>
              </div>
              {/* Realizados */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span>Realizados: <strong className="text-blue-800 font-black">{monthlyStats.realizados}</strong></span>
              </div>
              {/* A Confirmar */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>A Confirmar: <strong className="text-amber-800 font-black">{monthlyStats.aConfirmar}</strong></span>
              </div>
            </div>

            {/* Export Button */}
            <button
              onClick={handleExportToExcel}
              className="flex items-center gap-2 px-3.5 py-2 group bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] uppercase tracking-wider rounded-xl shadow-sm hover:shadow-md transition-all shrink-0 cursor-pointer"
              title="Exportar dados de alocação"
            >
              <Download size={14} className="stroke-[3] transition-transform group-hover:translate-y-[1px]" />
              Exportar para Excel
            </button>
          </div>

        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto bg-slate-100 p-4">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="h-full flex flex-col min-h-[600px]">
              {/* Days Header */}
              <div className="grid grid-cols-7 gap-2 mb-2 shrink-0">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                  <div key={day} className="text-center font-bold text-xs uppercase tracking-wider text-slate-500 py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar Body */}
              <div className="flex-1 grid grid-cols-7 gap-2 auto-rows-fr">
                {calendarDays.map((day, idx) => {
                  const dayTrainings = getTrainingsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  
                  // Staff Chips logic
                  const staffChips = new Map<string, { id: string, name: string, status: string, isFormal: boolean }>();
                  
                  // Filter allocations for this day
                  const dayAllocations = allocations.filter(a => {
                    const ad = normalizeDate(a.data_alocacao);
                    return ad && isSameDay(ad, day);
                  });

                  dayAllocations.forEach(aloc => {
                    const s = staffs.find(st => st.id === aloc.staff_id);
                    if (s && consultantIds.has(s.id)) {
                      const isFormal = !!aloc.treinamento_id;
                      if (!staffChips.has(aloc.staff_id) || isFormal) {
                        staffChips.set(aloc.staff_id, { 
                          id: s.id, 
                          name: s.nomeAbreviado || s.nomeCompleto, 
                          status: aloc.status, 
                          isFormal 
                        });
                      }
                    }
                  });

                  return (
                    <div 
                      key={idx}
                      className={`min-h-[110px] bg-white rounded-xl border p-2 flex flex-col transition-all shadow-sm cursor-pointer hover:border-blue-400 hover:shadow-md ${
                        isCurrentMonth ? 'border-slate-300' : 'border-slate-200 opacity-60 bg-slate-50'
                      }`}
                      onClick={() => setSelectedDate(day)}
                    >
                      <div className="flex items-center justify-between mb-1.5 px-0.5">
                        {dayTrainings.length > 0 ? (
                          <span className="text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-[2px] rounded-md uppercase shrink-0">
                            {String(dayTrainings.length).padStart(2, '0')} {dayTrainings.length === 1 ? 'evento' : 'eventos'}
                          </span>
                        ) : (
                          <div />
                        )}
                        <span className={`text-[12px] font-extrabold ${
                          isSameDay(day, new Date()) 
                            ? 'bg-blue-600 text-white w-6 h-6 inline-flex items-center justify-center rounded-full shadow-sm' 
                            : 'text-slate-600'
                        }`}>
                          {format(day, 'd')}
                        </span>
                      </div>
                      
                      <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
                        {/* Agregated Trainings Card */}
                        {dayTrainings.length > 0 && (
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-1 mb-1 shadow-sm">
                            <div className="space-y-1">
                              {dayTrainings.map(t => (
                                <div key={t.id} className={`text-[11px] leading-tight flex flex-col gap-0.5 px-2 ${showEventDetails ? 'py-1.5' : 'py-0.5'} rounded-md border transition-all ${getTrainingColorClass(t.etapa)}`}>
                                  <span className="truncate font-bold text-[11px] flex items-center gap-1" title={t.nomeNegocio}>
                                    {t.opLabel && <span className="bg-slate-500/25 text-slate-800 px-1 py-0.2 rounded text-[7px] font-black shrink-0">[{t.opLabel}]</span>}
                                    <span className="truncate">{t.nomeNegocio}</span>
                                  </span>
                                  {showEventDetails && (
                                    <div className="text-[9px] opacity-75 flex items-center justify-between gap-1 leading-none mt-0.5">
                                      <span className="truncate max-w-[70%]" title={t.programaNb}>{t.programaNb || 'Sem programa'}</span>
                                      <span className="font-extrabold shrink-0 text-right">{t.participantes || 0} PAX</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Staff Chips */}
                        <div className="flex flex-wrap gap-1 items-start content-start overflow-y-auto custom-scrollbar">
                          {Array.from(staffChips.values()).map(chip => {
                            const bg = getStaffStatusColor(chip.status);

                            return (
                              <div key={chip.id} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border flex items-center gap-1 leading-none ${bg} truncate max-w-full shadow-2px`} title={`${chip.name} - ${getStaffStatusLabel(chip.status)}`}>
                                {renderStatusIcon(chip.status, 9, "shrink-0")}
                                <span>{chip.name.split(' ')[0]}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Alocação Diária */}
      <AnimatePresence>
        {selectedDate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setSelectedDate(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col"
              style={{ maxHeight: '90vh' }}
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">
                    Alocação: {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                  </h3>
                  <div className="text-xs text-slate-500 font-medium">
                    Planejamento diário de consultores
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedDate(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="p-4 overflow-y-auto flex-1 bg-slate-50/50">
                {(() => {
                    const dayTrainings = getTrainingsForDay(selectedDate);
                    const dayAssignments = allocations.filter(a => {
                      if (!consultantIds.has(a.staff_id)) return false;
                      const ad = normalizeDate(a.data_alocacao);
                      return ad && isSameDay(ad, selectedDate);
                    });
                    
                    const allAssignedSet = new Set(dayAssignments.map(a => a.staff_id));
                    const availableStaff = sortedStaffs.filter(s => !allAssignedSet.has(s.id));
                    
                    return (
                      <div className="space-y-6">
                        {/* Box Topo: Treinamentos */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                          <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <CalendarIcon size={16} className="text-amber-600" />
                            Treinamentos no dia ({dayTrainings.length})
                          </h4>
                          {dayTrainings.length === 0 ? (
                            <div className="text-sm text-slate-400 italic">Nenhum treinamento marcado para esta data.</div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {dayTrainings.map(t => (
                                <div 
                                  key={t.id} 
                                  onDoubleClick={() => setEditingTrainingIdModal(t.id)}
                                  className={`p-4 rounded-xl border flex flex-col gap-3 cursor-pointer hover:border-blue-500 hover:shadow-md hover:scale-[1.01] transition-all ${getTrainingColorClass(t.etapa)}`}
                                  title="Clique duplo para editar este treinamento"
                                >
                                  <div>
                                    <div className="text-[10px] font-black uppercase tracking-wider opacity-60">Cliente</div>
                                    <div className="font-black text-base leading-tight flex items-center gap-1.5 flex-wrap">
                                      {t.opLabel && <span className="bg-blue-600/10 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-black uppercase">[{t.opLabel}]</span>}
                                      {t.cliente || 'Sem Cliente'}
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-1 pt-3 border-t border-slate-200/40 text-xs">
                                    <div>
                                      <div className="text-[9px] font-bold uppercase opacity-60">Negócio</div>
                                      <div className="font-bold">{t.nomeNegocio}</div>
                                    </div>
                                    <div>
                                      <div className="text-[9px] font-bold uppercase opacity-60">Programa NB</div>
                                      <div className="font-bold">{t.programaNb || '---'}</div>
                                    </div>
                                    <div>
                                      <div className="text-[9px] font-bold uppercase opacity-60">Participantes</div>
                                      <div className="font-bold">{t.participantes || 0} PAX</div>
                                    </div>
                                    <div>
                                      <div className="text-[9px] font-bold uppercase opacity-60">Cidade &amp; Local</div>
                                      <div className="font-bold">
                                        {t.localEvento ? `${t.localEvento}` : ''}
                                        {t.localEvento && t.cidade ? `, ${t.cidade}` : t.cidade || '---'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Consultores Alocados */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                              <UserPlus size={16} className="text-blue-600" />
                              Consultores Alocados ({dayAssignments.length})
                            </h4>
                            <div className="flex gap-2">
                              <select 
                                id="newAllocationStaff"
                                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 w-64"
                              >
                                <option value="">+ Selecionar consultor...</option>
                                {availableStaff.map(s => (
                                  <option key={s.id} value={s.id}>{s.nomeAbreviado || s.nomeCompleto}</option>
                                ))}
                              </select>
                              <button 
                                onClick={() => {
                                  const select = document.getElementById('newAllocationStaff') as HTMLSelectElement;
                                  if (select.value) {
                                    handleAddConsultantToDay(select.value);
                                    select.value = '';
                                  }
                                }}
                                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
                              >
                                Incluir no Dia
                              </button>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {dayAssignments.length === 0 ? (
                              <div className="text-center py-6 text-sm text-slate-400 italic bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                                Ninguém alocado ainda.
                              </div>
                            ) : (
                              dayAssignments.map(aloc => {
                                const staff = staffs.find(s => s.id === aloc.staff_id);
                                if (!staff) return null;
                                
                                return (
                                  <div key={aloc.id} className={`flex flex-col gap-2 p-3 border rounded-xl shadow-sm transition-all ${getStaffStatusColorModal(aloc.status)}`}>
                                    <div className="flex items-center gap-4">
                                      <div className="w-48">
                                        <div className="font-bold text-sm text-slate-800 truncate">
                                          {staff.nomeAbreviado || staff.nomeCompleto}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter ${
                                            aloc.treinamento_id ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                                          }`}>
                                            {aloc.treinamento_id ? 'Formal' : 'Pool/Diária'}
                                          </span>
                                        </div>
                                      </div>
                                    
                                      <div className="flex-1 flex gap-2">
                                        <select
                                          value={aloc.treinamento_id || 'TMP'}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            handleUpdateAssignment(staff.id, aloc.type!, aloc.id, val === 'TMP' ? 'daily' : 'formal', val === 'TMP' ? '' : val, aloc.status);
                                          }}
                                          className="flex-1 text-xs border border-slate-200 rounded-lg bg-white p-2 font-semibold text-slate-700 outline-none"
                                        >
                                          <option value="TMP">Temporário (No dia, sem evento)</option>
                                          {dayTrainings.map(t => (
                                            <option key={t.id} value={t.id}>Treinamento: {t.nomeNegocio}</option>
                                          ))}
                                        </select>
                                      </div>
                                    
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        {renderStatusIcon(aloc.status, 14, "text-slate-650")}
                                        <select
                                          value={aloc.status}
                                          onChange={(e) => handleUpdateAssignment(staff.id, aloc.type!, aloc.id, aloc.treinamento_id ? 'formal' : 'daily', aloc.treinamento_id || '', e.target.value)}
                                          className={`w-36 text-xs border rounded-lg p-2 font-black outline-none cursor-pointer ${getStaffStatusColorSelect(aloc.status)}`}
                                        >
                                          <option value="intencao">Intenção</option>
                                          <option value="pre_reserva">Pré-reserva</option>
                                          <option value="whatsapp">Chamado no Zap</option>
                                          <option value="pessoalmente">Pessoalmente</option>
                                          <option value="deslocamento">Deslocamento</option>
                                          <option value="confirmado">Confirmado</option>
                                          <option value="data_liberada">Data Liberada</option>
                                          <option value="recusado">Recusado</option>
                                        </select>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        {deleteConfirmId === aloc.id ? (
                                          <button
                                            onClick={() => handleRemoveAssignment(aloc.type!, aloc.id)}
                                            className="px-3 py-2 bg-red-600 text-white text-[10px] font-bold rounded-xl hover:bg-red-700"
                                          >
                                            Confirmar
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => setDeleteConfirmId(aloc.id)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                          >
                                            <X size={20} />
                                          </button>
                                        )}
                                        {deleteConfirmId === aloc.id && (
                                          <button onClick={() => setDeleteConfirmId(null)} className="p-2 text-slate-400">
                                            <X size={20} />
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {(aloc.status === 'recusado' || aloc.status === 'data_liberada') && (
                                      <div className="w-full pl-52 pr-10">
                                        <input
                                          type="text"
                                          placeholder="Observação..."
                                          defaultValue={aloc.observacao || ''}
                                          onBlur={(e) => handleUpdateObservation(aloc.type!, aloc.id, e.target.value)}
                                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-400"
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    );
                })()}
              </div>
            </motion.div>
          </div>
        )}

        {isExportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shrink-0">
                    <Download size={22} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">Exportar Alocações para Excel</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Selecione o consultor e o período de início do relatório</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsExportModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form Controls */}
              <div className="p-6 bg-slate-50 border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
                {/* Consultant Selection */}
                <div className="space-y-1.5 font-sans">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Selecione o Consultor</label>
                  <select
                    value={exportConsultantId}
                    onChange={(e) => setExportConsultantId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800 text-sm shadow-sm transition-all cursor-pointer"
                  >
                    {sortedStaffs.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nomeAbreviado || s.nomeCompleto}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start Date */}
                <div className="space-y-1.5 font-sans">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Consultar a partir de</label>
                  <input
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800 text-sm shadow-sm transition-all cursor-pointer"
                  />
                </div>
              </div>

              {/* Preview Table Section */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 font-sans">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    Prévia das Alocações Encontradas ({exportFilteredAllocations.length})
                  </h4>
                  <span className="text-[11px] text-slate-400 font-bold bg-slate-100 px-2.5 py-1 rounded-lg">
                    Do dia {format(normalizeDate(exportStartDate) || new Date(), 'dd/MM/yyyy')} até a última alocação
                  </span>
                </div>

                {exportFilteredAllocations.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center bg-slate-50 rounded-xl border border-dashed border-slate-250">
                    <div className="p-3 bg-slate-100 rounded-full text-slate-400 mb-2">
                      <CalendarIcon size={28} />
                    </div>
                    <p className="text-sm font-bold text-slate-700">Nenhuma alocação registrada</p>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">Este consultor não possui nenhuma alocação a partir da data selecionada.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm max-h-[300px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-205 text-[10px] font-black uppercase text-slate-500 tracking-wider sticky top-0 bg-opacity-95 backdrop-blur-sm z-10 shadow-sm">
                          <th className="px-4 py-3 w-32">Data</th>
                          <th className="px-4 py-3">Consultor</th>
                          <th className="px-4 py-3 w-40">Status</th>
                          <th className="px-4 py-3">Treinamento / Detalhes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {exportFilteredAllocations.map((al) => {
                          const tr = al.type !== 'daily' ? trainings.find(t => t.id === al.treinamento_id) : null;
                          const client = tr ? (tr.cliente || tr.nomeNegocio || '') : '';
                          const venue = tr ? (tr.localEvento || tr.local_evento || '') : '';
                          const city = tr ? (tr.cidade || tr.local_cidade || '') : '';
                          const detailsStr = [client, venue, city].filter(p => p && p.trim() !== '').join(', ');

                          const dDate = normalizeDate(al.data_alocacao);
                          const dateFmt = dDate ? format(dDate, 'dd/MM/yyyy') : '---';

                          return (
                            <tr key={al.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3 font-bold text-slate-800 tabular-nums">
                                {dateFmt}
                              </td>
                              <td className="px-4 py-3 text-slate-600 font-medium">
                                {selectedExportStaff?.nomeAbreviado || selectedExportStaff?.nomeCompleto}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border ${getStaffStatusColorModal(al.status)}`}>
                                  {renderStatusIcon(al.status, 10, "shrink-0")}
                                  <span>{getStaffStatusLabel(al.status)}</span>
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-500 font-semibold italic">
                                {detailsStr || '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 border-t border-slate-100 flex flex-wrap items-center justify-end gap-3 bg-slate-50 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-4 py-2.5 text-slate-600 hover:text-slate-800 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Cancelar
                </button>

                {/* Copiar Imagem */}
                <button
                  type="button"
                  onClick={handleCopyAsImage}
                  disabled={exportFilteredAllocations.length === 0 || exportingImage}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer ${
                    exportFilteredAllocations.length === 0 || exportingImage
                      ? 'bg-slate-200 text-slate-450 pointer-events-none'
                      : copiedImage
                      ? 'bg-teal-600 text-white shadow-teal-100/50'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg active:scale-[0.98]'
                  }`}
                  title="Copiar imagem para enviar no WhatsApp"
                >
                  {exportingImage ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : copiedImage ? (
                    <Check size={14} className="stroke-[3]" />
                  ) : (
                    <Copy size={14} className="stroke-[2.5]" />
                  )}
                  {copiedImage ? 'Copiado!' : 'Copiar Imagem'}
                </button>

                {/* Salvar Imagem */}
                <button
                  type="button"
                  onClick={handleSaveAsImage}
                  disabled={exportFilteredAllocations.length === 0 || exportingImage}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer ${
                    exportFilteredAllocations.length === 0 || exportingImage
                      ? 'bg-slate-200 text-slate-450 pointer-events-none'
                      : 'bg-violet-600 hover:bg-violet-700 text-white hover:shadow-lg active:scale-[0.98]'
                  }`}
                  title="Salvar imagem no celular ou computador"
                >
                  {exportingImage ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <FileImage size={14} className="stroke-[2.5]" />
                  )}
                  Salvar Imagem (PNG)
                </button>

                {/* Baixar Planilha Excel */}
                <button
                  type="button"
                  onClick={handleDownloadExcel}
                  disabled={exportFilteredAllocations.length === 0 || exportingImage}
                  className={`flex items-center gap-2 px-5 py-2.5 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer ${
                    exportFilteredAllocations.length === 0 || exportingImage
                      ? 'bg-slate-300 pointer-events-none'
                      : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg active:scale-[0.98]'
                  }`}
                >
                  <Download size={14} className="stroke-[3]" />
                  Baixar Planilha Excel
                </button>
              </div>

              {/* Container de Geração de Imagem Offscreen */}
              <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '820px', zIndex: -10 }} className="bg-slate-50 font-sans">
                <div ref={imageTableRef} className="p-4 bg-white border border-slate-200 rounded-xl shadow-lg w-[800px]">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 py-3 rounded-lg flex items-center justify-between mb-4 shadow-sm">
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <CalendarIcon size={13} className="text-emerald-400" />
                        <span className="uppercase tracking-[0.2em] text-[8px] font-black text-emerald-400">
                          Relatório de Alocações
                        </span>
                      </div>
                      <h2 className="text-lg font-black tracking-tight text-white leading-tight">
                        {selectedExportStaff?.nomeAbreviado || selectedExportStaff?.nomeCompleto || 'Sem Consultor Selecionado'}
                      </h2>
                      <p className="text-[10px] text-slate-300 font-medium tracking-wide">
                        Período: a partir de {format(normalizeDate(exportStartDate) || new Date(), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className="bg-white/10 border border-white/5 px-2.5 py-1 rounded-lg text-center shadow-sm">
                        <div className="text-[8px] font-black uppercase text-emerald-400 tracking-wider leading-none mb-0.5">Total de Dias</div>
                        <div className="text-base font-black text-white tabular-nums leading-none">
                          {exportFilteredAllocations.length}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Table */}
                  {exportFilteredAllocations.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs font-bold">
                      Nenhuma alocação encontrada para este período.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white">
                      <table className="w-full text-left border-collapse table-fixed">
                        <thead>
                          <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
                            <th className="px-3 py-2 w-[100px] border-b border-slate-800 text-center">Data</th>
                            <th className="px-3 py-2 w-[150px] border-b border-slate-800">Consultor</th>
                            <th className="px-3 py-2 w-[170px] border-b border-slate-800 text-center">Status</th>
                            <th className="px-3 py-2 w-[348px] border-b border-slate-800">Treinamento / Detalhes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {exportFilteredAllocations.map((al) => {
                            const tr = al.type !== 'daily' ? trainings.find(t => t.id === al.treinamento_id) : null;
                            const client = tr ? (tr.cliente || tr.nomeNegocio || '') : '';
                            const venue = tr ? (tr.localEvento || tr.local_evento || '') : '';
                            const city = tr ? (tr.cidade || tr.local_cidade || '') : '';
                            const detailsStr = [client, venue, city].filter(p => p && p.trim() !== '').join(', ');

                            const dDate = normalizeDate(al.data_alocacao);
                            const dateFmt = dDate ? format(dDate, 'dd/MM/yyyy') : '---';

                            return (
                              <tr key={al.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-3 py-1.5 font-bold text-slate-800 tabular-nums text-center border-r border-slate-100 whitespace-nowrap truncate max-w-0">
                                  {dateFmt}
                                </td>
                                <td className="px-3 py-1.5 text-slate-700 font-semibold border-r border-slate-100 whitespace-nowrap truncate max-w-0">
                                  {selectedExportStaff?.nomeAbreviado || selectedExportStaff?.nomeCompleto}
                                </td>
                                <td className="px-3 py-1.5 text-center border-r border-slate-100 whitespace-nowrap truncate max-w-0">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider uppercase border shadow-sm ${getStaffStatusColorModal(al.status)}`}>
                                    {renderStatusIcon(al.status, 9, "shrink-0")}
                                    <span className="truncate whitespace-nowrap">{getStaffStatusLabel(al.status)}</span>
                                  </span>
                                </td>
                                <td className="px-3 py-1.5 text-slate-600 font-bold italic whitespace-nowrap truncate max-w-0" title={detailsStr || '-'}>
                                  {detailsStr || '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Footer Signature */}
                  <div className="mt-4 flex justify-between items-center text-[9px] font-bold text-slate-400 px-1 uppercase tracking-widest">
                    <span>Northbrasil Consultoria</span>
                    <span className="tabular-nums">Gerado em: {format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
                  </div>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {editingTrainingIdModal && (
        <TrainingFormModal
          trainingId={editingTrainingIdModal}
          user={user}
          onClose={() => setEditingTrainingIdModal(null)}
        />
      )}
    </AppLayout>
  );
};

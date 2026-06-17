import React, { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  getDocs,
  updateDoc,
  addDoc,
  orderBy,
} from "firebase/firestore";
import { AppLayout } from "../components/AppLayout";
import { usePagePermission } from "../lib/permissions";
import { LogisticsDatePicker } from "../components/LogisticsDatePicker";

// Global fallback for drag and drop data on touch devices
let currentDragData: { staffId: string; originTrainingId?: string; alocId?: string } | null = null;
import {
  Calendar as CalendarIcon,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  MapPin,
  UserCheck,
  Info,
  History,
  Printer,
  X,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Plus,
  Briefcase,
  Truck,
  DollarSign,
  ClipboardList,
  Shirt,
  Download,
  UserPlus,
  Check,
} from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  isSameMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";
import { ChecklistSidebar } from "../components/ChecklistSidebar";

// Tipos
interface Staff {
  id: string;
  nomeCompleto: string;
  nomeAbreviado: string;
  ativo: string;
  rg?: string;
  cpf?: string;
  dtNasc?: any;
  observacoes?: string;
}

interface Training {
  id: string;
  nomeNegocio: string;
  dataEvento: any;
  etapa: string;
  localEvento?: string;
  programaNb?: string;
  participantes?: number;
  hora_saida?: any;
  hora_retorno?: any;
  cidade?: string;
  observacoes?: string;
  contatos?: string;

  // Novos campos de Logística
  transporte?: string;
  qtd_staffs?: number;
  qtd_equipes?: number;
  coordenador_interno?: string;
  coordenador_evento?: string;
  responsavel_montagem?: string;
  voucher_alimentacao?: string;
  bombeiro?: string;
  hora_real_saida?: any;
  hora_real_chegada?: any;
  obs_logistica?: string;
  obs_geral_logistica?: string;
  logistica_conferida?: boolean;
  conferido_pre_at?: any;
  conferido_pre_by?: string;
  conferido_pos_at?: any;
  conferido_pos_by?: string;
  finance_default_period?: "cheio" | "meio";
}

interface Allocation {
  id: string;
  staff_id: string;
  treinamento_id: string;
  data_alocacao: any;
  status:
    | "intencao"
    | "pre_reserva"
    | "whatsapp"
    | "pessoalmente"
    | "confirmado"
    | "data_liberada"
    | "recusado";
  motivo_recusa?: string;
  obs?: string;
  finance_funcao_id?: string | null;
  finance_base_value?: number | null;
  finance_period?: string;
  finance_is_manual?: boolean;
  finance_bonus_id?: string | null;
  finance_voucher?: string;
  finance_voucher_value?: number | null;
  finance_voucher_is_manual?: boolean;
  finance_period_is_manual?: boolean;
  finance_extras?: { id: string; description: string; value: number }[];
}

// Helper para normalizar datas para comparação local segura (evita problemas de timezone)
const normalizeDate = (dateVal: any) => {
  if (!dateVal) return null;
  let d: Date;

  if (dateVal.toDate && typeof dateVal.toDate === "function") {
    d = dateVal.toDate();
  } else if (dateVal instanceof Date) {
    d = new Date(dateVal);
  } else if (dateVal && typeof dateVal.seconds === "number") {
    d = new Date(dateVal.seconds * 1000);
  } else if (typeof dateVal === "number") {
    d = new Date(dateVal > 9999999999 ? dateVal : dateVal * 1000);
  } else if (typeof dateVal === "string") {
    const s = dateVal.trim();
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, day_part] = s.split("-").map(Number);
      return new Date(y, m - 1, day_part, 12, 0, 0);
    }
    d = new Date(s);
  } else {
    return null;
  }

  if (isNaN(d.getTime())) return null;

  // Se for exatamente meia-noite UTC (comum em campos de data-only do Firebase), setamos 12:00 local
  if (
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0
  ) {
    const result = new Date(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      12,
      0,
      0,
    );
    return result;
  }

  // Caso contrário, mantém a data/hora original para não perder precisão
  return d;
};

// Componente Unificado para Lista de Staffs e Uniformes
const UnifiedStaffReport = ({ training, staffs, allocations }: any) => {
  const [showFullName, setShowFullName] = useState(false);
  const confirmedAllocations = allocations.filter(
    (a: any) => a.status === "confirmado" || a.status === "pre_reserva" || a.status === "data_liberada",
  );

  const [printMode, setPrintMode] = useState<"staffs" | "uniforms" | null>(
    null,
  );

  const formatDate = (dateVal: any) => {
    const d = normalizeDate(dateVal);
    if (!d) return "---";
    return format(d, "dd/MM/yyyy");
  };

  const isPool = !training || training === 'pool';
  const displayTitle = isPool ? "POOL DE STAFFS" : training.nomeNegocio;
  const displayDate = isPool ? "AVULSO" : formatDate(training.dataEvento);
  const displayProg = isPool ? "ALOCAÇÃO DIÁRIA" : training.programaNb;
  const displayLocal = isPool ? "---" : `${training.cidade} - ${training.localEvento}`;

  const handlePrintRequest = (mode: "staffs" | "uniforms") => {
    setPrintMode(mode);
    // Pequeno delay para garantir que o Portal renderizou o conteúdo antes de chamar o print
    setTimeout(() => {
      window.print();
      // Limpa o modo de impressão após o comando para evitar que o portal continue no body
      setPrintMode(null);
    }, 250);
  };

  const exportToExcel = () => {
    if (!training) return;

    const data = confirmedAllocations.map((aloc: any, index: number) => {
      const s = staffs.find(
        (staff: any) => String(staff.id) === String(aloc.staff_id),
      );
      return {
        "#": index + 1,
        Staff: showFullName ? s?.nomeCompleto || s?.nome : s?.nomeAbreviado,
        RG: s?.rg || "---",
        CPF: s?.cpf || "---",
        Nascimento: formatDate(s?.dtNasc),
      };
    });

    // O usuário especificou: L1: Titulo, L2: Data, L3: Local, L4: Programa, L5: Pulo, L6: Dados
    const ws = XLSX.utils.aoa_to_sheet([
      [`RELAÇÃO DE EQUIPE - ${training.nomeNegocio}`],
      [`DATA: ${formatDate(training.dataEvento)}`],
      [`LOCAL: ${training.cidade} - ${training.localEvento}`],
      [`PROGRAMA: ${training.programaNb}`],
      [""],
    ]);

    // Adicionar os dados a partir da linha 6 (A6)
    XLSX.utils.sheet_add_json(ws, data, { origin: "A6" });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Equipe");

    // Estilo básico (SheetJS vanilla não suporta muito estilo sem pacotes pagos, mas largura de coluna funciona)
    ws["!cols"] = [
      { wch: 4 }, // #
      { wch: 35 }, // Staff
      { wch: 15 }, // RG
      { wch: 18 }, // CPF
      { wch: 12 }, // Nascimento
    ];

    const fileName = `facilitadores ${training.nomeNegocio}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="space-y-6">
      {/* Botões de Ação da Sidebar */}
      <div className="flex flex-wrap gap-2 no-print pb-2">
        <button
          onClick={() => setShowFullName(!showFullName)}
          className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all border flex items-center gap-2 ${showFullName ? "bg-blue-600 text-white border-blue-600" : "bg-orange-500 text-white border-orange-500 hover:bg-orange-600"}`}
        >
          {showFullName ? "NOME ABREVIADO" : "NOME COMPLETO"}
        </button>

        <button
          onClick={() => handlePrintRequest("uniforms")}
          className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-black rounded-xl shadow-lg shadow-indigo-100 flex items-center gap-2 hover:bg-indigo-700 transition-all uppercase"
        >
          <Shirt size={14} /> Imprimir Uniformes
        </button>

        <button
          onClick={() => handlePrintRequest("staffs")}
          className="px-4 py-2 bg-cyan-600 text-white text-[10px] font-black rounded-xl shadow-lg shadow-cyan-100 flex items-center gap-2 hover:bg-cyan-700 transition-all uppercase"
        >
          <Users size={14} /> Imprimir Staffs
        </button>

        <button
          onClick={exportToExcel}
          className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-black rounded-xl shadow-lg shadow-emerald-100 flex items-center gap-2 hover:bg-emerald-700 transition-all uppercase"
        >
          <Download size={14} /> Exportar Excel
        </button>
      </div>

      {/* CONTEÚDO DEDICADO PARA IMPRESSÃO - Portal para o body para garantir visibilidade máxima */}
      {printMode &&
        createPortal(
          <div id="print-area" className="hidden print:block w-full">
            {printMode === "staffs" && (
              <div className="w-full">
                <div className="mb-3 border-b-2 border-black pb-2">
                  <h1 className="text-2xl font-black uppercase text-black leading-none mb-2">
                    Relação de Equipe
                  </h1>
                  <div className="flex flex-wrap items-center gap-x-5 text-[11px] uppercase text-black">
                    <p>
                      <span className="font-medium text-slate-500">
                        NEGÓCIO:
                      </span>{" "}
                      <span className="font-black">
                        {displayTitle}
                      </span>
                    </p>
                    <p>
                      <span className="font-medium text-slate-500">DATA:</span>{" "}
                      <span className="font-black">
                        {displayDate}
                      </span>
                    </p>
                    <p>
                      <span className="font-medium text-slate-500">
                        PROGRAMA:
                      </span>{" "}
                      <span className="font-black">{displayProg}</span>
                    </p>
                    <p>
                      <span className="font-medium text-slate-500">LOCAL:</span>{" "}
                      <span className="font-black">
                        {displayLocal}
                      </span>
                    </p>
                  </div>
                </div>

                <table
                  className="w-full border-collapse border-2 border-black"
                  style={{ tableLayout: "fixed" }}
                >
                  <thead>
                    <tr className="bg-white">
                      <th
                        className="p-1 border-2 border-black text-left text-[10px] font-black uppercase text-black"
                        style={{ width: "40px" }}
                      >
                        #
                      </th>
                      <th
                        className="p-1 border-2 border-black text-left text-[10px] font-black uppercase text-black"
                        style={{ width: "auto" }}
                      >
                        Staff
                      </th>
                      <th
                        className="p-1 border-2 border-black text-left text-[10px] font-black uppercase text-black"
                        style={{ width: "150px" }}
                      >
                        RG
                      </th>
                      <th
                        className="p-1 border-2 border-black text-left text-[10px] font-black uppercase text-black"
                        style={{ width: "150px" }}
                      >
                        CPF
                      </th>
                      <th
                        className="p-1 border-2 border-black text-left text-[10px] font-black uppercase text-black"
                        style={{ width: "100px" }}
                      >
                        Nascimento
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {confirmedAllocations.map((aloc: any, i: number) => {
                      const s = staffs.find(
                        (staff: any) =>
                          String(staff.id) === String(aloc.staff_id),
                      );
                      return (
                        <tr key={`p-st-${aloc.id}`} className="h-7">
                          <td className="p-0 border-2 border-black text-[10px] font-bold tabular-nums text-center">
                            {i + 1}
                          </td>
                          <td className="px-3 border-2 border-black text-[11px] font-black uppercase whitespace-nowrap overflow-hidden text-ellipsis">
                            {showFullName
                              ? s?.nomeCompleto || s?.nome
                              : s?.nomeAbreviado}
                          </td>
                          <td className="px-3 border-2 border-black text-[10px] font-bold uppercase truncate">
                            {s?.rg || "---"}
                          </td>
                          <td className="px-3 border-2 border-black text-[10px] font-bold uppercase truncate">
                            {s?.cpf || "---"}
                          </td>
                          <td className="px-3 border-2 border-black text-[10px] font-bold text-center">
                            {formatDate(s?.dtNasc)}
                          </td>
                        </tr>
                      );
                    })}
                    {[1, 2].map((extraIdx) => (
                      <tr key={`p-st-extra-${extraIdx}`} className="h-7">
                        <td className="p-0 border-2 border-black text-[10px] font-black text-black text-center tabular-nums">
                          {confirmedAllocations.length + extraIdx}
                        </td>
                        <td className="border-2 border-black"></td>
                        <td className="border-2 border-black"></td>
                        <td className="border-2 border-black"></td>
                        <td className="border-2 border-black"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {printMode === "uniforms" && (
              <div className="w-full">
                <div className="mb-4 border-b-2 border-black pb-2">
                  <h1 className="text-2xl font-black uppercase text-black leading-none mb-2">
                    Controle de Uniformes
                  </h1>
                  <div className="flex flex-wrap items-center gap-x-5 text-[11px] uppercase text-black">
                    <p>
                      <span className="font-medium text-slate-500">
                        EVENTO:
                      </span>{" "}
                      <span className="font-black">
                        {training?.nomeNegocio}
                      </span>
                    </p>
                    <p>
                      <span className="font-medium text-slate-500">DATA:</span>{" "}
                      <span className="font-black">
                        {formatDate(training?.dataEvento)}
                      </span>
                    </p>
                    <p>
                      <span className="font-medium text-slate-500">PROG:</span>{" "}
                      <span className="font-black">{training?.programaNb}</span>
                    </p>
                    <p>
                      <span className="font-medium text-slate-500">LOCAL:</span>{" "}
                      <span className="font-black">
                        {training?.cidade} - {training?.localEvento}
                      </span>
                    </p>
                  </div>
                </div>
                <table
                  className="w-full border-collapse border-2 border-black"
                  style={{ tableLayout: "fixed" }}
                >
                  <thead>
                    <tr className="bg-white">
                      <th
                        className="p-1 border-2 border-black text-left text-[10px] font-black uppercase text-black"
                        style={{ width: "40px" }}
                      >
                        #
                      </th>
                      <th
                        className="p-1 border-2 border-black text-left text-[10px] font-black uppercase text-black"
                        style={{ width: "auto" }}
                      >
                        Staff
                      </th>
                      <th
                        className="p-0 border-2 border-black text-center text-black"
                        style={{ width: "12%" }}
                      >
                        <div className="h-4 flex items-center justify-center border-b border-black text-[8px] font-black uppercase">
                          Camisa Evento
                        </div>
                        <div className="h-6"></div>
                      </th>
                      <th
                        className="p-0 border-2 border-black text-center text-black"
                        style={{ width: "12%" }}
                      >
                        <div className="h-4 flex items-center justify-center border-b border-black text-[8px] font-black uppercase">
                          Camisa Montagem
                        </div>
                        <div className="h-6"></div>
                      </th>
                      <th
                        className="p-0 border-2 border-black text-center text-black"
                        style={{ width: "12%" }}
                      >
                        <div className="h-4 flex items-center justify-center border-b border-black text-[8px] font-black uppercase">
                          Calça
                        </div>
                        <div className="h-6"></div>
                      </th>
                      <th
                        className="p-0 border-2 border-black text-center text-black"
                        style={{ width: "12%" }}
                      >
                        <div className="h-4 flex items-center justify-center border-b border-black text-[8px] font-black uppercase">
                          Agasalho
                        </div>
                        <div className="h-6"></div>
                      </th>
                      <th
                        className="p-0 border-2 border-black text-center text-black"
                        style={{ width: "12%" }}
                      >
                        <div className="h-4 flex items-center justify-center border-b border-black text-[8px] font-black uppercase">
                          Outro
                        </div>
                        <div className="h-6"></div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {confirmedAllocations.map((aloc: any, i: number) => {
                      const s = staffs.find(
                        (staff: any) =>
                          String(staff.id) === String(aloc.staff_id),
                      );
                      return (
                        <tr key={`p-un-extra-${aloc.id}`} className="h-8">
                          <td className="border-2 border-black text-[10px] font-bold text-center tabular-nums">
                            {i + 1}
                          </td>
                          <td className="px-3 border-2 border-black">
                            <span className="text-[11px] font-black uppercase whitespace-nowrap overflow-hidden text-ellipsis">
                              {s?.nomeAbreviado}
                            </span>
                          </td>
                          {[1, 2, 3, 4, 5].map((uIdx) => (
                            <td
                              key={uIdx}
                              className="p-0 border-2 border-black relative h-8"
                            >
                              <div className="flex h-full w-full">
                                <div className="flex-1 border-r border-black flex items-end justify-start pl-1 pb-0.5">
                                  <span className="text-[5px] text-black font-black leading-none">
                                    TAM
                                  </span>
                                </div>
                                <div className="flex-1 flex items-end justify-center gap-1 pb-0.5">
                                  <div className="w-3.5 h-3.5 border-2 border-black mb-0.5" />
                                  <span className="text-[5px] text-black font-black leading-none uppercase">
                                    Dev
                                  </span>
                                </div>
                              </div>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                    {[1, 2].map((extra) => (
                      <tr key={`p-un-extra-r-${extra}`} className="h-8">
                        <td className="border-2 border-black text-[10px] font-black text-black text-center tabular-nums">
                          {confirmedAllocations.length + extra}
                        </td>
                        <td className="border-2 border-black"></td>
                        {[1, 2, 3, 4, 5].map((uIdx) => (
                          <td
                            key={uIdx}
                            className="border-2 border-black p-0 h-8"
                          >
                            <div className="flex h-full w-full">
                              <div className="flex-1 border-r border-black flex items-end justify-start pl-1 pb-0.5">
                                <span className="text-[5px] text-black font-black leading-none">
                                  TAM
                                </span>
                              </div>
                              <div className="flex-1 flex items-end justify-center gap-1 pb-0.5">
                                <div className="w-3.5 h-3.5 border-2 border-black mb-0.5" />
                                <span className="text-[5px] text-black font-black leading-none uppercase">
                                  Dev
                                </span>
                              </div>
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>,
          document.body,
        )}

      {/* Lista na Tela (Sidebar) */}
      <div className="space-y-3 no-print">
        <h4 className="font-black uppercase text-[11px] tracking-widest text-slate-400 px-1">
          Equipe Confirmada ({confirmedAllocations.length})
        </h4>
        {confirmedAllocations.map((aloc: any, i: number) => {
          const s = staffs.find(
            (staff: any) => String(staff.id) === String(aloc.staff_id),
          );
          return (
            <div
              key={aloc.id}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-blue-300 transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all tabular-nums">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-800 uppercase leading-none mb-1.5 truncate">
                  {showFullName ? s?.nomeCompleto || s?.nome : s?.nomeAbreviado}
                </p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase">
                    <span className="text-slate-300">CPF:</span>{" "}
                    {s?.cpf || "---"}
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase">
                    <span className="text-slate-300">RG:</span> {s?.rg || "---"}
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase col-span-2">
                    <span className="text-slate-300">NASC:</span>{" "}
                    {formatDate(s?.dtNasc)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const AllocationPage = ({ user }: { user?: any }) => {
  const { canWrite } = usePagePermission("alocacao", user);
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { selectedDate?: string, selectedTrainingId?: string } | null;

  const [selectedDate, setSelectedDate] = useState(() => {
    if (locationState?.selectedDate) {
      // Assuming selectedDate from locationState is a string format 'YYYY-MM-DD'
      const parsed = new Date(locationState.selectedDate + 'T12:00:00Z');
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  });
  
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (locationState?.selectedDate) {
      const parsed = new Date(locationState.selectedDate + 'T12:00:00Z');
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  });

  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [checklists, setChecklists] = useState<Record<string, any>>({});
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [monthTrainings, setMonthTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrainingId, setSelectedTrainingId] = useState<string | null>(
    locationState?.selectedTrainingId || null,
  );

  // Estados para Painéis e Modais
  const [sidebarType, setSidebarType] = useState<
    | "logistica"
    | "financeiro"
    | "uniformes"
    | "staffs"
    | "checklist"
    | "history"
    | null
  >(null);
  const [financeFunctions, setFinanceFunctions] = useState<any[]>([]);
  const [financeAdditionals, setFinanceAdditionals] = useState<any[]>([]);
  const [financeGlobalPeriod, setFinanceGlobalPeriod] = useState<
    "cheio" | "meio"
  >("cheio");

  const [showMobileCalendar, setShowMobileCalendar] = useState(false);

  const [logisticsForm, setLogisticsForm] = useState<Partial<Training>>({});
  const [activePicker, setActivePicker] = useState<keyof Training | null>(null);

  // Ajuste automático de altura para textareas de logística
  useEffect(() => {
    if (sidebarType === "logistica") {
      // Pequeno timeout para garantir que o DOM renderizou
      const timer = setTimeout(() => {
        const textareas = document.querySelectorAll("textarea");
        textareas.forEach((textarea) => {
          textarea.style.height = "auto";
          textarea.style.height = textarea.scrollHeight + "px";
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [sidebarType, logisticsForm]);

  // Sync logistics form when training changes or sidebar opens
  useEffect(() => {
    if (selectedTrainingId && sidebarType === "logistica") {
      const training = trainings.find((t) => t.id === selectedTrainingId);
      if (training) {
        const formatForInput = (val: any) => {
          if (!val) return "";
          // Se já for formato YYYY-MM-DDTHH:mm, retorna direto
          if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val)) return val;
          // Se for apenas HH:mm, tenta concatenar com a data do evento
          if (/^\d{2}:\d{2}$/.test(val)) {
            const tDate = normalizeDate(training.dataEvento);
            if (tDate) {
              return `${format(tDate, "yyyy-MM-dd")}T${val}`;
            }
          }
          return val;
        };

        setLogisticsForm({
          hora_saida: formatForInput(training.hora_saida),
          hora_retorno: formatForInput(training.hora_retorno),
          transporte: training.transporte || "",
          qtd_staffs: training.qtd_staffs || 0,
          qtd_equipes: training.qtd_equipes || 0,
          coordenador_interno: training.coordenador_interno || "",
          coordenador_evento: training.coordenador_evento || "",
          responsavel_montagem: training.responsavel_montagem || "",
          voucher_alimentacao: training.voucher_alimentacao || "",
          bombeiro: training.bombeiro || "",
          hora_real_saida: formatForInput(training.hora_real_saida),
          hora_real_chegada: formatForInput(training.hora_real_chegada),
          obs_logistica: training.obs_logistica || "",
          obs_geral_logistica: training.obs_geral_logistica || "",
          logistica_conferida: training.logistica_conferida || false,
          conferido_pre_at: training.conferido_pre_at || null,
          conferido_pre_by: training.conferido_pre_by || "",
          conferido_pos_at: training.conferido_pos_at || null,
          conferido_pos_by: training.conferido_pos_by || "",
        });
      }
    }
  }, [selectedTrainingId, sidebarType, trainings]);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [refusalModal, setRefusalModal] = useState<{
    id: string;
    staffName: string;
    isObsOnly?: boolean;
  } | null>(null);
  const [refusalReason, setRefusalReason] = useState("");
  const [statusMenu, setStatusMenu] = useState<{
    alocId: string;
    x: number;
    y: number;
  } | null>(null);
  const [duplicatedStaffIds, setDuplicatedStaffIds] = useState<string[]>([]);

  // Carregar dados iniciais e escutar mudanças
  useEffect(() => {
    setLoading(true);

    // 1. Escutar Staffs com mapeamento de campos exaustivo
    const unsubStaffs = onSnapshot(collection(db, "staffs"), (snap) => {
      const list = snap.docs
        .map((doc) => {
          const d = doc.data();
          const rawAtivo = String(d.ativo || "")
            .toLowerCase()
            .trim();
          const isAtivo =
            rawAtivo === "sim" ||
            d.ativo === undefined ||
            d.ativo === null ||
            d.ativo === "";

          if (!isAtivo) return null;

          return {
            ...d,
            id: String(doc.id),
            nomeCompleto:
              d.nomeCompleto || d.nome_completo || d.nome || "Sem Nome",
            nomeAbreviado:
              d.nomeAbreviado ||
              d.nome_abreviado ||
              d.nome_completo ||
              d.nome ||
              "Staff",
            ativo: d.ativo || "sim",
            rg: d.rg || "",
            cpf: d.cpf || "",
            dtNasc: d.dtNasc || d.dt_nascimento || d.data_nascimento || "",
          } as Staff;
        })
        .filter(Boolean) as Staff[];
      setStaffs(list);
    });

    // 1.5. Escutar Checklists para exibir progresso
    const unsubChecklists = onSnapshot(collection(db, "training_checklists"), (snap) => {
      const map: Record<string, any> = {};
      snap.forEach((doc) => {
        map[doc.id] = doc.data();
      });
      setChecklists(map);
    });

    // 2. Escutar Treinamentos com mapeamento de campos exaustivo
    const unsubTrainings = onSnapshot(collection(db, "trainings"), (snap) => {
      const list = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          ...d,
          id: String(doc.id),
          nomeNegocio:
            d.nomeNegocio || d.nome_negocio || d.cliente || d.negocio || "Sem Nome",
          dataEvento:
            d.dataEvento || d.data_evento || d.data || d.data_evento_nb,
          etapa: d.etapa || "Confirmado",
          localEvento:
            d.localEvento || d.local_evento || d.local || d.local_evento_nb,
          cidade: d.cidade || d.cidade_evento || d.municipio || d.local_cidade,
          programaNb:
            d.programaNb || d.programa_nb || d.atividade || d.programa || d.programa_nb_evento,
          participantes:
            d.participantes ||
            d.qtd_participantes ||
            d.numero_participantes ||
            d.qtd_part,
          hora_saida: d.hora_saida || d.horario_saida,
          hora_retorno: d.hora_retorno || d.horario_retorno || d.hora_chegada,

          transporte:
            d.transporte ||
            d.tipo_transporte ||
            d.veiculo ||
            d.transporte_evento ||
            "",
          qtd_staffs: d.qtd_staffs || d.quantidade_staffs,
          qtd_equipes: d.qtd_equipes || d.equipes || d.quantidade_equipes,
          coordenador_interno: d.coordenador_interno || d.coord_interno,
          coordenador_evento: d.coordenador_evento || d.coord_evento,
          responsavel_montagem:
            d.responsavel_montagem || d.montagem_responsavel,
          voucher_alimentacao: d.voucher_alimentacao || d.alimentacao,
          bombeiro: d.bombeiro,
          hora_real_saida: d.hora_real_saida,
          hora_real_chegada: d.hora_real_chegada,
          obs_logistica: d.obs_logistica || d.observacoes_logistica,
          obs_geral_logistica:
            d.obs_geral_logistica || d.observacoes_gerais || d.observacoes,
          logistica_conferida: d.logistica_conferida || false,
          conferido_pre_at: d.conferido_pre_at,
          conferido_pre_by: d.conferido_pre_by || "",
          conferido_pos_at: d.conferido_pos_at,
          conferido_pos_by: d.conferido_pos_by || "",
          finance_default_period: d.finance_default_period || "cheio",
        } as Training;
      });

      const filtered = list.filter((t) => {
        const tDate = normalizeDate(t.dataEvento);
        if (!tDate) return false;
        const etapa = String(t.etapa || "").toLowerCase();
        // Alinhado com ConsultantAllocationPage: mostra quase tudo exceto cancelados/suspensos
        if (["não realizado", "nao realizado", "cancelado", "suspenso"].includes(etapa)) return false;
        return isSameDay(tDate, selectedDate);
      });
      setTrainings(filtered);

      const monthFiltered = list.filter((t) => {
        const tDate = normalizeDate(t.dataEvento);
        if (!tDate) return false;
        const etapa = String(t.etapa || "").toLowerCase();
        if (["não realizado", "nao realizado", "cancelado", "suspenso"].includes(etapa)) return false;

        const nextMonth = addMonths(currentMonth, 1);
        return (
          (isSameMonth(tDate, currentMonth) &&
            tDate.getFullYear() === currentMonth.getFullYear()) ||
          (isSameMonth(tDate, nextMonth) &&
            tDate.getFullYear() === nextMonth.getFullYear())
        );
      });
      setMonthTrainings(monthFiltered);
    });

    // 3. Escutar Alocações com mapeamento de campos exaustivo e normalização de IDs
    const unsubAllocations = onSnapshot(
      collection(db, "allocations"),
      (snap) => {
        const list = snap.docs.map((doc) => {
          const d = doc.data();
          
          // Debug
          console.log("Allocation doc:", doc.id, d);

          // Resolver Referências de Documento (alguns sistemas salvam como DocumentReference ou String de Path)
          const getRefId = (ref: any) => {
            if (!ref) return "";
            if (typeof ref === "string") {
              const s = ref.trim();
              if (s.includes("/")) {
                const parts = s.split("/");
                return String(parts[parts.length - 1]); // Extrair apenas o ID do path (ex: trainings/ID)
              }
              return String(s);
            }
            if (ref.id) return String(ref.id); // Firestore Reference
            return String(ref).trim();
          };

          const rawStaffId =
            d.staff_id ||
            d.staffId ||
            d.id_staff ||
            d.staff ||
            d.facilitador_id;
          const rawTrainingId =
            d.treinamento_id ||
            d.treinamentoId ||
            d.id_treinamento ||
            d.treinamento;
          const rawDate =
            d.data_alocacao ||
            d.dataAlocacao ||
            d.data_evento ||
            d.dataEvento ||
            d.data;

          return {
            ...d,
            id: doc.id,
            staff_id: getRefId(rawStaffId),
            treinamento_id: getRefId(rawTrainingId),
            data_alocacao: rawDate,
            status: String(d.status || "intencao").toLowerCase() as any,
            obs:
              d.motivo_recusa ||
              d.motivoRecusa ||
              d.obs ||
              d.observacao ||
              d.observacoes ||
              "",
            // Campos financeiros
            finance_funcao_id: d.finance_funcao_id || null,
            finance_base_value: d.finance_base_value ?? null,
            finance_period: d.finance_period || "cheio",
            finance_is_manual: d.finance_is_manual || false,
            finance_bonus_id: d.finance_bonus_id || null,
            finance_voucher: d.finance_voucher || "nao",
            finance_voucher_value: d.finance_voucher_value ?? null,
            finance_voucher_is_manual: d.finance_voucher_is_manual || false,
            finance_period_is_manual: d.finance_period_is_manual || false,
            finance_extras: d.finance_extras || [],
          } as Allocation;
        });

        setAllocations(list); // Guardar todas para filtrar via useMemo
        setLoading(false);
      },
    );

    // 4. Carregar Metadados Financeiros
    const unsubFunctions = onSnapshot(
      collection(db, "finance_functions"),
      (snap) => {
        setFinanceFunctions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
    );

    const unsubAdditionals = onSnapshot(
      collection(db, "finance_additionals"),
      (snap) => {
        setFinanceAdditionals(
          snap.docs.map((d) => ({ id: d.id, ...d.data() })),
        );
      },
    );

    return () => {
      unsubStaffs();
      unsubChecklists();
      unsubTrainings();
      unsubAllocations();
      unsubFunctions();
      unsubAdditionals();
    };
  }, [selectedDate, currentMonth]);

  // Carregar histórico de alocações em tempo real quando selecionado
  useEffect(() => {
    if (selectedTrainingId && sidebarType === "history") {
      // Removemos o orderBy do Firestore para evitar erros de índice composto faltando
      const q = query(
        collection(db, "allocation_logs"),
        where("treinamento_id", "==", selectedTrainingId),
      );

      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          // Ordenar no cliente para garantir que funcione sem índice composto
          items.sort((a: any, b: any) => {
            const tA = a.timestamp?.seconds || 0;
            const tB = b.timestamp?.seconds || 0;
            return tB - tA;
          });
          setHistoryItems(items);
        },
        (error) => {
          console.error("Erro ao escutar histórico:", error);
        },
      );

      return () => unsubscribe();
    }
  }, [selectedTrainingId, sidebarType]);

  const selectedTraining = useMemo(
    () => trainings.find((t) => t.id === selectedTrainingId),
    [trainings, selectedTrainingId],
  );

  // Sync global period with training preference
  useEffect(() => {
    if (selectedTraining?.finance_default_period) {
      setFinanceGlobalPeriod(selectedTraining.finance_default_period);
    } else {
      setFinanceGlobalPeriod("cheio");
    }
  }, [selectedTraining?.id, selectedTraining?.finance_default_period]);

  // Staffs que ainda não foram alocados hoje
  const availableStaffs = useMemo(() => {
    // Pegar todos os IDs de treinamentos que estão acontecendo hoje
    const trainingTodayIds = new Set(trainings.map((t) => String(t.id)));

    // Apenas considerar staffs alocados no dia selecionado ou em treinamentos do dia
    const allocatedTodayIds = new Set(
      allocations
        .filter((aloc) => {
          // Verifica se está alocado em um treinamento que acontece hoje
          if (trainingTodayIds.has(String(aloc.treinamento_id))) return true;

          // Ou se a própria alocação tem a data de hoje (backup)
          const alocDate = normalizeDate(aloc.data_alocacao);
          return alocDate && isSameDay(alocDate, selectedDate);
        })
        .map((a) => String(a.staff_id)),
    );

    const baseAvailable = staffs
      .filter((s) => !allocatedTodayIds.has(String(s.id)))
      .sort((a, b) => a.nomeAbreviado.localeCompare(b.nomeAbreviado));

    // Adicionar staffs que foram "duplicados" manualmente (mesmo que já alocados)
    const duplicates = duplicatedStaffIds
      .map((id) => staffs.find((s) => String(s.id) === String(id)))
      .filter(Boolean) as Staff[];

    return [...baseAvailable, ...duplicates].sort((a, b) =>
      a.nomeAbreviado.localeCompare(b.nomeAbreviado),
    );
  }, [staffs, allocations, selectedDate, trainings, duplicatedStaffIds]);

  // Alocações filtradas para os treinamentos visíveis ou para o dia selecionado
  const filteredAllocations = useMemo(() => {
    const visibleTrainingIds = new Set(trainings.map((t) => String(t.id)));

    return allocations.filter((aloc) => {
      // Prioridade 1: ID do treinamento já bate com um dos treinamentos visíveis no dia
      if (aloc.treinamento_id && visibleTrainingIds.has(String(aloc.treinamento_id))) return true;

      // Prioridade 2: Data da alocação bate com o dia selecionado
      const alocDate = normalizeDate(aloc.data_alocacao);
      if (alocDate && isSameDay(alocDate, selectedDate)) return true;

      return false;
    });
  }, [allocations, trainings, selectedDate]);

  // Alocações sem treinamento (Pool/Diária)
  const poolAllocations = useMemo(() => {
    return filteredAllocations.filter(a => !a.treinamento_id || a.treinamento_id === '');
  }, [filteredAllocations]);

  // Alocações por treinamento ordenadas por status de prioridade
  const getAllocationsByTraining = (trainingId: string) => {
    const statusPriority: Record<string, number> = {
      intencao: 1,
      pre_reserva: 2,
      whatsapp: 3,
      pessoalmente: 4,
      confirmado: 5,
      data_liberada: 6,
      recusado: 7,
    };

    return filteredAllocations
      .filter((a) => String(a.treinamento_id) === String(trainingId))
      .sort(
        (a, b) =>
          (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99),
      );
  };

  // Contagem de alocações dos últimos 30 dias para cada staff
  const staffActivityLast30Days = useMemo(() => {
    const activityMap: Record<string, number> = {};
    const refDate = normalizeDate(selectedDate);
    if (!refDate) return activityMap;

    const thirtyDaysAgo = new Date(refDate);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    allocations.forEach((aloc) => {
      // Contamos apenas alocações confirmadas/realizadas
      if (aloc.status !== "confirmado") return;

      const alocDate = normalizeDate(aloc.data_alocacao);
      if (!alocDate) return;

      // Se a data de alocação está entre (refDate - 30 dias) e refDate
      if (alocDate >= thirtyDaysAgo && alocDate <= refDate) {
        const sid = String(aloc.staff_id);
        activityMap[sid] = (activityMap[sid] || 0) + 1;
      }
    });

    return activityMap;
  }, [allocations, selectedDate]);

  const createLog = async (
    trainingId: string,
    message: string,
    changes?: any[],
  ) => {
    try {
      await addDoc(collection(db, "allocation_logs"), {
        treinamento_id: trainingId,
        message,
        changes: changes || null,
        timestamp: serverTimestamp(),
        user: user?.nome || "Sistema",
        userId: user?.id || null,
      });
    } catch (e) {
      console.error("Log error:", e);
    }
  };

  const [addingExtraFor, setAddingExtraFor] = useState<string | null>(null);
  const [newExtraDesc, setNewExtraDesc] = useState("");
  const [newExtraValue, setNewExtraValue] = useState("");

  const submitNewExtra = (
    alocId: string,
    staffName: string,
    currentExtras: any[],
  ) => {
    if (!newExtraDesc || !newExtraValue) return;

    const bono = financeAdditionals.find((a) => a.id === newExtraDesc);
    const desc = bono ? bono.nome.toUpperCase() : newExtraDesc.toUpperCase();

    const value = parseFloat(newExtraValue.replace(",", ".")) || 0;
    const newExtras = [
      ...(currentExtras || []),
      { id: crypto.randomUUID(), description: desc, value },
    ];

    updateFinance(
      alocId,
      { finance_extras: newExtras },
      `Adicional [${desc}] de R$ ${value} adicionado para ${staffName}.`,
    );

    // Reset
    setAddingExtraFor(null);
    setNewExtraDesc("");
    setNewExtraValue("");
  };

  const updateFinance = async (
    allocationId: string,
    data: any,
    baseMessage: string,
  ) => {
    if (!canWrite) {
      alert("Acesso negado: Você não possui a permissão de escrita necessária.");
      return;
    }
    try {
      const aloc = allocations.find((a) => a.id === allocationId) as any;
      if (!aloc) return;

      const changes: any[] = [];
      Object.keys(data).forEach((key) => {
        const oldValue = aloc[key];
        const newValue = data[key];
        if (oldValue !== newValue) {
          changes.push({
            field: key,
            old: oldValue ?? "vazio",
            new: newValue ?? "vazio",
          });
        }
      });

      if (changes.length === 0) return;

      const diffText = changes
        .map((c) => {
          const fieldName = c.field.replace("finance_", "").replace("_", " ");
          return `[${fieldName}: ${c.old} -> ${c.new}]`;
        })
        .join(" ");

      await updateDoc(doc(db, "allocations", allocationId), {
        ...data,
        updatedAt: serverTimestamp(),
        updatedBy: user?.nome || "Sistema",
      });

      await createLog(
        aloc.treinamento_id,
        `${baseMessage} Alterações: ${diffText}`,
        changes,
      );
    } catch (err) {
      console.error("Error updating finance:", err);
    }
  };

  const handleSaveLogistics = async (
    overriddenData?: Partial<Training>,
    customMessage?: string,
  ) => {
    if (!canWrite) {
      alert("Acesso negado: Você não possui a permissão de escrita necessária.");
      return;
    }
    if (!selectedTrainingId) return;
    try {
      let dataToSave = overriddenData || logisticsForm;

      const trainingDate =
        normalizeDate(selectedTraining?.dataEvento) || new Date();
      const year = trainingDate.getFullYear();
      const dateFields: (keyof Training)[] = [
        "hora_saida",
        "hora_retorno",
        "hora_real_saida",
        "hora_real_chegada",
      ];

      const finalData = { ...dataToSave } as any;
      dateFields.forEach((field) => {
        const val = finalData[field];
        if (typeof val === "string" && /^\d{2}\/\d{2} \d{2}:\d{2}$/.test(val)) {
          const [datePart, timePart] = val.split(" ");
          const [day, month] = datePart.split("/").map(Number);
          const [hour, min] = timePart.split(":").map(Number);
          const d = new Date(year, month - 1, day, hour, min);
          if (!isNaN(d.getTime())) {
            finalData[field] = format(d, "yyyy-MM-dd'T'HH:mm");
          }
        }
      });

      const oldData = selectedTraining as any;
      const changes: any[] = [];
      if (oldData) {
        Object.keys(finalData).forEach((key) => {
          if (finalData[key] !== oldData[key]) {
            changes.push({
              field: key,
              old: oldData[key] ?? "vazio",
              new: finalData[key] ?? "vazio",
            });
          }
        });
      }

      if (changes.length === 0 && !customMessage) return;

      const trainingRef = doc(db, "trainings", selectedTrainingId);
      await updateDoc(trainingRef, {
        ...finalData,
        updatedAt: serverTimestamp(),
      });

      const baseMsg = customMessage || "Dados de logística atualizados.";
      const diffText =
        changes.length > 0
          ? ` | Alterações: ${changes.map((c) => `[${c.field}: ${c.old} -> ${c.new}]`).join(" ")}`
          : "";
      await createLog(selectedTrainingId, `${baseMsg}${diffText}`, changes);

      if (!overriddenData) {
        setSidebarType(null);
      }
    } catch (error) {
      console.error("Erro ao salvar logística:", error);
    }
  };

  // Helper para formatar data para exibição amigável no input (dd/MM HH:mm)
  const formatLogisticsDateDisplay = (val: any) => {
    if (!val) return "";
    // Se já estiver no formato amigável, apenas retorna
    if (/^\d{2}\/\d{2} \d{2}:\d{2}$/.test(val)) return val;
    // Se for ISO ou timestamp, formata
    const d = normalizeDate(val);
    if (!d || isNaN(d.getTime())) {
      // Caso seja apenas a data do evento (string legada), tenta tratar
      if (typeof val === "string" && val.includes("T")) {
        const isoDate = new Date(val);
        if (!isNaN(isoDate.getTime())) return format(isoDate, "dd/MM HH:mm");
      }
      return val || "";
    }
    // Para campos de hora em treinamentos, normalizeDate geralmente retorna às 12:00 se não houver hora.
    // Mas aqui queremos a hora original se existir.
    if (typeof val === "string" && val.length > 10) {
      const isoDate = new Date(val);
      return format(isoDate, "dd/MM HH:mm");
    }
    return format(d, "dd/MM HH:mm");
  };

  const assignStaff = async (
    staffId: string,
    trainingId: string,
    originTrainingId?: string,
    alocIdToMove?: string
  ) => {
    if (!canWrite) {
      alert("Acesso negado: Você não possui a permissão de escrita necessária.");
      return;
    }
    const isPool = !trainingId || trainingId === 'pool';
    const finalTrainingId = isPool ? '' : trainingId;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    
    // Deterministic ID for target to prevent same staff in same training twice
    const targetAlocId = isPool ? `pool_${dateStr}_${staffId}` : `${trainingId}_${staffId}`;
    
    const dataObj = new Date(dateStr + "T12:00:00");
    const staff = staffs.find((s) => s.id === staffId);
    
    const targetTraining = isPool ? null : (
      trainings.find((t) => t.id === trainingId) ||
      monthTrainings.find((t) => t.id === trainingId)
    );

    try {
      if (duplicatedStaffIds.includes(staffId)) {
        setDuplicatedStaffIds((prev) => prev.filter((id) => id !== staffId));
      }

      let currentStatus = "intencao";

      if (originTrainingId && originTrainingId !== trainingId) {
        const isOldPool = !originTrainingId || originTrainingId === 'pool';
        
        // Use provided alocIdToMove if it exists (from Pool), otherwise fallback to deterministic old ID
        const cleanupId = alocIdToMove || (isOldPool ? `pool_${dateStr}_${staffId}` : `${originTrainingId}_${staffId}`);
        
        const originTraining = isOldPool ? null : (
          trainings.find((t) => t.id === originTrainingId) ||
          monthTrainings.find((t) => t.id === originTrainingId)
        );

        // Find the existing allocation to preserve status
        const existingAloc = allocations.find(a => a.id === cleanupId);
        if (existingAloc) {
          currentStatus = existingAloc.status || "intencao";
        }
        
        await deleteDoc(doc(db, "allocations", cleanupId));
        
        if (!isOldPool) {
          await createLog(
            originTrainingId,
            `Staff ${staff?.nomeAbreviado} movido de [${originTraining?.nomeNegocio || "N/A"}] para [${isPool ? "POOL AVULSO" : (targetTraining?.nomeNegocio || "N/A")}].`,
          );
        }
        
        if (!isPool) {
          await createLog(
            trainingId,
            `Staff ${staff?.nomeAbreviado} recebido de [${isOldPool ? "POOL AVULSO" : (originTraining?.nomeNegocio || "N/A")}].`,
          );
        }
      } else {
        if (!isPool) await createLog(trainingId, `Staff ${staff?.nomeAbreviado} alocado.`);
      }

      await setDoc(doc(db, "allocations", targetAlocId), {
        staff_id: staffId,
        treinamento_id: finalTrainingId,
        data_alocacao: dataObj,
        status: currentStatus,
        updatedAt: serverTimestamp(),
        updatedBy: user?.nome || "Sistema",
      });
    } catch (err) {
      console.error("Error assigning staff:", err);
    }
  };

  const removeAllocation = async (allocationId: string) => {
    if (!canWrite) {
      alert("Acesso negado: Você não possui a permissão de escrita necessária.");
      return;
    }
    try {
      const aloc = allocations.find((a) => a.id === allocationId);
      const staff = staffs.find((s) => s.id === aloc?.staff_id);
      const training =
        trainings.find((t) => t.id === aloc?.treinamento_id) ||
        monthTrainings.find((t) => t.id === aloc?.treinamento_id);
      await deleteDoc(doc(db, "allocations", allocationId));
      if (aloc)
        await createLog(
          aloc.treinamento_id,
          `Staff ${staff?.nomeAbreviado} removido do treinamento [${training?.nomeNegocio || "N/A"}].`,
        );
    } catch (err) {
      console.error("Error removing allocation:", err);
    }
  };

  const updateStatus = async (
    allocationId: string,
    status?: string,
    reason?: string,
  ) => {
    if (!canWrite) {
      alert("Acesso negado: Você não possui a permissão de escrita necessária.");
      return;
    }
    try {
      const aloc = allocations.find((a) => a.id === allocationId);
      const staff = staffs.find((s) => s.id === aloc?.staff_id);

      const payload: any = { updatedAt: serverTimestamp() };
      if (status) payload.status = status;
      if (reason !== undefined) payload.motivo_recusa = reason;

      const oldStatus = aloc?.status || "intencao";
      await updateDoc(doc(db, "allocations", allocationId), payload);

      if (aloc) {
        let actionMsg = "";
        if (status && status !== oldStatus) {
          actionMsg = `Status de ${staff?.nomeAbreviado} alterado de [${oldStatus.toUpperCase()}] para [${status.toUpperCase()}]${reason ? " (Motivo: " + reason + ")" : ""}`;
        } else if (reason !== undefined) {
          actionMsg = `Observação de ${staff?.nomeAbreviado} atualizada de [${aloc.obs || "vazio"}] para [${reason}]`;
        }

        if (actionMsg) {
          await createLog(aloc.treinamento_id, actionMsg);
        }
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const confirmRefusal = () => {
    if (refusalModal) {
      if (refusalModal.isObsOnly) {
        // Apenas atualiza a observação sem mudar o status
        updateStatus(refusalModal.id, undefined as any, refusalReason);
      } else {
        updateStatus(refusalModal.id, "recusado", refusalReason);
      }
      setRefusalModal(null);
      setRefusalReason("");
    }
  };

  // Gerar dias do calendário
  const days1 = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const days2 = useMemo(() => {
    const nextMonth = addMonths(currentMonth, 1);
    const start = startOfMonth(nextMonth);
    const end = endOfMonth(nextMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const CalendarBlock = ({ month, days }: { month: Date; days: Date[] }) => {
    const confirmedCount = monthTrainings.filter((t) => {
      const tDate = normalizeDate(t.dataEvento);
      return (
        tDate &&
        isSameMonth(tDate, month) &&
        (t.etapa === "Confirmado" || t.etapa === "Realizado")
      );
    }).length;

    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-4">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col items-center justify-center gap-1">
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-[0.2em] leading-tight text-center">
            {format(month, "MMMM yyyy", { locale: ptBR })}
          </h3>
          <div className="flex items-center gap-1.5">
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg text-[10px] font-black">
              {String(confirmedCount).padStart(2, "0")} EVENTOS
            </span>
          </div>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-7 text-center mb-1">
            {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
              <span
                key={`${d}-${i}`}
                className="text-[8px] font-black text-slate-400"
              >
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startOfMonth(month).getDay() }).map(
              (_, i) => (
                <div key={`empty-${i}`} />
              ),
            )}
            {days.map((day) => {
              const dayTrainings = monthTrainings.filter((t) => {
                const tDate = normalizeDate(t.dataEvento);
                return tDate && isSameDay(tDate, day);
              });
              const count = dayTrainings.length;

              let trainingBorder = "border border-transparent";
              if (count === 1) trainingBorder = "border-2 border-emerald-500";
              else if (count === 2)
                trainingBorder = "border-2 border-amber-500";
              else if (count >= 3) trainingBorder = "border-2 border-red-500";

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => {
                      setSelectedDate(day);
                      setShowMobileCalendar(false);
                  }}
                  className={`
                  aspect-square flex flex-col items-center justify-center rounded-lg text-[10px] font-bold transition-all relative
                  ${isSameDay(day, selectedDate) ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110 z-10" : "hover:bg-slate-100 text-slate-600"}
                  ${isToday(day) && !isSameDay(day, selectedDate) ? "text-blue-600" : ""}
                  ${trainingBorder}
                `}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppLayout user={user}>
      <div className="flex flex-col h-full overflow-hidden">
        <header className="mb-6 flex-shrink-0 flex justify-between items-end px-2">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">
              Painel de Alocação
            </h1>
            <p className="text-slate-500 font-medium">
              Gestão tática e operacional de escalas e logística.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                const today = new Date();
                setSelectedDate(today);
                setCurrentMonth(today);
              }}
              className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <CalendarIcon size={14} className="text-blue-600" /> Ir para Hoje
            </button>
          </div>
        </header>

        <div className="flex flex-1 gap-3 min-h-0 overflow-hidden">
          {/* Sidebar Esquerda: Calendário (Desktop apenas) */}
          <div className="hidden xl:flex w-64 order-1 flex-col flex-shrink-0 min-h-0 overflow-hidden">
            <div className="bg-slate-800 rounded-3xl p-3 mb-4 flex items-center justify-between border border-slate-700">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 hover:bg-white/10 rounded-xl text-white transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  setSelectedDate(today);
                  setCurrentMonth(today);
                }}
                className="text-[10px] font-black text-white uppercase tracking-widest hover:text-blue-400 transition-all flex flex-col items-center"
              >
                <span className="text-blue-500 mb-0.5">Hoje</span>
                {format(new Date(), "dd MMM", { locale: ptBR })}
              </button>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 hover:bg-white/10 rounded-xl text-white transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
              <CalendarBlock month={currentMonth} days={days1} />
              <CalendarBlock month={addMonths(currentMonth, 1)} days={days2} />
            </div>
          </div>

          {/* Área Central: Timeline / Treinamentos */}
          <div className="flex-1 order-3 bg-slate-900 rounded-[32px] shadow-2xl flex flex-col min-w-0 overflow-hidden relative">
            <div className="flex-1 overflow-x-auto p-4 flex gap-3 custom-scrollbar-white">
              {/* Card de Pool (Avulsos) */}
              <div
                className={`
                    w-64 flex-shrink-0 bg-amber-500/10 border border-amber-500/30 rounded-[28px] flex flex-col transition-all cursor-pointer group relative overflow-hidden transform-gpu
                    ${selectedTrainingId === 'pool' ? "ring-2 ring-amber-500 bg-amber-500/20" : "hover:bg-amber-500/15"}
                  `}
                onClick={() => setSelectedTrainingId('pool')}
              >
                <div className="p-4 border-b border-amber-500/20 space-y-1">
                  <h3 className="text-[11px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                    <UserPlus size={14} />
                    Pool de Staffs
                  </h3>
                  <p className="text-[9px] font-bold text-amber-600/70 uppercase">Alocações avulsas (sem evento)</p>
                </div>
                
                <div
                  className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar-white"
                  onDragEnter={(e) => e.preventDefault()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const staffId = e.dataTransfer.getData("staffId") || currentDragData?.staffId;
                    const originId = e.dataTransfer.getData("originTrainingId") || currentDragData?.originTrainingId;
                    const alocId = e.dataTransfer.getData("alocId") || currentDragData?.alocId;
                    if (staffId) {
                      assignStaff(staffId, 'pool', originId, alocId);
                    }
                    currentDragData = null;
                  }}
                >
                  <AnimatePresence>
                    {poolAllocations.map((aloc, idx) => {
                       const staff = staffs.find(s => String(s.id) === String(aloc.staff_id));
                       return (
                         <motion.div
                           key={aloc.id}
                           draggable={true}
                           onDragStart={(e) => {
                             e.dataTransfer.setData("staffId", aloc.staff_id);
                             e.dataTransfer.setData("originTrainingId", 'pool');
                             e.dataTransfer.setData("alocId", aloc.id); 
                             currentDragData = { staffId: aloc.staff_id, originTrainingId: 'pool', alocId: aloc.id };
                           }}
                           className="group/staff relative bg-slate-800 p-1.5 rounded-lg flex items-center border border-white/10 hover:bg-slate-700 transition-all active:scale-95 cursor-grab shadow-sm"
                         >
                           <div className="flex items-center gap-2 truncate flex-1">
                             <span className="text-[10px] font-black text-amber-400/90 w-4 tabular-nums">{idx + 1}</span>
                             <p className="text-[11px] font-bold text-white truncate group-hover/staff:text-blue-300 transition-colors uppercase gap-2 flex items-center">
                               {staff?.nomeAbreviado || "---"}
                               <span className="text-[8px] font-black bg-amber-500/20 px-1 rounded text-amber-400">POOL</span>
                             </p>
                           </div>
                           
                           {/* Status Menu Button (Standardized circle) */}
                           <div className="flex items-center ml-auto pr-0.5 relative">
                              <button
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setStatusMenu({ alocId: aloc.id, x: rect.left, y: rect.top });
                                }}
                                className={`w-6 h-6 rounded-full cursor-pointer hover:scale-110 active:scale-95 transition-all border-[3px] shadow-sm flex-shrink-0 ${
                                  aloc.status === "confirmado"
                                    ? "bg-emerald-500 border-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                    : aloc.status === "recusado"
                                      ? "bg-red-500 border-red-300 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                                      : aloc.status === "whatsapp"
                                        ? "bg-amber-400 border-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.3)]"
                                        : aloc.status === "pessoalmente"
                                          ? "bg-blue-500 border-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                                          : aloc.status === "pre_reserva"
                                            ? "bg-purple-500 border-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                                            : aloc.status === "data_liberada"
                                              ? "bg-pink-500 border-pink-300 shadow-[0_0_10px_rgba(236,72,153,0.3)]"
                                              : "bg-slate-600 border-slate-400"
                                }`}
                                title={aloc.status.toUpperCase()}
                              />
                           </div>
                         </motion.div>
                       );
                    })}
                  </AnimatePresence>
                  
                  {poolAllocations.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center py-10 opacity-20 group-hover:opacity-40 transition-opacity">
                       <UserPlus size={24} className="text-white mb-2" />
                       <span className="text-[8px] font-black text-white uppercase text-center tracking-widest">Arraste para<br/>alocação avulsa</span>
                    </div>
                  )}
                </div>
              </div>

              {trainings.length > 0 ? (
                trainings.map((training) => (
                  <div
                    key={training.id}
                    className={`
                        w-64 flex-shrink-0 bg-white/5 border border-white/10 rounded-[28px] flex flex-col transition-all cursor-pointer group relative overflow-hidden transform-gpu
                        ${selectedTrainingId === training.id ? "ring-2 ring-blue-500 bg-white/[0.08]" : "hover:bg-white/[0.06]"}
                      `}
                    onClick={() => setSelectedTrainingId(training.id)}
                  >
                    {/* Header do Treinamento */}
                    <div className="p-4 border-b border-white/5 space-y-2.5">
                      <div className="flex justify-between items-start">
                        <h3 className="text-[11px] font-black text-white leading-tight uppercase line-clamp-2 tracking-tight">
                          {training.nomeNegocio}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTrainingId(training.id);
                            setSidebarType("history");
                          }}
                          className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                          title="Logs de Alocação"
                        >
                          <History size={12} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-1.5">
                        <div className="flex items-center gap-1.5 text-blue-400 text-[9px] font-black uppercase">
                          <CalendarIcon size={10} />
                          <span>
                            {normalizeDate(training.dataEvento)
                              ? format(
                                  normalizeDate(training.dataEvento)!,
                                  "dd/MM/yyyy",
                                  { locale: ptBR },
                                )
                              : "--/--/----"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-black uppercase leading-tight">
                          <Briefcase size={10} />
                          <span className="truncate">
                            {training.programaNb || "Programa não definido"} -{" "}
                            {training.participantes || 0} PAX
                          </span>
                        </div>

                        <div className="flex items-start gap-1.5 text-white/50 text-[9px] font-bold uppercase">
                          <MapPin
                            size={10}
                            className="text-emerald-500 mt-0.5 flex-shrink-0"
                          />
                          <span className="leading-relaxed line-clamp-1">
                            {[training.localEvento, training.cidade]
                              .filter(Boolean)
                              .join(", ") || "Local não definido"}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1 pt-1.5 border-t border-white/5">
                          <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                            <div className="flex items-center gap-1.5 text-blue-400">
                              <Clock size={10} />
                              <span>
                                S:{" "}
                                {training.hora_saida?.includes("T")
                                  ? format(
                                      new Date(training.hora_saida),
                                      "dd/MM HH:mm",
                                    )
                                  : training.hora_saida || "--:--"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-emerald-400">
                              <History size={10} />
                              <span>
                                R:{" "}
                                {training.hora_retorno?.includes("T")
                                  ? format(
                                      new Date(training.hora_retorno),
                                      "dd/MM HH:mm",
                                    )
                                  : training.hora_retorno || "--:--"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-white/30 text-[9px] font-black uppercase">
                            <Truck size={10} className="text-white/20" />
                            <span className="truncate">
                              {training.transporte || "---"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTrainingId(training.id);
                            setSidebarType("logistica");
                          }}
                          className="flex items-center gap-2 px-2 py-1.5 bg-white/5 hover:bg-blue-600 rounded-xl text-[8px] font-black text-white/50 hover:text-white transition-all uppercase tracking-tighter"
                          title="Logística"
                        >
                          <Truck size={12} className="flex-shrink-0" />
                          <span>Logística</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTrainingId(training.id);
                            setSidebarType("financeiro");
                          }}
                          className="flex items-center gap-2 px-2 py-1.5 bg-white/5 hover:bg-amber-600 rounded-xl text-[8px] font-black text-white/50 hover:text-white transition-all uppercase tracking-tighter"
                          title="Financeiro"
                        >
                          <DollarSign size={12} className="flex-shrink-0" />
                          <span>Financ.</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTrainingId(training.id);
                            setSidebarType("staffs");
                          }}
                          className="flex items-center gap-2 px-2 py-1.5 bg-white/5 hover:bg-cyan-600 rounded-xl text-[8px] font-black text-white/50 hover:text-white transition-all uppercase tracking-tighter"
                          title="Equipe e Uniformes"
                        >
                          <Shirt size={12} className="flex-shrink-0" />
                          <span>Unif/Equipe</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTrainingId(training.id);
                            setSidebarType("checklist");
                          }}
                          className="flex items-center gap-2 px-2 py-1.5 bg-white/5 hover:bg-slate-600 rounded-xl text-[8px] font-black text-white/50 hover:text-white transition-all uppercase tracking-tighter"
                          title="Checklist"
                        >
                          <CheckCircle2 size={12} className="flex-shrink-0" />
                          <span>
                            {(() => {
                              const chk = checklists[training.id];
                              if(!chk) return 'Checklist';
                              const progresses = [chk.progressA, chk.progressB, chk.progressC].filter(p => typeof p === 'number');
                              if (progresses.length === 0) return 'Checklist';
                              const avg = Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length);
                              return avg > 0 ? `Checklist (${avg}%)` : 'Checklist';
                            })()}
                          </span>
                        </button>
                      </div>
                    {/* Lista de Staffs Alocados */}
                    <div
                      className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar-white"
                      onDragEnter={(e) => e.preventDefault()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        const staffId = e.dataTransfer.getData("staffId") || currentDragData?.staffId;
                        const originId = e.dataTransfer.getData("originTrainingId") || currentDragData?.originTrainingId;
                        const alocId = e.dataTransfer.getData("alocId") || currentDragData?.alocId;
                        if (staffId && training.id) {
                          assignStaff(staffId, training.id, originId, alocId);
                        }
                        currentDragData = null;
                      }}
                    >
                      <AnimatePresence>
                        {getAllocationsByTraining(training.id).map(
                          (aloc, idx) => {
                            const staff = staffs.find(
                              (s) => String(s.id) === String(aloc.staff_id),
                            );
                            const isDobrado =
                              filteredAllocations.filter(
                                (a) => a.staff_id === aloc.staff_id,
                              ).length > 1;
                            return (
                              <motion.div
                                key={aloc.id}
                                draggable={true}
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("staffId", aloc.staff_id);
                                  e.dataTransfer.setData("originTrainingId", training.id);
                                  e.dataTransfer.setData("alocId", aloc.id);
                                  currentDragData = {
                                    staffId: aloc.staff_id,
                                    originTrainingId: training.id,
                                    alocId: aloc.id
                                  };
                                }}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                style={{ touchAction: "none", WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}
                                className="group/staff relative bg-slate-800 p-1.5 rounded-lg flex items-center border border-white/10 hover:bg-slate-700 transition-all active:scale-95 cursor-grab shadow-sm"
                              >
                                <div className="flex items-center gap-2 truncate flex-1">
                                  <span className="text-[10px] font-black text-amber-400/90 w-4 tabular-nums">
                                    {idx + 1}
                                  </span>
                                  <div className="truncate">
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-[11px] font-bold text-white truncate group-hover/staff:text-blue-300 transition-colors uppercase tracking-tight leading-none">
                                        {staff?.nomeAbreviado || "---"}
                                      </p>

                                      {/* Badge de Atividade 30 dias */}
                                      {staff?.id &&
                                        staffActivityLast30Days[staff.id] !==
                                          undefined && (
                                          <span
                                            className={`text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm shrink-0 ${
                                              staffActivityLast30Days[
                                                staff.id
                                              ] >= 5
                                                ? "bg-red-500 text-white"
                                                : staffActivityLast30Days[
                                                      staff.id
                                                    ] >= 3
                                                  ? "bg-amber-500 text-white"
                                                  : "bg-emerald-500 text-white"
                                            }`}
                                            title={`Alocações nos últimos 30 dias: ${staffActivityLast30Days[staff.id]}`}
                                          >
                                            {String(
                                              staffActivityLast30Days[staff.id],
                                            ).padStart(2, "0")}
                                          </span>
                                        )}

                                      {isDobrado && (
                                        <span className="bg-red-500/20 text-red-500 text-[7px] font-black px-1 rounded flex-shrink-0 animate-pulse border border-red-500/30">
                                          DOBRA
                                        </span>
                                      )}
                                    </div>
                                    {aloc.motivo_recusa && (
                                      <p className="text-[8px] text-red-400 font-bold italic truncate max-w-[100px] mt-0.5">
                                        {aloc.motivo_recusa}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Tooltip de Observação da Alocação */}
                                {aloc.obs && (
                                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 hidden group-hover/staff:block z-[100] w-60 pointer-events-none">
                                    <div className="bg-amber-600 text-white p-3 rounded-xl shadow-2xl text-[10px] font-bold leading-relaxed border border-amber-500 relative">
                                      <div className="flex items-center gap-2 mb-1.5 text-white">
                                        <Info size={12} strokeWidth={3} />
                                        <span className="uppercase tracking-[0.1em] text-[8px] font-black">
                                          Observação
                                        </span>
                                      </div>
                                      <p className="antialiased whitespace-normal break-words leading-tight">
                                        {aloc.obs}
                                      </p>
                                      <div className="absolute top-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-amber-600 rotate-45 border-l border-t border-amber-500" />
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-center ml-auto pr-0.5 relative">
                                  <button
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      const rect =
                                        e.currentTarget.getBoundingClientRect();
                                      const menuHeight = 220;
                                      const spaceBelow =
                                        window.innerHeight - rect.bottom;
                                      const y =
                                        spaceBelow < menuHeight
                                          ? rect.top - menuHeight
                                          : rect.bottom;
                                      const x = rect.left - 140; // Abre para a esquerda
                                      setStatusMenu({ alocId: aloc.id, x, y });
                                    }}
                                    className={`w-6 h-6 rounded-full cursor-pointer hover:scale-110 active:scale-95 transition-all border-[3px] shadow-sm flex-shrink-0 ${
                                      aloc.status === "confirmado"
                                        ? "bg-emerald-500 border-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                        : aloc.status === "recusado"
                                          ? "bg-red-500 border-red-300 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                                          : aloc.status === "whatsapp"
                                            ? "bg-amber-400 border-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.3)]"
                                            : aloc.status === "pessoalmente"
                                              ? "bg-blue-500 border-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                                              : aloc.status === "pre_reserva"
                                                ? "bg-purple-500 border-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                                                : aloc.status === "data_liberada"
                                                  ? "bg-pink-500 border-pink-300 shadow-[0_0_10px_rgba(236,72,153,0.3)]"
                                                  : "bg-slate-600 border-slate-400"
                                    }`}
                                    title={aloc.status.toUpperCase()}
                                  />
                                </div>
                              </motion.div>
                            );
                          },
                        )}
                      </AnimatePresence>
                      {getAllocationsByTraining(training.id).length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-white/5 p-8 text-center border-2 border-dashed border-white/5 rounded-3xl mt-4">
                          <Plus size={32} className="mb-2" />
                          <p className="text-[10px] font-black uppercase tracking-[0.2em]">
                            Drag Staff Here
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-white/20 bg-white/5 m-8 rounded-[40px] border border-dashed border-white/10">
                  <CalendarIcon size={64} className="mb-6 opacity-10" />
                  <p className="text-xl font-black uppercase tracking-[0.3em] italic">
                    No Ops Found
                  </p>
                  <p className="max-w-xs text-center text-xs font-bold text-white/40 uppercase mt-2">
                    Nenhum treinamento ativado para esta data.
                  </p>
                </div>
              )}
            </div>

            {/* Painel Lateral Interno: Switcher de Sidebar */}
            <AnimatePresence mode="wait">
              {sidebarType && selectedTraining && (
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  className={`fixed top-0 bottom-0 bg-white shadow-2xl z-50 overflow-hidden flex flex-col border-l border-slate-200 ${sidebarType === "checklist" ? "left-0 right-0 w-full" : "right-0 w-[650px]"}`}
                >
                  {/* Header do Sidebar */}
                  <div className="p-4 bg-slate-900 text-white flex justify-between items-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
                    <div className="z-10">
                      <h3 className="text-[12px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">
                        {sidebarType === "logistica"
                          ? "Gerenciamento Logístico"
                          : sidebarType === "financeiro"
                            ? "Controle Financeiro"
                            : sidebarType === "uniformes" ||
                                sidebarType === "staffs"
                              ? "Gestão de Equipe e Uniformes"
                              : sidebarType === "history"
                                ? "Histórico de Alocações"
                                : "Checklist Operacional"}
                      </h3>
                      <p className="text-lg font-black uppercase tracking-tight line-clamp-1">
                        {selectedTraining.nomeNegocio}
                      </p>
                    </div>
                    <button
                      onClick={() => setSidebarType(null)}
                      className="p-2 hover:bg-white/10 rounded-full transition-all z-10"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  {/* Conteúdo dinâmico baseado no sidebarType */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/30">
                    {sidebarType === "logistica" && (
                      <div className="space-y-3 pb-8">
                        {/* SEÇÃO: PRÉ EVENTO */}
                        <div className="bg-white border border-slate-200 rounded-[20px] overflow-hidden shadow-sm">
                          <div className="bg-slate-800 p-2.5 h-12 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="p-1 bg-blue-500/20 rounded-lg">
                                <Clock size={12} className="text-blue-400" />
                              </div>
                              <h4 className="font-black uppercase text-[11px] tracking-widest text-white">
                                PRÉ EVENTO
                              </h4>
                            </div>
                            <div className="flex items-center gap-3">
                              {logisticsForm.conferido_pre_at ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex flex-col items-end">
                                    <span className="text-[12px] font-black text-emerald-400 uppercase tracking-tighter">
                                      CONFERIDO EM{" "}
                                      {format(
                                        new Date(
                                          logisticsForm.conferido_pre_at,
                                        ),
                                        "dd/MM HH:mm",
                                      )}
                                    </span>
                                    <span className="text-[11px] font-bold text-slate-400 uppercase">
                                      POR {logisticsForm.conferido_pre_by}
                                    </span>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      const update = {
                                        conferido_pre_at: null,
                                        conferido_pre_by: "",
                                      };
                                      const newData = {
                                        ...logisticsForm,
                                        ...update,
                                      };
                                      setLogisticsForm(newData);
                                      await handleSaveLogistics(
                                        newData,
                                        "Conferência de logística PRÉ removida.",
                                      );
                                    }}
                                    className="px-2 py-1 bg-red-600/10 text-red-500 border border-red-500/20 rounded text-[11px] font-black hover:bg-red-600 hover:text-white transition-all uppercase"
                                  >
                                    Desfazer
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={async () => {
                                    const update = {
                                      conferido_pre_at:
                                        new Date().toISOString(),
                                      conferido_pre_by:
                                        user?.nomeAbreviado ||
                                        user?.nome ||
                                        "Admin",
                                    };
                                    const newData = {
                                      ...logisticsForm,
                                      ...update,
                                    };
                                    setLogisticsForm(newData);
                                    await handleSaveLogistics(
                                      newData,
                                      `Logística PRÉ conferida por ${update.conferido_pre_by}.`,
                                    );
                                  }}
                                  className="px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-[10px] font-black hover:bg-blue-600 hover:text-white transition-all uppercase tracking-widest"
                                >
                                  CONFERIR
                                </button>
                              )}
                            </div>
                          </div>
                          <div
                            className={`p-3 space-y-2 transition-opacity ${logisticsForm.conferido_pre_at ? "opacity-60 pointer-events-none" : ""}`}
                          >
                            <div className="grid grid-cols-2 gap-2.5">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-0.5 relative">
                                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                                    H. Saída
                                  </label>
                                  <div
                                    onClick={() =>
                                      setActivePicker("hora_saida")
                                    }
                                    className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-lg font-bold text-[13px] text-slate-700 cursor-pointer hover:border-blue-300 transition-colors flex justify-between items-center"
                                  >
                                    <span>
                                      {formatLogisticsDateDisplay(
                                        logisticsForm.hora_saida,
                                      ) || "--/-- --:--"}
                                    </span>
                                    <Clock
                                      size={14}
                                      className="text-slate-300"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-0.5 relative">
                                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                                    H. Retorno
                                  </label>
                                  <div
                                    onClick={() =>
                                      setActivePicker("hora_retorno")
                                    }
                                    className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-lg font-bold text-[13px] text-slate-700 cursor-pointer hover:border-blue-300 transition-colors flex justify-between items-center"
                                  >
                                    <span>
                                      {formatLogisticsDateDisplay(
                                        logisticsForm.hora_retorno,
                                      ) || "--/-- --:--"}
                                    </span>
                                    <Clock
                                      size={14}
                                      className="text-slate-300"
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-0.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                                  Transporte
                                </label>
                                <input
                                  type="text"
                                  placeholder="Ex: Van 15 lugares..."
                                  value={logisticsForm.transporte || ""}
                                  onChange={(e) =>
                                    setLogisticsForm({
                                      ...logisticsForm,
                                      transporte: e.target.value,
                                    })
                                  }
                                  className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-lg font-bold text-[13px] text-slate-700 outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-0.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                                  Qtd Staffs
                                </label>
                                <input
                                  type="number"
                                  value={logisticsForm.qtd_staffs || 0}
                                  onChange={(e) =>
                                    setLogisticsForm({
                                      ...logisticsForm,
                                      qtd_staffs: parseInt(e.target.value),
                                    })
                                  }
                                  className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-lg font-bold text-[13px] text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              </div>
                              <div className="space-y-0.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                                  Qtd Equipes
                                </label>
                                <input
                                  type="number"
                                  value={logisticsForm.qtd_equipes || 0}
                                  onChange={(e) =>
                                    setLogisticsForm({
                                      ...logisticsForm,
                                      qtd_equipes: parseInt(e.target.value),
                                    })
                                  }
                                  className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-lg font-bold text-[13px] text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2.5">
                              <div className="space-y-0.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                                  Coord. Interno
                                </label>
                                <input
                                  type="text"
                                  value={
                                    logisticsForm.coordenador_interno || ""
                                  }
                                  onChange={(e) =>
                                    setLogisticsForm({
                                      ...logisticsForm,
                                      coordenador_interno: e.target.value,
                                    })
                                  }
                                  className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-lg font-bold text-[13px] text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              </div>
                              <div className="space-y-0.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                                  Coord. Evento
                                </label>
                                <input
                                  type="text"
                                  value={logisticsForm.coordenador_evento || ""}
                                  onChange={(e) =>
                                    setLogisticsForm({
                                      ...logisticsForm,
                                      coordenador_evento: e.target.value,
                                    })
                                  }
                                  className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-lg font-bold text-[13px] text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              </div>
                              <div className="space-y-0.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                                  Resp. Montagem
                                </label>
                                <input
                                  type="text"
                                  value={
                                    logisticsForm.responsavel_montagem || ""
                                  }
                                  onChange={(e) =>
                                    setLogisticsForm({
                                      ...logisticsForm,
                                      responsavel_montagem: e.target.value,
                                    })
                                  }
                                  className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-lg font-bold text-[13px] text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* SEÇÃO: PÓS EVENTO */}
                        <div className="bg-white border border-slate-200 rounded-[20px] overflow-hidden shadow-sm">
                          <div className="bg-amber-600 p-2.5 h-12 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="p-1 bg-white/20 rounded-lg">
                                <History size={12} className="text-white" />
                              </div>
                              <h4 className="font-black uppercase text-[11px] tracking-widest text-white">
                                PÓS EVENTO
                              </h4>
                            </div>
                            <div className="flex items-center gap-3">
                              {logisticsForm.conferido_pos_at ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex flex-col items-end">
                                    <span className="text-[12px] font-black text-white uppercase tracking-tighter">
                                      CONFERIDO EM{" "}
                                      {format(
                                        new Date(
                                          logisticsForm.conferido_pos_at,
                                        ),
                                        "dd/MM HH:mm",
                                      )}
                                    </span>
                                    <span className="text-[11px] font-bold text-amber-200 uppercase">
                                      POR {logisticsForm.conferido_pos_by}
                                    </span>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      const update = {
                                        conferido_pos_at: null,
                                        conferido_pos_by: "",
                                      };
                                      const newData = {
                                        ...logisticsForm,
                                        ...update,
                                      };
                                      setLogisticsForm(newData);
                                      await handleSaveLogistics(
                                        newData,
                                        "Conferência de logística PÓS removida.",
                                      );
                                    }}
                                    className="px-2 py-0.5 bg-white/20 text-white border border-white/30 rounded text-[10px] font-black hover:bg-white hover:text-amber-600 transition-all uppercase"
                                  >
                                    Desfazer
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={async () => {
                                    const update = {
                                      conferido_pos_at:
                                        new Date().toISOString(),
                                      conferido_pos_by:
                                        user?.nomeAbreviado ||
                                        user?.nome ||
                                        "Admin",
                                    };
                                    const newData = {
                                      ...logisticsForm,
                                      ...update,
                                    };
                                    setLogisticsForm(newData);
                                    await handleSaveLogistics(
                                      newData,
                                      `Logística PÓS conferida por ${update.conferido_pos_by}.`,
                                    );
                                  }}
                                  className="px-3 py-1.5 bg-white/20 text-white border border-white/30 rounded-lg text-[10px] font-black hover:bg-white hover:text-amber-600 transition-all uppercase tracking-widest"
                                >
                                  CONFERIR
                                </button>
                              )}
                            </div>
                          </div>
                          <div
                            className={`p-3 space-y-2 transition-opacity ${logisticsForm.conferido_pos_at ? "opacity-60 pointer-events-none" : ""}`}
                          >
                            <div className="grid grid-cols-2 gap-2.5">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-0.5 relative">
                                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                                    Saída Real
                                  </label>
                                  <div
                                    onClick={() =>
                                      setActivePicker("hora_real_saida")
                                    }
                                    className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-lg font-bold text-[13px] text-slate-700 cursor-pointer hover:border-blue-300 transition-colors flex justify-between items-center"
                                  >
                                    <span>
                                      {formatLogisticsDateDisplay(
                                        logisticsForm.hora_real_saida,
                                      ) || "--/-- --:--"}
                                    </span>
                                    <Clock
                                      size={14}
                                      className="text-slate-300"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-0.5 relative">
                                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                                    Chegada Real
                                  </label>
                                  <div
                                    onClick={() =>
                                      setActivePicker("hora_real_chegada")
                                    }
                                    className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-lg font-bold text-[13px] text-slate-700 cursor-pointer hover:border-blue-300 transition-colors flex justify-between items-center"
                                  >
                                    <span>
                                      {formatLogisticsDateDisplay(
                                        logisticsForm.hora_real_chegada,
                                      ) || "--/-- --:--"}
                                    </span>
                                    <Clock
                                      size={14}
                                      className="text-slate-300"
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-0.5">
                                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                                    Voucher
                                  </label>
                                  <div className="flex gap-1 bg-slate-50 border border-slate-200 p-1 rounded-lg">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setLogisticsForm({
                                          ...logisticsForm,
                                          voucher_alimentacao: "Sim",
                                        })
                                      }
                                      className={`flex-1 py-1 rounded-md text-[11px] font-black transition-all ${logisticsForm.voucher_alimentacao === "Sim" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                                    >
                                      SIM
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setLogisticsForm({
                                          ...logisticsForm,
                                          voucher_alimentacao: "Não",
                                        })
                                      }
                                      className={`flex-1 py-1 rounded-md text-[11px] font-black transition-all ${logisticsForm.voucher_alimentacao === "Não" ? "bg-white text-red-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                                    >
                                      NÃO
                                    </button>
                                  </div>
                                </div>
                                <div className="space-y-0.5">
                                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                                    Bombeiro
                                  </label>
                                  <div className="flex gap-1 bg-slate-50 border border-slate-200 p-1 rounded-lg">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setLogisticsForm({
                                          ...logisticsForm,
                                          bombeiro: "Sim",
                                        })
                                      }
                                      className={`flex-1 py-1 rounded-md text-[11px] font-black transition-all ${logisticsForm.bombeiro === "Sim" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                                    >
                                      SIM
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setLogisticsForm({
                                          ...logisticsForm,
                                          bombeiro: "Não",
                                        })
                                      }
                                      className={`flex-1 py-1 rounded-md text-[11px] font-black transition-all ${logisticsForm.bombeiro === "Não" ? "bg-white text-red-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                                    >
                                      NÃO
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Observações */}
                        <div className="bg-white border border-slate-200 rounded-[20px] overflow-hidden shadow-sm">
                          <div className="bg-slate-700 p-2.5 h-12 flex items-center gap-2">
                            <div className="p-1 bg-white/20 rounded-lg">
                              <MessageSquare size={12} className="text-white" />
                            </div>
                            <h4 className="font-black uppercase text-[11px] tracking-widest text-white">
                              OBSERVAÇÕES
                            </h4>
                          </div>
                          <div className="p-3 space-y-2">
                            <div className="space-y-0.5">
                              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">
                                Observações de Logística
                              </label>
                              <textarea
                                rows={1}
                                value={logisticsForm.obs_logistica || ""}
                                onFocus={(e) => {
                                  e.target.style.height = "auto";
                                  e.target.style.height =
                                    e.target.scrollHeight + "px";
                                }}
                                onInput={(e) => {
                                  const target =
                                    e.target as HTMLTextAreaElement;
                                  target.style.height = "auto";
                                  target.style.height =
                                    target.scrollHeight + "px";
                                }}
                                onChange={(e) =>
                                  setLogisticsForm({
                                    ...logisticsForm,
                                    obs_logistica: e.target.value,
                                  })
                                }
                                className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-bold text-[12px] text-slate-700 outline-none focus:ring-1 focus:ring-slate-400 resize-none overflow-hidden min-h-[38px]"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">
                                Observações Gerais
                              </label>
                              <textarea
                                rows={1}
                                value={logisticsForm.obs_geral_logistica || ""}
                                onFocus={(e) => {
                                  e.target.style.height = "auto";
                                  e.target.style.height =
                                    e.target.scrollHeight + "px";
                                }}
                                onInput={(e) => {
                                  const target =
                                    e.target as HTMLTextAreaElement;
                                  target.style.height = "auto";
                                  target.style.height =
                                    target.scrollHeight + "px";
                                }}
                                onChange={(e) =>
                                  setLogisticsForm({
                                    ...logisticsForm,
                                    obs_geral_logistica: e.target.value,
                                  })
                                }
                                className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-bold text-[12px] text-slate-700 outline-none focus:ring-1 focus:ring-slate-400 resize-none overflow-hidden min-h-[38px]"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {sidebarType === "financeiro" && (
                      <div className="space-y-3">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <label className="block text-[9px] font-black uppercase text-slate-400 mb-1.5">
                            Período Padrão (Todos)
                          </label>
                          <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                            <button
                              onClick={async () => {
                                if (!canWrite) {
                                  alert("Acesso negado: Você não possui a permissão de escrita necessária.");
                                  return;
                                }
                                setFinanceGlobalPeriod("cheio");
                                // Persist preference in training
                                if (selectedTraining?.id) {
                                  await updateDoc(
                                    doc(db, "trainings", selectedTraining.id),
                                    { finance_default_period: "cheio" },
                                  );
                                }
                                
                                const confirmed = getAllocationsByTraining(
                                  selectedTraining.id,
                                ).filter((a) => a.status === "confirmado");
                                for (const a of confirmed) {
                                  if (!a.finance_period_is_manual) {
                                    const staff = staffs.find(
                                      (s) => s.id === a.staff_id,
                                    );
                                    await updateFinance(
                                      a.id,
                                      { finance_period: "cheio" },
                                      `Período de ${staff?.nomeAbreviado} alterado para DIÁRIA INTEIRA (Massa).`,
                                    );
                                  }
                                }
                              }}
                              className={`flex-1 py-1 rounded-md text-[9px] font-black transition-all ${financeGlobalPeriod === "cheio" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                            >
                              TODOS: DIÁRIA
                            </button>
                            <button
                              onClick={async () => {
                                if (!canWrite) {
                                  alert("Acesso negado: Você não possui a permissão de escrita necessária.");
                                  return;
                                }
                                setFinanceGlobalPeriod("meio");
                                // Persist preference in training
                                if (selectedTraining?.id) {
                                  await updateDoc(
                                    doc(db, "trainings", selectedTraining.id),
                                    { finance_default_period: "meio" },
                                  );
                                }

                                const confirmed = getAllocationsByTraining(
                                  selectedTraining.id,
                                ).filter((a) => a.status === "confirmado");
                                for (const a of confirmed) {
                                  if (!a.finance_period_is_manual) {
                                    const staff = staffs.find(
                                      (s) => s.id === a.staff_id,
                                    );
                                    await updateFinance(
                                      a.id,
                                      { finance_period: "meio" },
                                      `Período de ${staff?.nomeAbreviado} alterado para MEIA DIÁRIA (Massa).`,
                                    );
                                  }
                                }
                              }}
                              className={`flex-1 py-1 rounded-md text-[9px] font-black transition-all ${financeGlobalPeriod === "meio" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                            >
                              TODOS: MEIA
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          {getAllocationsByTraining(selectedTraining.id)
                            .filter((a) => a.status === "confirmado")
                            .map((aloc: any, idx: number) => {
                              const staff = staffs.find(
                                (s) => String(s.id) === String(aloc.staff_id),
                              );
                              
                              // Prioriza a função salva na alocação, senão usa a do cadastro do staff
                              const effectiveFuncId = aloc.finance_funcao_id || staff?.funcaoId;
                              const func = financeFunctions.find(
                                (f) => f.id === effectiveFuncId,
                              );

                              const period =
                                aloc.finance_period || financeGlobalPeriod;
                              const baseValue = aloc.finance_is_manual
                                ? parseFloat(aloc.finance_base_value) || 0
                                : period === "meio"
                                  ? parseFloat(func?.valor_meio_periodo) || 0
                                  : parseFloat(func?.valor_diaria) || 0;

                              const genericVoucher = financeAdditionals.find(
                                (a) =>
                                  a.nome?.toLowerCase() === "voucher" ||
                                  a.nome?.toLowerCase().includes("alimentação"),
                              );
                              const defaultVoucherValue = genericVoucher
                                ? parseFloat(genericVoucher.valor_padrao) || 0
                                : parseFloat(
                                    selectedTraining.voucher_alimentacao,
                                  ) || 0;

                              const isVoucherActive =
                                aloc.finance_voucher === "sim" ||
                                selectedTraining.voucher_alimentacao === "Sim";
                              const voucherVal = isVoucherActive
                                ? aloc.finance_voucher_is_manual
                                  ? parseFloat(aloc.finance_voucher_value) || 0
                                  : defaultVoucherValue
                                : 0;

                              const extrasVal = (
                                aloc.finance_extras || []
                              ).reduce(
                                (acc: number, curr: any) =>
                                  acc + (parseFloat(curr.value) || 0),
                                0,
                              );
                              const total = baseValue + voucherVal + extrasVal;

                              const isFacilitador =
                                func?.nome
                                  .toLowerCase()
                                  .includes("facilitador") ||
                                func?.nome.toLowerCase().includes("instrutor");

                              const cardColors = [
                                "bg-blue-50/40 border-blue-200 hover:border-blue-400",
                                "bg-emerald-50/40 border-emerald-200 hover:border-emerald-400",
                                "bg-purple-50/40 border-purple-200 hover:border-purple-400",
                                "bg-amber-50/40 border-amber-200 hover:border-amber-400",
                                "bg-rose-50/40 border-rose-200 hover:border-rose-400",
                                "bg-indigo-50/40 border-indigo-200 hover:border-indigo-400",
                              ];
                              const currentStyle =
                                cardColors[idx % cardColors.length];

                              return (
                                <div
                                  key={aloc.id}
                                  className={`${currentStyle} p-1.5 rounded-lg border-2 shadow-sm transition-all group relative overflow-hidden flex flex-col gap-1.5`}
                                >
                                  <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -mr-6 -mt-6 blur-xl"></div>

                                  {/* SINGLE LINE LAYOUT */}
                                  <div className="flex items-center gap-2 relative z-10 w-full overflow-x-auto no-scrollbar py-0.5">
                                    {/* 1. NOME */}
                                    <div className="flex items-center gap-1.5 bg-white/80 px-1.5 py-1 rounded border border-white shadow-sm shrink-0">
                                      <p className="text-[10px] font-black uppercase text-slate-900 whitespace-nowrap">
                                        {staff?.nomeAbreviado || "Staff"}
                                      </p>
                                      {staff?.id &&
                                        staffActivityLast30Days[staff.id] !==
                                          undefined && (
                                          <span
                                            className={`text-[8px] font-black px-1 py-0.5 rounded-md shadow-sm ${
                                              staffActivityLast30Days[
                                                staff.id
                                              ] >= 5
                                                ? "bg-red-500 text-white"
                                                : staffActivityLast30Days[
                                                      staff.id
                                                    ] >= 3
                                                  ? "bg-amber-500 text-white"
                                                  : "bg-emerald-500 text-white"
                                            }`}
                                          >
                                            {String(
                                              staffActivityLast30Days[staff.id],
                                            ).padStart(2, "0")}
                                          </span>
                                        )}
                                    </div>

                                    {/* 2. FUNÇÃO */}
                                    <div className="flex-1 min-w-[120px]">
                                      <select
                                        value={aloc.finance_funcao_id || staff?.funcaoId || ""}
                                        onChange={async (e) => {
                                          const newFuncId = e.target.value;
                                          const oldFuncId = aloc.finance_funcao_id || staff?.funcaoId;
                                          const oldFunc =
                                            financeFunctions.find(
                                              (f) => f.id === oldFuncId,
                                            )?.nome || "NÃO DEFINIDA";
                                          const newFunc =
                                            financeFunctions.find(
                                              (f) => f.id === newFuncId,
                                            )?.nome || "NÃO DEFINIDA";
                                          
                                          await updateFinance(
                                            aloc.id,
                                            { finance_funcao_id: newFuncId },
                                            `Função de ${staff?.nomeAbreviado || "Staff"} alterada de [${oldFunc}] para [${newFunc}] apenas nesta alocação.`,
                                          );
                                        }}
                                        className="w-full text-[9px] font-bold text-blue-800 bg-white/80 border border-blue-100 px-2 py-1 rounded uppercase outline-none cursor-pointer hover:border-blue-400 transition-all shadow-sm appearance-none"
                                      >
                                        <option value="">
                                          FUNÇÃO NÃO DEFINIDA
                                        </option>
                                        {financeFunctions.map((f) => (
                                          <option key={f.id} value={f.id}>
                                            {f.nome}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* 3. ETIQUETA INTEIRA/MEIA */}
                                    <div className="relative flex items-center shrink-0">
                                      <select
                                        value={aloc.finance_period || "cheio"}
                                        onChange={(e) =>
                                          updateFinance(
                                            aloc.id,
                                            {
                                              finance_period: e.target.value,
                                              finance_period_is_manual: true,
                                            },
                                            `Período de ${staff?.nomeAbreviado} alterado para ${e.target.value === "cheio" ? "DIÁRIA INTEIRA" : "MEIA DIÁRIA"}.`,
                                          )
                                        }
                                        className={`text-[8px] font-black py-1 px-2 rounded uppercase outline-none shadow-sm appearance-none border transition-all ${aloc.finance_period === "meio" ? "bg-amber-600 border-amber-700 text-white" : "bg-slate-600 border-slate-700 text-white"}`}
                                      >
                                        <option value="cheio">INTEIRA</option>
                                        <option value="meio">MEIA</option>
                                      </select>
                                      {aloc.finance_period_is_manual && (
                                        <button
                                          onClick={() =>
                                            updateFinance(
                                              aloc.id,
                                              {
                                                finance_period_is_manual: false,
                                                finance_period:
                                                  financeGlobalPeriod,
                                              },
                                              `Trava manual de período de ${staff?.nomeAbreviado} removida.`,
                                            )
                                          }
                                          className="absolute -top-1 -right-1 w-3.5 h-3.5 flex items-center justify-center text-[7px] font-black bg-orange-400 text-white rounded-full border border-white shadow-sm z-20"
                                          title="Resetar para Automático"
                                        >
                                          M
                                        </button>
                                      )}
                                    </div>

                                    {/* 4. VALOR BASE */}
                                    <div className="w-24 shrink-0">
                                      <div className="relative flex items-center">
                                        <span className="absolute left-1.5 text-[8px] font-black text-slate-400">
                                          R$
                                        </span>
                                        <input
                                          type="number"
                                          key={`base-${aloc.id}-${baseValue}`}
                                          defaultValue={baseValue}
                                          onBlur={(e) => {
                                            const val =
                                              parseFloat(e.target.value) || 0;
                                            if (val !== baseValue) {
                                              updateFinance(
                                                aloc.id,
                                                {
                                                  finance_base_value: val,
                                                  finance_is_manual: true,
                                                },
                                                `Valor base de ${staff?.nomeAbreviado} alterado para R$ ${val}.`,
                                              );
                                            }
                                          }}
                                          className={`w-full border py-1 pl-5 pr-4 rounded text-[9px] font-black outline-none focus:ring-1 focus:ring-blue-400 tabular-nums transition-all ${aloc.finance_is_manual ? "bg-orange-50 border-orange-200 text-orange-900" : "bg-white border-slate-200 text-slate-700"}`}
                                        />
                                        {aloc.finance_is_manual && (
                                          <button
                                            onClick={() =>
                                              updateFinance(
                                                aloc.id,
                                                {
                                                  finance_is_manual: false,
                                                  finance_base_value: null,
                                                },
                                                `Valor base de ${staff?.nomeAbreviado} resetado para automático.`,
                                              )
                                            }
                                            className="absolute right-0.5 w-3.5 h-3.5 flex items-center justify-center text-[7px] font-black bg-orange-200 text-orange-900 rounded hover:bg-orange-500 hover:text-white transition-all shadow-sm border border-orange-300"
                                            title="Voltar Automático"
                                          >
                                            M
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* 5. VOUCHER */}
                                    <div className="shrink-0">
                                      <div className="flex bg-white rounded border overflow-hidden shadow-sm">
                                        <select
                                          value={aloc.finance_voucher}
                                          onChange={(e) =>
                                            updateFinance(
                                              aloc.id,
                                              {
                                                finance_voucher: e.target.value,
                                              },
                                              `Voucher de ${staff?.nomeAbreviado} alterado para ${e.target.value.toUpperCase()}.`,
                                            )
                                          }
                                          className={`p-1 text-[8px] font-black outline-none appearance-none text-center transition-all ${aloc.finance_voucher === "sim" ? "bg-purple-600 text-white" : "bg-white text-slate-500"}`}
                                        >
                                          <option value="nao">
                                            VOUCHER: NÃO
                                          </option>
                                          <option value="sim">
                                            VOUCHER: SIM
                                          </option>
                                        </select>
                                        {aloc.finance_voucher === "sim" && (
                                          <div className="relative flex items-center w-16 border-l border-slate-200">
                                            <span className="absolute left-1 text-[7px] font-black text-slate-400">
                                              R$
                                            </span>
                                            <input
                                              type="number"
                                              key={`voucher-${aloc.id}-${voucherVal}`}
                                              defaultValue={voucherVal}
                                              onBlur={(e) => {
                                                const val =
                                                  parseFloat(e.target.value) ||
                                                  0;
                                                if (val !== voucherVal) {
                                                  updateFinance(
                                                    aloc.id,
                                                    {
                                                      finance_voucher_value:
                                                        val,
                                                      finance_voucher_is_manual: true,
                                                    },
                                                    `Valor do voucher de ${staff?.nomeAbreviado} alterado para R$ ${val}.`,
                                                  );
                                                }
                                              }}
                                              className={`w-full py-1 pl-4 pr-1 text-[8px] font-black outline-none tabular-nums transition-all ${aloc.finance_voucher_is_manual ? "bg-orange-50 text-orange-900" : "bg-purple-50 text-purple-700"}`}
                                            />
                                            {aloc.finance_voucher_is_manual && (
                                              <button
                                                onClick={() =>
                                                  updateFinance(
                                                    aloc.id,
                                                    {
                                                      finance_voucher_is_manual: false,
                                                      finance_voucher_value:
                                                        null,
                                                    },
                                                    `Valor do voucher de ${staff?.nomeAbreviado} resetado para automático.`,
                                                  )
                                                }
                                                className="absolute right-0.5 w-3 h-3 flex items-center justify-center text-[6px] font-black bg-orange-100 text-orange-900 rounded hover:bg-orange-500 hover:text-white transition-all border border-orange-200"
                                                title="Voltar Automático"
                                              >
                                                M
                                              </button>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* ADICIONAIS EXTRAS (SUGESTÃO A) */}
                                  {(addingExtraFor === aloc.id ||
                                    (aloc.finance_extras || []).length > 0) && (
                                    <div className="space-y-1.5 pt-1.5 border-t border-black/5 mt-1">
                                      <div className="px-1">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">
                                          Adicionais Extras
                                        </span>
                                      </div>

                                    {addingExtraFor === aloc.id && (
                                      <div className="bg-blue-50/50 p-2 rounded-lg border border-blue-100 flex flex-col gap-2 mt-1">
                                        <div className="flex gap-1.5">
                                          <select
                                            autoFocus
                                            value={newExtraDesc}
                                            onChange={(e) => {
                                              const selectedId = e.target.value;
                                              setNewExtraDesc(selectedId);
                                              const bono =
                                                financeAdditionals.find(
                                                  (a) => a.id === selectedId,
                                                );
                                              if (bono) {
                                                setNewExtraValue(
                                                  parseFloat(
                                                    bono.valor_padrao || 0,
                                                  ).toString(),
                                                );
                                              }
                                            }}
                                            className="flex-1 text-[9px] font-bold p-1.5 border border-blue-200 rounded outline-none focus:ring-1 focus:ring-blue-400 uppercase bg-white"
                                          >
                                            <option value="">
                                              SELECIONE UM ADICIONAL
                                            </option>
                                            {financeAdditionals.map((a) => (
                                              <option key={a.id} value={a.id}>
                                                {a.nome?.toUpperCase()}
                                              </option>
                                            ))}
                                          </select>
                                          <div className="w-20 relative">
                                            <span className="absolute left-1 top-1.5 text-[8px] font-black text-blue-400">
                                              R$
                                            </span>
                                            <input
                                              placeholder="0,00"
                                              value={newExtraValue}
                                              onChange={(e) =>
                                                setNewExtraValue(e.target.value)
                                              }
                                              className="w-full text-[9px] font-bold p-1.5 pl-4 border border-blue-200 rounded outline-none focus:ring-1 focus:ring-blue-400"
                                            />
                                          </div>
                                        </div>
                                        <div className="flex justify-end gap-1.5">
                                          <button
                                            onClick={() => {
                                              setAddingExtraFor(null);
                                              setNewExtraDesc("");
                                              setNewExtraValue("");
                                            }}
                                            className="px-2 py-1 text-[8px] font-black text-slate-500 hover:text-slate-700"
                                          >
                                            CANCELAR
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault();
                                              submitNewExtra(
                                                aloc.id,
                                                staff?.nomeAbreviado || "",
                                                aloc.finance_extras || [],
                                              );
                                            }}
                                            disabled={
                                              !newExtraDesc || !newExtraValue
                                            }
                                            className="px-2 py-1 bg-blue-600 text-white rounded text-[8px] font-black hover:bg-blue-700 disabled:opacity-50"
                                          >
                                            SALVAR ADICIONAL
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    {(aloc.finance_extras || []).length > 0 && (
                                      <div className="space-y-1">
                                        {aloc.finance_extras.map(
                                          (extra: any) => (
                                            <div
                                              key={extra.id}
                                              className="flex items-center justify-between bg-white/60 p-1.5 rounded-lg border border-white group/extra"
                                            >
                                              <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                                <span className="text-[9px] font-black text-slate-700 uppercase">
                                                  {extra.description}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black text-slate-900 tabular-nums">
                                                  R${" "}
                                                  {parseFloat(
                                                    extra.value,
                                                  ).toLocaleString("pt-BR", {
                                                    minimumFractionDigits: 2,
                                                  })}
                                                </span>
                                                <button
                                                  onClick={() => {
                                                    const newExtras =
                                                      aloc.finance_extras.filter(
                                                        (e: any) =>
                                                          e.id !== extra.id,
                                                      );
                                                    updateFinance(
                                                      aloc.id,
                                                      {
                                                        finance_extras:
                                                          newExtras,
                                                      },
                                                      `Adicional [${extra.description}] removido de ${staff?.nomeAbreviado}.`,
                                                    );
                                                  }}
                                                  className="w-4 h-4 flex items-center justify-center text-slate-300 hover:text-red-500 transition-all"
                                                >
                                                  <X
                                                    size={10}
                                                    strokeWidth={3}
                                                  />
                                                </button>
                                              </div>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}

                                  {/* 6. TOTAL A PAGAR - Linha de baixo */}
                                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-emerald-100">
                                    <div>
                                      {addingExtraFor !== aloc.id && (
                                        <button
                                          onClick={() =>
                                            setAddingExtraFor(aloc.id)
                                          }
                                          className="flex items-center gap-1.5 px-2 py-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 text-[10px] font-black hover:bg-blue-600 hover:text-white transition-all uppercase tracking-tight"
                                        >
                                          <Plus size={12} strokeWidth={3} />
                                          ADICIONAR EXTRA
                                        </button>
                                      )}
                                    </div>

                                    <div className="bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-3">
                                      <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                                        Total a Pagar
                                      </span>
                                      <p className="text-[12px] font-black text-emerald-700 tabular-nums">
                                        R${" "}
                                        {total.toLocaleString("pt-BR", {
                                          minimumFractionDigits: 2,
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                          {getAllocationsByTraining(selectedTraining.id).filter(
                            (a) => a.status === "confirmado",
                          ).length === 0 && (
                            <div className="py-10 text-center opacity-40 italic text-[10px] text-slate-400">
                              Nenhum staff confirmado.
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-100">
                          <div className="flex justify-between items-center bg-slate-900 p-2 rounded-lg shadow-sm">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">
                              Total Estimado
                            </span>
                            <span className="text-sm font-black text-white tabular-nums">
                              R${" "}
                              {getAllocationsByTraining(selectedTraining.id)
                                .filter((a) => a.status === "confirmado")
                                .reduce((acc, aloc) => {
                                  const staff = staffs.find(
                                    (s) =>
                                      String(s.id) === String(aloc.staff_id),
                                  );
                                  const func = financeFunctions.find(
                                    (f) => f.id === staff?.funcaoId,
                                  );
                                  const period =
                                    aloc.finance_period || financeGlobalPeriod;
                                  const baseValue = aloc.finance_is_manual
                                    ? parseFloat(aloc.finance_base_value) || 0
                                    : period === "meio"
                                      ? parseFloat(func?.valor_meio_periodo) ||
                                        0
                                      : parseFloat(func?.valor_diaria) || 0;

                                  const extrasVal = (
                                    aloc.finance_extras || []
                                  ).reduce(
                                    (acc: number, curr: any) =>
                                      acc + (parseFloat(curr.value) || 0),
                                    0,
                                  );

                                  const genericVoucher =
                                    financeAdditionals.find(
                                      (a) =>
                                        a.nome?.toLowerCase() === "voucher" ||
                                        a.nome
                                          ?.toLowerCase()
                                          .includes("alimentação"),
                                    );
                                  const defaultVoucherValue = genericVoucher
                                    ? parseFloat(genericVoucher.valor_padrao) ||
                                      0
                                    : parseFloat(
                                        selectedTraining.voucher_alimentacao,
                                      ) || 0;

                                  const isVoucherActive =
                                    aloc.finance_voucher === "sim" ||
                                    selectedTraining.voucher_alimentacao ===
                                      "Sim";
                                  const voucherVal = isVoucherActive
                                    ? aloc.finance_voucher_is_manual
                                      ? parseFloat(
                                          aloc.finance_voucher_value,
                                        ) || 0
                                      : defaultVoucherValue
                                    : 0;

                                  return (
                                    acc + baseValue + voucherVal + extrasVal
                                  );
                                }, 0)
                                .toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2,
                                })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {(sidebarType === "staffs" ||
                      sidebarType === "uniformes") && (
                      <UnifiedStaffReport
                        training={selectedTrainingId === 'pool' ? 'pool' : selectedTraining}
                        staffs={staffs}
                        allocations={selectedTrainingId === 'pool' ? poolAllocations : getAllocationsByTraining(
                          selectedTrainingId!,
                        )}
                      />
                    )}

                    {sidebarType === "checklist" && (
                      <ChecklistSidebar 
                        training={trainings.find(t => t.id === selectedTrainingId)} 
                        user={user} 
                      />
                    )}

                    {sidebarType === "history" && (
                      <div className="space-y-0 pt-2 pb-10">
                        {historyItems.length > 0 ? (
                          historyItems.map((item, i) => (
                            <div
                              key={item.id}
                              className="relative pl-6 pb-4 border-l border-slate-200 last:border-0 ml-1"
                            >
                              <div className="absolute left-[-5px] top-1 w-2 h-2 rounded-full bg-blue-500 shadow-sm" />
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-[10px] font-black text-slate-400 uppercase">
                                  {item.timestamp
                                    ? format(
                                        item.timestamp.toDate(),
                                        "dd/MM HH:mm",
                                      )
                                    : "--:--:--"}
                                </p>
                                <span className="text-[9px] font-bold text-slate-300">
                                  •
                                </span>
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                                  por {item.user}
                                </p>
                              </div>
                              <p className="text-[12px] font-bold text-slate-700 leading-tight">
                                {item.message}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="h-[400px] flex flex-col items-center justify-center text-slate-300 italic py-20 text-center">
                            <History size={48} className="opacity-10 mb-4" />
                            <p className="text-sm font-black uppercase tracking-widest">
                              Nenhuma atividade registrada ainda
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer do Sidebar */}
                  <div className="p-6 border-t border-slate-100 bg-white flex gap-3">
                    {sidebarType === "logistica" ? (
                      <>
                        <button
                          onClick={() => setSidebarType(null)}
                          className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all uppercase text-[12px] tracking-widest"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleSaveLogistics()}
                          className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 uppercase text-[12px] tracking-widest"
                        >
                          <CheckCircle2 size={18} /> Salvar Alterações
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setSidebarType(null)}
                        className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all uppercase text-[12px] tracking-widest"
                      >
                        Fechar Painel
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar Staffs / Mobile Calendar */}
          <div className="w-64 md:w-72 xl:w-64 order-2 flex flex-col gap-3 flex-shrink-0 min-h-0">
            <div className="xl:hidden bg-slate-800 rounded-[28px] overflow-hidden flex flex-col border border-slate-700 shadow-sm flex-shrink-0">
              <button 
                onClick={() => setShowMobileCalendar(!showMobileCalendar)} 
                className="p-4 flex items-center justify-between text-white w-full hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CalendarIcon size={18} className="text-blue-400" />
                  <span className="text-sm font-black uppercase tracking-widest leading-none mt-1">
                    {format(selectedDate, "dd MMM", { locale: ptBR })}
                  </span>
                </div>
                <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${showMobileCalendar ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showMobileCalendar && (
                  <motion.div 
                    initial={{ height: 0 }} 
                    animate={{ height: 'auto' }} 
                    exit={{ height: 0 }} 
                    className="overflow-hidden bg-slate-800 border-t border-slate-700"
                  >
                    <div className="p-3 pb-2 relative">
                      <div className="flex justify-between items-center mb-2 px-2 relative z-20">
                        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-all"> <ChevronLeft size={14}/> </button>
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{format(currentMonth, 'MMMM yyyy', {locale: ptBR})}</span>
                        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-all"> <ChevronRight size={14}/> </button>
                      </div>
                      <div className="bg-slate-900/50 rounded-2xl p-2 relative z-20">
                         <CalendarBlock month={currentMonth} days={days1} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden flex-1">
              <div className="p-3 bg-blue-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={16} />
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    Equipe Livre
                  </h3>
                </div>
                <span className="bg-white/20 px-2 py-0.5 rounded-lg text-[10px] font-black">
                  {availableStaffs.length}
                </span>
              </div>
              <div
                className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar"
                onDragEnter={(e) => e.preventDefault()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const staffId = e.dataTransfer.getData("staffId") || currentDragData?.staffId;
                  const originId = e.dataTransfer.getData("originTrainingId") || currentDragData?.originTrainingId;
                  const alocId = e.dataTransfer.getData("alocId") || currentDragData?.alocId || `${originId}_${staffId}`;
                  if (staffId && originId) {
                    removeAllocation(alocId);
                  }
                  currentDragData = null;
                }}
              >
                {availableStaffs.map((staff) => (
                  <div
                    key={staff.id}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("staffId", staff.id);
                      currentDragData = { staffId: staff.id };
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    style={{ touchAction: "none", WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}
                    className={`
                          group/free p-1.5 rounded-lg border border-slate-200 flex items-center justify-between transition-all active:scale-95 relative
                          ${selectedTrainingId ? "bg-white shadow-sm hover:border-blue-400 hover:shadow-md cursor-grab" : "bg-slate-50 opacity-60"}
                        `}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex-shrink-0 flex items-center justify-center text-[9px] font-black text-slate-500 uppercase group-hover:bg-blue-50 group-hover:text-blue-600 transition-all border border-transparent group-hover:border-blue-100">
                        {String(staff.nomeAbreviado || "ST").substring(0, 2)}
                      </div>
                      <div className="truncate flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-black text-slate-800 leading-tight truncate">
                            {staff.nomeAbreviado}
                          </p>

                          {/* Badge de Atividade 30 dias */}
                          {staffActivityLast30Days[staff.id] !== undefined && (
                            <span
                              className={`text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm ml-2 shrink-0 ${
                                staffActivityLast30Days[staff.id] >= 5
                                  ? "bg-red-500 text-white"
                                  : staffActivityLast30Days[staff.id] >= 3
                                    ? "bg-amber-500 text-white"
                                    : "bg-emerald-500 text-white"
                              }`}
                              title={`Alocações nos últimos 30 dias: ${staffActivityLast30Days[staff.id]}`}
                            >
                              {String(
                                staffActivityLast30Days[staff.id],
                              ).padStart(2, "0")}
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 tracking-tighter truncate">
                          {staff.nomeCompleto.split(" ")[0]}
                        </p>
                      </div>
                    </div>
                    {selectedTrainingId && (
                      <button className="opacity-0 group-hover:opacity-100 bg-blue-50 text-blue-600 p-1.5 rounded-lg hover:bg-blue-600 hover:text-white transition-all">
                        <Plus size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {availableStaffs.length === 0 && (
                  <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                    <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-dashed animate-[spin_10s_linear_infinite]" />
                    <p className="text-[10px] font-black uppercase text-center max-w-[150px]">
                      Equipe 100% Empenhada
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Motivo de Recusa */}
      <AnimatePresence>
        {statusMenu && (
          <div
            className="fixed inset-0 z-[110]"
            onClick={() => setStatusMenu(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ left: statusMenu.x, top: statusMenu.y }}
              className="absolute bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 min-w-[160px] flex flex-col gap-1"
            >
              {[
                { id: "intencao", label: "Pendência", color: "bg-slate-500" },
                {
                  id: "pre_reserva",
                  label: "Pré-reserva",
                  color: "bg-purple-500",
                },
                {
                  id: "whatsapp",
                  label: "Chamado no Zap",
                  color: "bg-amber-400",
                },
                {
                  id: "pessoalmente",
                  label: "Pessoalmente",
                  color: "bg-blue-500",
                },
                {
                  id: "confirmado",
                  label: "Confirmado",
                  color: "bg-emerald-500",
                },
                {
                  id: "data_liberada",
                  label: "Data Liberada",
                  color: "bg-pink-500",
                },
                { id: "recusado", label: "Recusado", color: "bg-red-500" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    // @ts-ignore
                    const aloc = allocations.find(
                      (a) => a.id === statusMenu!.alocId,
                    );
                    if (item.id === "recusado") {
                      const staff = staffs.find((s) => s.id === aloc?.staff_id);
                      setRefusalReason(aloc?.obs || "");
                      setRefusalModal({
                        id: statusMenu!.alocId,
                        staffName: staff?.nomeAbreviado || "Staff",
                      });
                    } else {
                      updateStatus(statusMenu!.alocId, item.id);
                    }
                    setStatusMenu(null);
                  }}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-xl transition-all w-full text-left"
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                  <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider font-mono">
                    {item.label}
                  </span>
                </button>
              ))}
              <div className="h-px bg-slate-100 my-1 mx-2" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const aloc = allocations.find(
                    (a) => a.id === statusMenu!.alocId,
                  );
                  const staff = staffs.find((s) => s.id === aloc?.staff_id);
                  setRefusalReason(aloc?.obs || "");
                  setRefusalModal({
                    id: statusMenu!.alocId,
                    staffName: staff?.nomeAbreviado || "Staff",
                    isObsOnly: true,
                  });
                  setStatusMenu(null);
                }}
                className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-xl transition-all w-full text-left"
              >
                <MessageSquare size={14} className="text-slate-400" />
                <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider font-mono">
                  Observação
                </span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const aloc = allocations.find(
                    (a) => a.id === statusMenu!.alocId,
                  );
                  if (aloc) {
                    setDuplicatedStaffIds((prev) => [
                      ...prev,
                      String(aloc.staff_id),
                    ]);
                  }
                  setStatusMenu(null);
                }}
                className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-xl transition-all w-full text-left"
              >
                <Plus size={14} className="text-slate-400" />
                <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider font-mono">
                  Duplicar Staff
                </span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {refusalModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setRefusalModal(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl p-10 overflow-hidden border border-slate-100"
            >
              <div className="flex flex-col items-center text-center gap-6">
                <div
                  className={`w-20 h-20 ${refusalModal.isObsOnly ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"} rounded-[32px] flex items-center justify-center shadow-inner`}
                  style={{ borderRadius: "32px" }}
                >
                  {refusalModal.isObsOnly ? (
                    <Info size={40} />
                  ) : (
                    <AlertCircle size={40} />
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                    {refusalModal.isObsOnly ? "Observação" : "Motivo da Recusa"}
                  </h3>
                  <p className="text-slate-500 font-medium whitespace-nowrap">
                    {refusalModal.isObsOnly
                      ? `Adicionar nota para ${refusalModal.staffName}`
                      : `Por que o staff `}
                    {!refusalModal.isObsOnly && (
                      <strong className="text-red-600">
                        {refusalModal.staffName}
                      </strong>
                    )}
                    {!refusalModal.isObsOnly && ` não pode atender?`}
                  </p>
                </div>
                <textarea
                  autoFocus
                  value={refusalReason}
                  onChange={(e) => setRefusalReason(e.target.value)}
                  placeholder="Digite aqui..."
                  className={`w-full h-32 px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-3xl outline-none focus:border-${refusalModal.isObsOnly ? "amber" : "red"}-500 transition-all font-medium text-slate-700`}
                  style={{ borderRadius: "24px" }}
                />
                <div className="flex w-full gap-4">
                  <button
                    onClick={confirmRefusal}
                    className={`flex-1 py-4 ${refusalModal.isObsOnly ? "bg-amber-500 hover:bg-amber-600" : "bg-red-600 hover:bg-red-700"} text-white font-black rounded-2xl shadow-xl transition-all`}
                  >
                    {refusalModal.isObsOnly ? "SALVAR" : "CONFIRMAR"}
                  </button>
                  <button
                    onClick={() => setRefusalModal(null)}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                  >
                    CANCELAR
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @media print {
          @page { 
            margin: 0; 
            size: A4 landscape !important;
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background-color: white !important;
          }

          #root {
            display: none !important;
          }

          #print-area {
            display: block !important;
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 297mm !important;
            padding: 10mm !important;
            background: white !important;
            z-index: 9999 !important;
          }

          #print-area * {
            visibility: visible !important;
          }

          table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            border: 2.5pt solid black !important;
          }

          th, td {
             border: 1.5pt solid black !important;
             background-color: white !important;
             padding: 4px !important;
             word-wrap: break-word !important;
             overflow: hidden !important;
          }

          thead {
            display: table-header-group !important;
          }

          tr {
             page-break-inside: avoid !important;
          }
        }

        .no-print { @media print { display: none !important; } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        
        .custom-scrollbar-white::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar-white::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
        .custom-scrollbar-white::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar-white::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        .custom-scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.1); }
      `}</style>
      <AnimatePresence>
        {activePicker && selectedTraining && (
          <LogisticsDatePicker
            isOpen={true}
            title={
              activePicker === "hora_saida"
                ? "Horário de Saída"
                : activePicker === "hora_retorno"
                  ? "Horário de Retorno"
                  : activePicker === "hora_real_saida"
                    ? "Saída Real do Evento"
                    : "Chegada Real do Evento"
            }
            value={formatLogisticsDateDisplay(logisticsForm[activePicker])}
            eventDate={normalizeDate(selectedTraining.dataEvento) || new Date()}
            onClose={() => setActivePicker(null)}
            onChange={(val) => {
              setLogisticsForm({ ...logisticsForm, [activePicker]: val });
              setActivePicker(null);
            }}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  );
};

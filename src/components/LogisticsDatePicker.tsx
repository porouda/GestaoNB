import React, { useState, useEffect } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, X, Check } from 'lucide-react';

interface LogisticsDatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (val: string) => void;
  title: string;
  eventDate: Date;
}

export const LogisticsDatePicker: React.FC<LogisticsDatePickerProps> = ({
  isOpen,
  onClose,
  value,
  onChange,
  title,
  eventDate
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedHour, setSelectedHour] = useState<number>(0);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      let d = new Date();
      if (value) {
        // Tentar parsear o valor atual (dd/MM HH:mm)
        if (/^\d{2}\/\d{2} \d{2}:\d{2}$/.test(value)) {
          const [datePart, timePart] = value.split(' ');
          const [day, month] = datePart.split('/').map(Number);
          const [hour, min] = timePart.split(':').map(Number);
          d = new Date(eventDate.getFullYear(), month - 1, day, hour, min);
        } else {
          const parsed = new Date(value);
          if (!isNaN(parsed.getTime())) d = parsed;
        }
      } else {
        d = new Date(eventDate);
      }
      setSelectedDate(d);
      setSelectedHour(d.getHours());
      setSelectedMinute(Math.floor(d.getMinutes() / 5) * 5);
    }
  }, [isOpen, value, eventDate]);

  const handleConfirm = () => {
    const finalDate = new Date(selectedDate);
    finalDate.setHours(selectedHour);
    finalDate.setMinutes(selectedMinute);
    onChange(format(finalDate, 'dd/MM HH:mm'));
    onClose();
  };

  const days = [
    subDays(eventDate, 2),
    subDays(eventDate, 1),
    eventDate,
    addDays(eventDate, 1),
    addDays(eventDate, 2),
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200"
      >
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
          <div>
            <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Selecionar Horário</h3>
            <p className="text-lg font-black uppercase tracking-tight">{title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6 bg-slate-50/50">
          {/* Bento Day Selection */}
          <div className="space-y-3">
             <div className="flex items-center gap-2 text-slate-400">
                <Calendar size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Escolha o Dia</span>
             </div>
             <div className="grid grid-cols-5 gap-2">
                {days.map((day, i) => {
                  const isSelected = format(day, 'dd/MM') === format(selectedDate, 'dd/MM');
                  const isEventDay = i === 2;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(day)}
                      className={`relative flex flex-col items-center justify-center p-2 rounded-[18px] transition-all border-2 ${
                        isSelected 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 scale-105 z-10' 
                        : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className={`text-[8px] font-black uppercase mb-1 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                        {format(day, 'EEE')}
                      </span>
                      <span className="text-sm font-black tracking-tighter">
                        {format(day, 'dd/MM')}
                      </span>
                      {isEventDay && !isSelected && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </button>
                  );
                })}
             </div>
          </div>

          {/* Bento Time Selection */}
          <div className="grid grid-cols-2 gap-6">
            {/* Hours Block */}
            <div className="space-y-3">
               <div className="flex items-center gap-2 text-slate-400">
                  <Clock size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Hora</span>
               </div>
               <div className="bg-white p-2 rounded-[24px] border border-slate-100 shadow-sm h-[180px] overflow-y-auto custom-scrollbar-thin">
                  <div className="grid grid-cols-3 gap-1">
                    {Array.from({ length: 24 }).map((_, h) => (
                      <button
                        key={h}
                        onClick={() => setSelectedHour(h)}
                        className={`py-2 rounded-xl text-xs font-black transition-all ${
                          selectedHour === h 
                          ? 'bg-blue-100 text-blue-600' 
                          : 'text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {h.toString().padStart(2, '0')}
                      </button>
                    ))}
                  </div>
               </div>
            </div>

            {/* Minutes Block */}
            <div className="space-y-3">
               <div className="flex items-center gap-2 text-slate-400">
                  <Clock size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Minuto</span>
               </div>
               <div className="bg-white p-2 rounded-[24px] border border-slate-100 shadow-sm h-[180px] overflow-y-auto custom-scrollbar-thin">
                  <div className="grid grid-cols-2 gap-1">
                    {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                      <button
                        key={m}
                        onClick={() => setSelectedMinute(m)}
                        className={`py-2 rounded-xl text-xs font-black transition-all ${
                          selectedMinute === m 
                          ? 'bg-emerald-100 text-emerald-600' 
                          : 'text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {m.toString().padStart(2, '0')}
                      </button>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t border-slate-100 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all uppercase text-[10px] tracking-widest"
          >
            Cancelar
          </button>
          <button 
            onClick={handleConfirm}
            className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest"
          >
            <Check size={18} /> Confirmar
          </button>
        </div>
      </motion.div>
    </div>
  );
};

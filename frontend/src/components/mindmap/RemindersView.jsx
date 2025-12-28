import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X, 
  Clock, 
  Calendar,
  CalendarDays,
  CalendarRange,
  List,
  Bell,
  Trash2,
  Check,
  AlertCircle,
  LayoutGrid,
  CalendarCheck
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Nombres de los meses en español
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTH_NAMES_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAY_NAMES_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Tipos de vistas disponibles
const VIEW_TYPES = [
  { id: 'year', label: 'Año', icon: LayoutGrid },
  { id: 'month', label: 'Mes', icon: CalendarDays },
  { id: 'week', label: 'Semana', icon: CalendarRange },
  { id: 'day', label: 'Día', icon: Calendar },
  { id: 'schedule', label: 'Planificación', icon: List },
  { id: 'reminders', label: 'Recordatorios', icon: Bell },
];

// Generar días del mes
const getDaysInMonth = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();
  
  const days = [];
  
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    days.push({
      day: prevMonthLastDay - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, prevMonthLastDay - i)
    });
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    days.push({
      day,
      isCurrentMonth: true,
      date: new Date(year, month, day)
    });
  }
  
  const remainingDays = 42 - days.length;
  for (let day = 1; day <= remainingDays; day++) {
    days.push({
      day,
      isCurrentMonth: false,
      date: new Date(year, month + 1, day)
    });
  }
  
  return days;
};

// Obtener días de la semana
const getWeekDays = (date) => {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  
  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(day);
  }
  return days;
};

// Horas del día para vista de día/semana
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// ==================== MODAL DE RECORDATORIO ====================
const ReminderModal = ({ isOpen, onClose, onSave, selectedDate, editingReminder }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (editingReminder) {
      setTitle(editingReminder.title);
      setDescription(editingReminder.description || '');
      try {
        const reminderDate = new Date(editingReminder.reminder_date);
        if (!isNaN(reminderDate.getTime())) {
          setDate(reminderDate.toISOString().split('T')[0]);
          setTime(reminderDate.toTimeString().slice(0, 5));
        }
      } catch (e) {
        console.warn('Invalid reminder date:', editingReminder.reminder_date);
      }
    } else if (selectedDate) {
      try {
        if (!isNaN(selectedDate.getTime())) {
          setDate(selectedDate.toISOString().split('T')[0]);
        }
      } catch (e) {
        console.warn('Invalid selected date');
      }
      setTitle('');
      setDescription('');
      setTime('09:00');
    }
  }, [selectedDate, editingReminder, isOpen]);
  
  if (!isOpen) return null;
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !date) return;
    
    setLoading(true);
    const reminderDateTime = new Date(`${date}T${time}`);
    
    await onSave({
      id: editingReminder?.id,
      title: title.trim(),
      description: description.trim(),
      reminder_date: reminderDateTime.toISOString()
    });
    
    setLoading(false);
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Bell size={20} />
              {editingReminder ? 'Editar Recordatorio' : 'Nuevo Recordatorio'}
            </h2>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Revisar mapa de proyecto"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles adicionales..."
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar size={14} className="inline mr-1" />
                Fecha *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock size={14} className="inline mr-1" />
                Hora
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim() || !date}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check size={18} />
                  {editingReminder ? 'Guardar' : 'Crear'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==================== VISTA AÑO ====================
const YearView = ({ year, reminders, onDayClick, remindersByDate }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {MONTH_NAMES.map((monthName, monthIndex) => {
        const days = getDaysInMonth(year, monthIndex);
        const monthReminders = reminders.filter(r => {
          const d = new Date(r.reminder_date);
          return d.getFullYear() === year && d.getMonth() === monthIndex;
        });
        
        return (
          <div key={monthIndex} className="bg-white rounded-xl border border-gray-200 p-3 hover:shadow-md transition-shadow">
            <h3 className="text-sm font-semibold text-gray-800 mb-2 text-center flex items-center justify-center gap-2">
              {monthName}
              {monthReminders.length > 0 && (
                <span className="w-5 h-5 bg-blue-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {monthReminders.length}
                </span>
              )}
            </h3>
            
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {DAY_NAMES.map(day => (
                <div key={day} className="text-[9px] font-medium text-gray-400 text-center">
                  {day.charAt(0)}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-0.5">
              {days.slice(0, 35).map((dayInfo, idx) => {
                const dateKey = `${dayInfo.date.getFullYear()}-${dayInfo.date.getMonth()}-${dayInfo.date.getDate()}`;
                const hasReminders = remindersByDate[dateKey]?.length > 0;
                const isToday = dayInfo.date.getTime() === today.getTime() && dayInfo.isCurrentMonth;
                
                return (
                  <button
                    key={idx}
                    onClick={() => onDayClick(dayInfo.date)}
                    className={`
                      w-6 h-6 text-[10px] rounded flex items-center justify-center relative
                      ${!dayInfo.isCurrentMonth ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'}
                      ${isToday ? 'bg-blue-500 text-white font-bold hover:bg-blue-600' : ''}
                    `}
                  >
                    {dayInfo.day}
                    {hasReminders && dayInfo.isCurrentMonth && !isToday && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ==================== VISTA MES ====================
const MonthView = ({ currentDate, reminders, onDayClick, remindersByDate }) => {
  const days = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return (
    <div className="flex-1 p-4">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden h-full">
        {/* Header de días */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {DAY_NAMES.map(day => (
            <div key={day} className="py-3 text-center text-sm font-medium text-gray-600">
              {day}
            </div>
          ))}
        </div>
        
        {/* Grid de días */}
        <div className="grid grid-cols-7 grid-rows-6 h-[calc(100%-48px)]">
          {days.map((dayInfo, idx) => {
            const dateKey = `${dayInfo.date.getFullYear()}-${dayInfo.date.getMonth()}-${dayInfo.date.getDate()}`;
            const dayReminders = remindersByDate[dateKey] || [];
            const isToday = dayInfo.date.getTime() === today.getTime();
            
            return (
              <button
                key={idx}
                onClick={() => onDayClick(dayInfo.date)}
                className={`
                  border-r border-b border-gray-100 p-2 text-left hover:bg-blue-50 transition-colors
                  ${!dayInfo.isCurrentMonth ? 'bg-gray-50' : 'bg-white'}
                `}
              >
                <span className={`
                  inline-flex items-center justify-center w-7 h-7 rounded-full text-sm
                  ${isToday ? 'bg-blue-500 text-white font-bold' : ''}
                  ${!dayInfo.isCurrentMonth ? 'text-gray-400' : 'text-gray-700'}
                `}>
                  {dayInfo.day}
                </span>
                
                {/* Recordatorios del día */}
                <div className="mt-1 space-y-1">
                  {dayReminders.slice(0, 3).map((r, i) => (
                    <div
                      key={r.id}
                      className={`text-[10px] px-1.5 py-0.5 rounded truncate ${
                        r.is_completed 
                          ? 'bg-gray-100 text-gray-400 line-through' 
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {r.title}
                    </div>
                  ))}
                  {dayReminders.length > 3 && (
                    <div className="text-[10px] text-gray-500 px-1.5">
                      +{dayReminders.length - 3} más
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ==================== VISTA SEMANA ====================
const WeekView = ({ currentDate, reminders, onTimeSlotClick, remindersByDate }) => {
  const weekDays = getWeekDays(currentDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return (
    <div className="flex-1 p-4 overflow-hidden">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden h-full flex flex-col">
        {/* Header de días */}
        <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="py-3 text-center text-sm font-medium text-gray-400 border-r border-gray-200">
            Hora
          </div>
          {weekDays.map((day, idx) => {
            const isToday = day.getTime() === today.getTime();
            return (
              <div key={idx} className={`py-3 text-center border-r border-gray-100 last:border-r-0 ${isToday ? 'bg-blue-50' : ''}`}>
                <div className="text-xs text-gray-500">{DAY_NAMES[day.getDay()]}</div>
                <div className={`text-lg font-semibold ${isToday ? 'text-blue-600' : 'text-gray-800'}`}>
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Grid de horas */}
        <div className="flex-1 overflow-y-auto">
          {HOURS.map(hour => (
            <div key={hour} className="grid grid-cols-8 border-b border-gray-100 min-h-[60px]">
              <div className="py-2 px-2 text-xs text-gray-500 border-r border-gray-200 bg-gray-50">
                {hour.toString().padStart(2, '0')}:00
              </div>
              {weekDays.map((day, idx) => {
                const dateKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
                const hourReminders = (remindersByDate[dateKey] || []).filter(r => {
                  const h = new Date(r.reminder_date).getHours();
                  return h === hour;
                });
                
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      const newDate = new Date(day);
                      newDate.setHours(hour, 0, 0, 0);
                      onTimeSlotClick(newDate);
                    }}
                    className="border-r border-gray-100 last:border-r-0 hover:bg-blue-50 transition-colors p-1"
                  >
                    {hourReminders.map(r => (
                      <div
                        key={r.id}
                        className={`text-[10px] px-1.5 py-1 rounded mb-1 ${
                          r.is_completed 
                            ? 'bg-gray-200 text-gray-500' 
                            : 'bg-blue-500 text-white'
                        }`}
                      >
                        {r.title}
                      </div>
                    ))}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==================== VISTA DÍA ====================
const DayView = ({ currentDate, reminders, onTimeSlotClick, remindersByDate }) => {
  const dateKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;
  const dayReminders = remindersByDate[dateKey] || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = currentDate.getTime() === today.getTime();
  
  return (
    <div className="flex-1 p-4 overflow-hidden">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden h-full flex flex-col">
        {/* Header del día */}
        <div className={`py-4 px-6 border-b border-gray-200 ${isToday ? 'bg-blue-50' : 'bg-gray-50'}`}>
          <div className="text-sm text-gray-500">{DAY_NAMES_FULL[currentDate.getDay()]}</div>
          <div className={`text-3xl font-bold ${isToday ? 'text-blue-600' : 'text-gray-800'}`}>
            {currentDate.getDate()} de {MONTH_NAMES[currentDate.getMonth()]}
          </div>
          {dayReminders.length > 0 && (
            <div className="text-sm text-gray-500 mt-1">
              {dayReminders.length} recordatorio{dayReminders.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
        
        {/* Grid de horas */}
        <div className="flex-1 overflow-y-auto">
          {HOURS.map(hour => {
            const hourReminders = dayReminders.filter(r => {
              const h = new Date(r.reminder_date).getHours();
              return h === hour;
            });
            
            return (
              <button
                key={hour}
                onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setHours(hour, 0, 0, 0);
                  onTimeSlotClick(newDate);
                }}
                className="w-full flex border-b border-gray-100 min-h-[60px] hover:bg-blue-50 transition-colors"
              >
                <div className="w-20 py-2 px-3 text-sm text-gray-500 border-r border-gray-200 bg-gray-50 flex-shrink-0">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                <div className="flex-1 p-2">
                  {hourReminders.map(r => (
                    <div
                      key={r.id}
                      className={`text-sm px-3 py-2 rounded-lg mb-1 ${
                        r.is_completed 
                          ? 'bg-gray-200 text-gray-500 line-through' 
                          : 'bg-blue-500 text-white'
                      }`}
                    >
                      <div className="font-medium">{r.title}</div>
                      {r.description && (
                        <div className="text-xs opacity-80 mt-0.5">{r.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ==================== VISTA PLANIFICACIÓN ====================
const ScheduleView = ({ reminders, onEditReminder, onToggleComplete, onDeleteReminder }) => {
  // Agrupar por fecha
  const groupedReminders = useMemo(() => {
    const groups = {};
    const validReminders = reminders.filter(r => {
      const date = new Date(r.reminder_date);
      return !isNaN(date.getTime());
    });
    
    const sorted = [...validReminders].sort((a, b) => 
      new Date(a.reminder_date) - new Date(b.reminder_date)
    );
    
    sorted.forEach(r => {
      const date = new Date(r.reminder_date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    
    return groups;
  }, [reminders]);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-4">
        {Object.keys(groupedReminders).length === 0 ? (
          <div className="text-center py-12">
            <CalendarCheck size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No hay eventos programados</p>
          </div>
        ) : (
          Object.entries(groupedReminders).map(([dateStr, dayReminders]) => {
            const date = new Date(dateStr + 'T12:00:00'); // Usar mediodía para evitar problemas de timezone
            if (isNaN(date.getTime())) return null; // Skip invalid dates
            
            const isToday = date.toDateString() === today.toDateString();
            const isPast = date < today;
            
            return (
              <div key={dateStr} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className={`px-4 py-3 border-b ${isToday ? 'bg-blue-500 text-white' : isPast ? 'bg-gray-100' : 'bg-gray-50'}`}>
                  <div className={`text-sm ${isToday ? 'text-blue-100' : 'text-gray-500'}`}>
                    {DAY_NAMES_FULL[date.getDay()]}
                  </div>
                  <div className={`font-semibold ${isToday ? 'text-white' : 'text-gray-800'}`}>
                    {date.getDate()} de {MONTH_NAMES[date.getMonth()]} {date.getFullYear()}
                    {isToday && <span className="ml-2 text-sm font-normal">(Hoy)</span>}
                  </div>
                </div>
                
                <div className="divide-y divide-gray-100">
                  {dayReminders.map(r => {
                    const time = new Date(r.reminder_date);
                    return (
                      <div key={r.id} className="px-4 py-3 flex items-center gap-4 hover:bg-gray-50">
                        <button
                          onClick={() => onToggleComplete(r)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            r.is_completed 
                              ? 'bg-green-500 border-green-500 text-white' 
                              : 'border-gray-300 hover:border-blue-500'
                          }`}
                        >
                          {r.is_completed && <Check size={14} />}
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium ${r.is_completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                            {r.title}
                          </div>
                          {r.description && (
                            <div className="text-sm text-gray-500 truncate">{r.description}</div>
                          )}
                        </div>
                        
                        <div className="text-sm text-gray-500 flex-shrink-0">
                          {time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onEditReminder(r)}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                          >
                            <Calendar size={16} />
                          </button>
                          <button
                            onClick={() => onDeleteReminder(r.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors text-gray-400 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// ==================== VISTA RECORDATORIOS (Lista) ====================
const RemindersListView = ({ reminders, onEditReminder, onToggleComplete, onDeleteReminder }) => {
  const pendingReminders = reminders.filter(r => !r.is_completed);
  const completedReminders = reminders.filter(r => r.is_completed);
  
  const ReminderItem = ({ reminder }) => {
    const date = new Date(reminder.reminder_date);
    const isOverdue = date < new Date() && !reminder.is_completed;
    
    return (
      <div className={`p-4 rounded-xl border ${isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'} hover:shadow-md transition-shadow`}>
        <div className="flex items-start gap-3">
          <button
            onClick={() => onToggleComplete(reminder)}
            className={`w-6 h-6 mt-0.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              reminder.is_completed 
                ? 'bg-green-500 border-green-500 text-white' 
                : isOverdue
                ? 'border-red-400 hover:border-red-500'
                : 'border-gray-300 hover:border-blue-500'
            }`}
          >
            {reminder.is_completed && <Check size={14} />}
          </button>
          
          <div className="flex-1 min-w-0">
            <div className={`font-medium ${reminder.is_completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
              {reminder.title}
            </div>
            {reminder.description && (
              <div className="text-sm text-gray-500 mt-1">{reminder.description}</div>
            )}
            <div className={`text-sm mt-2 flex items-center gap-2 ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
              <Clock size={14} />
              {date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} a las {date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              {isOverdue && <span className="text-xs font-medium bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Vencido</span>}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEditReminder(reminder)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
            >
              <Calendar size={16} />
            </button>
            <button
              onClick={() => onDeleteReminder(reminder.id)}
              className="p-2 hover:bg-red-100 rounded-lg transition-colors text-gray-400 hover:text-red-600"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Pendientes */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertCircle size={16} />
            Pendientes ({pendingReminders.length})
          </h3>
          {pendingReminders.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <Check size={32} className="mx-auto text-green-400 mb-2" />
              <p className="text-gray-500">¡Todo al día!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingReminders
                .sort((a, b) => new Date(a.reminder_date) - new Date(b.reminder_date))
                .map(r => <ReminderItem key={r.id} reminder={r} />)}
            </div>
          )}
        </div>
        
        {/* Completados */}
        {completedReminders.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Check size={16} />
              Completados ({completedReminders.length})
            </h3>
            <div className="space-y-3 opacity-60">
              {completedReminders.map(r => <ReminderItem key={r.id} reminder={r} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== COMPONENTE PRINCIPAL ====================
const RemindersView = ({ token }) => {
  const [currentView, setCurrentView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  
  // Cargar recordatorios
  useEffect(() => {
    loadReminders();
  }, [token]);
  
  const loadReminders = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_URL}/api/reminders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setReminders(data);
      }
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Agrupar recordatorios por fecha
  const remindersByDate = useMemo(() => {
    const map = {};
    reminders.forEach(r => {
      const date = new Date(r.reminder_date);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return map;
  }, [reminders]);
  
  // Handlers
  const handleSaveReminder = async (reminderData) => {
    try {
      const url = reminderData.id 
        ? `${API_URL}/api/reminders/${reminderData.id}`
        : `${API_URL}/api/reminders`;
      
      const response = await fetch(url, {
        method: reminderData.id ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reminderData)
      });
      
      if (response.ok) {
        await loadReminders();
      }
    } catch (error) {
      console.error('Error saving reminder:', error);
    }
  };
  
  const handleDeleteReminder = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este recordatorio?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/reminders/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        await loadReminders();
      }
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  };
  
  const handleToggleComplete = async (reminder) => {
    try {
      const response = await fetch(`${API_URL}/api/reminders/${reminder.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...reminder,
          is_completed: !reminder.is_completed
        })
      });
      
      if (response.ok) {
        await loadReminders();
      }
    } catch (error) {
      console.error('Error updating reminder:', error);
    }
  };
  
  const handleDayClick = (date) => {
    setSelectedDate(date);
    setEditingReminder(null);
    setShowModal(true);
  };
  
  const handleTimeSlotClick = (date) => {
    setSelectedDate(date);
    setEditingReminder(null);
    setShowModal(true);
  };
  
  const handleEditReminder = (reminder) => {
    setEditingReminder(reminder);
    setSelectedDate(null);
    setShowModal(true);
  };
  
  // Navegación
  const navigatePrev = () => {
    const newDate = new Date(currentDate);
    switch (currentView) {
      case 'year':
        newDate.setFullYear(newDate.getFullYear() - 1);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        break;
      default:
        break;
    }
    setCurrentDate(newDate);
  };
  
  const navigateNext = () => {
    const newDate = new Date(currentDate);
    switch (currentView) {
      case 'year':
        newDate.setFullYear(newDate.getFullYear() + 1);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        break;
      default:
        break;
    }
    setCurrentDate(newDate);
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  // Título de navegación
  const getNavigationTitle = () => {
    switch (currentView) {
      case 'year':
        return currentDate.getFullYear().toString();
      case 'month':
        return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
      case 'week':
        const weekDays = getWeekDays(currentDate);
        const start = weekDays[0];
        const end = weekDays[6];
        if (start.getMonth() === end.getMonth()) {
          return `${start.getDate()} - ${end.getDate()} ${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`;
        }
        return `${start.getDate()} ${MONTH_NAMES_SHORT[start.getMonth()]} - ${end.getDate()} ${MONTH_NAMES_SHORT[end.getMonth()]} ${start.getFullYear()}`;
      case 'day':
        return `${DAY_NAMES_FULL[currentDate.getDay()]}, ${currentDate.getDate()} de ${MONTH_NAMES[currentDate.getMonth()]}`;
      default:
        return '';
    }
  };
  
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Título y botón nuevo */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center">
                <Bell className="text-white" size={22} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Recordatorios</h1>
                <p className="text-sm text-gray-500">{reminders.filter(r => !r.is_completed).length} pendientes</p>
              </div>
            </div>
            
            <button
              onClick={() => {
                setSelectedDate(new Date());
                setEditingReminder(null);
                setShowModal(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
              <Plus size={18} />
              Nuevo
            </button>
          </div>
          
          {/* Pestañas de vista */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            {VIEW_TYPES.map(view => {
              const Icon = view.icon;
              const isActive = currentView === view.id;
              return (
                <button
                  key={view.id}
                  onClick={() => setCurrentView(view.id)}
                  className={`
                    px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-all
                    ${isActive 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                    }
                  `}
                >
                  <Icon size={16} />
                  <span className="hidden md:inline">{view.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Navegación de fecha */}
        {['year', 'month', 'week', 'day'].includes(currentView) && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <button
                onClick={navigatePrev}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} className="text-gray-600" />
              </button>
              <button
                onClick={navigateNext}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight size={20} className="text-gray-600" />
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Hoy
              </button>
            </div>
            
            <h2 className="text-lg font-semibold text-gray-800">
              {getNavigationTitle()}
            </h2>
            
            <div className="w-32" /> {/* Spacer para centrar título */}
          </div>
        )}
      </div>
      
      {/* Contenido según vista */}
      {currentView === 'year' && (
        <YearView
          year={currentDate.getFullYear()}
          reminders={reminders}
          onDayClick={handleDayClick}
          remindersByDate={remindersByDate}
        />
      )}
      
      {currentView === 'month' && (
        <MonthView
          currentDate={currentDate}
          reminders={reminders}
          onDayClick={handleDayClick}
          remindersByDate={remindersByDate}
        />
      )}
      
      {currentView === 'week' && (
        <WeekView
          currentDate={currentDate}
          reminders={reminders}
          onTimeSlotClick={handleTimeSlotClick}
          remindersByDate={remindersByDate}
        />
      )}
      
      {currentView === 'day' && (
        <DayView
          currentDate={currentDate}
          reminders={reminders}
          onTimeSlotClick={handleTimeSlotClick}
          remindersByDate={remindersByDate}
        />
      )}
      
      {currentView === 'schedule' && (
        <ScheduleView
          reminders={reminders}
          onEditReminder={handleEditReminder}
          onToggleComplete={handleToggleComplete}
          onDeleteReminder={handleDeleteReminder}
        />
      )}
      
      {currentView === 'reminders' && (
        <RemindersListView
          reminders={reminders}
          onEditReminder={handleEditReminder}
          onToggleComplete={handleToggleComplete}
          onDeleteReminder={handleDeleteReminder}
        />
      )}
      
      {/* Modal */}
      <ReminderModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingReminder(null);
          setSelectedDate(null);
        }}
        onSave={handleSaveReminder}
        selectedDate={selectedDate}
        editingReminder={editingReminder}
      />
    </div>
  );
};

export default RemindersView;

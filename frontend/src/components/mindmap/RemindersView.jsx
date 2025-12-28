import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X, 
  Clock, 
  Calendar,
  Bell,
  Trash2,
  Check,
  AlertCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Nombres de los meses en español
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// Generar días del mes
const getDaysInMonth = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();
  
  const days = [];
  
  // Días del mes anterior para completar la primera semana
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    days.push({
      day: prevMonthLastDay - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, prevMonthLastDay - i)
    });
  }
  
  // Días del mes actual
  for (let day = 1; day <= daysInMonth; day++) {
    days.push({
      day,
      isCurrentMonth: true,
      date: new Date(year, month, day)
    });
  }
  
  // Días del siguiente mes para completar la última semana
  const remainingDays = 42 - days.length; // 6 semanas * 7 días
  for (let day = 1; day <= remainingDays; day++) {
    days.push({
      day,
      isCurrentMonth: false,
      date: new Date(year, month + 1, day)
    });
  }
  
  return days;
};

// Componente de mini calendario mensual
const MiniCalendar = ({ year, month, reminders, onDayClick, selectedDate }) => {
  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Agrupar recordatorios por día
  const remindersByDay = useMemo(() => {
    const map = {};
    reminders.forEach(r => {
      const date = new Date(r.reminder_date);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return map;
  }, [reminders]);
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 hover:shadow-md transition-shadow">
      {/* Header del mes */}
      <h3 className="text-sm font-semibold text-gray-800 mb-2 text-center">
        {MONTH_NAMES[month]}
      </h3>
      
      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAY_NAMES.map(day => (
          <div key={day} className="text-[10px] font-medium text-gray-400 text-center py-0.5">
            {day.charAt(0)}
          </div>
        ))}
      </div>
      
      {/* Días del mes */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((dayInfo, idx) => {
          const dateKey = `${dayInfo.date.getFullYear()}-${dayInfo.date.getMonth()}-${dayInfo.date.getDate()}`;
          const dayReminders = remindersByDay[dateKey] || [];
          const hasReminders = dayReminders.length > 0;
          const isToday = dayInfo.date.getTime() === today.getTime();
          const isSelected = selectedDate && 
            dayInfo.date.getFullYear() === selectedDate.getFullYear() &&
            dayInfo.date.getMonth() === selectedDate.getMonth() &&
            dayInfo.date.getDate() === selectedDate.getDate();
          
          return (
            <button
              key={idx}
              onClick={() => onDayClick(dayInfo.date)}
              className={`
                relative w-7 h-7 text-[11px] rounded-md flex items-center justify-center
                transition-all duration-150
                ${!dayInfo.isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                ${isToday ? 'bg-blue-500 text-white font-bold' : ''}
                ${isSelected && !isToday ? 'bg-blue-100 text-blue-700 font-semibold' : ''}
                ${!isToday && !isSelected ? 'hover:bg-gray-100' : ''}
              `}
            >
              {dayInfo.day}
              {hasReminders && dayInfo.isCurrentMonth && (
                <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isToday ? 'bg-white' : 'bg-orange-500'}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Modal para crear/editar recordatorio
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
      const reminderDate = new Date(editingReminder.reminder_date);
      setDate(reminderDate.toISOString().split('T')[0]);
      setTime(reminderDate.toTimeString().slice(0, 5));
    } else if (selectedDate) {
      setDate(selectedDate.toISOString().split('T')[0]);
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
        {/* Header */}
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
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título *
            </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
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
          
          {/* Actions */}
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

// Componente principal de Recordatorios
const RemindersView = ({ token }) => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  
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
  
  // Crear o actualizar recordatorio
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
  
  // Eliminar recordatorio
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
  
  // Marcar como completado
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
  
  // Click en un día
  const handleDayClick = (date) => {
    setSelectedDate(date);
    setEditingReminder(null);
    setShowModal(true);
  };
  
  // Editar recordatorio
  const handleEditReminder = (reminder) => {
    setEditingReminder(reminder);
    setSelectedDate(null);
    setShowModal(true);
  };
  
  // Recordatorios del día seleccionado o próximos
  const upcomingReminders = useMemo(() => {
    const now = new Date();
    return reminders
      .filter(r => !r.is_completed)
      .sort((a, b) => new Date(a.reminder_date) - new Date(b.reminder_date))
      .slice(0, 10);
  }, [reminders]);
  
  // Filtrar recordatorios por año actual
  const yearReminders = useMemo(() => {
    return reminders.filter(r => {
      const date = new Date(r.reminder_date);
      return date.getFullYear() === currentYear;
    });
  }, [reminders, currentYear]);
  
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="flex-1 bg-gray-50 overflow-auto">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center">
                <Bell className="text-white" size={22} />
              </div>
              Recordatorios
            </h1>
            <p className="text-gray-500 mt-1">Gestiona tus recordatorios y eventos</p>
          </div>
          
          <button
            onClick={() => {
              setSelectedDate(new Date());
              setEditingReminder(null);
              setShowModal(true);
            }}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/25"
          >
            <Plus size={20} />
            Nuevo Recordatorio
          </button>
        </div>
        
        {/* Year Navigation */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={() => setCurrentYear(y => y - 1)}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ChevronLeft size={24} className="text-gray-600" />
          </button>
          <h2 className="text-xl font-bold text-gray-800 min-w-[100px] text-center">
            {currentYear}
          </h2>
          <button
            onClick={() => setCurrentYear(y => y + 1)}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ChevronRight size={24} className="text-gray-600" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendario anual */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {MONTH_NAMES.map((_, monthIndex) => (
                <MiniCalendar
                  key={monthIndex}
                  year={currentYear}
                  month={monthIndex}
                  reminders={yearReminders}
                  onDayClick={handleDayClick}
                  selectedDate={selectedDate}
                />
              ))}
            </div>
          </div>
          
          {/* Panel lateral de próximos recordatorios */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-6">
              <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Clock size={16} className="text-blue-500" />
                Próximos Recordatorios
              </h3>
              
              {upcomingReminders.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No hay recordatorios pendientes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingReminders.map(reminder => {
                    const date = new Date(reminder.reminder_date);
                    const isOverdue = date < new Date();
                    
                    return (
                      <div
                        key={reminder.id}
                        className={`p-3 rounded-lg border ${isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'} hover:shadow-sm transition-shadow`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${reminder.is_completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                              {reminder.title}
                            </p>
                            <p className={`text-xs mt-1 ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
                              {date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} a las {date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleToggleComplete(reminder)}
                              className={`p-1.5 rounded-lg transition-colors ${reminder.is_completed ? 'bg-green-100 text-green-600' : 'hover:bg-gray-200 text-gray-400'}`}
                              title={reminder.is_completed ? 'Marcar como pendiente' : 'Marcar como completado'}
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => handleEditReminder(reminder)}
                              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                              title="Editar"
                            >
                              <Calendar size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteReminder(reminder.id)}
                              className="p-1.5 hover:bg-red-100 rounded-lg transition-colors text-gray-400 hover:text-red-600"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal de crear/editar recordatorio */}
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

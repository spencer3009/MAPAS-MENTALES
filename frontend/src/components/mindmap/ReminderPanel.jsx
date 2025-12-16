import React, { useState, useEffect } from 'react';
import { 
  Bell, Calendar, Clock, MessageSquare, Trash2, 
  Plus, Send, AlertCircle, CheckCircle, Loader2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// Icono de WhatsApp
const WhatsAppIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const ReminderPanel = ({ 
  selectedNode, 
  projectId, 
  projectName,
  onReminderChange
}) => {
  const { token } = useAuth();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [userTimezone, setUserTimezone] = useState('America/Lima');
  
  // Form state
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    message: '',
    channel: 'whatsapp'
  });

  // Cargar zona horaria del perfil
  useEffect(() => {
    const loadTimezone = async () => {
      if (!token) return;
      try {
        const response = await fetch(`${API_URL}/api/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const profile = await response.json();
          if (profile.timezone) {
            setUserTimezone(profile.timezone);
          }
        }
      } catch (err) {
        console.error('Error loading timezone:', err);
      }
    };
    loadTimezone();
  }, [token]);

  // Cargar recordatorios
  useEffect(() => {
    if (token && projectId) {
      loadReminders();
    }
  }, [token, projectId, selectedNode?.id]);

  const loadReminders = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/reminders?project_id=${projectId}`;
      if (selectedNode?.id) {
        url += `&node_id=${selectedNode.id}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setReminders(data);
      }
    } catch (err) {
      console.error('Error loading reminders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReminder = async (e) => {
    e.preventDefault();
    if (!formData.date || !formData.time || !formData.message) {
      setError('Por favor completa todos los campos');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const reminderData = {
        type: selectedNode ? 'node' : 'project',
        node_id: selectedNode?.id || null,
        node_text: selectedNode?.text || null,
        project_id: projectId,
        project_name: projectName,
        scheduled_date: formData.date,
        scheduled_time: formData.time,
        message: formData.message,
        channel: formData.channel
      };

      const response = await fetch(`${API_URL}/api/reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(reminderData)
      });

      if (response.ok) {
        const newReminder = await response.json();
        setReminders(prev => [...prev, newReminder]);
        setFormData({ date: '', time: '', message: '', channel: 'whatsapp' });
        setShowForm(false);
        if (onReminderChange) onReminderChange();
      } else {
        const data = await response.json();
        setError(data.detail || 'Error al crear recordatorio');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteReminder = async (reminderId) => {
    try {
      const response = await fetch(`${API_URL}/api/reminders/${reminderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setReminders(prev => prev.filter(r => r.id !== reminderId));
        if (onReminderChange) onReminderChange();
      }
    } catch (err) {
      console.error('Error deleting reminder:', err);
    }
  };

  // Obtener fecha mínima (hoy en zona horaria del usuario)
  const getMinDate = () => {
    // Crear fecha en la zona horaria del usuario
    const now = new Date();
    const options = { timeZone: userTimezone, year: 'numeric', month: '2-digit', day: '2-digit' };
    const formatter = new Intl.DateTimeFormat('en-CA', options); // en-CA gives YYYY-MM-DD
    return formatter.format(now);
  };

  // Obtener fecha actual formateada para el usuario
  const getTodayFormatted = () => {
    const now = new Date();
    const options = { timeZone: userTimezone, weekday: 'long', day: 'numeric', month: 'long' };
    const formatter = new Intl.DateTimeFormat('es-ES', options);
    return formatter.format(now);
  };

  // Formatear fecha para mostrar
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric',
      timeZone: userTimezone
    });
  };

  // Obtener estado visual del recordatorio
  const getReminderStatus = (reminder) => {
    const now = new Date();
    const scheduled = new Date(reminder.scheduled_datetime);
    
    if (reminder.status === 'sent') {
      return { color: 'green', icon: CheckCircle, text: 'Enviado' };
    } else if (reminder.status === 'failed') {
      return { color: 'red', icon: AlertCircle, text: 'Fallido' };
    } else if (scheduled < now) {
      return { color: 'orange', icon: Clock, text: 'Pendiente' };
    }
    return { color: 'blue', icon: Bell, text: 'Programado' };
  };

  return (
    <div className="space-y-4">
      {/* Header con info del contexto */}
      <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100">
        <div className="flex items-center gap-2 mb-1">
          <Bell size={16} className="text-purple-600" />
          <span className="text-sm font-medium text-purple-900">
            {selectedNode ? 'Recordatorio de Nodo' : 'Recordatorio de Proyecto'}
          </span>
        </div>
        <p className="text-xs text-purple-700">
          {selectedNode ? `"${selectedNode.text || 'Sin nombre'}"` : projectName}
        </p>
      </div>

      {/* Botón para mostrar formulario */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="
            w-full p-3 rounded-xl border-2 border-dashed border-gray-200
            text-gray-500 hover:border-purple-300 hover:text-purple-600
            transition-all duration-200
            flex items-center justify-center gap-2
          "
        >
          <Plus size={18} />
          <span className="text-sm font-medium">Agregar recordatorio</span>
        </button>
      )}

      {/* Formulario de creación */}
      {showForm && (
        <form onSubmit={handleCreateReminder} className="space-y-4 p-4 bg-gray-50 rounded-xl">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Bell size={14} />
            Nuevo recordatorio
          </h4>

          {error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center gap-2">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* Fecha */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">
              <Calendar size={12} className="inline mr-1" />
              Fecha
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              min={getMinDate()}
              className="
                w-full px-3 py-2.5 text-sm
                border border-gray-200 rounded-lg
                focus:border-purple-400 focus:ring-2 focus:ring-purple-100
                outline-none transition-all
              "
              required
            />
          </div>

          {/* Hora */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">
              <Clock size={12} className="inline mr-1" />
              Hora
            </label>
            <input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
              className="
                w-full px-3 py-2.5 text-sm
                border border-gray-200 rounded-lg
                focus:border-purple-400 focus:ring-2 focus:ring-purple-100
                outline-none transition-all
              "
              required
            />
          </div>

          {/* Canal */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">
              Canal de envío
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, channel: 'whatsapp' }))}
                className={`
                  flex-1 py-2.5 px-3 rounded-lg text-sm font-medium
                  transition-all duration-150 flex items-center justify-center gap-2
                  ${formData.channel === 'whatsapp'
                    ? 'bg-green-100 text-green-700 ring-2 ring-green-500'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                <WhatsAppIcon size={16} color={formData.channel === 'whatsapp' ? '#25D366' : '#6b7280'} />
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, channel: 'email' }))}
                disabled
                className="
                  flex-1 py-2.5 px-3 rounded-lg text-sm font-medium
                  bg-gray-100 text-gray-400 cursor-not-allowed
                  flex items-center justify-center gap-2
                "
                title="Próximamente"
              >
                <MessageSquare size={16} />
                Email
              </button>
            </div>
          </div>

          {/* Mensaje */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">
              Mensaje del recordatorio
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder={selectedNode 
                ? `Recordar: ${selectedNode.text || 'tarea pendiente'}` 
                : `Revisar proyecto: ${projectName}`
              }
              rows={3}
              className="
                w-full px-3 py-2.5 text-sm
                border border-gray-200 rounded-lg
                focus:border-purple-400 focus:ring-2 focus:ring-purple-100
                outline-none transition-all resize-none
              "
              required
            />
          </div>

          {/* Botones */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError(null);
              }}
              className="
                flex-1 py-2.5 px-4 rounded-lg text-sm font-medium
                bg-gray-200 text-gray-700 hover:bg-gray-300
                transition-colors
              "
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating}
              className="
                flex-1 py-2.5 px-4 rounded-lg text-sm font-medium
                bg-purple-600 text-white hover:bg-purple-700
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors flex items-center justify-center gap-2
              "
            >
              {creating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              Programar
            </button>
          </div>
        </form>
      )}

      {/* Lista de recordatorios */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : reminders.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Recordatorios programados ({reminders.length})
          </h4>
          
          {reminders.map((reminder) => {
            const status = getReminderStatus(reminder);
            const StatusIcon = status.icon;
            
            return (
              <div
                key={reminder.id}
                className="p-3 bg-white rounded-xl border border-gray-100 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* Estado y tipo */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`
                        inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
                        ${status.color === 'green' ? 'bg-green-100 text-green-700' : ''}
                        ${status.color === 'blue' ? 'bg-blue-100 text-blue-700' : ''}
                        ${status.color === 'orange' ? 'bg-orange-100 text-orange-700' : ''}
                        ${status.color === 'red' ? 'bg-red-100 text-red-700' : ''}
                      `}>
                        <StatusIcon size={10} />
                        {status.text}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {reminder.type === 'node' ? '📌 Nodo' : '📁 Proyecto'}
                      </span>
                    </div>
                    
                    {/* Mensaje */}
                    <p className="text-sm text-gray-700 truncate mb-1">
                      {reminder.message}
                    </p>
                    
                    {/* Fecha y hora */}
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(reminder.scheduled_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {reminder.scheduled_time}
                      </span>
                      {reminder.channel === 'whatsapp' && (
                        <WhatsAppIcon size={12} color="#25D366" />
                      )}
                    </div>
                  </div>
                  
                  {/* Botón eliminar */}
                  {reminder.status === 'pending' && (
                    <button
                      onClick={() => handleDeleteReminder(reminder.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-2">
            <Bell size={20} className="text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 mb-1">Sin recordatorios</p>
          <p className="text-xs text-gray-400">
            Crea un recordatorio para recibir notificaciones
          </p>
        </div>
      )}

      {/* Nota sobre WhatsApp */}
      <div className="p-3 bg-green-50 rounded-xl border border-green-100">
        <div className="flex items-start gap-2">
          <WhatsAppIcon size={16} color="#25D366" />
          <div>
            <p className="text-xs font-medium text-green-800">WhatsApp Business API</p>
            <p className="text-[10px] text-green-600 mt-0.5">
              Los recordatorios se enviarán a tu número de WhatsApp configurado
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReminderPanel;

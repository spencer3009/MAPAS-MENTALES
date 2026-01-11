import React, { useState } from 'react';
import { Bell, X, Calendar, Clock, Send, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// Icono de WhatsApp
const WhatsAppIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// Use relative URLs for production compatibility
const API_URL = '';

const ProjectReminderModal = ({ isOpen, project, onClose, onSuccess }) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    message: ''
  });

  if (!isOpen || !project) return null;

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.date || !formData.time || !formData.message) {
      setError('Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const reminderData = {
        type: 'project',
        node_id: null,
        node_text: null,
        project_id: project.id,
        project_name: project.name,
        scheduled_date: formData.date,
        scheduled_time: formData.time,
        message: formData.message,
        channel: 'whatsapp'
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
        setSuccess(true);
        setFormData({ date: '', time: '', message: '' });
        setTimeout(() => {
          setSuccess(false);
          onClose();
          if (onSuccess) onSuccess();
        }, 1500);
      } else {
        const data = await response.json();
        setError(data.detail || 'Error al crear recordatorio');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ date: '', time: '', message: '' });
    setError(null);
    setSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Bell size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Recordatorio de Proyecto</h2>
                <p className="text-sm text-white/80">{project.name}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={20} className="text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Success Message */}
          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
              <CheckCircle className="text-green-600" size={20} />
              <p className="text-green-700 font-medium">¡Recordatorio programado!</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
              <AlertCircle size={16} className="text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {!success && (
            <>
              {/* Fecha */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Calendar size={12} />
                  Fecha
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  min={getMinDate()}
                  className="
                    w-full px-4 py-3 text-sm
                    border border-gray-200 rounded-xl
                    focus:border-purple-400 focus:ring-2 focus:ring-purple-100
                    outline-none transition-all
                  "
                  required
                />
              </div>

              {/* Hora */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Clock size={12} />
                  Hora
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  className="
                    w-full px-4 py-3 text-sm
                    border border-gray-200 rounded-xl
                    focus:border-purple-400 focus:ring-2 focus:ring-purple-100
                    outline-none transition-all
                  "
                  required
                />
              </div>

              {/* Canal */}
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                <WhatsAppIcon size={24} color="#25D366" />
                <div>
                  <p className="text-sm font-medium text-green-800">WhatsApp</p>
                  <p className="text-xs text-green-600">Se enviará a tu número configurado</p>
                </div>
              </div>

              {/* Mensaje */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                  Mensaje del recordatorio
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder={`Revisar proyecto: ${project.name}`}
                  rows={3}
                  className="
                    w-full px-4 py-3 text-sm
                    border border-gray-200 rounded-xl
                    focus:border-purple-400 focus:ring-2 focus:ring-purple-100
                    outline-none transition-all resize-none
                  "
                  required
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="
                    flex-1 py-3 px-4 rounded-xl text-sm font-medium
                    bg-gray-100 text-gray-700 hover:bg-gray-200
                    transition-colors
                  "
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="
                    flex-1 py-3 px-4 rounded-xl text-sm font-medium
                    bg-gradient-to-r from-purple-600 to-blue-600 text-white
                    hover:from-purple-700 hover:to-blue-700
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all flex items-center justify-center gap-2
                    shadow-lg shadow-purple-200
                  "
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                  Programar
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default ProjectReminderModal;

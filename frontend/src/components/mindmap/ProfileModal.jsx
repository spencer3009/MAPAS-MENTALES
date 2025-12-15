import React, { useState, useEffect } from 'react';
import { X, User, Phone, Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// Icono de WhatsApp
const WhatsAppIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const ProfileModal = ({ isOpen, onClose, user }) => {
  const { token } = useAuth();
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Cargar número actual al abrir
  useEffect(() => {
    if (isOpen && token) {
      loadWhatsappNumber();
    }
  }, [isOpen, token]);

  const loadWhatsappNumber = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/profile/whatsapp`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setWhatsappNumber(data.whatsapp || '');
      }
    } catch (err) {
      console.error('Error loading WhatsApp number:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!whatsappNumber.trim()) {
      setError('Por favor ingresa un número de WhatsApp');
      return;
    }

    // Validar formato básico
    const cleanNumber = whatsappNumber.replace(/\s/g, '');
    if (!/^\+?\d{10,15}$/.test(cleanNumber)) {
      setError('Formato inválido. Usa formato internacional: +521234567890');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/auth/profile/whatsapp?whatsapp_number=${encodeURIComponent(cleanNumber)}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1500);
      } else {
        const data = await response.json();
        setError(data.detail || 'Error al guardar');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <User size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Mi Perfil</h2>
                <p className="text-sm text-white/80">{user?.full_name || user?.username}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={20} className="text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Success Message */}
          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
              <CheckCircle className="text-green-600" size={20} />
              <p className="text-green-700 font-medium">¡Número guardado correctamente!</p>
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
              {/* WhatsApp Number Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <WhatsAppIcon size={20} color="#25D366" />
                  <label className="text-sm font-semibold text-gray-700">
                    Número de WhatsApp
                  </label>
                </div>
                
                <p className="text-xs text-gray-500">
                  Este número recibirá las notificaciones de recordatorios. 
                  Usa el formato internacional con código de país.
                </p>

                <div className="relative">
                  <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="+521234567890"
                    disabled={loading}
                    className="
                      w-full pl-10 pr-4 py-3 text-sm
                      border border-gray-200 rounded-xl
                      focus:border-green-400 focus:ring-2 focus:ring-green-100
                      outline-none transition-all
                      disabled:bg-gray-50 disabled:text-gray-400
                    "
                  />
                </div>

                <p className="text-[10px] text-gray-400">
                  Ejemplo: +52 para México, +34 para España, +1 para USA
                </p>
              </div>

              {/* Info Box */}
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="text-xs text-amber-700">
                  <strong>⚠️ Importante:</strong> Asegúrate de que este número esté agregado 
                  como destinatario permitido en tu cuenta de Meta Developers para recibir 
                  mensajes de prueba.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="
                    flex-1 py-3 px-4 rounded-xl text-sm font-medium
                    bg-gray-100 text-gray-700 hover:bg-gray-200
                    transition-colors
                  "
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || loading}
                  className="
                    flex-1 py-3 px-4 rounded-xl text-sm font-medium
                    bg-gradient-to-r from-green-500 to-emerald-500 text-white
                    hover:from-green-600 hover:to-emerald-600
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all flex items-center justify-center gap-2
                    shadow-lg shadow-green-200
                  "
                >
                  {saving ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}
                  Guardar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;

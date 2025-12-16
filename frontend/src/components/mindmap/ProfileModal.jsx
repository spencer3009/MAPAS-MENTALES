import React, { useState, useEffect } from 'react';
import { 
  X, User, Phone, Mail, Save, Loader2, CheckCircle, AlertCircle,
  Lock, Eye, EyeOff, UserCircle
} from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'password'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  
  // Profile form state
  const [profile, setProfile] = useState({
    nombre: '',
    apellidos: '',
    email: '',
    whatsapp: ''
  });

  // Password form state
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Load profile on open
  useEffect(() => {
    if (isOpen && token) {
      loadProfile();
    }
  }, [isOpen, token]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('profile');
      setError(null);
      setSuccess(null);
      setPasswords({ current: '', new: '', confirm: '' });
    }
  }, [isOpen]);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProfile({
          nombre: data.nombre || '',
          apellidos: data.apellidos || '',
          email: data.email || '',
          whatsapp: data.whatsapp || ''
        });
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Error al cargar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    // Validate WhatsApp format
    if (profile.whatsapp) {
      const cleanNumber = profile.whatsapp.replace(/\s/g, '');
      if (!/^\+?\d{10,15}$/.test(cleanNumber)) {
        setError('Formato de WhatsApp inválido. Usa formato internacional: +521234567890');
        setSaving(false);
        return;
      }
    }

    // Validate email format
    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      setError('Formato de email inválido');
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profile)
      });

      if (response.ok) {
        setSuccess('Perfil actualizado correctamente');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.detail || 'Error al guardar el perfil');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    // Validations
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      setError('Todos los campos son obligatorios');
      setSaving(false);
      return;
    }

    if (passwords.new !== passwords.confirm) {
      setError('Las contraseñas nuevas no coinciden');
      setSaving(false);
      return;
    }

    if (passwords.new.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/profile/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: passwords.current,
          new_password: passwords.new,
          confirm_password: passwords.confirm
        })
      });

      if (response.ok) {
        setSuccess('Contraseña actualizada correctamente');
        setPasswords({ current: '', new: '', confirm: '' });
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.detail || 'Error al cambiar la contraseña');
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <UserCircle size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Mi Perfil</h2>
                <p className="text-sm text-white/80">@{user?.username}</p>
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

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-4 shrink-0">
          <button
            onClick={() => { setActiveTab('profile'); setError(null); setSuccess(null); }}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <User size={16} className="inline mr-2" />
            Datos Personales
          </button>
          <button
            onClick={() => { setActiveTab('password'); setError(null); setSuccess(null); }}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'password'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Lock size={16} className="inline mr-2" />
            Contraseña
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Messages */}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2">
              <CheckCircle size={18} className="text-green-600" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
              <AlertCircle size={18} className="text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-blue-500" />
            </div>
          ) : activeTab === 'profile' ? (
            /* Profile Form */
            <div className="space-y-4">
              {/* Nombre y Apellidos */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={profile.nombre}
                    onChange={(e) => setProfile(p => ({ ...p, nombre: e.target.value }))}
                    placeholder="Tu nombre"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Apellidos
                  </label>
                  <input
                    type="text"
                    value={profile.apellidos}
                    onChange={(e) => setProfile(p => ({ ...p, apellidos: e.target.value }))}
                    placeholder="Tus apellidos"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  <Mail size={12} className="inline mr-1" />
                  Email
                </label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile(p => ({ ...p, email: e.target.value }))}
                  placeholder="correo@ejemplo.com"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                />
              </div>

              {/* WhatsApp */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  <WhatsAppIcon size={12} color="#25D366" className="inline mr-1" />
                  <span className="ml-1">WhatsApp</span>
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={profile.whatsapp}
                    onChange={(e) => setProfile(p => ({ ...p, whatsapp: e.target.value }))}
                    placeholder="+521234567890"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-green-400 focus:ring-2 focus:ring-green-100 outline-none transition-all"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Formato internacional con código de país. Ej: +52 México, +34 España
                </p>
              </div>

              {/* WhatsApp Info */}
              <div className="p-3 bg-green-50 border border-green-100 rounded-xl">
                <div className="flex items-start gap-2">
                  <WhatsAppIcon size={18} color="#25D366" className="shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-green-800">
                      Notificaciones por WhatsApp
                    </p>
                    <p className="text-[10px] text-green-600 mt-0.5">
                      Los recordatorios de tus proyectos y nodos se enviarán a este número.
                    </p>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full py-3 px-4 rounded-xl text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
              >
                {saving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                Guardar Cambios
              </button>
            </div>
          ) : (
            /* Password Form */
            <div className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Contraseña Actual
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwords.current}
                    onChange={(e) => setPasswords(p => ({ ...p, current: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(s => ({ ...s, current: !s.current }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwords.new}
                    onChange={(e) => setPasswords(p => ({ ...p, new: e.target.value }))}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(s => ({ ...s, new: !s.new }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Confirmar Nueva Contraseña
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwords.confirm}
                    onChange={(e) => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                    placeholder="Repite la contraseña"
                    className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(s => ({ ...s, confirm: !s.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="text-xs text-amber-700">
                  <strong>Requisitos:</strong> La contraseña debe tener al menos 6 caracteres.
                </p>
              </div>

              {/* Change Password Button */}
              <button
                onClick={handleChangePassword}
                disabled={saving}
                className="w-full py-3 px-4 rounded-xl text-sm font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-200"
              >
                {saving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Lock size={18} />
                )}
                Cambiar Contraseña
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;

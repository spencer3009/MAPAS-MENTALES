import React, { useState, useEffect } from 'react';
import { 
  X, User, Mail, Save, Loader2, CheckCircle, AlertCircle,
  Lock, Eye, EyeOff, UserCircle, Bell, Globe
} from 'lucide-react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Lista de países con códigos y zonas horarias
const COUNTRIES = [
  { code: 'PE', name: 'Perú', flag: '🇵🇪', timezone: 'America/Lima', phoneCode: '51' },
  { code: 'MX', name: 'México', flag: '🇲🇽', timezone: 'America/Mexico_City', phoneCode: '52' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', timezone: 'America/Bogota', phoneCode: '57' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', timezone: 'America/Argentina/Buenos_Aires', phoneCode: '54' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', timezone: 'America/Santiago', phoneCode: '56' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', timezone: 'America/Guayaquil', phoneCode: '593' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪', timezone: 'America/Caracas', phoneCode: '58' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴', timezone: 'America/La_Paz', phoneCode: '591' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾', timezone: 'America/Asuncion', phoneCode: '595' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', timezone: 'America/Montevideo', phoneCode: '598' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', timezone: 'America/Sao_Paulo', phoneCode: '55' },
  { code: 'ES', name: 'España', flag: '🇪🇸', timezone: 'Europe/Madrid', phoneCode: '34' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', timezone: 'America/New_York', phoneCode: '1' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', timezone: 'America/Costa_Rica', phoneCode: '506' },
  { code: 'PA', name: 'Panamá', flag: '🇵🇦', timezone: 'America/Panama', phoneCode: '507' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹', timezone: 'America/Guatemala', phoneCode: '502' },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳', timezone: 'America/Tegucigalpa', phoneCode: '504' },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻', timezone: 'America/El_Salvador', phoneCode: '503' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮', timezone: 'America/Managua', phoneCode: '505' },
  { code: 'DO', name: 'República Dominicana', flag: '🇩🇴', timezone: 'America/Santo_Domingo', phoneCode: '1' },
  { code: 'PR', name: 'Puerto Rico', flag: '🇵🇷', timezone: 'America/Puerto_Rico', phoneCode: '1' },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺', timezone: 'America/Havana', phoneCode: '53' },
];

const ProfileModal = ({ isOpen, onClose, user }) => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  
  // Profile form state
  const [profile, setProfile] = useState({
    nombre: '',
    apellidos: '',
    email: '',
    whatsapp: '',
    pais: 'PE',
    timezone: 'America/Lima'
  });

  // Phone input state
  const [phoneValue, setPhoneValue] = useState('');
  const [phoneCountry, setPhoneCountry] = useState('pe');

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
          whatsapp: data.whatsapp || '',
          pais: data.pais || 'PE',
          timezone: data.timezone || 'America/Lima'
        });
        
        // Set phone input value
        if (data.whatsapp) {
          const cleanPhone = data.whatsapp.replace('+', '');
          setPhoneValue(cleanPhone);
          
          try {
            const parsed = parsePhoneNumber(data.whatsapp);
            if (parsed && parsed.country) {
              setPhoneCountry(parsed.country.toLowerCase());
            }
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Error al cargar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (value, country) => {
    setPhoneValue(value);
    if (country) {
      setPhoneCountry(country.countryCode);
    }
    
    if (value) {
      const formattedPhone = '+' + value;
      setProfile(p => ({ ...p, whatsapp: formattedPhone }));
    } else {
      setProfile(p => ({ ...p, whatsapp: '' }));
    }
  };

  const handleCountryChange = (countryCode) => {
    const country = COUNTRIES.find(c => c.code === countryCode);
    if (country) {
      setProfile(p => ({
        ...p,
        pais: countryCode,
        timezone: country.timezone
      }));
      setPhoneCountry(countryCode.toLowerCase());
    }
  };

  const validateWhatsApp = () => {
    if (!profile.whatsapp) {
      return { valid: false, error: 'El número de WhatsApp es obligatorio para recibir recordatorios' };
    }
    
    try {
      if (!isValidPhoneNumber(profile.whatsapp)) {
        return { valid: false, error: 'Número de teléfono inválido. Verifica el formato.' };
      }
      
      const parsed = parsePhoneNumber(profile.whatsapp);
      if (!parsed || !parsed.isValid()) {
        return { valid: false, error: 'Número de teléfono inválido para el país seleccionado.' };
      }
      
      return { valid: true, formatted: parsed.format('E.164') };
    } catch (e) {
      return { valid: false, error: 'Formato de número inválido.' };
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    // Validate WhatsApp
    const whatsappValidation = validateWhatsApp();
    if (!whatsappValidation.valid) {
      setError(whatsappValidation.error);
      setSaving(false);
      return;
    }

    // Validate email format
    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      setError('Formato de email inválido');
      setSaving(false);
      return;
    }

    try {
      const dataToSave = {
        ...profile,
        whatsapp: whatsappValidation.formatted
      };

      const response = await fetch(`${API_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dataToSave)
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

  const getWhatsAppPreview = () => {
    if (!profile.whatsapp) return null;
    try {
      const parsed = parsePhoneNumber(profile.whatsapp);
      if (parsed) {
        return parsed.formatInternational();
      }
    } catch (e) {}
    return profile.whatsapp;
  };

  const selectedCountry = COUNTRIES.find(c => c.code === profile.pais) || COUNTRIES[0];

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
                    name="profile_nombre"
                    autoComplete="given-name"
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
                    name="profile_apellidos"
                    autoComplete="family-name"
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
                  name="profile_email"
                  autoComplete="email"
                  value={profile.email}
                  onChange={(e) => setProfile(p => ({ ...p, email: e.target.value }))}
                  placeholder="correo@ejemplo.com"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                />
              </div>

              {/* País - NUEVO */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  <Globe size={12} className="inline mr-1" />
                  País
                </label>
                <select
                  value={profile.pais}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white"
                >
                  {COUNTRIES.map(country => (
                    <option key={country.code} value={country.code}>
                      {country.flag} {country.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">
                  Zona horaria: {selectedCountry.timezone}
                </p>
              </div>

              {/* WhatsApp */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  📱 WhatsApp <span className="text-red-500">*</span>
                </label>
                <div className="phone-input-container">
                  <PhoneInput
                    country={phoneCountry}
                    value={phoneValue}
                    onChange={handlePhoneChange}
                    inputClass="!w-full !h-11 !text-sm !rounded-xl !border-gray-200 focus:!border-green-400 focus:!ring-2 focus:!ring-green-100"
                    buttonClass="!rounded-l-xl !border-gray-200 !bg-gray-50 hover:!bg-gray-100"
                    dropdownClass="!rounded-xl !shadow-xl !border-gray-200"
                    searchClass="!rounded-lg !border-gray-200"
                    containerClass="!w-full"
                    enableSearch={true}
                    searchPlaceholder="Buscar país..."
                    preferredCountries={['pe', 'mx', 'co', 'ar', 'cl', 'es', 'us']}
                  />
                </div>
                
                {profile.whatsapp && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="text-gray-400">Número guardado:</span>
                    <span className="font-mono text-green-600 bg-green-50 px-2 py-0.5 rounded">
                      {getWhatsAppPreview()}
                    </span>
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-lg shrink-0">
                    <Bell size={18} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Notificaciones de Recordatorios
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Los recordatorios se enviarán a tu WhatsApp según la zona horaria de {selectedCountry.flag} {selectedCountry.name}.
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
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Contraseña Actual
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    name="current_password"
                    autoComplete="current-password"
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

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    name="new_password"
                    autoComplete="new-password"
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

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Confirmar Nueva Contraseña
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    name="confirm_password"
                    autoComplete="new-password"
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

              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="text-xs text-amber-700">
                  <strong>Requisitos:</strong> La contraseña debe tener al menos 6 caracteres.
                </p>
              </div>

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

      {/* Custom styles for phone input */}
      <style jsx global>{`
        .react-tel-input .form-control {
          width: 100% !important;
          height: 44px !important;
          font-size: 14px !important;
          border-radius: 12px !important;
          border: 1px solid #e5e7eb !important;
          padding-left: 52px !important;
        }
        .react-tel-input .form-control:focus {
          border-color: #22c55e !important;
          box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1) !important;
        }
        .react-tel-input .flag-dropdown {
          border-radius: 12px 0 0 12px !important;
          border: 1px solid #e5e7eb !important;
          border-right: none !important;
          background: #f9fafb !important;
        }
        .react-tel-input .flag-dropdown:hover {
          background: #f3f4f6 !important;
        }
        .react-tel-input .flag-dropdown.open {
          background: #f3f4f6 !important;
          border-radius: 12px 0 0 0 !important;
        }
        .react-tel-input .selected-flag {
          padding: 0 8px 0 12px !important;
          border-radius: 12px 0 0 12px !important;
        }
        .react-tel-input .country-list {
          border-radius: 12px !important;
          box-shadow: 0 10px 40px rgba(0,0,0,0.15) !important;
          margin-top: 4px !important;
          max-height: 250px !important;
        }
        .react-tel-input .country-list .country {
          padding: 10px 12px !important;
        }
        .react-tel-input .country-list .country:hover {
          background: #f0fdf4 !important;
        }
        .react-tel-input .country-list .country.highlight {
          background: #dcfce7 !important;
        }
        .react-tel-input .search-box {
          border-radius: 8px !important;
          margin: 8px !important;
          padding: 8px 12px !important;
          width: calc(100% - 16px) !important;
        }
      `}</style>
    </div>
  );
};

export default ProfileModal;

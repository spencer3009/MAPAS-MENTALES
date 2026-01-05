import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Eye, 
  EyeOff, 
  UserPlus, 
  AlertCircle, 
  Loader2,
  Sparkles,
  Zap,
  Shield,
  Users,
  Brain,
  Layers,
  CheckCircle2,
  Map
} from 'lucide-react';
import { getDemoMapForTransfer, hasDemoMap } from '../../hooks/useDemoNodes';

// URL del logo MindoraMap
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_c7c9b123-4484-446c-b0cd-4986b2bb2189/artifacts/hk2d8hgn_MINDORA%20TRANSPARENTE.png';

// Features destacados
const FEATURES = [
  {
    icon: Brain,
    title: 'Mapas Mentales Intuitivos',
    description: 'Crea y organiza ideas con facilidad'
  },
  {
    icon: Zap,
    title: 'Rápido y Fluido',
    description: 'Interfaz optimizada para productividad'
  },
  {
    icon: Layers,
    title: 'Múltiples Proyectos',
    description: 'Gestiona todos tus mapas en un lugar'
  },
  {
    icon: Shield,
    title: 'Guardado Automático',
    description: 'Nunca pierdas tu trabajo'
  }
];

// Nombres de planes para mostrar
const PLAN_DISPLAY_NAMES = {
  'personal': { name: 'Personal', price: '$3/mes', color: 'blue' },
  'team': { name: 'Team', price: '$8/mes', color: 'indigo' },
  'enterprise': { name: 'Enterprise', price: '$24/mes', color: 'violet' }
};

const RegisterPage = ({ onBackToLanding, onSwitchToLogin, selectedPlan }) => {
  const { register, loginWithGoogle, loading, error, clearError } = useAuth();
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [hasDemoMapToSave, setHasDemoMapToSave] = useState(false);

  // Verificar si hay un mapa demo guardado
  useEffect(() => {
    setHasDemoMapToSave(hasDemoMap());
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.nombre.trim()) {
      setLocalError('Ingresa tu nombre');
      return false;
    }
    if (!formData.email.trim()) {
      setLocalError('Ingresa tu correo electrónico');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setLocalError('Ingresa un correo electrónico válido');
      return false;
    }
    if (!formData.username.trim()) {
      setLocalError('Ingresa un nombre de usuario');
      return false;
    }
    if (formData.username.length < 4) {
      setLocalError('El nombre de usuario debe tener al menos 4 caracteres');
      return false;
    }
    if (!formData.password) {
      setLocalError('Ingresa una contraseña');
      return false;
    }
    if (formData.password.length < 6) {
      setLocalError('La contraseña debe tener al menos 6 caracteres');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setLocalError('Las contraseñas no coinciden');
      return false;
    }
    if (!acceptTerms) {
      setLocalError('Debes aceptar los términos y condiciones');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    clearError();
    
    if (!validateForm()) {
      return;
    }
    
    // Obtener mapa demo si existe
    const demoMap = hasDemoMapToSave ? getDemoMapForTransfer() : null;
    
    const result = await register({
      nombre: formData.nombre.trim(),
      apellidos: formData.apellidos.trim(),
      email: formData.email.trim(),
      username: formData.username.trim(),
      password: formData.password
    }, demoMap);
    
    if (!result.success) {
      setLocalError(result.error || 'Error al crear la cuenta');
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen flex">
      {/* Panel Izquierdo - Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 overflow-hidden">
        {/* Elementos decorativos de fondo */}
        <div className="absolute inset-0">
          {/* Círculos decorativos */}
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-violet-400/15 rounded-full blur-2xl" />
          
          {/* Patrón de puntos */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)`,
              backgroundSize: '30px 30px'
            }}
          />
          
          {/* Líneas decorativas tipo mind map */}
          <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M20,50 Q35,30 50,50 T80,50" stroke="white" strokeWidth="0.2" fill="none" />
            <path d="M30,30 Q50,45 70,30" stroke="white" strokeWidth="0.15" fill="none" />
            <path d="M25,70 Q50,55 75,70" stroke="white" strokeWidth="0.15" fill="none" />
            <circle cx="20" cy="50" r="1" fill="white" />
            <circle cx="50" cy="50" r="1.5" fill="white" />
            <circle cx="80" cy="50" r="1" fill="white" />
            <circle cx="30" cy="30" r="0.8" fill="white" />
            <circle cx="70" cy="30" r="0.8" fill="white" />
            <circle cx="25" cy="70" r="0.8" fill="white" />
            <circle cx="75" cy="70" r="0.8" fill="white" />
          </svg>
        </div>

        {/* Contenido del panel izquierdo */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 py-12">
          {/* Logo y nombre */}
          <div className="mb-12">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3">
                <img 
                  src={LOGO_URL} 
                  alt="MindoraMap" 
                  className="h-10 xl:h-12 object-contain"
                />
              </div>
            </div>
          </div>

          {/* Headline */}
          <div className="mb-12">
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
              Únete a miles de
              <br />
              <span className="text-blue-200">empresarios exitosos</span>
            </h1>
            <p className="text-lg text-blue-100/80 max-w-md">
              Crea tu cuenta gratis y comienza a organizar tus ideas como nunca antes.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-4 xl:gap-6">
            {FEATURES.map((feature, index) => (
              <div 
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 xl:p-5 border border-white/10 hover:bg-white/15 transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-white text-sm mb-1">{feature.title}</h3>
                <p className="text-xs text-blue-100/70">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Estadísticas o social proof */}
          <div className="mt-12 flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-200" />
              <span className="text-blue-100/80 text-sm">+2,500 usuarios activos</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-200" />
              <span className="text-blue-100/80 text-sm">4.9 ★ valoración</span>
            </div>
          </div>
        </div>
      </div>

      {/* Panel Derecho - Formulario */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Botón volver a landing */}
          {onBackToLanding && (
            <button
              onClick={onBackToLanding}
              className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Volver al inicio
            </button>
          )}

          {/* Logo móvil - solo visible en pantallas pequeñas */}
          <div className="lg:hidden flex justify-center mb-8">
            <img 
              src={LOGO_URL} 
              alt="MindoraMap" 
              className="h-12 object-contain"
            />
          </div>

          {/* Card del formulario */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 xl:p-10 border border-slate-100">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 mb-4">
                <UserPlus className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Crea tu cuenta
              </h2>
              <p className="text-gray-500 text-sm">
                Empieza gratis, sin tarjeta de crédito
              </p>
            </div>

            {/* Error Message */}
            {displayError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertCircle size={16} className="text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-red-800">Error</p>
                  <p className="text-xs text-red-600 mt-0.5">{displayError}</p>
                </div>
              </div>
            )}

            {/* Banner de mapa demo pendiente */}
            {hasDemoMapToSave && (
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl animate-in fade-in duration-300">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Map size={20} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-800">¡Tu mapa está listo!</p>
                  <p className="text-xs text-emerald-600 mt-0.5">Tu mapa de la demo se guardará automáticamente al crear tu cuenta.</p>
                </div>
              </div>
            )}

            {/* Banner de plan seleccionado */}
            {selectedPlan && PLAN_DISPLAY_NAMES[selectedPlan] && !hasDemoMapToSave && (
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl animate-in fade-in duration-300">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={20} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800">
                    Plan {PLAN_DISPLAY_NAMES[selectedPlan].name} seleccionado
                  </p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    Crea tu cuenta gratis y luego activa tu plan {PLAN_DISPLAY_NAMES[selectedPlan].name} ({PLAN_DISPLAY_NAMES[selectedPlan].price}) con PayPal.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nombre y Apellidos */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    placeholder="Tu nombre"
                    className="
                      w-full px-4 py-3 rounded-xl
                      bg-slate-50 border-2 border-slate-100
                      focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                      outline-none transition-all duration-200
                      text-gray-900 placeholder:text-gray-400
                      hover:border-slate-200
                    "
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Apellidos
                  </label>
                  <input
                    type="text"
                    name="apellidos"
                    value={formData.apellidos}
                    onChange={handleChange}
                    placeholder="Tus apellidos"
                    className="
                      w-full px-4 py-3 rounded-xl
                      bg-slate-50 border-2 border-slate-100
                      focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                      outline-none transition-all duration-200
                      text-gray-900 placeholder:text-gray-400
                      hover:border-slate-200
                    "
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Correo electrónico *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="tu@email.com"
                  className="
                    w-full px-4 py-3 rounded-xl
                    bg-slate-50 border-2 border-slate-100
                    focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10
                    outline-none transition-all duration-200
                    text-gray-900 placeholder:text-gray-400
                    hover:border-slate-200
                  "
                />
              </div>

              {/* Username */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Nombre de usuario *
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="miusuario"
                  className="
                    w-full px-4 py-3 rounded-xl
                    bg-slate-50 border-2 border-slate-100
                    focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10
                    outline-none transition-all duration-200
                    text-gray-900 placeholder:text-gray-400
                    hover:border-slate-200
                  "
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Contraseña *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Mínimo 6 caracteres"
                    className="
                      w-full px-4 py-3 pr-12 rounded-xl
                      bg-slate-50 border-2 border-slate-100
                      focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                      outline-none transition-all duration-200
                      text-gray-900 placeholder:text-gray-400
                      hover:border-slate-200
                    "
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="
                      absolute right-3 top-1/2 -translate-y-1/2
                      p-1.5 rounded-lg
                      text-gray-400 hover:text-gray-600 hover:bg-slate-100
                      transition-all duration-200
                    "
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Confirmar contraseña *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Repite tu contraseña"
                    className="
                      w-full px-4 py-3 pr-12 rounded-xl
                      bg-slate-50 border-2 border-slate-100
                      focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                      outline-none transition-all duration-200
                      text-gray-900 placeholder:text-gray-400
                      hover:border-slate-200
                    "
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="
                      absolute right-3 top-1/2 -translate-y-1/2
                      p-1.5 rounded-lg
                      text-gray-400 hover:text-gray-600 hover:bg-slate-100
                      transition-all duration-200
                    "
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="w-4 h-4 mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
                <label htmlFor="acceptTerms" className="text-sm text-gray-600">
                  Acepto los{' '}
                  <button type="button" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
                    Términos de Servicio
                  </button>
                  {' '}y la{' '}
                  <button type="button" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
                    Política de Privacidad
                  </button>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="
                  w-full py-4 px-4 mt-2 rounded-xl
                  bg-gradient-to-r from-blue-600 to-indigo-600
                  hover:from-blue-700 hover:to-indigo-700
                  disabled:from-blue-400 disabled:to-indigo-400 disabled:cursor-not-allowed
                  text-white font-semibold text-base
                  shadow-lg shadow-blue-600/30
                  hover:shadow-xl hover:shadow-blue-600/40
                  active:scale-[0.98]
                  transition-all duration-200
                  flex items-center justify-center gap-2
                "
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Creando cuenta...</span>
                  </>
                ) : (
                  <>
                    <span>Crear cuenta gratis</span>
                    <CheckCircle2 size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-4 bg-white text-slate-400">o regístrate con</span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={loginWithGoogle}
                className="
                  flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl
                  bg-slate-50 hover:bg-slate-100 border border-slate-200
                  text-gray-700 font-medium text-sm
                  transition-all duration-200
                  hover:shadow-sm
                "
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar con Google
              </button>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-gray-500 mt-8">
            ¿Ya tienes una cuenta?{' '}
            <button 
              onClick={onSwitchToLogin}
              className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
            >
              Inicia sesión
            </button>
          </p>

          {/* Copyright */}
          <p className="text-center text-xs text-gray-400 mt-4">
            © 2024 MindoraMap. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

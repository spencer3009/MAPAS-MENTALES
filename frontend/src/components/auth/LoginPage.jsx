import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Eye, 
  EyeOff, 
  LogIn, 
  AlertCircle, 
  Loader2,
  Sparkles,
  Zap,
  Shield,
  Users,
  Brain,
  Layers
} from 'lucide-react';

// URL del logo MindoraMap
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_mindviz-app/artifacts/k1kioask_image.png';

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

const LoginPage = ({ onBackToLanding, onSwitchToRegister }) => {
  const { login, loading, error, clearError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    clearError();
    
    if (!username.trim()) {
      setLocalError('Ingresa tu nombre de usuario');
      return;
    }
    if (!password) {
      setLocalError('Ingresa tu contraseña');
      return;
    }
    
    const result = await login(username.trim(), password);
    if (!result.success) {
      setLocalError(result.error || 'Error al iniciar sesión');
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
              Organiza tus ideas,
              <br />
              <span className="text-blue-200">potencia tu creatividad</span>
            </h1>
            <p className="text-lg text-blue-100/80 max-w-md">
              La herramienta de mapas mentales más intuitiva para profesionales y equipos creativos.
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
              <span className="text-blue-100/80 text-sm">+1,000 usuarios activos</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-200" />
              <span className="text-blue-100/80 text-sm">4.9 ★ valoración</span>
            </div>
          </div>
        </div>
      </div>

      {/* Panel Derecho - Formulario */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6 lg:p-12">
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
                <LogIn className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Bienvenido de vuelta
              </h2>
              <p className="text-gray-500 text-sm">
                Ingresa tus credenciales para continuar
              </p>
            </div>

            {/* Error Message */}
            {displayError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertCircle size={16} className="text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-red-800">Error de autenticación</p>
                  <p className="text-xs text-red-600 mt-0.5">{displayError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Usuario
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ingresa tu usuario"
                    className="
                      w-full px-4 py-3.5 rounded-xl
                      bg-slate-50 border-2 border-slate-100
                      focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                      outline-none transition-all duration-200
                      text-gray-900 placeholder:text-gray-400
                      group-hover:border-slate-200
                    "
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Contraseña
                </label>
                <div className="relative group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingresa tu contraseña"
                    className="
                      w-full px-4 py-3.5 pr-12 rounded-xl
                      bg-slate-50 border-2 border-slate-100
                      focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                      outline-none transition-all duration-200
                      text-gray-900 placeholder:text-gray-400
                      group-hover:border-slate-200
                    "
                    autoComplete="current-password"
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

              {/* Remember me & Forgot password */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <span className="text-gray-600 group-hover:text-gray-900 transition-colors">
                    Recordarme
                  </span>
                </label>
                <button 
                  type="button"
                  className="text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
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
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <span>Iniciar Sesión</span>
                    <LogIn size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-4 bg-white text-slate-400">o continúa con</span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="
                  flex items-center justify-center gap-2 py-3 px-4 rounded-xl
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
                Google
              </button>
              <button
                type="button"
                className="
                  flex items-center justify-center gap-2 py-3 px-4 rounded-xl
                  bg-slate-50 hover:bg-slate-100 border border-slate-200
                  text-gray-700 font-medium text-sm
                  transition-all duration-200
                  hover:shadow-sm
                "
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </button>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-gray-500 mt-8">
            ¿No tienes una cuenta?{' '}
            <button className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
              Solicitar acceso
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

export default LoginPage;

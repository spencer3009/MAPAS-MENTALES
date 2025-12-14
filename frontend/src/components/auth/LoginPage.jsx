import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff, LogIn, AlertCircle, Loader2 } from 'lucide-react';

// URL del logo MindoraMap
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_mindviz-app/artifacts/k1kioask_image.png';

const LoginPage = () => {
  const { login, loading, error, clearError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    clearError();
    
    // Validaciones básicas
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      {/* Decoración de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full opacity-20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200 rounded-full opacity-20 blur-3xl" />
      </div>

      {/* Card de Login */}
      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl shadow-blue-100/50 overflow-hidden">
          {/* Header con Logo */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 pt-10 pb-14">
            <div className="flex flex-col items-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4">
                <img 
                  src={LOGO_URL} 
                  alt="MindoraMap" 
                  className="h-12 w-auto object-contain filter brightness-0 invert"
                />
              </div>
              <p className="text-blue-100 text-sm font-medium">
                Organiza tus ideas visualmente
              </p>
            </div>
          </div>

          {/* Formulario */}
          <div className="px-8 pb-8 -mt-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 text-center mb-6">
                Iniciar Sesión
              </h2>

              {/* Error Message */}
              {displayError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm animate-in fade-in slide-in-from-top-2">
                  <AlertCircle size={18} className="shrink-0" />
                  <span>{displayError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Usuario
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ingresa tu usuario"
                    className="
                      w-full px-4 py-3 rounded-xl
                      border-2 border-gray-200
                      focus:border-blue-500 focus:ring-4 focus:ring-blue-100
                      outline-none transition-all
                      text-gray-900 placeholder:text-gray-400
                    "
                    autoComplete="username"
                    autoFocus
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ingresa tu contraseña"
                      className="
                        w-full px-4 py-3 pr-12 rounded-xl
                        border-2 border-gray-200
                        focus:border-blue-500 focus:ring-4 focus:ring-blue-100
                        outline-none transition-all
                        text-gray-900 placeholder:text-gray-400
                      "
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="
                        absolute right-3 top-1/2 -translate-y-1/2
                        p-1.5 rounded-lg
                        text-gray-400 hover:text-gray-600
                        hover:bg-gray-100
                        transition-all
                      "
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="
                    w-full py-3.5 px-4 mt-2 rounded-xl
                    bg-gradient-to-r from-blue-600 to-indigo-600
                    hover:from-blue-700 hover:to-indigo-700
                    disabled:from-blue-400 disabled:to-indigo-400
                    text-white font-semibold
                    shadow-lg shadow-blue-200
                    transition-all duration-200
                    flex items-center justify-center gap-2
                  "
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <LogIn size={20} />
                      Entrar
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 pb-6 text-center">
            <p className="text-xs text-gray-400">
              © 2024 MindoraMap. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

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
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 flex items-center justify-center p-4">
      {/* Card principal */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Logo Section */}
        <div className="pt-10 pb-6 px-8 flex justify-center">
          <img 
            src={LOGO_URL} 
            alt="MindoraMap" 
            style={{ width: '423px', height: '203px' }}
            className="object-contain"
          />
        </div>

        {/* Formulario */}
        <div className="px-8 pb-10">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Iniciar Sesión
          </h2>

          {/* Error Message */}
          {displayError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
              <AlertCircle size={20} className="shrink-0" />
              <span>{displayError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingresa tu usuario"
                className="
                  w-full px-4 py-3.5 rounded-xl
                  bg-gray-50 border-2 border-gray-100
                  focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100
                  outline-none transition-all duration-200
                  text-gray-900 placeholder:text-gray-400
                "
                autoComplete="username"
                autoFocus
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  className="
                    w-full px-4 py-3.5 pr-12 rounded-xl
                    bg-gray-50 border-2 border-gray-100
                    focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100
                    outline-none transition-all duration-200
                    text-gray-900 placeholder:text-gray-400
                  "
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="
                    absolute right-4 top-1/2 -translate-y-1/2
                    text-gray-400 hover:text-gray-600
                    transition-colors
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
                w-full py-4 px-4 mt-4 rounded-xl
                bg-gradient-to-r from-blue-600 to-indigo-600
                hover:from-blue-700 hover:to-indigo-700
                disabled:from-blue-400 disabled:to-indigo-400
                text-white font-semibold text-base
                shadow-lg shadow-blue-500/30
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
    </div>
  );
};

export default LoginPage;

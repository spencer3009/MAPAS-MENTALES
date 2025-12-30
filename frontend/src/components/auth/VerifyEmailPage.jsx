import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, Mail, ArrowRight } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const VerifyEmailPage = () => {
  const [status, setStatus] = useState('verifying'); // verifying, success, error, expired
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState('');

  useEffect(() => {
    // Obtener token de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Token de verificación no proporcionado');
      return;
    }

    verifyEmail(token);
  }, []);

  const verifyEmail = async (token) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || '¡Tu cuenta ha sido verificada!');
        setUsername(data.username || '');
      } else {
        if (data.detail?.includes('expirado')) {
          setStatus('expired');
        } else {
          setStatus('error');
        }
        setMessage(data.detail || 'Error al verificar el email');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Error de conexión. Intenta nuevamente.');
    }
  };

  const goToLogin = () => {
    window.location.href = '/';
  };

  const goToApp = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className={`px-8 py-10 text-center ${
          status === 'success' 
            ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
            : status === 'verifying'
            ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
            : 'bg-gradient-to-r from-red-500 to-rose-500'
        }`}>
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4">
            {status === 'verifying' && (
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle2 className="w-10 h-10 text-white" />
            )}
            {(status === 'error' || status === 'expired') && (
              <XCircle className="w-10 h-10 text-white" />
            )}
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">
            {status === 'verifying' && 'Verificando tu cuenta...'}
            {status === 'success' && '¡Cuenta verificada!'}
            {status === 'error' && 'Error de verificación'}
            {status === 'expired' && 'Token expirado'}
          </h1>
        </div>

        {/* Body */}
        <div className="px-8 py-8">
          <p className="text-gray-600 text-center mb-6">
            {message}
          </p>

          {status === 'success' && (
            <div className="space-y-3">
              <button
                onClick={goToApp}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                Ir a MindoraMap
                <ArrowRight className="w-5 h-5" />
              </button>
              {username && (
                <p className="text-sm text-gray-500 text-center">
                  Bienvenido/a de vuelta, <strong>{username}</strong>
                </p>
              )}
            </div>
          )}

          {status === 'expired' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-amber-800 text-sm">
                  El enlace de verificación ha expirado. Por favor solicita uno nuevo 
                  desde la aplicación.
                </p>
              </div>
              <button
                onClick={goToLogin}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                <Mail className="w-5 h-5" />
                Ir a iniciar sesión
              </button>
            </div>
          )}

          {status === 'error' && (
            <button
              onClick={goToLogin}
              className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
            >
              Volver al inicio
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-gray-50 border-t text-center">
          <p className="text-xs text-gray-500">
            © 2025 MindoraMap. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;

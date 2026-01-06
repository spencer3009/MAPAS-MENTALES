import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Mail, RefreshCw, Loader2, X, AlertCircle, CheckCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const VerificationRequiredModal = ({ isOpen, onClose, userEmail }) => {
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Countdown timer
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => setCooldownSeconds(cooldownSeconds - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  const formatCooldown = useCallback(() => {
    const minutes = Math.floor(cooldownSeconds / 60);
    const seconds = cooldownSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [cooldownSeconds]);

  const handleResend = async () => {
    if (isResending || cooldownSeconds > 0) return;
    
    setIsResending(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await response.json();

      if (response.status === 429) {
        const match = data.detail?.match(/(\d+):(\d+)/);
        if (match) {
          const minutes = parseInt(match[1]);
          const seconds = parseInt(match[2]);
          setCooldownSeconds(minutes * 60 + seconds);
        }
        setMessage({ type: 'error', text: data.detail });
      } else if (response.ok) {
        setCooldownSeconds(300);
        setMessage({ type: 'success', text: 'Email enviado. Revisa tu bandeja de entrada.' });
      } else {
        setMessage({ type: 'error', text: data.detail || 'Error al enviar' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setIsResending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-8 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
          
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
            <Lock size={32} className="text-white" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">
            🔒 Verificación requerida
          </h2>
          <p className="text-white/90 text-sm">
            Para continuar, primero verifica tu correo electrónico
          </p>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 bg-amber-100 rounded-full p-2.5">
                <Mail size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Email de verificación enviado a:</p>
                <p className="font-medium text-gray-900">{userEmail}</p>
              </div>
            </div>
          </div>

          {/* Message */}
          {message.text && (
            <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {message.text}
            </div>
          )}

          {/* Resend button */}
          <button
            onClick={handleResend}
            disabled={isResending || cooldownSeconds > 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResending ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <RefreshCw size={20} />
            )}
            {cooldownSeconds > 0 ? (
              <span>Espera {formatCooldown()} para reenviar</span>
            ) : (
              <span>Enviar nuevo enlace de verificación</span>
            )}
          </button>

          {/* What you can do */}
          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-sm font-medium text-blue-800 mb-2">
              Mientras tanto, puedes:
            </p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>✓ Navegar por la plataforma</li>
              <li>✓ Explorar las funcionalidades</li>
              <li>✓ Revisar tu configuración</li>
            </ul>
          </div>

          {/* Help text */}
          <p className="mt-4 text-xs text-gray-500 text-center">
            ¿No encuentras el email? Revisa tu carpeta de spam.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
          >
            Cerrar y continuar navegando
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerificationRequiredModal;

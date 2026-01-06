import React, { useState, useEffect, useCallback } from 'react';
import { Mail, X, Loader2, CheckCircle2, RefreshCw, Edit3, AlertCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const EmailVerificationBanner = ({ email, onDismiss, onVerified, onEmailChange }) => {
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState(null);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [resendsRemaining, setResendsRemaining] = useState(5);
  const [errorMessage, setErrorMessage] = useState('');

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

  const handleResendEmail = async () => {
    if (isResending || cooldownSeconds > 0) return;
    
    setIsResending(true);
    setResendStatus(null);
    setErrorMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.status === 429) {
        // Rate limited
        const match = data.detail?.match(/(\d+):(\d+)/);
        if (match) {
          const minutes = parseInt(match[1]);
          const seconds = parseInt(match[2]);
          setCooldownSeconds(minutes * 60 + seconds);
        } else if (data.detail?.includes('límite de 5')) {
          setCooldownSeconds(86400);
        }
        setErrorMessage(data.detail);
        setResendStatus('error');
      } else if (response.ok) {
        setResendStatus('success');
        setCooldownSeconds(300); // 5 min cooldown
        if (data.resends_remaining !== undefined) {
          setResendsRemaining(data.resends_remaining);
        }
        setTimeout(() => setResendStatus(null), 5000);
      } else {
        setResendStatus('error');
        setErrorMessage(data.detail || 'Error al enviar');
      }
    } catch (error) {
      setResendStatus('error');
      setErrorMessage('Error de conexión');
    } finally {
      setIsResending(false);
    }
  };

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    if (!newEmail.trim() || isResending) return;
    
    setIsResending(true);
    setErrorMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/auth/update-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ new_email: newEmail.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setResendStatus('success');
        setShowChangeEmail(false);
        setNewEmail('');
        setCooldownSeconds(300);
        if (onEmailChange) onEmailChange(newEmail.trim());
      } else {
        setErrorMessage(data.detail || 'Error al actualizar email');
        setResendStatus('error');
      }
    } catch (error) {
      setErrorMessage('Error de conexión');
      setResendStatus('error');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div 
      className="border-b shadow-sm"
      style={{ 
        backgroundColor: '#FEF3C7', // amber-100 - suave y amigable
        borderColor: '#FCD34D' // amber-300 - borde sutil
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Main message */}
          <div className="flex items-center gap-3">
            <div 
              className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#FCD34D' }} // amber-300
            >
              <Mail className="w-5 h-5" style={{ color: '#92400E' }} /> {/* amber-800 */}
            </div>
            
            <div>
              <p 
                className="text-sm sm:text-base font-semibold"
                style={{ color: '#92400E' }} // amber-800 - excelente contraste
              >
                ✉️ Verifica tu correo para activar tu cuenta
              </p>
              <p 
                className="text-xs sm:text-sm"
                style={{ color: '#B45309' }} // amber-700
              >
                Hemos enviado un enlace a: <span className="font-medium">{email}</span>
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {showChangeEmail ? (
              <form onSubmit={handleChangeEmail} className="flex items-center gap-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="nuevo@email.com"
                  className="px-3 py-1.5 rounded-lg text-sm text-gray-900 w-44 sm:w-48 border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                  disabled={isResending}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isResending || !newEmail.trim()}
                  className="p-1.5 rounded-lg transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#FCD34D', color: '#92400E' }}
                >
                  {isResending ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowChangeEmail(false); setNewEmail(''); setErrorMessage(''); }}
                  className="p-1.5 rounded-lg transition-colors hover:bg-amber-200"
                  style={{ color: '#92400E' }}
                >
                  <X size={18} />
                </button>
              </form>
            ) : (
              <>
                {/* Resend button */}
                {resendStatus === 'success' ? (
                  <span 
                    className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: '#D1FAE5', color: '#065F46' }} // green tones
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    ¡Enviado!
                  </span>
                ) : (
                  <button
                    onClick={handleResendEmail}
                    disabled={isResending || cooldownSeconds > 0}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-200"
                    style={{ 
                      backgroundColor: '#FCD34D', // amber-300
                      color: '#92400E' // amber-800
                    }}
                  >
                    {isResending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    {cooldownSeconds > 0 ? (
                      <span>Espera {formatCooldown()}</span>
                    ) : (
                      <span className="hidden sm:inline">Reenviar verificación</span>
                    )}
                  </button>
                )}

                {/* Change email button */}
                <button
                  onClick={() => setShowChangeEmail(true)}
                  disabled={isResending}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 hover:bg-gray-50 border"
                  style={{ 
                    color: '#B45309', // amber-700
                    borderColor: '#FCD34D' // amber-300
                  }}
                >
                  <Edit3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Cambiar correo</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Error/status messages */}
        {errorMessage && (
          <div 
            className="mt-2 flex items-center gap-2 text-sm"
            style={{ color: '#991B1B' }} // red-800
          >
            <AlertCircle size={14} />
            {errorMessage}
          </div>
        )}

        {/* Remaining resends */}
        {resendsRemaining < 5 && (
          <p 
            className="text-xs mt-1 text-center sm:text-left"
            style={{ color: '#B45309' }} // amber-700
          >
            Reenvíos restantes hoy: {resendsRemaining}
          </p>
        )}
      </div>
    </div>
  );
};

export default EmailVerificationBanner;

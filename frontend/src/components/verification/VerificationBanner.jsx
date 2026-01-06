import React, { useState } from 'react';
import { Mail, RefreshCw, Edit3, X, Check, Loader2, AlertCircle } from 'lucide-react';
import { useVerification } from '../../contexts/VerificationContext';

export function VerificationBanner() {
  const {
    isVerified,
    userEmail,
    isLoading,
    cooldownSeconds,
    formatCooldown,
    resendVerification,
    updateEmail,
    resendsRemaining
  } = useVerification();

  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  // Don't show if verified
  if (isVerified) return null;

  const handleResend = async () => {
    setMessage({ type: '', text: '' });
    const result = await resendVerification();
    
    if (result.success) {
      setMessage({ type: 'success', text: '✓ Email enviado correctamente' });
    } else {
      setMessage({ type: 'error', text: result.error });
    }
    
    // Clear message after 5 seconds
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    
    setMessage({ type: '', text: '' });
    const result = await updateEmail(newEmail.trim());
    
    if (result.success) {
      setMessage({ type: 'success', text: '✓ Email actualizado y verificación enviada' });
      setShowChangeEmail(false);
      setNewEmail('');
    } else {
      setMessage({ type: 'error', text: result.error });
    }
    
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  return (
    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Main message */}
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 bg-white/20 rounded-full p-2">
              <Mail size={20} />
            </div>
            <div>
              <p className="font-semibold text-sm sm:text-base">
                ✉️ Verifica tu correo para activar tu cuenta
              </p>
              <p className="text-xs sm:text-sm text-white/90">
                Hemos enviado un enlace a: <span className="font-medium">{userEmail}</span>
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Change email form */}
            {showChangeEmail ? (
              <form onSubmit={handleChangeEmail} className="flex items-center gap-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="nuevo@email.com"
                  className="px-3 py-1.5 rounded-lg text-sm text-gray-900 w-48 focus:outline-none focus:ring-2 focus:ring-white"
                  disabled={isLoading}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isLoading || !newEmail.trim()}
                  className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowChangeEmail(false); setNewEmail(''); }}
                  className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </form>
            ) : (
              <>
                {/* Resend button */}
                <button
                  onClick={handleResend}
                  disabled={isLoading || cooldownSeconds > 0}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                  {cooldownSeconds > 0 ? (
                    <span>Espera {formatCooldown()}</span>
                  ) : (
                    <span className="hidden sm:inline">Reenviar verificación</span>
                  )}
                </button>

                {/* Change email button */}
                <button
                  onClick={() => setShowChangeEmail(true)}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white text-orange-600 hover:bg-white/90 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Edit3 size={16} />
                  <span className="hidden sm:inline">Cambiar correo</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Status messages */}
        {message.text && (
          <div className={`mt-2 text-sm flex items-center gap-2 ${message.type === 'success' ? 'text-white' : 'text-red-100'}`}>
            {message.type === 'error' && <AlertCircle size={14} />}
            {message.text}
          </div>
        )}

        {/* Remaining resends info */}
        {resendsRemaining < 5 && (
          <p className="text-xs text-white/70 mt-1">
            Reenvíos restantes hoy: {resendsRemaining}
          </p>
        )}
      </div>
    </div>
  );
}

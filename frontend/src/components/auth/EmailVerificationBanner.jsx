import React, { useState } from 'react';
import { Mail, X, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const EmailVerificationBanner = ({ email, onDismiss, onVerified }) => {
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState(null); // null, 'success', 'error'
  const [isDismissed, setIsDismissed] = useState(false);

  const handleResendEmail = async () => {
    if (isResending) return;
    
    setIsResending(true);
    setResendStatus(null);

    try {
      const response = await fetch(`${API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setResendStatus('success');
        setTimeout(() => setResendStatus(null), 5000);
      } else {
        setResendStatus('error');
      }
    } catch (error) {
      setResendStatus('error');
    } finally {
      setIsResending(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) onDismiss();
  };

  if (isDismissed) return null;

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <Mail className="w-5 h-5 text-amber-600" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800">
                Verifica tu correo electrónico
              </p>
              <p className="text-xs text-amber-600 truncate">
                Te enviamos un enlace a <strong>{email}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {resendStatus === 'success' ? (
              <span className="flex items-center gap-1 text-green-600 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                ¡Enviado!
              </span>
            ) : (
              <button
                onClick={handleResendEmail}
                disabled={isResending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded-lg transition-colors disabled:opacity-50"
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Reenviar
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleDismiss}
              className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {resendStatus === 'error' && (
          <p className="mt-2 text-xs text-red-600">
            Error al enviar el correo. Intenta nuevamente.
          </p>
        )}
      </div>
    </div>
  );
};

export default EmailVerificationBanner;

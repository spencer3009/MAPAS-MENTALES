import React, { useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * AuthCallback - Procesa el session_id de Google OAuth
 * REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
 */
const AuthCallback = ({ onSuccess, onError }) => {
  const { processGoogleSession } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevenir doble procesamiento (especialmente en StrictMode)
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      // Obtener session_id del hash de la URL
      const hash = window.location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);
      
      if (!sessionIdMatch) {
        console.error('No session_id found in URL');
        if (onError) onError('No se encontró la sesión de Google');
        return;
      }

      const sessionId = sessionIdMatch[1];
      
      try {
        const result = await processGoogleSession(sessionId);
        
        if (result.success) {
          // Limpiar el hash de la URL
          window.history.replaceState(null, '', window.location.pathname);
          if (onSuccess) onSuccess(result.user);
        } else {
          if (onError) onError(result.error || 'Error al procesar la sesión');
        }
      } catch (error) {
        console.error('Error processing Google session:', error);
        if (onError) onError('Error al procesar la autenticación');
      }
    };

    processSession();
  }, [processGoogleSession, onSuccess, onError]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Procesando autenticación...
        </h2>
        <p className="text-gray-500">
          Por favor espera un momento
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;

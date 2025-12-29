import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, XCircle, AlertCircle, Crown, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const PayPalCallback = ({ type, onSuccess, onError, onClose }) => {
  const { token } = useAuth();
  const [status, setStatus] = useState('processing'); // 'processing', 'success', 'error', 'cancelled'
  const [message, setMessage] = useState('');
  const [planName, setPlanName] = useState('');

  useEffect(() => {
    const processCallback = async () => {
      // Obtener parámetros de la URL
      const hash = window.location.hash;
      const urlParams = new URLSearchParams(hash.replace('#subscription-success', '').replace('#subscription-cancel', '').replace('?', ''));
      const subscriptionId = urlParams.get('subscription_id') || urlParams.get('ba_token');
      
      // También buscar en query params normales
      const searchParams = new URLSearchParams(window.location.search);
      const subIdFromSearch = searchParams.get('subscription_id') || searchParams.get('ba_token');
      
      const finalSubscriptionId = subscriptionId || subIdFromSearch;

      console.log('PayPal callback - type:', type);
      console.log('Subscription ID:', finalSubscriptionId);
      console.log('Hash:', hash);

      if (type === 'cancel') {
        setStatus('cancelled');
        setMessage('Has cancelado el proceso de suscripción. Puedes intentarlo de nuevo cuando quieras.');
        return;
      }

      // Tipo success - verificar y activar la suscripción
      if (!token) {
        setStatus('error');
        setMessage('No se encontró sesión activa. Por favor inicia sesión e intenta de nuevo.');
        return;
      }

      try {
        // Llamar al endpoint para confirmar la suscripción
        const response = await fetch(`${API_URL}/api/paypal/confirm-subscription`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            subscription_id: finalSubscriptionId 
          })
        });

        const data = await response.json();
        console.log('Confirm subscription response:', data);

        if (response.ok && data.success) {
          setStatus('success');
          setPlanName(data.plan_name || 'Premium');
          setMessage(`¡Tu suscripción al plan ${data.plan_name || 'Premium'} está activa!`);
          if (onSuccess) onSuccess(data);
        } else {
          setStatus('error');
          setMessage(data.detail || 'Error al confirmar la suscripción');
          if (onError) onError(data.detail);
        }
      } catch (err) {
        console.error('Error confirming subscription:', err);
        setStatus('error');
        setMessage('Error de conexión al confirmar la suscripción');
        if (onError) onError(err.message);
      }
    };

    processCallback();
  }, [type, token, onSuccess, onError]);

  const handleContinue = () => {
    // Limpiar la URL y cerrar
    window.history.replaceState({}, document.title, window.location.pathname);
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header con color según estado */}
        <div className={`px-6 py-8 text-center ${
          status === 'processing' ? 'bg-gradient-to-r from-blue-600 to-indigo-600' :
          status === 'success' ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
          status === 'cancelled' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
          'bg-gradient-to-r from-red-500 to-rose-600'
        }`}>
          <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl mx-auto mb-4 flex items-center justify-center">
            {status === 'processing' && <Loader2 size={32} className="text-white animate-spin" />}
            {status === 'success' && <CheckCircle2 size={32} className="text-white" />}
            {status === 'cancelled' && <AlertCircle size={32} className="text-white" />}
            {status === 'error' && <XCircle size={32} className="text-white" />}
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">
            {status === 'processing' && 'Procesando tu suscripción...'}
            {status === 'success' && '¡Suscripción Activada!'}
            {status === 'cancelled' && 'Suscripción Cancelada'}
            {status === 'error' && 'Error en la Suscripción'}
          </h2>
        </div>

        {/* Contenido */}
        <div className="p-6 text-center">
          {status === 'processing' && (
            <p className="text-gray-600">
              Por favor espera mientras confirmamos tu pago con PayPal...
            </p>
          )}

          {status === 'success' && (
            <>
              <div className="flex items-center justify-center gap-2 text-green-600 mb-4">
                <Crown size={20} />
                <span className="font-semibold">Plan {planName}</span>
                <Sparkles size={16} />
              </div>
              <p className="text-gray-600 mb-6">{message}</p>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <p className="text-green-800 text-sm">
                  Tu cuenta ha sido actualizada. Ahora tienes acceso a todas las funciones premium.
                </p>
              </div>
              <button
                onClick={handleContinue}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all"
              >
                Comenzar a usar MindoraMap
              </button>
            </>
          )}

          {status === 'cancelled' && (
            <>
              <p className="text-gray-600 mb-6">{message}</p>
              <button
                onClick={handleContinue}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
              >
                Volver a MindoraMap
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <p className="text-gray-600 mb-6">{message}</p>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <p className="text-red-800 text-sm">
                  Si el problema persiste, contacta a soporte.
                </p>
              </div>
              <button
                onClick={handleContinue}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
              >
                Volver a MindoraMap
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PayPalCallback;

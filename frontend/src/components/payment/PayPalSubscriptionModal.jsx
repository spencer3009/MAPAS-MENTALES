import React, { useState, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { 
  X, 
  Check, 
  Loader2, 
  Shield, 
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Crown,
  Sparkles
} from 'lucide-react';

// Use relative URLs for production compatibility
const API_URL = '';

// Planes disponibles
const PLANS = {
  personal: {
    id: 'personal',
    name: 'Personal',
    price: '$3',
    period: '/mes',
    description: 'Para creadores y emprendedores',
    features: [
      'Mapas ilimitados',
      'Nodos ilimitados',
      'Exportación PDF y Word',
      'Guardado en la nube',
      'Soporte prioritario'
    ],
    color: 'blue',
    popular: false
  },
  team: {
    id: 'team',
    name: 'Team',
    price: '$8',
    period: '/mes',
    description: 'Para equipos pequeños',
    features: [
      'Todo de Personal',
      'Hasta 5 miembros',
      'Colaboración en tiempo real',
      'Carpetas compartidas',
      'Historial de versiones'
    ],
    color: 'indigo',
    popular: true
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$24',
    period: '/mes',
    description: 'Para organizaciones grandes',
    features: [
      'Todo de Team',
      'Miembros ilimitados',
      'SSO y seguridad avanzada',
      'API access',
      'Soporte dedicado 24/7'
    ],
    color: 'violet',
    popular: false
  }
};

const PayPalSubscriptionModal = ({ 
  isOpen, 
  onClose, 
  selectedPlan, 
  onSuccess,
  token 
}) => {
  const [paypalClientId, setPaypalClientId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState('select'); // 'select', 'payment', 'success', 'error'
  const [currentPlan, setCurrentPlan] = useState(selectedPlan || 'personal');

  // Obtener el Client ID de PayPal
  useEffect(() => {
    const fetchClientId = async () => {
      try {
        const response = await fetch(`${API_URL}/api/paypal/client-id`);
        if (response.ok) {
          const data = await response.json();
          setPaypalClientId(data.client_id);
        } else {
          setError('PayPal no está configurado correctamente');
        }
      } catch (err) {
        setError('Error conectando con el servidor');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchClientId();
    }
  }, [isOpen]);

  const handleCreateSubscription = async () => {
    setProcessing(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/paypal/create-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan_id: currentPlan })
      });

      const data = await response.json();

      if (response.ok && data.approval_url) {
        // Redirigir a PayPal para aprobación
        window.location.href = data.approval_url;
      } else {
        setError(data.detail || 'Error creando la suscripción');
        setStep('error');
      }
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.');
      setStep('error');
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  const plan = PLANS[currentPlan];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className={`bg-gradient-to-r from-${plan?.color || 'blue'}-600 to-${plan?.color || 'blue'}-700 px-6 py-5 text-white relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Crown size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Actualizar a {plan?.name}</h2>
              <p className="text-white/80 text-sm">Suscripción mensual con PayPal</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-500">Cargando PayPal...</p>
            </div>
          ) : error && step === 'error' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <AlertCircle size={32} className="text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={() => { setError(null); setStep('select'); }}
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Intentar de nuevo
              </button>
            </div>
          ) : (
            <>
              {/* Plan selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Selecciona tu plan
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {Object.values(PLANS).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setCurrentPlan(p.id)}
                      className={`relative p-3 rounded-xl border-2 transition-all ${
                        currentPlan === p.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {p.popular && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full">
                          Popular
                        </span>
                      )}
                      <div className="text-center">
                        <p className="font-semibold text-gray-900">{p.name}</p>
                        <p className="text-lg font-bold text-blue-600">{p.price}</p>
                        <p className="text-xs text-gray-500">{p.period}</p>
                      </div>
                      {currentPlan === p.id && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Plan details */}
              <div className="p-4 bg-gray-50 rounded-xl mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">
                  Plan {plan?.name} incluye:
                </h4>
                <ul className="space-y-2">
                  {plan?.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* PayPal button */}
              <button
                onClick={handleCreateSubscription}
                disabled={processing || !paypalClientId}
                className="w-full py-4 bg-[#0070ba] hover:bg-[#003087] disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-3"
              >
                {processing ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.77.77 0 0 1 .757-.639h6.528c2.166 0 3.726.5 4.64 1.486.877.945 1.181 2.227.902 3.81-.302 1.715-.94 3.045-1.9 3.955-.938.887-2.273 1.397-3.965 1.516l-.084.006H9.67l-.896 5.207a.641.641 0 0 1-.632.54H7.076v1.736Zm12.243-13.93c-.022.126-.046.255-.073.387-.893 4.293-3.95 5.779-7.857 5.779H9.743l-.976 6.185h2.53a.564.564 0 0 0 .557-.474l.023-.117.44-2.795.028-.154a.564.564 0 0 1 .557-.474h.35c2.268 0 4.042-.922 4.562-3.588.217-1.115.105-2.046-.47-2.7l-.025-.049Z"/>
                    </svg>
                    Pagar con PayPal
                  </>
                )}
              </button>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Shield size={14} />
                  <span>Pago seguro</span>
                </div>
                <div className="flex items-center gap-1">
                  <CreditCard size={14} />
                  <span>Cancela cuando quieras</span>
                </div>
              </div>

              {/* Info */}
              <p className="text-center text-xs text-gray-400 mt-4">
                Al suscribirte, aceptas nuestros términos de servicio. 
                La suscripción se renueva automáticamente cada mes.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Componente para mostrar cuando el usuario regresa de PayPal
export const PayPalReturnHandler = ({ token, onSuccess, onError }) => {
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const executeSubscription = async () => {
      // Obtener token de la URL
      const hash = window.location.hash;
      const urlParams = new URLSearchParams(hash.split('?')[1] || '');
      const paypalToken = urlParams.get('token') || new URLSearchParams(window.location.search).get('token');

      if (!paypalToken) {
        setStatus('error');
        setMessage('No se encontró el token de PayPal');
        if (onError) onError('Token not found');
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/paypal/execute-subscription`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ token: paypalToken })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setStatus('success');
          setMessage(`¡Bienvenido al plan ${data.plan_id}!`);
          if (onSuccess) onSuccess(data);
        } else {
          setStatus('error');
          setMessage(data.detail || 'Error procesando el pago');
          if (onError) onError(data.detail);
        }
      } catch (err) {
        setStatus('error');
        setMessage('Error de conexión');
        if (onError) onError(err.message);
      }
    };

    executeSubscription();
  }, [token, onSuccess, onError]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Procesando pago...</h3>
            <p className="text-gray-600">Por favor espera mientras confirmamos tu suscripción.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <CheckCircle2 size={40} className="text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">¡Pago exitoso!</h3>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="flex items-center justify-center gap-2 text-green-600 mb-6">
              <Sparkles size={20} />
              <span className="font-medium">Tu cuenta ha sido actualizada</span>
            </div>
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
            >
              Comenzar a usar MindoraMap
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <AlertCircle size={40} className="text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Error en el pago</h3>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
            >
              Volver al inicio
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PayPalSubscriptionModal;

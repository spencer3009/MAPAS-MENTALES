import React, { useState, useEffect } from 'react';
import { X, Crown, Zap, Infinity, CheckCircle2, Sparkles, Loader2, CreditCard, Shield } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const UpgradeModal = ({ isOpen, onClose, limitType = 'active', onUpgrade, token, initialPlan }) => {
  const [upgradePlan, setUpgradePlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(initialPlan || 'personal');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  // Si hay un plan inicial, ir directamente a la vista de pago
  useEffect(() => {
    if (isOpen && initialPlan) {
      setSelectedPlan(initialPlan);
      setShowPayment(true);
    }
  }, [isOpen, initialPlan]);

  // Reset cuando se cierra
  useEffect(() => {
    if (!isOpen) {
      setShowPayment(false);
      setError(null);
      setSelectedPlan(initialPlan || 'personal');
    }
  }, [isOpen, initialPlan]);

  // Planes disponibles
  const PLANS = {
    personal: {
      id: 'personal',
      name: 'Personal',
      price: '$3',
      period: '/mes',
      description: 'Para creadores',
      popular: false
    },
    team: {
      id: 'team',
      name: 'Team',
      price: '$8',
      period: '/mes',
      description: 'Equipos pequeños',
      popular: true
    },
    enterprise: {
      id: 'enterprise',
      name: 'Enterprise',
      price: '$24',
      period: '/mes',
      description: 'Organizaciones',
      popular: false
    }
  };

  // Cargar plan de upgrade desde el backend (source of truth)
  useEffect(() => {
    if (isOpen) {
      const loadPlan = async () => {
        try {
          const response = await fetch(`${API_URL}/api/plans`);
          if (response.ok) {
            const data = await response.json();
            setUpgradePlan(data.upgrade_plan);
          }
        } catch (error) {
          console.error('Error loading upgrade plan:', error);
          // Fallback en caso de error
          setUpgradePlan({
            name: 'Personal',
            price: 3,
            price_display: '$3',
            period: '/mes',
            features: [
              'Mapas ilimitados',
              'Nodos ilimitados',
              'Exportación PDF + PNG',
              'Uso comercial incluido'
            ]
          });
        }
        setLoading(false);
      };
      loadPlan();
    }
  }, [isOpen]);

  // Crear suscripción con PayPal
  const handlePayWithPayPal = async () => {
    setProcessing(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/paypal/create-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan_id: selectedPlan })
      });

      const data = await response.json();
      console.log('PayPal response:', data);

      if (response.ok && data.approval_url) {
        // Redirigir a PayPal para aprobación
        window.location.href = data.approval_url;
      } else {
        console.error('PayPal error:', data);
        setError(data.detail || 'Error creando la suscripción');
      }
    } catch (err) {
      console.error('PayPal connection error:', err);
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  const isHistoricLimit = limitType === 'total';
  const isNodeLimit = limitType === 'nodes';

  const getTitle = () => {
    if (showPayment) return 'Elige tu plan';
    if (isHistoricLimit) return '¡Has probado bien la plataforma!';
    if (isNodeLimit) return '¡Necesitas más nodos!';
    return '¡Necesitas más espacio!';
  };

  const getSubtitle = () => {
    if (showPayment) return 'Suscripción mensual con PayPal';
    if (isHistoricLimit) return 'Has alcanzado el límite de mapas del plan gratuito';
    if (isNodeLimit) return 'Has alcanzado el límite de nodos por mapa';
    return 'Has alcanzado el límite de mapas activos';
  };

  const getMessage = () => {
    if (isHistoricLimit) {
      return (
        <>
          <strong>Tu cuenta gratuita ha creado el máximo de 5 mapas.</strong>
          <br />
          Este límite existe para que puedas probar la plataforma. 
          Para seguir creando sin límites, actualiza al Plan Personal.
        </>
      );
    }
    if (isNodeLimit) {
      return (
        <>
          <strong>Has alcanzado el límite de 50 nodos por mapa.</strong>
          <br />
          El plan gratuito permite hasta 50 nodos. Actualiza al Plan Personal 
          para tener nodos ilimitados.
        </>
      );
    }
    return (
      <>
        <strong>Ya tienes 3 mapas activos.</strong>
        <br />
        Puedes eliminar alguno para crear espacio, o actualizar al Plan Personal 
        para tener mapas ilimitados.
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header con gradiente */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-8 text-center relative overflow-hidden">
          {/* Efectos decorativos */}
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-4 left-4 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute bottom-4 right-4 w-32 h-32 bg-purple-400/20 rounded-full blur-3xl" />
          </div>
          
          {/* Botón cerrar */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Botón volver */}
          {showPayment && (
            <button 
              onClick={() => setShowPayment(false)}
              className="absolute top-4 left-4 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white text-sm px-3"
            >
              ← Volver
            </button>
          )}
          
          {/* Icono */}
          <div className="relative inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4">
            <Crown className="w-8 h-8 text-yellow-300" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">
            {getTitle()}
          </h2>
          <p className="text-blue-100 text-sm">
            {getSubtitle()}
          </p>
        </div>
        
        {/* Contenido */}
        <div className="px-6 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : showPayment ? (
            /* Vista de pago con PayPal */
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Selector de planes */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                {Object.values(PLANS).map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`relative p-3 rounded-xl border-2 transition-all ${
                      selectedPlan === plan.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full whitespace-nowrap">
                        Popular
                      </span>
                    )}
                    <p className="font-semibold text-gray-900 text-sm">{plan.name}</p>
                    <p className="text-lg font-bold text-blue-600">{plan.price}</p>
                    <p className="text-[10px] text-gray-500">{plan.period}</p>
                    {selectedPlan === plan.id && (
                      <div className="absolute top-1 right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <CheckCircle2 size={10} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Botón de PayPal */}
              <button
                onClick={handlePayWithPayPal}
                disabled={processing}
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

              <p className="text-center text-xs text-gray-400 mt-4">
                La suscripción se renueva automáticamente cada mes.
              </p>
            </>
          ) : (
            <>
              {/* Mensaje principal */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <p className="text-amber-800 text-sm">
                  {getMessage()}
                </p>
              </div>
              
              {/* Beneficios del Plan Personal */}
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                Con el Plan {upgradePlan?.name || 'Personal'} obtienes:
              </h3>
              
              <ul className="space-y-3 mb-6">
                {(upgradePlan?.features || []).slice(0, 4).map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      {index === 0 || index === 1 ? (
                        <Infinity className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      )}
                    </div>
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              
              {/* Precio - Desde el backend */}
              <div className="text-center mb-6">
                <div className="inline-block bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 mb-2">
                  <span className="text-xs text-blue-600 font-medium">🚀 Precio Early Access</span>
                </div>
                <div className="inline-flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gray-900">
                    {upgradePlan?.price_display || '$3'}
                  </span>
                  <span className="text-gray-500">{upgradePlan?.period || '/mes'}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Cancela cuando quieras</p>
              </div>
              
              {/* Botones */}
              <div className="space-y-3">
                <button
                  onClick={() => setShowPayment(true)}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                >
                  <Zap className="w-5 h-5" />
                  Actualizar a {upgradePlan?.name || 'Personal'}
                </button>
                
                {!isHistoricLimit && !isNodeLimit && (
                  <button
                    onClick={onClose}
                    className="w-full py-3 px-4 text-gray-600 hover:text-gray-800 font-medium text-sm transition-colors"
                  >
                    Eliminar un mapa para hacer espacio
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;

import React, { useState, useEffect } from 'react';
import { X, Crown, Zap, Infinity, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const UpgradeModal = ({ isOpen, onClose, limitType = 'active', onUpgrade }) => {
  const [upgradePlan, setUpgradePlan] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (!isOpen) return null;

  const isHistoricLimit = limitType === 'total';
  const isNodeLimit = limitType === 'nodes';

  const getTitle = () => {
    if (isHistoricLimit) return '¡Has probado bien la plataforma!';
    if (isNodeLimit) return '¡Necesitas más nodos!';
    return '¡Necesitas más espacio!';
  };

  const getSubtitle = () => {
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
                  onClick={onUpgrade}
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

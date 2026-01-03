import React, { useState } from 'react';
import { X, ArrowRight } from 'lucide-react';

// Ícono personalizado para MindFlow (horizontal)
const MindFlowIcon = ({ className }) => (
  <svg 
    viewBox="0 0 48 48" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Nodo izquierdo (padre) */}
    <rect x="4" y="16" width="12" height="12" rx="2" />
    {/* Nodo superior derecho (hijo 1) */}
    <rect x="32" y="6" width="12" height="12" rx="2" />
    {/* Nodo inferior derecho (hijo 2) */}
    <rect x="32" y="26" width="12" height="12" rx="2" />
    {/* Conector horizontal desde padre */}
    <path d="M16 22 H24" />
    {/* Línea vertical de ramificación */}
    <path d="M24 12 V32" />
    {/* Conector a hijo superior */}
    <path d="M24 12 H32" />
    {/* Conector a hijo inferior */}
    <path d="M24 32 H32" />
  </svg>
);

// Ícono personalizado para MindTree (organigrama vertical)
const MindTreeIcon = ({ className }) => (
  <svg 
    viewBox="0 0 48 48" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Nodo superior (padre/CEO) */}
    <rect x="16" y="4" width="16" height="10" rx="2" />
    {/* Nodo inferior izquierdo */}
    <rect x="4" y="32" width="12" height="10" rx="2" />
    {/* Nodo inferior centro */}
    <rect x="18" y="32" width="12" height="10" rx="2" />
    {/* Nodo inferior derecho */}
    <rect x="32" y="32" width="12" height="10" rx="2" />
    {/* Línea vertical hacia abajo desde padre */}
    <path d="M24 14 V22" />
    {/* Línea horizontal de distribución */}
    <path d="M10 22 H38" />
    {/* Conectores verticales hacia hijos */}
    <path d="M10 22 V32" />
    <path d="M24 22 V32" />
    <path d="M38 22 V32" />
  </svg>
);

// Ícono personalizado para MindHybrid (mixto horizontal + vertical)
const MindHybridIcon = ({ className }) => (
  <svg 
    viewBox="0 0 48 48" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Nodo central (padre) */}
    <rect x="4" y="16" width="12" height="12" rx="2" />
    
    {/* Hijos HORIZONTALES (a la derecha) */}
    <rect x="32" y="8" width="10" height="8" rx="1.5" />
    <rect x="32" y="20" width="10" height="8" rx="1.5" />
    
    {/* Hijos VERTICALES (abajo) */}
    <rect x="2" y="38" width="10" height="8" rx="1.5" />
    <rect x="14" y="38" width="10" height="8" rx="1.5" />
    
    {/* Conector horizontal */}
    <path d="M16 22 H24" />
    <path d="M24 12 V24" />
    <path d="M24 12 H32" />
    <path d="M24 24 H32" />
    
    {/* Conector vertical */}
    <path d="M10 28 V34" />
    <path d="M7 34 H19" />
    <path d="M7 34 V38" />
    <path d="M19 34 V38" />
  </svg>
);

// Ícono personalizado para MindAxis (eje central balanceado)
const MindAxisIcon = ({ className }) => (
  <svg 
    viewBox="0 0 48 48" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Nodo central */}
    <rect x="18" y="18" width="12" height="12" rx="2" />
    
    {/* Ramas izquierda */}
    <rect x="2" y="10" width="8" height="6" rx="1.5" />
    <rect x="2" y="32" width="8" height="6" rx="1.5" />
    
    {/* Ramas derecha */}
    <rect x="38" y="10" width="8" height="6" rx="1.5" />
    <rect x="38" y="32" width="8" height="6" rx="1.5" />
    
    {/* Conectores izquierda */}
    <path d="M18 24 H14" />
    <path d="M14 13 V35" />
    <path d="M10 13 H14" />
    <path d="M10 35 H14" />
    
    {/* Conectores derecha */}
    <path d="M30 24 H34" />
    <path d="M34 13 V35" />
    <path d="M34 13 H38" />
    <path d="M34 35 H38" />
  </svg>
);

// Ícono personalizado para MindOrbit (mapa radial)
const MindOrbitIcon = ({ className }) => (
  <svg 
    viewBox="0 0 48 48" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Nodo central (círculo) */}
    <circle cx="24" cy="24" r="6" />
    {/* Nodos orbitales */}
    <circle cx="24" cy="6" r="4" />
    <circle cx="40" cy="16" r="4" />
    <circle cx="40" cy="32" r="4" />
    <circle cx="24" cy="42" r="4" />
    <circle cx="8" cy="32" r="4" />
    <circle cx="8" cy="16" r="4" />
    {/* Conectores radiales */}
    <path d="M24 18 L24 10" />
    <path d="M29 20 L36 14" />
    <path d="M29 28 L36 34" />
    <path d="M24 30 L24 38" />
    <path d="M19 28 L12 34" />
    <path d="M19 20 L12 14" />
  </svg>
);

const LayoutTemplateSelector = ({ isOpen, onSelect, onClose, initialLayout = null }) => {
  const [selectedLayout, setSelectedLayout] = useState(null);

  // Pre-seleccionar layout cuando se abre el modal con un initialLayout
  React.useEffect(() => {
    if (isOpen && initialLayout) {
      setSelectedLayout(initialLayout);
    } else if (!isOpen) {
      // Reset cuando se cierra el modal
      setSelectedLayout(null);
    }
  }, [isOpen, initialLayout]);

  if (!isOpen) return null;

  const handleContinue = () => {
    if (selectedLayout) {
      onSelect(selectedLayout);
    }
  };

  const layouts = [
    {
      id: 'mindflow',
      name: 'MindFlow',
      description: 'Flujo horizontal libre y expansivo. El mapa crece hacia los lados.',
      icon: MindFlowIcon,
      color: 'blue',
      bgGradient: 'from-blue-500 to-blue-600',
      borderColor: 'border-blue-500',
      hoverBg: 'hover:bg-blue-50',
      selectedBg: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      id: 'mindtree',
      name: 'MindTree',
      description: 'Flujo vertical tipo organigrama. Los nodos se organizan de arriba hacia abajo.',
      icon: MindTreeIcon,
      color: 'emerald',
      bgGradient: 'from-emerald-500 to-emerald-600',
      borderColor: 'border-emerald-500',
      hoverBg: 'hover:bg-emerald-50',
      selectedBg: 'bg-emerald-50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600'
    },
    {
      id: 'mindhybrid',
      name: 'MindHybrid',
      description: 'Combinación flexible. Crea nodos hacia la derecha o hacia abajo según necesites.',
      icon: MindHybridIcon,
      color: 'purple',
      bgGradient: 'from-purple-500 to-purple-600',
      borderColor: 'border-purple-500',
      hoverBg: 'hover:bg-purple-50',
      selectedBg: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    {
      id: 'mindaxis',
      name: 'MindAxis',
      subtitle: '(Eje Central)',
      description: 'Mapa centrado. Las ideas se expanden equilibradamente hacia ambos lados.',
      icon: MindAxisIcon,
      color: 'teal',
      bgGradient: 'from-teal-500 to-cyan-500',
      borderColor: 'border-teal-500',
      hoverBg: 'hover:bg-teal-50',
      selectedBg: 'bg-teal-50',
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600'
    },
    {
      id: 'mindorbit',
      name: 'MindOrbit',
      subtitle: '(Mapa Radial)',
      description: 'Mapa radial. Las ideas orbitan alrededor del tema central en 360°.',
      icon: MindOrbitIcon,
      color: 'orange',
      bgGradient: 'from-orange-500 to-amber-500',
      borderColor: 'border-orange-500',
      hoverBg: 'hover:bg-orange-50',
      selectedBg: 'bg-orange-50',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header - Fixed */}
        <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Elige tu plantilla
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Selecciona cómo quieres organizar tu mapa mental
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {layouts.map((layout) => {
              const Icon = layout.icon;
              const isSelected = selectedLayout === layout.id;
              
              return (
                <button
                  key={layout.id}
                  onClick={() => setSelectedLayout(layout.id)}
                  className={`
                    relative p-5 rounded-xl border-2 transition-all duration-200
                    text-left group
                    ${isSelected 
                      ? `${layout.borderColor} ${layout.selectedBg} ring-2 ring-offset-2 ring-${layout.color}-500` 
                      : `border-gray-200 ${layout.hoverBg} hover:border-gray-300`
                    }
                  `}
                >
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className={`absolute top-3 right-3 w-6 h-6 rounded-full bg-gradient-to-r ${layout.bgGradient} flex items-center justify-center`}>
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}

                  {/* Icon */}
                  <div className={`
                    w-14 h-14 rounded-xl ${layout.iconBg} ${layout.iconColor}
                    flex items-center justify-center mb-3
                    group-hover:scale-105 transition-transform duration-200
                  `}>
                    <Icon className="w-8 h-8" />
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-semibold text-gray-900 mb-1">
                    {layout.name}
                    {layout.subtitle && (
                      <span className="text-xs font-normal text-gray-500 ml-1">
                        {layout.subtitle}
                      </span>
                    )}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                    {layout.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Info text */}
          <p className="text-xs text-gray-400 text-center mt-4">
            La plantilla define cómo se organizará tu mapa y no podrá cambiarse después.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleContinue}
            disabled={!selectedLayout}
            className={`
              px-5 py-2 text-sm font-medium rounded-lg transition-all duration-200
              flex items-center gap-2
              ${selectedLayout
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            Continuar
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LayoutTemplateSelector;

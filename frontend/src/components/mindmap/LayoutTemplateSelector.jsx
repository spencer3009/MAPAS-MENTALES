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

const LayoutTemplateSelector = ({ isOpen, onSelect, onClose }) => {
  const [selectedLayout, setSelectedLayout] = useState(null);

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
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100">
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

        {/* Content - Layout Cards */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {layouts.map((layout) => {
              const Icon = layout.icon;
              const isSelected = selectedLayout === layout.id;
              
              return (
                <button
                  key={layout.id}
                  onClick={() => setSelectedLayout(layout.id)}
                  className={`
                    relative p-6 rounded-xl border-2 transition-all duration-200
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
                    w-16 h-16 rounded-xl ${layout.iconBg} ${layout.iconColor}
                    flex items-center justify-center mb-4
                    group-hover:scale-105 transition-transform duration-200
                  `}>
                    <Icon className="w-10 h-10" />
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {layout.name}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {layout.description}
                  </p>

                  {/* Visual preview hint */}
                  <div className={`mt-4 pt-4 border-t border-gray-100`}>
                    <div className="flex items-center gap-2">
                      {layout.id === 'mindflow' ? (
                        // MindFlow visual - horizontal expansion
                        <div className="flex items-center gap-1">
                          <div className={`w-3 h-3 rounded bg-${layout.color}-400`}></div>
                          <div className="w-4 h-0.5 bg-gray-300"></div>
                          <div className="flex flex-col gap-1">
                            <div className={`w-2 h-2 rounded bg-${layout.color}-300`}></div>
                            <div className={`w-2 h-2 rounded bg-${layout.color}-300`}></div>
                          </div>
                          <div className="w-3 h-0.5 bg-gray-300"></div>
                          <div className="flex flex-col gap-0.5">
                            <div className={`w-1.5 h-1.5 rounded bg-${layout.color}-200`}></div>
                            <div className={`w-1.5 h-1.5 rounded bg-${layout.color}-200`}></div>
                            <div className={`w-1.5 h-1.5 rounded bg-${layout.color}-200`}></div>
                          </div>
                        </div>
                      ) : (
                        // MindTree visual - vertical structure
                        <div className="flex flex-col items-center gap-1">
                          <div className={`w-3 h-3 rounded bg-${layout.color}-400`}></div>
                          <div className="h-2 w-0.5 bg-gray-300"></div>
                          <div className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className={`w-2 h-2 rounded bg-${layout.color}-300`}></div>
                              <div className="h-1.5 w-0.5 bg-gray-300"></div>
                              <div className={`w-1.5 h-1.5 rounded bg-${layout.color}-200`}></div>
                            </div>
                            <div className="flex flex-col items-center">
                              <div className={`w-2 h-2 rounded bg-${layout.color}-300`}></div>
                              <div className="h-1.5 w-0.5 bg-gray-300"></div>
                              <div className={`w-1.5 h-1.5 rounded bg-${layout.color}-200`}></div>
                            </div>
                          </div>
                        </div>
                      )}
                      <span className="text-xs text-gray-400 ml-2">
                        Vista previa
                      </span>
                    </div>
                  </div>
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

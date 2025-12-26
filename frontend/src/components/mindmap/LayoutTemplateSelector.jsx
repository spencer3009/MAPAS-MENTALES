import React, { useState } from 'react';
import { X, ArrowRight, GitBranch, Network } from 'lucide-react';

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
      icon: Network,
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
      icon: GitBranch,
      color: 'emerald',
      bgGradient: 'from-emerald-500 to-emerald-600',
      borderColor: 'border-emerald-500',
      hoverBg: 'hover:bg-emerald-50',
      selectedBg: 'bg-emerald-50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <Icon size={32} strokeWidth={1.5} />
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

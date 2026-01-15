import React, { useState } from 'react';
import { X, Sliders, CircleCheck, AlignLeft, RotateCcw, Palette, Layout, Grid3X3, ChevronRight } from 'lucide-react';
import { useNodeDefaults } from '../../contexts/NodeDefaultsContext';

const MapEditorSettings = ({ isOpen, onClose }) => {
  const { settings, updateSettings, resetSettings } = useNodeDefaults();
  const [activeSection, setActiveSection] = useState('nodes');

  if (!isOpen) return null;

  const sections = [
    { id: 'nodes', label: 'Nodos por defecto', icon: CircleCheck, active: true },
    { id: 'styles', label: 'Estilos de nodos', icon: Palette, coming: true },
    { id: 'layout', label: 'Alineación automática', icon: Layout, coming: true },
    { id: 'templates', label: 'Plantillas de mapas', icon: Grid3X3, coming: true },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
              <Sliders className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Configuración del Editor</h3>
              <p className="text-xs text-gray-500">Personaliza cómo funcionan tus mapas mentales</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-56 bg-gray-50 border-r border-gray-100 p-3 space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => !section.coming && setActiveSection(section.id)}
                  disabled={section.coming}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
                    ${activeSection === section.id 
                      ? 'bg-white text-gray-900 shadow-sm font-medium' 
                      : section.coming 
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-600 hover:bg-white hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 ${activeSection === section.id ? 'text-slate-600' : ''}`} />
                  <span className="flex-1 text-left">{section.label}</span>
                  {section.coming && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded">Pronto</span>
                  )}
                  {!section.coming && activeSection === section.id && (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Main content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeSection === 'nodes' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-base font-semibold text-gray-900 mb-1">Nodos por defecto</h4>
                  <p className="text-sm text-gray-500">Configura cómo se crean los nuevos nodos en tus mapas</p>
                </div>

                {/* Opción: Ícono por defecto */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${settings.showIconByDefault ? 'bg-slate-200' : 'bg-gray-200'}`}>
                      <CircleCheck className={`w-5 h-5 ${settings.showIconByDefault ? 'text-slate-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Mostrar ícono</p>
                      <p className="text-xs text-gray-500">Agregar ícono de check a los nuevos nodos</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showIconByDefault}
                      onChange={(e) => updateSettings({ showIconByDefault: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-600"></div>
                  </label>
                </div>

                {/* Opción: Alineación a la izquierda */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${settings.textAlignLeft ? 'bg-slate-200' : 'bg-gray-200'}`}>
                      <AlignLeft className={`w-5 h-5 ${settings.textAlignLeft ? 'text-slate-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Alinear a la izquierda</p>
                      <p className="text-xs text-gray-500">El texto de los nodos se alineará a la izquierda</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.textAlignLeft}
                      onChange={(e) => updateSettings({ textAlignLeft: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-600"></div>
                  </label>
                </div>

                {/* Preview */}
                <div className="border border-gray-200 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 mb-3">Vista previa del nodo</p>
                  <div className="flex items-center justify-center py-4 bg-gray-50 rounded-lg">
                    <div className={`
                      bg-white border-2 border-blue-400 rounded-xl px-4 py-3 shadow-sm
                      flex items-center gap-2 min-w-[180px]
                      ${settings.textAlignLeft ? 'justify-start' : 'justify-center'}
                    `}>
                      {settings.showIconByDefault && (
                        <CircleCheck className="w-5 h-5 text-slate-500 flex-shrink-0" />
                      )}
                      <span className="text-gray-800 font-medium">Nuevo Nodo</span>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="p-1.5 bg-blue-100 rounded-lg">
                    <Sliders className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900">¿Cómo funciona?</p>
                    <p className="text-xs text-blue-700 mt-0.5">
                      Estos ajustes se aplican automáticamente cuando creas nuevos nodos en cualquiera de tus mapas mentales.
                      Los nodos existentes no se modificarán.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Secciones futuras */}
            {activeSection !== 'nodes' && (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <Layout className="w-8 h-8 text-gray-400" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Próximamente</h4>
                <p className="text-sm text-gray-500 max-w-sm">
                  Esta funcionalidad estará disponible en una próxima actualización.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
          <button
            onClick={resetSettings}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Restaurar valores
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors font-medium"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapEditorSettings;

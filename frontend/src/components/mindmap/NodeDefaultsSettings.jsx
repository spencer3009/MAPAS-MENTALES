import React from 'react';
import { X, CircleCheck, AlignLeft, RotateCcw, Settings } from 'lucide-react';
import { useNodeDefaults } from '../../contexts/NodeDefaultsContext';

const NodeDefaultsSettings = ({ isOpen, onClose }) => {
  const { settings, updateSettings, resetSettings, DEFAULT_SETTINGS } = useNodeDefaults();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-600 to-slate-700 flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Configuración de Nodos</h3>
              <p className="text-xs text-gray-500">Valores por defecto para nuevos nodos</p>
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
        <div className="p-6 space-y-6">
          {/* Opción: Ícono por defecto */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${settings.showIconByDefault ? 'bg-emerald-100' : 'bg-gray-200'}`}>
                <CircleCheck className={`w-5 h-5 ${settings.showIconByDefault ? 'text-emerald-600' : 'text-gray-400'}`} />
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
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* Opción: Alineación a la izquierda */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${settings.textAlignLeft ? 'bg-blue-100' : 'bg-gray-200'}`}>
                <AlignLeft className={`w-5 h-5 ${settings.textAlignLeft ? 'text-blue-600' : 'text-gray-400'}`} />
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
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
            </label>
          </div>

          {/* Preview */}
          <div className="border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 mb-3">Vista previa del nodo</p>
            <div className="flex items-center justify-center">
              <div className={`
                bg-white border-2 border-blue-400 rounded-xl px-4 py-3 shadow-sm
                flex items-center gap-2 min-w-[180px]
                ${settings.textAlignLeft ? 'justify-start' : 'justify-center'}
              `}>
                {settings.showIconByDefault && (
                  <CircleCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                )}
                <span className="text-gray-800 font-medium">Nuevo Nodo</span>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="text-xs text-gray-500 text-center">
            Estos ajustes se aplican automáticamente a todos los nodos nuevos que crees.
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
            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};

export default NodeDefaultsSettings;

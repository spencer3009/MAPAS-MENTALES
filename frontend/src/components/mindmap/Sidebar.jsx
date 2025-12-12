import React from 'react';
import { Plus, LayoutTemplate, FileText, Trash2, Brain } from 'lucide-react';

const Sidebar = ({
  nodes,
  onNewBlank,
  onNewFromTemplate,
  currentProjectName = 'Mi Mapa Mental'
}) => {
  const nodeCount = nodes?.length || 0;
  const today = new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="
      w-72 bg-white border-r border-gray-200
      flex flex-col p-5 shadow-sm z-20 shrink-0 h-full
    ">
      {/* Header con Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
          <Brain className="text-white" size={22} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Mapas Mentales</h1>
          <p className="text-xs text-gray-500">Organiza tus ideas</p>
        </div>
      </div>

      {/* Botones de acción */}
      <button
        onClick={onNewFromTemplate}
        className="
          w-full bg-blue-600 hover:bg-blue-700
          text-white font-medium py-3 px-4 rounded-xl
          flex items-center justify-center gap-2 mb-3
          shadow-md hover:shadow-lg transition-all duration-200
          active:scale-[0.98]
        "
      >
        <LayoutTemplate size={18} />
        <span>Desde Template</span>
      </button>

      <button
        onClick={onNewBlank}
        className="
          w-full bg-white hover:bg-gray-50
          text-gray-700 border-2 border-gray-200
          font-medium py-3 px-4 rounded-xl
          flex items-center justify-center gap-2 mb-8
          transition-all duration-200
          hover:border-gray-300 active:scale-[0.98]
        "
      >
        <Plus size={18} />
        <span>En Blanco</span>
      </button>

      {/* Sección de archivos */}
      <div className="mb-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Proyecto Actual</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Card del proyecto actual */}
        <div className="
          border-2 border-blue-500 bg-blue-50/50
          rounded-xl p-4 relative group
          transition-all duration-200
        ">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
              <FileText className="text-blue-600" size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm truncate">
                {currentProjectName}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Guardado automáticamente</p>
              <div className="flex justify-between items-center mt-3">
                <span className="text-xs text-gray-400">{today}</span>
                <span className="text-xs text-gray-500 font-medium">
                  {nodeCount} nodos
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mensaje informativo */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <p className="text-xs text-gray-500 leading-relaxed">
            💡 <span className="font-medium">Tip:</span> Haz doble clic en un nodo para editar su texto.
            Clic derecho para ver más opciones.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-gray-100 mt-4">
        <p className="text-xs text-gray-400 text-center">
          Los cambios se guardan automáticamente
        </p>
      </div>
    </div>
  );
};

export default Sidebar;

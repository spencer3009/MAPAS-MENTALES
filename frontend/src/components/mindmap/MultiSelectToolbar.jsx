import React from 'react';
import { 
  Trash2, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  X,
  Copy
} from 'lucide-react';

// Icono personalizado para "Distribuir verticalmente"
const DistributeVerticalIcon = ({ size = 18, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    {/* Rectángulo superior */}
    <rect x="6" y="4" width="12" height="4" rx="1" />
    {/* Línea vertical de conexión */}
    <line x1="12" y1="8" x2="12" y2="16" strokeDasharray="2 2" />
    {/* Rectángulo inferior */}
    <rect x="6" y="16" width="12" height="4" rx="1" />
  </svg>
);

/**
 * Toolbar que aparece cuando hay múltiples nodos seleccionados
 */
const MultiSelectToolbar = ({
  selectedCount,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onAlignTop,
  onAlignMiddle,
  onAlignBottom,
  onDistributeVertically,
  onDeleteSelected,
  onDuplicateSelected,
  onClearSelection,
  position
}) => {
  if (selectedCount < 2) return null;

  return (
    <div
      className="fixed z-50 flex items-center gap-1 px-3 py-2 bg-white rounded-xl shadow-xl border border-gray-200"
      style={{
        left: `${position?.x || 50}%`,
        top: '80px',
        transform: 'translateX(-50%)',
      }}
    >
      {/* Contador de selección */}
      <div className="flex items-center gap-2 pr-3 border-r border-gray-200">
        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
          <span className="text-white text-xs font-bold">{selectedCount}</span>
        </div>
        <span className="text-sm text-gray-600 font-medium">seleccionados</span>
      </div>

      {/* Separador */}
      <div className="w-px h-6 bg-gray-200 mx-1" />

      {/* Alineación horizontal */}
      <div className="flex items-center gap-0.5 px-1">
        <button
          onClick={onAlignLeft}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          title="Alinear a la izquierda"
        >
          <AlignLeft size={18} className="text-gray-600" />
        </button>
        <button
          onClick={onAlignCenter}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          title="Alinear al centro horizontal"
        >
          <AlignCenter size={18} className="text-gray-600" />
        </button>
        <button
          onClick={onAlignRight}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          title="Alinear a la derecha"
        >
          <AlignRight size={18} className="text-gray-600" />
        </button>
      </div>

      {/* Separador */}
      <div className="w-px h-6 bg-gray-200 mx-1" />

      {/* Alineación vertical */}
      <div className="flex items-center gap-0.5 px-1">
        <button
          onClick={onAlignTop}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          title="Alinear arriba"
        >
          <AlignStartVertical size={18} className="text-gray-600" />
        </button>
        <button
          onClick={onAlignMiddle}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          title="Alinear al centro vertical"
        >
          <AlignCenterVertical size={18} className="text-gray-600" />
        </button>
        <button
          onClick={onAlignBottom}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          title="Alinear abajo"
        >
          <AlignEndVertical size={18} className="text-gray-600" />
        </button>
      </div>

      {/* Separador */}
      <div className="w-px h-6 bg-gray-200 mx-1" />

      {/* Distribución */}
      <div className="flex items-center gap-0.5 px-1">
        <button
          onClick={onDistributeVertically}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          title="Distribuir verticalmente — iguala el espacio entre los nodos seleccionados"
        >
          <DistributeVerticalIcon size={18} className="text-gray-600" />
        </button>
      </div>

      {/* Separador */}
      <div className="w-px h-6 bg-gray-200 mx-1" />

      {/* Acciones */}
      <div className="flex items-center gap-0.5 px-1">
        <button
          onClick={onDuplicateSelected}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          title="Duplicar seleccionados"
        >
          <Copy size={18} className="text-gray-600" />
        </button>
        <button
          onClick={onDeleteSelected}
          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
          title="Eliminar seleccionados"
        >
          <Trash2 size={18} className="text-red-500" />
        </button>
      </div>

      {/* Separador */}
      <div className="w-px h-6 bg-gray-200 mx-1" />

      {/* Limpiar selección */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onClearSelection();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors pointer-events-auto"
        title="Limpiar selección (ESC)"
      >
        <X size={18} className="text-gray-500" />
      </button>
    </div>
  );
};

export default MultiSelectToolbar;

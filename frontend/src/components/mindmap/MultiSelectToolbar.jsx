import React from 'react';
import { 
  Trash2, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  X,
  Copy
} from 'lucide-react';

// Icono: Alinear nodos a la izquierda (línea vertical izquierda + rectángulos pegados)
const AlignNodesLeftIcon = ({ size = 18, className = "" }) => (
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
    {/* Línea vertical de referencia */}
    <line x1="4" y1="4" x2="4" y2="20" />
    {/* Rectángulo superior pegado a la izquierda */}
    <rect x="6" y="5" width="14" height="4" rx="1" />
    {/* Rectángulo inferior pegado a la izquierda */}
    <rect x="6" y="15" width="10" height="4" rx="1" />
  </svg>
);

// Icono: Alinear nodos al centro horizontal (línea vertical central + rectángulos centrados)
const AlignNodesCenterIcon = ({ size = 18, className = "" }) => (
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
    {/* Línea vertical central */}
    <line x1="12" y1="4" x2="12" y2="20" />
    {/* Rectángulo superior centrado */}
    <rect x="5" y="5" width="14" height="4" rx="1" />
    {/* Rectángulo inferior centrado */}
    <rect x="7" y="15" width="10" height="4" rx="1" />
  </svg>
);

// Icono: Alinear nodos a la derecha (línea vertical derecha + rectángulos pegados)
const AlignNodesRightIcon = ({ size = 18, className = "" }) => (
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
    {/* Línea vertical de referencia */}
    <line x1="20" y1="4" x2="20" y2="20" />
    {/* Rectángulo superior pegado a la derecha */}
    <rect x="4" y="5" width="14" height="4" rx="1" />
    {/* Rectángulo inferior pegado a la derecha */}
    <rect x="8" y="15" width="10" height="4" rx="1" />
  </svg>
);

// Icono: Alinear nodos arriba (línea horizontal superior + rectángulos pegados)
const AlignNodesTopIcon = ({ size = 18, className = "" }) => (
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
    {/* Línea horizontal de referencia */}
    <line x1="4" y1="4" x2="20" y2="4" />
    {/* Rectángulo izquierdo pegado arriba */}
    <rect x="5" y="6" width="4" height="12" rx="1" />
    {/* Rectángulo derecho pegado arriba */}
    <rect x="15" y="6" width="4" height="8" rx="1" />
  </svg>
);

// Icono: Alinear y distribuir nodos verticalmente (rectángulos con línea vertical central)
const AlignNodesMiddleIcon = ({ size = 18, className = "" }) => (
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
    <rect x="4" y="4" width="16" height="5" rx="1" />
    {/* Línea vertical central conectando */}
    <line x1="12" y1="9" x2="12" y2="15" />
    {/* Rectángulo inferior */}
    <rect x="4" y="15" width="16" height="5" rx="1" />
  </svg>
);

// Icono: Alinear nodos abajo (línea horizontal inferior + rectángulos pegados)
const AlignNodesBottomIcon = ({ size = 18, className = "" }) => (
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
    {/* Línea horizontal de referencia */}
    <line x1="4" y1="20" x2="20" y2="20" />
    {/* Rectángulo izquierdo pegado abajo */}
    <rect x="5" y="6" width="4" height="12" rx="1" />
    {/* Rectángulo derecho pegado abajo */}
    <rect x="15" y="10" width="4" height="8" rx="1" />
  </svg>
);

/**
 * Toolbar que aparece cuando hay múltiples nodos seleccionados
 */
const MultiSelectToolbar = ({
  selectedCount,
  // Alineación de TEXTO dentro del nodo
  onAlignTextLeft,
  onAlignTextCenter,
  onAlignTextRight,
  // Alineación de NODOS en el canvas
  onAlignNodesLeft,
  onAlignNodesCenter,
  onAlignNodesRight,
  onAlignNodesTop,
  onAlignNodesMiddle,  // Este también distribuye verticalmente
  onAlignNodesBottom,
  // Acciones
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

      {/* Alineación de TEXTO dentro del nodo */}
      <div className="flex items-center gap-0.5 px-1">
        <button
          onClick={onAlignTextLeft}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          title="Alinear texto a la izquierda"
        >
          <AlignLeft size={18} className="text-gray-600" />
        </button>
        <button
          onClick={onAlignTextCenter}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          title="Alinear texto al centro"
        >
          <AlignCenter size={18} className="text-gray-600" />
        </button>
        <button
          onClick={onAlignTextRight}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          title="Alinear texto a la derecha"
        >
          <AlignRight size={18} className="text-gray-600" />
        </button>
      </div>

      {/* Separador */}
      <div className="w-px h-6 bg-gray-200 mx-1" />

      {/* Alineación de NODOS en el canvas (horizontal) */}
      <div className="flex items-center gap-0.5 px-1">
        <button
          onClick={onAlignNodesLeft}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          title="Alinear nodos a la izquierda"
        >
          <AlignNodesLeftIcon size={18} className="text-gray-600" />
        </button>
        <button
          onClick={onAlignNodesCenter}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          title="Alinear nodos al centro horizontal"
        >
          <AlignNodesCenterIcon size={18} className="text-gray-600" />
        </button>
        <button
          onClick={onAlignNodesRight}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          title="Alinear nodos a la derecha"
        >
          <AlignNodesRightIcon size={18} className="text-gray-600" />
        </button>
      </div>

      {/* Separador */}
      <div className="w-px h-6 bg-gray-200 mx-1" />

      {/* Alineación de NODOS en el canvas (vertical) */}
      <div className="flex items-center gap-0.5 px-1">
        <button
          onClick={onAlignNodesTop}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          title="Alinear nodos arriba"
        >
          <AlignNodesTopIcon size={18} className="text-gray-600" />
        </button>
        <button
          onClick={onAlignNodesMiddle}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          title="Alinear y distribuir verticalmente — iguala el espacio entre nodos"
        >
          <AlignNodesMiddleIcon size={18} className="text-gray-600" />
        </button>
        <button
          onClick={onAlignNodesBottom}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          title="Alinear nodos abajo"
        >
          <AlignNodesBottomIcon size={18} className="text-gray-600" />
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

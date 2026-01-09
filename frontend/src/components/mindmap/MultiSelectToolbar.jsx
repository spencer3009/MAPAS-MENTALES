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

// Botón con soporte para touch Y mouse
const ToolbarBtn = ({ onClick, title, children, danger = false }) => {
  const handlePointerUp = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClick) onClick(e);
  };

  return (
    <button
      onPointerUp={handlePointerUp}
      onPointerDown={(e) => e.stopPropagation()}
      className={`
        p-2 rounded-lg transition-colors
        touch-manipulation select-none
        min-w-[40px] min-h-[40px]
        flex items-center justify-center
        ${danger 
          ? 'hover:bg-red-50 active:bg-red-100' 
          : 'hover:bg-gray-100 active:bg-gray-200'
        }
      `}
      style={{ WebkitTapHighlightColor: 'transparent' }}
      title={title}
      aria-label={title}
    >
      {children}
    </button>
  );
};

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
  onAlignNodesMiddle,
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
      className="fixed z-[70] flex items-center gap-1 px-2 sm:px-3 py-2 bg-white rounded-xl shadow-xl border border-gray-200 touch-manipulation overflow-x-auto max-w-[95vw]"
      style={{
        left: `${position?.x || 50}%`,
        top: '80px',
        transform: 'translateX(-50%)',
        pointerEvents: 'auto',
        touchAction: 'pan-x',
        WebkitTapHighlightColor: 'transparent'
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* Contador de selección */}
      <div className="flex items-center gap-2 pr-2 sm:pr-3 border-r border-gray-200 shrink-0">
        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
          <span className="text-white text-xs font-bold">{selectedCount}</span>
        </div>
        <span className="text-sm text-gray-600 font-medium hidden sm:inline">seleccionados</span>
      </div>

      {/* Separador */}
      <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />

      {/* Alineación de TEXTO dentro del nodo */}
      <div className="flex items-center gap-0.5 px-1 shrink-0">
        <ToolbarBtn onClick={onAlignTextLeft} title="Alinear texto a la izquierda">
          <AlignLeft size={18} className="text-gray-600" />
        </ToolbarBtn>
        <ToolbarBtn onClick={onAlignTextCenter} title="Alinear texto al centro">
          <AlignCenter size={18} className="text-gray-600" />
        </ToolbarBtn>
        <ToolbarBtn onClick={onAlignTextRight} title="Alinear texto a la derecha">
          <AlignRight size={18} className="text-gray-600" />
        </ToolbarBtn>
      </div>

      {/* Separador */}
      <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />

      {/* Alineación de NODOS en el canvas (horizontal) */}
      <div className="flex items-center gap-0.5 px-1 shrink-0">
        <ToolbarBtn onClick={onAlignNodesLeft} title="Alinear nodos a la izquierda">
          <AlignNodesLeftIcon size={18} className="text-gray-600" />
        </ToolbarBtn>
        <ToolbarBtn onClick={onAlignNodesCenter} title="Alinear nodos al centro horizontal">
          <AlignNodesCenterIcon size={18} className="text-gray-600" />
        </ToolbarBtn>
        <ToolbarBtn onClick={onAlignNodesRight} title="Alinear nodos a la derecha">
          <AlignNodesRightIcon size={18} className="text-gray-600" />
        </ToolbarBtn>
      </div>

      {/* Separador */}
      <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />

      {/* Alineación de NODOS en el canvas (vertical) */}
      <div className="flex items-center gap-0.5 px-1 shrink-0">
        <ToolbarBtn onClick={onAlignNodesTop} title="Alinear nodos arriba">
          <AlignNodesTopIcon size={18} className="text-gray-600" />
        </ToolbarBtn>
        <ToolbarBtn onClick={onAlignNodesMiddle} title="Alinear y distribuir verticalmente">
          <AlignNodesMiddleIcon size={18} className="text-gray-600" />
        </ToolbarBtn>
        <ToolbarBtn onClick={onAlignNodesBottom} title="Alinear nodos abajo">
          <AlignNodesBottomIcon size={18} className="text-gray-600" />
        </ToolbarBtn>
      </div>

      {/* Separador */}
      <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />

      {/* Acciones */}
      <div className="flex items-center gap-0.5 px-1 shrink-0">
        <ToolbarBtn onClick={onDuplicateSelected} title="Duplicar seleccionados">
          <Copy size={18} className="text-gray-600" />
        </ToolbarBtn>
        <ToolbarBtn onClick={onDeleteSelected} title="Eliminar seleccionados" danger>
          <Trash2 size={18} className="text-red-500" />
        </ToolbarBtn>
      </div>

      {/* Separador */}
      <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />

      {/* Limpiar selección */}
      <ToolbarBtn onClick={onClearSelection} title="Limpiar selección (ESC)">
        <X size={18} className="text-gray-500" />
      </ToolbarBtn>
    </div>
  );
};

export default MultiSelectToolbar;

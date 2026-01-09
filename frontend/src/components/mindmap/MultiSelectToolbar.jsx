import React, { useRef } from 'react';
import { 
  Trash2, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  X,
  Copy
} from 'lucide-react';

// Icono: Alinear nodos a la izquierda
const AlignNodesLeftIcon = ({ size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="4" y1="4" x2="4" y2="20" />
    <rect x="6" y="5" width="14" height="4" rx="1" />
    <rect x="6" y="15" width="10" height="4" rx="1" />
  </svg>
);

// Icono: Alinear nodos al centro horizontal
const AlignNodesCenterIcon = ({ size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="4" x2="12" y2="20" />
    <rect x="5" y="5" width="14" height="4" rx="1" />
    <rect x="7" y="15" width="10" height="4" rx="1" />
  </svg>
);

// Icono: Alinear nodos a la derecha
const AlignNodesRightIcon = ({ size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="20" y1="4" x2="20" y2="20" />
    <rect x="4" y="5" width="14" height="4" rx="1" />
    <rect x="8" y="15" width="10" height="4" rx="1" />
  </svg>
);

// Icono: Alinear nodos arriba
const AlignNodesTopIcon = ({ size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="4" y1="4" x2="20" y2="4" />
    <rect x="5" y="6" width="4" height="12" rx="1" />
    <rect x="15" y="6" width="4" height="8" rx="1" />
  </svg>
);

// Icono: Alinear y distribuir nodos verticalmente
const AlignNodesMiddleIcon = ({ size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="4" y="4" width="16" height="5" rx="1" />
    <line x1="12" y1="9" x2="12" y2="15" />
    <rect x="4" y="15" width="16" height="5" rx="1" />
  </svg>
);

// Icono: Alinear nodos abajo
const AlignNodesBottomIcon = ({ size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="4" y1="20" x2="20" y2="20" />
    <rect x="5" y="6" width="4" height="12" rx="1" />
    <rect x="15" y="10" width="4" height="8" rx="1" />
  </svg>
);

// Botón con soporte para touch Y mouse
const ToolbarBtn = ({ onClick, title, children, danger = false }) => {
  const lastClickTime = useRef(0);
  
  const handleClick = (e) => {
    const now = Date.now();
    if (now - lastClickTime.current < 300) return;
    lastClickTime.current = now;
    
    e.preventDefault();
    e.stopPropagation();
    console.log('[MultiSelectToolbar] Button clicked:', title);
    if (onClick) onClick(e);
  };

  return (
    <button
      onClick={handleClick}
      onTouchEnd={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleClick(e);
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className={`
        p-2 rounded-lg transition-colors
        select-none cursor-pointer
        min-w-[40px] min-h-[40px]
        flex items-center justify-center
        ${danger 
          ? 'hover:bg-red-50 active:bg-red-100' 
          : 'hover:bg-gray-100 active:bg-gray-200'
        }
      `}
      style={{ 
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation'
      }}
      title={title}
      aria-label={title}
    >
      {children}
    </button>
  );
};

const MultiSelectToolbar = ({
  selectedCount,
  onAlignTextLeft,
  onAlignTextCenter,
  onAlignTextRight,
  onAlignNodesLeft,
  onAlignNodesCenter,
  onAlignNodesRight,
  onAlignNodesTop,
  onAlignNodesMiddle,
  onAlignNodesBottom,
  onDeleteSelected,
  onDuplicateSelected,
  onClearSelection,
  position
}) => {
  if (selectedCount < 2) return null;

  return (
    <div
      className="fixed z-[9999] flex items-center gap-1 px-2 sm:px-3 py-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-x-auto max-w-[95vw]"
      style={{
        left: `${position?.x || 50}%`,
        top: '80px',
        transform: 'translateX(-50%)',
        pointerEvents: 'auto',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent'
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      data-testid="multi-select-toolbar"
    >
      {/* Contador de selección */}
      <div className="flex items-center gap-2 pr-2 sm:pr-3 border-r border-gray-200 shrink-0">
        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
          <span className="text-white text-xs font-bold">{selectedCount}</span>
        </div>
        <span className="text-sm text-gray-600 font-medium hidden sm:inline">seleccionados</span>
      </div>

      <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />

      {/* Alineación de TEXTO */}
      <div className="flex items-center gap-0.5 px-1 shrink-0">
        <ToolbarBtn onClick={onAlignTextLeft} title="Alinear texto izquierda">
          <AlignLeft size={18} className="text-gray-600" />
        </ToolbarBtn>
        <ToolbarBtn onClick={onAlignTextCenter} title="Alinear texto centro">
          <AlignCenter size={18} className="text-gray-600" />
        </ToolbarBtn>
        <ToolbarBtn onClick={onAlignTextRight} title="Alinear texto derecha">
          <AlignRight size={18} className="text-gray-600" />
        </ToolbarBtn>
      </div>

      <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />

      {/* Alineación de NODOS horizontal */}
      <div className="flex items-center gap-0.5 px-1 shrink-0">
        <ToolbarBtn onClick={onAlignNodesLeft} title="Alinear nodos izquierda">
          <AlignNodesLeftIcon size={18} className="text-gray-600" />
        </ToolbarBtn>
        <ToolbarBtn onClick={onAlignNodesCenter} title="Alinear nodos centro">
          <AlignNodesCenterIcon size={18} className="text-gray-600" />
        </ToolbarBtn>
        <ToolbarBtn onClick={onAlignNodesRight} title="Alinear nodos derecha">
          <AlignNodesRightIcon size={18} className="text-gray-600" />
        </ToolbarBtn>
      </div>

      <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />

      {/* Alineación de NODOS vertical */}
      <div className="flex items-center gap-0.5 px-1 shrink-0">
        <ToolbarBtn onClick={onAlignNodesTop} title="Alinear nodos arriba">
          <AlignNodesTopIcon size={18} className="text-gray-600" />
        </ToolbarBtn>
        <ToolbarBtn onClick={onAlignNodesMiddle} title="Distribuir verticalmente">
          <AlignNodesMiddleIcon size={18} className="text-gray-600" />
        </ToolbarBtn>
        <ToolbarBtn onClick={onAlignNodesBottom} title="Alinear nodos abajo">
          <AlignNodesBottomIcon size={18} className="text-gray-600" />
        </ToolbarBtn>
      </div>

      <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />

      {/* Acciones */}
      <div className="flex items-center gap-0.5 px-1 shrink-0">
        <ToolbarBtn onClick={onDuplicateSelected} title="Duplicar">
          <Copy size={18} className="text-gray-600" />
        </ToolbarBtn>
        <ToolbarBtn onClick={onDeleteSelected} title="Eliminar" danger>
          <Trash2 size={18} className="text-red-500" />
        </ToolbarBtn>
      </div>

      <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />

      {/* Limpiar selección */}
      <ToolbarBtn onClick={onClearSelection} title="Limpiar selección (ESC)">
        <X size={18} className="text-gray-500" />
      </ToolbarBtn>
    </div>
  );
};

export default MultiSelectToolbar;

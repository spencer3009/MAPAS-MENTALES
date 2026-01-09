import React, { useState, useRef } from 'react';
import { Plus, Copy, Trash2, Square, Minus, ChevronRight } from 'lucide-react';

// Opciones de grosor de línea para nodos dashed_text
const LINE_WIDTH_OPTIONS = [
  { value: 1, label: 'Normal (1px)' },
  { value: 2, label: 'Gruesa (2px)' },
  { value: 3, label: 'Muy gruesa (3px)' },
];

// Botón con soporte para touch Y mouse
const MenuButton = ({ onClick, children, danger = false, active = false, className = '' }) => {
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
        w-full text-left px-4 py-2.5 text-sm
        flex items-center gap-3
        transition-colors
        touch-manipulation select-none
        min-h-[44px]
        ${danger 
          ? 'text-red-500 hover:bg-red-50 active:bg-red-100' 
          : active
            ? 'text-sky-600 bg-sky-50 font-medium'
            : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
        }
        ${className}
      `}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {children}
    </button>
  );
};

const ContextMenu = ({
  position,
  nodeId,
  currentNodeType,
  currentLineWidth,
  onAddChild,
  onDuplicate,
  onDelete,
  onChangeNodeType,
  onChangeLineWidth,
  onClose
}) => {
  const [showLineWidthMenu, setShowLineWidthMenu] = useState(false);
  const menuRef = useRef(null);
  
  if (!position) return null;

  const isDashedNode = currentNodeType === 'dashed' || currentNodeType === 'dashed_text';

  // Calcular la altura estimada del menú según el tipo de nodo
  const estimatedMenuHeight = isDashedNode ? 280 : 200; // px aproximados
  const menuWidth = 224; // w-56 = 14rem = 224px

  // Calcular posición ajustada
  const getAdjustedPosition = () => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let x = position.x;
    let y = position.y;
    
    // Ajustar si se sale por la derecha
    if (x + menuWidth > viewportWidth - 20) {
      x = Math.max(10, x - menuWidth);
    }
    
    // Ajustar si se sale por abajo
    if (y + estimatedMenuHeight > viewportHeight - 20) {
      y = Math.max(10, y - estimatedMenuHeight);
    }
    
    return { x, y };
  };

  const adjustedPos = getAdjustedPosition();

  const handleAction = (action) => {
    action();
    onClose();
  };

  const handleConvertToDefault = () => {
    if (onChangeNodeType) {
      onChangeNodeType(nodeId, 'default');
    }
    onClose();
  };

  const handleConvertToDashed = () => {
    if (onChangeNodeType) {
      onChangeNodeType(nodeId, 'dashed_text');
    }
    onClose();
  };

  const handleChangeLineWidth = (width) => {
    if (onChangeLineWidth) {
      onChangeLineWidth(nodeId, width);
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="
        absolute bg-white rounded-xl shadow-xl
        border border-gray-200 w-56 overflow-hidden
        animate-in fade-in zoom-in-95 duration-150
        touch-manipulation
      "
      style={{
        left: adjustedPos.x,
        top: adjustedPos.y,
        zIndex: 100,
        pointerEvents: 'auto',
        touchAction: 'none',
        WebkitTapHighlightColor: 'transparent'
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="py-2">
        <MenuButton onClick={() => handleAction(() => onAddChild(nodeId))}>
          <Plus size={16} className="text-gray-500" />
          <span>Crear nodo hijo</span>
        </MenuButton>
        
        <MenuButton onClick={() => handleAction(() => onDuplicate(nodeId))}>
          <Copy size={16} className="text-gray-500" />
          <span>Duplicar nodo</span>
        </MenuButton>

        {/* Separador */}
        <div className="border-t border-gray-100 my-1" />

        {/* Opciones de conversión de tipo de nodo */}
        {isDashedNode ? (
          <>
            {/* Convertir a rectángulo */}
            <MenuButton onClick={handleConvertToDefault}>
              <Square size={16} className="text-blue-500" />
              <span>Cambiar a rectángulo</span>
            </MenuButton>

            {/* Submenu para grosor de línea */}
            <div className="relative">
              <MenuButton 
                onClick={() => setShowLineWidthMenu(!showLineWidthMenu)}
                className="justify-between"
              >
                <div className="flex items-center gap-3">
                  <Minus size={16} className="text-sky-500" />
                  <span>Grosor de línea</span>
                </div>
                <ChevronRight size={14} className={`text-gray-400 transition-transform ${showLineWidthMenu ? 'rotate-90' : ''}`} />
              </MenuButton>
              
              {/* Submenu de grosor - se muestra debajo cuando está expandido */}
              {showLineWidthMenu && (
                <div className="bg-gray-50 border-t border-gray-100">
                  {LINE_WIDTH_OPTIONS.map((option) => (
                    <MenuButton
                      key={option.value}
                      onClick={() => handleChangeLineWidth(option.value)}
                      active={(currentLineWidth || 1) === option.value}
                      className="px-6 py-2"
                    >
                      {/* Preview de la línea */}
                      <div 
                        className="w-6"
                        style={{
                          height: 0,
                          borderBottomWidth: `${option.value}px`,
                          borderBottomStyle: 'dashed',
                          borderBottomColor: '#38bdf8'
                        }}
                      />
                      <span>{option.label}</span>
                      {(currentLineWidth || 1) === option.value && (
                        <span className="ml-auto text-sky-500">✓</span>
                      )}
                    </MenuButton>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Convertir a solo línea */
          <MenuButton onClick={handleConvertToDashed}>
            <div className="flex items-center justify-center w-4">
              <div 
                style={{
                  width: '16px',
                  height: 0,
                  borderBottomWidth: '3px',
                  borderBottomStyle: 'dashed',
                  borderBottomColor: '#38bdf8'
                }}
              />
            </div>
            <span>Cambiar a solo línea</span>
          </MenuButton>
        )}

        {/* Separador */}
        <div className="border-t border-gray-100 my-1" />
        
        <MenuButton onClick={() => handleAction(() => onDelete(nodeId))} danger>
          <Trash2 size={16} />
          <span>Eliminar nodo</span>
        </MenuButton>
      </div>
    </div>
  );
};

export default ContextMenu;

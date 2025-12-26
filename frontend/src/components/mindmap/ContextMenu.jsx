import React, { useState, useRef, useEffect } from 'react';
import { Plus, Copy, Trash2, Square, Minus, ChevronRight } from 'lucide-react';

// Opciones de grosor de línea para nodos dashed_text
const LINE_WIDTH_OPTIONS = [
  { value: 1, label: 'Normal (1px)' },
  { value: 2, label: 'Gruesa (2px)' },
  { value: 3, label: 'Muy gruesa (3px)' },
];

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
  const [adjustedPosition, setAdjustedPosition] = useState({ x: 0, y: 0 });
  
  if (!position) return null;

  const isDashedNode = currentNodeType === 'dashed' || currentNodeType === 'dashed_text';

  // Ajustar posición del menú para que no salga de la pantalla
  useEffect(() => {
    if (menuRef.current && position) {
      const menu = menuRef.current;
      const menuRect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let newX = position.x;
      let newY = position.y;
      
      // Ajustar si se sale por la derecha
      if (position.x + menuRect.width > viewportWidth - 20) {
        newX = position.x - menuRect.width;
      }
      
      // Ajustar si se sale por abajo
      if (position.y + menuRect.height > viewportHeight - 20) {
        newY = position.y - menuRect.height;
      }
      
      // Asegurar que no sea menor que 0
      newX = Math.max(10, newX);
      newY = Math.max(10, newY);
      
      setAdjustedPosition({ x: newX, y: newY });
    }
  }, [position]);

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
      className="
        absolute bg-white rounded-xl shadow-xl
        border border-gray-200 w-56 overflow-hidden
        animate-in fade-in zoom-in-95 duration-150
      "
      style={{
        left: position.x,
        top: position.y,
        zIndex: 100
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="py-2">
        <button
          onClick={() => handleAction(() => onAddChild(nodeId))}
          className="
            w-full text-left px-4 py-2.5 text-sm text-gray-700
            hover:bg-gray-50 flex items-center gap-3
            transition-colors
          "
        >
          <Plus size={16} className="text-gray-500" />
          <span>Crear nodo hijo</span>
        </button>
        
        <button
          onClick={() => handleAction(() => onDuplicate(nodeId))}
          className="
            w-full text-left px-4 py-2.5 text-sm text-gray-700
            hover:bg-gray-50 flex items-center gap-3
            transition-colors
          "
        >
          <Copy size={16} className="text-gray-500" />
          <span>Duplicar nodo</span>
        </button>

        {/* Separador */}
        <div className="border-t border-gray-100 my-1" />

        {/* Opciones de conversión de tipo de nodo */}
        {isDashedNode ? (
          <>
            {/* Convertir a rectángulo */}
            <button
              onClick={handleConvertToDefault}
              className="
                w-full text-left px-4 py-2.5 text-sm text-gray-700
                hover:bg-gray-50 flex items-center gap-3
                transition-colors
              "
            >
              <Square size={16} className="text-blue-500" />
              <span>Cambiar a rectángulo</span>
            </button>

            {/* Submenu para grosor de línea */}
            <div className="relative">
              <button
                onClick={() => setShowLineWidthMenu(!showLineWidthMenu)}
                className="
                  w-full text-left px-4 py-2.5 text-sm text-gray-700
                  hover:bg-gray-50 flex items-center gap-3
                  transition-colors justify-between
                "
              >
                <div className="flex items-center gap-3">
                  <Minus size={16} className="text-sky-500" />
                  <span>Grosor de línea</span>
                </div>
                <ChevronRight size={14} className={`text-gray-400 transition-transform ${showLineWidthMenu ? 'rotate-90' : ''}`} />
              </button>
              
              {/* Submenu de grosor - se muestra debajo cuando está expandido */}
              {showLineWidthMenu && (
                <div className="bg-gray-50 border-t border-gray-100">
                  {LINE_WIDTH_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleChangeLineWidth(option.value)}
                      className={`
                        w-full text-left px-6 py-2 text-sm
                        hover:bg-gray-100 flex items-center gap-2
                        transition-colors
                        ${(currentLineWidth || 1) === option.value 
                          ? 'text-sky-600 bg-sky-50 font-medium' 
                          : 'text-gray-700'
                        }
                      `}
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
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Convertir a solo línea */
          <button
            onClick={handleConvertToDashed}
            className="
              w-full text-left px-4 py-2.5 text-sm text-gray-700
              hover:bg-gray-50 flex items-center gap-3
              transition-colors
            "
          >
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
          </button>
        )}

        {/* Separador */}
        <div className="border-t border-gray-100 my-1" />
        
        <button
          onClick={() => handleAction(() => onDelete(nodeId))}
          className="
            w-full text-left px-4 py-2.5 text-sm text-red-500
            hover:bg-red-50 flex items-center gap-3
            transition-colors
          "
        >
          <Trash2 size={16} />
          <span>Eliminar nodo</span>
        </button>
      </div>
    </div>
  );
};

export default ContextMenu;

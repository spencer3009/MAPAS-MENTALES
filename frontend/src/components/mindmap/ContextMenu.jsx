import React, { useState } from 'react';
import { Plus, Copy, Trash2, Square, Minus, ChevronRight } from 'lucide-react';

const COLOR_OPTIONS = [
  { key: 'blue', bg: 'bg-sky-300', hover: 'hover:bg-sky-400' },
  { key: 'pink', bg: 'bg-rose-300', hover: 'hover:bg-rose-400' },
  { key: 'green', bg: 'bg-emerald-300', hover: 'hover:bg-emerald-400' },
  { key: 'yellow', bg: 'bg-amber-300', hover: 'hover:bg-amber-400' },
];

// Opciones de grosor de línea para nodos dashed_text
const LINE_WIDTH_OPTIONS = [
  { value: 1, label: 'Muy fina (1px)' },
  { value: 2, label: 'Normal (2px)' },
  { value: 3, label: 'Gruesa (3px)' },
  { value: 4, label: 'Muy gruesa (4px)' },
];

const ContextMenu = ({
  position,
  nodeId,
  currentColor,
  currentNodeType,
  currentLineWidth,
  onAddChild,
  onDuplicate,
  onDelete,
  onChangeColor,
  onChangeNodeType,
  onChangeLineWidth,
  onClose
}) => {
  const [showLineWidthMenu, setShowLineWidthMenu] = useState(false);
  
  if (!position) return null;

  const isDashedNode = currentNodeType === 'dashed' || currentNodeType === 'dashed_text';

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
                        ${(currentLineWidth || 3) === option.value 
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
                      {(currentLineWidth || 3) === option.value && (
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

      {/* Sección de colores - solo para nodos con fondo */}
      {!isDashedNode && (
        <div className="border-t border-gray-100 px-4 py-3">
          <p className="text-xs text-gray-500 mb-2 font-medium">Color del nodo:</p>
          <div className="flex gap-2">
            {COLOR_OPTIONS.map(({ key, bg, hover }) => (
              <button
                key={key}
                onClick={() => handleAction(() => onChangeColor(nodeId, key))}
                className={`
                  w-7 h-7 rounded-full transition-all
                  ${bg} ${hover}
                  ${currentColor === key ? 'ring-2 ring-gray-500 ring-offset-2 scale-110' : ''}
                `}
                title={key}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContextMenu;

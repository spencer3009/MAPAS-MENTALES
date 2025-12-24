import React, { useRef, useEffect, useState } from 'react';
import { Square, MinusSquare, X } from 'lucide-react';

// Tipos de nodo disponibles
export const NODE_TYPES = {
  DEFAULT: 'default',      // Nodo rectangular con fondo
  DASHED_TEXT: 'dashed_text'  // Nodo con línea punteada celeste sin fondo
};

// Alias para compatibilidad con código existente
export const DASHED = NODE_TYPES.DASHED_TEXT;

// Guardar/recuperar última selección del usuario
const STORAGE_KEY = 'mindoramap_last_node_type';

const getLastNodeType = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    // Migrar 'dashed' a 'dashed_text' si existe
    if (saved === 'dashed') return NODE_TYPES.DASHED_TEXT;
    return saved || NODE_TYPES.DEFAULT;
  } catch {
    return NODE_TYPES.DEFAULT;
  }
};

const saveLastNodeType = (type) => {
  try {
    localStorage.setItem(STORAGE_KEY, type);
  } catch {
    // Ignorar errores de localStorage
  }
};

const NodeTypeSelector = ({ 
  isOpen, 
  position, 
  onSelect, 
  onClose,
  parentNode 
}) => {
  const selectorRef = useRef(null);
  const [lastUsedType, setLastUsedType] = useState(getLastNodeType());

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      // Pequeño delay para evitar que el clic que abrió el selector lo cierre
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
    }
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Cerrar con Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleSelect = (type) => {
    saveLastNodeType(type);
    setLastUsedType(type);
    onSelect(type);
    onClose();
  };

  if (!isOpen) return null;

  // Calcular posición del selector
  const selectorStyle = {
    left: position?.x || 0,
    top: position?.y || 0,
    transform: 'translate(-50%, 10px)'
  };

  return (
    <div
      ref={selectorRef}
      className="
        absolute z-[100]
        bg-white rounded-2xl shadow-2xl
        border border-gray-200
        overflow-hidden
        animate-in fade-in zoom-in-95
        duration-200
      "
      style={selectorStyle}
    >
      {/* Header */}
      <div className="
        flex items-center justify-between
        px-4 py-2.5
        bg-gradient-to-r from-blue-50 to-indigo-50
        border-b border-gray-100
      ">
        <span className="text-sm font-semibold text-gray-700">
          Tipo de nodo
        </span>
        <button
          onClick={onClose}
          className="
            p-1 rounded-lg
            text-gray-400 hover:text-gray-600
            hover:bg-gray-100
            transition-colors
          "
        >
          <X size={14} />
        </button>
      </div>

      {/* Opciones */}
      <div className="p-3 flex gap-3">
        {/* Opción 1: Nodo rectangular con fondo */}
        <button
          onClick={() => handleSelect(NODE_TYPES.DEFAULT)}
          className={`
            relative flex flex-col items-center gap-2 p-3
            rounded-xl border-2 transition-all duration-200
            hover:scale-105
            ${lastUsedType === NODE_TYPES.DEFAULT 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
            }
          `}
        >
          {/* Preview del nodo */}
          <div className="
            w-20 h-12 rounded-lg
            bg-gradient-to-br from-blue-100 to-blue-200
            border-2 border-blue-300
            shadow-sm
            flex items-center justify-center
          ">
            <span className="text-[10px] text-blue-700 font-medium">Texto</span>
          </div>
          
          <span className="text-xs font-medium text-gray-700">
            Con fondo
          </span>

          {/* Indicador de último usado */}
          {lastUsedType === NODE_TYPES.DEFAULT && (
            <span className="
              absolute -top-1 -right-1
              w-4 h-4 rounded-full
              bg-blue-500
              flex items-center justify-center
            ">
              <span className="text-white text-[8px]">✓</span>
            </span>
          )}
        </button>

        {/* Opción 2: Nodo con línea punteada (solo texto) */}
        <button
          onClick={() => handleSelect(NODE_TYPES.DASHED)}
          className={`
            relative flex flex-col items-center gap-2 p-3
            rounded-xl border-2 transition-all duration-200
            hover:scale-105
            ${lastUsedType === NODE_TYPES.DASHED 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
            }
          `}
        >
          {/* Preview del nodo - solo texto con línea punteada */}
          <div className="
            w-20 h-12
            flex flex-col items-center justify-center
          ">
            <span className="text-[10px] text-gray-600 font-medium mb-1">Texto</span>
            <div className="w-16 border-b-2 border-dashed border-gray-400" />
          </div>
          
          <span className="text-xs font-medium text-gray-700">
            Solo línea
          </span>

          {/* Indicador de último usado */}
          {lastUsedType === NODE_TYPES.DASHED && (
            <span className="
              absolute -top-1 -right-1
              w-4 h-4 rounded-full
              bg-blue-500
              flex items-center justify-center
            ">
              <span className="text-white text-[8px]">✓</span>
            </span>
          )}
        </button>
      </div>

      {/* Footer con tip */}
      <div className="
        px-3 py-2
        bg-gray-50
        border-t border-gray-100
      ">
        <p className="text-[10px] text-gray-400 text-center">
          💡 Se recuerda tu última selección
        </p>
      </div>
    </div>
  );
};

export default NodeTypeSelector;

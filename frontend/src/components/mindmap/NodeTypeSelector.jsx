import React, { useRef, useEffect, useState } from 'react';
import { Square, MinusSquare, X, FolderOpen } from 'lucide-react';

// Tipos de nodo disponibles
export const NODE_TYPES = {
  DEFAULT: 'default',      // Nodo rectangular con fondo
  DASHED_TEXT: 'dashed_text',  // Nodo con línea punteada celeste sin fondo
  PROJECT: 'project'       // Nodo vinculado a otro proyecto/mapa
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
  onSelectProjectType,
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
    if (type === NODE_TYPES.PROJECT) {
      // Para tipo proyecto, abrir modal de selección de proyecto
      if (onSelectProjectType) {
        onSelectProjectType();
      }
      onClose();
      return;
    }
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

      {/* Opciones - Grid responsive: 3 columnas en desktop, 2+1 en móvil */}
      <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        {/* Opción 1: Nodo rectangular con fondo */}
        <button
          onClick={() => handleSelect(NODE_TYPES.DEFAULT)}
          className={`
            relative flex flex-col items-center gap-1.5 sm:gap-2 p-2 sm:p-3
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
            w-14 sm:w-20 h-10 sm:h-12 rounded-lg
            bg-gradient-to-br from-blue-100 to-blue-200
            border-2 border-blue-300
            shadow-sm
            flex items-center justify-center
          ">
            <span className="text-[9px] sm:text-[10px] text-blue-700 font-medium">Texto</span>
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

        {/* Opción 2: Nodo con línea punteada celeste (solo texto) */}
        <button
          onClick={() => handleSelect(NODE_TYPES.DASHED_TEXT)}
          className={`
            relative flex flex-col items-center gap-2 p-3
            rounded-xl border-2 transition-all duration-200
            hover:scale-105
            ${lastUsedType === NODE_TYPES.DASHED_TEXT || lastUsedType === 'dashed'
              ? 'border-sky-500 bg-sky-50' 
              : 'border-gray-200 hover:border-sky-300 hover:bg-sky-50/50'
            }
          `}
        >
          {/* Preview del nodo - solo texto con línea punteada celeste */}
          <div className="
            w-20 h-12
            flex flex-col items-center justify-center
          ">
            <span className="text-[10px] text-gray-600 font-medium mb-1">Texto</span>
            {/* Línea celeste punteada - 1px de grosor (muy delgada) */}
            <div 
              className="w-16"
              style={{
                height: 0,
                borderBottomWidth: '1px',
                borderBottomStyle: 'dashed',
                borderBottomColor: '#38bdf8' // sky-400 - celeste
              }}
            />
          </div>
          
          <span className="text-xs font-medium text-gray-700">
            Solo línea
          </span>

          {/* Indicador de último usado */}
          {(lastUsedType === NODE_TYPES.DASHED_TEXT || lastUsedType === 'dashed') && (
            <span className="
              absolute -top-1 -right-1
              w-4 h-4 rounded-full
              bg-sky-500
              flex items-center justify-center
            ">
              <span className="text-white text-[8px]">✓</span>
            </span>
          )}
        </button>

        {/* Opción 3: Nodo tipo Proyecto (vinculado a otro mapa) */}
        <button
          onClick={() => handleSelect(NODE_TYPES.PROJECT)}
          className={`
            relative flex flex-col items-center gap-2 p-3
            rounded-xl border-2 transition-all duration-200
            hover:scale-105
            ${lastUsedType === NODE_TYPES.PROJECT
              ? 'border-emerald-500 bg-emerald-50' 
              : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50'
            }
          `}
        >
          {/* Preview del nodo proyecto */}
          <div className="
            w-20 h-12 rounded-lg
            bg-gradient-to-br from-emerald-100 to-emerald-200
            border-2 border-emerald-300
            border-dashed
            shadow-sm
            flex items-center justify-center
            gap-1
          ">
            <FolderOpen size={12} className="text-emerald-600" />
            <span className="text-[9px] text-emerald-700 font-medium">Mapa</span>
          </div>
          
          <span className="text-xs font-medium text-gray-700">
            Proyecto
          </span>

          {/* Indicador de último usado */}
          {lastUsedType === NODE_TYPES.PROJECT && (
            <span className="
              absolute -top-1 -right-1
              w-4 h-4 rounded-full
              bg-emerald-500
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

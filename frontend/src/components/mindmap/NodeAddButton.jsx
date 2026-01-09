import React from 'react';
import { Plus } from 'lucide-react';

const NodeAddButton = ({ 
  position, 
  onAdd, 
  visible,
  zoom = 1 
}) => {
  if (!visible) return null;

  // Handler unificado para mouse, touch y pointer
  const handleActivate = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onAdd();
  };

  return (
    <button
      onClick={handleActivate}
      onPointerDown={(e) => {
        e.stopPropagation();
        // En touch, activar inmediatamente para mejor respuesta
        if (e.pointerType === 'touch') {
          e.preventDefault();
          onAdd();
        }
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
        e.preventDefault();
        // Fallback para dispositivos que no soportan pointer events
        onAdd();
      }}
      className="
        absolute z-30
        w-9 h-9 md:w-7 md:h-7 rounded-full
        bg-blue-500 hover:bg-blue-600 active:bg-blue-700
        text-white shadow-lg
        flex items-center justify-center
        transition-all duration-200
        hover:scale-110 active:scale-95
        animate-in fade-in zoom-in-75 duration-200
        border-2 border-white
        touch-manipulation
        select-none
      "
      style={{
        left: position.x,
        top: position.y,
        transform: `scale(${1 / zoom})`,
        transformOrigin: 'center center',
        WebkitTapHighlightColor: 'transparent'
      }}
      title="Agregar nodo hijo"
      aria-label="Agregar nodo hijo"
    >
      <Plus size={18} strokeWidth={2.5} />
    </button>
  );
};

export default NodeAddButton;

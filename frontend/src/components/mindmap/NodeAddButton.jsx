import React from 'react';
import { Plus } from 'lucide-react';

const NodeAddButton = ({ 
  position, 
  onAdd, 
  visible,
  zoom = 1 
}) => {
  if (!visible) return null;

  return (
    <button
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
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
        cursor-pointer
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
      data-testid="floating-add-button"
    >
      <Plus size={18} strokeWidth={2.5} />
    </button>
  );
};

export default NodeAddButton;

import React from 'react';
import { Plus } from 'lucide-react';

const NodeAddButton = ({ 
  position, 
  onAdd, 
  visible,
  zoom = 1 
}) => {
  if (!visible) return null;

  const handleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onAdd();
  };

  return (
    <button
      onClick={handleClick}
      onMouseDown={(e) => e.stopPropagation()}
      className="
        absolute z-30
        w-7 h-7 rounded-full
        bg-blue-500 hover:bg-blue-600
        text-white shadow-lg
        flex items-center justify-center
        transition-all duration-200
        hover:scale-110 active:scale-95
        animate-in fade-in zoom-in-75 duration-200
        border-2 border-white
      "
      style={{
        left: position.x,
        top: position.y,
        transform: `scale(${1 / zoom})`,
        transformOrigin: 'center center'
      }}
      title="Agregar nodo hijo"
    >
      <Plus size={16} strokeWidth={2.5} />
    </button>
  );
};

export default NodeAddButton;

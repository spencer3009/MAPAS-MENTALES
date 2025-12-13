import React, { useState } from 'react';
import { 
  Type, 
  Palette, 
  Image, 
  Link2, 
  Copy, 
  Trash2,
  MoreHorizontal,
  Smile
} from 'lucide-react';

const COLORS = [
  { key: 'blue', bg: 'bg-sky-400', label: 'Azul' },
  { key: 'pink', bg: 'bg-rose-400', label: 'Rosa' },
  { key: 'green', bg: 'bg-emerald-400', label: 'Verde' },
  { key: 'yellow', bg: 'bg-amber-400', label: 'Amarillo' },
];

const ToolbarButton = ({ icon: Icon, label, onClick, danger = false, active = false }) => (
  <button
    onClick={onClick}
    onMouseDown={(e) => e.stopPropagation()}
    className={`
      p-2 rounded-lg transition-all duration-150
      flex items-center justify-center
      ${danger 
        ? 'text-red-500 hover:bg-red-50 hover:text-red-600' 
        : active
          ? 'bg-blue-100 text-blue-600'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
      }
    `}
    title={label}
  >
    <Icon size={16} />
  </button>
);

const Divider = () => (
  <div className="w-px h-6 bg-gray-200 mx-0.5" />
);

const NodeToolbar = ({
  position,
  visible,
  zoom = 1,
  currentColor,
  onEdit,
  onChangeColor,
  onAddImage,
  onAddLink,
  onDuplicate,
  onDelete,
  onAddEmoji
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);

  if (!visible) return null;

  const handleColorClick = (e) => {
    e.stopPropagation();
    setShowColorPicker(!showColorPicker);
  };

  const handleSelectColor = (color) => {
    onChangeColor(color);
    setShowColorPicker(false);
  };

  return (
    <div
      className="
        absolute z-40
        bg-white rounded-xl shadow-xl
        border border-gray-200
        flex items-center gap-0.5 p-1.5
        animate-in fade-in slide-in-from-bottom-2 duration-200
      "
      style={{
        left: position.x,
        top: position.y,
        transform: `translateX(-50%) scale(${1 / zoom})`,
        transformOrigin: 'bottom center'
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Editar texto */}
      <ToolbarButton 
        icon={Type} 
        label="Editar texto" 
        onClick={onEdit}
      />
      
      {/* Color picker */}
      <div className="relative">
        <ToolbarButton 
          icon={Palette} 
          label="Cambiar color" 
          onClick={handleColorClick}
          active={showColorPicker}
        />
        
        {showColorPicker && (
          <div 
            className="
              absolute top-full left-1/2 -translate-x-1/2 mt-2
              bg-white rounded-lg shadow-xl border border-gray-200
              p-2 flex gap-1.5
              animate-in fade-in zoom-in-95 duration-150
            "
          >
            {COLORS.map(({ key, bg, label }) => (
              <button
                key={key}
                onClick={() => handleSelectColor(key)}
                className={`
                  w-6 h-6 rounded-full ${bg}
                  transition-transform hover:scale-110
                  ${currentColor === key ? 'ring-2 ring-offset-2 ring-gray-400' : ''}
                `}
                title={label}
              />
            ))}
          </div>
        )}
      </div>

      {/* Emoji/Icono */}
      <ToolbarButton 
        icon={Smile} 
        label="Agregar emoji" 
        onClick={onAddEmoji}
      />

      <Divider />
      
      {/* Imagen */}
      <ToolbarButton 
        icon={Image} 
        label="Agregar imagen" 
        onClick={onAddImage}
      />
      
      {/* Enlace */}
      <ToolbarButton 
        icon={Link2} 
        label="Agregar enlace" 
        onClick={onAddLink}
      />
      
      <Divider />
      
      {/* Duplicar */}
      <ToolbarButton 
        icon={Copy} 
        label="Duplicar nodo" 
        onClick={onDuplicate}
      />
      
      {/* Eliminar */}
      <ToolbarButton 
        icon={Trash2} 
        label="Eliminar nodo" 
        onClick={onDelete}
        danger
      />
    </div>
  );
};

export default NodeToolbar;

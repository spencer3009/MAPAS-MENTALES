import React from 'react';
import { 
  Type, 
  Palette, 
  Image, 
  Link2, 
  Copy, 
  Trash2,
  Smile,
  MessageSquare
} from 'lucide-react';

const ToolbarButton = ({ icon: Icon, label, onClick, danger = false, active = false, hasIndicator = false }) => (
  <button
    onClick={onClick}
    onMouseDown={(e) => e.stopPropagation()}
    className={`
      relative p-2 rounded-lg transition-all duration-150
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
    {hasIndicator && (
      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full" />
    )}
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
  hasComment = false,
  onEdit,
  onChangeColor,
  onStyle,
  onAddImage,
  onAddLink,
  onDuplicate,
  onDelete,
  onAddEmoji,
  onComment
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

  const handleStyleClick = (e) => {
    e.stopPropagation();
    setShowColorPicker(false);
    if (onStyle) onStyle();
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
        transform: 'translateX(-50%)'
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
      
      {/* Panel de estilos avanzados */}
      <ToolbarButton 
        icon={Settings2} 
        label="Personalizar estilo" 
        onClick={handleStyleClick}
      />
      
      {/* Color picker rápido (legacy) */}
      <div className="relative">
        <ToolbarButton 
          icon={Palette} 
          label="Color rápido" 
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

      {/* Comentario */}
      <ToolbarButton 
        icon={MessageSquare} 
        label={hasComment ? "Ver comentario" : "Agregar comentario"}
        onClick={onComment}
        hasIndicator={hasComment}
      />

      <Divider />

      {/* Emoji/Icono */}
      <ToolbarButton 
        icon={Smile} 
        label="Agregar emoji" 
        onClick={onAddEmoji}
      />
      
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

import React from 'react';
import { 
  Type, 
  Palette, 
  Image, 
  Link2, 
  Copy, 
  Trash2,
  Laugh,
  MessageSquare
} from 'lucide-react';

const ToolbarButton = ({ icon: Icon, label, onClick, danger = false, active = false, hasIndicator = false, badge = null }) => (
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
    {hasIndicator && !badge && (
      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full" />
    )}
    {badge !== null && badge > 0 && (
      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
        {badge}
      </span>
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
  hasIcon = false,
  hasLinks = false,
  linksCount = 0,
  stylePanelOpen = false,
  iconPanelOpen = false,
  onEdit,
  onStyle,
  onAddImage,
  onAddLink,
  onDuplicate,
  onDelete,
  onAddIcon,
  onComment
}) => {
  if (!visible) return null;

  const handleStyleClick = (e) => {
    e.stopPropagation();
    if (onStyle) onStyle();
  };

  const handleIconClick = (e) => {
    e.stopPropagation();
    if (onAddIcon) onAddIcon();
  };

  return (
    <div
      data-toolbar="node-toolbar"
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
      
      {/* Panel de estilos - ícono de paleta */}
      <ToolbarButton 
        icon={Palette} 
        label="Personalizar estilo" 
        onClick={handleStyleClick}
        active={stylePanelOpen}
      />

      {/* Comentario */}
      <ToolbarButton 
        icon={MessageSquare} 
        label={hasComment ? "Ver comentario" : "Agregar comentario"}
        onClick={onComment}
        hasIndicator={hasComment}
      />

      <Divider />

      {/* Icono - NUEVO */}
      <ToolbarButton 
        icon={Laugh} 
        label="Agregar icono" 
        onClick={handleIconClick}
        active={iconPanelOpen}
        hasIndicator={hasIcon}
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
        label={hasLinks ? `Ver enlaces (${linksCount})` : "Agregar enlace"}
        onClick={onAddLink}
        badge={linksCount > 0 ? linksCount : null}
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

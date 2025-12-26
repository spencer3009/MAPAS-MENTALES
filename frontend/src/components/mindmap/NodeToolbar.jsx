import React from 'react';
import { 
  Type, 
  Palette, 
  Link2, 
  Copy, 
  Trash2,
  Laugh,
  MessageSquare,
  Bell,
  AlignLeft,
  AlignCenter,
  AlignRight
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
  nodeType = 'default',
  currentColor,
  currentTextAlign = 'center',
  hasComment = false,
  hasIcon = false,
  hasLinks = false,
  hasReminder = false,
  linksCount = 0,
  stylePanelOpen = false,
  iconPanelOpen = false,
  reminderPanelOpen = false,
  onEdit,
  onStyle,
  onAlignTextLeft,
  onAlignTextCenter,
  onAlignTextRight,
  onAddLink,
  onDuplicate,
  onDelete,
  onAddIcon,
  onAddReminder,
  onComment
}) => {
  if (!visible) return null;

  // Determinar si es un nodo de tipo "solo línea" (sin fondo)
  const isDashedNode = nodeType === 'dashed' || nodeType === 'dashed_text';

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
      
      {/* Panel de estilos - ícono de paleta (solo para nodos con fondo) */}
      {!isDashedNode && (
        <ToolbarButton 
          icon={Palette} 
          label="Personalizar estilo" 
          onClick={handleStyleClick}
          active={stylePanelOpen}
        />
      )}

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
      
      <Divider />

      {/* Alineación de texto */}
      <ToolbarButton 
        icon={AlignLeft} 
        label="Alinear texto a la izquierda" 
        onClick={onAlignTextLeft}
        active={currentTextAlign === 'left'}
      />
      <ToolbarButton 
        icon={AlignCenter} 
        label="Alinear texto al centro" 
        onClick={onAlignTextCenter}
        active={currentTextAlign === 'center'}
      />
      <ToolbarButton 
        icon={AlignRight} 
        label="Alinear texto a la derecha" 
        onClick={onAlignTextRight}
        active={currentTextAlign === 'right'}
      />
      
      <Divider />
      
      {/* Enlace */}
      <ToolbarButton 
        icon={Link2} 
        label={hasLinks ? `Ver enlaces (${linksCount})` : "Agregar enlace"}
        onClick={onAddLink}
        badge={linksCount > 0 ? linksCount : null}
      />

      {/* Recordatorio */}
      <ToolbarButton 
        icon={Bell} 
        label={hasReminder ? "Ver recordatorio" : "Agregar recordatorio"}
        onClick={onAddReminder}
        active={reminderPanelOpen}
        hasIndicator={hasReminder}
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

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
  AlignRight,
  CheckCircle2,
  MousePointer2,
  Hand,
  X
} from 'lucide-react';

const ToolbarButton = ({ icon: Icon, label, onClick, danger = false, active = false, hasIndicator = false, badge = null }) => (
  <button
    onClick={onClick}
    onMouseDown={(e) => e.stopPropagation()}
    className={`
      relative w-full p-3 rounded-lg transition-all duration-150
      flex items-center gap-3
      ${danger 
        ? 'text-red-500 hover:bg-red-50 hover:text-red-600' 
        : active
          ? 'bg-blue-100 text-blue-600'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
      }
    `}
    title={label}
  >
    <Icon size={18} className="shrink-0" />
    <span className="text-sm font-medium truncate">{label}</span>
    {hasIndicator && !badge && (
      <span className="absolute top-2 left-8 w-2 h-2 bg-blue-500 rounded-full" />
    )}
    {badge !== null && badge > 0 && (
      <span className="ml-auto min-w-[20px] h-5 px-1.5 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
        {badge}
      </span>
    )}
  </button>
);

const SectionDivider = ({ label }) => (
  <div className="px-3 py-2 mt-2">
    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
  </div>
);

const NodeToolbar = ({
  visible,
  nodeType = 'default',
  currentTextAlign = 'center',
  isCompleted = false,
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
  onToggleCompleted,
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
        absolute left-0 top-0 bottom-0 z-40
        w-56 bg-white/95 backdrop-blur-sm
        border-r border-gray-200
        flex flex-col
        shadow-lg
        animate-in slide-in-from-left-2 duration-200
      "
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
        <h3 className="text-sm font-semibold text-gray-700">Herramientas</h3>
        <p className="text-[11px] text-gray-400 mt-0.5">Nodo seleccionado</p>
      </div>

      {/* Contenedor scrolleable */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        
        {/* Sección: Herramientas */}
        <SectionDivider label="Selección" />
        <ToolbarButton 
          icon={MousePointer2} 
          label="Seleccionar"
          onClick={() => {}}
        />
        <ToolbarButton 
          icon={Hand} 
          label="Mover"
          onClick={() => {}}
        />

        {/* Sección: Estado */}
        <SectionDivider label="Estado" />
        <ToolbarButton 
          icon={CheckCircle2} 
          label={isCompleted ? "Desmarcar tarea" : "Completar tarea"}
          onClick={onToggleCompleted}
          active={isCompleted}
        />

        {/* Sección: Edición */}
        <SectionDivider label="Edición" />
        <ToolbarButton 
          icon={Type} 
          label="Editar texto" 
          onClick={onEdit}
        />
        
        {!isDashedNode && (
          <ToolbarButton 
            icon={Palette} 
            label="Estilos" 
            onClick={handleStyleClick}
            active={stylePanelOpen}
          />
        )}

        <ToolbarButton 
          icon={Laugh} 
          label="Agregar ícono" 
          onClick={handleIconClick}
          active={iconPanelOpen}
          hasIndicator={hasIcon}
        />

        {/* Sección: Alineación */}
        <SectionDivider label="Alineación" />
        <div className="flex gap-1 px-1">
          <button
            onClick={onAlignTextLeft}
            className={`flex-1 p-2.5 rounded-lg transition-all ${currentTextAlign === 'left' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
            title="Izquierda"
          >
            <AlignLeft size={16} className="mx-auto" />
          </button>
          <button
            onClick={onAlignTextCenter}
            className={`flex-1 p-2.5 rounded-lg transition-all ${currentTextAlign === 'center' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
            title="Centro"
          >
            <AlignCenter size={16} className="mx-auto" />
          </button>
          <button
            onClick={onAlignTextRight}
            className={`flex-1 p-2.5 rounded-lg transition-all ${currentTextAlign === 'right' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
            title="Derecha"
          >
            <AlignRight size={16} className="mx-auto" />
          </button>
        </div>

        {/* Sección: Extras */}
        <SectionDivider label="Extras" />
        <ToolbarButton 
          icon={MessageSquare} 
          label={hasComment ? "Ver comentario" : "Comentario"}
          onClick={onComment}
          hasIndicator={hasComment}
        />
        
        <ToolbarButton 
          icon={Link2} 
          label={hasLinks ? `Enlaces (${linksCount})` : "Agregar enlace"}
          onClick={onAddLink}
          badge={linksCount > 0 ? linksCount : null}
        />

        <ToolbarButton 
          icon={Bell} 
          label={hasReminder ? "Ver recordatorio" : "Recordatorio"}
          onClick={onAddReminder}
          active={reminderPanelOpen}
          hasIndicator={hasReminder}
        />

        {/* Sección: Acciones */}
        <SectionDivider label="Acciones" />
        <ToolbarButton 
          icon={Copy} 
          label="Duplicar nodo" 
          onClick={onDuplicate}
        />
        
        <ToolbarButton 
          icon={Trash2} 
          label="Eliminar nodo" 
          onClick={onDelete}
          danger
        />
      </div>
    </div>
  );
};

export default NodeToolbar;

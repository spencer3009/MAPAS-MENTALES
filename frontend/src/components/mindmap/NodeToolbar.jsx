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
  Hand
} from 'lucide-react';

// Botón compacto con solo ícono y tooltip
const IconButton = ({ icon: Icon, label, onClick, danger = false, active = false, hasIndicator = false, badge = null }) => (
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
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
      }
    `}
    title={label}
  >
    <Icon size={17} />
    {hasIndicator && !badge && (
      <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
    )}
    {badge !== null && badge > 0 && (
      <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 bg-blue-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
        {badge}
      </span>
    )}
  </button>
);

// Botón con texto corto
const LabelButton = ({ icon: Icon, label, onClick, danger = false, active = false, hasIndicator = false }) => (
  <button
    onClick={onClick}
    onMouseDown={(e) => e.stopPropagation()}
    className={`
      relative w-full p-2 rounded-lg transition-all duration-150
      flex items-center gap-2
      ${danger 
        ? 'text-red-500 hover:bg-red-50 hover:text-red-600' 
        : active
          ? 'bg-blue-100 text-blue-600'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-700'
      }
    `}
    title={label}
  >
    <Icon size={16} className="shrink-0" />
    <span className="text-xs font-medium truncate">{label}</span>
    {hasIndicator && (
      <span className="ml-auto w-1.5 h-1.5 bg-blue-500 rounded-full" />
    )}
  </button>
);

// Separador de sección compacto
const Section = ({ label }) => (
  <div className="px-1 pt-2 pb-1">
    <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
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

  return (
    <div
      data-toolbar="node-toolbar"
      className="
        absolute left-0 top-0 bottom-0 z-40
        w-44 bg-white/95 backdrop-blur-sm
        border-r border-gray-200
        flex flex-col
        shadow-lg
        animate-in slide-in-from-left-2 duration-200
      "
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header compacto */}
      <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/80">
        <h3 className="text-xs font-semibold text-gray-700">Herramientas</h3>
      </div>

      {/* Contenedor de herramientas */}
      <div className="flex-1 p-1.5 space-y-0.5">
        
        {/* Fila de herramientas: Selección */}
        <Section label="Modo" />
        <div className="flex gap-0.5">
          <IconButton icon={MousePointer2} label="Seleccionar" onClick={() => {}} />
          <IconButton icon={Hand} label="Mover" onClick={() => {}} />
        </div>

        {/* Estado */}
        <Section label="Estado" />
        <LabelButton 
          icon={CheckCircle2} 
          label={isCompleted ? "Completada" : "Completar"}
          onClick={onToggleCompleted}
          active={isCompleted}
        />

        {/* Edición */}
        <Section label="Editar" />
        <div className="flex gap-0.5">
          <IconButton icon={Type} label="Editar texto" onClick={onEdit} />
          {!isDashedNode && (
            <IconButton 
              icon={Palette} 
              label="Estilos" 
              onClick={(e) => { e.stopPropagation(); onStyle?.(); }}
              active={stylePanelOpen}
            />
          )}
          <IconButton 
            icon={Laugh} 
            label="Ícono" 
            onClick={(e) => { e.stopPropagation(); onAddIcon?.(); }}
            active={iconPanelOpen}
            hasIndicator={hasIcon}
          />
        </div>

        {/* Alineación */}
        <Section label="Alinear" />
        <div className="flex gap-0.5">
          <IconButton 
            icon={AlignLeft} 
            label="Izquierda" 
            onClick={onAlignTextLeft}
            active={currentTextAlign === 'left'}
          />
          <IconButton 
            icon={AlignCenter} 
            label="Centro" 
            onClick={onAlignTextCenter}
            active={currentTextAlign === 'center'}
          />
          <IconButton 
            icon={AlignRight} 
            label="Derecha" 
            onClick={onAlignTextRight}
            active={currentTextAlign === 'right'}
          />
        </div>

        {/* Extras */}
        <Section label="Extras" />
        <div className="flex gap-0.5">
          <IconButton 
            icon={MessageSquare} 
            label={hasComment ? "Ver comentario" : "Comentario"}
            onClick={onComment}
            hasIndicator={hasComment}
          />
          <IconButton 
            icon={Link2} 
            label={hasLinks ? `Enlaces (${linksCount})` : "Enlace"}
            onClick={onAddLink}
            badge={linksCount > 0 ? linksCount : null}
          />
          <IconButton 
            icon={Bell} 
            label={hasReminder ? "Ver recordatorio" : "Recordatorio"}
            onClick={onAddReminder}
            active={reminderPanelOpen}
            hasIndicator={hasReminder}
          />
        </div>

        {/* Acciones */}
        <Section label="Acciones" />
        <div className="flex gap-0.5">
          <IconButton icon={Copy} label="Duplicar" onClick={onDuplicate} />
          <IconButton icon={Trash2} label="Eliminar" onClick={onDelete} danger />
        </div>
      </div>
    </div>
  );
};

export default NodeToolbar;

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  GripHorizontal
} from 'lucide-react';

const ToolbarButton = ({ icon: Icon, label, onClick, danger = false, active = false, hasIndicator = false, badge = null }) => (
  <button
    onClick={onClick}
    onMouseDown={(e) => e.stopPropagation()}
    className={`
      relative p-2.5 rounded-lg transition-all duration-150
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
    <Icon size={18} />
    {hasIndicator && !badge && (
      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full" />
    )}
    {badge !== null && badge > 0 && (
      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
        {badge}
      </span>
    )}
  </button>
);

const Divider = () => (
  <div className="w-px h-7 bg-gray-200 mx-1" />
);

const NodeToolbar = ({
  position,
  visible,
  zoom = 1,
  nodeType = 'default',
  currentColor,
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
  onComment,
  interactionMode = 'hand',
  onSetInteractionMode
}) => {
  // Estado para el arrastre
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [customPosition, setCustomPosition] = useState(null);
  const toolbarRef = useRef(null);
  const lastNodePosition = useRef(null);

  // Resetear posición personalizada cuando cambia el nodo seleccionado
  useEffect(() => {
    if (position && (
      !lastNodePosition.current ||
      Math.abs(lastNodePosition.current.x - position.x) > 10 ||
      Math.abs(lastNodePosition.current.y - position.y) > 10
    )) {
      setCustomPosition(null);
      lastNodePosition.current = { x: position.x, y: position.y };
    }
  }, [position]);

  // Iniciar arrastre desde el handle
  const handleDragStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (toolbarRef.current) {
      const rect = toolbarRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  }, []);

  // Mover durante el arrastre
  const handleDrag = useCallback((e) => {
    if (!isDragging) return;
    
    e.preventDefault();
    
    const toolbarWidth = toolbarRef.current?.offsetWidth || 680;
    const toolbarHeight = toolbarRef.current?.offsetHeight || 60;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Calcular nueva posición
    let newX = e.clientX - dragOffset.x;
    let newY = e.clientY - dragOffset.y;
    
    // Limitar a los bordes de la ventana (mantener al menos 100px visible)
    const margin = 100;
    newX = Math.max(-toolbarWidth + margin, Math.min(windowWidth - margin, newX));
    newY = Math.max(10, Math.min(windowHeight - toolbarHeight - 10, newY));
    
    setCustomPosition({ x: newX, y: newY });
  }, [isDragging, dragOffset]);

  // Finalizar arrastre
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Event listeners para el arrastre
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDrag);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDrag, handleDragEnd]);

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

  // Estilos de posición: personalizada o centrada sobre el nodo
  const positionStyle = customPosition 
    ? { left: customPosition.x, top: customPosition.y }
    : { left: position.x, top: position.y - 4 };

  return (
    <div
      ref={toolbarRef}
      data-toolbar="node-toolbar"
      className={`
        absolute z-40
        bg-white rounded-xl shadow-xl
        border border-gray-200
        flex items-center
        ${!customPosition ? '-translate-x-1/2' : ''}
        ${isDragging ? 'cursor-grabbing shadow-2xl' : ''}
      `}
      style={positionStyle}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Handle lateral izquierdo */}
      <div
        onMouseDown={handleDragStart}
        className={`
          w-5 h-full min-h-[52px]
          bg-blue-500 hover:bg-blue-600
          rounded-l-xl
          flex items-center justify-center
          cursor-grab active:cursor-grabbing
          transition-colors duration-150
          ${isDragging ? 'bg-blue-700' : ''}
        `}
        title="Arrastrar para mover"
      >
        <div className="flex flex-col gap-1">
          <div className="w-1.5 h-1.5 bg-white/60 rounded-full" />
          <div className="w-1.5 h-1.5 bg-white/60 rounded-full" />
          <div className="w-1.5 h-1.5 bg-white/60 rounded-full" />
        </div>
      </div>

      {/* Contenedor de botones */}
      <div className="flex items-center gap-1 px-1.5 py-2">
        {/* Herramientas de modo de interacción */}
        <ToolbarButton 
          icon={MousePointer2} 
          label="Modo Puntero (seleccionar por área)"
          onClick={() => onSetInteractionMode?.('pointer')}
          active={interactionMode === 'pointer'}
        />
        <ToolbarButton 
          icon={Hand} 
          label="Modo Mano (mover lienzo)"
          onClick={() => onSetInteractionMode?.('hand')}
          active={interactionMode === 'hand'}
        />
        
        <Divider />

        {/* Marcar como completado */}
        <ToolbarButton 
          icon={CheckCircle2} 
          label={isCompleted ? "Desmarcar tarea" : "Marcar como completada"}
          onClick={onToggleCompleted}
          active={isCompleted}
        />
        
        <Divider />

        {/* Editar texto */}
        <ToolbarButton 
          icon={Type} 
          label="Editar texto" 
          onClick={onEdit}
        />
        
        {/* Panel de estilos */}
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

        {/* Icono */}
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

      {/* Handle lateral derecho */}
      <div
        onMouseDown={handleDragStart}
        className={`
          w-5 h-full min-h-[52px]
          bg-blue-500 hover:bg-blue-600
          rounded-r-xl
          flex items-center justify-center
          cursor-grab active:cursor-grabbing
          transition-colors duration-150
          ${isDragging ? 'bg-blue-700' : ''}
        `}
        title="Arrastrar para mover"
      >
        <div className="flex flex-col gap-1">
          <div className="w-1.5 h-1.5 bg-white/60 rounded-full" />
          <div className="w-1.5 h-1.5 bg-white/60 rounded-full" />
          <div className="w-1.5 h-1.5 bg-white/60 rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default NodeToolbar;

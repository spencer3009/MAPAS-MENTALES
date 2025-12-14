import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';

// Constantes por defecto - exportadas para uso en otros componentes
export const NODE_WIDTH = 160;
export const NODE_HEIGHT = 64;
const MIN_WIDTH = 80;
const MIN_HEIGHT = 40;

// Estilos de forma
const getShapeStyles = (shape) => {
  switch (shape) {
    case 'rectangle':
      return 'rounded-none';
    case 'rounded':
      return 'rounded-xl';
    case 'pill':
      return 'rounded-full';
    case 'cloud':
      return 'rounded-xl'; // El efecto nube se hace con clip-path
    case 'line':
      return 'bg-transparent border-0 shadow-none rounded-none';
    default:
      return 'rounded-xl';
  }
};

// Colores de fallback basados en el color legacy
const LEGACY_COLORS = {
  blue: { bg: '#e0f2fe', border: '#7dd3fc', text: '#1f2937' },
  pink: { bg: '#ffe4e6', border: '#fda4af', text: '#1f2937' },
  green: { bg: '#d1fae5', border: '#6ee7b7', text: '#1f2937' },
  yellow: { bg: '#fef3c7', border: '#fcd34d', text: '#1f2937' },
};

const NodeItem = memo(({
  node,
  isSelected,
  onSelect,
  onDragStart,
  onDragEnd,
  onUpdateText,
  onUpdateSize,
  onContextMenu,
  onCommentClick,
  forceEdit = false,
  onEditComplete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localText, setLocalText] = useState(node.text);
  const [isResizing, setIsResizing] = useState(false);
  const inputRef = useRef(null);
  const nodeRef = useRef(null);
  const resizeStartRef = useRef(null);

  const hasComment = node.comment && node.comment.trim().length > 0;

  // Obtener estilos del nodo (con fallback a colores legacy)
  const legacyColors = LEGACY_COLORS[node.color] || LEGACY_COLORS.blue;
  const bgColor = node.bgColor || legacyColors.bg;
  const borderColor = node.borderColor || legacyColors.border;
  const textColor = node.textColor || legacyColors.text;
  const borderWidth = node.borderWidth || 2;
  const borderStyle = node.borderStyle || 'solid';
  const shape = node.shape || 'rounded';

  // Tamaño del nodo (con valores por defecto)
  const nodeWidth = node.width || NODE_WIDTH;
  const nodeHeight = node.height || NODE_HEIGHT;

  // Sincronizar texto local con props
  const displayText = isEditing ? localText : node.text;

  // Forzar edición cuando se crea un nuevo nodo
  useEffect(() => {
    if (forceEdit && isSelected) {
      setLocalText(node.text);
      setIsEditing(true);
    }
  }, [forceEdit, isSelected, node.text]);

  // Focus en input cuando se activa edición
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = useCallback(() => {
    setLocalText(node.text);
    setIsEditing(true);
  }, [node.text]);

  const handleMouseDown = (e) => {
    if (e.button === 2) {
      e.preventDefault();
      onSelect(node.id);
      onContextMenu(e, node.id);
      return;
    }

    if (isEditing || isResizing) return;

    e.stopPropagation();
    onSelect(node.id);
    onDragStart(e, node);
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    handleStartEdit();
  };

  const handleBlur = () => {
    setIsEditing(false);
    const trimmedText = localText.trim() || 'Nuevo Nodo';
    if (trimmedText !== node.text) {
      onUpdateText(node.id, trimmedText);
    }
    if (onEditComplete) {
      onEditComplete();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === 'Escape') {
      setLocalText(node.text);
      setIsEditing(false);
      if (onEditComplete) {
        onEditComplete();
      }
    }
  };

  const handleRightClick = (e) => {
    e.preventDefault();
    onSelect(node.id);
    onContextMenu(e, node.id);
  };

  const handleCommentBadgeClick = (e) => {
    e.stopPropagation();
    if (onCommentClick) {
      onCommentClick(node.id);
    }
  };

  // ==========================================
  // RESIZE HANDLE
  // ==========================================
  
  const handleResizeStart = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    
    setIsResizing(true);
    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: nodeWidth,
      startHeight: nodeHeight
    };

    const handleResizeMove = (moveEvent) => {
      if (!resizeStartRef.current) return;
      
      const deltaX = moveEvent.clientX - resizeStartRef.current.startX;
      const deltaY = moveEvent.clientY - resizeStartRef.current.startY;
      
      const newWidth = Math.max(MIN_WIDTH, resizeStartRef.current.startWidth + deltaX);
      const newHeight = Math.max(MIN_HEIGHT, resizeStartRef.current.startHeight + deltaY);
      
      if (onUpdateSize) {
        onUpdateSize(node.id, Math.round(newWidth), Math.round(newHeight), false);
      }
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      
      // Guardar en historial al finalizar
      if (onUpdateSize) {
        onUpdateSize(node.id, nodeWidth, nodeHeight, true);
      }
    };

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  }, [node.id, nodeWidth, nodeHeight, onUpdateSize]);

  // Exponer método para iniciar edición
  const startEdit = useCallback(() => {
    handleStartEdit();
  }, [handleStartEdit]);

  useEffect(() => {
    if (nodeRef.current) {
      nodeRef.current.startEdit = startEdit;
    }
  }, [startEdit]);

  // Calcular dimensiones según la forma
  const getNodeDimensions = () => {
    const baseWidth = nodeWidth;
    const baseHeight = nodeHeight;
    
    if (shape === 'pill') {
      return { width: baseWidth + 20, height: baseHeight };
    }
    if (shape === 'cloud') {
      return { width: baseWidth + 30, height: baseHeight + 10 };
    }
    return { width: baseWidth, height: baseHeight };
  };

  const dimensions = getNodeDimensions();

  // Estilo especial para forma de nube usando SVG filter
  const isCloudShape = shape === 'cloud';

  // Estilo para forma de línea (solo texto)
  const isLineShape = shape === 'line';

  // Renderizar la forma de nube con SVG
  const renderCloudShape = () => {
    if (!isCloudShape) return null;
    
    return (
      <svg 
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 200 80"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id={`cloud-shadow-${node.id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15"/>
          </filter>
        </defs>
        <path 
          d="M25 65 
             Q5 65 5 50 
             Q5 35 20 32 
             Q15 15 40 15 
             Q60 10 75 20 
             Q85 8 110 10 
             Q140 8 155 25 
             Q175 15 185 30 
             Q200 35 195 50 
             Q200 65 175 65 
             Z"
          fill={bgColor}
          stroke={borderColor}
          strokeWidth={borderWidth}
          strokeDasharray={borderStyle === 'dashed' ? '8,4' : borderStyle === 'dotted' ? '2,4' : 'none'}
          filter={`url(#cloud-shadow-${node.id})`}
        />
      </svg>
    );
  };

  return (
    <div
      ref={nodeRef}
      data-node-id={node.id}
      className={`
        absolute
        flex items-center justify-center p-3
        transition-all duration-150 select-none
        ${isEditing ? 'cursor-text' : 'cursor-grab active:cursor-grabbing'}
        ${!isCloudShape ? getShapeStyles(shape) : ''}
        ${isSelected && !isLineShape && !isCloudShape ? 'ring-2 ring-offset-2 ring-blue-500 shadow-lg' : ''}
        ${isLineShape || isCloudShape ? '' : 'shadow-md'}
      `}
      style={{
        left: node.x,
        top: node.y,
        width: dimensions.width,
        minHeight: dimensions.height,
        backgroundColor: isLineShape || isCloudShape ? 'transparent' : bgColor,
        borderWidth: isLineShape || isCloudShape ? 0 : `${borderWidth}px`,
        borderStyle: isLineShape || isCloudShape ? 'none' : borderStyle,
        borderColor: isLineShape || isCloudShape ? 'transparent' : borderColor,
        color: textColor,
        zIndex: isSelected ? 20 : 10,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleRightClick}
    >
      {/* SVG de nube */}
      {renderCloudShape()}
      
      {/* Indicador de selección para nube */}
      {isCloudShape && isSelected && (
        <div 
          className="absolute inset-0 rounded-xl ring-2 ring-offset-2 ring-blue-500 pointer-events-none"
          style={{ zIndex: -1 }}
        />
      )}

      {/* Contenido del nodo */}
      <div className={`flex items-center gap-2 w-full relative z-10 ${isCloudShape ? 'px-2' : ''}`}>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onMouseDown={(e) => e.stopPropagation()}
            className="
              flex-1 text-center bg-transparent outline-none
              font-medium text-sm
              border-b-2 border-current opacity-50
            "
            style={{ color: textColor }}
            placeholder="Nombre del nodo"
          />
        ) : (
          <span 
            className="flex-1 font-medium text-sm text-center break-words"
            style={{ color: textColor }}
          >
            {displayText}
          </span>
        )}

        {/* Badge de comentario */}
        {hasComment && !isEditing && (
          <button
            onClick={handleCommentBadgeClick}
            onMouseDown={(e) => e.stopPropagation()}
            className="
              shrink-0 p-1.5 rounded-lg
              bg-white/50 backdrop-blur-sm
              hover:bg-white/80
              transition-all duration-150
              cursor-pointer
            "
            title="Ver comentario"
          >
            <MessageSquare size={14} style={{ color: textColor }} />
          </button>
        )}
      </div>

      {/* Subrayado para forma de línea */}
      {isLineShape && (
        <div 
          className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{ backgroundColor: borderColor }}
        />
      )}
    </div>
  );
});

NodeItem.displayName = 'NodeItem';

export { NODE_WIDTH, NODE_HEIGHT };
export default NodeItem;

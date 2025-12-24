import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { MessageSquare, Link2, Clock, FileText, Bell } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

// Icono personalizado de WhatsApp
const WhatsAppIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// Función para calcular luminancia y determinar si el color es claro u oscuro
const isLightColor = (color) => {
  if (!color) return true;
  
  // Convertir color a RGB
  let r, g, b;
  
  if (color.startsWith('#')) {
    // Hex color
    const hex = color.replace('#', '');
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else {
      r = parseInt(hex.substr(0, 2), 16);
      g = parseInt(hex.substr(2, 2), 16);
      b = parseInt(hex.substr(4, 2), 16);
    }
  } else if (color.startsWith('rgb')) {
    // RGB or RGBA color
    const match = color.match(/\d+/g);
    if (match) {
      r = parseInt(match[0]);
      g = parseInt(match[1]);
      b = parseInt(match[2]);
    } else {
      return true;
    }
  } else {
    // Named colors - assume light for common light colors
    const lightColors = ['white', 'yellow', 'lightyellow', 'lightblue', 'lightgreen', 'pink', 'lavender', 'beige', 'ivory', 'azure', 'honeydew', 'mintcream', 'snow', 'seashell', 'linen', 'oldlace', 'floralwhite', 'ghostwhite', 'aliceblue'];
    const darkColors = ['black', 'navy', 'darkblue', 'darkgreen', 'maroon', 'purple', 'indigo', 'darkred', 'darkslategray'];
    
    if (lightColors.includes(color.toLowerCase())) return true;
    if (darkColors.includes(color.toLowerCase())) return false;
    return true; // Default to light
  }
  
  // Calculate relative luminance using sRGB
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return true if light (luminance > 0.5)
  return luminance > 0.5;
};

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
  const hasLinks = node.links && node.links.length > 0;
  const hasReminder = node.hasReminder;

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

  // Tipo de nodo: 'default' | 'dashed_text'
  // Compatibilidad: 'dashed' se trata igual que 'dashed_text'
  const nodeType = node.nodeType || 'default';
  const isDashedNode = nodeType === 'dashed' || nodeType === 'dashed_text';
  
  // Color de acento del sistema para la línea (celeste)
  const ACCENT_COLOR = '#38bdf8'; // sky-400 - celeste brillante

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
      startHeight: nodeHeight,
      currentWidth: nodeWidth,
      currentHeight: nodeHeight
    };

    const handleResizeMove = (moveEvent) => {
      if (!resizeStartRef.current) return;
      
      const deltaX = moveEvent.clientX - resizeStartRef.current.startX;
      const deltaY = moveEvent.clientY - resizeStartRef.current.startY;
      
      const newWidth = Math.max(MIN_WIDTH, resizeStartRef.current.startWidth + deltaX);
      const newHeight = Math.max(MIN_HEIGHT, resizeStartRef.current.startHeight + deltaY);
      
      // Guardar las dimensiones actuales en el ref
      resizeStartRef.current.currentWidth = Math.round(newWidth);
      resizeStartRef.current.currentHeight = Math.round(newHeight);
      
      if (onUpdateSize) {
        onUpdateSize(node.id, Math.round(newWidth), Math.round(newHeight), false);
      }
    };

    const handleResizeEnd = () => {
      if (resizeStartRef.current && onUpdateSize) {
        // Usar las dimensiones finales del ref
        const finalWidth = resizeStartRef.current.currentWidth;
        const finalHeight = resizeStartRef.current.currentHeight;
        onUpdateSize(node.id, finalWidth, finalHeight, true);
      }
      
      setIsResizing(false);
      resizeStartRef.current = null;
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
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
        transition-all duration-200 select-none
        ${isEditing ? 'cursor-text' : 'cursor-grab active:cursor-grabbing'}
        ${isDashedNode ? 'flex flex-col items-center justify-center' : 'flex items-center justify-center p-3'}
        ${!isCloudShape && !isDashedNode ? getShapeStyles(shape) : ''}
        ${isSelected && !isLineShape && !isCloudShape && !isDashedNode ? 'ring-2 ring-offset-2 ring-blue-500' : ''}
        ${isLineShape || isCloudShape || isDashedNode ? '' : 'shadow-md'}
        ${isSelected && !isDashedNode ? 'shadow-lg' : ''}
      `}
      style={{
        left: node.x,
        top: node.y,
        width: isDashedNode ? 260 : dimensions.width,
        minHeight: isDashedNode ? 'auto' : dimensions.height,
        backgroundColor: isDashedNode || isLineShape || isCloudShape ? 'transparent' : bgColor,
        borderWidth: isDashedNode ? 0 : (isLineShape || isCloudShape ? 0 : `${borderWidth}px`),
        borderStyle: isDashedNode ? 'none' : (isLineShape || isCloudShape ? 'none' : borderStyle),
        borderColor: isDashedNode ? 'transparent' : (isLineShape || isCloudShape ? 'transparent' : borderColor),
        color: isDashedNode ? '#374151' : textColor,
        zIndex: isSelected ? 20 : 10,
        padding: isDashedNode ? '8px 4px' : undefined,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleRightClick}
    >
      {/* Render especial para nodo "dashed_text" (solo texto con línea celeste punteada) */}
      {isDashedNode ? (
        <div className="w-full flex flex-col items-center">
          {/* Indicador de selección sutil para dashed node */}
          {isSelected && (
            <div 
              className="absolute -inset-1 rounded-lg bg-sky-100/40 border-2 border-sky-300/50 pointer-events-none"
              style={{ zIndex: -1 }}
            />
          )}
          
          {/* Contenido principal: icono + texto + indicadores */}
          <div className="w-full flex items-center gap-1.5 pb-1">
            {/* Icono del nodo (igual que en nodos normales) */}
            {node.icon && !isEditing && (() => {
              const iconSize = 16; // Tamaño más pequeño para dashed nodes
              const iconColor = node.icon.color || '#374151'; // gray-700
              
              // Manejar icono personalizado de WhatsApp
              if (node.icon.name === 'WhatsApp') {
                return (
                  <div className="shrink-0 flex items-center justify-center">
                    <WhatsAppIcon size={iconSize} color={iconColor} />
                  </div>
                );
              }
              
              const IconComponent = LucideIcons[node.icon.name];
              if (!IconComponent) return null;
              
              return (
                <div className="shrink-0 flex items-center justify-center">
                  <IconComponent 
                    size={iconSize} 
                    color={iconColor}
                    strokeWidth={2}
                  />
                </div>
              );
            })()}
            
            {/* Texto editable */}
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={localText}
                onChange={(e) => setLocalText(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                onMouseDown={(e) => e.stopPropagation()}
                className="flex-1 text-left bg-transparent outline-none font-medium text-sm text-gray-700"
                placeholder="Escribe aquí..."
                autoFocus
              />
            ) : (
              <span className="flex-1 text-left font-medium text-sm text-gray-700 break-words">
                {displayText || 'Nodo nuevo'}
              </span>
            )}
            
            {/* Indicadores alineados a la derecha del texto - iconos minimalistas */}
            {!isEditing && (hasReminder || hasComment || hasLinks) && (
              <div className="shrink-0 flex items-center gap-1.5">
                {/* Recordatorio - icono minimalista */}
                {node.hasReminder && (
                  <Bell 
                    size={18} 
                    className="text-gray-400"
                    title="Tiene recordatorio"
                  />
                )}
                
                {/* Comentario - icono de burbuja de chat */}
                {hasComment && (
                  <button
                    onClick={handleCommentBadgeClick}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="hover:text-gray-600 transition-colors"
                    title="Ver comentario"
                  >
                    <MessageSquare size={18} className="text-gray-400" />
                  </button>
                )}
                
                {/* Enlaces - icono minimalista */}
                {hasLinks && (
                  <Link2 
                    size={18} 
                    className="text-gray-400"
                    title={`${node.links.length} enlace(s)`}
                  />
                )}
              </div>
            )}
          </div>
          
          {/* Línea punteada celeste debajo del texto - ultra delgada */}
          <div 
            className="w-full"
            style={{ 
              height: 0,
              borderBottomWidth: '3px',
              borderBottomStyle: 'dashed',
              borderBottomColor: isSelected ? '#0ea5e9' : ACCENT_COLOR,
              transform: 'scaleY(0.5)',
              opacity: 1
            }}
          />
        </div>
      ) : (
        <>
          {/* SVG de nube */}
          {renderCloudShape()}
          
          {/* Indicador de selección para nube */}
          {isCloudShape && isSelected && (
            <div 
              className="absolute inset-0 rounded-xl ring-2 ring-offset-2 ring-blue-500 pointer-events-none"
              style={{ zIndex: -1 }}
            />
          )}

          {/* Contenido del nodo normal */}
          <div className={`flex items-center gap-2 w-full relative z-10 ${isCloudShape ? 'px-2' : ''}`}>
            {/* Icono del nodo */}
            {node.icon && !isEditing && (() => {
              // Calcular tamaño del icono basado en la altura del nodo
              const iconSize = Math.min(Math.max(Math.floor(nodeHeight * 0.35), 16), 28);
              const iconColor = node.icon.color || textColor;
              
              // Manejar icono personalizado de WhatsApp
              if (node.icon.name === 'WhatsApp') {
                return (
                  <div className="shrink-0 flex items-center justify-center">
                    <WhatsAppIcon size={iconSize} color={iconColor} />
                  </div>
                );
              }
              
              const IconComponent = LucideIcons[node.icon.name];
              if (!IconComponent) return null;
              
              return (
                <div className="shrink-0 flex items-center justify-center">
                  <IconComponent 
                    size={iconSize} 
                    color={iconColor}
                    strokeWidth={2}
                  />
                </div>
              );
            })()}
            
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
                className={`flex-1 font-medium text-sm break-words ${node.icon ? 'text-left' : 'text-center'}`}
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

            {/* Badge de enlaces */}
            {node.links && node.links.length > 0 && !isEditing && (
              <div
                className="
                  shrink-0 flex items-center gap-1 px-1.5 py-1 rounded-lg
                  bg-blue-500/20 backdrop-blur-sm
                  cursor-default
                "
                title={`${node.links.length} enlace${node.links.length > 1 ? 's' : ''}`}
              >
                <Link2 size={12} style={{ color: textColor }} />
                <span className="text-[10px] font-semibold" style={{ color: textColor }}>
                  {node.links.length}
                </span>
              </div>
            )}

            {/* Badge de recordatorio (reloj) - color dinámico según fondo */}
            {node.hasReminder && !isEditing && (
              <div
                className={`
                  shrink-0 p-1.5 rounded-lg
                  backdrop-blur-sm cursor-default
                  ${isLightColor(bgColor) 
                    ? 'bg-gray-900/10' 
                    : 'bg-white/20'}
                `}
                title="Recordatorio programado ⏰"
              >
                <Clock 
                  size={14} 
                  className={isLightColor(bgColor) ? 'text-gray-800' : 'text-white'} 
                />
              </div>
            )}
          </div>

          {/* Subrayado para forma de línea */}
          {isLineShape && (
            <div 
              className="absolute bottom-0 left-0 right-0 h-0.5"
              style={{ backgroundColor: borderColor }}
            />
          )}

          {/* Resize Handle - solo visible cuando está seleccionado y no es dashed */}
          {isSelected && !isEditing && !isLineShape && (
            <div
              onMouseDown={handleResizeStart}
              className="
                absolute bottom-0 right-0
                w-4 h-4
                cursor-se-resize
                bg-blue-500 hover:bg-blue-600
                rounded-tl-md rounded-br-md
                opacity-80 hover:opacity-100
                transition-all duration-150
                flex items-center justify-center
                shadow-md
              "
              style={{ zIndex: 30 }}
              title="Arrastrar para redimensionar"
            >
              <svg 
                width="8" 
                height="8" 
                viewBox="0 0 8 8" 
                fill="none"
                className="text-white"
              >
                <path 
                  d="M7 1L1 7M7 4L4 7M7 7L7 7" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeLinecap="round"
                />
              </svg>
            </div>
          )}
        </>
      )}
    </div>
  );
});

NodeItem.displayName = 'NodeItem';

export default NodeItem;

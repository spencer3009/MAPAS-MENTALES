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
  isMultiSelected = false,
  layoutType = 'mindflow',
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

  // Determinar si el nodo está en cualquier tipo de selección
  const isInSelection = isSelected || isMultiSelected;

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
  
  // Alineación de texto (left, center, right) - por defecto center
  const textAlign = node.textAlign || 'center';
  
  // Clase CSS para alineación de texto
  const textAlignClass = {
    'left': 'text-left',
    'center': 'text-center',
    'right': 'text-right'
  }[textAlign] || 'text-center';
  
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

  // Actualizar altura real del nodo cuando se renderiza
  useEffect(() => {
    if (nodeRef.current && onUpdateSize) {
      const rect = nodeRef.current.getBoundingClientRect();
      const actualHeight = Math.round(rect.height);
      
      // Solo actualizar si la altura cambió significativamente (más de 5px de diferencia)
      if (Math.abs((node.height || 64) - actualHeight) > 5) {
        onUpdateSize(node.id, node.width || 160, actualHeight, false);
      }
    }
  }, [node.text, node.id, node.height, node.width, onUpdateSize]);

  const handleStartEdit = useCallback(() => {
    setLocalText(node.text);
    setIsEditing(true);
  }, [node.text]);

  const handleMouseDown = (e) => {
    if (e.button === 2) {
      e.preventDefault();
      onSelect(node.id, e);
      onContextMenu(e, node.id);
      return;
    }

    if (isEditing || isResizing) return;

    e.stopPropagation();
    onSelect(node.id, e);
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
    onSelect(node.id, e);
    onContextMenu(e, node.id);
  };

  // Manejar clic en el nodo (con soporte para CTRL/CMD + clic)
  // NOTA: La selección ahora se maneja en handleMouseDown para evitar doble ejecución
  const handleNodeClick = (e) => {
    e.stopPropagation();
    // No llamar onSelect aquí - ya se maneja en handleMouseDown
  };

  const handleCommentBadgeClick = (e) => {
    e.stopPropagation();
    if (onCommentClick) {
      onCommentClick(node.id);
    }
  };

  // ==========================================
  // RESIZE HANDLES (4 lados: arriba, abajo, izquierda, derecha)
  // ==========================================
  
  // Crear handler de resize para una dirección específica
  const createResizeHandler = useCallback((direction) => (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    setIsResizing(true);
    resizeStartRef.current = {
      direction,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: nodeWidth,
      startHeight: nodeHeight,
      startNodeX: node.x,
      startNodeY: node.y,
      currentWidth: nodeWidth,
      currentHeight: nodeHeight,
      currentX: node.x,
      currentY: node.y
    };

    const handleResizeMove = (moveEvent) => {
      if (!resizeStartRef.current) return;
      
      const deltaX = moveEvent.clientX - resizeStartRef.current.startX;
      const deltaY = moveEvent.clientY - resizeStartRef.current.startY;
      
      let newWidth = resizeStartRef.current.startWidth;
      let newHeight = resizeStartRef.current.startHeight;
      let newX = resizeStartRef.current.startNodeX;
      let newY = resizeStartRef.current.startNodeY;
      
      switch (resizeStartRef.current.direction) {
        case 'top':
          // Arrastrar desde arriba: ajustar altura y posición Y
          newHeight = Math.max(MIN_HEIGHT, resizeStartRef.current.startHeight - deltaY);
          newY = resizeStartRef.current.startNodeY + (resizeStartRef.current.startHeight - newHeight);
          break;
        case 'bottom':
          // Arrastrar desde abajo: solo ajustar altura
          newHeight = Math.max(MIN_HEIGHT, resizeStartRef.current.startHeight + deltaY);
          break;
        case 'left':
          // Arrastrar desde la izquierda: ajustar ancho y posición X
          newWidth = Math.max(MIN_WIDTH, resizeStartRef.current.startWidth - deltaX);
          newX = resizeStartRef.current.startNodeX + (resizeStartRef.current.startWidth - newWidth);
          break;
        case 'right':
          // Arrastrar desde la derecha: solo ajustar ancho
          newWidth = Math.max(MIN_WIDTH, resizeStartRef.current.startWidth + deltaX);
          break;
        // === ESQUINAS - Redimensionado proporcional ===
        case 'top-left':
          // Esquina superior izquierda: ajustar ancho, altura, X e Y
          newWidth = Math.max(MIN_WIDTH, resizeStartRef.current.startWidth - deltaX);
          newHeight = Math.max(MIN_HEIGHT, resizeStartRef.current.startHeight - deltaY);
          newX = resizeStartRef.current.startNodeX + (resizeStartRef.current.startWidth - newWidth);
          newY = resizeStartRef.current.startNodeY + (resizeStartRef.current.startHeight - newHeight);
          break;
        case 'top-right':
          // Esquina superior derecha: ajustar ancho, altura e Y
          newWidth = Math.max(MIN_WIDTH, resizeStartRef.current.startWidth + deltaX);
          newHeight = Math.max(MIN_HEIGHT, resizeStartRef.current.startHeight - deltaY);
          newY = resizeStartRef.current.startNodeY + (resizeStartRef.current.startHeight - newHeight);
          break;
        case 'bottom-left':
          // Esquina inferior izquierda: ajustar ancho, altura y X
          newWidth = Math.max(MIN_WIDTH, resizeStartRef.current.startWidth - deltaX);
          newHeight = Math.max(MIN_HEIGHT, resizeStartRef.current.startHeight + deltaY);
          newX = resizeStartRef.current.startNodeX + (resizeStartRef.current.startWidth - newWidth);
          break;
        case 'bottom-right':
          // Esquina inferior derecha: solo ajustar ancho y altura
          newWidth = Math.max(MIN_WIDTH, resizeStartRef.current.startWidth + deltaX);
          newHeight = Math.max(MIN_HEIGHT, resizeStartRef.current.startHeight + deltaY);
          break;
        default:
          break;
      }
      
      // Guardar las dimensiones y posición actuales en el ref
      resizeStartRef.current.currentWidth = Math.round(newWidth);
      resizeStartRef.current.currentHeight = Math.round(newHeight);
      resizeStartRef.current.currentX = Math.round(newX);
      resizeStartRef.current.currentY = Math.round(newY);
      
      if (onUpdateSize) {
        onUpdateSize(node.id, Math.round(newWidth), Math.round(newHeight), false, {
          x: Math.round(newX),
          y: Math.round(newY)
        });
      }
    };

    const handleResizeEnd = () => {
      if (resizeStartRef.current && onUpdateSize) {
        // Usar las dimensiones finales del ref
        const finalWidth = resizeStartRef.current.currentWidth;
        const finalHeight = resizeStartRef.current.currentHeight;
        const finalX = resizeStartRef.current.currentX;
        const finalY = resizeStartRef.current.currentY;
        onUpdateSize(node.id, finalWidth, finalHeight, true, {
          x: finalX,
          y: finalY
        });
      }
      
      setIsResizing(false);
      resizeStartRef.current = null;
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  }, [node.id, node.x, node.y, nodeWidth, nodeHeight, onUpdateSize]);

  // Handlers individuales para cada dirección (lados)
  const handleResizeTop = createResizeHandler('top');
  const handleResizeBottom = createResizeHandler('bottom');
  const handleResizeLeft = createResizeHandler('left');
  const handleResizeRight = createResizeHandler('right');
  
  // Handlers para las esquinas (redimensionado proporcional)
  const handleResizeTopLeft = createResizeHandler('top-left');
  const handleResizeTopRight = createResizeHandler('top-right');
  const handleResizeBottomLeft = createResizeHandler('bottom-left');
  const handleResizeBottomRight = createResizeHandler('bottom-right');

  // Exponer método para iniciar edición
  const startEdit = useCallback(() => {
    handleStartEdit();
  }, [handleStartEdit]);

  useEffect(() => {
    if (nodeRef.current) {
      nodeRef.current.startEdit = startEdit;
    }
  }, [startEdit]);

  // Calcular dimensiones según la forma y layout
  const getNodeDimensions = () => {
    const baseWidth = nodeWidth;
    const baseHeight = nodeHeight;
    
    // MindOrbit: nodos circulares
    if (layoutType === 'mindorbit') {
      // Tamaño fijo circular más pequeño
      const circleSize = 90;
      // Nodo raíz más grande
      const size = !node.parentId ? circleSize * 1.2 : circleSize;
      return { width: size, height: size, isCircle: true };
    }
    
    if (shape === 'pill') {
      return { width: baseWidth + 20, height: baseHeight, isCircle: false };
    }
    if (shape === 'cloud') {
      return { width: baseWidth + 30, height: baseHeight + 10, isCircle: false };
    }
    return { width: baseWidth, height: baseHeight, isCircle: false };
  };

  const dimensions = getNodeDimensions();
  const isOrbitLayout = layoutType === 'mindorbit';

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
    <>
      {/* Ícono de check verde cuando está completado */}
      {node.isCompleted && (
        <div 
          className="absolute flex items-center justify-center pointer-events-none z-30"
          style={{
            left: node.x + (dimensions.width / 2) - 14,
            top: node.y - 18,
          }}
        >
          <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center border-2 border-green-500">
            <svg 
              className="w-4 h-4 text-green-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              strokeWidth="3"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}
      
      <div
        ref={nodeRef}
        data-node-id={node.id}
        className={`
          absolute
          select-none
          ${isEditing ? 'cursor-text' : 'cursor-grab active:cursor-grabbing'}
          ${isDashedNode ? 'flex flex-col items-center justify-center' : 'flex items-center justify-center p-3'}
          ${!isCloudShape && !isDashedNode && !isOrbitLayout ? getShapeStyles(shape) : ''}
          ${isOrbitLayout ? 'rounded-full' : ''}
          ${isMultiSelected && !isLineShape && !isCloudShape && !isDashedNode ? 'ring-[3px] ring-offset-2 ring-blue-600' : ''}
          ${isSelected && !isMultiSelected && !isLineShape && !isCloudShape && !isDashedNode ? 'ring-2 ring-offset-2 ring-blue-500' : ''}
        ${isLineShape || isCloudShape || isDashedNode ? '' : 'shadow-md'}
        ${isInSelection && !isDashedNode ? 'shadow-lg' : ''}
      `}
      style={{
        left: node.x,
        top: node.y,
        width: isDashedNode ? 260 : dimensions.width,
        height: isOrbitLayout ? dimensions.height : undefined,
        minHeight: isDashedNode ? 'auto' : (isOrbitLayout ? undefined : dimensions.height),
        backgroundColor: isDashedNode || isLineShape || isCloudShape ? 'transparent' : bgColor,
        borderWidth: isDashedNode ? 0 : (isLineShape || isCloudShape ? 0 : `${borderWidth}px`),
        borderStyle: isDashedNode ? 'none' : (isLineShape || isCloudShape ? 'none' : borderStyle),
        borderColor: isDashedNode ? 'transparent' : (isLineShape || isCloudShape ? 'transparent' : borderColor),
        borderRadius: isOrbitLayout ? '50%' : undefined,
        color: isDashedNode ? '#374151' : textColor,
        zIndex: isInSelection ? 20 : 10,
        padding: isDashedNode ? '8px 4px' : (isOrbitLayout ? '8px' : undefined),
        // Opacidad reducida cuando está completado (41%)
        opacity: node.isCompleted ? 0.41 : 1,
        // Agregar box-shadow extra para selección múltiple (más visible)
        boxShadow: isMultiSelected 
          ? '0 0 0 4px rgba(37, 99, 235, 0.6), 0 10px 25px -5px rgba(0, 0, 0, 0.2)' 
          : isOrbitLayout 
            ? '0 4px 12px rgba(0, 0, 0, 0.15)' 
            : undefined,
        // Cambiar borde cuando está multi-seleccionado para mayor énfasis
        outline: isMultiSelected ? '2px solid #2563eb' : 'none',
        outlineOffset: isMultiSelected ? '3px' : 0,
        // Optimización para movimiento suave
        willChange: 'transform, left, top',
        transform: 'translateZ(0)', // Forzar aceleración por GPU
      }}
      onMouseDown={handleMouseDown}
      onClick={handleNodeClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleRightClick}
    >
      {/* Render especial para nodo "dashed_text" (solo texto con línea celeste punteada) */}
      {isDashedNode ? (
        <div className="w-full flex flex-col items-center">
          {/* Indicador de selección sutil para dashed node */}
          {isInSelection && (
            <div 
              className={`absolute -inset-1 rounded-lg pointer-events-none ${
                isMultiSelected 
                  ? 'bg-blue-100/60 border-2 border-blue-500/70' 
                  : 'bg-sky-100/40 border-2 border-sky-300/50'
              }`}
              style={{ 
                zIndex: -1,
                boxShadow: isMultiSelected ? '0 0 0 2px rgba(59, 130, 246, 0.4)' : 'none'
              }}
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
                className={`flex-1 ${textAlignClass} bg-transparent outline-none font-medium text-sm text-gray-700`}
                placeholder="Escribe aquí..."
                autoFocus
              />
            ) : (
              <span className={`flex-1 ${textAlignClass} font-medium text-sm text-gray-700 break-words ${node.isCompleted ? 'line-through' : ''}`}>
                {displayText || 'Nodo nuevo'}
              </span>
            )}
            
            {/* Indicadores alineados a la derecha del texto - iconos minimalistas */}
            {!isEditing && (hasReminder || hasComment || hasLinks) && (
              <div className="shrink-0 flex items-center gap-1.5">
                {/* Recordatorio - icono sin punto */}
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
              borderBottomColor: isInSelection ? '#0ea5e9' : ACCENT_COLOR,
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
          {isCloudShape && isInSelection && (
            <div 
              className={`absolute inset-0 rounded-xl ring-2 ring-offset-2 pointer-events-none ${
                isMultiSelected ? 'ring-blue-400' : 'ring-blue-500'
              }`}
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
                className={`
                  flex-1 ${textAlignClass} bg-transparent outline-none
                  font-medium text-sm
                  border-b-2 border-current opacity-50
                `}
                style={{ color: textColor }}
                placeholder="Nombre del nodo"
              />
            ) : (
              <span 
                className={`flex-1 font-medium text-sm break-words ${node.icon ? 'text-left' : textAlignClass} ${node.isCompleted ? 'line-through' : ''}`}
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

          {/* Resize Handles - 4 círculos blancos en los lados (visible cuando está seleccionado) */}
          {isSelected && !isMultiSelected && !isEditing && !isLineShape && (
            <>
              {/* Borde de selección */}
              <div 
                className="absolute -inset-1 pointer-events-none rounded-xl border-2 border-blue-500/50"
                style={{ zIndex: 25 }}
              />
              
              {/* Handler Superior */}
              <div
                onMouseDown={handleResizeTop}
                className="
                  absolute left-1/2 -translate-x-1/2 -top-2
                  w-4 h-4
                  cursor-ns-resize
                  bg-white hover:bg-blue-50
                  border-2 border-blue-500 hover:border-blue-600
                  rounded-full
                  opacity-90 hover:opacity-100
                  transition-all duration-150
                  shadow-md hover:shadow-lg hover:scale-110
                "
                style={{ zIndex: 30 }}
                title="Arrastrar para ajustar altura"
              />
              
              {/* Handler Inferior */}
              <div
                onMouseDown={handleResizeBottom}
                className="
                  absolute left-1/2 -translate-x-1/2 -bottom-2
                  w-4 h-4
                  cursor-ns-resize
                  bg-white hover:bg-blue-50
                  border-2 border-blue-500 hover:border-blue-600
                  rounded-full
                  opacity-90 hover:opacity-100
                  transition-all duration-150
                  shadow-md hover:shadow-lg hover:scale-110
                "
                style={{ zIndex: 30 }}
                title="Arrastrar para ajustar altura"
              />
              
              {/* Handler Izquierdo */}
              <div
                onMouseDown={handleResizeLeft}
                className="
                  absolute top-1/2 -translate-y-1/2 -left-2
                  w-4 h-4
                  cursor-ew-resize
                  bg-white hover:bg-blue-50
                  border-2 border-blue-500 hover:border-blue-600
                  rounded-full
                  opacity-90 hover:opacity-100
                  transition-all duration-150
                  shadow-md hover:shadow-lg hover:scale-110
                "
                style={{ zIndex: 30 }}
                title="Arrastrar para ajustar ancho"
              />
              
              {/* Handler Derecho */}
              <div
                onMouseDown={handleResizeRight}
                className="
                  absolute top-1/2 -translate-y-1/2 -right-2
                  w-4 h-4
                  cursor-ew-resize
                  bg-white hover:bg-blue-50
                  border-2 border-blue-500 hover:border-blue-600
                  rounded-full
                  opacity-90 hover:opacity-100
                  transition-all duration-150
                  shadow-md hover:shadow-lg hover:scale-110
                "
                style={{ zIndex: 30 }}
                title="Arrastrar para ajustar ancho"
              />
              
              {/* === HANDLERS DE ESQUINAS - Redimensionado proporcional === */}
              
              {/* Handler Esquina Superior Izquierda */}
              <div
                onMouseDown={handleResizeTopLeft}
                className="
                  absolute -top-2 -left-2
                  w-4 h-4
                  cursor-nwse-resize
                  bg-white hover:bg-blue-50
                  border-2 border-blue-500 hover:border-blue-600
                  rounded-full
                  opacity-90 hover:opacity-100
                  transition-all duration-150
                  shadow-md hover:shadow-lg hover:scale-110
                "
                style={{ zIndex: 31 }}
                title="Arrastrar para redimensionar proporcional"
              />
              
              {/* Handler Esquina Superior Derecha */}
              <div
                onMouseDown={handleResizeTopRight}
                className="
                  absolute -top-2 -right-2
                  w-4 h-4
                  cursor-nesw-resize
                  bg-white hover:bg-blue-50
                  border-2 border-blue-500 hover:border-blue-600
                  rounded-full
                  opacity-90 hover:opacity-100
                  transition-all duration-150
                  shadow-md hover:shadow-lg hover:scale-110
                "
                style={{ zIndex: 31 }}
                title="Arrastrar para redimensionar proporcional"
              />
              
              {/* Handler Esquina Inferior Izquierda */}
              <div
                onMouseDown={handleResizeBottomLeft}
                className="
                  absolute -bottom-2 -left-2
                  w-4 h-4
                  cursor-nesw-resize
                  bg-white hover:bg-blue-50
                  border-2 border-blue-500 hover:border-blue-600
                  rounded-full
                  opacity-90 hover:opacity-100
                  transition-all duration-150
                  shadow-md hover:shadow-lg hover:scale-110
                "
                style={{ zIndex: 31 }}
                title="Arrastrar para redimensionar proporcional"
              />
              
              {/* Handler Esquina Inferior Derecha */}
              <div
                onMouseDown={handleResizeBottomRight}
                className="
                  absolute -bottom-2 -right-2
                  w-4 h-4
                  cursor-nwse-resize
                  bg-white hover:bg-blue-50
                  border-2 border-blue-500 hover:border-blue-600
                  rounded-full
                  opacity-90 hover:opacity-100
                  transition-all duration-150
                  shadow-md hover:shadow-lg hover:scale-110
                "
                style={{ zIndex: 31 }}
                title="Arrastrar para redimensionar proporcional"
              />
            </>
          )}
        </>
      )}
    </div>
    </>
  );
});

NodeItem.displayName = 'NodeItem';

export default NodeItem;

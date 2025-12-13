import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';

const NODE_COLORS = {
  blue: {
    bg: 'bg-sky-100',
    border: 'border-sky-300',
    hover: 'hover:border-sky-400',
    ring: 'ring-sky-400',
    selected: 'border-sky-500 bg-sky-50',
    commentBg: 'bg-sky-200'
  },
  pink: {
    bg: 'bg-rose-100',
    border: 'border-rose-300',
    hover: 'hover:border-rose-400',
    ring: 'ring-rose-400',
    selected: 'border-rose-500 bg-rose-50',
    commentBg: 'bg-rose-200'
  },
  green: {
    bg: 'bg-emerald-100',
    border: 'border-emerald-300',
    hover: 'hover:border-emerald-400',
    ring: 'ring-emerald-400',
    selected: 'border-emerald-500 bg-emerald-50',
    commentBg: 'bg-emerald-200'
  },
  yellow: {
    bg: 'bg-amber-100',
    border: 'border-amber-300',
    hover: 'hover:border-amber-400',
    ring: 'ring-amber-400',
    selected: 'border-amber-500 bg-amber-50',
    commentBg: 'bg-amber-200'
  }
};

const NODE_WIDTH = 160;
const NODE_HEIGHT = 64;

const NodeItem = memo(({
  node,
  isSelected,
  onSelect,
  onDragStart,
  onUpdateText,
  onContextMenu,
  onCommentClick,
  forceEdit = false,
  onEditComplete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localText, setLocalText] = useState(node.text);
  const inputRef = useRef(null);
  const nodeRef = useRef(null);

  const colors = NODE_COLORS[node.color] || NODE_COLORS.blue;
  const hasComment = node.comment && node.comment.trim().length > 0;

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

    if (isEditing) return;

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

  // Exponer método para iniciar edición
  const startEdit = useCallback(() => {
    handleStartEdit();
  }, [handleStartEdit]);

  // Guardar referencia para acceso externo
  useEffect(() => {
    if (nodeRef.current) {
      nodeRef.current.startEdit = startEdit;
    }
  }, [startEdit]);

  return (
    <div
      ref={nodeRef}
      data-node-id={node.id}
      className={`
        absolute rounded-xl
        flex items-center justify-center p-3
        border-2 shadow-md
        transition-all duration-150 select-none
        ${isEditing ? 'cursor-text' : 'cursor-grab active:cursor-grabbing'}
        ${colors.bg} ${colors.border} ${colors.hover}
        ${isSelected ? `ring-2 ring-offset-2 ${colors.ring} shadow-lg ${colors.selected}` : ''}
      `}
      style={{
        left: node.x,
        top: node.y,
        width: NODE_WIDTH,
        minHeight: NODE_HEIGHT,
        zIndex: isSelected ? 20 : 10
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleRightClick}
    >
      {/* Contenido del nodo */}
      <div className="flex items-center gap-2 w-full">
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
              text-gray-800 font-medium text-sm
              border-b-2 border-gray-400
            "
            placeholder="Nombre del nodo"
          />
        ) : (
          <span className="flex-1 text-gray-800 font-medium text-sm text-center break-words">
            {displayText}
          </span>
        )}

        {/* Badge de comentario - Siempre visible si hay comentario */}
        {hasComment && !isEditing && (
          <button
            onClick={handleCommentBadgeClick}
            onMouseDown={(e) => e.stopPropagation()}
            className={`
              shrink-0 p-1.5 rounded-lg
              ${colors.commentBg}
              hover:opacity-80
              transition-all duration-150
              cursor-pointer
            `}
            title="Ver comentario"
          >
            <MessageSquare size={14} className="text-gray-600" />
          </button>
        )}
      </div>
    </div>
  );
});

NodeItem.displayName = 'NodeItem';

export { NODE_WIDTH, NODE_HEIGHT };
export default NodeItem;

import React, { useState, useRef, useEffect, memo, useCallback } from 'react';

const NODE_COLORS = {
  blue: {
    bg: 'bg-sky-100',
    border: 'border-sky-300',
    hover: 'hover:border-sky-400',
    ring: 'ring-sky-400',
    selected: 'border-sky-500 bg-sky-50'
  },
  pink: {
    bg: 'bg-rose-100',
    border: 'border-rose-300',
    hover: 'hover:border-rose-400',
    ring: 'ring-rose-400',
    selected: 'border-rose-500 bg-rose-50'
  },
  green: {
    bg: 'bg-emerald-100',
    border: 'border-emerald-300',
    hover: 'hover:border-emerald-400',
    ring: 'ring-emerald-400',
    selected: 'border-emerald-500 bg-emerald-50'
  },
  yellow: {
    bg: 'bg-amber-100',
    border: 'border-amber-300',
    hover: 'hover:border-amber-400',
    ring: 'ring-amber-400',
    selected: 'border-amber-500 bg-amber-50'
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
  forceEdit = false,
  onEditComplete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localText, setLocalText] = useState(node.text);
  const inputRef = useRef(null);
  const nodeRef = useRef(null);

  const colors = NODE_COLORS[node.color] || NODE_COLORS.blue;

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
            w-full text-center bg-transparent outline-none
            text-gray-800 font-medium text-sm
            border-b-2 border-gray-400
          "
          placeholder="Nombre del nodo"
        />
      ) : (
        <span className="text-gray-800 font-medium text-sm text-center break-words w-full">
          {displayText}
        </span>
      )}
    </div>
  );
});

NodeItem.displayName = 'NodeItem';

export { NODE_WIDTH, NODE_HEIGHT };
export default NodeItem;

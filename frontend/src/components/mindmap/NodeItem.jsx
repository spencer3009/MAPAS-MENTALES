import React, { useState, useRef, useEffect, memo } from 'react';

const NODE_COLORS = {
  blue: {
    bg: 'bg-sky-100',
    border: 'border-sky-300',
    hover: 'hover:border-sky-400',
    ring: 'ring-sky-400'
  },
  pink: {
    bg: 'bg-rose-100',
    border: 'border-rose-300',
    hover: 'hover:border-rose-400',
    ring: 'ring-rose-400'
  },
  green: {
    bg: 'bg-emerald-100',
    border: 'border-emerald-300',
    hover: 'hover:border-emerald-400',
    ring: 'ring-emerald-400'
  },
  yellow: {
    bg: 'bg-amber-100',
    border: 'border-amber-300',
    hover: 'hover:border-amber-400',
    ring: 'ring-amber-400'
  }
};

const NodeItem = memo(({
  node,
  isSelected,
  onSelect,
  onDragStart,
  onUpdateText,
  onContextMenu
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localText, setLocalText] = useState(node.text);
  const inputRef = useRef(null);

  const colors = NODE_COLORS[node.color] || NODE_COLORS.blue;

  // Sincronizar texto local con props solo cuando no está editando
  const displayText = isEditing ? localText : node.text;

  const handleStartEdit = () => {
    setLocalText(node.text);
    setIsEditing(true);
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleMouseDown = (e) => {
    if (e.button === 2) {
      // Click derecho
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
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editText.trim() !== node.text) {
      onUpdateText(node.id, editText.trim() || 'Nuevo Nodo');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === 'Escape') {
      setEditText(node.text);
      setIsEditing(false);
    }
  };

  const handleRightClick = (e) => {
    e.preventDefault();
    onSelect(node.id);
    onContextMenu(e, node.id);
  };

  return (
    <div
      className={`
        absolute min-w-[120px] max-w-[180px] px-4 py-3 rounded-lg
        flex items-center justify-center
        border-2 shadow-sm cursor-grab active:cursor-grabbing
        transition-all duration-150 select-none
        ${colors.bg} ${colors.border} ${colors.hover}
        ${isSelected ? `ring-2 ring-offset-2 ${colors.ring} shadow-md` : ''}
      `}
      style={{
        left: node.x,
        top: node.y,
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
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
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
        <span className="text-gray-800 font-medium text-sm text-center truncate w-full">
          {node.text}
        </span>
      )}
    </div>
  );
});

NodeItem.displayName = 'NodeItem';

export default NodeItem;

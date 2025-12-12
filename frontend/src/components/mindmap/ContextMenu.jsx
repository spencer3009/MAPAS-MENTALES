import React from 'react';
import { Plus, Copy, Trash2 } from 'lucide-react';

const COLOR_OPTIONS = [
  { key: 'blue', bg: 'bg-sky-300', hover: 'hover:bg-sky-400' },
  { key: 'pink', bg: 'bg-rose-300', hover: 'hover:bg-rose-400' },
  { key: 'green', bg: 'bg-emerald-300', hover: 'hover:bg-emerald-400' },
  { key: 'yellow', bg: 'bg-amber-300', hover: 'hover:bg-amber-400' },
];

const ContextMenu = ({
  position,
  nodeId,
  currentColor,
  onAddChild,
  onDuplicate,
  onDelete,
  onChangeColor,
  onClose
}) => {
  if (!position) return null;

  const handleAction = (action) => {
    action();
    onClose();
  };

  return (
    <div
      className="
        absolute bg-white rounded-xl shadow-xl
        border border-gray-200 w-56 overflow-hidden
        animate-in fade-in zoom-in-95 duration-150
      "
      style={{
        left: position.x,
        top: position.y,
        zIndex: 100
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="py-2">
        <button
          onClick={() => handleAction(() => onAddChild(nodeId))}
          className="
            w-full text-left px-4 py-2.5 text-sm text-gray-700
            hover:bg-gray-50 flex items-center gap-3
            transition-colors
          "
        >
          <Plus size={16} className="text-gray-500" />
          <span>Crear nodo hijo</span>
        </button>
        
        <button
          onClick={() => handleAction(() => onDuplicate(nodeId))}
          className="
            w-full text-left px-4 py-2.5 text-sm text-gray-700
            hover:bg-gray-50 flex items-center gap-3
            transition-colors
          "
        >
          <Copy size={16} className="text-gray-500" />
          <span>Duplicar nodo</span>
        </button>
        
        <button
          onClick={() => handleAction(() => onDelete(nodeId))}
          className="
            w-full text-left px-4 py-2.5 text-sm text-red-500
            hover:bg-red-50 flex items-center gap-3
            transition-colors
          "
        >
          <Trash2 size={16} />
          <span>Eliminar nodo</span>
        </button>
      </div>

      <div className="border-t border-gray-100 px-4 py-3">
        <p className="text-xs text-gray-500 mb-2 font-medium">Color del nodo:</p>
        <div className="flex gap-2">
          {COLOR_OPTIONS.map(({ key, bg, hover }) => (
            <button
              key={key}
              onClick={() => handleAction(() => onChangeColor(nodeId, key))}
              className={`
                w-7 h-7 rounded-full transition-all
                ${bg} ${hover}
                ${currentColor === key ? 'ring-2 ring-gray-500 ring-offset-2 scale-110' : ''}
              `}
              title={key}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ContextMenu;

import React, { useState, useRef, useEffect } from 'react';
import { X, MessageSquare, Send } from 'lucide-react';

const CommentPopover = ({
  isOpen,
  onClose,
  comment,
  onSave,
  position,
  nodeColor = 'blue'
}) => {
  const [text, setText] = useState(comment || '');
  const [isEditing, setIsEditing] = useState(!comment);
  const textareaRef = useRef(null);
  const popoverRef = useRef(null);

  // Sincronizar texto con prop
  useEffect(() => {
    setText(comment || '');
    setIsEditing(!comment);
  }, [comment, isOpen]);

  // Focus en textarea cuando se abre en modo edición
  useEffect(() => {
    if (isOpen && isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen, isEditing]);

  // Cerrar con ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };

    if (isOpen) {
      // Delay para evitar cerrar inmediatamente
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(text.trim());
    if (text.trim()) {
      setIsEditing(false);
    } else {
      onClose();
    }
  };

  const handleDelete = () => {
    onSave('');
    onClose();
  };

  const colorAccents = {
    blue: 'border-sky-300 bg-sky-50',
    pink: 'border-rose-300 bg-rose-50',
    green: 'border-emerald-300 bg-emerald-50',
    yellow: 'border-amber-300 bg-amber-50'
  };

  return (
    <div
      ref={popoverRef}
      className="
        absolute z-50
        w-72 bg-white rounded-xl shadow-2xl
        border border-gray-200
        animate-in fade-in zoom-in-95 duration-200
        overflow-hidden
      "
      style={{
        left: position.x,
        top: position.y,
        transform: 'translateX(-50%)'
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${colorAccents[nodeColor] || colorAccents.blue}`}>
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Comentario</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/50 rounded-lg transition-colors"
        >
          <X size={16} className="text-gray-500" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escribe un comentario..."
              className="
                w-full h-24 p-3 text-sm
                border border-gray-200 rounded-lg
                resize-none outline-none
                focus:border-blue-400 focus:ring-2 focus:ring-blue-100
                transition-all
              "
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="
                  px-3 py-1.5 text-sm font-medium
                  text-gray-600 hover:bg-gray-100
                  rounded-lg transition-colors
                "
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!text.trim()}
                className="
                  px-3 py-1.5 text-sm font-medium
                  bg-blue-500 hover:bg-blue-600 text-white
                  rounded-lg transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center gap-1.5
                "
              >
                <Send size={14} />
                Guardar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {comment}
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={handleDelete}
                className="
                  px-3 py-1.5 text-sm font-medium
                  text-red-500 hover:bg-red-50
                  rounded-lg transition-colors
                "
              >
                Eliminar
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="
                  px-3 py-1.5 text-sm font-medium
                  text-blue-600 hover:bg-blue-50
                  rounded-lg transition-colors
                "
              >
                Editar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentPopover;

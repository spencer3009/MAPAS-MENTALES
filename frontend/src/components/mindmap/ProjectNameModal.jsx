import React, { useState, useRef, useEffect } from 'react';
import { FileText, X } from 'lucide-react';

const ProjectNameModal = ({
  isOpen,
  initialName = '',
  title = 'Nuevo Proyecto',
  subtitle = 'Ingresa un nombre para tu mapa mental',
  confirmText = 'Crear',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel
}) => {
  const [name, setName] = useState(initialName);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      // Focus con pequeño delay para permitir animación
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName) {
      onConfirm(trimmedName);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FileText className="text-blue-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              <p className="text-xs text-gray-500">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del proyecto
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mi mapa mental..."
              className="
                w-full px-4 py-3 rounded-xl
                border-2 border-gray-200
                focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                outline-none transition-all
                text-gray-900 placeholder:text-gray-400
              "
              maxLength={50}
            />
            <p className="mt-2 text-xs text-gray-400 text-right">
              {name.length}/50 caracteres
            </p>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-5 pt-0">
            <button
              type="button"
              onClick={onCancel}
              className="
                flex-1 py-2.5 px-4 rounded-xl
                bg-gray-100 hover:bg-gray-200
                text-gray-700 font-medium
                transition-colors
              "
            >
              {cancelText}
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="
                flex-1 py-2.5 px-4 rounded-xl
                bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300
                text-white font-medium
                transition-colors
              "
            >
              {confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectNameModal;

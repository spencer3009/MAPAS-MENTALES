import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Copy, X, AlertCircle, Check } from 'lucide-react';

/**
 * Modal para duplicar un proyecto con validación de nombre en tiempo real.
 * Permite al usuario personalizar el nombre de la copia antes de crearla.
 */
const DuplicateProjectModal = ({
  isOpen,
  originalName = '',
  existingNames = [],
  onConfirm,
  onCancel,
  isLoading = false
}) => {
  // Generar nombre sugerido para la copia
  const suggestedName = useMemo(() => {
    const baseCopyName = `${originalName} - copia`;
    const existingNamesLower = existingNames.map(n => n.toLowerCase());
    
    if (!existingNamesLower.includes(baseCopyName.toLowerCase())) {
      return baseCopyName;
    }
    
    let copyNumber = 2;
    while (existingNamesLower.includes(`${baseCopyName} ${copyNumber}`.toLowerCase())) {
      copyNumber++;
    }
    
    return `${baseCopyName} ${copyNumber}`;
  }, [originalName, existingNames]);

  const [name, setName] = useState(suggestedName);
  const inputRef = useRef(null);

  // Validación en tiempo real
  const validation = useMemo(() => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      return { isValid: false, error: null };
    }
    
    if (trimmedName.length > 50) {
      return { isValid: false, error: 'El nombre no puede exceder 50 caracteres' };
    }
    
    // Verificar si el nombre ya existe (case-insensitive)
    const existsAlready = existingNames.some(
      existing => existing.toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (existsAlready) {
      return { isValid: false, error: 'Ya existe un mapa con este nombre' };
    }
    
    return { isValid: true, error: null };
  }, [name, existingNames]);

  useEffect(() => {
    if (isOpen) {
      setName(suggestedName);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen, suggestedName]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isLoading) {
      onCancel();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validation.isValid && !isLoading) {
      onConfirm(name.trim());
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && !isLoading) {
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
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Copy className="text-purple-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Duplicar mapa</h2>
              <p className="text-xs text-gray-500">Crear una copia de "{originalName}"</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del nuevo mapa
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre de la copia..."
                disabled={isLoading}
                className={`
                  w-full px-4 py-3 rounded-xl
                  border-2 transition-all outline-none
                  text-gray-900 placeholder:text-gray-400
                  disabled:bg-gray-50 disabled:cursor-not-allowed
                  ${validation.error 
                    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100' 
                    : validation.isValid && name.trim()
                      ? 'border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-100'
                      : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                  }
                `}
                maxLength={50}
              />
              {/* Indicador de validación */}
              {name.trim() && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {validation.isValid ? (
                    <Check size={18} className="text-green-500" />
                  ) : (
                    <AlertCircle size={18} className="text-red-500" />
                  )}
                </div>
              )}
            </div>
            
            {/* Mensaje de error o contador */}
            <div className="mt-2 flex items-center justify-between">
              {validation.error ? (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {validation.error}
                </p>
              ) : (
                <p className="text-xs text-gray-400">
                  La copia incluirá todos los nodos y conexiones
                </p>
              )}
              <p className="text-xs text-gray-400">
                {name.length}/50
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-5 pt-0">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="
                flex-1 py-2.5 px-4 rounded-xl
                bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50
                text-gray-700 font-medium
                transition-colors disabled:cursor-not-allowed
              "
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!validation.isValid || isLoading}
              className="
                flex-1 py-2.5 px-4 rounded-xl
                bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300
                text-white font-medium
                transition-colors disabled:cursor-not-allowed
                flex items-center justify-center gap-2
              "
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Crear copia
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DuplicateProjectModal;

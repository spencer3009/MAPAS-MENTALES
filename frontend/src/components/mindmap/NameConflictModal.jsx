import React, { useState } from 'react';
import { X, RefreshCw, Pencil, AlertTriangle } from 'lucide-react';

/**
 * Modal para manejar conflictos de nombres de proyectos duplicados.
 * Ofrece 3 opciones: Reemplazar, Cambiar nombre, o Cancelar.
 */
const NameConflictModal = ({ 
  isOpen, 
  onClose, 
  conflictingName,
  existingProjectId,
  onReplace,
  onRename,
  isLoading = false
}) => {
  const [newName, setNewName] = useState('');
  const [showRenameInput, setShowRenameInput] = useState(false);

  if (!isOpen) return null;

  const handleReplace = () => {
    if (onReplace && existingProjectId) {
      onReplace(existingProjectId);
    }
  };

  const handleRename = () => {
    if (showRenameInput) {
      if (newName.trim() && onRename) {
        onRename(newName.trim());
        setNewName('');
        setShowRenameInput(false);
      }
    } else {
      setShowRenameInput(true);
      // Sugerir un nombre alternativo
      setNewName(`${conflictingName} (2)`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && newName.trim()) {
      handleRename();
    } else if (e.key === 'Escape') {
      setShowRenameInput(false);
      setNewName('');
    }
  };

  const handleClose = () => {
    setNewName('');
    setShowRenameInput(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header con ícono de advertencia */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-5 border-b border-amber-100">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                Ya existe un mapa con este nombre
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                El mapa "<span className="font-medium text-amber-700">{conflictingName}</span>" ya existe en tu cuenta.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 hover:bg-amber-200/50 rounded-lg transition-colors"
              disabled={isLoading}
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            ¿Qué te gustaría hacer?
          </p>

          {/* Input de renombrar (condicional) */}
          {showRenameInput && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Nuevo nombre:
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Escribe un nuevo nombre..."
                autoFocus
                disabled={isLoading}
              />
            </div>
          )}

          {/* Botones de acción */}
          <div className="space-y-3">
            {/* Botón Reemplazar */}
            <button
              onClick={handleReplace}
              disabled={isLoading || showRenameInput}
              className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                showRenameInput 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
              }`}
            >
              <RefreshCw className="w-5 h-5" />
              <span>Reemplazar mapa existente</span>
            </button>

            {/* Botón Cambiar nombre */}
            <button
              onClick={handleRename}
              disabled={isLoading || (showRenameInput && !newName.trim())}
              className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                isLoading || (showRenameInput && !newName.trim())
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              <Pencil className="w-5 h-5" />
              <span>{showRenameInput ? 'Guardar con este nombre' : 'Cambiar nombre'}</span>
            </button>

            {/* Botón Cancelar */}
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="w-full px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-all"
            >
              Cancelar
            </button>
          </div>

          {/* Nota informativa */}
          <p className="text-xs text-gray-400 text-center pt-2">
            Reemplazar eliminará el contenido actual del mapa existente.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NameConflictModal;

import React, { useState, useRef, useEffect } from 'react';
import { X, Link2, Plus, ExternalLink, Copy, Trash2, Check, Edit2 } from 'lucide-react';

const LinkPopover = ({
  isOpen,
  onClose,
  links = [],
  onAddLink,
  onRemoveLink,
  onUpdateLink,
  position
}) => {
  const [newUrl, setNewUrl] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editUrl, setEditUrl] = useState('');
  const [copied, setCopied] = useState(null);
  const inputRef = useRef(null);
  const popoverRef = useRef(null);

  // Focus en input cuando se abre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Cerrar con ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (editingIndex !== null) {
          setEditingIndex(null);
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose, editingIndex]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };

    if (isOpen) {
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

  const validateUrl = (url) => {
    if (!url.trim()) return false;
    // Agregar https:// si no tiene protocolo
    if (!/^https?:\/\//i.test(url)) {
      return `https://${url}`;
    }
    return url;
  };

  const handleAddLink = () => {
    const validatedUrl = validateUrl(newUrl);
    if (validatedUrl) {
      onAddLink(validatedUrl);
      setNewUrl('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddLink();
    }
  };

  const handleCopyLink = async (url, index) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(index);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Error copying link:', err);
    }
  };

  const handleOpenLink = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleStartEdit = (index, url) => {
    setEditingIndex(index);
    setEditUrl(url);
  };

  const handleSaveEdit = (index) => {
    const validatedUrl = validateUrl(editUrl);
    if (validatedUrl) {
      onUpdateLink(index, validatedUrl);
    }
    setEditingIndex(null);
    setEditUrl('');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditUrl('');
  };

  // Extraer dominio para mostrar
  const getDomain = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  // Obtener favicon
  const getFavicon = (url) => {
    try {
      const urlObj = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
    } catch {
      return null;
    }
  };

  return (
    <div
      ref={popoverRef}
      className="
        absolute z-50
        w-80 bg-white rounded-xl shadow-2xl
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
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 rounded-lg">
            <Link2 size={14} className="text-blue-600" />
          </div>
          <span className="text-sm font-medium text-gray-700">
            Enlaces {links.length > 0 && `(${links.length})`}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={16} className="text-gray-500" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Campo para agregar nuevo enlace */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Agregar enlace
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Introduce tu enlace"
                className="
                  w-full pl-9 pr-3 py-2.5 text-sm
                  border border-gray-200 rounded-lg
                  outline-none
                  focus:border-blue-400 focus:ring-2 focus:ring-blue-100
                  transition-all
                  placeholder:text-gray-400
                "
              />
            </div>
            <button
              onClick={handleAddLink}
              disabled={!newUrl.trim()}
              className="
                px-4 py-2.5 text-sm font-medium
                bg-blue-500 hover:bg-blue-600 text-white
                rounded-lg transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center gap-1.5
                shrink-0
              "
            >
              <Plus size={16} />
              Agregar
            </button>
          </div>
        </div>

        {/* Lista de enlaces existentes */}
        {links.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Enlaces guardados
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {links.map((link, index) => (
                <div
                  key={index}
                  className="
                    p-3 bg-gray-50 rounded-xl border border-gray-100
                    hover:bg-gray-100 transition-colors
                    group
                  "
                >
                  {editingIndex === index ? (
                    // Modo edición
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editUrl}
                        onChange={(e) => setEditUrl(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(index)}
                        className="
                          w-full px-3 py-2 text-sm
                          border border-gray-200 rounded-lg
                          outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100
                        "
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={handleCancelEdit}
                          className="px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-lg"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleSaveEdit(index)}
                          className="px-2.5 py-1.5 text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 rounded-lg"
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Modo visualización
                    <div className="flex items-center gap-3">
                      {/* Favicon */}
                      <div className="shrink-0 w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-gray-200 overflow-hidden">
                        {getFavicon(link) ? (
                          <img 
                            src={getFavicon(link)} 
                            alt="" 
                            className="w-4 h-4"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <Link2 size={14} className="text-gray-400" />
                        )}
                      </div>
                      
                      {/* URL */}
                      <div className="flex-1 min-w-0">
                        <p 
                          className="text-sm font-medium text-gray-700 truncate cursor-pointer hover:text-blue-600"
                          onClick={() => handleOpenLink(link)}
                          title={link}
                        >
                          {getDomain(link)}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{link}</p>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenLink(link)}
                          className="p-1.5 hover:bg-white rounded-lg transition-colors"
                          title="Abrir enlace"
                        >
                          <ExternalLink size={14} className="text-gray-500" />
                        </button>
                        <button
                          onClick={() => handleCopyLink(link, index)}
                          className="p-1.5 hover:bg-white rounded-lg transition-colors"
                          title="Copiar enlace"
                        >
                          {copied === index ? (
                            <Check size={14} className="text-green-500" />
                          ) : (
                            <Copy size={14} className="text-gray-500" />
                          )}
                        </button>
                        <button
                          onClick={() => handleStartEdit(index, link)}
                          className="p-1.5 hover:bg-white rounded-lg transition-colors"
                          title="Editar enlace"
                        >
                          <Edit2 size={14} className="text-gray-500" />
                        </button>
                        <button
                          onClick={() => onRemoveLink(index)}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar enlace"
                        >
                          <Trash2 size={14} className="text-red-500" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estado vacío */}
        {links.length === 0 && (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-2">
              <Link2 size={20} className="text-gray-400" />
            </div>
            <p className="text-xs text-gray-500">
              Agrega enlaces externos a este nodo
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
        <p className="text-[10px] text-gray-400 text-center">
          💡 Haz clic en un enlace para abrirlo en nueva pestaña
        </p>
      </div>
    </div>
  );
};

export default LinkPopover;

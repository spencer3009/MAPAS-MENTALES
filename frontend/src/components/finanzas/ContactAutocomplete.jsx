import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Search, User } from 'lucide-react';

const API_URL = '';

/**
 * ContactAutocomplete - Campo de búsqueda inteligente para seleccionar un contacto
 * 
 * Props:
 * - token: JWT token para autenticación
 * - value: Objeto del contacto seleccionado { id, name, email?, phone?, company? }
 * - onChange: Callback cuando se selecciona o elimina un contacto (recibe el contacto o null)
 * - placeholder: Texto del placeholder
 * - label: Label del campo
 * - className: Clases adicionales
 * - focusColor: Color del anillo de focus (emerald, red, blue, etc.)
 */
const ContactAutocomplete = ({ 
  token, 
  value, 
  onChange, 
  placeholder = "Buscar cliente...",
  label = "Cliente",
  className = "",
  focusColor = "emerald"
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  // Focus colors mapping
  const focusColors = {
    emerald: 'focus:ring-emerald-500 focus:border-emerald-500',
    red: 'focus:ring-red-500 focus:border-red-500',
    blue: 'focus:ring-blue-500 focus:border-blue-500',
    purple: 'focus:ring-purple-500 focus:border-purple-500',
  };

  const ringColor = focusColors[focusColor] || focusColors.emerald;

  // Búsqueda de contactos con debounce
  const searchContacts = useCallback(async (query) => {
    if (!query || query.length < 1) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/contacts/search?q=${encodeURIComponent(query)}&limit=8`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.contacts || []);
      }
    } catch (error) {
      console.error('Error searching contacts:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchTerm && !value) {
      debounceRef.current = setTimeout(() => {
        searchContacts(searchTerm);
      }, 300);
    } else {
      setSuggestions([]);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm, searchContacts, value]);

  // Cerrar dropdown al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Seleccionar contacto
  const handleSelect = (contact) => {
    onChange(contact);
    setSearchTerm('');
    setSuggestions([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  // Eliminar contacto seleccionado
  const handleRemove = () => {
    onChange(null);
    setSearchTerm('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Manejo de teclado
  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      default:
        break;
    }
  };

  // Renderizar chip del contacto seleccionado
  if (value) {
    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <div className={`flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50`}>
          <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            <User size={14} className="text-blue-600" />
            <span>{value.name}</span>
            {value.company && (
              <span className="text-blue-600 text-xs">({value.company})</span>
            )}
            <button
              type="button"
              onClick={handleRemove}
              className="ml-1 p-0.5 hover:bg-blue-200 rounded-full transition-colors"
              aria-label="Eliminar contacto"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        <Search 
          size={16} 
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" 
        />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => {
            if (searchTerm || suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${ringColor} transition-all`}
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Dropdown de sugerencias */}
      {isOpen && suggestions.length > 0 && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((contact, index) => (
            <button
              key={contact.id}
              type="button"
              onClick={() => handleSelect(contact)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`w-full px-4 py-3 text-left flex items-start gap-3 transition-colors ${
                index === highlightedIndex 
                  ? 'bg-blue-50' 
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <User size={16} className="text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {contact.name}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {contact.email && (
                    <span className="truncate">{contact.email}</span>
                  )}
                  {contact.email && contact.phone && <span>•</span>}
                  {contact.phone && (
                    <span>{contact.phone}</span>
                  )}
                </div>
                {contact.company && (
                  <p className="text-xs text-gray-400 mt-0.5">{contact.company}</p>
                )}
              </div>
              <span className="flex-shrink-0 text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                {contact.contact_type === 'client' ? 'Cliente' : 
                 contact.contact_type === 'provider' ? 'Proveedor' : 'Contacto'}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Mensaje cuando no hay resultados */}
      {isOpen && searchTerm && !loading && suggestions.length === 0 && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500 text-sm"
        >
          No se encontraron contactos para "{searchTerm}"
        </div>
      )}
    </div>
  );
};

export default ContactAutocomplete;

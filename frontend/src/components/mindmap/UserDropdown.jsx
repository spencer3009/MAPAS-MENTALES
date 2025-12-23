import React, { useState, useRef, useEffect } from 'react';
import { User, Settings, LogOut, ChevronDown } from 'lucide-react';

const UserDropdown = ({ user, onOpenProfile, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cerrar con Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Obtener iniciales del usuario
  const getInitials = () => {
    if (!user) return '?';
    
    const fullName = user.full_name || user.nombre || user.username || '';
    if (!fullName) return user.username?.charAt(0).toUpperCase() || '?';
    
    const names = fullName.trim().split(' ');
    if (names.length >= 2) {
      return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
    }
    return fullName.charAt(0).toUpperCase();
  };

  // Obtener nombre para mostrar
  const getDisplayName = () => {
    if (!user) return 'Usuario';
    return user.full_name || user.nombre || user.username || 'Usuario';
  };

  // Obtener username o email
  const getSubtitle = () => {
    if (!user) return '';
    if (user.email) return user.email;
    if (user.username) return `@${user.username}`;
    return '';
  };

  // Generar color basado en el nombre
  const getAvatarColor = () => {
    const name = user?.username || user?.full_name || 'user';
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-cyan-500'
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (!user) return null;

  return (
    <div className="relative">
      {/* Avatar Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 p-1.5 rounded-xl
          transition-all duration-200
          ${isOpen 
            ? 'bg-gray-100' 
            : 'hover:bg-gray-50'
          }
        `}
        title={getDisplayName()}
      >
        {/* Avatar */}
        <div className={`
          w-9 h-9 rounded-full flex items-center justify-center
          text-white text-sm font-semibold
          ${getAvatarColor()}
          shadow-sm
        `}>
          {user.avatar ? (
            <img 
              src={user.avatar} 
              alt={getDisplayName()}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            getInitials()
          )}
        </div>
        
        {/* Chevron - solo en desktop */}
        <ChevronDown 
          size={16} 
          className={`
            hidden sm:block text-gray-400
            transition-transform duration-200
            ${isOpen ? 'rotate-180' : ''}
          `}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="
            absolute right-0 top-full mt-2
            w-64 sm:w-72
            bg-white rounded-xl shadow-xl
            border border-gray-200
            overflow-hidden
            z-[100]
            animate-in fade-in slide-in-from-top-2
            duration-200
          "
        >
          {/* User Info Header */}
          <div className="
            px-4 py-4
            bg-gradient-to-r from-gray-50 to-blue-50
            border-b border-gray-100
          ">
            <div className="flex items-center gap-3">
              {/* Avatar grande */}
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center
                text-white text-lg font-semibold
                ${getAvatarColor()}
                shadow-md
              `}>
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={getDisplayName()}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  getInitials()
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {getDisplayName()}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {getSubtitle()}
                </p>
              </div>
            </div>
          </div>

          {/* Menu Options */}
          <div className="py-2">
            {/* Configuración / Perfil */}
            <button
              onClick={() => {
                setIsOpen(false);
                if (onOpenProfile) onOpenProfile();
              }}
              className="
                w-full px-4 py-2.5
                flex items-center gap-3
                text-sm text-gray-700
                hover:bg-gray-50
                transition-colors
              "
            >
              <div className="
                w-8 h-8 rounded-lg
                bg-blue-50 text-blue-600
                flex items-center justify-center
              ">
                <Settings size={16} />
              </div>
              <div className="text-left">
                <p className="font-medium">Configuración</p>
                <p className="text-xs text-gray-400">Perfil, notificaciones, cuenta</p>
              </div>
            </button>

            {/* Divider */}
            <div className="my-2 border-t border-gray-100" />

            {/* Cerrar sesión */}
            <button
              onClick={() => {
                setIsOpen(false);
                if (onLogout) onLogout();
              }}
              className="
                w-full px-4 py-2.5
                flex items-center gap-3
                text-sm text-red-600
                hover:bg-red-50
                transition-colors
              "
            >
              <div className="
                w-8 h-8 rounded-lg
                bg-red-50 text-red-500
                flex items-center justify-center
              ">
                <LogOut size={16} />
              </div>
              <div className="text-left">
                <p className="font-medium">Cerrar sesión</p>
                <p className="text-xs text-red-400">Salir de tu cuenta</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDropdown;

import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  X, 
  LayoutDashboard, 
  Network, 
  Star, 
  Bell, 
  Trash2, 
  Settings,
  LogOut,
  LayoutGrid,
  Users,
  ChevronRight,
  FolderOpen
} from 'lucide-react';

/**
 * Componente de navegación móvil con menú hamburguesa
 * Se muestra solo en pantallas pequeñas (< md breakpoint)
 */
const MobileNavigation = ({ 
  onOpenDashboard,
  onOpenProjects,
  onOpenFavorites,
  onOpenReminders,
  onOpenTrash,
  onOpenSettings,
  onOpenBoards,
  onOpenContacts,
  onLogout,
  activeView = 'projects',
  trashCount = 0,
  projectName = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Cerrar menú al cambiar de vista
  useEffect(() => {
    setIsOpen(false);
  }, [activeView]);

  // Prevenir scroll del body cuando el menú está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const menuItems = [
    {
      id: 'dashboard',
      icon: LayoutDashboard,
      label: 'Panel',
      onClick: onOpenDashboard,
    },
    {
      id: 'projects',
      icon: Network,
      label: 'Mis Mapas',
      onClick: onOpenProjects,
    },
    {
      id: 'boards',
      icon: LayoutGrid,
      label: 'Tableros',
      onClick: onOpenBoards,
    },
    {
      id: 'contacts',
      icon: Users,
      label: 'Contactos',
      onClick: onOpenContacts,
    },
    {
      id: 'favorites',
      icon: Star,
      label: 'Favoritos',
      onClick: onOpenFavorites,
    },
    {
      id: 'reminders',
      icon: Bell,
      label: 'Recordatorios',
      onClick: onOpenReminders,
    },
    {
      id: 'trash',
      icon: Trash2,
      label: 'Papelera',
      onClick: onOpenTrash,
      badge: trashCount > 0 ? trashCount : null,
    },
    {
      id: 'settings',
      icon: Settings,
      label: 'Configuración',
      onClick: onOpenSettings,
    },
  ];

  const handleItemClick = (item) => {
    item.onClick();
    setIsOpen(false);
  };

  // Obtener el label de la vista activa
  const getActiveViewLabel = () => {
    const item = menuItems.find(i => i.id === activeView);
    if (activeView === 'projects' && projectName) {
      return projectName.length > 20 ? projectName.substring(0, 20) + '...' : projectName;
    }
    return item?.label || 'MinDora';
  };

  return (
    <>
      {/* Header móvil fijo */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-slate-800 shadow-lg">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Botón hamburguesa */}
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 -ml-2 rounded-lg text-white hover:bg-slate-700 active:bg-slate-600 transition-colors"
            aria-label="Abrir menú"
          >
            <Menu size={24} />
          </button>

          {/* Título de la vista actual */}
          <h1 className="text-white font-semibold text-base truncate max-w-[200px]">
            {getActiveViewLabel()}
          </h1>

          {/* Logo o espacio */}
          <div className="w-10 h-10 flex items-center justify-center">
            <span className="text-blue-400 font-bold text-lg">M</span>
          </div>
        </div>
      </header>

      {/* Overlay oscuro */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 z-[60] transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer lateral */}
      <nav 
        className={`
          md:hidden fixed top-0 left-0 bottom-0 z-[70]
          w-72 bg-gradient-to-b from-slate-800 to-slate-900
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          shadow-2xl
        `}
      >
        {/* Header del drawer */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-slate-700">
          <span className="text-white font-bold text-xl">MinDora</span>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            aria-label="Cerrar menú"
          >
            <X size={24} />
          </button>
        </div>

        {/* Items del menú */}
        <div className="py-4 px-3 space-y-1 overflow-y-auto max-h-[calc(100vh-120px)]">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`
                  w-full flex items-center gap-4
                  py-3.5 px-4 rounded-xl
                  transition-all duration-200
                  ${isActive 
                    ? 'bg-blue-600/20 text-blue-400' 
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white active:bg-slate-700'
                  }
                `}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 w-1 h-8 bg-blue-500 rounded-r-full" />
                )}
                
                <Icon size={22} className="shrink-0" />
                
                <span className="text-base font-medium flex-1 text-left">
                  {item.label}
                </span>

                {/* Badge */}
                {item.badge && (
                  <span className="min-w-[22px] h-[22px] px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}

                <ChevronRight size={18} className="text-slate-500" />
              </button>
            );
          })}
        </div>

        {/* Footer con logout */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-700/50 bg-slate-900/50">
          <button
            onClick={() => {
              onLogout();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-4 py-3.5 px-4 rounded-xl text-slate-400 hover:bg-red-500/20 hover:text-red-400 active:bg-red-500/30 transition-colors"
          >
            <LogOut size={22} />
            <span className="text-base font-medium">Cerrar sesión</span>
          </button>
        </div>
      </nav>

      {/* Espaciador para el contenido (evita que el header tape contenido) */}
      <div className="md:hidden h-14" />
    </>
  );
};

export default MobileNavigation;

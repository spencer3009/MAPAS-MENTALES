import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Network, 
  Star, 
  Bell, 
  Trash2, 
  Settings,
  ChevronRight,
  LogOut,
  LayoutGrid,
  Users,
  MessageSquare,
  Shield,
  DollarSign,
  Building2,
  UserCog
} from 'lucide-react';
import GlobalCompanySelector from '../common/GlobalCompanySelector';
import { useCompany } from '../../contexts/CompanyContext';

const DockSidebar = ({ 
  onToggleProjectsSidebar,
  onOpenDashboard,
  onOpenFavorites,
  onOpenReminders,
  onOpenTrash,
  onOpenSettings,
  onOpenBoards,
  onOpenContacts,
  onOpenWhatsApp,
  onOpenFinanzas,
  onLogout,
  isProjectsSidebarOpen = true,
  activeView = 'projects',
  trashCount = 0,
  isAdmin = false,
  onAdminClick,
  token
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Determinar si estamos en la vista de proyectos
  const isInProjectsView = activeView === 'projects';
  
  // El sidebar está expandido si:
  // - NO estamos en la vista de proyectos (siempre expandido)
  // - O si estamos en proyectos Y el mouse está encima (hover)
  const isExpanded = !isInProjectsView || isHovered;

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
      onClick: onToggleProjectsSidebar,
    },
    {
      id: 'boards',
      icon: LayoutGrid,
      label: 'Tableros',
      onClick: onOpenBoards,
      highlight: true,
    },
    {
      id: 'contacts',
      icon: Users,
      label: 'Contactos',
      onClick: onOpenContacts,
    },
    {
      id: 'finanzas',
      icon: DollarSign,
      label: 'Finanzas',
      onClick: onOpenFinanzas,
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
    // Panel de Admin - solo visible para administradores
    ...(isAdmin && onAdminClick ? [{
      id: 'admin',
      icon: Shield,
      label: 'Panel Admin',
      onClick: onAdminClick,
      adminOnly: true,
    }] : []),
    {
      id: 'settings',
      icon: Settings,
      label: 'Configuración',
      onClick: onOpenSettings,
    },
  ];

  return (
    <div
      className={`
        hidden md:flex flex-col
        h-full z-30
        transition-all duration-300 ease-in-out
        ${isExpanded ? 'w-52' : 'w-16'}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Dock Container */}
      <div 
        className={`
          h-full flex flex-col
          bg-gradient-to-b from-slate-800 to-slate-900
          border-r border-slate-700/50
          shadow-xl
          transition-all duration-300 ease-in-out
          ${isExpanded ? 'w-52' : 'w-16'}
        `}
      >
        {/* Company Selector - Global */}
        <div className={`
          px-2 py-3 border-b border-slate-700/50
          transition-all duration-300
          ${isExpanded ? 'opacity-100' : 'opacity-0 h-0 py-0 overflow-hidden'}
        `}>
          {isExpanded && token && (
            <GlobalCompanySelector token={token} />
          )}
        </div>

        {/* Collapsed company icon */}
        {!isExpanded && (
          <div className="px-3 py-3 border-b border-slate-700/50">
            <div className="w-10 h-10 bg-slate-700/50 rounded-lg flex items-center justify-center">
              <Building2 size={20} className="text-emerald-400" />
            </div>
          </div>
        )}

        {/* Menu Items */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            // Solo UN ítem puede estar activo: el que coincide con activeView
            const isActive = activeView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`
                  w-full flex items-center gap-3
                  py-3 px-3 rounded-xl
                  transition-all duration-200
                  group relative
                  ${isActive 
                    ? 'bg-blue-600/20 text-blue-400' 
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                  }
                `}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full" />
                )}
                
                <Icon 
                  size={22} 
                  className={`
                    shrink-0 transition-transform duration-200
                    ${isActive ? 'text-blue-400' : 'group-hover:scale-110'}
                  `}
                />
                
                <span className={`
                  text-sm font-medium whitespace-nowrap
                  transition-all duration-300
                  ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 absolute'}
                `}>
                  {item.label}
                </span>

                {/* Badge para contador (ej: Papelera) */}
                {item.badge && (
                  <span className={`
                    min-w-[18px] h-[18px] px-1 
                    bg-red-500 text-white text-xs font-bold 
                    rounded-full flex items-center justify-center
                    ${isExpanded ? 'ml-auto' : 'absolute -top-1 -right-1'}
                  `}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}

                {/* Expand indicator for Projects */}
                {item.id === 'projects' && isExpanded && (
                  <ChevronRight 
                    size={16} 
                    className={`
                      ml-auto transition-transform duration-200
                      ${isProjectsSidebarOpen ? 'rotate-180' : ''}
                    `}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-2 border-t border-slate-700/50">
          <button
            onClick={onLogout}
            className={`
              w-full flex items-center gap-3
              py-3 px-3 rounded-xl
              transition-all duration-200
              text-slate-400 hover:bg-red-500/20 hover:text-red-400
              group
            `}
          >
            <LogOut 
              size={22} 
              className="shrink-0 transition-transform duration-200 group-hover:scale-110"
            />
            
            <span className={`
              text-sm font-medium whitespace-nowrap
              transition-all duration-300
              ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 absolute'}
            `}>
              Cerrar sesión
            </span>
          </button>
        </div>

        {/* Bottom decoration */}
        <div className="px-4 pb-3 pt-1">
          <div className={`
            text-xs text-slate-500 text-center
            transition-all duration-300
            ${isExpanded ? 'opacity-100' : 'opacity-0'}
          `}>
            v1.0
          </div>
        </div>
      </div>
    </div>
  );
};

export default DockSidebar;

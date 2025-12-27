import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  FolderKanban, 
  LayoutTemplate, 
  Bell, 
  Trash2, 
  Settings,
  ChevronRight,
  LogOut
} from 'lucide-react';

const DockSidebar = ({ 
  onToggleProjectsSidebar,
  onOpenDashboard,
  onOpenTemplates,
  onOpenReminders,
  onOpenTrash,
  onOpenSettings,
  onLogout,
  isProjectsSidebarOpen = true,
  activeView = 'projects',
  trashCount = 0
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const menuItems = [
    {
      id: 'dashboard',
      icon: LayoutDashboard,
      label: 'Panel',
      onClick: onOpenDashboard,
    },
    {
      id: 'projects',
      icon: FolderKanban,
      label: 'Proyectos',
      onClick: onToggleProjectsSidebar,
      isActive: isProjectsSidebarOpen,
    },
    {
      id: 'templates',
      icon: LayoutTemplate,
      label: 'Plantillas',
      onClick: onOpenTemplates,
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

  return (
    <div
      className={`
        hidden md:flex flex-col
        h-full z-30
        transition-all duration-300 ease-in-out
        ${isExpanded ? 'w-52' : 'w-16'}
      `}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
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
        {/* Menu Items */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id || item.isActive;
            
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

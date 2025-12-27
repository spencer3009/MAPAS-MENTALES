import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  FolderKanban, 
  LayoutTemplate, 
  Bell, 
  Trash2, 
  Settings,
  ChevronRight
} from 'lucide-react';

// URL del logo MindoraMap
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_mindviz-app/artifacts/k1kioask_image.png';

const DockSidebar = ({ 
  onToggleProjectsSidebar,
  onOpenDashboard,
  onOpenTemplates,
  onOpenReminders,
  onOpenIntegrations,
  onOpenSettings,
  isProjectsSidebarOpen = true,
  activeView = 'projects'
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
      id: 'integrations',
      icon: Puzzle,
      label: 'Integraciones',
      onClick: onOpenIntegrations,
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
        {/* Logo / Brand Area */}
        <div className="h-16 flex items-center justify-center border-b border-slate-700/50 overflow-hidden">
          <div className={`
            flex items-center gap-2 overflow-hidden
            transition-all duration-300
            ${isExpanded ? 'px-3' : 'px-0'}
          `}>
            <img 
              src={LOGO_URL} 
              alt="MindoraMap" 
              className={`
                object-contain transition-all duration-300
                ${isExpanded ? 'h-10' : 'h-8 w-8 rounded-lg'}
              `}
              style={!isExpanded ? { objectFit: 'cover', objectPosition: 'left' } : {}}
            />
          </div>
        </div>

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

        {/* Bottom decoration */}
        <div className="p-4 border-t border-slate-700/50">
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

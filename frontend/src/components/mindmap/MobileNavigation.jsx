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
  FolderOpen,
  Download,
  Smartphone,
  Share2,
  CheckCircle2,
  MessageSquare,
  Shield,
  DollarSign
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

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
  onOpenWhatsApp,
  onOpenFinanzas,
  onLogout,
  activeView = 'projects',
  trashCount = 0,
  projectName = '',
  onDrawerStateChange, // Callback para notificar cambios en el estado del drawer
  isAdmin = false,
  onAdminClick
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  
  // Hook de PWA para detectar si se puede instalar
  const { showInstallButton, isIOS, promptInstall } = usePWAInstall();

  // Notificar cambios en el estado del drawer al padre
  useEffect(() => {
    if (onDrawerStateChange) {
      onDrawerStateChange(isOpen);
    }
  }, [isOpen, onDrawerStateChange]);

  // Handler para instalar PWA
  const handleInstallClick = async () => {
    const result = await promptInstall();
    if (result === 'ios' || result === 'unsupported') {
      setShowIOSModal(true);
    } else if (result === 'accepted') {
      setIsOpen(false);
    }
  };

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
        <div className="py-4 px-3 space-y-1 overflow-y-auto max-h-[calc(100vh-180px)]">
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

          {/* Botón de instalación PWA - solo si está disponible */}
          {showInstallButton && (
            <div className="pt-3 mt-3 border-t border-slate-700/50">
              <button
                onClick={handleInstallClick}
                data-testid="mobile-nav-install-button"
                className="w-full flex items-center gap-4 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600/20 to-teal-600/20 text-emerald-400 hover:from-emerald-600/30 hover:to-teal-600/30 active:from-emerald-600/40 active:to-teal-600/40 transition-all border border-emerald-500/30"
              >
                <Download size={22} className="shrink-0" />
                <div className="flex-1 text-left">
                  <span className="text-base font-medium block">Instalar Mindora</span>
                  <span className="text-xs text-emerald-400/70">Crear ícono en inicio</span>
                </div>
                <Smartphone size={18} className="text-emerald-500/70" />
              </button>
            </div>
          )}
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

      {/* Modal de instrucciones iOS para instalación */}
      {showIOSModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowIOSModal(false)}
        >
          <div 
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-6 pb-8 animate-in slide-in-from-bottom-10 duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                  <Smartphone className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {isIOS ? 'Instalar en iPhone/iPad' : 'Instalar Mindora'}
                  </h3>
                  <p className="text-sm text-gray-500">Acceso rápido desde tu inicio</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {isIOS ? (
                <>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Share2 size={20} className="text-emerald-600" />
                    </div>
                    <div className="pt-1">
                      <p className="font-semibold text-gray-900 mb-0.5">Toca el botón Compartir</p>
                      <p className="text-sm text-gray-500">En la barra inferior de Safari</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-emerald-600 font-bold">2</span>
                    </div>
                    <div className="pt-1">
                      <p className="font-semibold text-gray-900 mb-0.5">&quot;Añadir a pantalla de inicio&quot;</p>
                      <p className="text-sm text-gray-500">Desplázate y selecciona esta opción</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 size={20} className="text-emerald-600" />
                    </div>
                    <div className="pt-1">
                      <p className="font-semibold text-gray-900 mb-0.5">Confirma tocando &quot;Añadir&quot;</p>
                      <p className="text-sm text-gray-500">¡Listo! Mindora estará en tu inicio</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-emerald-600 font-bold">1</span>
                    </div>
                    <div className="pt-1">
                      <p className="font-semibold text-gray-900 mb-0.5">Abre el menú del navegador</p>
                      <p className="text-sm text-gray-500">Los tres puntos (⋮) en la esquina</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-emerald-600 font-bold">2</span>
                    </div>
                    <div className="pt-1">
                      <p className="font-semibold text-gray-900 mb-0.5">&quot;Instalar app&quot; o &quot;Agregar a inicio&quot;</p>
                      <p className="text-sm text-gray-500">Selecciona esta opción del menú</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 size={20} className="text-emerald-600" />
                    </div>
                    <div className="pt-1">
                      <p className="font-semibold text-gray-900 mb-0.5">Confirma la instalación</p>
                      <p className="text-sm text-gray-500">¡Listo! Mindora estará en tu inicio</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Espaciador para el contenido (evita que el header tape contenido) */}
      <div className="md:hidden h-14" />
    </>
  );
};

export default MobileNavigation;

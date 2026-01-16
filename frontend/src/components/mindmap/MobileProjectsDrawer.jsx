import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderOpen, 
  Plus, 
  ChevronUp, 
  ChevronDown,
  Star,
  Clock,
  X,
  Search,
  MoreHorizontal,
  Pin,
  Pencil,
  Copy,
  Bell,
  Trash2
} from 'lucide-react';

/**
 * Panel de proyectos móvil - Drawer desde abajo
 * Permite acceder a la lista de proyectos sin ocupar espacio fijo en pantalla
 */
const MobileProjectsDrawer = ({ 
  projects = [],
  activeProjectId,
  onSwitchProject,
  onNewProject,
  onClose,
  isOpen = false,
  // Nuevas props para acciones del menú contextual
  onDeleteProject,
  onDuplicateProject,
  onRenameProject,
  onProjectReminder,
  onPinProject
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null); // ID del proyecto con menú abierto
  const drawerRef = useRef(null);
  const startYRef = useRef(0);
  
  // Filtrar proyectos
  const filteredProjects = projects.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Ordenar: primero fijados, luego por fecha
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
  });

  // Cerrar al seleccionar proyecto
  const handleSelectProject = (projectId) => {
    onSwitchProject(projectId);
    onClose();
  };

  // Toggle menú de opciones
  const handleToggleMenu = (e, projectId) => {
    e.stopPropagation(); // Evitar que se seleccione el proyecto
    setOpenMenuId(openMenuId === projectId ? null : projectId);
  };

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => {
      if (openMenuId) setOpenMenuId(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

  // Acciones del menú
  const handleAction = (action, projectId, e) => {
    e.stopPropagation();
    setOpenMenuId(null);
    
    switch (action) {
      case 'pin':
        if (onPinProject) onPinProject(projectId);
        break;
      case 'rename':
        if (onRenameProject) {
          const project = projects.find(p => p.id === projectId);
          const newName = prompt('Nuevo nombre:', project?.name);
          if (newName && newName.trim()) {
            onRenameProject(projectId, newName.trim());
          }
        }
        break;
      case 'duplicate':
        if (onDuplicateProject) onDuplicateProject(projectId);
        break;
      case 'reminder':
        if (onProjectReminder) onProjectReminder(projectId);
        break;
      case 'delete':
        // Cerrar el drawer ANTES de mostrar el diálogo de confirmación
        // para que el modal de confirmación no quede detrás
        onClose();
        // Pequeño delay para que se cierre el drawer antes de mostrar el modal
        setTimeout(() => {
          if (onDeleteProject) onDeleteProject(projectId);
        }, 150);
        break;
      default:
        break;
    }
  };

  // Manejo de gestos para cerrar arrastrando hacia abajo
  const handleTouchStart = (e) => {
    if (e.target.closest('.drawer-content')) return; // No cerrar si se toca el contenido scrolleable
    startYRef.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;
    if (diff > 0) {
      setDragY(diff);
    }
  };

  const handleTouchEnd = () => {
    if (dragY > 100) {
      onClose();
    }
    setDragY(0);
    setIsDragging(false);
  };

  // Prevenir scroll del body
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setSearchQuery('');
      setOpenMenuId(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Opciones del menú contextual
  const menuOptions = [
    { id: 'pin', icon: Pin, label: 'Anclar arriba', color: 'text-amber-600' },
    { id: 'rename', icon: Pencil, label: 'Editar nombre', color: 'text-blue-600' },
    { id: 'duplicate', icon: Copy, label: 'Duplicar', color: 'text-green-600' },
    { id: 'reminder', icon: Bell, label: 'Recordatorio', color: 'text-purple-600' },
    { id: 'delete', icon: Trash2, label: 'Eliminar', color: 'text-red-600', divider: true }
  ];

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-[80] transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        ref={drawerRef}
        className="fixed left-0 right-0 bottom-0 z-[85] bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col"
        style={{ 
          transform: `translateY(${dragY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle para arrastrar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FolderOpen size={20} className="text-blue-500" />
            Mis Proyectos
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Búsqueda */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar proyecto..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white border border-transparent focus:border-blue-500/30"
            />
          </div>
        </div>

        {/* Lista de proyectos */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 drawer-content">
          {sortedProjects.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">
                {searchQuery ? 'No se encontraron proyectos' : 'No tienes proyectos aún'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedProjects.map((project) => (
                <div
                  key={project.id}
                  className="relative"
                >
                  <button
                    onClick={() => handleSelectProject(project.id)}
                    className={`
                      w-full flex items-center gap-3 p-3 rounded-xl text-left
                      transition-all duration-200
                      ${project.id === activeProjectId 
                        ? 'bg-blue-50 border-2 border-blue-500' 
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100 active:bg-gray-200'
                      }
                    `}
                  >
                    {/* Color indicator */}
                    <div 
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: project.color || '#3B82F6' }}
                    />
                    
                    {/* Nombre y metadata */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${
                        project.id === activeProjectId ? 'text-blue-700' : 'text-gray-900'
                      }`}>
                        {project.name}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Clock size={12} />
                        {project.updatedAt 
                          ? new Date(project.updatedAt).toLocaleDateString('es-PE', { 
                              day: '2-digit', 
                              month: 'short' 
                            })
                          : 'Sin fecha'
                        }
                        {project.nodes?.length > 0 && (
                          <span className="ml-2">• {project.nodes.length} nodos</span>
                        )}
                      </p>
                    </div>

                    {/* Favorito */}
                    {project.isPinned && (
                      <Star size={16} className="text-amber-500 fill-amber-500 shrink-0" />
                    )}

                    {/* Active indicator */}
                    {project.id === activeProjectId && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                    )}

                    {/* Botón de opciones (3 puntos) */}
                    <button
                      onClick={(e) => handleToggleMenu(e, project.id)}
                      className={`
                        p-2 rounded-lg transition-all duration-200 shrink-0
                        ${openMenuId === project.id 
                          ? 'bg-gray-200 text-gray-700' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 active:bg-gray-300'
                        }
                      `}
                      data-testid={`project-options-${project.id}`}
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </button>

                  {/* Menú contextual / Bottom Sheet */}
                  {openMenuId === project.id && (
                    <div 
                      className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1.5 z-[100] animate-in fade-in slide-in-from-top-2 duration-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {menuOptions.map((option, index) => (
                        <React.Fragment key={option.id}>
                          {option.divider && (
                            <div className="my-1.5 border-t border-gray-100" />
                          )}
                          <button
                            onClick={(e) => handleAction(option.id, project.id, e)}
                            className={`
                              w-full px-3 py-2.5 text-left text-sm flex items-center gap-3
                              hover:bg-gray-50 active:bg-gray-100 transition-colors
                              ${option.color}
                            `}
                          >
                            <option.icon size={16} />
                            {option.label}
                          </button>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer con botón de crear */}
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <button
            onClick={() => {
              onNewProject();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-xl transition-colors"
          >
            <Plus size={20} />
            Nuevo Proyecto
          </button>
        </div>
      </div>
    </>
  );
};

/**
 * Botón flotante para abrir el drawer de proyectos
 */
export const MobileProjectsButton = ({ onClick, projectCount = 0 }) => {
  return (
    <button
      onClick={onClick}
      className="md:hidden fixed bottom-4 left-4 z-[40] flex items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white rounded-full shadow-lg transition-all"
    >
      <FolderOpen size={20} />
      <span className="text-sm font-medium">Proyectos</span>
      {projectCount > 0 && (
        <span className="min-w-[20px] h-5 px-1.5 bg-blue-500 text-xs font-bold rounded-full flex items-center justify-center">
          {projectCount > 99 ? '99+' : projectCount}
        </span>
      )}
    </button>
  );
};

export default MobileProjectsDrawer;

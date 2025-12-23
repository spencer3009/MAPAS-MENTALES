import React, { useState, useMemo, useCallback } from 'react';
import { 
  Plus, LayoutTemplate, FileText, Trash2, Check, Pencil, 
  Bell, Pin, PinOff, GripVertical, ArrowUpDown, ExternalLink
} from 'lucide-react';

// URL del logo MindoraMap (horizontal)
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_mindviz-app/artifacts/k1kioask_image.png';

const MAX_VISIBLE_PROJECTS = 5;
const MAX_PINNED = 2;

const Sidebar = ({
  projects = [],
  activeProjectId,
  onNewBlank,
  onNewFromTemplate,
  onDeleteProject,
  onSwitchProject,
  onRenameProject,
  onProjectReminder,
  onOpenProfile,
  onPinProject,
  onReorderProjects,
  onOpenAllProjects,
  user,
  onLogout
}) => {
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [draggedProject, setDraggedProject] = useState(null);

  // Ordenar proyectos: Anclados > Activo > Recientes
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      // 1. Anclados primero
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      // 2. Si ambos anclados, por customOrder o fecha
      if (a.isPinned && b.isPinned) {
        if (a.customOrder !== null && b.customOrder !== null) {
          return a.customOrder - b.customOrder;
        }
        return new Date(b.lastActiveAt || b.updatedAt) - new Date(a.lastActiveAt || a.updatedAt);
      }
      
      // 3. Proyecto activo después de anclados
      if (a.id === activeProjectId) return -1;
      if (b.id === activeProjectId) return 1;
      
      // 4. Por customOrder si existe
      if (a.customOrder !== null && b.customOrder !== null) {
        return a.customOrder - b.customOrder;
      }
      
      // 5. Por última actividad (más reciente primero)
      const dateA = new Date(a.lastActiveAt || a.updatedAt);
      const dateB = new Date(b.lastActiveAt || b.updatedAt);
      return dateB - dateA;
    });
  }, [projects, activeProjectId]);

  // Proyectos visibles (limitados)
  const visibleProjects = useMemo(() => {
    return sortedProjects.slice(0, MAX_VISIBLE_PROJECTS);
  }, [sortedProjects]);

  const hasMoreProjects = projects.length > MAX_VISIBLE_PROJECTS;
  const pinnedCount = projects.filter(p => p.isPinned).length;

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'Sin fecha';
    }
  };

  const handleStartEdit = (project, e) => {
    e.stopPropagation();
    setEditingProjectId(project.id);
    setEditingName(project.name);
  };

  const handleSaveEdit = () => {
    if (editingName.trim() && onRenameProject) {
      onRenameProject(editingProjectId, editingName.trim());
    }
    setEditingProjectId(null);
    setEditingName('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditingProjectId(null);
      setEditingName('');
    }
  };

  const handlePinProject = useCallback((projectId, shouldPin, e) => {
    e.stopPropagation();
    if (onPinProject) {
      onPinProject(projectId, shouldPin);
    }
  }, [onPinProject]);

  // Drag and Drop handlers
  const handleDragStart = (e, project) => {
    if (project.isPinned) return; // No permitir arrastrar proyectos anclados
    setDraggedProject(project);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, project) => {
    e.preventDefault();
    if (project.isPinned || !draggedProject) return;
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetProject) => {
    e.preventDefault();
    if (!draggedProject || targetProject.isPinned || draggedProject.id === targetProject.id) {
      setDraggedProject(null);
      return;
    }

    // Calcular nuevo orden
    const nonPinnedProjects = sortedProjects.filter(p => !p.isPinned);
    const sourceIndex = nonPinnedProjects.findIndex(p => p.id === draggedProject.id);
    const targetIndex = nonPinnedProjects.findIndex(p => p.id === targetProject.id);

    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggedProject(null);
      return;
    }

    // Crear nuevo array con el orden actualizado
    const newOrder = [...nonPinnedProjects];
    newOrder.splice(sourceIndex, 1);
    newOrder.splice(targetIndex, 0, draggedProject);

    // Preparar datos para el backend
    const projectOrders = newOrder.map((p, index) => ({
      id: p.id,
      customOrder: index
    }));

    if (onReorderProjects) {
      onReorderProjects(projectOrders);
    }

    setDraggedProject(null);
  };

  const handleDragEnd = () => {
    setDraggedProject(null);
  };

  return (
    <div className="
      w-72 bg-white border-r border-gray-200
      flex flex-col p-5 shadow-sm z-20 shrink-0 h-full
    ">
      {/* Header con Logo MindoraMap - Branding Principal */}
      <div className="flex flex-col items-center justify-center py-1.5 mb-2 border-b border-gray-100">
        <img 
          src={LOGO_URL} 
          alt="MindoraMap" 
          className="h-20 w-auto object-contain"
        />
      </div>

      {/* Botones de acción */}
      <button
        onClick={onNewFromTemplate}
        className="
          w-full bg-blue-600 hover:bg-blue-700
          text-white font-medium py-3 px-4 rounded-xl
          flex items-center justify-center gap-2 mb-3
          shadow-md hover:shadow-lg transition-all duration-200
          active:scale-[0.98]
        "
      >
        <LayoutTemplate size={18} />
        <span>Desde Template</span>
      </button>

      <button
        onClick={onNewBlank}
        className="
          w-full bg-white hover:bg-gray-50
          text-gray-700 border-2 border-gray-200
          font-medium py-3 px-4 rounded-xl
          flex items-center justify-center gap-2 mb-4
          transition-all duration-200
          hover:border-gray-300 active:scale-[0.98]
        "
      >
        <Plus size={18} />
        <span>En Blanco</span>
      </button>

      {/* Sección de proyectos */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Mis Proyectos
          </h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {projects.length}
          </span>
        </div>
        
        {/* Botón de reordenar */}
        {projects.length > 1 && (
          <button
            onClick={() => setIsReorderMode(!isReorderMode)}
            className={`
              p-1.5 rounded-lg text-xs
              transition-all duration-200
              ${isReorderMode 
                ? 'bg-blue-100 text-blue-600' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }
            `}
            title={isReorderMode ? 'Salir del modo ordenar' : 'Ordenar proyectos'}
          >
            <ArrowUpDown size={14} />
          </button>
        )}
      </div>

      {/* Indicador de modo reordenar */}
      {isReorderMode && (
        <div className="mb-2 px-2 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs text-blue-600 flex items-center gap-1">
            <GripVertical size={12} />
            Arrastra para reordenar (proyectos no anclados)
          </p>
        </div>
      )}

      {/* Lista de proyectos - Scrollable */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {visibleProjects.map((project) => {
          const isActive = project.id === activeProjectId;
          const nodeCount = project.nodes?.length || 0;
          const isEditing = editingProjectId === project.id;
          const isPinned = project.isPinned;
          const canPin = pinnedCount < MAX_PINNED || isPinned;
          const isDragging = draggedProject?.id === project.id;
          
          return (
            <div
              key={project.id}
              onClick={() => !isActive && !isEditing && onSwitchProject(project.id)}
              draggable={isReorderMode && !isPinned}
              onDragStart={(e) => handleDragStart(e, project)}
              onDragOver={(e) => handleDragOver(e, project)}
              onDrop={(e) => handleDrop(e, project)}
              onDragEnd={handleDragEnd}
              className={`
                rounded-xl p-3 relative group
                transition-all duration-200
                ${isPinned 
                  ? 'border-2 border-amber-300 bg-amber-50/30' 
                  : isActive 
                    ? 'border-2 border-blue-500 bg-blue-50/50' 
                    : 'border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
                ${isDragging ? 'opacity-50 scale-95' : ''}
                ${isReorderMode && !isPinned ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-start gap-3">
                {/* Drag handle o Icon */}
                <div className={`
                  w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                  ${isPinned 
                    ? 'bg-amber-100' 
                    : isActive 
                      ? 'bg-blue-100' 
                      : 'bg-gray-100'
                  }
                `}>
                  {isReorderMode && !isPinned ? (
                    <GripVertical 
                      className="text-gray-400" 
                      size={16} 
                    />
                  ) : isPinned ? (
                    <Pin 
                      className="text-amber-500" 
                      size={14} 
                    />
                  ) : (
                    <FileText 
                      className={isActive ? 'text-blue-600' : 'text-gray-500'} 
                      size={16} 
                    />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={handleSaveEdit}
                        onKeyDown={handleKeyDown}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        className="
                          flex-1 font-medium text-sm text-gray-900
                          px-2 py-0.5 rounded border border-blue-500
                          outline-none focus:ring-2 focus:ring-blue-200
                        "
                        maxLength={50}
                      />
                    ) : (
                      <>
                        <h3 
                          className={`
                            font-medium text-sm truncate
                            ${isActive ? 'text-gray-900' : 'text-gray-700'}
                          `}
                          onDoubleClick={(e) => handleStartEdit(project, e)}
                          title="Doble clic para editar"
                        >
                          {project.name}
                        </h3>
                        {isActive && (
                          <Check size={14} className="text-blue-600 shrink-0" />
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-1.5">
                    <span className="text-xs text-gray-400">
                      {formatDate(project.lastActiveAt || project.updatedAt)}
                    </span>
                    <span className={`
                      text-xs font-medium
                      ${isActive ? 'text-blue-600' : 'text-gray-500'}
                    `}>
                      {nodeCount} nodos
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Botones de acción - visibles en hover */}
              {!isReorderMode && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                  {!isEditing && (
                    <>
                      {/* Pin/Unpin button */}
                      <button
                        onClick={(e) => handlePinProject(project.id, !isPinned, e)}
                        disabled={!canPin && !isPinned}
                        className={`
                          p-1.5 rounded-lg transition-all duration-200
                          ${isPinned 
                            ? 'bg-amber-100 hover:bg-amber-200 text-amber-600' 
                            : canPin
                              ? 'bg-gray-50 hover:bg-amber-100 text-gray-500 hover:text-amber-600'
                              : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                          }
                        `}
                        title={isPinned ? 'Desanclar' : canPin ? 'Anclar arriba' : 'Máximo 2 anclados'}
                      >
                        {isPinned ? <PinOff size={12} /> : <Pin size={12} />}
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onProjectReminder) onProjectReminder(project);
                        }}
                        className="
                          p-1.5 rounded-lg
                          bg-purple-50 hover:bg-purple-100
                          text-purple-500 hover:text-purple-600
                          transition-all duration-200
                        "
                        title="Recordatorio de proyecto"
                      >
                        <Bell size={12} />
                      </button>
                      <button
                        onClick={(e) => handleStartEdit(project, e)}
                        className="
                          p-1.5 rounded-lg
                          bg-gray-50 hover:bg-gray-100
                          text-gray-500 hover:text-gray-600
                          transition-all duration-200
                        "
                        title="Renombrar proyecto"
                      >
                        <Pencil size={12} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteProject(project.id);
                    }}
                    className="
                      p-1.5 rounded-lg
                      bg-red-50 hover:bg-red-100
                      text-red-500 hover:text-red-600
                      transition-all duration-200
                    "
                    title="Eliminar proyecto"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
        
        {/* Ver todos - si hay más proyectos */}
        {hasMoreProjects && (
          <button
            onClick={onOpenAllProjects}
            className="
              w-full py-2.5 px-3
              text-sm font-medium text-blue-600
              bg-blue-50 hover:bg-blue-100
              border border-blue-200 hover:border-blue-300
              rounded-xl
              flex items-center justify-center gap-2
              transition-all duration-200
            "
          >
            <ExternalLink size={14} />
            Ver todos ({projects.length} proyectos)
          </button>
        )}
      </div>

      {/* Mensaje informativo */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
        <p className="text-xs text-gray-500 leading-relaxed">
          💡 <span className="font-medium">Tip:</span> Ancla tus proyectos favoritos con 📌 para acceso rápido.
          {pinnedCount > 0 && (
            <span className="block mt-1 text-amber-600">
              {pinnedCount}/{MAX_PINNED} anclados
            </span>
          )}
        </p>
      </div>

      {/* Usuario y Logout */}
      {user && (
        <div className="mt-auto pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                <User size={16} className="text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.full_name || user.username}
                </p>
                <p className="text-xs text-gray-500 truncate">@{user.username}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenProfile}
                className="
                  p-2 rounded-lg
                  text-gray-500 hover:text-blue-600
                  hover:bg-blue-50
                  transition-all duration-200
                "
                title="Configuración de perfil"
              >
                <Settings size={16} />
              </button>
              <button
                onClick={onLogout}
                className="
                  p-2 rounded-lg
                  text-gray-500 hover:text-red-600
                  hover:bg-red-50
                  transition-all duration-200
                "
                title="Cerrar sesión"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  X, Search, Pin, PinOff, FileText, Clock, Check, Trash2, 
  Pencil, Calendar, ChevronRight, FolderOpen, GripVertical, Save
} from 'lucide-react';

const AllProjectsModal = ({
  isOpen,
  onClose,
  projects = [],
  activeProjectId,
  onSwitchProject,
  onDeleteProject,
  onRenameProject,
  onPinProject,
  onReorderProjects
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [draggedProject, setDraggedProject] = useState(null);
  const [dragOverProjectId, setDragOverProjectId] = useState(null);
  const [dropPosition, setDropPosition] = useState(null);
  const [reorderedList, setReorderedList] = useState(null); // null = use projects, array = reordered
  
  const modalRef = useRef(null);
  const dragCounter = useRef(0);

  // Resetear estado cuando se abre/cierra el modal
  const prevIsOpen = useRef(isOpen);
  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      // Modal se acaba de abrir - resetear estado
      setReorderedList(null);
      setIsReorderMode(false);
      setSearchQuery('');
    }
    prevIsOpen.current = isOpen;
  }, [isOpen]);

  // Lista de proyectos a mostrar (original o reordenada)
  const displayProjects = reorderedList || projects;
  const hasChanges = reorderedList !== null;

  // Guardar el orden
  const saveOrder = useCallback(async () => {
    if (!reorderedList || !onReorderProjects) return;

    const projectOrders = reorderedList.map((p, index) => ({
      id: p.id,
      customOrder: index
    }));

    await onReorderProjects(projectOrders);
    setReorderedList(null);
  }, [reorderedList, onReorderProjects]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Cerrar con Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Filtrar proyectos por búsqueda
  const filteredProjects = useMemo(() => {
    const projectsToFilter = isReorderMode ? localProjects : projects;
    if (!searchQuery.trim()) return projectsToFilter;
    const query = searchQuery.toLowerCase();
    return projectsToFilter.filter(p => 
      p.name.toLowerCase().includes(query)
    );
  }, [projects, localProjects, searchQuery, isReorderMode]);

  // Ordenar proyectos: Anclados > Activo > Recientes (solo cuando no hay búsqueda ni reorder)
  const sortedProjects = useMemo(() => {
    if (isReorderMode) {
      // En modo reordenar, mantener el orden local
      return filteredProjects;
    }
    
    return [...filteredProjects].sort((a, b) => {
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
  }, [filteredProjects, activeProjectId, isReorderMode]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Sin fecha';
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
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
    if (e.key === 'Enter') handleSaveEdit();
    if (e.key === 'Escape') {
      setEditingProjectId(null);
      setEditingName('');
    }
  };

  // ==========================================
  // DRAG & DROP HANDLERS
  // ==========================================

  const handleDragStart = useCallback((e, project) => {
    if (!isReorderMode) return;
    
    setDraggedProject(project);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', project.id);
    
    // Crear imagen fantasma personalizada
    const ghostElement = e.target.cloneNode(true);
    ghostElement.style.opacity = '0.8';
    ghostElement.style.position = 'absolute';
    ghostElement.style.top = '-1000px';
    document.body.appendChild(ghostElement);
    e.dataTransfer.setDragImage(ghostElement, 20, 20);
    
    setTimeout(() => {
      document.body.removeChild(ghostElement);
    }, 0);
  }, [isReorderMode]);

  const handleDragEnd = useCallback(() => {
    setDraggedProject(null);
    setDragOverProjectId(null);
    setDropPosition(null);
    dragCounter.current = 0;
  }, []);

  const handleDragEnter = useCallback((e, project) => {
    e.preventDefault();
    if (!isReorderMode || !draggedProject || draggedProject.id === project.id) return;
    
    dragCounter.current++;
    setDragOverProjectId(project.id);
  }, [isReorderMode, draggedProject]);

  const handleDragLeave = useCallback((e, project) => {
    e.preventDefault();
    dragCounter.current--;
    
    if (dragCounter.current === 0) {
      setDragOverProjectId(null);
      setDropPosition(null);
    }
  }, []);

  const handleDragOver = useCallback((e, project) => {
    e.preventDefault();
    if (!isReorderMode || !draggedProject || draggedProject.id === project.id) return;
    
    e.dataTransfer.dropEffect = 'move';
    
    // Determinar si soltar arriba o abajo basado en la posición del cursor
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'above' : 'below';
    setDropPosition(position);
  }, [isReorderMode, draggedProject]);

  const handleDrop = useCallback((e, targetProject) => {
    e.preventDefault();
    
    if (!isReorderMode || !draggedProject || draggedProject.id === targetProject.id) {
      handleDragEnd();
      return;
    }

    // Encontrar índices
    const draggedIndex = localProjects.findIndex(p => p.id === draggedProject.id);
    const targetIndex = localProjects.findIndex(p => p.id === targetProject.id);

    if (draggedIndex === -1 || targetIndex === -1) {
      handleDragEnd();
      return;
    }

    // Crear nuevo array con el orden actualizado
    const newProjects = [...localProjects];
    const [removed] = newProjects.splice(draggedIndex, 1);
    
    // Calcular índice de inserción basado en la posición del drop
    let insertIndex = targetIndex;
    if (dropPosition === 'below') {
      insertIndex = draggedIndex < targetIndex ? targetIndex : targetIndex + 1;
    } else {
      insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
    }
    
    // Asegurar que el índice está dentro de los límites
    insertIndex = Math.max(0, Math.min(insertIndex, newProjects.length));
    newProjects.splice(insertIndex, 0, removed);

    // Actualizar customOrder para todos los proyectos
    const updatedProjects = newProjects.map((p, index) => ({
      ...p,
      customOrder: index
    }));

    setLocalProjects(updatedProjects);
    setHasChanges(true);
    handleDragEnd();
  }, [isReorderMode, draggedProject, localProjects, dropPosition, handleDragEnd]);

  // Toggle modo reordenar
  const toggleReorderMode = useCallback(() => {
    if (isReorderMode && hasChanges) {
      saveOrder();
    }
    setIsReorderMode(!isReorderMode);
    setSearchQuery(''); // Limpiar búsqueda al cambiar modo
  }, [isReorderMode, hasChanges, saveOrder]);

  const pinnedCount = projects.filter(p => p.isPinned).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div 
        ref={modalRef}
        className="
          w-full max-w-3xl max-h-[85vh]
          bg-white rounded-2xl shadow-2xl
          flex flex-col overflow-hidden
          mx-4
        "
      >
        {/* Header */}
        <div className="
          flex items-center justify-between
          px-6 py-4
          border-b border-gray-100
          bg-gradient-to-r from-blue-50 to-indigo-50
        ">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <FolderOpen size={24} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Todos los Proyectos</h2>
              <p className="text-sm text-gray-500">{projects.length} proyectos en total</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Botón de reordenar */}
            <button
              onClick={toggleReorderMode}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-xl
                text-sm font-medium transition-all duration-200
                ${isReorderMode 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
              title={isReorderMode ? 'Salir del modo ordenar' : 'Ordenar proyectos'}
            >
              <GripVertical size={16} />
              {isReorderMode ? 'Listo' : 'Ordenar'}
            </button>
            <button
              onClick={() => {
                if (hasChanges) saveOrder();
                onClose();
              }}
              className="
                p-2 rounded-xl
                text-gray-400 hover:text-gray-600
                hover:bg-gray-100
                transition-colors
              "
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Indicador de modo reordenar */}
        {isReorderMode && (
          <div className="
            px-6 py-3
            bg-gradient-to-r from-blue-50 to-indigo-50
            border-b border-blue-100
          ">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-700">
                <GripVertical size={18} />
                <span className="text-sm font-medium">
                  Arrastra y suelta los proyectos para reordenarlos
                </span>
              </div>
              {hasChanges && (
                <button
                  onClick={saveOrder}
                  className="
                    flex items-center gap-1.5 px-3 py-1.5
                    bg-green-500 text-white text-sm font-medium
                    rounded-lg hover:bg-green-600
                    transition-colors
                  "
                >
                  <Save size={14} />
                  Guardar orden
                </button>
              )}
            </div>
          </div>
        )}

        {/* Search Bar - Solo cuando no está en modo reordenar */}
        {!isReorderMode && (
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar proyectos..."
                className="
                  w-full pl-10 pr-4 py-2.5
                  bg-gray-50 border border-gray-200
                  rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  placeholder-gray-400
                "
              />
            </div>
          </div>
        )}

        {/* Project List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {sortedProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <FileText size={48} className="mb-3 opacity-50" />
              <p className="text-sm font-medium">No se encontraron proyectos</p>
              {searchQuery && (
                <p className="text-xs mt-1">Intenta con otra búsqueda</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {sortedProjects.map((project, index) => {
                const isActive = project.id === activeProjectId;
                const isPinned = project.isPinned;
                const isEditing = editingProjectId === project.id;
                const nodeCount = project.nodes?.length || 0;
                const isDragging = draggedProject?.id === project.id;
                const isDragOver = dragOverProjectId === project.id;

                return (
                  <div
                    key={project.id}
                    draggable={isReorderMode}
                    onDragStart={(e) => handleDragStart(e, project)}
                    onDragEnd={handleDragEnd}
                    onDragEnter={(e) => handleDragEnter(e, project)}
                    onDragLeave={(e) => handleDragLeave(e, project)}
                    onDragOver={(e) => handleDragOver(e, project)}
                    onDrop={(e) => handleDrop(e, project)}
                    onClick={() => {
                      if (!isEditing && !isReorderMode) {
                        onSwitchProject(project.id);
                        onClose();
                      }
                    }}
                    className={`
                      relative group
                      p-4 rounded-xl
                      border-2 transition-all duration-200
                      ${isReorderMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
                      ${isDragging 
                        ? 'opacity-50 scale-95 border-dashed border-blue-400 bg-blue-50' 
                        : ''
                      }
                      ${isDragOver && !isDragging
                        ? dropPosition === 'above'
                          ? 'border-t-4 border-t-blue-500 mt-1'
                          : 'border-b-4 border-b-blue-500 mb-1'
                        : ''
                      }
                      ${isPinned && !isDragging
                        ? 'border-amber-300 bg-amber-50/50' 
                        : isActive && !isDragging
                          ? 'border-blue-500 bg-blue-50/50' 
                          : !isDragging
                            ? 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                            : ''
                      }
                    `}
                  >
                    {/* Indicador de inserción superior */}
                    {isDragOver && dropPosition === 'above' && (
                      <div className="
                        absolute -top-1 left-4 right-4 h-1
                        bg-blue-500 rounded-full
                        animate-pulse
                      " />
                    )}
                    
                    {/* Indicador de inserción inferior */}
                    {isDragOver && dropPosition === 'below' && (
                      <div className="
                        absolute -bottom-1 left-4 right-4 h-1
                        bg-blue-500 rounded-full
                        animate-pulse
                      " />
                    )}

                    <div className="flex items-start gap-4">
                      {/* Drag Handle or Icon */}
                      <div className={`
                        w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                        ${isReorderMode 
                          ? 'bg-gray-100 cursor-grab' 
                          : isPinned 
                            ? 'bg-amber-100' 
                            : isActive 
                              ? 'bg-blue-100' 
                              : 'bg-gray-100'
                        }
                      `}>
                        {isReorderMode ? (
                          <GripVertical size={18} className="text-gray-400" />
                        ) : isPinned ? (
                          <Pin size={18} className="text-amber-600" />
                        ) : (
                          <FileText size={18} className={isActive ? 'text-blue-600' : 'text-gray-500'} />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
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
                                flex-1 font-semibold text-gray-900
                                px-2 py-0.5 rounded border border-blue-500
                                outline-none focus:ring-2 focus:ring-blue-200
                              "
                              maxLength={50}
                            />
                          ) : (
                            <>
                              <h3 className="font-semibold text-gray-900 truncate">
                                {project.name}
                              </h3>
                              {isActive && (
                                <span className="
                                  inline-flex items-center gap-1
                                  text-xs font-medium
                                  text-blue-600 bg-blue-100
                                  px-2 py-0.5 rounded-full
                                ">
                                  <Check size={10} />
                                  Activo
                                </span>
                              )}
                              {isPinned && (
                                <span className="
                                  inline-flex items-center gap-1
                                  text-xs font-medium
                                  text-amber-600 bg-amber-100
                                  px-2 py-0.5 rounded-full
                                ">
                                  <Pin size={10} />
                                  Anclado
                                </span>
                              )}
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <FileText size={12} />
                            {nodeCount} nodos
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            Creado: {formatDate(project.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            Última actividad: {formatDate(project.lastActiveAt || project.updatedAt)}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons - Solo cuando no está en modo reordenar */}
                      {!isReorderMode && (
                        <div className="
                          flex items-center gap-1
                          opacity-0 group-hover:opacity-100
                          transition-opacity
                        ">
                          {/* Pin/Unpin */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onPinProject) {
                                onPinProject(project.id, !isPinned);
                              }
                            }}
                            disabled={!isPinned && pinnedCount >= 2}
                            className={`
                              p-2 rounded-lg transition-all
                              ${isPinned 
                                ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' 
                                : pinnedCount >= 2
                                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                  : 'bg-gray-100 text-gray-500 hover:bg-amber-100 hover:text-amber-600'
                              }
                            `}
                            title={isPinned ? 'Desanclar' : pinnedCount >= 2 ? 'Máximo 2 anclados' : 'Anclar'}
                          >
                            {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
                          </button>

                          {/* Edit */}
                          <button
                            onClick={(e) => handleStartEdit(project, e)}
                            className="
                              p-2 rounded-lg
                              bg-gray-100 text-gray-500
                              hover:bg-blue-100 hover:text-blue-600
                              transition-all
                            "
                            title="Renombrar"
                          >
                            <Pencil size={16} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteProject(project.id);
                            }}
                            className="
                              p-2 rounded-lg
                              bg-gray-100 text-gray-500
                              hover:bg-red-100 hover:text-red-600
                              transition-all
                            "
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>

                          {/* Open */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSwitchProject(project.id);
                              onClose();
                            }}
                            className="
                              p-2 rounded-lg
                              bg-blue-100 text-blue-600
                              hover:bg-blue-200
                              transition-all
                            "
                            title="Abrir proyecto"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      )}

                      {/* Número de orden en modo reordenar */}
                      {isReorderMode && (
                        <div className="
                          w-8 h-8 rounded-lg
                          bg-gray-100 text-gray-500
                          flex items-center justify-center
                          text-sm font-medium
                        ">
                          {index + 1}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="
          px-6 py-3
          border-t border-gray-100
          bg-gray-50
          flex items-center justify-between
          text-xs text-gray-500
        ">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Pin size={12} className="text-amber-500" />
              {pinnedCount}/2 anclados
            </span>
            <span>•</span>
            <span>{sortedProjects.length} proyectos mostrados</span>
            {hasChanges && (
              <>
                <span>•</span>
                <span className="text-blue-600 font-medium">Cambios sin guardar</span>
              </>
            )}
          </div>
          <button
            onClick={() => {
              if (hasChanges) saveOrder();
              onClose();
            }}
            className="
              px-4 py-1.5
              text-gray-600 font-medium
              hover:bg-gray-200 rounded-lg
              transition-colors
            "
          >
            {hasChanges ? 'Guardar y cerrar' : 'Cerrar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AllProjectsModal;

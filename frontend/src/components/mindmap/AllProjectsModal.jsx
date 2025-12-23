import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  X, Search, Pin, PinOff, FileText, Clock, Check, Trash2, 
  Pencil, Calendar, ChevronRight, FolderOpen
} from 'lucide-react';

const AllProjectsModal = ({
  isOpen,
  onClose,
  projects = [],
  activeProjectId,
  onSwitchProject,
  onDeleteProject,
  onRenameProject,
  onPinProject
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const modalRef = useRef(null);

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
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Filtrar proyectos por búsqueda
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const query = searchQuery.toLowerCase();
    return projects.filter(p => 
      p.name.toLowerCase().includes(query)
    );
  }, [projects, searchQuery]);

  // Ordenar proyectos: Anclados > Activo > Recientes
  const sortedProjects = useMemo(() => {
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
  }, [filteredProjects, activeProjectId]);

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
          <button
            onClick={onClose}
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

        {/* Search Bar */}
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
              {sortedProjects.map((project) => {
                const isActive = project.id === activeProjectId;
                const isPinned = project.isPinned;
                const isEditing = editingProjectId === project.id;
                const nodeCount = project.nodes?.length || 0;

                return (
                  <div
                    key={project.id}
                    onClick={() => {
                      if (!isEditing) {
                        onSwitchProject(project.id);
                        onClose();
                      }
                    }}
                    className={`
                      relative group
                      p-4 rounded-xl
                      border-2 transition-all duration-200
                      cursor-pointer
                      ${isPinned 
                        ? 'border-amber-300 bg-amber-50/50' 
                        : isActive 
                          ? 'border-blue-500 bg-blue-50/50' 
                          : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`
                        w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                        ${isPinned 
                          ? 'bg-amber-100' 
                          : isActive 
                            ? 'bg-blue-100' 
                            : 'bg-gray-100'
                        }
                      `}>
                        {isPinned ? (
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

                      {/* Action Buttons */}
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
            <span>{filteredProjects.length} proyectos mostrados</span>
          </div>
          <button
            onClick={onClose}
            className="
              px-4 py-1.5
              text-gray-600 font-medium
              hover:bg-gray-200 rounded-lg
              transition-colors
            "
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AllProjectsModal;

import React, { useState, useEffect, useRef } from 'react';
import { X, Search, FolderOpen, Plus, MapPin, ChevronRight } from 'lucide-react';

const LinkedProjectModal = ({
  isOpen,
  onClose,
  onSelectProject,
  onCreateNewProject,
  projects = [],
  currentProjectId = null
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const searchInputRef = useRef(null);
  const modalRef = useRef(null);

  // Filtrar proyectos (excluir el proyecto actual)
  const filteredProjects = projects
    .filter(p => p.id !== currentProjectId)
    .filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .slice(0, 10); // Limitar a 10 resultados

  // Focus en búsqueda al abrir
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
    // Reset estado al abrir
    if (isOpen) {
      setSearchQuery('');
      setIsCreatingNew(false);
      setNewProjectName('');
    }
  }, [isOpen]);

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

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const handleSelectProject = (project) => {
    onSelectProject(project);
    onClose();
  };

  const handleCreateNew = async () => {
    if (!newProjectName.trim()) return;
    
    setIsCreatingNew(true);
    try {
      await onCreateNewProject(newProjectName.trim());
      onClose();
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setIsCreatingNew(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        ref={modalRef}
        className="
          w-full max-w-md mx-4
          bg-white rounded-2xl shadow-2xl
          overflow-hidden
          animate-in zoom-in-95 duration-200
        "
        data-testid="linked-project-modal"
      >
        {/* Header */}
        <div className="
          flex items-center justify-between
          px-5 py-4
          bg-gradient-to-r from-emerald-50 to-teal-50
          border-b border-gray-100
        ">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <FolderOpen size={20} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                Vincular proyecto
              </h2>
              <p className="text-xs text-gray-500">
                Selecciona o crea un mapa para vincular
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="
              p-2 rounded-lg
              text-gray-400 hover:text-gray-600
              hover:bg-gray-100
              transition-colors
            "
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar proyecto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="
                w-full pl-10 pr-4 py-2.5
                bg-gray-50 border border-gray-200
                rounded-xl
                text-sm text-gray-700
                placeholder:text-gray-400
                focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400
                transition-all
              "
            />
          </div>
        </div>

        {/* Project List */}
        <div className="max-h-64 overflow-y-auto">
          {filteredProjects.length > 0 ? (
            <div className="py-2">
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleSelectProject(project)}
                  className="
                    w-full flex items-center gap-3 px-4 py-3
                    hover:bg-gray-50 active:bg-gray-100
                    transition-colors text-left
                  "
                  data-testid={`project-option-${project.id}`}
                >
                  <div className="
                    w-10 h-10 rounded-lg
                    bg-gradient-to-br from-emerald-100 to-teal-100
                    border border-emerald-200
                    flex items-center justify-center
                    flex-shrink-0
                  ">
                    <MapPin size={16} className="text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">
                      {project.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {project.nodes?.length || 0} nodos
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          ) : searchQuery ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-500">
                No se encontraron proyectos
              </p>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-500">
                No hay otros proyectos disponibles
              </p>
            </div>
          )}
        </div>

        {/* Create New Section */}
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nombre del nuevo proyecto..."
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newProjectName.trim()) {
                  handleCreateNew();
                }
              }}
              className="
                flex-1 px-3 py-2.5
                bg-white border border-gray-200
                rounded-xl
                text-sm text-gray-700
                placeholder:text-gray-400
                focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400
                transition-all
              "
            />
            <button
              onClick={handleCreateNew}
              disabled={!newProjectName.trim() || isCreatingNew}
              className="
                px-4 py-2.5
                bg-emerald-500 hover:bg-emerald-600
                disabled:bg-gray-300 disabled:cursor-not-allowed
                text-white text-sm font-medium
                rounded-xl
                flex items-center gap-2
                transition-colors
              "
              data-testid="create-new-project-btn"
            >
              <Plus size={16} />
              <span>{isCreatingNew ? 'Creando...' : 'Crear'}</span>
            </button>
          </div>
          <p className="mt-2 text-[10px] text-gray-400 text-center">
            💡 El nuevo proyecto se creará y vinculará automáticamente
          </p>
        </div>
      </div>
    </div>
  );
};

export default LinkedProjectModal;

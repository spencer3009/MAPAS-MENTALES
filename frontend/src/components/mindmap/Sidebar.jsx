import React, { useState } from 'react';
import { Plus, LayoutTemplate, FileText, Trash2, Check, Pencil } from 'lucide-react';

// URL del logo MindoraMap (horizontal)
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_mindviz-app/artifacts/k1kioask_image.png';

const Sidebar = ({
  projects = [],
  activeProjectId,
  onNewBlank,
  onNewFromTemplate,
  onDeleteProject,
  onSwitchProject,
  onRenameProject
}) => {
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editingName, setEditingName] = useState('');

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

  const activeProject = projects.find(p => p.id === activeProjectId);

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
          flex items-center justify-center gap-2 mb-6
          transition-all duration-200
          hover:border-gray-300 active:scale-[0.98]
        "
      >
        <Plus size={18} />
        <span>En Blanco</span>
      </button>

      {/* Sección de proyectos */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Mis Proyectos
        </h2>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {projects.length}
        </span>
      </div>

      {/* Lista de proyectos - Scrollable */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {projects.map((project) => {
          const isActive = project.id === activeProjectId;
          const nodeCount = project.nodes?.length || 0;
          const isEditing = editingProjectId === project.id;
          
          return (
            <div
              key={project.id}
              onClick={() => !isActive && !isEditing && onSwitchProject(project.id)}
              className={`
                rounded-xl p-3 relative group cursor-pointer
                transition-all duration-200
                ${isActive 
                  ? 'border-2 border-blue-500 bg-blue-50/50' 
                  : 'border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              <div className="flex items-start gap-3">
                <div className={`
                  w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                  ${isActive ? 'bg-blue-100' : 'bg-gray-100'}
                `}>
                  <FileText 
                    className={isActive ? 'text-blue-600' : 'text-gray-500'} 
                    size={16} 
                  />
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
                      {formatDate(project.updatedAt)}
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
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                {!isEditing && (
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
            </div>
          );
        })}
      </div>

      {/* Mensaje informativo */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
        <p className="text-xs text-gray-500 leading-relaxed">
          💡 <span className="font-medium">Tip:</span> Crea múltiples mapas y cambia entre ellos.
          Los cambios se guardan automáticamente.
        </p>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-gray-100 mt-4">
        <p className="text-xs text-gray-400 text-center">
          Guardado automático en navegador
        </p>
      </div>
    </div>
  );
};

export default Sidebar;

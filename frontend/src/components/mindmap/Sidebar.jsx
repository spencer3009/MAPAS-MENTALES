import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, FileText, Trash2, Check, Pencil, 
  Bell, Pin, PinOff, GripVertical, ArrowUpDown, ExternalLink, Archive,
  Crown, Zap, Sparkles, MoreHorizontal, Settings
} from 'lucide-react';
import NodeDefaultsSettings from './NodeDefaultsSettings';

// Use relative URLs for production compatibility
const API_URL = '';

// URL del logo MindoraMap
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_c7c9b123-4484-446c-b0cd-4986b2bb2189/artifacts/hk2d8hgn_MINDORA%20TRANSPARENTE.png';

const MAX_VISIBLE_PROJECTS = 7;
const MAX_PINNED = 2;

// Nombres de planes para mostrar
const PLAN_NAMES = {
  'free': 'Gratis',
  'personal': 'Personal',
  'pro': 'Personal',  // Alias para compatibilidad
  'team': 'Team',
  'business': 'Business',
  'admin': 'Admin'
};

const Sidebar = ({
  projects = [],
  activeProjectId,
  onNewBlank,
  onNewFromTemplate,
  onDeleteProject,
  onSwitchProject,
  onRenameProject,
  onProjectReminder,
  onPinProject,
  onReorderProjects,
  onOpenAllProjects,
  onShowUpgrade,
  token
}) => {
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [draggedProject, setDraggedProject] = useState(null);
  const [planInfo, setPlanInfo] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuContainerRef = useRef(null);
  const menuButtonRefs = useRef({});

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(event.target)) {
        // Verificar si el clic fue en algún botón de menú
        const isMenuButton = Object.values(menuButtonRefs.current).some(
          ref => ref && ref.contains(event.target)
        );
        if (!isMenuButton) {
          setOpenMenuId(null);
        }
      }
    };
    
    if (openMenuId) {
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 10);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openMenuId]);

  // Cargar información del plan
  useEffect(() => {
    const loadPlanInfo = async () => {
      if (!token) return;
      try {
        const response = await fetch(`${API_URL}/api/user/plan-limits`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setPlanInfo(data);
        }
      } catch (error) {
        console.error('Error loading plan info:', error);
      }
    };
    loadPlanInfo();
  }, [token, projects.length]); // Recargar cuando cambie el número de proyectos

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
    <>
    <div className="
      w-72 bg-white border-r border-gray-200
      flex flex-col p-5 shadow-sm z-20 shrink-0 h-full
    ">
      {/* Logo MindoraMap */}
      <div className="flex items-center justify-center py-1 mb-2 border-b border-gray-100">
        <img 
          src={LOGO_URL} 
          alt="MindoraMap" 
          className="h-12 w-auto object-contain"
        />
      </div>

      {/* Botón de nuevo proyecto */}
      <button
        onClick={onNewBlank}
        className="
          w-full bg-blue-600 hover:bg-blue-700
          text-white font-medium py-2 px-3 rounded-lg
          flex items-center justify-center gap-2 mb-3
          shadow-md hover:shadow-lg transition-all duration-200
          active:scale-[0.98] text-sm
        "
      >
        <Plus size={16} />
        <span>Nuevo Mapa</span>
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
        {visibleProjects.length === 0 ? (
          <div className="text-center py-8 px-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">
              No hay mapas todavía
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Crea tu primer mapa mental para comenzar
            </p>
          </div>
        ) : (
          visibleProjects.map((project) => {
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
              
              {/* Botón de menú de tres puntos */}
              {!isReorderMode && !isEditing && (
                <div className="absolute top-2 right-2">
                  <button
                    ref={el => menuButtonRefs.current[project.id] = el}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      if (openMenuId === project.id) {
                        setOpenMenuId(null);
                      } else {
                        // Calcular posición del menú
                        const buttonRect = e.currentTarget.getBoundingClientRect();
                        setMenuPosition({
                          top: buttonRect.top,
                          left: buttonRect.right + 8
                        });
                        setOpenMenuId(project.id);
                      }
                    }}
                    className={`
                      p-1.5 rounded-lg transition-all duration-200
                      ${openMenuId === project.id
                        ? 'bg-gray-200 text-gray-700'
                        : 'opacity-0 group-hover:opacity-100 bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                      }
                    `}
                    title="Opciones"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </div>
              )}
            </div>
          );
        })
        )}
        
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

      {/* Sección del Plan - Compacta */}
      {planInfo && (
        <div className={`mt-2 p-2.5 rounded-lg border ${
          planInfo.plan === 'free' 
            ? 'bg-gray-50 border-gray-200'
            : planInfo.plan === 'pro'
            ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
            : planInfo.plan === 'team'
            ? 'bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200'
            : 'bg-gradient-to-br from-red-50 to-pink-50 border-red-200'
        }`}>
          {/* Header del plan */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              {planInfo.plan !== 'free' && (
                <Crown className={`w-3.5 h-3.5 ${
                  planInfo.plan === 'pro' ? 'text-amber-500' 
                  : planInfo.plan === 'team' ? 'text-purple-500'
                  : 'text-red-500'
                }`} />
              )}
              <span className={`text-xs font-bold ${
                planInfo.plan === 'free' ? 'text-gray-700'
                : planInfo.plan === 'pro' ? 'text-amber-700'
                : planInfo.plan === 'team' ? 'text-purple-700'
                : 'text-red-700'
              }`}>
                Plan {PLAN_NAMES[planInfo.plan] || planInfo.plan}
              </span>
            </div>
            {planInfo.limits.max_active_maps === -1 && (
              <span className="text-[10px] font-medium text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">
                ∞ Ilimitado
              </span>
            )}
          </div>

          {/* Uso de mapas - solo mostrar si hay límite */}
          {planInfo.limits.max_active_maps !== -1 && (
            <div className="space-y-2">
              {/* Indicadores circulares en una fila - más compactos */}
              <div className="flex items-center justify-center gap-3">
                {/* Círculo: Mapas activos */}
                <div className="flex flex-col items-center">
                  <div className="relative w-10 h-10">
                    <svg className="w-10 h-10 -rotate-90">
                      <circle
                        cx="20" cy="20" r="16"
                        stroke="#e5e7eb"
                        strokeWidth="3"
                        fill="none"
                      />
                      <circle
                        cx="20" cy="20" r="16"
                        stroke={
                          planInfo.usage.active_maps >= planInfo.limits.max_active_maps
                            ? '#ef4444'
                            : planInfo.usage.active_maps >= planInfo.limits.max_active_maps * 0.8
                            ? '#f59e0b'
                            : '#3b82f6'
                        }
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${(planInfo.usage.active_maps / planInfo.limits.max_active_maps) * 100.5} 100.5`}
                        className="transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-gray-800">
                        {planInfo.usage.active_maps}/{planInfo.limits.max_active_maps}
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] text-gray-500">Activos</span>
                </div>

                {/* Círculo: Mapas totales */}
                <div className="flex flex-col items-center">
                  <div className="relative w-10 h-10">
                    <svg className="w-10 h-10 -rotate-90">
                      <circle
                        cx="20" cy="20" r="16"
                        stroke="#e5e7eb"
                        strokeWidth="3"
                        fill="none"
                      />
                      <circle
                        cx="20" cy="20" r="16"
                        stroke={
                          planInfo.usage.total_maps_created >= planInfo.limits.max_total_maps_created
                            ? '#ef4444'
                            : planInfo.usage.total_maps_created >= planInfo.limits.max_total_maps_created * 0.8
                            ? '#f59e0b'
                            : '#8b5cf6'
                        }
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${(planInfo.usage.total_maps_created / planInfo.limits.max_total_maps_created) * 100.5} 100.5`}
                        className="transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-gray-800">
                        {planInfo.usage.total_maps_created}/{planInfo.limits.max_total_maps_created}
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] text-gray-500">Creados</span>
                </div>
              </div>

              {/* Mensajes de límite - más compactos */}
              {!planInfo.usage.can_create_map ? (
                <p className="text-[10px] text-red-600 font-medium bg-red-50 px-2 py-1 rounded text-center">
                  ⚠️ Límite alcanzado
                </p>
              ) : planInfo.usage.active_remaining <= 1 || planInfo.usage.total_remaining <= 1 ? (
                <p className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded text-center">
                  💡 Pocos mapas disponibles
                </p>
              ) : null}

              {/* Botón de upgrade - más compacto */}
              <button 
                onClick={() => onShowUpgrade?.()}
                className="w-full py-1.5 px-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-[10px] font-semibold rounded flex items-center justify-center gap-1 transition-all shadow-sm hover:shadow-md"
              >
                <Zap className="w-3 h-3" />
                Actualizar a Personal - $3/mes
              </button>
            </div>
          )}

          {/* Info para planes ilimitados - simplificada */}
          {planInfo.limits.max_active_maps === -1 && (
            <div className="text-center">
              <p className="text-[10px] text-gray-500">
                {planInfo.usage.active_maps} mapas activos
              </p>
            </div>
          )}
        </div>
      )}
    </div>

    {/* Portal para el menú desplegable */}
    {openMenuId && !isReorderMode && createPortal(
      <div 
        className="fixed w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1.5 z-[100]"
        style={{
          top: menuPosition.top,
          left: menuPosition.left
        }}
        ref={menuContainerRef}
      >
        {(() => {
          const project = projects.find(p => p.id === openMenuId);
          if (!project) return null;
          
          const isPinned = project.isPinned;
          const canPin = pinnedCount < MAX_PINNED || isPinned;
          
          return (
            <>
              {/* Anclar arriba */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePinProject(project.id, !isPinned, e);
                  setOpenMenuId(null);
                }}
                disabled={!canPin && !isPinned}
                className={`
                  w-full px-3 py-2 text-left text-sm flex items-center gap-2.5
                  ${!canPin && !isPinned 
                    ? 'text-gray-300 cursor-not-allowed' 
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                  transition-colors duration-150
                `}
              >
                {isPinned ? <PinOff size={16} className="text-gray-400" /> : <Pin size={16} className="text-gray-400" />}
                {isPinned ? 'Desanclar' : 'Anclar arriba'}
              </button>
              
              {/* Editar nombre */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartEdit(project, e);
                  setOpenMenuId(null);
                }}
                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2.5 text-gray-700 hover:bg-gray-50 transition-colors duration-150"
              >
                <Pencil size={16} className="text-gray-400" />
                Editar nombre
              </button>
              
              {/* Recordatorio */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onProjectReminder) onProjectReminder(project);
                  setOpenMenuId(null);
                }}
                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2.5 text-gray-700 hover:bg-gray-50 transition-colors duration-150"
              >
                <Bell size={16} className="text-gray-400" />
                Recordatorio
              </button>
              
              {/* Separador */}
              <div className="h-px bg-gray-100 my-1.5" />
              
              {/* Eliminar */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteProject(project.id);
                  setOpenMenuId(null);
                }}
                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2.5 text-red-500 hover:bg-red-50 transition-colors duration-150"
              >
                <Trash2 size={16} />
                Eliminar
              </button>
            </>
          );
        })()}
      </div>,
      document.body
    )}
    </>
  );
};

export default Sidebar;

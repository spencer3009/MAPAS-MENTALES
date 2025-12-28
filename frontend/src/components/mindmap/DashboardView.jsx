import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Clock, 
  TrendingUp,
  Calendar,
  Bell,
  Crown,
  Zap,
  Sparkles,
  Users,
  CheckCircle2,
  Plus,
  Upload,
  GitBranch,
  List,
  Target,
  Briefcase,
  FileText,
  Grid3X3,
  MoreHorizontal,
  Star,
  Share2,
  Copy,
  FolderInput,
  Globe,
  Trash2,
  ExternalLink,
  X
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Nombres de planes para mostrar
const PLAN_NAMES = {
  'free': 'Gratis',
  'personal': 'Personal',
  'pro': 'Personal',
  'team': 'Team',
  'business': 'Business',
  'admin': 'Admin'
};

const PLAN_COLORS = {
  'free': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', icon: 'text-gray-500' },
  'personal': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: 'text-blue-500' },
  'pro': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: 'text-blue-500' },
  'team': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: 'text-purple-500' },
  'business': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'text-amber-500' },
  'admin': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: 'text-red-500' }
};

// Plantillas disponibles
const TEMPLATES = [
  {
    id: 'blank',
    name: 'Mapa en blanco',
    icon: Plus,
    color: 'bg-blue-500',
    textColor: 'text-white',
    description: 'Comienza desde cero'
  },
  {
    id: 'mindmap',
    name: 'Mapa mental',
    icon: GitBranch,
    color: 'bg-gradient-to-br from-cyan-400 to-teal-500',
    preview: '🧠',
    description: 'Ideas conectadas'
  },
  {
    id: 'orgchart',
    name: 'Organigrama',
    icon: Grid3X3,
    color: 'bg-gradient-to-br from-amber-400 to-orange-500',
    preview: '📊',
    description: 'Estructura jerárquica'
  },
  {
    id: 'list',
    name: 'Lista',
    icon: List,
    color: 'bg-gradient-to-br from-gray-400 to-gray-600',
    preview: '📋',
    description: 'Tareas y pendientes'
  },
  {
    id: 'smart',
    name: 'Objetivos SMART',
    icon: Target,
    color: 'bg-gradient-to-br from-blue-400 to-indigo-500',
    preview: '🎯',
    description: 'Metas específicas'
  },
  {
    id: 'business',
    name: 'Plan de negocios',
    icon: Briefcase,
    color: 'bg-gradient-to-br from-emerald-400 to-green-600',
    preview: '💼',
    description: 'Estrategia empresarial'
  },
  {
    id: 'notes',
    name: 'Toma de notas',
    icon: FileText,
    color: 'bg-gradient-to-br from-purple-400 to-violet-500',
    preview: '📝',
    description: 'Apuntes rápidos'
  },
  {
    id: 'all',
    name: 'Todas las plantillas',
    icon: MoreHorizontal,
    color: 'bg-gradient-to-br from-blue-100 to-indigo-100',
    textColor: 'text-blue-600',
    preview: '🗂️',
    description: 'Ver más opciones'
  }
];

const DashboardView = ({ projects = [], onClose, token, user, onNewProject, onOpenTemplates, onToggleFavorite, onDeleteProject, onDuplicateProject, onShowUpgradeModal }) => {
  const [planInfo, setPlanInfo] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [hoveredTemplate, setHoveredTemplate] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Ignorar clics en el botón de menú
      if (event.target.closest('button[title="Acciones del mapa"]')) {
        return;
      }
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    };
    
    if (openMenuId) {
      // Agregar listener solo cuando hay un menú abierto
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 10);
    }
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  // Cargar información del plan
  useEffect(() => {
    const loadPlanInfo = async () => {
      if (!token) {
        setLoadingPlan(false);
        return;
      }
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
      setLoadingPlan(false);
    };
    loadPlanInfo();
  }, [token]);

  // Estadísticas básicas
  const totalProjects = projects.length;
  const totalNodes = projects.reduce((acc, p) => acc + (p.nodes?.length || 0), 0);
  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 3);

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short'
      });
    } catch {
      return 'Sin fecha';
    }
  };

  // Formato de fecha relativa (hace X minutos, horas, días)
  const formatDateRelative = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Ahora mismo';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHours < 24) return `Hace ${diffHours} h`;
      if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
      if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semana${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
      return formatDate(dateString);
    } catch {
      return 'Sin fecha';
    }
  };

  const planColors = PLAN_COLORS[planInfo?.plan] || PLAN_COLORS.free;
  const isUnlimited = planInfo?.limits?.max_active_maps === -1;

  // Calcular porcentajes para barras de progreso
  const getProgressPercentage = (current, max) => {
    if (max === -1) return 0;
    return Math.min((current / max) * 100, 100);
  };

  const getProgressColor = (current, max) => {
    if (max === -1) return 'bg-green-500';
    const percentage = (current / max) * 100;
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-amber-500';
    return 'bg-blue-500';
  };

  // Obtener nombre del usuario
  const userName = user?.full_name?.split(' ')[0] || user?.username || 'Usuario';

  // Manejar click en plantilla
  const handleTemplateClick = (template) => {
    if (template.id === 'all') {
      onOpenTemplates?.();
    } else if (template.id === 'blank') {
      onNewProject?.('blank');
    } else {
      onNewProject?.(template.id);
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-white">
      {/* Header con bienvenida y avatar */}
      <div className="border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-light text-gray-900">
              ¡Te damos la bienvenida, <span className="font-semibold">{userName}</span>!
            </h1>
            
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-semibold text-lg shadow-lg">
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Sección: Crear un mapa */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-medium text-gray-900">Crear un mapa</h2>
            <button 
              onClick={() => {}}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Upload size={16} />
              Importar
            </button>
          </div>

          {/* Grid de plantillas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {TEMPLATES.map((template) => {
              const Icon = template.icon;
              const isHovered = hoveredTemplate === template.id;
              
              return (
                <button
                  key={template.id}
                  onClick={() => handleTemplateClick(template)}
                  onMouseEnter={() => setHoveredTemplate(template.id)}
                  onMouseLeave={() => setHoveredTemplate(null)}
                  className={`
                    relative flex flex-col items-center justify-center
                    rounded-xl p-4 h-32
                    transition-all duration-200
                    ${template.id === 'blank' 
                      ? 'bg-blue-500 hover:bg-blue-600' 
                      : 'bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300'
                    }
                    ${isHovered ? 'scale-105 shadow-lg' : 'shadow-sm'}
                  `}
                >
                  {/* Icono o Preview */}
                  <div className={`
                    mb-2 text-3xl
                    ${template.id === 'blank' ? 'text-white' : ''}
                  `}>
                    {template.preview ? (
                      <span>{template.preview}</span>
                    ) : (
                      <Icon size={28} className={template.textColor || ''} />
                    )}
                  </div>
                  
                  {/* Nombre */}
                  <span className={`
                    text-xs font-medium text-center leading-tight
                    ${template.id === 'blank' ? 'text-white' : 'text-gray-700'}
                  `}>
                    {template.name}
                  </span>

                  {/* Tooltip al hover */}
                  {isHovered && template.id !== 'blank' && template.id !== 'all' && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full z-20">
                      <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl whitespace-nowrap">
                        <div className="font-medium mb-0.5">Vista previa</div>
                        <button className="px-3 py-1 bg-blue-500 hover:bg-blue-600 rounded text-white text-xs font-medium mt-1">
                          Usar plantilla
                        </button>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Plan Card */}
        {planInfo && (
          <div className={`mb-8 rounded-2xl border-2 ${planColors.border} ${planColors.bg} overflow-hidden`}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl ${isUnlimited ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-white'} flex items-center justify-center shadow-sm`}>
                    {isUnlimited ? (
                      <Crown className="text-white" size={24} />
                    ) : (
                      <Zap className={planColors.icon} size={24} />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className={`text-lg font-bold ${planColors.text}`}>
                        Plan {PLAN_NAMES[planInfo.plan] || planInfo.plan}
                      </h2>
                      {isUnlimited && (
                        <span className="text-xs font-semibold px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                          ∞ Ilimitado
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {isUnlimited 
                        ? 'Acceso completo a todas las funciones' 
                        : 'Límites de tu plan actual'}
                    </p>
                  </div>
                </div>

                {/* Botón de upgrade solo para plan free */}
                {planInfo.plan === 'free' && (
                  <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-all shadow-md hover:shadow-lg">
                    <Zap size={16} />
                    Actualizar a Personal - $3/mes
                  </button>
                )}
              </div>

              {/* Barras de progreso para plan free */}
              {!isUnlimited && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Mapas Activos */}
                  <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Mapas Activos</span>
                      <span className="text-sm font-bold text-gray-900">
                        {planInfo.usage.active_maps} / {planInfo.limits.max_active_maps}
                      </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getProgressColor(planInfo.usage.active_maps, planInfo.limits.max_active_maps)} rounded-full transition-all duration-500`}
                        style={{ width: `${getProgressPercentage(planInfo.usage.active_maps, planInfo.limits.max_active_maps)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {planInfo.usage.active_remaining > 0 
                        ? `${planInfo.usage.active_remaining} disponibles`
                        : '⚠️ Límite alcanzado'}
                    </p>
                  </div>

                  {/* Mapas Creados (histórico) */}
                  <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Mapas Creados (total)</span>
                      <span className="text-sm font-bold text-gray-900">
                        {planInfo.usage.total_maps_created} / {planInfo.limits.max_total_maps_created}
                      </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getProgressColor(planInfo.usage.total_maps_created, planInfo.limits.max_total_maps_created)} rounded-full transition-all duration-500`}
                        style={{ width: `${getProgressPercentage(planInfo.usage.total_maps_created, planInfo.limits.max_total_maps_created)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {planInfo.usage.total_remaining > 0 
                        ? `${planInfo.usage.total_remaining} disponibles`
                        : '⚠️ Límite de prueba alcanzado'}
                    </p>
                  </div>
                </div>
              )}

              {/* Beneficios del plan ilimitado */}
              {isUnlimited && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Sparkles className="w-4 h-4 text-green-500" />
                    <span>Mapas ilimitados</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Sparkles className="w-4 h-4 text-green-500" />
                    <span>Nodos ilimitados</span>
                  </div>
                  {planInfo.limits.can_collaborate && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4 text-green-500" />
                      <span>Colaboración</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Exportación PDF</span>
                  </div>
                </div>
              )}

              {/* Mensaje de advertencia si está cerca del límite */}
              {!isUnlimited && !planInfo.usage.can_create_map && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 font-medium flex items-center gap-2">
                    <Bell size={16} />
                    Has alcanzado el límite de tu plan. Actualiza a Personal para seguir creando mapas.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <FolderKanban className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{totalProjects}</p>
                <p className="text-sm text-gray-500">Proyectos</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <TrendingUp className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{totalNodes}</p>
                <p className="text-sm text-gray-500">Nodos totales</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Calendar className="text-purple-600" size={24} />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{new Date().getDate()}</p>
                <p className="text-sm text-gray-500">{new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Projects - Tabla */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-visible">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock size={18} className="text-gray-400" />
              Proyectos recientes
            </h2>
          </div>
          
          {recentProjects.length > 0 ? (
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-8"></th>
                    <th className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                    <th className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación</th>
                    <th className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Creado por</th>
                    <th className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Modificado</th>
                    <th className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentProjects.map((project) => {
                    const isMenuOpen = openMenuId === project.id;
                    const isFree = planInfo?.plan === 'free';
                    
                    return (
                      <tr 
                        key={project.id} 
                        className="hover:bg-gray-50 transition-colors cursor-pointer group"
                      >
                        {/* Estrella de favoritos */}
                        <td className="px-5 py-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavorite?.(project.id);
                            }}
                            className="text-gray-300 hover:text-yellow-400 transition-colors"
                            title="Agregar a favoritos"
                          >
                            <Star 
                              size={18} 
                              className={project.isPinned ? 'fill-yellow-400 text-yellow-400' : ''} 
                            />
                          </button>
                        </td>
                        
                        {/* Nombre con icono */}
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                              <FolderKanban className="text-white" size={14} />
                            </div>
                            <span className="font-medium text-gray-900 truncate max-w-[200px]">
                              {project.name}
                            </span>
                          </div>
                        </td>
                        
                        {/* Ubicación */}
                        <td className="px-3 py-4">
                          <span className="text-sm text-gray-500">
                            Mis mapas
                          </span>
                        </td>
                        
                        {/* Creado por */}
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                              {(user?.username || 'U').charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-gray-600">
                              {user?.full_name || user?.username || 'Usuario'}
                            </span>
                          </div>
                        </td>
                        
                        {/* Modificado */}
                        <td className="px-3 py-4">
                          <span className="text-sm text-gray-400">
                            {formatDateRelative(project.updatedAt)}
                          </span>
                        </td>

                        {/* Menú de acciones */}
                        <td className="px-3 py-4 relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(isMenuOpen ? null : project.id);
                            }}
                            className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Acciones del mapa"
                          >
                            <MoreHorizontal size={18} />
                          </button>

                          {/* Dropdown Menu */}
                          {isMenuOpen && (
                            <div 
                              ref={menuRef}
                              className="fixed w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-[100]"
                              style={{ 
                                top: 'auto',
                                right: '40px',
                                bottom: 'auto',
                                transform: 'translateY(-50%)'
                              }}
                            >
                              {/* Header */}
                              <div className="px-3 py-2 border-b border-gray-100">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones del mapa</p>
                              </div>

                              {/* Compartir mapa */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(null);
                                  // TODO: Abrir modal de compartir
                                  alert('Funcionalidad de compartir próximamente');
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <Share2 size={16} className="text-gray-400" />
                                <span>Compartir mapa</span>
                              </button>

                              {/* Duplicar */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isFree) {
                                    setOpenMenuId(null);
                                    onShowUpgradeModal?.('duplicate');
                                  } else {
                                    setOpenMenuId(null);
                                    onDuplicateProject?.(project.id);
                                  }
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors ${
                                  isFree ? 'text-gray-400' : 'text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <Copy size={16} className={isFree ? 'text-gray-300' : 'text-gray-400'} />
                                  <span>Duplicar</span>
                                </div>
                                {isFree && (
                                  <span className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                                    Cámbiate <ExternalLink size={12} />
                                  </span>
                                )}
                              </button>

                              {/* Mover a Mis mapas */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isFree) {
                                    setOpenMenuId(null);
                                    onShowUpgradeModal?.('move');
                                  } else {
                                    setOpenMenuId(null);
                                    // TODO: Mover a otra ubicación
                                    alert('Mover a otra ubicación próximamente');
                                  }
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors ${
                                  isFree ? 'text-gray-400' : 'text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <FolderInput size={16} className={isFree ? 'text-gray-300' : 'text-gray-400'} />
                                  <span>Mover a Mis mapas</span>
                                </div>
                                {isFree && (
                                  <span className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                                    Cámbiate <ExternalLink size={12} />
                                  </span>
                                )}
                              </button>

                              {/* Publicar en Universo */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isFree) {
                                    setOpenMenuId(null);
                                    onShowUpgradeModal?.('publish');
                                  } else {
                                    setOpenMenuId(null);
                                    // TODO: Publicar en Universo
                                    alert('Publicar en Universo próximamente');
                                  }
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors ${
                                  isFree ? 'text-gray-400' : 'text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <Globe size={16} className={isFree ? 'text-gray-300' : 'text-gray-400'} />
                                  <span>Publicar en Universo</span>
                                </div>
                                {isFree && (
                                  <span className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                                    Cámbiate <ExternalLink size={12} />
                                  </span>
                                )}
                              </button>

                              {/* Separador */}
                              <div className="my-2 border-t border-gray-100" />

                              {/* Mover a la papelera */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(null);
                                  if (window.confirm(`¿Estás seguro de mover "${project.name}" a la papelera?`)) {
                                    onDeleteProject?.(project.id);
                                  }
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 size={16} className="text-red-500" />
                                <span>Mover a la papelera</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <FolderKanban className="text-gray-400" size={24} />
              </div>
              <p className="text-gray-500 mb-2">No hay proyectos todavía</p>
              <p className="text-sm text-gray-400">¡Crea tu primer mapa usando las plantillas de arriba!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;

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
  X,
  AlertTriangle,
  Search,
  LayoutGrid,
  List as ListIcon
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Nombres de planes para mostrar
// URL del logo MindoraMap
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_mindviz-app/artifacts/k1kioask_image.png';

const PLAN_NAMES = {
  'free': 'Gratis',
  'personal': 'Personal',
  'pro': 'Personal',
  'team': 'Team',
  'business': 'Business',
  'admin': 'Admin'
};

// Jerarquía de planes para upgrade (de menor a mayor)
const PLAN_HIERARCHY = ['free', 'personal', 'team', 'business'];

// Precios de planes
const PLAN_PRICES = {
  'personal': '$3/mes',
  'team': '$9/mes',
  'business': '$19/mes'
};

// Función para obtener el siguiente plan de upgrade
const getNextUpgradePlan = (currentPlan) => {
  // Normalizar el plan (pro = personal, admin = business)
  const normalizedPlan = currentPlan === 'pro' ? 'personal' : (currentPlan === 'admin' ? 'business' : currentPlan);
  const currentIndex = PLAN_HIERARCHY.indexOf(normalizedPlan);
  
  // Si es el plan más alto o no se encuentra, no hay upgrade
  if (currentIndex === -1 || currentIndex >= PLAN_HIERARCHY.length - 1) {
    return null;
  }
  
  return PLAN_HIERARCHY[currentIndex + 1];
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

// Componente de miniatura del mapa - renderiza una preview real de los nodos
const MapThumbnail = ({ nodes = [] }) => {
  if (!nodes || nodes.length === 0) {
    // Placeholder si no hay nodos
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex items-center gap-2 opacity-50">
          <div className="w-4 h-4 rounded-full bg-blue-300"></div>
          <div className="w-8 h-0.5 bg-gray-300"></div>
          <div className="w-3 h-3 rounded-full bg-green-300"></div>
        </div>
      </div>
    );
  }

  // Calcular bounds de los nodos para normalizar posiciones
  const xs = nodes.map(n => n.x || 0);
  const ys = nodes.map(n => n.y || 0);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  const width = maxX - minX || 1;
  const height = maxY - minY || 1;
  
  // Padding y escala
  const padding = 20;
  const containerWidth = 200;
  const containerHeight = 120;
  const scale = Math.min(
    (containerWidth - padding * 2) / width,
    (containerHeight - padding * 2) / height,
    1
  );

  // Mapeo de colores a clases de Tailwind
  const colorMap = {
    'blue': '#3b82f6',
    'red': '#ef4444',
    'green': '#22c55e',
    'yellow': '#eab308',
    'purple': '#a855f7',
    'pink': '#ec4899',
    'orange': '#f97316',
    'cyan': '#06b6d4',
    'teal': '#14b8a6',
    'indigo': '#6366f1',
    'gray': '#6b7280',
    'default': '#3b82f6'
  };

  const getNodeColor = (color) => {
    if (!color) return colorMap.default;
    if (color.startsWith('#')) return color;
    return colorMap[color] || colorMap.default;
  };

  // Crear un mapa de nodos por ID para encontrar padres
  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n.id] = n; });

  return (
    <svg 
      viewBox={`0 0 ${containerWidth} ${containerHeight}`} 
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Fondo con gradiente */}
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f9fafb" />
          <stop offset="100%" stopColor="#f3f4f6" />
        </linearGradient>
      </defs>
      <rect width={containerWidth} height={containerHeight} fill="url(#bgGradient)" rx="8" />
      
      {/* Líneas de conexión */}
      {nodes.map(node => {
        if (!node.parentId) return null;
        const parent = nodeMap[node.parentId];
        if (!parent) return null;
        
        const x1 = padding + ((parent.x || 0) - minX) * scale;
        const y1 = padding + ((parent.y || 0) - minY) * scale;
        const x2 = padding + ((node.x || 0) - minX) * scale;
        const y2 = padding + ((node.y || 0) - minY) * scale;
        
        return (
          <line
            key={`line-${node.id}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#d1d5db"
            strokeWidth="1.5"
          />
        );
      })}
      
      {/* Nodos */}
      {nodes.map((node, index) => {
        const x = padding + ((node.x || 0) - minX) * scale;
        const y = padding + ((node.y || 0) - minY) * scale;
        const isRoot = !node.parentId;
        const size = isRoot ? 8 : 5;
        const color = getNodeColor(node.color || node.bgColor);
        
        return (
          <circle
            key={node.id}
            cx={x}
            cy={y}
            r={size}
            fill={color}
            stroke="white"
            strokeWidth="1.5"
          />
        );
      })}
    </svg>
  );
};

const DashboardView = ({ projects = [], onOpenProject, token, user, onNewProject, onOpenTemplates, onToggleFavorite, onDeleteProject, onDuplicateProject, onShowUpgradeModal, onViewAllMaps }) => {
  const [planInfo, setPlanInfo] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [hoveredTemplate, setHoveredTemplate] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef(null);
  
  // Estado para búsqueda de proyectos
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado para el tipo de vista: 'list' o 'grid'
  const [viewType, setViewType] = useState('list');
  
  // Estado para el modal de confirmación de eliminar
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    isOpen: false,
    projectId: null,
    projectName: ''
  });

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

  // Función para abrir menú con posición inteligente (smart positioning)
  const handleOpenMenu = (e, projectId) => {
    e.stopPropagation();
    if (openMenuId === projectId) {
      setOpenMenuId(null);
      return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const menuHeight = 320; // Altura aproximada del menú con espaciados aumentados
    const menuWidth = 280;  // minWidth: 280px
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const padding = 16; // Padding del viewport
    
    // Calcular posición vertical (flip up si no hay espacio abajo)
    let top = rect.bottom + 8;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    if (spaceBelow < menuHeight + padding && spaceAbove > menuHeight + padding) {
      // Flip up: mostrar arriba del botón
      top = rect.top - menuHeight - 8;
    }
    
    // Asegurar que no se salga por abajo
    if (top + menuHeight > viewportHeight - padding) {
      top = viewportHeight - menuHeight - padding;
    }
    
    // Asegurar que no se salga por arriba
    if (top < padding) {
      top = padding;
    }
    
    // Calcular posición horizontal
    let left = rect.right - menuWidth;
    
    // Asegurar que no se salga por la izquierda
    if (left < padding) {
      left = padding;
    }
    
    // Asegurar que no se salga por la derecha
    if (left + menuWidth > viewportWidth - padding) {
      left = viewportWidth - menuWidth - padding;
    }
    
    setMenuPosition({ top, left });
    setOpenMenuId(projectId);
  };

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
  
  // Filtrar proyectos por término de búsqueda
  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Proyectos recientes (ordenados por fecha, filtrados si hay búsqueda)
  const recentProjects = [...filteredProjects]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

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
    <div className="flex-1 h-full overflow-y-auto bg-gray-50">
      {/* Header con bienvenida y avatar */}
      <div className="border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <img 
              src={LOGO_URL} 
              alt="MindoraMap" 
              style={{ width: '200px', height: 'auto' }}
              className="object-contain"
            />
            
            {/* Bienvenida y Avatar */}
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-light text-gray-900">
                ¡Te damos la bienvenida, <span className="font-semibold">{userName}</span>!
              </h1>
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-semibold text-lg shadow-lg">
                {userName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 pb-24">
        {/* Sección: Crear un mapa */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-medium text-gray-900">Crear un mapa</h2>
            
            {/* Botón dinámico de Upgrade/Plan actual */}
            {(() => {
              const currentPlan = planInfo?.plan || 'free';
              const nextPlan = getNextUpgradePlan(currentPlan);
              
              // Si hay un plan de upgrade disponible
              if (nextPlan) {
                return (
                  <button 
                    onClick={() => onShowUpgradeModal?.(nextPlan)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md hover:shadow-lg"
                  >
                    <Zap size={16} />
                    Actualizar a {PLAN_NAMES[nextPlan]} - {PLAN_PRICES[nextPlan]}
                  </button>
                );
              }
              
              // Si está en el plan más alto (Business o Admin), mostrar estado actual
              return (
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold rounded-xl">
                  <Crown size={16} />
                  Plan actual: {PLAN_NAMES[currentPlan] || currentPlan}
                </div>
              );
            })()}
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

        {/* Barra de búsqueda y botón Crear */}
        <div className="flex items-center gap-3 mb-6">
          {/* Campo de búsqueda */}
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar mapas"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          
          {/* Botones de vista (Grid / Lista) */}
          <div className="flex items-center gap-1 border border-gray-200 rounded-xl p-1 bg-white">
            <button
              onClick={() => setViewType('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewType === 'grid'
                  ? 'bg-blue-50 text-blue-600 ring-2 ring-blue-500'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
              title="Vista de cuadrícula"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewType('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewType === 'list'
                  ? 'bg-blue-50 text-blue-600 ring-2 ring-blue-500'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
              title="Vista de lista"
            >
              <ListIcon size={18} />
            </button>
          </div>
          
          {/* Botón Crear */}
          <button
            onClick={() => onNewProject?.('blank')}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors shadow-sm"
          >
            <Plus size={18} />
            <span>Crear</span>
          </button>
        </div>

        {/* Recent Projects - Tabla */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock size={18} className="text-gray-400" />
              Proyectos recientes
              {searchTerm && (
                <span className="text-sm font-normal text-gray-500">
                  ({filteredProjects.length} resultado{filteredProjects.length !== 1 ? 's' : ''})
                </span>
              )}
            </h2>
          </div>
          
          {recentProjects.length > 0 ? (
            <>
              {/* Vista de Lista (Tabla) */}
              {viewType === 'list' && (
                <div>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 text-left">
                        <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                        <th className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación</th>
                        <th className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Creado por</th>
                        <th className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Modificado</th>
                        <th className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-24"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {recentProjects.map((project) => (
                        <tr 
                          key={project.id} 
                          onClick={() => onOpenProject?.(project.id)}
                          className="hover:bg-gray-50 transition-colors cursor-pointer group"
                        >
                        {/* Nombre con icono */}
                        <td className="px-5 py-4">
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

                        {/* Acciones: Favorito + Menú */}
                        <td className="px-3 py-4">
                          <div className="flex items-center justify-end gap-1">
                            {/* Estrella de favoritos */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Toggle: si isPinned, quitar; si no, agregar
                                onToggleFavorite?.(project.id, !project.isPinned);
                              }}
                              className={`p-1.5 rounded-lg transition-colors ${
                                project.isPinned 
                                  ? 'text-yellow-500 hover:bg-yellow-50' 
                                  : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-100'
                              }`}
                              title={project.isPinned ? "Quitar de favoritos" : "Agregar a favoritos"}
                            >
                              <Star 
                                size={18} 
                                className={project.isPinned ? 'fill-yellow-500' : ''} 
                                strokeWidth={project.isPinned ? 2 : 1.5}
                              />
                            </button>

                            {/* Menú de 3 puntitos */}
                            <button
                              onClick={(e) => handleOpenMenu(e, project.id)}
                              className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                              title="Acciones del mapa"
                            >
                              <MoreHorizontal size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              
              {/* Dropdown Menu - Portal style, fuera de la tabla */}
              {openMenuId && (
                <div 
                  ref={menuRef}
                  className="fixed bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-[100]"
                  style={{ 
                    top: `${menuPosition.top}px`,
                    left: `${menuPosition.left}px`,
                    minWidth: '280px',
                    width: 'auto'
                  }}
                >
                  {/* Header */}
                  <div className="px-4 py-2.5 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones del mapa</p>
                  </div>

                  {(() => {
                    const isFree = planInfo?.plan === 'free';
                    const project = projects.find(p => p.id === openMenuId);
                    if (!project) return null;

                    return (
                      <>
                        {/* Compartir mapa */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                            alert('Funcionalidad de compartir próximamente');
                          }}
                          className="w-full flex items-center gap-4 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Share2 size={18} className="text-gray-400 flex-shrink-0" />
                          <span className="font-medium">Compartir mapa</span>
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
                          className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                            isFree ? 'text-gray-400' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <Copy size={18} className={`flex-shrink-0 ${isFree ? 'text-gray-300' : 'text-gray-400'}`} />
                            <span className="font-medium">Duplicar</span>
                          </div>
                          {isFree && (
                            <span className="text-xs font-semibold text-blue-600 flex items-center gap-1 flex-shrink-0 ml-4">
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
                              alert('Mover a otra ubicación próximamente');
                            }
                          }}
                          className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                            isFree ? 'text-gray-400' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <FolderInput size={18} className={`flex-shrink-0 ${isFree ? 'text-gray-300' : 'text-gray-400'}`} />
                            <span className="font-medium">Mover a Mis mapas</span>
                          </div>
                          {isFree && (
                            <span className="text-xs font-semibold text-blue-600 flex items-center gap-1 flex-shrink-0 ml-4">
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
                              alert('Publicar en Universo próximamente');
                            }
                          }}
                          className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                            isFree ? 'text-gray-400' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <Globe size={18} className={`flex-shrink-0 ${isFree ? 'text-gray-300' : 'text-gray-400'}`} />
                            <span className="font-medium">Publicar en Universo</span>
                          </div>
                          {isFree && (
                            <span className="text-xs font-semibold text-blue-600 flex items-center gap-1 flex-shrink-0 ml-4">
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
                            // Abrir modal de confirmación personalizado
                            setDeleteConfirmModal({
                              isOpen: true,
                              projectId: project.id,
                              projectName: project.name
                            });
                          }}
                          className="w-full flex items-center gap-4 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={18} className="text-red-500 flex-shrink-0" />
                          <span className="font-medium">Mover a la papelera</span>
                        </button>
                      </>
                    );
                  })()}
                </div>
              )}
                </div>
              )}

              {/* Vista de Grid (Tarjetas) */}
              {viewType === 'grid' && (
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {recentProjects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => onOpenProject?.(project.id)}
                      className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group relative"
                    >
                      {/* Preview del mapa - Miniatura real o captura guardada */}
                      <div className="w-full h-32 rounded-lg overflow-hidden mb-3 border border-gray-100">
                        {project.thumbnail ? (
                          <img 
                            src={project.thumbnail} 
                            alt={project.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <MapThumbnail nodes={project.nodes} />
                        )}
                      </div>

                      {/* Nombre del proyecto */}
                      <h3 className="font-medium text-gray-900 truncate mb-1" title={project.name}>
                        {project.name}
                      </h3>

                      {/* Fecha */}
                      <p className="text-xs text-gray-500">
                        {formatDateRelative(project.updatedAt)}
                      </p>

                      {/* Acciones (favorito y menú) */}
                      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite?.(project.id);
                          }}
                          className={`p-1.5 rounded-lg transition-colors ${
                            project.isPinned 
                              ? 'text-yellow-500 bg-yellow-50' 
                              : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-100'
                          }`}
                          title={project.isPinned ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                        >
                          <Star size={16} fill={project.isPinned ? 'currentColor' : 'none'} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenMenu(project.id, e);
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                          title="Acciones del mapa"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </div>

                      {/* Indicador de favorito visible siempre si está activo */}
                      {project.isPinned && (
                        <div className="absolute top-3 left-3">
                          <Star size={14} className="text-yellow-500" fill="currentColor" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="px-5 py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                {searchTerm ? (
                  <Search className="text-gray-400" size={24} />
                ) : (
                  <FolderKanban className="text-gray-400" size={24} />
                )}
              </div>
              {searchTerm ? (
                <>
                  <p className="text-gray-500 mb-2">No se encontraron mapas</p>
                  <p className="text-sm text-gray-400">No hay mapas que coincidan con &ldquo;{searchTerm}&rdquo;</p>
                </>
              ) : (
                <>
                  <p className="text-gray-500 mb-2">No hay proyectos todavía</p>
                  <p className="text-sm text-gray-400">¡Crea tu primer mapa usando las plantillas de arriba!</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Plan Card - Debajo de Proyectos recientes */}
        {planInfo && (
          <div className={`mt-8 rounded-2xl border-2 ${planColors.border} ${planColors.bg} overflow-hidden`}>
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

                {/* Botón de upgrade dinámico (solo si hay plan superior disponible) */}
                {(() => {
                  const nextPlan = getNextUpgradePlan(planInfo.plan);
                  if (!nextPlan) return null;
                  
                  return (
                    <button 
                      onClick={() => onShowUpgradeModal?.(nextPlan)}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-all shadow-md hover:shadow-lg"
                    >
                      <Zap size={16} />
                      Actualizar a {PLAN_NAMES[nextPlan]} - {PLAN_PRICES[nextPlan]}
                    </button>
                  );
                })()}
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

        {/* Espaciado de respiro inferior */}
        <div className="h-8" aria-hidden="true" />
      </div>

      {/* Modal de confirmación para eliminar proyecto */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          {/* Overlay oscuro */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeleteConfirmModal({ isOpen: false, projectId: null, projectName: '' })}
          />
          
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Enviar a la Papelera</h3>
              </div>
              <button
                onClick={() => setDeleteConfirmModal({ isOpen: false, projectId: null, projectName: '' })}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            
            {/* Contenido */}
            <div className="px-6 pb-6">
              <p className="text-gray-600 mb-6">
                ¿Estás seguro de enviar &ldquo;<span className="font-medium text-gray-900">{deleteConfirmModal.projectName}</span>&rdquo; a la papelera? Podrás restaurarlo después.
              </p>
              
              {/* Botones */}
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmModal({ isOpen: false, projectId: null, projectName: '' })}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    onDeleteProject?.(deleteConfirmModal.projectId);
                    setDeleteConfirmModal({ isOpen: false, projectId: null, projectName: '' });
                  }}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors"
                >
                  Enviar a Papelera
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardView;

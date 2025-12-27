import React, { useState, useEffect } from 'react';
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
  Infinity,
  Users,
  CheckCircle2
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

const DashboardView = ({ projects = [], onClose, token }) => {
  const [planInfo, setPlanInfo] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(true);

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

  return (
    <div className="flex-1 h-full overflow-y-auto bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <LayoutDashboard className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Panel de Control</h1>
            <p className="text-sm text-gray-500">Vista general de tu espacio de trabajo</p>
          </div>
        </div>
      </div>

      {/* Plan Card - NUEVO */}
      {planInfo && (
        <div className={`mb-6 rounded-2xl border-2 ${planColors.border} ${planColors.bg} overflow-hidden`}>
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

      {/* Recent Projects */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock size={18} className="text-gray-400" />
            Proyectos recientes
          </h2>
        </div>
        
        {recentProjects.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {recentProjects.map((project) => (
              <div 
                key={project.id} 
                className="px-5 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FolderKanban className="text-blue-600" size={18} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{project.name}</p>
                    <p className="text-sm text-gray-500">{project.nodes?.length || 0} nodos</p>
                  </div>
                </div>
                <span className="text-sm text-gray-400">
                  {formatDate(project.updatedAt)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-gray-500">
            No hay proyectos todavía
          </div>
        )}
      </div>

      {/* Quick Actions placeholder */}
      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <p className="text-sm text-blue-700 flex items-center gap-2">
          <Bell size={16} />
          <span>Próximamente: Widgets personalizables y más estadísticas.</span>
        </p>
      </div>
    </div>
  );
};

export default DashboardView;

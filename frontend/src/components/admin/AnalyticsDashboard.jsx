import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, TrendingUp, TrendingDown, FolderOpen, BarChart3, PieChart,
  Activity, UserCheck, Crown, Calendar, RefreshCw, Loader2,
  ArrowUpRight, ArrowDownRight, Target, Zap, Clock, Layers
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const API_URL = '';

// Colores para gráficos
const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  pink: '#ec4899',
  indigo: '#6366f1'
};

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

// Componente de Tarjeta de Métrica
const MetricCard = ({ icon: Icon, title, value, subtitle, trend, trendValue, color = 'blue' }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-emerald-600',
    amber: 'from-amber-500 to-orange-600',
    purple: 'from-purple-500 to-violet-600',
    cyan: 'from-cyan-500 to-teal-600',
    pink: 'from-pink-500 to-rose-600'
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {(trend !== undefined && trendValue !== undefined) && (
            <div className={`flex items-center gap-1 text-sm font-medium ${
              trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
            }`}>
              {trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : 
               trend === 'down' ? <ArrowDownRight className="w-4 h-4" /> : null}
              {trendValue}
            </div>
          )}
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
};

// Componente de Mini Stat
const MiniStat = ({ label, value, icon: Icon, color }) => (
  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
    <div className={`p-2 rounded-lg ${color}`}>
      <Icon className="w-4 h-4 text-white" />
    </div>
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

// Custom Tooltip para gráficos
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100">
        <p className="text-sm font-medium text-gray-900 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: <span className="font-semibold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Componente Principal de Analytics
const AnalyticsDashboard = ({ token }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/admin/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      } else {
        setError('Error al cargar analytics');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error de conexión');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Cargando analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">{error}</p>
        <button 
          onClick={fetchAnalytics}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) return null;

  // Formatear datos para gráficos
  const growthChartData = data.user_growth.map(point => ({
    ...point,
    dateShort: point.date.slice(5) // MM-DD
  }));

  const activityChartData = data.activity_metrics.map(point => ({
    ...point,
    dateShort: point.date.slice(5)
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-500 mt-1">Métricas y estadísticas de tu plataforma</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <MetricCard
          icon={Users}
          title="Total Usuarios"
          value={data.total_users.toLocaleString()}
          trend={data.growth_rate_weekly > 0 ? 'up' : data.growth_rate_weekly < 0 ? 'down' : null}
          trendValue={`${data.growth_rate_weekly > 0 ? '+' : ''}${data.growth_rate_weekly}% esta semana`}
          color="blue"
        />
        <MetricCard
          icon={FolderOpen}
          title="Proyectos Totales"
          value={data.total_projects.toLocaleString()}
          subtitle={`${data.avg_projects_per_user} promedio por usuario`}
          color="purple"
        />
        <MetricCard
          icon={Crown}
          title="Tasa de Conversión"
          value={`${data.conversion_rate}%`}
          subtitle="Free → Pro"
          color="amber"
        />
        <MetricCard
          icon={Activity}
          title="Activos (24h)"
          value={data.active_users_24h.toLocaleString()}
          subtitle={`${Math.round(data.active_users_24h / data.total_users * 100)}% del total`}
          color="green"
        />
      </div>

      {/* Growth Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MiniStat
          label="Hoy"
          value={data.users_today}
          icon={Calendar}
          color="bg-blue-500"
        />
        <MiniStat
          label="Esta semana"
          value={data.users_this_week}
          icon={TrendingUp}
          color="bg-green-500"
        />
        <MiniStat
          label="Este mes"
          value={data.users_this_month}
          icon={BarChart3}
          color="bg-purple-500"
        />
        <MiniStat
          label="Contactos"
          value={data.total_contacts}
          icon={UserCheck}
          color="bg-cyan-500"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* User Growth Chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Crecimiento de Usuarios</h3>
              <p className="text-sm text-gray-500">Últimos 30 días</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                Nuevos
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                Acumulado
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={growthChartData}>
              <defs>
                <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.1}/>
                  <stop offset="95%" stopColor={COLORS.success} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="dateShort" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke={COLORS.success}
                strokeWidth={2}
                fill="url(#colorCumulative)"
                name="Acumulado"
              />
              <Bar dataKey="count" fill={COLORS.primary} radius={[4, 4, 0, 0]} name="Nuevos" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Plan Distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Distribución de Planes</h3>
          <p className="text-sm text-gray-500 mb-6">Por tipo de membresía</p>
          
          <ResponsiveContainer width="100%" height={200}>
            <RechartsPie>
              <Pie
                data={data.plan_distribution}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="count"
                nameKey="plan"
              >
                {data.plan_distribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPie>
          </ResponsiveContainer>

          <div className="space-y-2 mt-4">
            {data.plan_distribution.map((plan, index) => (
              <div key={plan.plan} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                  ></span>
                  <span className="text-sm text-gray-600">{plan.plan}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{plan.count}</span>
                  <span className="text-xs text-gray-400">({plan.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Activity Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Actividad Diaria</h3>
              <p className="text-sm text-gray-500">Últimos 14 días</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={activityChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="dateShort" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="new_registrations" fill={COLORS.primary} radius={[4, 4, 0, 0]} name="Registros" />
              <Bar dataKey="projects_created" fill={COLORS.purple} radius={[4, 4, 0, 0]} name="Proyectos" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Retention Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Retención de Usuarios</h3>
              <p className="text-sm text-gray-500">Cohortes semanales</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {data.retention_data.map((cohort, index) => (
              <div key={cohort.period} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{cohort.period}</span>
                  <span className="font-semibold text-gray-900">{cohort.retention_rate}%</span>
                </div>
                <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${cohort.retention_rate}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{cohort.cohort_size} usuarios</span>
                  <span>{cohort.retained} retenidos</span>
                </div>
              </div>
            ))}
          </div>

          {/* Average retention */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Retención promedio</span>
              <span className="text-lg font-bold text-green-600">
                {data.retention_data.length > 0 
                  ? Math.round(data.retention_data.reduce((acc, c) => acc + c.retention_rate, 0) / data.retention_data.length)
                  : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Footer */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold">{data.total_users}</p>
            <p className="text-blue-100 text-sm mt-1">Usuarios totales</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">{data.total_projects}</p>
            <p className="text-blue-100 text-sm mt-1">Proyectos creados</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">{data.total_boards}</p>
            <p className="text-blue-100 text-sm mt-1">Tableros activos</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">{data.total_contacts}</p>
            <p className="text-blue-100 text-sm mt-1">Contactos guardados</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;

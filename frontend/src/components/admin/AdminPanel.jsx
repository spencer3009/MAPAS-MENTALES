import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Users, 
  TrendingUp, 
  Crown, 
  FolderOpen,
  ArrowLeft,
  Edit3,
  Save,
  X,
  Loader2,
  Shield,
  Calendar,
  Search,
  LayoutDashboard,
  FileText,
  Settings,
  ChevronRight,
  UserCheck,
  Activity,
  BarChart3,
  Globe,
  Sparkles,
  Eye,
  Mail,
  Clock,
  Trash2,
  Ban,
  UserX,
  CheckCircle,
  AlertTriangle,
  MoreVertical
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_mindviz-app/artifacts/k1kioask_image.png';

// Componente de Métrica con diseño mejorado
const MetricCard = ({ icon: Icon, title, value, subtitle, gradient, iconBg, trend, trendValue }) => (
  <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 group">
    {/* Decorative gradient */}
    <div className={`absolute top-0 right-0 w-32 h-32 ${gradient} opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500`} />
    
    <div className="relative p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-bold text-gray-900">{value}</p>
            {trend && (
              <span className={`flex items-center gap-1 text-sm font-medium ${
                trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                <TrendingUp className={`w-4 h-4 ${trend === 'down' ? 'rotate-180' : ''}`} />
                {trendValue}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400">{subtitle}</p>
        </div>
        <div className={`p-4 rounded-2xl ${iconBg} shadow-lg`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
      </div>
    </div>
  </div>
);

// Mini tarjeta de estadística
const MiniStat = ({ icon: Icon, label, value, color }) => (
  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
    <div className={`p-2 rounded-lg ${color}`}>
      <Icon className="w-4 h-4 text-white" />
    </div>
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  </div>
);

// Sección de Dashboard mejorada
const DashboardSection = ({ metrics, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Cargando métricas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header con bienvenida */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Bienvenido de vuelta. Aquí está el resumen de tu plataforma.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <Calendar className="w-4 h-4" />
            Últimos 30 días
          </button>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <MetricCard 
          icon={Users} 
          title="Total Usuarios" 
          value={metrics.total_users || 0}
          subtitle="Usuarios registrados"
          gradient="bg-blue-500"
          iconBg="bg-gradient-to-br from-blue-500 to-blue-600"
          trend="up"
          trendValue="+12%"
        />
        <MetricCard 
          icon={UserCheck} 
          title="Nuevos (7 días)" 
          value={metrics.new_users_7_days || 0}
          subtitle="Últimos 7 días"
          gradient="bg-green-500"
          iconBg="bg-gradient-to-br from-green-500 to-emerald-600"
          trend="up"
          trendValue="+8%"
        />
        <MetricCard 
          icon={Crown} 
          title="Usuarios Pro" 
          value={metrics.pro_users || 0}
          subtitle="Membresía activa"
          gradient="bg-amber-500"
          iconBg="bg-gradient-to-br from-amber-500 to-orange-600"
        />
        <MetricCard 
          icon={FolderOpen} 
          title="Proyectos" 
          value={metrics.total_projects || 0}
          subtitle="Proyectos creados"
          gradient="bg-purple-500"
          iconBg="bg-gradient-to-br from-purple-500 to-violet-600"
          trend="up"
          trendValue="+5%"
        />
      </div>

      {/* Sección de estadísticas secundarias */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Actividad reciente */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Resumen de Actividad
            </h3>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Ver todo
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MiniStat 
              icon={Users} 
              label="Usuarios Activos" 
              value={metrics.total_users || 0}
              color="bg-blue-500"
            />
            <MiniStat 
              icon={Calendar} 
              label="Nuevos (30 días)" 
              value={metrics.new_users_30_days || 0}
              color="bg-purple-500"
            />
            <MiniStat 
              icon={FolderOpen} 
              label="Proyectos Activos" 
              value={metrics.total_projects || 0}
              color="bg-green-500"
            />
            <MiniStat 
              icon={Crown} 
              label="Tasa Conversión" 
              value={metrics.total_users > 0 ? `${Math.round((metrics.pro_users / metrics.total_users) * 100)}%` : '0%'}
              color="bg-amber-500"
            />
          </div>

          {/* Barra de progreso visual */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Meta mensual de usuarios</span>
              <span className="text-sm font-medium text-gray-900">{metrics.total_users}/100</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((metrics.total_users / 100) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Panel de acciones rápidas */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-white/20 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold">Acciones Rápidas</h3>
          </div>
          
          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
              <span className="flex items-center gap-3">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">Ver usuarios</span>
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button className="w-full flex items-center justify-between p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
              <span className="flex items-center gap-3">
                <Globe className="w-4 h-4" />
                <span className="text-sm font-medium">Editar landing</span>
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button className="w-full flex items-center justify-between p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
              <span className="flex items-center gap-3">
                <BarChart3 className="w-4 h-4" />
                <span className="text-sm font-medium">Ver reportes</span>
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-white/20">
            <p className="text-xs text-white/70">
              Última actualización: hace 5 minutos
            </p>
          </div>
        </div>
      </div>

      {/* Usuarios recientes */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-600" />
            Usuarios Recientes
          </h3>
        </div>
        
        <div className="text-center py-8 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Los usuarios recientes aparecerán aquí</p>
          <p className="text-sm">Ve a la pestaña "Usuarios" para ver la lista completa</p>
        </div>
      </div>
    </div>
  );
};

// Sección de Usuarios mejorada
const UsersSection = ({ users, loading, onEditUser, token }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (user) => {
    setEditingUser(user.username);
    setEditForm({
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_pro: user.is_pro
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${editingUser}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      
      if (response.ok) {
        onEditUser();
        setEditingUser(null);
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-500 mt-1">Administra los usuarios de tu plataforma</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 w-64 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
          </div>
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-2xl font-bold text-gray-900">{users.length}</p>
          <p className="text-sm text-gray-500">Total usuarios</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-2xl font-bold text-green-600">{users.filter(u => u.role === 'admin').length}</p>
          <p className="text-sm text-gray-500">Administradores</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-2xl font-bold text-amber-600">{users.filter(u => u.is_pro).length}</p>
          <p className="text-sm text-gray-500">Usuarios Pro</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-2xl font-bold text-blue-600">{users.filter(u => !u.is_pro).length}</p>
          <p className="text-sm text-gray-500">Usuarios Free</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuario</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rol</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Registrado</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <tr key={user.username} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-lg shadow-blue-500/30">
                        {user.full_name?.charAt(0) || user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.full_name || user.username}</p>
                        <p className="text-sm text-gray-500">@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {editingUser === user.username ? (
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{user.email}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingUser === user.username ? (
                      <select
                        value={editForm.role}
                        onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="user">Usuario</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {user.role === 'admin' && <Shield className="w-3 h-3" />}
                        {user.role === 'admin' ? 'Admin' : 'Usuario'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingUser === user.username ? (
                      <select
                        value={editForm.is_pro ? 'pro' : 'free'}
                        onChange={(e) => setEditForm({...editForm, is_pro: e.target.value === 'pro'})}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="free">Gratis</option>
                        <option value="pro">Pro</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                        user.is_pro 
                          ? 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {user.is_pro && <Crown className="w-3 h-3" />}
                        {user.is_pro ? 'Pro' : 'Gratis'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    }) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editingUser === user.username ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="p-2 text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors shadow-lg shadow-green-500/30"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setEditingUser(null)}
                          className="p-2 text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No se encontraron usuarios</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Sección de Editor de Landing Page mejorada
const LandingEditorSection = ({ content, loading, token, onUpdate }) => {
  const [editContent, setEditContent] = useState(content || {});
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (content) {
      setEditContent(content);
    }
  }, [content]);

  const sections = [
    { id: 'hero', name: 'Hero', description: 'Sección principal', icon: Sparkles },
    { id: 'platform', name: 'Plataforma', description: 'Características', icon: LayoutDashboard },
    { id: 'benefits', name: 'Beneficios', description: 'Ventajas del producto', icon: Crown },
    { id: 'how_it_works', name: 'Cómo funciona', description: 'Pasos del proceso', icon: Settings },
    { id: 'pricing', name: 'Precios', description: 'Planes y precios', icon: Crown },
    { id: 'faq', name: 'FAQ', description: 'Preguntas frecuentes', icon: FileText },
    { id: 'final_cta', name: 'CTA Final', description: 'Llamada a la acción', icon: ChevronRight },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/landing-content`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          [activeSection]: editContent[activeSection]
        })
      });
      
      if (response.ok) {
        onUpdate();
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error('Error saving content:', error);
    }
    setSaving(false);
  };

  const updateField = (field, value) => {
    setEditContent(prev => ({
      ...prev,
      [activeSection]: {
        ...prev[activeSection],
        [field]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const currentSection = editContent[activeSection] || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editor de Landing Page</h1>
          <p className="text-gray-500 mt-1">Personaliza el contenido de tu página de inicio</p>
        </div>
        <a 
          href="/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors"
        >
          <Eye className="w-4 h-4" />
          Ver Landing
        </a>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar con secciones */}
        <div className="col-span-12 lg:col-span-4 xl:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sticky top-24">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">Secciones</p>
            <div className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                    activeSection === section.id
                      ? 'bg-blue-50 text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${
                    activeSection === section.id ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <section.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{section.name}</p>
                    <p className="text-xs text-gray-400">{section.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Editor de contenido */}
        <div className="col-span-12 lg:col-span-8 xl:col-span-9">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {sections.find(s => s.id === activeSection)?.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {sections.find(s => s.id === activeSection)?.description}
                </p>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
                  saved 
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/30'
                } disabled:opacity-50`}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saved ? (
                  <>
                    <Save className="w-4 h-4" />
                    ¡Guardado!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Guardar cambios
                  </>
                )}
              </button>
            </div>

            <div className="p-6 space-y-6">
              {currentSection.title !== undefined && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Título
                  </label>
                  <input
                    type="text"
                    value={currentSection.title || ''}
                    onChange={(e) => updateField('title', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="Ingresa el título..."
                  />
                </div>
              )}

              {currentSection.subtitle !== undefined && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Subtítulo / Descripción
                  </label>
                  <textarea
                    value={currentSection.subtitle || ''}
                    onChange={(e) => updateField('subtitle', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900"
                    placeholder="Ingresa la descripción..."
                  />
                </div>
              )}

              {currentSection.cta_primary !== undefined && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Botón Principal
                    </label>
                    <input
                      type="text"
                      value={currentSection.cta_primary || ''}
                      onChange={(e) => updateField('cta_primary', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Texto del botón..."
                    />
                  </div>
                  {currentSection.cta_secondary !== undefined && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Botón Secundario
                      </label>
                      <input
                        type="text"
                        value={currentSection.cta_secondary || ''}
                        onChange={(e) => updateField('cta_secondary', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Texto del botón..."
                      />
                    </div>
                  )}
                </div>
              )}

              {currentSection.button_text !== undefined && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Texto del Botón
                  </label>
                  <input
                    type="text"
                    value={currentSection.button_text || ''}
                    onChange={(e) => updateField('button_text', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Texto del botón..."
                  />
                </div>
              )}

              {/* Preview hint */}
              <div className="bg-blue-50 rounded-xl p-4 mt-6">
                <p className="text-sm text-blue-700">
                  <strong>Tip:</strong> Los cambios se reflejarán inmediatamente en la landing page después de guardar. 
                  Usa el botón "Ver Landing" para previsualizar.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente Principal del Panel de Admin
const AdminPanel = ({ onBack }) => {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [metrics, setMetrics] = useState({});
  const [users, setUsers] = useState([]);
  const [landingContent, setLandingContent] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [metricsRes, usersRes, contentRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/metrics`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/admin/landing-content`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (contentRes.ok) setLandingContent(await contentRes.json());
    } catch (error) {
      console.error('Error fetching admin data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', name: 'Usuarios', icon: Users },
    { id: 'landing', name: 'Landing Page', icon: Globe },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 z-20 hidden lg:flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-100">
          <img src={LOGO_URL} alt="MindoraMap" className="h-10" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-3">Menu</p>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="font-medium">{tab.name}</span>
            </button>
          ))}
        </nav>

        {/* Back to app */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={onBack}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Volver a la app</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64">
        {/* Top Header */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-100">
          <div className="flex items-center justify-between px-6 lg:px-8 h-16">
            {/* Mobile menu */}
            <div className="lg:hidden">
              <img src={LOGO_URL} alt="MindoraMap" className="h-8" />
            </div>

            {/* Mobile tabs */}
            <div className="flex lg:hidden items-center gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`p-2 rounded-lg ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-400'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                </button>
              ))}
            </div>

            {/* Breadcrumb - Desktop */}
            <div className="hidden lg:flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-purple-600" />
              <span className="text-gray-400">Admin</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
              <span className="font-medium text-gray-900">
                {tabs.find(t => t.id === activeTab)?.name}
              </span>
            </div>

            {/* User info */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                <p className="text-xs text-gray-500">Administrador</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-semibold shadow-lg shadow-purple-500/30">
                {user?.full_name?.charAt(0) || 'A'}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6 lg:p-8">
          {activeTab === 'dashboard' && (
            <DashboardSection metrics={metrics} loading={loading} />
          )}
          {activeTab === 'users' && (
            <UsersSection 
              users={users} 
              loading={loading} 
              onEditUser={fetchData}
              token={token}
            />
          )}
          {activeTab === 'landing' && (
            <LandingEditorSection 
              content={landingContent} 
              loading={loading}
              token={token}
              onUpdate={fetchData}
            />
          )}
        </div>
      </main>

      {/* Mobile back button */}
      <button
        onClick={onBack}
        className="lg:hidden fixed bottom-6 left-6 p-4 bg-white shadow-lg rounded-full border border-gray-200"
      >
        <ArrowLeft className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  );
};

export default AdminPanel;

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
  Mail,
  Calendar,
  Search,
  ChevronRight,
  LayoutDashboard,
  FileText,
  Settings
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Componente de Métricas
const MetricsCard = ({ icon: Icon, title, value, subtitle, color }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

// Sección de Dashboard
const DashboardSection = ({ metrics, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Dashboard</h2>
        <p className="text-sm text-gray-500">Resumen de métricas de la plataforma</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricsCard 
          icon={Users} 
          title="Total Usuarios" 
          value={metrics.total_users || 0}
          subtitle="Usuarios registrados"
          color="bg-blue-500"
        />
        <MetricsCard 
          icon={TrendingUp} 
          title="Nuevos (7 días)" 
          value={metrics.new_users_7_days || 0}
          subtitle="Últimos 7 días"
          color="bg-green-500"
        />
        <MetricsCard 
          icon={Calendar} 
          title="Nuevos (30 días)" 
          value={metrics.new_users_30_days || 0}
          subtitle="Último mes"
          color="bg-purple-500"
        />
        <MetricsCard 
          icon={Crown} 
          title="Usuarios Pro" 
          value={metrics.pro_users || 0}
          subtitle="Membresía activa"
          color="bg-amber-500"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MetricsCard 
          icon={FolderOpen} 
          title="Total Proyectos" 
          value={metrics.total_projects || 0}
          subtitle="Proyectos creados"
          color="bg-indigo-500"
        />
      </div>
    </div>
  );
};

// Sección de Usuarios
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
        onEditUser(); // Refresh users
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Usuarios</h2>
          <p className="text-sm text-gray-500">Gestiona los usuarios de la plataforma</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar usuarios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
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
              <tr key={user.username} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
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
                    <span className="text-gray-600">{user.email}</span>
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
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
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
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      user.is_pro 
                        ? 'bg-amber-100 text-amber-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {user.is_pro && <Crown className="w-3 h-3" />}
                      {user.is_pro ? 'Pro' : 'Gratis'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString('es-ES') : 'N/A'}
                </td>
                <td className="px-6 py-4 text-right">
                  {editingUser === user.username ? (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setEditingUser(null)}
                        className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEdit(user)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
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

// Sección de Editor de Landing Page
const LandingEditorSection = ({ content, loading, token, onUpdate }) => {
  const [editContent, setEditContent] = useState(content || {});
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');

  useEffect(() => {
    if (content) {
      setEditContent(content);
    }
  }, [content]);

  const sections = [
    { id: 'hero', name: 'Hero', icon: LayoutDashboard },
    { id: 'platform', name: 'Plataforma', icon: Settings },
    { id: 'benefits', name: 'Beneficios', icon: Crown },
    { id: 'how_it_works', name: 'Cómo funciona', icon: FileText },
    { id: 'pricing', name: 'Precios', icon: Crown },
    { id: 'faq', name: 'FAQ', icon: FileText },
    { id: 'final_cta', name: 'CTA Final', icon: ChevronRight },
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
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Editor de Landing Page</h2>
        <p className="text-sm text-gray-500">Personaliza el contenido de tu página de inicio</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar con secciones */}
        <div className="w-56 shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                  activeSection === section.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <section.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{section.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Editor de contenido */}
        <div className="flex-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {sections.find(s => s.id === activeSection)?.name}
              </h3>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar
              </button>
            </div>

            <div className="space-y-4">
              {currentSection.title !== undefined && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título
                  </label>
                  <input
                    type="text"
                    value={currentSection.title || ''}
                    onChange={(e) => updateField('title', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {currentSection.subtitle !== undefined && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subtítulo
                  </label>
                  <textarea
                    value={currentSection.subtitle || ''}
                    onChange={(e) => updateField('subtitle', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              )}

              {currentSection.cta_primary !== undefined && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Botón Principal
                  </label>
                  <input
                    type="text"
                    value={currentSection.cta_primary || ''}
                    onChange={(e) => updateField('cta_primary', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {currentSection.cta_secondary !== undefined && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Botón Secundario
                  </label>
                  <input
                    type="text"
                    value={currentSection.cta_secondary || ''}
                    onChange={(e) => updateField('cta_secondary', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {currentSection.button_text !== undefined && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Texto del Botón
                  </label>
                  <input
                    type="text"
                    value={currentSection.button_text || ''}
                    onChange={(e) => updateField('button_text', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente Principal del Panel de Admin
const AdminPanel = ({ onBack }) => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [metrics, setMetrics] = useState({});
  const [users, setUsers] = useState([]);
  const [landingContent, setLandingContent] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch metrics
      const metricsRes = await fetch(`${API_URL}/api/admin/metrics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (metricsRes.ok) {
        setMetrics(await metricsRes.json());
      }

      // Fetch users
      const usersRes = await fetch(`${API_URL}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (usersRes.ok) {
        setUsers(await usersRes.json());
      }

      // Fetch landing content
      const contentRes = await fetch(`${API_URL}/api/admin/landing-content`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (contentRes.ok) {
        setLandingContent(await contentRes.json());
      }
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
    { id: 'landing', name: 'Landing Page', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-medium">Volver a la app</span>
              </button>
              <div className="h-6 w-px bg-gray-200" />
              <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                Panel de Administración
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </div>

        {/* Content */}
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
    </div>
  );
};

export default AdminPanel;

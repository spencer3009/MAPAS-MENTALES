import React from 'react';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Clock, 
  TrendingUp,
  Calendar,
  Bell
} from 'lucide-react';

const DashboardView = ({ projects = [], onClose }) => {
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

import React from 'react';
import { 
  LayoutTemplate, 
  Plus,
  FolderKanban,
  GitBranch,
  Network,
  Lightbulb
} from 'lucide-react';

const TemplatesView = ({ onClose, onSelectTemplate }) => {
  const templates = [
    {
      id: 'mindflow',
      name: 'MindFlow',
      description: 'Mapa mental horizontal clásico',
      icon: GitBranch,
      color: 'blue',
      comingSoon: false
    },
    {
      id: 'mindtree',
      name: 'MindTree',
      description: 'Organigrama vertical',
      icon: Network,
      color: 'green',
      comingSoon: false
    },
    {
      id: 'mindhybrid',
      name: 'MindHybrid',
      description: 'Combinación horizontal y vertical',
      icon: FolderKanban,
      color: 'purple',
      comingSoon: false
    },
    {
      id: 'brainstorm',
      name: 'Brainstorm',
      description: 'Para lluvia de ideas',
      icon: Lightbulb,
      color: 'amber',
      comingSoon: true
    }
  ];

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    amber: 'bg-amber-100 text-amber-600'
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <LayoutTemplate className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Plantillas</h1>
            <p className="text-sm text-gray-500">Comienza con una estructura predefinida</p>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => {
          const Icon = template.icon;
          return (
            <div
              key={template.id}
              className={`
                bg-white rounded-2xl border border-gray-200 shadow-sm p-5
                transition-all duration-200
                ${template.comingSoon 
                  ? 'opacity-60 cursor-not-allowed' 
                  : 'hover:border-blue-300 hover:shadow-md cursor-pointer'
                }
              `}
              onClick={() => !template.comingSoon && onSelectTemplate?.(template.id)}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl ${colorClasses[template.color]} flex items-center justify-center shrink-0`}>
                  <Icon size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                    {template.comingSoon && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                        Próximamente
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Custom Template Card */}
        <div className="bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300 p-5 flex items-center justify-center cursor-not-allowed opacity-60">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center mx-auto mb-3">
              <Plus size={24} className="text-gray-400" />
            </div>
            <p className="font-medium text-gray-500">Crear plantilla</p>
            <p className="text-xs text-gray-400">Próximamente</p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-purple-50 rounded-xl border border-purple-100">
        <p className="text-sm text-purple-700">
          💡 Las plantillas te permiten comenzar rápidamente con estructuras predefinidas. Pronto podrás crear y guardar tus propias plantillas.
        </p>
      </div>
    </div>
  );
};

export default TemplatesView;

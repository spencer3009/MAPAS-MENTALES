import React from 'react';
import { 
  Puzzle, 
  MessageSquare,
  Mail,
  Calendar,
  Cloud,
  Zap,
  ExternalLink
} from 'lucide-react';

const IntegrationsView = ({ onClose }) => {
  const integrations = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      description: 'Recibe recordatorios por WhatsApp',
      icon: MessageSquare,
      color: 'green',
      status: 'active'
    },
    {
      id: 'email',
      name: 'Email',
      description: 'Notificaciones por correo',
      icon: Mail,
      color: 'blue',
      status: 'coming'
    },
    {
      id: 'calendar',
      name: 'Google Calendar',
      description: 'Sincroniza tus recordatorios',
      icon: Calendar,
      color: 'red',
      status: 'coming'
    },
    {
      id: 'drive',
      name: 'Google Drive',
      description: 'Guarda backups automáticos',
      icon: Cloud,
      color: 'amber',
      status: 'coming'
    },
    {
      id: 'zapier',
      name: 'Zapier',
      description: 'Conecta con 5000+ apps',
      icon: Zap,
      color: 'orange',
      status: 'coming'
    }
  ];

  const colorClasses = {
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    red: 'bg-red-100 text-red-600',
    amber: 'bg-amber-100 text-amber-600',
    orange: 'bg-orange-100 text-orange-600'
  };

  const statusBadge = {
    active: { text: 'Activo', class: 'bg-green-100 text-green-700' },
    coming: { text: 'Próximamente', class: 'bg-gray-100 text-gray-500' },
    connected: { text: 'Conectado', class: 'bg-blue-100 text-blue-700' }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <Puzzle className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Integraciones</h1>
            <p className="text-sm text-gray-500">Conecta MindoraMap con tus herramientas favoritas</p>
          </div>
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          const badge = statusBadge[integration.status];
          const isActive = integration.status === 'active';
          
          return (
            <div
              key={integration.id}
              className={`
                bg-white rounded-2xl border border-gray-200 shadow-sm p-5
                transition-all duration-200
                ${isActive 
                  ? 'hover:border-green-300 hover:shadow-md cursor-pointer' 
                  : 'opacity-70 cursor-not-allowed'
                }
              `}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl ${colorClasses[integration.color]} flex items-center justify-center shrink-0`}>
                  <Icon size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${badge.class}`}>
                      {badge.text}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{integration.description}</p>
                  
                  {isActive && (
                    <button className="mt-3 text-sm text-green-600 hover:text-green-700 flex items-center gap-1">
                      Configurar <ExternalLink size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-orange-50 rounded-xl border border-orange-100">
        <p className="text-sm text-orange-700">
          🔌 Las integraciones te permiten conectar MindoraMap con otras herramientas. Estamos trabajando en más integraciones.
        </p>
      </div>
    </div>
  );
};

export default IntegrationsView;

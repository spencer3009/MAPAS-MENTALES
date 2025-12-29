import React from 'react';
import { UserPlus, LogIn, Save, X, Sparkles, CheckCircle2 } from 'lucide-react';

const DemoSaveModal = ({ isOpen, onClose, onRegister, onLogin, action = 'save' }) => {
  if (!isOpen) return null;

  const actionMessages = {
    save: {
      title: '¿Quieres guardar tu mapa?',
      subtitle: 'Crea una cuenta gratuita para guardar tu trabajo y acceder desde cualquier dispositivo.',
      icon: Save
    },
    export: {
      title: '¿Quieres exportar tu mapa?',
      subtitle: 'Crea una cuenta gratuita para exportar tus mapas mentales en diferentes formatos.',
      icon: Save
    },
    exit: {
      title: '¿Quieres guardar antes de salir?',
      subtitle: 'Si sales ahora, perderás todo tu trabajo. Crea una cuenta para guardarlo.',
      icon: Save
    }
  };

  const message = actionMessages[action] || actionMessages.save;
  const IconComponent = message.icon;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header con gradiente */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-8 text-center relative">
          {/* Decoraciones */}
          <div className="absolute top-4 left-4 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute bottom-4 right-4 w-16 h-16 bg-white/10 rounded-full blur-xl" />
          
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <IconComponent className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{message.title}</h2>
            <p className="text-blue-100/90 text-sm">{message.subtitle}</p>
          </div>
          
          {/* Botón cerrar */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6">
          {/* Benefits */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-gray-700">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 size={14} className="text-green-600" />
              </div>
              <span className="text-sm">Guarda tus mapas de forma segura</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 size={14} className="text-green-600" />
              </div>
              <span className="text-sm">Accede desde cualquier dispositivo</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 size={14} className="text-green-600" />
              </div>
              <span className="text-sm">Exporta en JPG, PDF y Word</span>
            </div>
          </div>

          {/* Botones */}
          <div className="space-y-3">
            <button
              onClick={onRegister}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <UserPlus size={18} />
              Crear cuenta gratis
            </button>
            
            <button
              onClick={onLogin}
              className="w-full py-3.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <LogIn size={18} />
              Ya tengo cuenta
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-4">
            <Sparkles size={12} className="inline mr-1" />
            Gratis para siempre • Sin tarjeta de crédito
          </p>
        </div>
      </div>
    </div>
  );
};

export default DemoSaveModal;

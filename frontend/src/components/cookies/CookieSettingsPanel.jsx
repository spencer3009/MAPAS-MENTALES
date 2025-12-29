import React, { useState, useEffect } from 'react';
import { 
  X, 
  Cookie, 
  Shield, 
  BarChart3, 
  Sliders, 
  Megaphone,
  Check,
  Lock,
  Info
} from 'lucide-react';
import { useCookies } from '../../contexts/CookieContext';

const CookieCategory = ({ 
  icon: Icon, 
  title, 
  description, 
  enabled, 
  onChange, 
  locked = false,
  color = 'blue'
}) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600'
  };

  return (
    <div className={`p-4 rounded-xl border-2 transition-all duration-200 ${
      enabled ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200 bg-gray-50/50'
    }`}>
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClasses[color]}`}>
          <Icon size={20} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900">{title}</h4>
              {locked && (
                <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                  <Lock size={10} />
                  Requeridas
                </span>
              )}
            </div>
            
            {/* Toggle switch */}
            <button
              onClick={() => !locked && onChange(!enabled)}
              disabled={locked}
              className={`relative w-12 h-6 rounded-full transition-all duration-200 ${
                locked 
                  ? 'bg-green-500 cursor-not-allowed' 
                  : enabled 
                    ? 'bg-blue-600 cursor-pointer' 
                    : 'bg-gray-300 cursor-pointer hover:bg-gray-400'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 flex items-center justify-center ${
                enabled ? 'translate-x-6' : 'translate-x-0'
              }`}>
                {enabled && <Check size={12} className="text-blue-600" />}
              </span>
            </button>
          </div>
          
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
};

const CookieSettingsPanel = () => {
  const { 
    showSettings, 
    closeSettings, 
    consent, 
    saveCustomSettings,
    acceptAll,
    acceptNecessaryOnly 
  } = useCookies();

  const [settings, setSettings] = useState({
    necessary: true,
    analytics: false,
    functional: false,
    marketing: false
  });

  // Sincronizar con las preferencias actuales
  useEffect(() => {
    if (showSettings) {
      setSettings({
        necessary: true,
        analytics: consent.analytics || false,
        functional: consent.functional || false,
        marketing: consent.marketing || false
      });
    }
  }, [showSettings, consent]);

  if (!showSettings) return null;

  const handleSave = () => {
    saveCustomSettings(settings);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeSettings}
      />
      
      {/* Panel */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Cookie size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Configuración de Cookies</h2>
                <p className="text-sm text-blue-100">Personaliza tu experiencia</p>
              </div>
            </div>
            <button
              onClick={closeSettings}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Info box */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl mb-6">
            <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              Puedes cambiar tus preferencias en cualquier momento desde el enlace 
              &quot;Gestionar cookies&quot; en el pie de página. Las cookies necesarias no se pueden 
              desactivar ya que son esenciales para el funcionamiento del sitio.
            </p>
          </div>

          {/* Cookie categories */}
          <div className="space-y-4">
            <CookieCategory
              icon={Shield}
              title="Cookies necesarias"
              description="Estas cookies permiten que el sitio funcione correctamente. Son esenciales para la navegación, seguridad y funciones básicas como el inicio de sesión."
              enabled={true}
              onChange={() => {}}
              locked={true}
              color="green"
            />

            <CookieCategory
              icon={BarChart3}
              title="Cookies analíticas"
              description="Nos ayudan a entender cómo usas el sitio para mejorarlo. Recopilamos información anónima sobre las páginas visitadas y el comportamiento de navegación."
              enabled={settings.analytics}
              onChange={(val) => setSettings(prev => ({ ...prev, analytics: val }))}
              color="blue"
            />

            <CookieCategory
              icon={Sliders}
              title="Cookies funcionales"
              description="Recuerdan tus preferencias para ofrecerte una mejor experiencia. Por ejemplo, tu idioma preferido, tema visual o configuraciones personalizadas."
              enabled={settings.functional}
              onChange={(val) => setSettings(prev => ({ ...prev, functional: val }))}
              color="purple"
            />

            <CookieCategory
              icon={Megaphone}
              title="Cookies de marketing"
              description="Nos permiten mostrarte contenido y ofertas más relevantes. Pueden ser utilizadas para personalizar la publicidad que ves en otros sitios."
              enabled={settings.marketing}
              onChange={(val) => setSettings(prev => ({ ...prev, marketing: val }))}
              color="orange"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={acceptNecessaryOnly}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Solo necesarias
            </button>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleSave}
                className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 hover:border-gray-400 rounded-xl transition-colors"
              >
                Guardar preferencias
              </button>
              
              <button
                onClick={acceptAll}
                className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-lg shadow-blue-600/25 transition-all"
              >
                Aceptar todas
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieSettingsPanel;

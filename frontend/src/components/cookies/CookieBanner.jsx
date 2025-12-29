import React from 'react';
import { Cookie, Settings, Shield, ChevronRight } from 'lucide-react';
import { useCookies } from '../../contexts/CookieContext';

const CookieBanner = () => {
  const { showBanner, acceptAll, openSettings } = useCookies();

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] animate-in slide-in-from-bottom duration-500">
      {/* Overlay sutil */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" style={{ height: '200%', bottom: 0 }} />
      
      {/* Banner principal */}
      <div className="relative bg-white border-t border-gray-200 shadow-2xl shadow-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:gap-8">
            {/* Icono y contenido */}
            <div className="flex items-start gap-4 flex-1">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Cookie className="w-6 h-6 text-white" />
              </div>
              
              <div className="flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
                  Usamos cookies para mejorar tu experiencia
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Utilizamos cookies propias y de terceros para que el sitio funcione correctamente, 
                  analizar el uso y mostrarte contenido relevante. Puedes aceptar todas, configurar 
                  tus preferencias o continuar solo con las necesarias.
                </p>
              </div>
            </div>

            {/* Botones */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              {/* Botón configurar - secundario */}
              <button
                onClick={openSettings}
                className="group flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200"
              >
                <Settings size={16} className="text-gray-500" />
                Configurar cookies
              </button>
              
              {/* Botón aceptar todas - principal y destacado */}
              <button
                onClick={acceptAll}
                className="group flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 transition-all duration-200 hover:scale-[1.02]"
              >
                <Shield size={16} />
                Aceptar todas
                <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span>Cumplimos con GDPR y LGPD</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span>Tus datos están protegidos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-purple-500 rounded-full" />
              <span>Control total sobre tus preferencias</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;

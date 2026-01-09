import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

const InstallPWABanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Detectar iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // Verificar si ya está instalada como PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone 
      || document.referrer.includes('android-app://');

    // Verificar si el usuario ya descartó el banner
    const bannerDismissed = localStorage.getItem('pwa-banner-dismissed');
    const dismissedTime = bannerDismissed ? parseInt(bannerDismissed, 10) : 0;
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

    // Mostrar banner solo si:
    // - No está instalada
    // - No se descartó en los últimos 7 días
    // - Es móvil
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (!isStandalone && (daysSinceDismissed > 7 || !bannerDismissed) && isMobile) {
      // Esperar un poco antes de mostrar el banner
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // Escuchar el evento beforeinstallprompt (Chrome, Edge, Samsung Internet)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) {
      // Si no hay prompt disponible, mostrar instrucciones genéricas
      alert('Para instalar Mindora, usa el menú de tu navegador y selecciona "Agregar a pantalla de inicio"');
      return;
    }

    // Mostrar el prompt de instalación
    deferredPrompt.prompt();
    
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('[PWA] Usuario aceptó la instalación');
      setShowBanner(false);
    } else {
      console.log('[PWA] Usuario rechazó la instalación');
    }
    
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
    setShowBanner(false);
    setShowIOSInstructions(false);
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Banner de instalación */}
      <div className="fixed bottom-4 left-4 right-4 z-50 md:hidden animate-in slide-in-from-bottom-5 duration-300">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-2xl shadow-blue-500/30 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Smartphone className="text-white" size={24} />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold text-base">
                Instalar Mindora
              </h3>
              <p className="text-blue-100 text-sm mt-0.5">
                Accede más rápido desde tu pantalla de inicio
              </p>
              
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleInstallClick}
                  className="flex-1 flex items-center justify-center gap-2 bg-white text-blue-600 font-semibold py-2.5 px-4 rounded-xl hover:bg-blue-50 transition-colors"
                >
                  <Download size={18} />
                  Instalar
                </button>
                <button
                  onClick={handleDismiss}
                  className="p-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                  aria-label="Cerrar"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instrucciones para iOS */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-8 animate-in slide-in-from-bottom-10 duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                Instalar en iPhone/iPad
              </h3>
              <button
                onClick={() => setShowIOSInstructions(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-bold text-sm">1</span>
                </div>
                <p className="text-gray-600">
                  Toca el botón <strong className="text-gray-900">Compartir</strong> 
                  <span className="inline-block mx-1 px-1.5 py-0.5 bg-gray-100 rounded text-xs">⬆️</span>
                  en la barra de Safari
                </p>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-bold text-sm">2</span>
                </div>
                <p className="text-gray-600">
                  Desplázate y selecciona <strong className="text-gray-900">"Agregar a pantalla de inicio"</strong>
                </p>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-bold text-sm">3</span>
                </div>
                <p className="text-gray-600">
                  Toca <strong className="text-gray-900">"Agregar"</strong> para confirmar
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setShowIOSInstructions(false)}
              className="w-full mt-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallPWABanner;

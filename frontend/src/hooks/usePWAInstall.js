import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para manejar la instalación de la PWA
 * - Captura beforeinstallprompt
 * - Detecta si ya está instalada
 * - Maneja iOS vs Android/Chrome
 */
export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isIOSSafari, setIsIOSSafari] = useState(false);

  useEffect(() => {
    // Detectar iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // Detectar Safari en iOS (no Chrome iOS, no otros navegadores)
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);
    setIsIOSSafari(isIOSDevice && isSafari);

    // Verificar si ya está instalada como PWA
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
        || window.navigator.standalone === true
        || document.referrer.includes('android-app://');
      
      setIsInstalled(isStandalone);
      return isStandalone;
    };

    const installed = checkIfInstalled();

    // Si es iOS Safari y no está instalada, es instalable
    if (isIOSDevice && isSafari && !installed) {
      setIsInstallable(true);
    }

    // Escuchar el evento beforeinstallprompt (Chrome, Edge, Samsung Internet, Firefox Android)
    const handleBeforeInstallPrompt = (e) => {
      // Prevenir que Chrome muestre el mini-infobar automático
      e.preventDefault();
      // Guardar el evento para usarlo después
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log('[PWA] beforeinstallprompt capturado, la app es instalable');
    };

    // Escuchar cuando la app es instalada
    const handleAppInstalled = () => {
      console.log('[PWA] App instalada exitosamente');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    // Escuchar cambios en display-mode
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e) => {
      if (e.matches) {
        setIsInstalled(true);
        setIsInstallable(false);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    mediaQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  /**
   * Ejecutar la instalación de la PWA
   * @returns {Promise<'accepted'|'dismissed'|'ios'|'unsupported'>}
   */
  const promptInstall = useCallback(async () => {
    // En iOS, retornamos 'ios' para que el componente muestre instrucciones
    if (isIOS) {
      return 'ios';
    }

    // Si no hay prompt disponible
    if (!deferredPrompt) {
      console.log('[PWA] No hay prompt disponible');
      return 'unsupported';
    }

    try {
      // Mostrar el prompt de instalación nativo
      deferredPrompt.prompt();
      
      // Esperar la respuesta del usuario
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log('[PWA] Usuario eligió:', outcome);
      
      // Limpiar el prompt ya que solo se puede usar una vez
      setDeferredPrompt(null);
      
      if (outcome === 'accepted') {
        setIsInstallable(false);
      }
      
      return outcome;
    } catch (error) {
      console.error('[PWA] Error al mostrar prompt:', error);
      return 'unsupported';
    }
  }, [deferredPrompt, isIOS]);

  /**
   * Verificar si el banner fue descartado recientemente
   */
  const wasBannerDismissed = useCallback(() => {
    const dismissedTime = localStorage.getItem('pwa-banner-dismissed');
    if (!dismissedTime) return false;
    
    const daysSinceDismissed = (Date.now() - parseInt(dismissedTime, 10)) / (1000 * 60 * 60 * 24);
    return daysSinceDismissed < 7; // 7 días
  }, []);

  /**
   * Marcar banner como descartado
   */
  const dismissBanner = useCallback(() => {
    localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
  }, []);

  /**
   * Resetear el estado de descarte (para testing)
   */
  const resetDismiss = useCallback(() => {
    localStorage.removeItem('pwa-banner-dismissed');
  }, []);

  return {
    // Estados
    isInstallable,
    isInstalled,
    isIOS,
    isIOSSafari,
    hasPrompt: !!deferredPrompt,
    
    // Acciones
    promptInstall,
    wasBannerDismissed,
    dismissBanner,
    resetDismiss,
    
    // Para mostrar el botón de instalación
    // true si: es instalable Y no está instalada
    showInstallButton: isInstallable && !isInstalled,
  };
};

export default usePWAInstall;

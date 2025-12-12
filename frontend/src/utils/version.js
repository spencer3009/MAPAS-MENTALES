// Configuración de versión del build
export const APP_VERSION = process.env.REACT_APP_BUILD_VERSION || 'dev';
export const BUILD_TIME = process.env.REACT_APP_BUILD_TIME || new Date().toISOString();

// Función para verificar y limpiar caché si hay nueva versión
export const checkAndClearCache = async () => {
  const storedVersion = localStorage.getItem('app_build_version');
  const currentVersion = APP_VERSION;
  
  console.log(`[Version Control] Current: ${currentVersion}, Stored: ${storedVersion}`);
  
  if (storedVersion && storedVersion !== currentVersion && currentVersion !== 'dev') {
    console.log('[Version Control] 🔄 Nueva versión detectada, limpiando caché...');
    
    try {
      // Limpiar caches del Service Worker si existen
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(name => {
            console.log(`[Version Control] Eliminando cache: ${name}`);
            return caches.delete(name);
          })
        );
      }
      
      // Desregistrar Service Workers si existen
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(registration => {
            console.log('[Version Control] Desregistrando Service Worker');
            return registration.unregister();
          })
        );
      }
      
      console.log('[Version Control] ✅ Caché limpiado exitosamente');
    } catch (error) {
      console.error('[Version Control] Error limpiando caché:', error);
    }
  }
  
  // Guardar versión actual
  if (currentVersion !== 'dev') {
    localStorage.setItem('app_build_version', currentVersion);
  }
};

// Log de versión estilizado
export const logVersion = () => {
  console.log(
    '%c🧠 Mapas Mentales',
    'font-size: 18px; font-weight: bold; color: #3b82f6; text-shadow: 1px 1px 2px rgba(0,0,0,0.1);'
  );
  console.log(
    `%c   Versión: ${APP_VERSION}`,
    'font-size: 12px; color: #64748b;'
  );
  console.log(
    `%c   Build: ${BUILD_TIME}`,
    'font-size: 12px; color: #64748b;'
  );
};

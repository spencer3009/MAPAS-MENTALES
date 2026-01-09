import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share, PlusSquare, Check } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

/**
 * Banner flotante de instalación PWA
 * Se muestra en la parte inferior en móvil después de 3 segundos
 */
export const InstallPWABanner = () => {
  const { 
    showInstallButton, 
    isIOS, 
    promptInstall, 
    wasBannerDismissed, 
    dismissBanner 
  } = usePWAInstall();
  
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // No mostrar si ya fue descartado recientemente
    if (wasBannerDismissed()) return;
    
    // No mostrar si no es instalable
    if (!showInstallButton) return;

    // Esperar 3 segundos antes de mostrar el banner
    const timer = setTimeout(() => {
      setShowBanner(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [showInstallButton, wasBannerDismissed]);

  const handleInstallClick = async () => {
    const result = await promptInstall();
    
    if (result === 'ios') {
      setShowIOSModal(true);
    } else if (result === 'accepted') {
      setShowBanner(false);
    } else if (result === 'unsupported') {
      // Mostrar instrucciones genéricas
      setShowIOSModal(true);
    }
  };

  const handleDismiss = () => {
    dismissBanner();
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Banner flotante */}
      <div 
        className="fixed bottom-4 left-4 right-4 z-[9999] md:hidden animate-in slide-in-from-bottom-5 duration-300"
        data-testid="pwa-install-banner"
      >
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-2xl shadow-blue-500/40 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Smartphone className="text-white" size={24} />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold text-base">
                Instalar Mindora
              </h3>
              <p className="text-blue-100 text-sm mt-0.5">
                Accede con un ícono desde tu celular, como una app.
              </p>
              
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleInstallClick}
                  data-testid="pwa-install-button"
                  className="flex-1 flex items-center justify-center gap-2 bg-white text-blue-600 font-semibold py-2.5 px-4 rounded-xl hover:bg-blue-50 active:bg-blue-100 transition-colors"
                >
                  <Download size={18} />
                  Instalar
                </button>
                <button
                  onClick={handleDismiss}
                  className="p-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                  aria-label="Cerrar"
                  data-testid="pwa-dismiss-button"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de instrucciones para iOS */}
      <IOSInstallModal 
        isOpen={showIOSModal} 
        onClose={() => setShowIOSModal(false)} 
      />
    </>
  );
};

/**
 * Botón de instalación para usar en cualquier parte de la UI
 * (Landing page, menú hamburguesa, header, etc.)
 */
export const InstallButton = ({ 
  variant = 'primary', 
  size = 'md',
  className = '',
  showOnDesktop = false,
  label = 'Instalar Mindora',
  shortLabel = 'Instalar'
}) => {
  const { showInstallButton, isIOS, promptInstall } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // No mostrar en desktop a menos que se indique
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (!showInstallButton || (!showOnDesktop && !isMobile)) {
    return null;
  }

  const handleClick = async () => {
    setIsInstalling(true);
    const result = await promptInstall();
    setIsInstalling(false);
    
    if (result === 'ios' || result === 'unsupported') {
      setShowIOSModal(true);
    }
  };

  // Estilos según variante
  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25',
    secondary: 'bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-blue-300',
    ghost: 'bg-transparent hover:bg-blue-50 text-blue-600',
    dark: 'bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white',
    menu: 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 w-full justify-start',
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm gap-1.5',
    md: 'px-5 py-3 text-base gap-2',
    lg: 'px-6 py-4 text-lg gap-2',
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isInstalling}
        data-testid="pwa-install-cta"
        className={`
          flex items-center rounded-xl font-semibold transition-all
          ${variants[variant]}
          ${sizes[size]}
          ${className}
          ${isInstalling ? 'opacity-70 cursor-wait' : 'hover:scale-105 active:scale-95'}
        `}
      >
        <Download size={size === 'lg' ? 22 : size === 'sm' ? 16 : 18} />
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">{shortLabel}</span>
      </button>

      <IOSInstallModal 
        isOpen={showIOSModal} 
        onClose={() => setShowIOSModal(false)} 
      />
    </>
  );
};

/**
 * Item de menú para instalación (para usar en menú hamburguesa)
 */
export const InstallMenuItem = ({ onInstallComplete }) => {
  const { showInstallButton, isIOS, promptInstall } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (!showInstallButton) return null;

  const handleClick = async () => {
    const result = await promptInstall();
    
    if (result === 'ios' || result === 'unsupported') {
      setShowIOSModal(true);
    } else if (result === 'accepted') {
      onInstallComplete?.();
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        data-testid="pwa-install-menu-item"
        className="w-full flex items-center gap-4 py-3.5 px-4 rounded-xl text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 active:bg-blue-500/30 transition-colors border border-blue-500/20"
      >
        <Download size={22} className="shrink-0" />
        <div className="flex-1 text-left">
          <span className="text-base font-medium block">Instalar Mindora</span>
          <span className="text-xs text-blue-400/70">Crear ícono en inicio</span>
        </div>
        <div className="flex-shrink-0 w-6 h-6 bg-blue-500/30 rounded-full flex items-center justify-center">
          <Smartphone size={14} />
        </div>
      </button>

      <IOSInstallModal 
        isOpen={showIOSModal} 
        onClose={() => setShowIOSModal(false)} 
      />
    </>
  );
};

/**
 * Modal con instrucciones para iOS Safari
 */
export const IOSInstallModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  // Detectar si es iOS o no (para mostrar instrucciones apropiadas)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      data-testid="ios-install-modal"
    >
      <div 
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-6 pb-8 animate-in slide-in-from-bottom-10 duration-300 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Smartphone className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {isIOS ? 'Instalar en iPhone/iPad' : 'Instalar Mindora'}
              </h3>
              <p className="text-sm text-gray-500">Acceso rápido desde tu inicio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Instrucciones */}
        <div className="space-y-4 mb-6">
          {isIOS ? (
            // Instrucciones específicas para iOS Safari
            <>
              <InstructionStep 
                number={1}
                icon={<Share size={20} className="text-blue-600" />}
                title="Toca el botón Compartir"
                description={
                  <span>
                    Busca el ícono <span className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 rounded text-xs mx-1">
                      <Share size={12} />
                    </span> en la barra inferior de Safari
                  </span>
                }
              />
              <InstructionStep 
                number={2}
                icon={<PlusSquare size={20} className="text-blue-600" />}
                title='Selecciona "Añadir a pantalla de inicio"'
                description="Desplázate hacia abajo en el menú y busca esta opción"
              />
              <InstructionStep 
                number={3}
                icon={<Check size={20} className="text-blue-600" />}
                title='Confirma tocando "Añadir"'
                description="¡Listo! Mindora aparecerá como app en tu inicio"
              />
            </>
          ) : (
            // Instrucciones genéricas para otros navegadores
            <>
              <InstructionStep 
                number={1}
                title="Abre el menú del navegador"
                description="Busca los tres puntos (⋮) en la esquina superior"
              />
              <InstructionStep 
                number={2}
                title='"Agregar a pantalla de inicio" o "Instalar app"'
                description="Selecciona esta opción del menú"
              />
              <InstructionStep 
                number={3}
                title="Confirma la instalación"
                description="¡Listo! Mindora aparecerá como app en tu inicio"
              />
            </>
          )}
        </div>

        {/* Nota adicional */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-700">
            <strong>Tip:</strong> Una vez instalada, Mindora se abrirá en pantalla completa, 
            sin barras del navegador, como una app nativa.
          </p>
        </div>

        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all"
        >
          Entendido
        </button>
      </div>
    </div>
  );
};

/**
 * Componente auxiliar para cada paso de instrucción
 */
const InstructionStep = ({ number, icon, title, description }) => (
  <div className="flex items-start gap-4">
    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
      {icon || <span className="text-blue-600 font-bold">{number}</span>}
    </div>
    <div className="flex-1 pt-1">
      <p className="font-semibold text-gray-900 mb-0.5">{title}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  </div>
);

export default InstallPWABanner;

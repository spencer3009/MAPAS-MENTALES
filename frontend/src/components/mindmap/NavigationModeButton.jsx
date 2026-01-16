/**
 * NavigationModeButton - Botón flotante para alternar entre modo edición y navegación
 * Solo visible en dispositivos táctiles (móvil/tablet)
 */

import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Move } from 'lucide-react';

// Detectar si es un dispositivo táctil (móvil o tablet)
const isTouchDevice = () => {
  if (typeof window === 'undefined') return false;
  
  // Verificar si tiene pantalla táctil
  const hasTouchScreen = (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
  
  // Verificar por tamaño de pantalla (tablets incluidas)
  const isSmallScreen = window.innerWidth <= 1024;
  
  // Verificar por user agent para móviles/tablets
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i;
  const isMobileUA = mobileRegex.test(navigator.userAgent);
  
  // Mostrar en dispositivos táctiles O en pantallas pequeñas (para tablets que no reportan touch correctamente)
  // También mostrar si el user agent indica móvil/tablet
  return hasTouchScreen || isSmallScreen || isMobileUA;
};

const NavigationModeButton = ({ 
  isNavigationMode, 
  onToggle,
  showToast 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Detectar dispositivo táctil al montar y en resize
  useEffect(() => {
    const checkDevice = () => {
      setIsVisible(isTouchDevice());
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Mostrar feedback al cambiar de modo
  useEffect(() => {
    if (showFeedback) {
      const timer = setTimeout(() => {
        setShowFeedback(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showFeedback]);

  const handleToggle = () => {
    const newMode = !isNavigationMode;
    onToggle(newMode);
    
    // Mostrar feedback
    setFeedbackMessage(
      newMode 
        ? 'Modo navegación — mueve el mapa sin alterar nodos' 
        : 'Modo edición — puedes mover los nodos'
    );
    setShowFeedback(true);
    
    // También llamar al toast si está disponible
    if (showToast) {
      showToast(
        newMode 
          ? 'Modo navegación activado — puedes mover el mapa sin alterar los nodos' 
          : 'Modo edición activado — puedes mover los nodos',
        newMode ? 'info' : 'success'
      );
    }
  };

  // No renderizar en desktop
  if (!isVisible) return null;

  return (
    <>
      {/* Botón flotante - FIJO al viewport, independiente del canvas */}
      <button
        onClick={handleToggle}
        data-testid="navigation-mode-button"
        className={`
          fixed z-[9999] bottom-4 right-28
          w-12 h-12 rounded-full
          shadow-xl border-2
          flex items-center justify-center
          transition-all duration-300 ease-out
          active:scale-95
          touch-manipulation
          ${isNavigationMode 
            ? 'bg-blue-500 border-blue-400 text-white shadow-blue-500/40' 
            : 'bg-white/90 backdrop-blur-sm border-gray-200 text-gray-700 shadow-gray-400/30'
          }
        `}
        style={{
          WebkitTapHighlightColor: 'transparent',
        }}
        aria-label={isNavigationMode ? 'Activar modo edición' : 'Activar modo navegación'}
        title={isNavigationMode ? 'Modo navegación activo - Tap para editar' : 'Modo edición - Tap para navegar'}
      >
        {isNavigationMode ? (
          // Candado cerrado con flechas (modo navegación)
          <div className="relative">
            <Lock className="w-6 h-6" />
            <Move className="w-3 h-3 absolute -bottom-1 -right-1 opacity-70" />
          </div>
        ) : (
          // Candado abierto (modo edición)
          <div className="relative">
            <Unlock className="w-6 h-6" />
          </div>
        )}
      </button>

      {/* Feedback visual flotante - también FIJO al viewport */}
      {showFeedback && (
        <div 
          className={`
            fixed z-[9999] bottom-20 right-4
            px-4 py-2 rounded-xl
            text-sm font-medium
            shadow-lg
            max-w-[220px] text-center
            ${isNavigationMode 
              ? 'bg-blue-500 text-white' 
              : 'bg-green-500 text-white'
            }
          `}
          style={{
            animation: 'fadeInUp 0.2s ease-out'
          }}
        >
          {feedbackMessage}
        </div>
      )}

      {/* Estilos para la animación */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
};

export default NavigationModeButton;

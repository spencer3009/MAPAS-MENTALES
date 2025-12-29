import React, { useState, useEffect, useCallback } from 'react';
import { Maximize2, Minimize2, Grid3X3, Ruler, X } from 'lucide-react';

/**
 * FullscreenControls - Controles flotantes para el modo pantalla completa
 * 
 * Aparecen solo en modo fullscreen, en una esquina discreta
 */
const FullscreenControls = ({ 
  isFullscreen,
  showGrid,
  showRulers,
  onToggleGrid,
  onToggleRulers,
  onExitFullscreen
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Auto-ocultar controles después de 3 segundos de inactividad
  useEffect(() => {
    if (!isFullscreen) return;
    
    let timeout;
    if (!isHovered) {
      timeout = setTimeout(() => {
        setIsVisible(false);
      }, 3000);
    } else {
      setIsVisible(true);
    }
    
    return () => clearTimeout(timeout);
  }, [isHovered, isFullscreen]);

  // Mostrar al mover el mouse
  useEffect(() => {
    if (!isFullscreen) return;
    
    const handleMouseMove = () => {
      setIsVisible(true);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isFullscreen]);

  if (!isFullscreen) return null;

  return (
    <div
      className={`
        fixed top-4 right-4 z-[9999]
        transition-all duration-300 ease-in-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-200/50 p-2 flex items-center gap-1">
        {/* Toggle Cuadrícula */}
        <button
          onClick={onToggleGrid}
          className={`
            p-2.5 rounded-lg transition-all duration-150
            flex items-center justify-center
            ${showGrid
              ? 'bg-blue-500 text-white shadow-md'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }
          `}
          title={showGrid ? 'Ocultar cuadrícula' : 'Mostrar cuadrícula'}
        >
          <Grid3X3 size={18} />
        </button>

        {/* Toggle Reglas */}
        <button
          onClick={onToggleRulers}
          className={`
            p-2.5 rounded-lg transition-all duration-150
            flex items-center justify-center
            ${showRulers
              ? 'bg-blue-500 text-white shadow-md'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }
          `}
          title={showRulers ? 'Ocultar reglas' : 'Mostrar reglas'}
        >
          <Ruler size={18} />
        </button>

        {/* Separador */}
        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* Salir de Fullscreen */}
        <button
          onClick={onExitFullscreen}
          className="
            p-2.5 rounded-lg transition-all duration-150
            flex items-center justify-center gap-2
            bg-red-500 hover:bg-red-600 text-white shadow-md
          "
          title="Salir de pantalla completa (ESC)"
        >
          <Minimize2 size={18} />
          <span className="text-sm font-medium pr-1">Salir</span>
        </button>
      </div>
      
      {/* Indicador de tecla ESC */}
      <div className="mt-2 text-center">
        <span className="text-xs text-white/70 bg-black/30 px-2 py-1 rounded-full backdrop-blur-sm">
          Presiona ESC para salir
        </span>
      </div>
    </div>
  );
};

/**
 * FullscreenButton - Botón para entrar en modo pantalla completa
 * Se muestra en el panel de modos del canvas
 */
const FullscreenButton = ({ onEnterFullscreen }) => {
  return (
    <button
      onClick={onEnterFullscreen}
      className="
        p-2.5 rounded-lg transition-all duration-150
        flex items-center justify-center
        text-gray-500 hover:bg-gray-100 hover:text-gray-700
      "
      title="Pantalla completa"
    >
      <Maximize2 size={20} />
    </button>
  );
};

/**
 * useFullscreen - Hook para manejar el modo pantalla completa
 */
const useFullscreen = (elementRef) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const enterFullscreen = useCallback(async () => {
    try {
      const element = elementRef?.current || document.documentElement;
      
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen();
      }
    } catch (error) {
      console.error('Error entering fullscreen:', error);
    }
  }, [elementRef]);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        await document.msExitFullscreen();
      }
    } catch (error) {
      console.error('Error exiting fullscreen:', error);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  // Escuchar cambios en el estado de fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        !!document.fullscreenElement ||
        !!document.webkitFullscreenElement ||
        !!document.msFullscreenElement
      );
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  return {
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen
  };
};

export { FullscreenControls, FullscreenButton, useFullscreen };

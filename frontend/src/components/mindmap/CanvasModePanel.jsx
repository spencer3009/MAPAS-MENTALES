import React from 'react';
import { MousePointer2, Hand, Maximize2, Grid3X3, Ruler } from 'lucide-react';

// Constantes de layout (deben coincidir con los valores reales de los componentes)
const DOCK_SIDEBAR_WIDTH = 64;    // w-16 del DockSidebar
const PROJECT_SIDEBAR_WIDTH = 288; // w-72 del Sidebar de proyectos
const RULER_WIDTH = 20;            // RULER_SIZE de CanvasRulers
const TOOLBAR_MARGIN = 8;          // Pequeño margen para separación visual

const CanvasModePanel = ({ 
  interactionMode, 
  onSetInteractionMode,
  onEnterFullscreen,
  isFullscreen = false,
  showGrid = true,
  showRulers = true,
  onToggleGrid,
  onToggleRulers,
  isSidebarExpanded = false
}) => {
  // Ocultar el panel en modo fullscreen (se usan otros controles)
  if (isFullscreen) return null;

  // Calcular posición exacta en desktop:
  // Base: DockSidebar (64px)
  // + Sidebar de proyectos si está expandido (288px)
  // + Regla vertical si está visible (20px)
  // + Margen de separación (8px)
  const calculateDesktopLeft = () => {
    let left = DOCK_SIDEBAR_WIDTH; // Siempre hay DockSidebar (64px)
    
    if (isSidebarExpanded) {
      left += PROJECT_SIDEBAR_WIDTH; // + 288px si sidebar expandido
    }
    
    if (showRulers) {
      left += RULER_WIDTH; // + 20px si reglas visibles
    }
    
    left += TOOLBAR_MARGIN; // + 8px de margen
    
    return left;
  };

  const desktopLeftPx = calculateDesktopLeft();

  return (
    <div 
      className="fixed left-4 top-1/2 -translate-y-1/2 z-[9999] transition-all duration-300 md:left-auto"
      style={{ 
        marginTop: 10,
        // En desktop (md+), usar el valor calculado dinámicamente
        // En móvil, Tailwind usa left-4 (16px)
      }}
    >
      <style>
        {`
          @media (min-width: 768px) {
            .canvas-mode-panel-positioned {
              left: ${desktopLeftPx}px !important;
            }
          }
        `}
      </style>
      <div className="canvas-mode-panel-positioned fixed left-4 md:left-auto top-1/2 -translate-y-1/2 z-[9999] transition-all duration-300" style={{ marginTop: 10 }}>
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-1.5 flex flex-col gap-1">
        {/* Modo Puntero */}
        <button
          onClick={() => onSetInteractionMode('pointer')}
          className={`
            p-2.5 rounded-lg transition-all duration-150
            flex items-center justify-center
            ${interactionMode === 'pointer'
              ? 'bg-blue-500 text-white shadow-md'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }
          `}
          title="Modo Puntero: Seleccionar nodos y hacer selección múltiple"
        >
          <MousePointer2 size={20} />
        </button>
        
        {/* Modo Mano */}
        <button
          onClick={() => onSetInteractionMode('hand')}
          className={`
            p-2.5 rounded-lg transition-all duration-150
            flex items-center justify-center
            ${interactionMode === 'hand'
              ? 'bg-blue-500 text-white shadow-md'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }
          `}
          title="Modo Mano: Mover el lienzo arrastrando"
        >
          <Hand size={20} />
        </button>

        {/* Separador */}
        <div className="w-full h-px bg-gray-200 my-1" />

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
          <Grid3X3 size={20} />
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
          <Ruler size={20} />
        </button>

        {/* Separador */}
        <div className="w-full h-px bg-gray-200 my-1" />

        {/* Pantalla Completa */}
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
      </div>
      
      {/* Indicador del modo actual */}
      <div className="mt-2 text-center">
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
          {interactionMode === 'pointer' ? 'Seleccionar' : 'Mover'}
        </span>
      </div>
    </div>
  );
};

export default CanvasModePanel;

import React, { useMemo, useRef, useEffect, useState } from 'react';

/**
 * CanvasRulers - Reglas horizontales y verticales para el lienzo
 * 
 * Características:
 * - Regla superior (horizontal) y lateral (vertical)
 * - Marcas que se actualizan con pan y zoom
 * - Diseño sutil y profesional
 * - Indicador de posición del mouse
 */

const RULER_SIZE = 20; // Altura/ancho de las reglas en px
const MAJOR_TICK_INTERVAL = 100; // Intervalo de marcas mayores (px en canvas)
const MINOR_TICK_INTERVAL = 10; // Intervalo de marcas menores (px en canvas)

// Componente de regla horizontal
const HorizontalRuler = ({ pan, zoom, width, mouseX }) => {
  const canvasRef = useRef(null);

  // Calcular las marcas visibles
  const ticks = useMemo(() => {
    const result = [];
    const scaledMajorInterval = MAJOR_TICK_INTERVAL * zoom;
    const scaledMinorInterval = MINOR_TICK_INTERVAL * zoom;
    
    // Calcular el rango visible en coordenadas del canvas
    const startX = -pan.x / zoom;
    const endX = (width - pan.x) / zoom;
    
    // Alinear al intervalo más cercano
    const firstMajorTick = Math.floor(startX / MAJOR_TICK_INTERVAL) * MAJOR_TICK_INTERVAL;
    const lastMajorTick = Math.ceil(endX / MAJOR_TICK_INTERVAL) * MAJOR_TICK_INTERVAL;
    
    // Generar marcas mayores
    for (let x = firstMajorTick; x <= lastMajorTick; x += MAJOR_TICK_INTERVAL) {
      const screenX = x * zoom + pan.x;
      if (screenX >= 0 && screenX <= width) {
        result.push({
          position: screenX,
          value: Math.round(x),
          isMajor: true
        });
      }
    }
    
    // Generar marcas menores (solo si hay suficiente zoom)
    if (zoom >= 0.5) {
      const firstMinorTick = Math.floor(startX / MINOR_TICK_INTERVAL) * MINOR_TICK_INTERVAL;
      const lastMinorTick = Math.ceil(endX / MINOR_TICK_INTERVAL) * MINOR_TICK_INTERVAL;
      
      for (let x = firstMinorTick; x <= lastMinorTick; x += MINOR_TICK_INTERVAL) {
        if (x % MAJOR_TICK_INTERVAL !== 0) { // No duplicar marcas mayores
          const screenX = x * zoom + pan.x;
          if (screenX >= 0 && screenX <= width) {
            result.push({
              position: screenX,
              value: x,
              isMajor: false
            });
          }
        }
      }
    }
    
    return result;
  }, [pan.x, zoom, width]);

  return (
    <div 
      className="absolute top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-40"
      style={{ height: RULER_SIZE, marginLeft: RULER_SIZE }}
    >
      <svg width="100%" height={RULER_SIZE} className="overflow-visible">
        {/* Fondo sutil */}
        <rect width="100%" height={RULER_SIZE} fill="rgba(248, 250, 252, 0.95)" />
        
        {/* Marcas y números */}
        {ticks.map((tick, i) => (
          <g key={`h-${i}`}>
            <line
              x1={tick.position}
              y1={tick.isMajor ? 8 : 14}
              x2={tick.position}
              y2={RULER_SIZE}
              stroke={tick.isMajor ? '#94a3b8' : '#cbd5e1'}
              strokeWidth={tick.isMajor ? 1 : 0.5}
            />
            {tick.isMajor && (
              <text
                x={tick.position + 3}
                y={10}
                fontSize="9"
                fill="#64748b"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {tick.value}
              </text>
            )}
          </g>
        ))}
        
        {/* Indicador de posición del mouse */}
        {mouseX !== null && mouseX >= 0 && (
          <>
            <line
              x1={mouseX}
              y1={0}
              x2={mouseX}
              y2={RULER_SIZE}
              stroke="#3b82f6"
              strokeWidth={1}
            />
            <polygon
              points={`${mouseX - 4},0 ${mouseX + 4},0 ${mouseX},6`}
              fill="#3b82f6"
            />
          </>
        )}
      </svg>
    </div>
  );
};

// Componente de regla vertical
const VerticalRuler = ({ pan, zoom, height, mouseY }) => {
  const ticks = useMemo(() => {
    const result = [];
    
    // Calcular el rango visible en coordenadas del canvas
    const startY = -pan.y / zoom;
    const endY = (height - pan.y) / zoom;
    
    // Alinear al intervalo más cercano
    const firstMajorTick = Math.floor(startY / MAJOR_TICK_INTERVAL) * MAJOR_TICK_INTERVAL;
    const lastMajorTick = Math.ceil(endY / MAJOR_TICK_INTERVAL) * MAJOR_TICK_INTERVAL;
    
    // Generar marcas mayores
    for (let y = firstMajorTick; y <= lastMajorTick; y += MAJOR_TICK_INTERVAL) {
      const screenY = y * zoom + pan.y;
      if (screenY >= 0 && screenY <= height) {
        result.push({
          position: screenY,
          value: Math.round(y),
          isMajor: true
        });
      }
    }
    
    // Generar marcas menores (solo si hay suficiente zoom)
    if (zoom >= 0.5) {
      const firstMinorTick = Math.floor(startY / MINOR_TICK_INTERVAL) * MINOR_TICK_INTERVAL;
      const lastMinorTick = Math.ceil(endY / MINOR_TICK_INTERVAL) * MINOR_TICK_INTERVAL;
      
      for (let y = firstMinorTick; y <= lastMinorTick; y += MINOR_TICK_INTERVAL) {
        if (y % MAJOR_TICK_INTERVAL !== 0) {
          const screenY = y * zoom + pan.y;
          if (screenY >= 0 && screenY <= height) {
            result.push({
              position: screenY,
              value: y,
              isMajor: false
            });
          }
        }
      }
    }
    
    return result;
  }, [pan.y, zoom, height]);

  return (
    <div 
      className="absolute top-0 left-0 bottom-0 bg-white/95 backdrop-blur-sm border-r border-gray-200 z-40"
      style={{ width: RULER_SIZE, marginTop: RULER_SIZE }}
    >
      <svg width={RULER_SIZE} height="100%" className="overflow-visible">
        {/* Fondo sutil */}
        <rect width={RULER_SIZE} height="100%" fill="rgba(248, 250, 252, 0.95)" />
        
        {/* Marcas y números */}
        {ticks.map((tick, i) => (
          <g key={`v-${i}`}>
            <line
              x1={tick.isMajor ? 8 : 14}
              y1={tick.position}
              x2={RULER_SIZE}
              y2={tick.position}
              stroke={tick.isMajor ? '#94a3b8' : '#cbd5e1'}
              strokeWidth={tick.isMajor ? 1 : 0.5}
            />
            {tick.isMajor && (
              <text
                x={2}
                y={tick.position - 3}
                fontSize="9"
                fill="#64748b"
                fontFamily="system-ui, -apple-system, sans-serif"
                writingMode="vertical-rl"
                transform={`rotate(180, 10, ${tick.position - 3})`}
              >
                {tick.value}
              </text>
            )}
          </g>
        ))}
        
        {/* Indicador de posición del mouse */}
        {mouseY !== null && mouseY >= 0 && (
          <>
            <line
              x1={0}
              y1={mouseY}
              x2={RULER_SIZE}
              y2={mouseY}
              stroke="#3b82f6"
              strokeWidth={1}
            />
            <polygon
              points={`0,${mouseY - 4} 0,${mouseY + 4} 6,${mouseY}`}
              fill="#3b82f6"
            />
          </>
        )}
      </svg>
    </div>
  );
};

// Esquina de intersección de las reglas
const RulerCorner = () => (
  <div 
    className="absolute top-0 left-0 bg-white/95 backdrop-blur-sm border-r border-b border-gray-200 z-50 flex items-center justify-center"
    style={{ width: RULER_SIZE, height: RULER_SIZE }}
  >
    <div className="w-2 h-2 rounded-full bg-gray-300" />
  </div>
);

// Componente principal que combina ambas reglas
const CanvasRulers = ({ pan, zoom, containerRef }) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [mousePosition, setMousePosition] = useState({ x: null, y: null });

  // Actualizar dimensiones cuando cambia el contenedor
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef?.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width - RULER_SIZE,
          height: rect.height - RULER_SIZE
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [containerRef]);

  // Rastrear posición del mouse
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (containerRef?.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - RULER_SIZE;
        const y = e.clientY - rect.top - RULER_SIZE;
        setMousePosition({ x, y });
      }
    };

    const handleMouseLeave = () => {
      setMousePosition({ x: null, y: null });
    };

    const container = containerRef?.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);
      return () => {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, [containerRef]);

  return (
    <>
      <RulerCorner />
      <HorizontalRuler 
        pan={pan} 
        zoom={zoom} 
        width={dimensions.width}
        mouseX={mousePosition.x}
      />
      <VerticalRuler 
        pan={pan} 
        zoom={zoom} 
        height={dimensions.height}
        mouseY={mousePosition.y}
      />
    </>
  );
};

export { CanvasRulers, RULER_SIZE };
export default CanvasRulers;

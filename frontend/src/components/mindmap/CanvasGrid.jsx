import React, { useMemo } from 'react';

/**
 * CanvasGrid - Cuadrícula visual para el lienzo del mapa mental
 * 
 * Características:
 * - Líneas sutiles y semi-transparentes
 * - Se sincroniza con pan y zoom
 * - Efecto de cuadrícula "infinita"
 * - Dos niveles de líneas: mayores y menores
 */
const CanvasGrid = ({ 
  pan, 
  zoom, 
  gridSize = 50, // Tamaño base de la cuadrícula (px)
  showMinorGrid = true // Mostrar líneas menores
}) => {
  // Calcular el tamaño escalado de la cuadrícula
  const scaledGridSize = gridSize * zoom;
  const minorGridSize = (gridSize / 5) * zoom; // Líneas menores cada 10px base

  // Calcular offset para que la cuadrícula se mueva con el pan
  const offsetX = pan.x % scaledGridSize;
  const offsetY = pan.y % scaledGridSize;
  const minorOffsetX = pan.x % minorGridSize;
  const minorOffsetY = pan.y % minorGridSize;

  // Estilos de las líneas de cuadrícula
  const majorGridStyle = useMemo(() => ({
    backgroundImage: `
      linear-gradient(to right, rgba(148, 163, 184, 0.25) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(148, 163, 184, 0.25) 1px, transparent 1px)
    `,
    backgroundSize: `${scaledGridSize}px ${scaledGridSize}px`,
    backgroundPosition: `${offsetX}px ${offsetY}px`
  }), [scaledGridSize, offsetX, offsetY]);

  const minorGridStyle = useMemo(() => ({
    backgroundImage: `
      linear-gradient(to right, rgba(148, 163, 184, 0.08) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(148, 163, 184, 0.08) 1px, transparent 1px)
    `,
    backgroundSize: `${minorGridSize}px ${minorGridSize}px`,
    backgroundPosition: `${minorOffsetX}px ${minorOffsetY}px`
  }), [minorGridSize, minorOffsetX, minorOffsetY]);

  return (
    <>
      {/* Cuadrícula menor (líneas más finas) */}
      {showMinorGrid && zoom >= 0.5 && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={minorGridStyle}
        />
      )}
      
      {/* Cuadrícula mayor (líneas principales) */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={majorGridStyle}
      />

      {/* Líneas de origen (ejes X e Y) - más visibles */}
      <div 
        className="absolute pointer-events-none"
        style={{
          left: pan.x,
          top: 0,
          width: '1px',
          height: '100%',
          backgroundColor: 'rgba(59, 130, 246, 0.15)'
        }}
      />
      <div 
        className="absolute pointer-events-none"
        style={{
          left: 0,
          top: pan.y,
          width: '100%',
          height: '1px',
          backgroundColor: 'rgba(59, 130, 246, 0.15)'
        }}
      />
    </>
  );
};

export default CanvasGrid;

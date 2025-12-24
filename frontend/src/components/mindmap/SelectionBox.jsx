import React from 'react';

/**
 * Componente visual para la caja de selección por área (drag selection)
 */
const SelectionBox = ({ startPoint, endPoint, zoom }) => {
  if (!startPoint || !endPoint) return null;

  // Calcular las coordenadas del rectángulo
  const left = Math.min(startPoint.x, endPoint.x);
  const top = Math.min(startPoint.y, endPoint.y);
  const width = Math.abs(endPoint.x - startPoint.x);
  const height = Math.abs(endPoint.y - startPoint.y);

  // No mostrar si es muy pequeño (evitar selecciones accidentales)
  if (width < 5 && height < 5) return null;

  return (
    <div
      className="absolute pointer-events-none z-50"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        border: '2px dashed #3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderRadius: '4px',
      }}
    />
  );
};

export default SelectionBox;

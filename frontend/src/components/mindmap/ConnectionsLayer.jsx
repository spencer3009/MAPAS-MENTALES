import React, { memo } from 'react';
import { generateBezierPath, getNodeOutputPoint, getNodeInputPoint } from '../../utils/curve';

const NODE_WIDTH = 160;
const NODE_HEIGHT = 64;

// Función auxiliar para obtener el dasharray según el estilo
const getStrokeDasharray = (style) => {
  switch (style) {
    case 'dashed':
      return '8,4';
    case 'dotted':
      return '2,4';
    default:
      return 'none';
  }
};

const ConnectionsLayer = memo(({ nodes }) => {
  const connections = nodes
    .filter(node => node.parentId)
    .map(node => {
      const parent = nodes.find(n => n.id === node.parentId);
      if (!parent) return null;

      const start = getNodeOutputPoint(parent, NODE_WIDTH, NODE_HEIGHT);
      const end = getNodeInputPoint(node, NODE_HEIGHT);
      const path = generateBezierPath(start.x, start.y, end.x, end.y);

      // Usar estilos de línea del nodo hijo (la línea va hacia el hijo)
      const lineColor = node.lineColor || '#94a3b8';
      const lineWidth = node.lineWidth || 2;
      const lineStyle = node.lineStyle || 'solid';
      const strokeDasharray = getStrokeDasharray(lineStyle);

      return (
        <path
          key={`${parent.id}-${node.id}`}
          d={path}
          stroke={lineColor}
          strokeWidth={lineWidth}
          strokeDasharray={strokeDasharray}
          fill="none"
          className="transition-all duration-150"
        />
      );
    })
    .filter(Boolean);

  return (
    <svg 
      className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible"
      style={{ minWidth: '5000px', minHeight: '5000px' }}
    >
      {connections}
    </svg>
  );
});

ConnectionsLayer.displayName = 'ConnectionsLayer';

export default ConnectionsLayer;

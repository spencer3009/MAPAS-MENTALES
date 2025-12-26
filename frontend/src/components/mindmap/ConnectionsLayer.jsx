import React, { memo, useMemo } from 'react';
import { 
  generateBezierPath, 
  generateOrgChartPath,
  getNodeOutputPoint, 
  getNodeInputPoint,
  getNodeOutputPointOrgChart,
  getNodeInputPointOrgChart
} from '../../utils/curve';

const DEFAULT_NODE_WIDTH = 160;
const DEFAULT_NODE_HEIGHT = 64;

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

const ConnectionsLayer = memo(({ 
  nodes, 
  layoutType = 'mindflow',
  onAddNodeFromLine,
  showLineButtons = false
}) => {
  const connections = nodes
    .filter(node => node.parentId)
    .map(node => {
      const parent = nodes.find(n => n.id === node.parentId);
      if (!parent) return null;

      // Usar tamaño dinámico de cada nodo
      const parentWidth = parent.width || DEFAULT_NODE_WIDTH;
      const parentHeight = parent.height || DEFAULT_NODE_HEIGHT;
      const nodeWidth = node.width || DEFAULT_NODE_WIDTH;
      const nodeHeight = node.height || DEFAULT_NODE_HEIGHT;

      let start, end, path;

      if (layoutType === 'mindhybrid') {
        // MindHybrid: el tipo de conector depende de la dirección del nodo hijo
        if (node.childDirection === 'vertical') {
          // Hijo vertical: conector tipo org chart (vertical)
          start = getNodeOutputPointOrgChart(parent, parentWidth, parentHeight);
          end = getNodeInputPointOrgChart(node, nodeWidth);
          path = generateOrgChartPath(start.x, start.y, end.x, end.y);
        } else {
          // Hijo horizontal (o sin dirección): conector curvo (horizontal)
          start = getNodeOutputPoint(parent, parentWidth, parentHeight);
          end = getNodeInputPoint(node, nodeHeight);
          path = generateBezierPath(start.x, start.y, end.x, end.y);
        }
      } else if (layoutType === 'mindtree') {
        // MindTree (Organigrama): conectores verticales tipo org chart
        // Padre: centro inferior, Hijo: centro superior
        start = getNodeOutputPointOrgChart(parent, parentWidth, parentHeight);
        end = getNodeInputPointOrgChart(node, nodeWidth);
        path = generateOrgChartPath(start.x, start.y, end.x, end.y);
      } else {
        // MindFlow: conectores horizontales con curvas bezier
        start = getNodeOutputPoint(parent, parentWidth, parentHeight);
        end = getNodeInputPoint(node, nodeHeight);
        path = generateBezierPath(start.x, start.y, end.x, end.y);
      }

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

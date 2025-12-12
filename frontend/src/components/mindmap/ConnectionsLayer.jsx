import React, { memo } from 'react';
import { generateBezierPath, getNodeOutputPoint, getNodeInputPoint } from '../../utils/curve';

const NODE_WIDTH = 160;
const NODE_HEIGHT = 64;

const ConnectionsLayer = memo(({ nodes }) => {
  const connections = nodes
    .filter(node => node.parentId)
    .map(node => {
      const parent = nodes.find(n => n.id === node.parentId);
      if (!parent) return null;

      const start = getNodeOutputPoint(parent, NODE_WIDTH, NODE_HEIGHT);
      const end = getNodeInputPoint(node, NODE_HEIGHT);
      const path = generateBezierPath(start.x, start.y, end.x, end.y);

      return (
        <path
          key={`${parent.id}-${node.id}`}
          d={path}
          stroke="#94a3b8"
          strokeWidth="2"
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

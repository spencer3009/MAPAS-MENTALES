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

  // ==========================================
  // DETECTAR LÍNEAS HORIZONTALES COMPARTIDAS
  // Para MindHybrid/MindTree: encontrar padres con múltiples hijos verticales
  // La línea horizontal está entre el padre y sus hijos
  // ==========================================
  const horizontalLineButtons = useMemo(() => {
    if (!showLineButtons || !onAddNodeFromLine) {
      return [];
    }
    
    // Solo para MindHybrid y MindTree
    if (layoutType !== 'mindhybrid' && layoutType !== 'mindtree') {
      return [];
    }

    const buttons = [];

    // Agrupar nodos por parentId
    const childrenByParent = {};
    nodes.forEach(node => {
      if (node.parentId) {
        if (!childrenByParent[node.parentId]) {
          childrenByParent[node.parentId] = [];
        }
        childrenByParent[node.parentId].push(node);
      }
    });

    // Para cada padre con hijos
    Object.entries(childrenByParent).forEach(([parentId, children]) => {
      const parent = nodes.find(n => n.id === parentId);
      if (!parent) return;

      // Filtrar según el tipo de layout
      let verticalChildren;
      if (layoutType === 'mindtree') {
        // En MindTree, todos los hijos son "verticales"
        verticalChildren = children;
      } else {
        // En MindHybrid, solo hijos con childDirection: 'vertical'
        verticalChildren = children.filter(c => c.childDirection === 'vertical');
      }

      // Necesitamos al menos 2 hijos para formar una línea horizontal
      if (verticalChildren.length < 2) return;

      // Ordenar por X para encontrar los extremos
      const sortedByX = [...verticalChildren].sort((a, b) => a.x - b.x);
      const leftChild = sortedByX[0];
      const rightChild = sortedByX[sortedByX.length - 1];

      // Calcular la posición de la línea horizontal
      // Está a medio camino entre el borde inferior del padre y el borde superior de los hijos
      const parentBottom = parent.y + (parent.height || DEFAULT_NODE_HEIGHT);
      const childTop = leftChild.y;
      const lineY = (parentBottom + childTop) / 2;

      // Centro X de la línea
      const leftX = leftChild.x + (leftChild.width || DEFAULT_NODE_WIDTH) / 2;
      const rightX = rightChild.x + (rightChild.width || DEFAULT_NODE_WIDTH) / 2;
      const centerX = (leftX + rightX) / 2;

      buttons.push({
        id: `line-btn-${parentId}`,
        parentId,
        x: centerX,
        y: lineY,
        childIds: verticalChildren.map(c => c.id)
      });
    });

    return buttons;
  }, [nodes, layoutType, showLineButtons, onAddNodeFromLine]);

  return (
    <>
      <svg 
        className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible"
        style={{ minWidth: '5000px', minHeight: '5000px' }}
      >
        {connections}
        
        {/* Líneas verticales que conectan hermanos horizontales al botón "+" */}
        {horizontalLineButtons.map(btn => {
          const parent = nodes.find(n => n.id === btn.parentId);
          if (!parent) return null;

          // Línea vertical desde el botón hasta la línea principal
          return (
            <g key={`line-connector-${btn.id}`}>
              {/* Indicador visual de la línea (opcional, para debug) */}
            </g>
          );
        })}
      </svg>
      
      {/* Botones "+" para líneas horizontales - renderizados fuera del SVG para interactividad */}
      {horizontalLineButtons.map(btn => (
        <button
          key={btn.id}
          onClick={(e) => {
            e.stopPropagation();
            onAddNodeFromLine(btn.parentId, btn.childIds);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="
            absolute z-40
            w-6 h-6 rounded-full
            bg-purple-500 hover:bg-purple-600
            text-white shadow-lg
            flex items-center justify-center
            transition-all duration-200
            hover:scale-110 active:scale-95
            border-2 border-white
            pointer-events-auto
          "
          style={{
            left: btn.x,
            top: btn.y,
            transform: 'translate(-50%, -50%)'
          }}
          title="Agregar nodo desde línea"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      ))}
    </>
  );
});

ConnectionsLayer.displayName = 'ConnectionsLayer';

export default ConnectionsLayer;

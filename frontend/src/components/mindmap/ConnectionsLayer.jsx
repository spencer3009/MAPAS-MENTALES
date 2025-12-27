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

      // Caso especial: nodo creado desde un conector horizontal (botón "+" púrpura)
      // El conector SIEMPRE debe ser RECTO VERTICAL para estos nodos
      // No importa si el nodo se movió - el conector principal permanece recto
      if (node.connectorParentId && node.connectorTargetId && layoutType === 'mindhybrid') {
        const connectorTarget = nodes.find(n => n.id === node.connectorTargetId);
        if (connectorTarget) {
          // Calcular el punto medio del conector horizontal original
          const targetParent = nodes.find(n => n.id === connectorTarget.parentId);
          if (targetParent) {
            const tpWidth = targetParent.width || DEFAULT_NODE_WIDTH;
            const tpHeight = targetParent.height || DEFAULT_NODE_HEIGHT;
            const ctHeight = connectorTarget.height || DEFAULT_NODE_HEIGHT;
            
            const tpRight = targetParent.x + tpWidth;
            const tpCenterY = targetParent.y + tpHeight / 2;
            const ctLeft = connectorTarget.x;
            const ctCenterY = connectorTarget.y + ctHeight / 2;
            
            // Punto medio del conector horizontal (donde está el botón "+")
            const midX = (tpRight + ctLeft) / 2;
            const midY = (tpCenterY + ctCenterY) / 2;
            
            // Punto de entrada al nodo hijo (centro superior)
            const actualNodeWidth = node.width || DEFAULT_NODE_WIDTH;
            const endX = node.x + actualNodeWidth / 2;
            const endY = node.y;
            
            start = { x: midX, y: midY };
            end = { x: endX, y: endY };
            
            // SIEMPRE usar conector RECTO VERTICAL para nodos creados desde el "+" púrpura
            // La línea sale del punto medio del conector horizontal y baja RECTA
            // hasta el centro superior del nodo hijo
            // Usamos el X del nodo hijo para que la línea termine exactamente centrada
            path = `M ${endX} ${midY} L ${endX} ${endY}`;
          }
        }
      } else if (layoutType === 'mindhybrid') {
        // MindHybrid: el tipo de conector depende de la dirección del nodo hijo
        // Si childDirection no está definido, inferir de la posición relativa al padre
        let effectiveDirection = node.childDirection;
        if (!effectiveDirection) {
          // Inferir dirección por posición
          const relX = node.x - parent.x;
          const relY = node.y - parent.y;
          // Si el nodo está más abajo que a la derecha, es vertical
          effectiveDirection = (relY > 50 && Math.abs(relX) < parentWidth + 50) ? 'vertical' : 'horizontal';
        }
        
        if (effectiveDirection === 'vertical') {
          // Hijo vertical: conector tipo org chart (vertical)
          start = getNodeOutputPointOrgChart(parent, parentWidth, parentHeight);
          end = getNodeInputPointOrgChart(node, nodeWidth);
          path = generateOrgChartPath(start.x, start.y, end.x, end.y);
        } else {
          // Hijo horizontal: CONECTOR ORTOGONAL (sin inclinaciones)
          // Sale del centro derecho del padre, entra al centro izquierdo del hijo
          const startX = parent.x + parentWidth;
          const startY = parent.y + parentHeight / 2;
          const endX = node.x;
          const endY = node.y + nodeHeight / 2;
          
          start = { x: startX, y: startY };
          end = { x: endX, y: endY };
          
          // Si los nodos están a la misma altura (tolerancia de 5px) → línea recta horizontal
          if (Math.abs(startY - endY) < 5) {
            path = `M ${startX} ${startY} L ${endX} ${endY}`;
          } else {
            // Si hay diferencia de altura → conector tipo codo: ➡️ ⬇️ ➡️
            // 1. Horizontal hasta la mitad del espacio
            // 2. Vertical hasta la altura del hijo
            // 3. Horizontal hasta el hijo
            const midX = startX + (endX - startX) / 2;
            path = `M ${startX} ${startY} ` +      // Inicio
                   `L ${midX} ${startY} ` +        // 1️⃣ Horizontal hasta el punto medio
                   `L ${midX} ${endY} ` +          // 2️⃣ Vertical hasta la altura del hijo
                   `L ${endX} ${endY}`;            // 3️⃣ Horizontal hasta el hijo
          }
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

      const parentCenterX = parent.x + (parent.width || DEFAULT_NODE_WIDTH) / 2;
      const parentBottom = parent.y + (parent.height || DEFAULT_NODE_HEIGHT);
      const parentRight = parent.x + (parent.width || DEFAULT_NODE_WIDTH);

      // =====================================================
      // CASO 1: Botón en línea HORIZONTAL (entre hijos verticales)
      // =====================================================
      let verticalChildren;
      if (layoutType === 'mindtree') {
        // En MindTree, todos los hijos son "verticales"
        verticalChildren = children;
      } else {
        // En MindHybrid, hijos con childDirection: 'vertical' O inferido por posición
        verticalChildren = children.filter(c => {
          if (c.childDirection === 'vertical') return true;
          if (c.childDirection === 'horizontal') return false;
          
          // Inferir por posición: hijo "vertical" está más abajo que a la derecha
          const relX = c.x - parent.x;
          const relY = c.y - parent.y;
          return relY > 50 && Math.abs(relX) < 200;
        });
      }

      // Si hay 2+ hijos verticales, crear botón en la línea horizontal
      if (verticalChildren.length >= 2) {
        const sortedByX = [...verticalChildren].sort((a, b) => a.x - b.x);
        const leftChild = sortedByX[0];
        const rightChild = sortedByX[sortedByX.length - 1];

        const childTop = leftChild.y;
        const lineY = (parentBottom + childTop) / 2;

        const leftX = leftChild.x + (leftChild.width || DEFAULT_NODE_WIDTH) / 2;
        const rightX = rightChild.x + (rightChild.width || DEFAULT_NODE_WIDTH) / 2;
        const centerX = (leftX + rightX) / 2;

        buttons.push({
          id: `hline-btn-${parentId}`,
          parentId,
          x: centerX,
          y: lineY,
          childIds: verticalChildren.map(c => c.id),
          lineType: 'horizontal' // Para hijos verticales bajo el padre
        });
      }

      // =====================================================
      // CASO 2: Botón en línea VERTICAL (entre hermanos horizontales)
      // Solo para MindHybrid
      // =====================================================
      if (layoutType === 'mindhybrid') {
        const horizontalChildren = children.filter(c => {
          if (c.childDirection === 'horizontal') return true;
          if (c.childDirection === 'vertical') return false;
          
          // Inferir por posición: hijo "horizontal" está más a la derecha
          const relX = c.x - parent.x;
          const relY = c.y - parent.y;
          return relX > 100 && Math.abs(relY) < 100;
        });

        // Si hay 2+ hermanos horizontales, crear botón en la línea vertical que los conecta
        if (horizontalChildren.length >= 2) {
          const sortedByY = [...horizontalChildren].sort((a, b) => a.y - b.y);
          const topChild = sortedByY[0];
          const bottomChild = sortedByY[sortedByY.length - 1];

          // La línea vertical está a la izquierda de los hermanos (donde entra el conector)
          const lineX = topChild.x; // Lado izquierdo de los nodos
          
          // Centro Y de la línea vertical
          const topY = topChild.y + (topChild.height || DEFAULT_NODE_HEIGHT) / 2;
          const bottomY = bottomChild.y + (bottomChild.height || DEFAULT_NODE_HEIGHT) / 2;
          const centerY = (topY + bottomY) / 2;

          buttons.push({
            id: `vline-btn-${parentId}`,
            parentId,
            x: lineX - 15, // Un poco a la izquierda de la línea
            y: centerY,
            childIds: horizontalChildren.map(c => c.id),
            lineType: 'vertical' // Para hermanos horizontales apilados
          });
        }

        // =====================================================
        // CASO 3: Botón en CADA conector horizontal individual
        // Entre un padre y su hijo horizontal directo
        // =====================================================
        horizontalChildren.forEach(child => {
          const parentRight = parent.x + (parent.width || DEFAULT_NODE_WIDTH);
          const parentCenterY = parent.y + (parent.height || DEFAULT_NODE_HEIGHT) / 2;
          const childLeft = child.x;
          const childCenterY = child.y + (child.height || DEFAULT_NODE_HEIGHT) / 2;
          
          // Centro del conector horizontal (línea recta entre padre e hijo)
          const centerX = (parentRight + childLeft) / 2;
          const centerY = (parentCenterY + childCenterY) / 2;
          
          buttons.push({
            id: `hconn-btn-${parent.id}-${child.id}`,
            parentId: parent.id,
            targetChildId: child.id,
            x: centerX,
            y: centerY,
            lineType: 'horizontal-connector' // Para crear ramas verticales desde el conector
          });
        });
      }
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
            // Si es un botón de conector horizontal individual, pasar targetChildId
            // Si es un botón de línea entre hermanos, pasar childIds
            if (btn.lineType === 'horizontal-connector') {
              onAddNodeFromLine(btn.parentId, btn.targetChildId);
            } else {
              onAddNodeFromLine(btn.parentId, btn.childIds);
            }
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

/**
 * Sistema de conectores inteligentes con anclaje automático
 * Similar a Miro, Whimsical, FigJam
 */

const DEFAULT_NODE_WIDTH = 160;
const DEFAULT_NODE_HEIGHT = 64;

// ========================================
// SISTEMA DE ANCLAJE INTELIGENTE
// ========================================

/**
 * Puntos de anclaje de un nodo
 * @typedef {'right' | 'left' | 'top' | 'bottom'} AnchorPoint
 */

/**
 * Obtiene todos los puntos de anclaje de un nodo
 * @param {Object} node - El nodo
 * @param {number} nodeWidth - Ancho del nodo
 * @param {number} nodeHeight - Alto del nodo
 * @returns {Object} Objeto con las coordenadas de cada punto de anclaje
 */
export const getNodeAnchorPoints = (node, nodeWidth = DEFAULT_NODE_WIDTH, nodeHeight = DEFAULT_NODE_HEIGHT) => {
  const width = node.width || nodeWidth;
  const height = node.height || nodeHeight;
  
  return {
    right: { x: node.x + width, y: node.y + height / 2 },
    left: { x: node.x, y: node.y + height / 2 },
    top: { x: node.x + width / 2, y: node.y },
    bottom: { x: node.x + width / 2, y: node.y + height },
    center: { x: node.x + width / 2, y: node.y + height / 2 }
  };
};

/**
 * Calcula la distancia entre dos puntos
 */
const distance = (p1, p2) => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

/**
 * Determina los mejores puntos de anclaje entre dos nodos
 * basándose en la posición relativa y distancia mínima
 * 
 * @param {Object} sourceNode - Nodo origen
 * @param {Object} targetNode - Nodo destino
 * @param {number} sourceWidth - Ancho del nodo origen
 * @param {number} sourceHeight - Alto del nodo origen
 * @param {number} targetWidth - Ancho del nodo destino
 * @param {number} targetHeight - Alto del nodo destino
 * @returns {{ source: { point: string, x: number, y: number }, target: { point: string, x: number, y: number } }}
 */
export const getSmartAnchorPoints = (
  sourceNode, 
  targetNode,
  sourceWidth = DEFAULT_NODE_WIDTH,
  sourceHeight = DEFAULT_NODE_HEIGHT,
  targetWidth = DEFAULT_NODE_WIDTH,
  targetHeight = DEFAULT_NODE_HEIGHT
) => {
  const sourceAnchors = getNodeAnchorPoints(sourceNode, sourceWidth, sourceHeight);
  const targetAnchors = getNodeAnchorPoints(targetNode, targetWidth, targetHeight);
  
  // Calcular posición relativa del target respecto al source
  const sourceCenterX = sourceNode.x + (sourceNode.width || sourceWidth) / 2;
  const sourceCenterY = sourceNode.y + (sourceNode.height || sourceHeight) / 2;
  const targetCenterX = targetNode.x + (targetNode.width || targetWidth) / 2;
  const targetCenterY = targetNode.y + (targetNode.height || targetHeight) / 2;
  
  const deltaX = targetCenterX - sourceCenterX;
  const deltaY = targetCenterY - sourceCenterY;
  
  // Determinar dirección dominante
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  
  let sourcePoint, targetPoint;
  
  // Priorizar conexiones horizontales si hay más diferencia en X
  if (absX > absY * 0.5) {
    // Conexión predominantemente horizontal
    if (deltaX > 0) {
      // Target está a la derecha
      sourcePoint = 'right';
      targetPoint = 'left';
    } else {
      // Target está a la izquierda
      sourcePoint = 'left';
      targetPoint = 'right';
    }
  } else {
    // Conexión predominantemente vertical
    if (deltaY > 0) {
      // Target está abajo
      sourcePoint = 'bottom';
      targetPoint = 'top';
    } else {
      // Target está arriba
      sourcePoint = 'top';
      targetPoint = 'bottom';
    }
  }
  
  // Verificar si hay una conexión más corta disponible
  // Probar todas las combinaciones y elegir la más corta
  const combinations = [
    { source: 'right', target: 'left' },
    { source: 'left', target: 'right' },
    { source: 'bottom', target: 'top' },
    { source: 'top', target: 'bottom' },
    { source: 'right', target: 'top' },
    { source: 'right', target: 'bottom' },
    { source: 'left', target: 'top' },
    { source: 'left', target: 'bottom' },
    { source: 'bottom', target: 'left' },
    { source: 'bottom', target: 'right' },
    { source: 'top', target: 'left' },
    { source: 'top', target: 'right' }
  ];
  
  let minDistance = distance(sourceAnchors[sourcePoint], targetAnchors[targetPoint]);
  let bestCombination = { source: sourcePoint, target: targetPoint };
  
  for (const combo of combinations) {
    const d = distance(sourceAnchors[combo.source], targetAnchors[combo.target]);
    // Priorizar combinaciones "lógicas" (opuestas) con un pequeño margen
    const isOpposite = 
      (combo.source === 'right' && combo.target === 'left') ||
      (combo.source === 'left' && combo.target === 'right') ||
      (combo.source === 'top' && combo.target === 'bottom') ||
      (combo.source === 'bottom' && combo.target === 'top');
    
    const threshold = isOpposite ? 1.0 : 0.85; // Dar preferencia a conexiones opuestas
    
    if (d < minDistance * threshold) {
      minDistance = d;
      bestCombination = combo;
    }
  }
  
  return {
    source: { 
      point: bestCombination.source, 
      ...sourceAnchors[bestCombination.source] 
    },
    target: { 
      point: bestCombination.target, 
      ...targetAnchors[bestCombination.target] 
    }
  };
};

/**
 * Obtiene el mejor punto de anclaje hacia una posición arbitraria (para preview)
 */
export const getSmartAnchorToPosition = (
  node,
  targetX,
  targetY,
  nodeWidth = DEFAULT_NODE_WIDTH,
  nodeHeight = DEFAULT_NODE_HEIGHT
) => {
  const anchors = getNodeAnchorPoints(node, nodeWidth, nodeHeight);
  const targetPoint = { x: targetX, y: targetY };
  
  // Calcular centro del nodo
  const centerX = node.x + (node.width || nodeWidth) / 2;
  const centerY = node.y + (node.height || nodeHeight) / 2;
  
  const deltaX = targetX - centerX;
  const deltaY = targetY - centerY;
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  
  // Elegir el anclaje basado en la dirección dominante
  let bestPoint;
  
  if (absX > absY) {
    // Predominantemente horizontal
    bestPoint = deltaX > 0 ? 'right' : 'left';
  } else {
    // Predominantemente vertical
    bestPoint = deltaY > 0 ? 'bottom' : 'top';
  }
  
  return { point: bestPoint, ...anchors[bestPoint] };
};

// ========================================
// GENERACIÓN DE PATHS
// ========================================

/**
 * Genera un path SVG inteligente entre dos puntos con anclaje
 * Produce curvas suaves y cortas
 * 
 * @param {Object} source - Punto de origen { x, y, point }
 * @param {Object} target - Punto destino { x, y, point }
 * @returns {string} Path SVG
 */
export const generateSmartPath = (source, target) => {
  const { x: startX, y: startY, point: sourceAnchor } = source;
  const { x: endX, y: endY, point: targetAnchor } = target;
  
  // Calcular distancia y offset para control points
  const dx = endX - startX;
  const dy = endY - startY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  // Offset proporcional a la distancia, pero con límites
  const baseOffset = Math.min(Math.max(dist * 0.3, 20), 100);
  
  let cp1X, cp1Y, cp2X, cp2Y;
  
  // Determinar control points basados en los anclajes
  switch (sourceAnchor) {
    case 'right':
      cp1X = startX + baseOffset;
      cp1Y = startY;
      break;
    case 'left':
      cp1X = startX - baseOffset;
      cp1Y = startY;
      break;
    case 'bottom':
      cp1X = startX;
      cp1Y = startY + baseOffset;
      break;
    case 'top':
      cp1X = startX;
      cp1Y = startY - baseOffset;
      break;
    default:
      cp1X = startX + baseOffset;
      cp1Y = startY;
  }
  
  switch (targetAnchor) {
    case 'right':
      cp2X = endX + baseOffset;
      cp2Y = endY;
      break;
    case 'left':
      cp2X = endX - baseOffset;
      cp2Y = endY;
      break;
    case 'bottom':
      cp2X = endX;
      cp2Y = endY + baseOffset;
      break;
    case 'top':
      cp2X = endX;
      cp2Y = endY - baseOffset;
      break;
    default:
      cp2X = endX - baseOffset;
      cp2Y = endY;
  }
  
  return `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
};

/**
 * Genera un path simple para preview (línea recta con curva suave)
 */
export const generatePreviewPath = (startX, startY, endX, endY, sourceAnchor = 'right') => {
  const dx = endX - startX;
  const dy = endY - startY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const offset = Math.min(Math.max(dist * 0.25, 15), 60);
  
  let cp1X, cp1Y;
  
  switch (sourceAnchor) {
    case 'right':
      cp1X = startX + offset;
      cp1Y = startY;
      break;
    case 'left':
      cp1X = startX - offset;
      cp1Y = startY;
      break;
    case 'bottom':
      cp1X = startX;
      cp1Y = startY + offset;
      break;
    case 'top':
      cp1X = startX;
      cp1Y = startY - offset;
      break;
    default:
      cp1X = startX + offset;
      cp1Y = startY;
  }
  
  // Control point del destino: va hacia el cursor
  const cp2X = endX - (dx * 0.2);
  const cp2Y = endY - (dy * 0.2);
  
  return `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
};

// ========================================
// FUNCIONES LEGACY (para compatibilidad)
// ========================================

/**
 * Genera un path SVG de curva Bezier cúbica entre dos puntos
 * Para MindFlow (layout horizontal)
 */
export const generateBezierPath = (startX, startY, endX, endY) => {
  const controlPointOffset = Math.min(Math.abs(endX - startX) * 0.4, 80);
  
  const cp1X = startX + controlPointOffset;
  const cp1Y = startY;
  const cp2X = endX - controlPointOffset;
  const cp2Y = endY;

  return `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
};

/**
 * Genera un path SVG de conexión tipo organigrama (MindTree)
 */
export const generateOrgChartPath = (startX, startY, endX, endY) => {
  const midY = startY + (endY - startY) / 2;
  const radius = 6;
  
  if (Math.abs(startX - endX) < 5) {
    return `M ${startX} ${startY} L ${endX} ${endY}`;
  }
  
  const direction = endX > startX ? 1 : -1;
  
  return `
    M ${startX} ${startY}
    L ${startX} ${midY - radius}
    Q ${startX} ${midY} ${startX + (radius * direction)} ${midY}
    L ${endX - (radius * direction)} ${midY}
    Q ${endX} ${midY} ${endX} ${midY + radius}
    L ${endX} ${endY}
  `.replace(/\s+/g, ' ').trim();
};

/**
 * Calcula el punto de conexión de salida de un nodo (lado derecho)
 * Para MindFlow (layout horizontal)
 */
export const getNodeOutputPoint = (node, nodeWidth = DEFAULT_NODE_WIDTH, nodeHeight = DEFAULT_NODE_HEIGHT) => {
  return {
    x: node.x + (node.width || nodeWidth),
    y: node.y + (node.height || nodeHeight) / 2
  };
};

/**
 * Calcula el punto de conexión de entrada de un nodo (lado izquierdo)
 * Para MindFlow (layout horizontal)
 */
export const getNodeInputPoint = (node, nodeHeight = DEFAULT_NODE_HEIGHT) => {
  return {
    x: node.x,
    y: node.y + (node.height || nodeHeight) / 2
  };
};

/**
 * Calcula el punto de conexión de salida para organigrama (centro inferior)
 */
export const getNodeOutputPointOrgChart = (node, nodeWidth = DEFAULT_NODE_WIDTH, nodeHeight = DEFAULT_NODE_HEIGHT) => {
  return {
    x: node.x + (node.width || nodeWidth) / 2,
    y: node.y + (node.height || nodeHeight)
  };
};

/**
 * Calcula el punto de conexión de entrada para organigrama (centro superior)
 */
export const getNodeInputPointOrgChart = (node, nodeWidth = DEFAULT_NODE_WIDTH) => {
  return {
    x: node.x + (node.width || nodeWidth) / 2,
    y: node.y
  };
};

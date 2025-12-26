/**
 * Genera un path SVG de curva Bezier cúbica entre dos puntos
 * Para MindFlow (layout horizontal)
 * @param {number} startX - Coordenada X del punto de inicio
 * @param {number} startY - Coordenada Y del punto de inicio
 * @param {number} endX - Coordenada X del punto final
 * @param {number} endY - Coordenada Y del punto final
 * @returns {string} Path SVG
 */
export const generateBezierPath = (startX, startY, endX, endY) => {
  const controlPointOffset = Math.abs(endX - startX) * 0.5;
  
  const cp1X = startX + controlPointOffset;
  const cp1Y = startY;
  const cp2X = endX - controlPointOffset;
  const cp2Y = endY;

  return `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
};

/**
 * Genera un path SVG de conexión tipo organigrama (MindTree)
 * Línea vertical hacia abajo, luego horizontal hacia el hijo
 * Patrón: Padre → abajo → derecha → Hijo
 * @param {number} startX - Coordenada X del punto de inicio (centro inferior del padre)
 * @param {number} startY - Coordenada Y del punto de inicio
 * @param {number} endX - Coordenada X del punto final (lado izquierdo del hijo)
 * @param {number} endY - Coordenada Y del punto final
 * @returns {string} Path SVG
 */
export const generateOrgChartPath = (startX, startY, endX, endY) => {
  // Punto intermedio: bajar a la mitad del camino vertical, luego ir horizontal
  const midY = startY + (endY - startY) / 2;
  
  // Path: M(inicio) → L(abajo) → L(horizontal) → L(final)
  // Usar curvas suaves en las esquinas
  const cornerRadius = 8;
  
  // Si el hijo está directamente debajo (mismo X), línea recta
  if (Math.abs(startX - endX) < 10) {
    return `M ${startX} ${startY} L ${endX} ${endY}`;
  }
  
  // Path con esquinas redondeadas
  return `
    M ${startX} ${startY}
    L ${startX} ${midY - cornerRadius}
    Q ${startX} ${midY} ${startX + (endX > startX ? cornerRadius : -cornerRadius)} ${midY}
    L ${endX - (endX > startX ? cornerRadius : -cornerRadius)} ${midY}
    Q ${endX} ${midY} ${endX} ${midY + cornerRadius}
    L ${endX} ${endY}
  `.replace(/\s+/g, ' ').trim();
};

/**
 * Calcula el punto de conexión de salida de un nodo (lado derecho)
 * Para MindFlow (layout horizontal)
 * @param {Object} node - El nodo
 * @param {number} nodeWidth - Ancho del nodo
 * @param {number} nodeHeight - Alto del nodo
 * @returns {{ x: number, y: number }}
 */
export const getNodeOutputPoint = (node, nodeWidth = 160, nodeHeight = 64) => {
  return {
    x: node.x + nodeWidth,
    y: node.y + nodeHeight / 2
  };
};

/**
 * Calcula el punto de conexión de entrada de un nodo (lado izquierdo)
 * Para MindFlow (layout horizontal)
 * @param {Object} node - El nodo
 * @param {number} nodeHeight - Alto del nodo
 * @returns {{ x: number, y: number }}
 */
export const getNodeInputPoint = (node, nodeHeight = 64) => {
  return {
    x: node.x,
    y: node.y + nodeHeight / 2
  };
};

/**
 * Calcula el punto de conexión de salida para organigrama (centro inferior)
 * Para MindTree (layout vertical)
 * @param {Object} node - El nodo
 * @param {number} nodeWidth - Ancho del nodo
 * @param {number} nodeHeight - Alto del nodo
 * @returns {{ x: number, y: number }}
 */
export const getNodeOutputPointOrgChart = (node, nodeWidth = 160, nodeHeight = 64) => {
  return {
    x: node.x + nodeWidth / 2, // Centro horizontal
    y: node.y + nodeHeight     // Borde inferior
  };
};

/**
 * Calcula el punto de conexión de entrada para organigrama (lado izquierdo)
 * Para MindTree (layout vertical)
 * @param {Object} node - El nodo
 * @param {number} nodeHeight - Alto del nodo
 * @returns {{ x: number, y: number }}
 */
export const getNodeInputPointOrgChart = (node, nodeHeight = 64) => {
  return {
    x: node.x,                 // Lado izquierdo
    y: node.y + nodeHeight / 2 // Centro vertical
  };
};

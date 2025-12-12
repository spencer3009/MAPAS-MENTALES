/**
 * Genera un path SVG de curva Bezier cúbica entre dos puntos
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
 * Calcula el punto de conexión de salida de un nodo (lado derecho)
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

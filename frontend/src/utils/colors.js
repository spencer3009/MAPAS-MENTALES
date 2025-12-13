// Utilidades para colores y contraste

/**
 * Calcula la luminosidad relativa de un color
 * @param {string} hex - Color en formato hex (#RRGGBB)
 * @returns {number} Luminosidad (0-1)
 */
export const getLuminance = (hex) => {
  // Remover # si existe
  const cleanHex = hex.replace('#', '');
  
  // Convertir a RGB
  const r = parseInt(cleanHex.substr(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substr(2, 2), 16) / 255;
  const b = parseInt(cleanHex.substr(4, 2), 16) / 255;
  
  // Aplicar corrección gamma
  const R = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const G = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const B = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
  
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
};

/**
 * Determina si un color de fondo necesita texto claro u oscuro
 * @param {string} bgColor - Color de fondo en hex
 * @returns {string} '#ffffff' para fondos oscuros, '#1f2937' para fondos claros
 */
export const getContrastTextColor = (bgColor) => {
  if (!bgColor || bgColor === 'transparent') return '#1f2937';
  
  const luminance = getLuminance(bgColor);
  // Umbral de 0.5 para mejor contraste
  return luminance > 0.5 ? '#1f2937' : '#ffffff';
};

/**
 * Convierte color Tailwind a hex
 */
export const tailwindToHex = {
  // Colores del tema
  'sky-100': '#e0f2fe',
  'sky-200': '#bae6fd',
  'sky-300': '#7dd3fc',
  'sky-400': '#38bdf8',
  'sky-500': '#0ea5e9',
  'rose-100': '#ffe4e6',
  'rose-200': '#fecdd3',
  'rose-300': '#fda4af',
  'rose-400': '#fb7185',
  'rose-500': '#f43f5e',
  'emerald-100': '#d1fae5',
  'emerald-200': '#a7f3d0',
  'emerald-300': '#6ee7b7',
  'emerald-400': '#34d399',
  'emerald-500': '#10b981',
  'amber-100': '#fef3c7',
  'amber-200': '#fde68a',
  'amber-300': '#fcd34d',
  'amber-400': '#fbbf24',
  'amber-500': '#f59e0b',
  'gray-100': '#f3f4f6',
  'gray-200': '#e5e7eb',
  'gray-500': '#6b7280',
  'gray-700': '#374151',
  'gray-800': '#1f2937',
  'white': '#ffffff',
  'black': '#000000',
};

/**
 * Paleta de colores predefinidos para el selector
 */
export const COLOR_PALETTE = [
  // Fila 1 - Claros
  { name: 'Blanco', hex: '#ffffff' },
  { name: 'Gris Claro', hex: '#f3f4f6' },
  { name: 'Azul Claro', hex: '#e0f2fe' },
  { name: 'Verde Claro', hex: '#d1fae5' },
  { name: 'Rosa Claro', hex: '#ffe4e6' },
  { name: 'Amarillo Claro', hex: '#fef3c7' },
  // Fila 2 - Medios
  { name: 'Gris', hex: '#9ca3af' },
  { name: 'Azul', hex: '#38bdf8' },
  { name: 'Verde', hex: '#34d399' },
  { name: 'Rosa', hex: '#fb7185' },
  { name: 'Amarillo', hex: '#fbbf24' },
  { name: 'Naranja', hex: '#fb923c' },
  // Fila 3 - Oscuros
  { name: 'Gris Oscuro', hex: '#374151' },
  { name: 'Azul Oscuro', hex: '#1e40af' },
  { name: 'Verde Oscuro', hex: '#047857' },
  { name: 'Rojo', hex: '#dc2626' },
  { name: 'Púrpura', hex: '#7c3aed' },
  { name: 'Negro', hex: '#111827' },
];

/**
 * Formas disponibles para los nodos
 */
export const NODE_SHAPES = [
  { id: 'rectangle', name: 'Rectángulo', icon: '▭' },
  { id: 'rounded', name: 'Redondeado', icon: '▢' },
  { id: 'pill', name: 'Cápsula', icon: '⬭' },
  { id: 'circle', name: 'Círculo', icon: '●' },
  { id: 'diamond', name: 'Diamante', icon: '◇' },
  { id: 'line', name: 'Solo texto', icon: '—' },
];

/**
 * Estilos de borde disponibles
 */
export const BORDER_STYLES = [
  { id: 'solid', name: 'Continuo' },
  { id: 'dashed', name: 'Discontinuo' },
  { id: 'dotted', name: 'Punteado' },
];

/**
 * Grosores de borde disponibles
 */
export const BORDER_WIDTHS = [
  { id: 1, name: 'Fino' },
  { id: 2, name: 'Normal' },
  { id: 3, name: 'Grueso' },
  { id: 4, name: 'Extra grueso' },
];

/**
 * Estilos de línea de conexión
 */
export const LINE_STYLES = [
  { id: 'solid', name: 'Continua' },
  { id: 'dashed', name: 'Discontinua' },
  { id: 'dotted', name: 'Punteada' },
];

/**
 * Grosores de línea de conexión
 */
export const LINE_WIDTHS = [
  { id: 1, name: 'Fina' },
  { id: 2, name: 'Normal' },
  { id: 3, name: 'Gruesa' },
  { id: 4, name: 'Extra gruesa' },
];

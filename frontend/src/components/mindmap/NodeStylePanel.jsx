import React, { useState, useRef, useEffect } from 'react';
import { X, Square, Circle, Minus, Palette } from 'lucide-react';
import { 
  COLOR_PALETTE, 
  NODE_SHAPES, 
  BORDER_STYLES, 
  BORDER_WIDTHS,
  LINE_STYLES,
  LINE_WIDTHS,
  getContrastTextColor 
} from '../../utils/colors';

const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`
      flex-1 py-2.5 px-3 text-sm font-medium
      transition-all duration-200
      ${active 
        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' 
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      }
    `}
  >
    {children}
  </button>
);

const SectionTitle = ({ children }) => (
  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
    {children}
  </h4>
);

const ColorButton = ({ color, selected, onClick, size = 'normal' }) => {
  const sizeClasses = size === 'small' ? 'w-6 h-6' : 'w-8 h-8';
  const isWhite = color === '#ffffff';
  
  return (
    <button
      onClick={() => onClick(color)}
      className={`
        ${sizeClasses} rounded-lg transition-all duration-150
        hover:scale-110 active:scale-95
        ${isWhite ? 'border border-gray-300' : ''}
        ${selected ? 'ring-2 ring-offset-2 ring-blue-500' : ''}
      `}
      style={{ backgroundColor: color }}
      title={color}
    />
  );
};

const ShapeButton = ({ shape, selected, onClick }) => {
  // Renderizar el icono visual de cada forma
  const renderShapeIcon = (shapeId) => {
    const baseClass = "w-10 h-6 flex items-center justify-center";
    
    switch (shapeId) {
      case 'line':
        return (
          <div className={baseClass}>
            <div className="w-8 h-0.5 bg-current opacity-60 rounded" />
          </div>
        );
      case 'rectangle':
        return (
          <div className={baseClass}>
            <div className="w-8 h-5 bg-current opacity-30 rounded-none border border-current" />
          </div>
        );
      case 'rounded':
        return (
          <div className={baseClass}>
            <div className="w-8 h-5 bg-current opacity-30 rounded-lg border border-current" />
          </div>
        );
      case 'pill':
        return (
          <div className={baseClass}>
            <div className="w-8 h-5 bg-current opacity-30 rounded-full border border-current" />
          </div>
        );
      case 'cloud':
        return (
          <div className={baseClass}>
            <svg viewBox="0 0 40 24" className="w-8 h-5 opacity-60">
              <path 
                d="M8 20 Q2 20 2 14 Q2 10 6 9 Q6 4 12 4 Q18 4 20 8 Q22 4 28 4 Q34 4 34 10 Q38 11 38 16 Q38 20 32 20 Z"
                fill="currentColor"
                fillOpacity="0.3"
                stroke="currentColor"
                strokeWidth="1"
              />
            </svg>
          </div>
        );
      default:
        return (
          <div className={baseClass}>
            <div className="w-8 h-5 bg-current opacity-30 rounded-lg" />
          </div>
        );
    }
  };

  return (
    <button
      onClick={() => onClick(shape.id)}
      className={`
        p-2 rounded-lg transition-all duration-150
        flex flex-col items-center gap-1
        ${selected 
          ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500' 
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }
      `}
      title={shape.description || shape.name}
    >
      {renderShapeIcon(shape.id)}
      <span className="text-[10px] font-medium">{shape.name}</span>
    </button>
  );
};

// Pestaña de Forma y Color
const ShapeTab = ({ nodeStyle, onChange }) => {
  const [customColor, setCustomColor] = useState(nodeStyle.bgColor || '#e0f2fe');

  const handleColorChange = (color) => {
    const textColor = getContrastTextColor(color);
    onChange({ bgColor: color, textColor });
  };

  const handleCustomColorChange = (e) => {
    const color = e.target.value;
    setCustomColor(color);
    handleColorChange(color);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Formas */}
      <div>
        <SectionTitle>Forma del nodo</SectionTitle>
        <div className="grid grid-cols-5 gap-2">
          {NODE_SHAPES.map(shape => (
            <ShapeButton
              key={shape.id}
              shape={shape}
              selected={nodeStyle.shape === shape.id}
              onClick={(id) => onChange({ shape: id })}
            />
          ))}
        </div>
      </div>

      {/* Colores del tema */}
      <div>
        <SectionTitle>Color de fondo</SectionTitle>
        <div className="grid grid-cols-6 gap-2">
          {COLOR_PALETTE.map((color, idx) => (
            <ColorButton
              key={idx}
              color={color.hex}
              selected={nodeStyle.bgColor === color.hex}
              onClick={handleColorChange}
            />
          ))}
        </div>
      </div>

      {/* Color personalizado */}
      <div>
        <SectionTitle>Color personalizado</SectionTitle>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={customColor}
            onChange={handleCustomColorChange}
            className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
          />
          <input
            type="text"
            value={customColor}
            onChange={(e) => {
              if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                setCustomColor(e.target.value);
                handleColorChange(e.target.value);
              } else {
                setCustomColor(e.target.value);
              }
            }}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg"
            placeholder="#000000"
          />
        </div>
      </div>

      {/* Preview de contraste */}
      <div className="p-3 rounded-lg border border-gray-200">
        <div 
          className="p-3 rounded-lg text-center text-sm font-medium"
          style={{ 
            backgroundColor: nodeStyle.bgColor || '#e0f2fe',
            color: nodeStyle.textColor || '#1f2937'
          }}
        >
          Vista previa del texto
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Contraste automático aplicado
        </p>
      </div>
    </div>
  );
};

// Pestaña de Borde
const BorderTab = ({ nodeStyle, onChange }) => {
  return (
    <div className="p-4 space-y-4">
      {/* Color del borde */}
      <div>
        <SectionTitle>Color del borde</SectionTitle>
        <div className="grid grid-cols-6 gap-2">
          {COLOR_PALETTE.slice(0, 12).map((color, idx) => (
            <ColorButton
              key={idx}
              color={color.hex}
              size="small"
              selected={nodeStyle.borderColor === color.hex}
              onClick={(color) => onChange({ borderColor: color })}
            />
          ))}
        </div>
      </div>

      {/* Grosor del borde */}
      <div>
        <SectionTitle>Grosor del borde</SectionTitle>
        <div className="flex gap-2">
          {BORDER_WIDTHS.map(width => (
            <button
              key={width.id}
              onClick={() => onChange({ borderWidth: width.id })}
              className={`
                flex-1 py-2 px-3 rounded-lg text-xs font-medium
                transition-all duration-150
                ${nodeStyle.borderWidth === width.id
                  ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {width.name}
            </button>
          ))}
        </div>
      </div>

      {/* Estilo del borde */}
      <div>
        <SectionTitle>Estilo del borde</SectionTitle>
        <div className="flex gap-2">
          {BORDER_STYLES.map(style => (
            <button
              key={style.id}
              onClick={() => onChange({ borderStyle: style.id })}
              className={`
                flex-1 py-2 px-3 rounded-lg text-xs font-medium
                transition-all duration-150 flex items-center justify-center gap-2
                ${nodeStyle.borderStyle === style.id
                  ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              <span 
                className="w-8 h-0 border-t-2"
                style={{ borderStyle: style.id, borderColor: 'currentColor' }}
              />
              {style.name}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="p-3 rounded-lg border border-gray-200">
        <div 
          className="p-4 rounded-lg text-center text-sm"
          style={{ 
            backgroundColor: nodeStyle.bgColor || '#e0f2fe',
            borderWidth: `${nodeStyle.borderWidth || 2}px`,
            borderStyle: nodeStyle.borderStyle || 'solid',
            borderColor: nodeStyle.borderColor || '#7dd3fc',
            color: nodeStyle.textColor || '#1f2937'
          }}
        >
          Vista previa
        </div>
      </div>
    </div>
  );
};

// Pestaña de Línea
const LineTab = ({ nodeStyle, onChange }) => {
  return (
    <div className="p-4 space-y-4">
      {/* Color de la línea */}
      <div>
        <SectionTitle>Color de la línea</SectionTitle>
        <div className="grid grid-cols-6 gap-2">
          {COLOR_PALETTE.slice(0, 12).map((color, idx) => (
            <ColorButton
              key={idx}
              color={color.hex}
              size="small"
              selected={nodeStyle.lineColor === color.hex}
              onClick={(color) => onChange({ lineColor: color })}
            />
          ))}
        </div>
      </div>

      {/* Grosor de la línea */}
      <div>
        <SectionTitle>Grosor de la línea</SectionTitle>
        <div className="flex gap-2">
          {LINE_WIDTHS.map(width => (
            <button
              key={width.id}
              onClick={() => onChange({ lineWidth: width.id })}
              className={`
                flex-1 py-2 px-3 rounded-lg text-xs font-medium
                transition-all duration-150
                ${nodeStyle.lineWidth === width.id
                  ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {width.name}
            </button>
          ))}
        </div>
      </div>

      {/* Estilo de la línea */}
      <div>
        <SectionTitle>Estilo de la línea</SectionTitle>
        <div className="flex gap-2">
          {LINE_STYLES.map(style => (
            <button
              key={style.id}
              onClick={() => onChange({ lineStyle: style.id })}
              className={`
                flex-1 py-2 px-3 rounded-lg text-xs font-medium
                transition-all duration-150 flex items-center justify-center gap-2
                ${nodeStyle.lineStyle === style.id
                  ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              <svg width="24" height="2" className="overflow-visible">
                <line 
                  x1="0" y1="1" x2="24" y2="1" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  strokeDasharray={style.id === 'dashed' ? '4,2' : style.id === 'dotted' ? '1,2' : 'none'}
                />
              </svg>
              {style.name}
            </button>
          ))}
        </div>
      </div>

      {/* Toggle mostrar como límite */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div>
          <p className="text-sm font-medium text-gray-700">Mostrar como límite</p>
          <p className="text-xs text-gray-500">La línea actúa como delimitador visual</p>
        </div>
        <button
          onClick={() => onChange({ showAsBoundary: !nodeStyle.showAsBoundary })}
          className={`
            w-12 h-6 rounded-full transition-all duration-200
            ${nodeStyle.showAsBoundary ? 'bg-blue-500' : 'bg-gray-300'}
          `}
        >
          <div 
            className={`
              w-5 h-5 bg-white rounded-full shadow-sm
              transition-transform duration-200
              ${nodeStyle.showAsBoundary ? 'translate-x-6' : 'translate-x-0.5'}
            `}
          />
        </button>
      </div>

      {/* Preview de línea */}
      <div className="p-3 rounded-lg border border-gray-200">
        <svg width="100%" height="40" className="overflow-visible">
          <line 
            x1="20" y1="20" x2="calc(100% - 20px)" y2="20"
            stroke={nodeStyle.lineColor || '#94a3b8'}
            strokeWidth={nodeStyle.lineWidth || 2}
            strokeDasharray={
              nodeStyle.lineStyle === 'dashed' ? '8,4' : 
              nodeStyle.lineStyle === 'dotted' ? '2,4' : 'none'
            }
          />
        </svg>
        <p className="text-xs text-gray-500 text-center">Vista previa de la línea</p>
      </div>
    </div>
  );
};

// Componente principal del panel
const NodeStylePanel = ({
  isOpen,
  position,
  nodeStyle,
  onStyleChange,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState('shape');
  const panelRef = useRef(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };

    if (isOpen) {
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  // Cerrar con ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="
        absolute z-50
        w-80 bg-white rounded-2xl shadow-2xl
        border border-gray-200
        overflow-hidden
        animate-in fade-in zoom-in-95 duration-200
      "
      style={{
        left: position.x,
        top: position.y,
        transform: 'translateX(-50%)'
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <Palette size={18} className="text-gray-600" />
          <span className="text-sm font-semibold text-gray-700">Estilo del nodo</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <X size={16} className="text-gray-500" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <TabButton active={activeTab === 'shape'} onClick={() => setActiveTab('shape')}>
          Forma
        </TabButton>
        <TabButton active={activeTab === 'border'} onClick={() => setActiveTab('border')}>
          Borde
        </TabButton>
        <TabButton active={activeTab === 'line'} onClick={() => setActiveTab('line')}>
          Línea
        </TabButton>
      </div>

      {/* Tab Content */}
      <div className="max-h-[400px] overflow-y-auto">
        {activeTab === 'shape' && (
          <ShapeTab nodeStyle={nodeStyle} onChange={onStyleChange} />
        )}
        {activeTab === 'border' && (
          <BorderTab nodeStyle={nodeStyle} onChange={onStyleChange} />
        )}
        {activeTab === 'line' && (
          <LineTab nodeStyle={nodeStyle} onChange={onStyleChange} />
        )}
      </div>
    </div>
  );
};

export default NodeStylePanel;

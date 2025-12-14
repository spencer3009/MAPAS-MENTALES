import React, { useState, useEffect } from 'react';
import { X, Palette, Square, Circle, Minus, Sparkles } from 'lucide-react';
import { 
  COLOR_PALETTE, 
  NODE_SHAPES, 
  BORDER_STYLES, 
  BORDER_WIDTHS,
  LINE_STYLES,
  LINE_WIDTHS,
  getContrastTextColor 
} from '../../utils/colors';

// ==========================================
// COMPONENTES REUTILIZABLES
// ==========================================

const SectionTitle = ({ children }) => (
  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
    {children}
  </h4>
);

const ColorButton = ({ color, selected, onClick, size = 'normal' }) => {
  const sizeClasses = size === 'small' ? 'w-7 h-7' : 'w-9 h-9';
  const isWhite = color === '#ffffff';
  
  return (
    <button
      onClick={() => onClick(color)}
      className={`
        ${sizeClasses} rounded-lg transition-all duration-150
        hover:scale-110 active:scale-95
        ${isWhite ? 'border border-gray-300' : ''}
        ${selected ? 'ring-2 ring-offset-2 ring-blue-500 scale-105' : 'hover:ring-2 hover:ring-offset-1 hover:ring-gray-300'}
      `}
      style={{ backgroundColor: color }}
      title={color}
    />
  );
};

const ShapeButton = ({ shape, selected, onClick }) => {
  const renderShapeIcon = (shapeId) => {
    const baseClass = "w-full h-7 flex items-center justify-center";
    
    switch (shapeId) {
      case 'line':
        return (
          <div className={baseClass}>
            <div className="w-10 h-0.5 bg-current opacity-60 rounded" />
          </div>
        );
      case 'rectangle':
        return (
          <div className={baseClass}>
            <div className="w-10 h-6 bg-current opacity-30 rounded-none border-2 border-current" />
          </div>
        );
      case 'rounded':
        return (
          <div className={baseClass}>
            <div className="w-10 h-6 bg-current opacity-30 rounded-lg border-2 border-current" />
          </div>
        );
      case 'pill':
        return (
          <div className={baseClass}>
            <div className="w-10 h-6 bg-current opacity-30 rounded-full border-2 border-current" />
          </div>
        );
      case 'cloud':
        return (
          <div className={baseClass}>
            <svg viewBox="0 0 44 28" className="w-10 h-6 opacity-60">
              <path 
                d="M8 22 Q2 22 2 16 Q2 12 6 11 Q6 5 13 5 Q19 5 21 9 Q23 5 30 5 Q36 5 36 12 Q40 13 40 18 Q40 22 34 22 Z"
                fill="currentColor"
                fillOpacity="0.3"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </div>
        );
      default:
        return (
          <div className={baseClass}>
            <div className="w-10 h-6 bg-current opacity-30 rounded-lg" />
          </div>
        );
    }
  };

  return (
    <button
      onClick={() => onClick(shape.id)}
      className={`
        p-2 rounded-xl transition-all duration-150
        flex flex-col items-center gap-1.5 w-full
        ${selected 
          ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500 shadow-sm' 
          : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-800'
        }
      `}
      title={shape.description || shape.name}
    >
      {renderShapeIcon(shape.id)}
      <span className="text-[10px] font-medium">{shape.name}</span>
    </button>
  );
};

const OptionButton = ({ selected, onClick, children }) => (
  <button
    onClick={onClick}
    className={`
      flex-1 py-2.5 px-3 rounded-lg text-xs font-medium
      transition-all duration-150
      ${selected
        ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500 shadow-sm'
        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
      }
    `}
  >
    {children}
  </button>
);

const LineStyleButton = ({ style, selected, onClick }) => (
  <button
    onClick={() => onClick(style.id)}
    className={`
      flex-1 py-2.5 px-3 rounded-lg text-xs font-medium
      transition-all duration-150 flex items-center justify-center gap-2
      ${selected
        ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500 shadow-sm'
        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
      }
    `}
  >
    <span 
      className="w-6 h-0 border-t-2"
      style={{ borderStyle: style.id, borderColor: 'currentColor' }}
    />
    <span className="hidden sm:inline">{style.name}</span>
  </button>
);

// ==========================================
// SECCIONES DEL PANEL
// ==========================================

const ShapeSection = ({ nodeStyle, onChange }) => (
  <div className="space-y-3">
    <SectionTitle>
      <Square size={14} />
      Forma del nodo
    </SectionTitle>
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
);

const BackgroundColorSection = ({ nodeStyle, onChange }) => {
  const [customColor, setCustomColor] = useState(nodeStyle.bgColor || '#e0f2fe');

  useEffect(() => {
    setCustomColor(nodeStyle.bgColor || '#e0f2fe');
  }, [nodeStyle.bgColor]);

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
    <div className="space-y-3">
      <SectionTitle>
        <Palette size={14} />
        Color de fondo
      </SectionTitle>
      
      {/* Colores predefinidos */}
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

      {/* Color personalizado */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
        <div className="relative">
          <input
            type="color"
            value={customColor}
            onChange={handleCustomColorChange}
            className="w-10 h-10 rounded-lg cursor-pointer border-2 border-gray-200 p-0 appearance-none"
            style={{ backgroundColor: customColor }}
          />
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-gray-500 uppercase tracking-wide">HEX</label>
          <input
            type="text"
            value={customColor}
            onChange={(e) => {
              const value = e.target.value;
              setCustomColor(value);
              if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                handleColorChange(value);
              }
            }}
            className="w-full px-2 py-1.5 text-xs font-mono border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="#e0f2fe"
            maxLength={7}
          />
        </div>
      </div>

      {/* Preview */}
      <div 
        className="p-3 rounded-xl text-center text-sm font-medium border border-gray-200"
        style={{ 
          backgroundColor: nodeStyle.bgColor || '#e0f2fe',
          color: nodeStyle.textColor || '#1f2937'
        }}
      >
        Vista previa
      </div>
    </div>
  );
};

const BorderSection = ({ nodeStyle, onChange }) => (
  <div className="space-y-4">
    <SectionTitle>
      <Square size={14} className="opacity-50" />
      Borde
    </SectionTitle>

    {/* Color del borde */}
    <div>
      <p className="text-[11px] text-gray-500 mb-2">Color</p>
      <div className="grid grid-cols-8 gap-1.5">
        {COLOR_PALETTE.slice(0, 16).map((color, idx) => (
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

    {/* Grosor */}
    <div>
      <p className="text-[11px] text-gray-500 mb-2">Grosor</p>
      <div className="flex gap-2">
        {BORDER_WIDTHS.map(width => (
          <OptionButton
            key={width.id}
            selected={nodeStyle.borderWidth === width.id}
            onClick={() => onChange({ borderWidth: width.id })}
          >
            {width.name}
          </OptionButton>
        ))}
      </div>
    </div>

    {/* Estilo */}
    <div>
      <p className="text-[11px] text-gray-500 mb-2">Estilo</p>
      <div className="flex gap-2">
        {BORDER_STYLES.map(style => (
          <LineStyleButton
            key={style.id}
            style={style}
            selected={nodeStyle.borderStyle === style.id}
            onClick={(id) => onChange({ borderStyle: id })}
          />
        ))}
      </div>
    </div>

    {/* Preview */}
    <div 
      className="p-4 rounded-xl text-center text-sm bg-white"
      style={{ 
        borderWidth: `${nodeStyle.borderWidth || 2}px`,
        borderStyle: nodeStyle.borderStyle || 'solid',
        borderColor: nodeStyle.borderColor || '#7dd3fc',
      }}
    >
      Vista previa
    </div>
  </div>
);

const LineSection = ({ nodeStyle, onChange }) => (
  <div className="space-y-4">
    <SectionTitle>
      <Minus size={14} />
      Línea de conexión
    </SectionTitle>

    {/* Color de la línea */}
    <div>
      <p className="text-[11px] text-gray-500 mb-2">Color</p>
      <div className="grid grid-cols-8 gap-1.5">
        {COLOR_PALETTE.slice(0, 16).map((color, idx) => (
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

    {/* Grosor */}
    <div>
      <p className="text-[11px] text-gray-500 mb-2">Grosor</p>
      <div className="flex gap-2">
        {LINE_WIDTHS.map(width => (
          <OptionButton
            key={width.id}
            selected={nodeStyle.lineWidth === width.id}
            onClick={() => onChange({ lineWidth: width.id })}
          >
            {width.name}
          </OptionButton>
        ))}
      </div>
    </div>

    {/* Estilo */}
    <div>
      <p className="text-[11px] text-gray-500 mb-2">Estilo</p>
      <div className="flex gap-2">
        {LINE_STYLES.map(style => (
          <LineStyleButton
            key={style.id}
            style={style}
            selected={nodeStyle.lineStyle === style.id}
            onClick={(id) => onChange({ lineStyle: id })}
          />
        ))}
      </div>
    </div>

    {/* Preview */}
    <div className="p-3 rounded-xl border border-gray-200 bg-white">
      <svg width="100%" height="24" className="overflow-visible">
        <line 
          x1="10" y1="12" x2="calc(100% - 10px)" y2="12"
          stroke={nodeStyle.lineColor || '#94a3b8'}
          strokeWidth={nodeStyle.lineWidth || 2}
          strokeDasharray={
            nodeStyle.lineStyle === 'dashed' ? '8,4' : 
            nodeStyle.lineStyle === 'dotted' ? '2,4' : 'none'
          }
        />
      </svg>
    </div>
  </div>
);

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

const RightStyleSidebar = ({
  isOpen,
  selectedNode,
  onStyleChange,
  onClose
}) => {
  // Si no hay nodo seleccionado, mostrar estado vacío
  if (!isOpen) return null;

  const nodeStyle = {
    shape: selectedNode?.shape || 'rounded',
    bgColor: selectedNode?.bgColor || '#e0f2fe',
    textColor: selectedNode?.textColor || '#1f2937',
    borderColor: selectedNode?.borderColor || '#7dd3fc',
    borderWidth: selectedNode?.borderWidth || 2,
    borderStyle: selectedNode?.borderStyle || 'solid',
    lineColor: selectedNode?.lineColor || '#94a3b8',
    lineWidth: selectedNode?.lineWidth || 2,
    lineStyle: selectedNode?.lineStyle || 'solid',
  };

  const handleChange = (updates) => {
    if (selectedNode && onStyleChange) {
      onStyleChange(selectedNode.id, updates);
    }
  };

  return (
    <div className="w-80 h-full bg-white border-l border-gray-200 flex flex-col shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 rounded-lg">
            <Sparkles size={16} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Estilo del nodo</h3>
            <p className="text-[10px] text-gray-500 truncate max-w-[180px]">
              {selectedNode ? `"${selectedNode.text || 'Sin texto'}"` : 'Ningún nodo seleccionado'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          title="Cerrar panel"
        >
          <X size={18} className="text-gray-500" />
        </button>
      </div>

      {/* Contenido scrollable */}
      {selectedNode ? (
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Forma */}
            <ShapeSection nodeStyle={nodeStyle} onChange={handleChange} />
            
            <hr className="border-gray-100" />
            
            {/* Color de fondo */}
            <BackgroundColorSection nodeStyle={nodeStyle} onChange={handleChange} />
            
            <hr className="border-gray-100" />
            
            {/* Borde */}
            <BorderSection nodeStyle={nodeStyle} onChange={handleChange} />
            
            <hr className="border-gray-100" />
            
            {/* Línea */}
            <LineSection nodeStyle={nodeStyle} onChange={handleChange} />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <Palette size={28} className="text-gray-400" />
          </div>
          <h4 className="text-sm font-medium text-gray-700 mb-1">
            Ningún nodo seleccionado
          </h4>
          <p className="text-xs text-gray-500 max-w-[200px]">
            Selecciona un nodo en el canvas para editar su estilo y apariencia
          </p>
        </div>
      )}

      {/* Footer con tips */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 shrink-0">
        <p className="text-[10px] text-gray-400 text-center">
          💡 Los cambios se aplican automáticamente
        </p>
      </div>
    </div>
  );
};

export default RightStyleSidebar;

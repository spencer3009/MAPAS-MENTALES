import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

// ==========================================
// LIBRERÍA DE ICONOS POR CATEGORÍA
// ==========================================

const ICON_CATEGORIES = {
  'Acciones Rápidas': {
    description: 'Iconos de uso frecuente',
    icons: ['Check', 'X', 'Plus', 'Minus', 'AlertCircle', 'Info', 'HelpCircle', 'Star', 'Heart', 'Flag']
  },
  'General': {
    description: 'Iconos de propósito general',
    icons: ['Home', 'Search', 'Settings', 'Menu', 'MoreHorizontal', 'MoreVertical', 'Grid', 'List', 'Filter', 'SortAsc', 'SortDesc', 'Maximize', 'Minimize', 'Eye', 'EyeOff', 'Lock', 'Unlock', 'Key', 'Shield', 'Bell', 'BellOff', 'Clock', 'Calendar', 'CalendarDays', 'Timer', 'Hourglass', 'Bookmark', 'Tag', 'Tags', 'Hash', 'AtSign']
  },
  'Negocios': {
    description: 'Oficina, trabajo y empresa',
    icons: ['Briefcase', 'Building', 'Building2', 'Factory', 'Landmark', 'Store', 'ShoppingBag', 'ShoppingCart', 'CreditCard', 'Wallet', 'Receipt', 'FileText', 'Files', 'Folder', 'FolderOpen', 'Archive', 'Box', 'Package', 'Truck', 'ClipboardList', 'ClipboardCheck', 'PenTool', 'Stamp', 'Award', 'Medal', 'Trophy', 'Target', 'Goal', 'Milestone', 'Presentation']
  },
  'Tecnología': {
    description: 'Tecnología y dispositivos',
    icons: ['Laptop', 'Monitor', 'Smartphone', 'Tablet', 'Watch', 'Tv', 'Speaker', 'Headphones', 'Mic', 'Camera', 'Video', 'Wifi', 'WifiOff', 'Bluetooth', 'Battery', 'BatteryCharging', 'Plug', 'Power', 'Cpu', 'HardDrive', 'Server', 'Database', 'Cloud', 'CloudDownload', 'CloudUpload', 'Download', 'Upload', 'Link', 'Unlink', 'QrCode', 'Scan', 'Terminal', 'Code', 'Code2', 'Bug', 'Wrench', 'Settings2', 'Cog']
  },
  'Educación': {
    description: 'Aprendizaje y academia',
    icons: ['GraduationCap', 'BookOpen', 'Book', 'Library', 'Newspaper', 'ScrollText', 'NotebookPen', 'Pencil', 'PenLine', 'Highlighter', 'Eraser', 'Ruler', 'Calculator', 'Binary', 'Sigma', 'Pi', 'Percent', 'Hash', 'FlaskConical', 'Microscope', 'Atom', 'Dna', 'Brain', 'Lightbulb', 'Puzzle', 'Languages', 'Globe', 'Globe2', 'Map', 'MapPin']
  },
  'Creatividad': {
    description: 'Arte, diseño y creatividad',
    icons: ['Palette', 'Paintbrush', 'Brush', 'PaintBucket', 'Pipette', 'Pencil', 'PenTool', 'Shapes', 'Square', 'Circle', 'Triangle', 'Hexagon', 'Pentagon', 'Octagon', 'Diamond', 'Sparkles', 'Wand2', 'Magic', 'Gem', 'Crown', 'Flower', 'Flower2', 'Leaf', 'TreeDeciduous', 'Music', 'Music2', 'Music3', 'Music4', 'Film', 'Clapperboard', 'ImageIcon', 'Images', 'Camera', 'Aperture', 'Focus']
  },
  'Finanzas': {
    description: 'Dinero y economía',
    icons: ['DollarSign', 'Euro', 'PoundSterling', 'Coins', 'Banknote', 'Wallet', 'CreditCard', 'Receipt', 'PiggyBank', 'Vault', 'TrendingUp', 'TrendingDown', 'LineChart', 'BarChart', 'BarChart2', 'BarChart3', 'BarChart4', 'PieChart', 'Activity', 'CircleDollarSign', 'BadgeDollarSign', 'Calculator', 'Scale', 'Percent', 'ArrowUpRight', 'ArrowDownRight']
  },
  'Marketing': {
    description: 'Marketing y comunicación',
    icons: ['Megaphone', 'Radio', 'Podcast', 'Rss', 'Share', 'Share2', 'Send', 'Mail', 'MailOpen', 'Inbox', 'MessageCircle', 'MessageSquare', 'MessagesSquare', 'AtSign', 'Hash', 'ThumbsUp', 'ThumbsDown', 'Heart', 'HeartHandshake', 'Handshake', 'Users', 'UserPlus', 'Target', 'Crosshair', 'Zap', 'Rocket', 'TrendingUp', 'Award', 'BadgeCheck', 'Verified']
  },
  'Personas': {
    description: 'Usuarios y perfiles',
    icons: ['User', 'UserCircle', 'UserSquare', 'Users', 'Users2', 'UserPlus', 'UserMinus', 'UserX', 'UserCheck', 'UserCog', 'Contact', 'Contact2', 'PersonStanding', 'Baby', 'Accessibility', 'Hand', 'HandMetal', 'Grip', 'Footprints', 'Smile', 'Frown', 'Meh', 'Angry', 'Laugh', 'SmilePlus', 'Ghost', 'Skull', 'Bot', 'Glasses']
  },
  'Objetos': {
    description: 'Objetos cotidianos',
    icons: ['Home', 'Bed', 'Sofa', 'Lamp', 'LampDesk', 'DoorOpen', 'DoorClosed', 'Key', 'Scissors', 'Paperclip', 'Pin', 'Hammer', 'Wrench', 'Screwdriver', 'Axe', 'Shovel', 'Umbrella', 'Glasses', 'Watch', 'Compass', 'Magnet', 'Flashlight', 'Lightbulb', 'Fan', 'Thermometer', 'Droplet', 'Flame', 'Snowflake', 'Sun', 'Moon', 'CloudSun', 'CloudMoon', 'Wind', 'Zap']
  },
  'Símbolos': {
    description: 'Símbolos y estados',
    icons: ['Check', 'CheckCircle', 'CheckCircle2', 'CheckSquare', 'X', 'XCircle', 'XSquare', 'AlertTriangle', 'AlertCircle', 'AlertOctagon', 'Info', 'HelpCircle', 'Ban', 'CircleSlash', 'ShieldAlert', 'ShieldCheck', 'ShieldX', 'Verified', 'BadgeCheck', 'BadgeX', 'BadgeAlert', 'BadgeInfo', 'Circle', 'CircleDot', 'Disc', 'Square', 'SquareDot', 'Star', 'StarHalf', 'Heart', 'HeartCrack', 'Flag', 'FlagOff', 'Bookmark', 'BookmarkX']
  },
  'Flechas': {
    description: 'Flechas e indicadores',
    icons: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUpRight', 'ArrowUpLeft', 'ArrowDownRight', 'ArrowDownLeft', 'ArrowBigUp', 'ArrowBigDown', 'ArrowBigLeft', 'ArrowBigRight', 'ChevronUp', 'ChevronDown', 'ChevronLeft', 'ChevronRight', 'ChevronsUp', 'ChevronsDown', 'ChevronsLeft', 'ChevronsRight', 'CornerDownLeft', 'CornerDownRight', 'CornerUpLeft', 'CornerUpRight', 'MoveUp', 'MoveDown', 'MoveLeft', 'MoveRight', 'Undo', 'Redo', 'RotateCw', 'RotateCcw', 'RefreshCw', 'RefreshCcw', 'Repeat', 'Shuffle', 'ArrowLeftRight', 'ArrowUpDown', 'Maximize2', 'Minimize2', 'Expand', 'Shrink']
  }
};

// Colores disponibles para iconos
const ICON_COLORS = [
  { id: 'gray', color: '#6b7280', name: 'Gris' },
  { id: 'black', color: '#1f2937', name: 'Negro' },
  { id: 'red', color: '#ef4444', name: 'Rojo' },
  { id: 'orange', color: '#f97316', name: 'Naranja' },
  { id: 'amber', color: '#f59e0b', name: 'Ámbar' },
  { id: 'yellow', color: '#eab308', name: 'Amarillo' },
  { id: 'lime', color: '#84cc16', name: 'Lima' },
  { id: 'green', color: '#22c55e', name: 'Verde' },
  { id: 'emerald', color: '#10b981', name: 'Esmeralda' },
  { id: 'teal', color: '#14b8a6', name: 'Turquesa' },
  { id: 'cyan', color: '#06b6d4', name: 'Cian' },
  { id: 'sky', color: '#0ea5e9', name: 'Cielo' },
  { id: 'blue', color: '#3b82f6', name: 'Azul' },
  { id: 'indigo', color: '#6366f1', name: 'Índigo' },
  { id: 'violet', color: '#8b5cf6', name: 'Violeta' },
  { id: 'purple', color: '#a855f7', name: 'Púrpura' },
  { id: 'fuchsia', color: '#d946ef', name: 'Fucsia' },
  { id: 'pink', color: '#ec4899', name: 'Rosa' },
  { id: 'rose', color: '#f43f5e', name: 'Rosado' },
];

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

const IconPickerPanel = ({
  isOpen,
  position,
  onSelectIcon,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Acciones Rápidas');
  const [selectedColor, setSelectedColor] = useState('#6b7280');
  const panelRef = useRef(null);
  const searchInputRef = useRef(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        // Ignorar si el clic es en el toolbar
        const toolbar = document.querySelector('.absolute.z-40.bg-white.rounded-xl.shadow-xl');
        if (toolbar && toolbar.contains(e.target)) return;
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Filtrar iconos por búsqueda
  const filteredIcons = useMemo(() => {
    if (!searchTerm.trim()) {
      return ICON_CATEGORIES[selectedCategory]?.icons || [];
    }

    const term = searchTerm.toLowerCase();
    const allIcons = [];
    
    Object.values(ICON_CATEGORIES).forEach(category => {
      category.icons.forEach(iconName => {
        if (iconName.toLowerCase().includes(term) && !allIcons.includes(iconName)) {
          allIcons.push(iconName);
        }
      });
    });

    return allIcons;
  }, [searchTerm, selectedCategory]);

  // Renderizar icono dinámicamente
  const renderIcon = (iconName, size = 20, color = selectedColor) => {
    const IconComponent = LucideIcons[iconName];
    if (!IconComponent) return null;
    return <IconComponent size={size} color={color} />;
  };

  const handleSelectIcon = (iconName) => {
    onSelectIcon({
      name: iconName,
      color: selectedColor
    });
  };

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="
        absolute z-50
        bg-white rounded-2xl shadow-2xl
        border border-gray-200
        overflow-hidden
        animate-in fade-in zoom-in-95 duration-200
      "
      style={{
        left: position.x,
        top: position.y,
        transform: 'translateX(-50%)',
        width: '480px',
        maxHeight: '500px'
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
        <h3 className="font-semibold text-gray-900">Seleccionar Icono</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="p-3 border-b border-gray-100">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar icono..."
            className="
              w-full pl-10 pr-4 py-2.5 rounded-xl
              bg-gray-100 border-0
              focus:bg-white focus:ring-2 focus:ring-blue-500
              outline-none transition-all
              text-sm text-gray-900 placeholder:text-gray-400
            "
          />
        </div>
      </div>

      {/* Selector de color */}
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-xs font-medium text-gray-500 mb-2">Color del icono</p>
        <div className="flex flex-wrap gap-1.5">
          {ICON_COLORS.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedColor(c.color)}
              className={`
                w-6 h-6 rounded-full transition-transform
                ${selectedColor === c.color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-110'}
              `}
              style={{ backgroundColor: c.color }}
              title={c.name}
            />
          ))}
        </div>
      </div>

      {/* Categorías */}
      {!searchTerm && (
        <div className="flex gap-1 p-2 border-b border-gray-100 overflow-x-auto scrollbar-thin">
          {Object.keys(ICON_CATEGORIES).map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap
                transition-all duration-150
                ${selectedCategory === category
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {/* Grid de iconos */}
      <div className="p-3 overflow-y-auto" style={{ maxHeight: '280px' }}>
        {searchTerm && (
          <p className="text-xs text-gray-500 mb-2">
            {filteredIcons.length} resultado{filteredIcons.length !== 1 ? 's' : ''} para "{searchTerm}"
          </p>
        )}
        
        {filteredIcons.length > 0 ? (
          <div className="grid grid-cols-8 gap-1">
            {filteredIcons.map((iconName) => (
              <button
                key={iconName}
                onClick={() => handleSelectIcon(iconName)}
                className="
                  p-2.5 rounded-lg
                  hover:bg-blue-50 hover:text-blue-600
                  transition-all duration-150
                  flex items-center justify-center
                  group relative
                "
                title={iconName}
              >
                {renderIcon(iconName, 22, selectedColor)}
                <span className="
                  absolute -bottom-8 left-1/2 -translate-x-1/2
                  px-2 py-1 rounded bg-gray-900 text-white text-xs
                  opacity-0 group-hover:opacity-100
                  transition-opacity duration-150
                  whitespace-nowrap z-10
                  pointer-events-none
                ">
                  {iconName}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Search size={40} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No se encontraron iconos</p>
          </div>
        )}
      </div>

      {/* Footer con vista previa */}
      <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Vista previa:</span>
          <span className="p-2 bg-white rounded-lg border border-gray-200">
            {renderIcon('Check', 18, selectedColor)}
          </span>
        </div>
        <p className="text-xs text-gray-400">
          {Object.values(ICON_CATEGORIES).reduce((acc, cat) => acc + cat.icons.length, 0)}+ iconos disponibles
        </p>
      </div>
    </div>
  );
};

export default IconPickerPanel;

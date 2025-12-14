import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

// ==========================================
// LIBRERÍA DE ICONOS POR CATEGORÍA (AMPLIADA)
// ==========================================

const ICON_CATEGORIES = {
  'Acciones Rápidas': {
    description: 'Estados e iconos de uso frecuente',
    icons: [
      'Check', 'CheckCircle', 'CheckCircle2', 'CheckSquare',
      'X', 'XCircle', 'XSquare',
      'Plus', 'Minus', 'AlertCircle', 'AlertTriangle', 'Info', 'HelpCircle', 
      'Star', 'StarHalf', 'Heart', 'Flag', 'Bookmark', 'ThumbsUp', 'ThumbsDown'
    ]
  },
  'General': {
    description: 'Iconos de propósito general',
    icons: [
      'Home', 'Search', 'Settings', 'Menu', 'MoreHorizontal', 'MoreVertical', 
      'Grid', 'Grid3x3', 'List', 'ListOrdered', 'Filter', 'SortAsc', 'SortDesc', 
      'Maximize', 'Maximize2', 'Minimize', 'Minimize2', 'Eye', 'EyeOff', 
      'Lock', 'LockOpen', 'Unlock', 'Key', 'KeyRound', 'Shield', 'ShieldCheck', 'ShieldAlert',
      'Bell', 'BellRing', 'BellOff', 'Clock', 'Clock1', 'Clock12', 'AlarmClock',
      'Calendar', 'CalendarDays', 'CalendarCheck', 'CalendarX', 'Timer', 'TimerOff', 
      'Hourglass', 'Bookmark', 'BookmarkPlus', 'BookmarkMinus', 'Tag', 'Tags', 
      'Hash', 'AtSign', 'Asterisk', 'Command', 'Terminal', 'Layers', 'Layers2', 'Layers3',
      'Copy', 'Clipboard', 'ClipboardCopy', 'Scissors', 'Trash', 'Trash2', 'Archive',
      'Download', 'Upload', 'ExternalLink', 'Link', 'Link2', 'Unlink', 'Unlink2'
    ]
  },
  'Negocios': {
    description: 'Oficina, trabajo y empresa',
    icons: [
      'Briefcase', 'BriefcaseBusiness', 'Building', 'Building2', 'Factory', 'Warehouse',
      'Landmark', 'LandmarkDome', 'Store', 'ShoppingBag', 'ShoppingCart', 'ShoppingBasket',
      'CreditCard', 'Wallet', 'Wallet2', 'Receipt', 'ReceiptText', 'FileText', 'FileSpreadsheet',
      'Files', 'Folder', 'FolderOpen', 'FolderPlus', 'FolderMinus', 'FolderClosed',
      'Archive', 'ArchiveRestore', 'Box', 'Package', 'PackageOpen', 'PackageCheck',
      'Truck', 'Plane', 'Ship', 'Train', 'Bus',
      'ClipboardList', 'ClipboardCheck', 'ClipboardX', 'ClipboardPen',
      'PenTool', 'Pen', 'PenLine', 'Stamp', 'Signature',
      'Award', 'Medal', 'Trophy', 'Crown', 'Gem',
      'Target', 'Goal', 'Milestone', 'Route', 'Map', 'MapPin', 'MapPinned',
      'Presentation', 'BarChart', 'BarChart2', 'BarChart3', 'BarChart4',
      'PieChart', 'LineChart', 'TrendingUp', 'TrendingDown', 'Activity',
      'Handshake', 'HeartHandshake', 'Users', 'UserPlus', 'Contact', 'Contact2'
    ]
  },
  'Tecnología': {
    description: 'Tecnología y dispositivos',
    icons: [
      'Laptop', 'Laptop2', 'Monitor', 'MonitorSmartphone', 'Smartphone', 'Tablet', 'TabletSmartphone',
      'Watch', 'Tv', 'Tv2', 'Speaker', 'Headphones', 'Headset', 'Mic', 'MicOff', 'Mic2',
      'Camera', 'CameraOff', 'Video', 'VideoOff', 'Image', 'Images', 'ImagePlus',
      'Wifi', 'WifiOff', 'WifiHigh', 'WifiLow', 'WifiZero', 'Signal', 'SignalHigh', 'SignalLow',
      'Bluetooth', 'BluetoothConnected', 'BluetoothOff', 'BluetoothSearching',
      'Battery', 'BatteryCharging', 'BatteryFull', 'BatteryLow', 'BatteryMedium', 'BatteryWarning',
      'Plug', 'PlugZap', 'Power', 'PowerOff', 'Zap', 'ZapOff',
      'Cpu', 'CircuitBoard', 'HardDrive', 'HardDriveDownload', 'HardDriveUpload',
      'Server', 'ServerOff', 'ServerCog', 'Database', 'DatabaseBackup',
      'Cloud', 'CloudOff', 'CloudDownload', 'CloudUpload', 'CloudCog',
      'Download', 'Upload', 'DownloadCloud', 'UploadCloud',
      'Link', 'Link2', 'Unlink', 'Unlink2', 'Globe', 'Globe2', 'GlobeLock',
      'QrCode', 'Scan', 'ScanLine', 'Barcode',
      'Terminal', 'TerminalSquare', 'Code', 'Code2', 'Braces', 'FileCode', 'FileCode2',
      'Bug', 'BugOff', 'BugPlay', 'Wrench', 'WrenchIcon', 'Settings', 'Settings2', 'Cog', 'SlidersHorizontal'
    ]
  },
  'Educación': {
    description: 'Aprendizaje y academia',
    icons: [
      'GraduationCap', 'BookOpen', 'BookOpenCheck', 'BookOpenText', 'Book', 'BookCopy', 'BookMarked',
      'Library', 'LibraryBig', 'Newspaper', 'ScrollText', 'Scroll', 'FileText', 'FilePen',
      'NotebookPen', 'Notebook', 'NotebookTabs', 'BookText', 'BookType',
      'Pencil', 'PencilLine', 'PencilRuler', 'PenLine', 'Pen', 'PenTool',
      'Highlighter', 'Eraser', 'Ruler', 'RulerDimensionLine', 'Compass', 'Protractor',
      'Calculator', 'Binary', 'Sigma', 'Pi', 'Percent', 'Hash', 'Parentheses', 'Braces',
      'FlaskConical', 'FlaskRound', 'TestTube', 'TestTube2', 'TestTubes', 'Beaker',
      'Microscope', 'Telescope', 'Atom', 'Dna', 'Orbit',
      'Brain', 'BrainCircuit', 'BrainCog', 'Lightbulb', 'LightbulbOff',
      'Puzzle', 'PuzzlePiece', 'Shapes', 'TriangleRight',
      'Languages', 'Globe', 'Globe2', 'Earth', 'Map', 'MapPin', 'MapPinned',
      'School', 'School2', 'University', 'Presentation', 'Projector'
    ]
  },
  'Creatividad': {
    description: 'Arte, diseño y creatividad',
    icons: [
      'Palette', 'Paintbrush', 'Paintbrush2', 'Brush', 'PaintBucket', 'Pipette', 'Pipettes',
      'Pencil', 'PencilLine', 'PenTool', 'Pen', 'PenLine', 'Highlighter',
      'Shapes', 'Square', 'SquareDashed', 'Circle', 'CircleDashed', 'Triangle', 'TriangleDashed',
      'Hexagon', 'Pentagon', 'Octagon', 'Diamond', 'Spline', 'Radius',
      'Sparkle', 'Sparkles', 'Stars', 'Wand', 'Wand2', 'WandSparkles',
      'Gem', 'Crown', 'Medal', 'Award', 'Trophy',
      'Flower', 'Flower2', 'TreeDeciduous', 'TreePine', 'Trees', 'Leaf', 'Sprout', 'Clover',
      'Sun', 'Moon', 'CloudSun', 'CloudMoon', 'Rainbow', 'Snowflake', 'Wind',
      'Music', 'Music2', 'Music3', 'Music4', 'Disc', 'Disc2', 'Disc3', 'Radio', 'Podcast',
      'Film', 'Clapperboard', 'Drama', 'Theater',
      'Image', 'ImagePlus', 'Images', 'Frame', 'Framer', 'Focus',
      'Camera', 'CameraOff', 'Aperture', 'ScanLine', 'Crop', 'Scissors',
      'Blend', 'Contrast', 'Layers', 'Component', 'Figma', 'Dribbble'
    ]
  },
  'Finanzas': {
    description: 'Dinero y economía',
    icons: [
      'DollarSign', 'Euro', 'PoundSterling', 'JapaneseYen', 'IndianRupee', 'RussianRuble', 'SwissFranc',
      'Coins', 'CircleDollarSign', 'BadgeDollarSign', 'BadgeCent', 'BadgeEuro', 'BadgePoundSterling',
      'Banknote', 'BanknoteIcon', 'Wallet', 'Wallet2', 'WalletCards', 'WalletMinimal',
      'CreditCard', 'CreditCardIcon', 'Landmark', 'LandmarkDome', 'Building', 'Building2',
      'Receipt', 'ReceiptText', 'Calculator', 'Scale', 'Scale3d', 'Scaling',
      'PiggyBank', 'Vault', 'Safe', 'HandCoins', 'CirclePercent',
      'TrendingUp', 'TrendingDown', 'TrendingUpDown', 'ArrowUpRight', 'ArrowDownRight', 'ArrowUpDown',
      'LineChart', 'BarChart', 'BarChart2', 'BarChart3', 'BarChart4', 'BarChartHorizontal',
      'PieChart', 'Activity', 'Gauge', 'GaugeCircle', 'Signal',
      'Percent', 'PercentCircle', 'PercentSquare', 'Hash', 'Equal', 'Plus', 'Minus', 'X'
    ]
  },
  'Marketing': {
    description: 'Marketing y comunicación',
    icons: [
      'Megaphone', 'Volume', 'Volume1', 'Volume2', 'VolumeX', 'Radio', 'Podcast', 'Rss',
      'Share', 'Share2', 'Forward', 'Reply', 'ReplyAll', 'Send', 'SendHorizontal', 'SendToBack',
      'Mail', 'MailPlus', 'MailOpen', 'MailCheck', 'MailX', 'MailWarning', 'Mails',
      'Inbox', 'Archive', 'ArchiveRestore', 'ArchiveX',
      'MessageCircle', 'MessageCirclePlus', 'MessageSquare', 'MessageSquarePlus', 'MessagesSquare',
      'AtSign', 'Hash', 'Hashtag', 'Mention',
      'ThumbsUp', 'ThumbsDown', 'Heart', 'HeartCrack', 'HeartHandshake', 'HeartPulse',
      'Handshake', 'Hand', 'Grip', 'Pointer', 'MousePointer', 'MousePointer2',
      'Users', 'Users2', 'UserPlus', 'UserMinus', 'UserCheck', 'UserX',
      'Target', 'Crosshair', 'Focus', 'Scan', 'ScanSearch',
      'Zap', 'ZapOff', 'Bolt', 'Rocket', 'Sparkle', 'Sparkles',
      'TrendingUp', 'Award', 'Medal', 'Trophy', 'Crown',
      'BadgeCheck', 'Verified', 'ShieldCheck', 'CircleCheck', 'CheckCircle', 'CheckCircle2'
    ]
  },
  'Personas': {
    description: 'Usuarios y perfiles',
    icons: [
      'User', 'UserCircle', 'UserCircle2', 'UserSquare', 'UserSquare2', 'UserRound', 'UserRoundCog',
      'Users', 'Users2', 'UsersRound', 'UserPlus', 'UserPlus2', 'UserMinus', 'UserMinus2',
      'UserX', 'UserX2', 'UserCheck', 'UserCheck2', 'UserCog', 'UserCog2', 'UserPen',
      'Contact', 'Contact2', 'ContactRound', 'IdCard', 'BadgeCheck', 'Badge', 'BadgeInfo',
      'PersonStanding', 'Accessibility', 'AccessibilityIcon', 'Wheelchair',
      'Baby', 'BabyIcon', 'CircleUser', 'CircleUserRound',
      'Hand', 'HandMetal', 'Grip', 'GripHorizontal', 'GripVertical', 'Fingerprint',
      'Footprints', 'FootprintsIcon',
      'Smile', 'SmilePlus', 'Frown', 'Meh', 'Angry', 'Laugh', 'Annoyed', 'PartyPopper',
      'Ghost', 'Skull', 'SkullIcon', 'Bot', 'BotMessageSquare', 'BotOff',
      'Glasses', 'Sunglasses', 'EyeGlasses', 'Shirt', 'ShirtIcon'
    ]
  },
  'Objetos': {
    description: 'Objetos cotidianos',
    icons: [
      'Home', 'House', 'HousePlus', 'Building', 'Building2', 'Castle', 'Church', 'School',
      'Bed', 'BedDouble', 'BedSingle', 'Sofa', 'Armchair', 'Bath', 'ShowerHead',
      'Lamp', 'LampDesk', 'LampCeiling', 'LampFloor', 'LampWallDown', 'LampWallUp',
      'DoorOpen', 'DoorClosed', 'Door', 'GateOpen', 'Key', 'KeyRound', 'KeySquare',
      'Scissors', 'ScissorsIcon', 'Paperclip', 'Pin', 'PinOff', 'Magnet',
      'Hammer', 'Wrench', 'WrenchIcon', 'Screwdriver', 'Drill', 'Axe', 'Shovel', 'Pickaxe',
      'Umbrella', 'UmbrellaOff', 'Glasses', 'Sunglasses', 'Watch', 'Hourglass',
      'Compass', 'CompassIcon', 'Navigation', 'Navigation2', 'Locate', 'LocateFixed', 'LocateOff',
      'Flashlight', 'FlashlightOff', 'Lightbulb', 'LightbulbOff', 'CandlestickChart',
      'Fan', 'AirVent', 'Wind', 'Thermometer', 'ThermometerSun', 'ThermometerSnowflake',
      'Droplet', 'Droplets', 'Flame', 'FlameKindling', 'Snowflake', 'IceCream', 'IceCreamBowl',
      'Sun', 'Moon', 'Stars', 'CloudSun', 'CloudMoon', 'CloudRain', 'CloudSnow', 'CloudLightning',
      'Zap', 'ZapOff', 'Bolt', 'Plug', 'PlugZap', 'Power', 'PowerOff'
    ]
  },
  'Símbolos': {
    description: 'Símbolos y estados',
    icons: [
      'Check', 'CheckCircle', 'CheckCircle2', 'CheckSquare', 'CheckSquare2', 'CircleCheck', 'SquareCheck',
      'X', 'XCircle', 'XSquare', 'CircleX', 'SquareX', 'OctagonX',
      'AlertTriangle', 'AlertCircle', 'AlertOctagon', 'TriangleAlert', 'CircleAlert', 'OctagonAlert',
      'Info', 'CircleHelp', 'HelpCircle', 'HelpCircleIcon',
      'Ban', 'Slash', 'CircleSlash', 'CircleSlash2', 'ShieldBan',
      'ShieldAlert', 'ShieldCheck', 'ShieldX', 'ShieldQuestion', 'ShieldOff',
      'Verified', 'BadgeCheck', 'BadgeX', 'BadgeAlert', 'BadgeInfo', 'BadgeMinus', 'BadgePlus',
      'Circle', 'CircleDot', 'CircleDotDashed', 'Disc', 'Disc2', 'Disc3',
      'Square', 'SquareDot', 'SquareDashed', 'SquareAsterisk',
      'Star', 'StarHalf', 'StarOff', 'Stars',
      'Heart', 'HeartCrack', 'HeartOff', 'HeartPulse',
      'Flag', 'FlagOff', 'FlagTriangleLeft', 'FlagTriangleRight',
      'Bookmark', 'BookmarkCheck', 'BookmarkMinus', 'BookmarkPlus', 'BookmarkX',
      'Plus', 'PlusCircle', 'PlusSquare', 'Minus', 'MinusCircle', 'MinusSquare',
      'Equal', 'EqualNot', 'Percent', 'Hash', 'Asterisk', 'AtSign', 'Ampersand'
    ]
  },
  'Flechas': {
    description: 'Flechas e indicadores',
    icons: [
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'ArrowUpRight', 'ArrowUpLeft', 'ArrowDownRight', 'ArrowDownLeft',
      'ArrowBigUp', 'ArrowBigDown', 'ArrowBigLeft', 'ArrowBigRight',
      'ArrowUpCircle', 'ArrowDownCircle', 'ArrowLeftCircle', 'ArrowRightCircle',
      'ArrowUpSquare', 'ArrowDownSquare', 'ArrowLeftSquare', 'ArrowRightSquare',
      'ChevronUp', 'ChevronDown', 'ChevronLeft', 'ChevronRight',
      'ChevronsUp', 'ChevronsDown', 'ChevronsLeft', 'ChevronsRight',
      'ChevronUpCircle', 'ChevronDownCircle', 'ChevronLeftCircle', 'ChevronRightCircle',
      'ChevronUpSquare', 'ChevronDownSquare', 'ChevronLeftSquare', 'ChevronRightSquare',
      'CornerDownLeft', 'CornerDownRight', 'CornerUpLeft', 'CornerUpRight',
      'CornerLeftDown', 'CornerLeftUp', 'CornerRightDown', 'CornerRightUp',
      'MoveUp', 'MoveDown', 'MoveLeft', 'MoveRight', 'Move', 'MoveHorizontal', 'MoveVertical',
      'MoveDiagonal', 'MoveDiagonal2', 'Move3d',
      'Undo', 'Undo2', 'Redo', 'Redo2',
      'RotateCw', 'RotateCcw', 'RotateCwSquare', 'RotateCcwSquare',
      'RefreshCw', 'RefreshCcw', 'RefreshCwOff', 'RefreshCcwDot',
      'Repeat', 'Repeat1', 'Repeat2', 'Shuffle', 'Rewind', 'FastForward',
      'ArrowLeftRight', 'ArrowUpDown', 'Maximize2', 'Minimize2', 'Expand', 'Shrink', 'ScanLine'
    ]
  }
};

// Colores disponibles para iconos (paleta amplia)
const ICON_COLORS = [
  { id: 'gray-dark', color: '#1f2937', name: 'Negro' },
  { id: 'gray', color: '#6b7280', name: 'Gris' },
  { id: 'gray-light', color: '#9ca3af', name: 'Gris Claro' },
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
  onClose,
  currentIcon = null
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Acciones Rápidas');
  const [selectedColor, setSelectedColor] = useState(currentIcon?.color || '#6b7280');
  const panelRef = useRef(null);
  const searchInputRef = useRef(null);

  // Reset color cuando cambia el icono actual
  useEffect(() => {
    if (currentIcon?.color) {
      setSelectedColor(currentIcon.color);
    }
  }, [currentIcon]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        // Ignorar si el clic es en el toolbar
        const toolbar = document.querySelector('[data-toolbar="node-toolbar"]');
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
    const allIcons = new Set();
    
    Object.values(ICON_CATEGORIES).forEach(category => {
      category.icons.forEach(iconName => {
        if (iconName.toLowerCase().includes(term)) {
          allIcons.add(iconName);
        }
      });
    });

    return Array.from(allIcons);
  }, [searchTerm, selectedCategory]);

  // Renderizar icono dinámicamente
  const renderIcon = (iconName, size = 20, color = selectedColor) => {
    const IconComponent = LucideIcons[iconName];
    if (!IconComponent) return null;
    return <IconComponent size={size} color={color} strokeWidth={2} />;
  };

  const handleSelectIcon = (iconName) => {
    onSelectIcon({
      name: iconName,
      color: selectedColor
    });
  };

  const handleRemoveIcon = () => {
    onSelectIcon(null);
  };

  if (!isOpen) return null;

  // Calcular posición del panel - SIEMPRE hacia abajo con scroll interno
  const getPanelStyle = () => {
    const panelWidth = 520;
    let left = position.x;
    let top = position.y + 10; // Siempre debajo del toolbar
    
    // Solo ajustar horizontalmente si se sale de pantalla
    if (typeof window !== 'undefined') {
      if (left + panelWidth / 2 > window.innerWidth - 20) {
        left = window.innerWidth - panelWidth / 2 - 20;
      }
      if (left - panelWidth / 2 < 20) {
        left = panelWidth / 2 + 20;
      }
      // Calcular altura máxima disponible hacia abajo
      const availableHeight = window.innerHeight - top - 20;
      const maxPanelHeight = Math.max(350, Math.min(550, availableHeight));
      
      return {
        left,
        top,
        transform: 'translateX(-50%)',
        width: `${panelWidth}px`,
        maxHeight: `${maxPanelHeight}px`
      };
    }
    
    return {
      left,
      top,
      transform: 'translateX(-50%)',
      width: `${panelWidth}px`,
      maxHeight: '550px'
    };
  };

  return (
    <div
      ref={panelRef}
      className="
        absolute z-50
        bg-white rounded-2xl shadow-2xl
        border border-gray-200
        overflow-hidden
        animate-in fade-in zoom-in-95 duration-200
        flex flex-col
      "
      style={getPanelStyle()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div>
          <h3 className="font-semibold text-gray-900">Seleccionar Icono</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {Object.values(ICON_CATEGORIES).reduce((acc, cat) => acc + cat.icons.length, 0)}+ iconos disponibles
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentIcon && (
            <button
              onClick={handleRemoveIcon}
              className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Quitar icono
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
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
            placeholder="Buscar icono... (ej: check, star, user)"
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
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <p className="text-xs font-medium text-gray-600 mb-2">Color del icono</p>
        <div className="flex flex-wrap gap-1.5">
          {ICON_COLORS.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedColor(c.color)}
              className={`
                w-6 h-6 rounded-full transition-all duration-150
                ${selectedColor === c.color 
                  ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' 
                  : 'hover:scale-110 hover:ring-2 hover:ring-offset-1 hover:ring-gray-300'
                }
              `}
              style={{ backgroundColor: c.color }}
              title={c.name}
            />
          ))}
        </div>
      </div>

      {/* Categorías */}
      {!searchTerm && (
        <div className="flex gap-1 p-2 border-b border-gray-100 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {Object.keys(ICON_CATEGORIES).map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap
                transition-all duration-150
                ${selectedCategory === category
                  ? 'bg-blue-100 text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {/* Grid de iconos - área con scroll flexible */}
      <div className="p-3 overflow-y-auto flex-1 min-h-0">
        {searchTerm && (
          <p className="text-xs text-gray-500 mb-2 px-1">
            {filteredIcons.length} resultado{filteredIcons.length !== 1 ? 's' : ''} para &ldquo;{searchTerm}&rdquo;
          </p>
        )}
        
        {/* Mostrar descripción de categoría */}
        {!searchTerm && (
          <p className="text-xs text-gray-400 mb-2 px-1">
            {ICON_CATEGORIES[selectedCategory]?.description}
          </p>
        )}
        
        {filteredIcons.length > 0 ? (
          <div className="grid grid-cols-10 gap-1">
            {filteredIcons.map((iconName) => {
              const isSelected = currentIcon?.name === iconName;
              const isSpecial = iconName === 'Check' || iconName === 'CheckCircle' || iconName === 'CheckCircle2' || 
                               iconName === 'X' || iconName === 'XCircle' || iconName === 'XSquare';
              
              return (
                <button
                  key={iconName}
                  onClick={() => handleSelectIcon(iconName)}
                  className={`
                    p-2 rounded-lg
                    transition-all duration-150
                    flex items-center justify-center
                    group relative
                    ${isSelected 
                      ? 'bg-blue-100 ring-2 ring-blue-500' 
                      : isSpecial
                        ? 'bg-amber-50 hover:bg-amber-100 hover:ring-2 hover:ring-amber-400'
                        : 'hover:bg-blue-50 hover:ring-2 hover:ring-blue-300'
                    }
                  `}
                  title={iconName}
                >
                  {renderIcon(iconName, 20, isSelected ? selectedColor : isSpecial ? '#d97706' : selectedColor)}
                  <span className="
                    absolute -bottom-8 left-1/2 -translate-x-1/2
                    px-2 py-1 rounded-md bg-gray-900 text-white text-xs
                    opacity-0 group-hover:opacity-100
                    transition-opacity duration-150
                    whitespace-nowrap z-50
                    pointer-events-none
                    shadow-lg
                  ">
                    {iconName}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <Search size={48} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No se encontraron iconos</p>
            <p className="text-xs mt-1">Intenta con otro término de búsqueda</p>
          </div>
        )}
      </div>

      {/* Footer con vista previa */}
      <div className="p-3 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">Vista previa:</span>
          <div className="flex items-center gap-2">
            <span className="p-2.5 bg-white rounded-xl border border-gray-200 shadow-sm">
              {renderIcon(currentIcon?.name || 'Check', 22, selectedColor)}
            </span>
            <span className="p-2.5 bg-gray-800 rounded-xl shadow-sm">
              {renderIcon(currentIcon?.name || 'Check', 22, selectedColor)}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Haz clic en un icono para seleccionarlo
        </p>
      </div>
    </div>
  );
};

export default IconPickerPanel;

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Palette, Square, Circle, Minus, Sparkles, Search,
  Smile, Trash2
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
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
// ICONOS PERSONALIZADOS (WhatsApp, etc.)
// ==========================================

const WhatsAppIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// ==========================================
// LIBRERÍA DE ICONOS POR CATEGORÍA
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
  'Redes Sociales': {
    description: 'Redes sociales y comunicación',
    icons: [
      'WhatsApp', // Icono personalizado
      'MessageCircle', 'MessageSquare', 'MessagesSquare', 'Mail', 'Send', 'Share', 'Share2',
      'Phone', 'PhoneCall', 'PhoneIncoming', 'PhoneOutgoing', 'Video', 'VideoOff',
      'AtSign', 'Hash', 'Globe', 'Globe2', 'Link', 'Link2', 'ExternalLink',
      'Rss', 'Radio', 'Podcast', 'Megaphone', 'Bell', 'BellRing'
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
      'Highlighter', 'Eraser', 'Ruler', 'Compass',
      'Calculator', 'Binary', 'Sigma', 'Pi', 'Percent', 'Hash', 'Braces',
      'FlaskConical', 'FlaskRound', 'TestTube', 'TestTube2', 'TestTubes',
      'Microscope', 'Telescope', 'Atom', 'Dna', 'Orbit',
      'Brain', 'BrainCircuit', 'BrainCog', 'Lightbulb', 'LightbulbOff',
      'Puzzle', 'Shapes',
      'Languages', 'Globe', 'Globe2', 'Earth', 'Map', 'MapPin', 'MapPinned',
      'School', 'School2', 'Presentation', 'Projector'
    ]
  },
  'Creatividad': {
    description: 'Arte, diseño y creatividad',
    icons: [
      'Palette', 'Paintbrush', 'Paintbrush2', 'Brush', 'PaintBucket', 'Pipette',
      'Pencil', 'PencilLine', 'PenTool', 'Pen', 'PenLine', 'Highlighter',
      'Shapes', 'Square', 'SquareDashed', 'Circle', 'CircleDashed', 'Triangle',
      'Hexagon', 'Pentagon', 'Octagon', 'Diamond', 'Spline',
      'Sparkle', 'Sparkles', 'Stars', 'Wand', 'Wand2', 'WandSparkles',
      'Gem', 'Crown', 'Medal', 'Award', 'Trophy',
      'Flower', 'Flower2', 'TreeDeciduous', 'TreePine', 'Trees', 'Leaf', 'Sprout', 'Clover',
      'Sun', 'Moon', 'CloudSun', 'CloudMoon', 'Rainbow', 'Snowflake', 'Wind',
      'Music', 'Music2', 'Music3', 'Music4', 'Disc', 'Disc2', 'Disc3', 'Radio', 'Podcast',
      'Film', 'Clapperboard',
      'Image', 'ImagePlus', 'Images', 'Frame', 'Focus',
      'Camera', 'CameraOff', 'Aperture', 'ScanLine', 'Crop', 'Scissors'
    ]
  },
  'Finanzas': {
    description: 'Dinero y economía',
    icons: [
      'DollarSign', 'Euro', 'PoundSterling', 'JapaneseYen', 'IndianRupee', 'RussianRuble', 'SwissFranc',
      'Coins', 'CircleDollarSign', 'BadgeDollarSign', 'BadgeCent', 'BadgeEuro', 'BadgePoundSterling',
      'Banknote', 'Wallet', 'Wallet2', 'WalletCards',
      'CreditCard', 'Landmark', 'LandmarkDome', 'Building', 'Building2',
      'Receipt', 'ReceiptText', 'Calculator', 'Scale',
      'PiggyBank', 'HandCoins', 'CirclePercent',
      'TrendingUp', 'TrendingDown', 'ArrowUpRight', 'ArrowDownRight', 'ArrowUpDown',
      'LineChart', 'BarChart', 'BarChart2', 'BarChart3', 'BarChart4',
      'PieChart', 'Activity', 'Gauge', 'Signal',
      'Percent', 'Hash', 'Equal', 'Plus', 'Minus', 'X'
    ]
  },
  'Marketing': {
    description: 'Marketing y comunicación',
    icons: [
      'Megaphone', 'Volume', 'Volume1', 'Volume2', 'VolumeX', 'Radio', 'Podcast', 'Rss',
      'Share', 'Share2', 'Forward', 'Reply', 'ReplyAll', 'Send', 'SendHorizontal',
      'Mail', 'MailPlus', 'MailOpen', 'MailCheck', 'MailX', 'MailWarning', 'Mails',
      'Inbox', 'Archive', 'ArchiveRestore', 'ArchiveX',
      'MessageCircle', 'MessageCirclePlus', 'MessageSquare', 'MessageSquarePlus', 'MessagesSquare',
      'AtSign', 'Hash',
      'ThumbsUp', 'ThumbsDown', 'Heart', 'HeartCrack', 'HeartHandshake', 'HeartPulse',
      'Handshake', 'Hand', 'Grip', 'Pointer', 'MousePointer', 'MousePointer2',
      'Users', 'Users2', 'UserPlus', 'UserMinus', 'UserCheck', 'UserX',
      'Target', 'Crosshair', 'Focus', 'Scan', 'ScanSearch',
      'Zap', 'ZapOff', 'Rocket', 'Sparkle', 'Sparkles',
      'TrendingUp', 'Award', 'Medal', 'Trophy', 'Crown',
      'BadgeCheck', 'ShieldCheck', 'CircleCheck', 'CheckCircle', 'CheckCircle2'
    ]
  },
  'Personas': {
    description: 'Usuarios y perfiles',
    icons: [
      'User', 'UserCircle', 'UserCircle2', 'UserSquare', 'UserSquare2', 'UserRound',
      'Users', 'Users2', 'UsersRound', 'UserPlus', 'UserPlus2', 'UserMinus', 'UserMinus2',
      'UserX', 'UserX2', 'UserCheck', 'UserCheck2', 'UserCog', 'UserCog2', 'UserPen',
      'Contact', 'Contact2', 'ContactRound', 'IdCard', 'BadgeCheck', 'Badge', 'BadgeInfo',
      'PersonStanding', 'Accessibility',
      'Baby', 'CircleUser', 'CircleUserRound',
      'Hand', 'HandMetal', 'Grip', 'GripHorizontal', 'GripVertical', 'Fingerprint',
      'Footprints',
      'Smile', 'SmilePlus', 'Frown', 'Meh', 'Angry', 'Laugh', 'Annoyed', 'PartyPopper',
      'Ghost', 'Skull', 'Bot', 'BotMessageSquare', 'BotOff',
      'Glasses', 'Sunglasses', 'Shirt'
    ]
  },
  'Objetos': {
    description: 'Objetos cotidianos',
    icons: [
      'Home', 'House', 'HousePlus', 'Building', 'Building2', 'Castle', 'Church', 'School',
      'Bed', 'BedDouble', 'BedSingle', 'Sofa', 'Armchair', 'Bath', 'ShowerHead',
      'Lamp', 'LampDesk', 'LampCeiling', 'LampFloor',
      'DoorOpen', 'DoorClosed', 'Key', 'KeyRound', 'KeySquare',
      'Scissors', 'Paperclip', 'Pin', 'PinOff', 'Magnet',
      'Hammer', 'Wrench', 'Screwdriver', 'Drill', 'Axe', 'Shovel', 'Pickaxe',
      'Umbrella', 'UmbrellaOff', 'Glasses', 'Sunglasses', 'Watch', 'Hourglass',
      'Compass', 'Navigation', 'Navigation2', 'Locate', 'LocateFixed', 'LocateOff',
      'Flashlight', 'FlashlightOff', 'Lightbulb', 'LightbulbOff',
      'Fan', 'AirVent', 'Wind', 'Thermometer',
      'Droplet', 'Droplets', 'Flame', 'Snowflake', 'IceCream',
      'Sun', 'Moon', 'Stars', 'CloudSun', 'CloudMoon', 'CloudRain', 'CloudSnow', 'CloudLightning',
      'Zap', 'ZapOff', 'Plug', 'PlugZap', 'Power', 'PowerOff'
    ]
  },
  'Símbolos': {
    description: 'Símbolos y estados',
    icons: [
      'Check', 'CheckCircle', 'CheckCircle2', 'CheckSquare', 'CheckSquare2', 'CircleCheck', 'SquareCheck',
      'X', 'XCircle', 'XSquare', 'CircleX', 'SquareX', 'OctagonX',
      'AlertTriangle', 'AlertCircle', 'AlertOctagon',
      'Info', 'CircleHelp', 'HelpCircle',
      'Ban', 'Slash', 'CircleSlash', 'CircleSlash2', 'ShieldBan',
      'ShieldAlert', 'ShieldCheck', 'ShieldX', 'ShieldQuestion', 'ShieldOff',
      'BadgeCheck', 'BadgeX', 'BadgeAlert', 'BadgeInfo', 'BadgeMinus', 'BadgePlus',
      'Circle', 'CircleDot', 'CircleDotDashed', 'Disc', 'Disc2', 'Disc3',
      'Square', 'SquareDot', 'SquareDashed', 'SquareAsterisk',
      'Star', 'StarHalf', 'StarOff', 'Stars',
      'Heart', 'HeartCrack', 'HeartOff', 'HeartPulse',
      'Flag', 'FlagOff', 'FlagTriangleLeft', 'FlagTriangleRight',
      'Bookmark', 'BookmarkCheck', 'BookmarkMinus', 'BookmarkPlus', 'BookmarkX',
      'Plus', 'PlusCircle', 'PlusSquare', 'Minus', 'MinusCircle', 'MinusSquare',
      'Equal', 'Percent', 'Hash', 'Asterisk', 'AtSign'
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
      'CornerDownLeft', 'CornerDownRight', 'CornerUpLeft', 'CornerUpRight',
      'CornerLeftDown', 'CornerLeftUp', 'CornerRightDown', 'CornerRightUp',
      'MoveUp', 'MoveDown', 'MoveLeft', 'MoveRight', 'Move', 'MoveHorizontal', 'MoveVertical',
      'MoveDiagonal', 'MoveDiagonal2', 'Move3d',
      'Undo', 'Undo2', 'Redo', 'Redo2',
      'RotateCw', 'RotateCcw', 'RotateCwSquare', 'RotateCcwSquare',
      'RefreshCw', 'RefreshCcw', 'RefreshCwOff',
      'Repeat', 'Repeat1', 'Repeat2', 'Shuffle', 'Rewind', 'FastForward',
      'ArrowLeftRight', 'ArrowUpDown', 'Maximize2', 'Minimize2', 'Expand', 'Shrink', 'ScanLine'
    ]
  }
};

// Colores disponibles para iconos
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
  { id: 'whatsapp', color: '#25D366', name: 'WhatsApp' },
];

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
// TAB SELECTOR
// ==========================================

const TabSelector = ({ activeTab, onTabChange }) => (
  <div className="flex border-b border-gray-200 bg-gray-50/50">
    <button
      onClick={() => onTabChange('styles')}
      className={`
        flex-1 py-3 px-2 text-xs font-medium flex items-center justify-center gap-1.5
        transition-all duration-200 border-b-2
        ${activeTab === 'styles'
          ? 'text-blue-600 border-blue-600 bg-white'
          : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-100'
        }
      `}
    >
      <Palette size={14} />
      Estilos
    </button>
    <button
      onClick={() => onTabChange('icons')}
      className={`
        flex-1 py-3 px-2 text-xs font-medium flex items-center justify-center gap-1.5
        transition-all duration-200 border-b-2
        ${activeTab === 'icons'
          ? 'text-blue-600 border-blue-600 bg-white'
          : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-100'
        }
      `}
    >
      <Smile size={14} />
      Iconos
    </button>
    <button
      onClick={() => onTabChange('reminders')}
      className={`
        flex-1 py-3 px-2 text-xs font-medium flex items-center justify-center gap-1.5
        transition-all duration-200 border-b-2
        ${activeTab === 'reminders'
          ? 'text-purple-600 border-purple-600 bg-white'
          : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-100'
        }
      `}
    >
      <Bell size={14} />
      Recordar
    </button>
  </div>
);

// ==========================================
// SECCIONES DE ESTILOS
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
// PANEL DE ICONOS
// ==========================================

const IconsPanel = ({ selectedNode, onIconChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Acciones Rápidas');
  const [selectedColor, setSelectedColor] = useState(selectedNode?.icon?.color || '#6b7280');

  useEffect(() => {
    if (selectedNode?.icon?.color) {
      setSelectedColor(selectedNode.icon.color);
    }
  }, [selectedNode?.icon?.color]);

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

  const renderIcon = (iconName, size = 20, color = selectedColor) => {
    // Manejar icono de WhatsApp personalizado
    if (iconName === 'WhatsApp') {
      return <WhatsAppIcon size={size} color={color} />;
    }
    
    const IconComponent = LucideIcons[iconName];
    if (!IconComponent) return null;
    return <IconComponent size={size} color={color} strokeWidth={2} />;
  };

  const handleSelectIcon = (iconName) => {
    if (selectedNode && onIconChange) {
      onIconChange(selectedNode.id, {
        name: iconName,
        color: selectedColor
      });
    }
  };

  const handleRemoveIcon = () => {
    if (selectedNode && onIconChange) {
      onIconChange(selectedNode.id, null);
    }
  };

  const currentIcon = selectedNode?.icon;

  return (
    <div className="space-y-4">
      {/* Icono actual */}
      {currentIcon && (
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                {renderIcon(currentIcon.name, 24, currentIcon.color)}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{currentIcon.name}</p>
                <p className="text-xs text-gray-500">Icono actual</p>
              </div>
            </div>
            <button
              onClick={handleRemoveIcon}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Quitar icono"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Búsqueda */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar icono... (ej: whatsapp, star)"
          className="
            w-full pl-9 pr-4 py-2.5 rounded-xl
            bg-gray-50 border border-gray-200
            focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            outline-none transition-all
            text-sm text-gray-900 placeholder:text-gray-400
          "
        />
      </div>

      {/* Selector de color */}
      <div>
        <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-2">Color del icono</p>
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
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(ICON_CATEGORIES).map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`
                px-2.5 py-1.5 rounded-lg text-xs font-medium
                transition-all duration-150
                ${selectedCategory === category
                  ? 'bg-blue-100 text-blue-700 shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {/* Resultados de búsqueda */}
      {searchTerm && (
        <p className="text-xs text-gray-500">
          {filteredIcons.length} resultado{filteredIcons.length !== 1 ? 's' : ''} para &ldquo;{searchTerm}&rdquo;
        </p>
      )}

      {/* Descripción de categoría */}
      {!searchTerm && (
        <p className="text-xs text-gray-400">
          {ICON_CATEGORIES[selectedCategory]?.description}
        </p>
      )}

      {/* Grid de iconos */}
      {filteredIcons.length > 0 ? (
        <div className="grid grid-cols-7 gap-1.5">
          {filteredIcons.map((iconName) => {
            const isSelected = currentIcon?.name === iconName;
            const isSpecial = iconName === 'Check' || iconName === 'CheckCircle' || iconName === 'CheckCircle2' || 
                             iconName === 'X' || iconName === 'XCircle' || iconName === 'XSquare' ||
                             iconName === 'WhatsApp';
            
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
                      : 'bg-gray-50 hover:bg-blue-50 hover:ring-2 hover:ring-blue-300'
                  }
                `}
                title={iconName}
              >
                {renderIcon(iconName, 18, isSelected ? selectedColor : isSpecial ? (iconName === 'WhatsApp' ? '#25D366' : '#d97706') : selectedColor)}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <Search size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No se encontraron iconos</p>
        </div>
      )}

      {/* Vista previa */}
      <div className="p-3 bg-gray-50 rounded-xl">
        <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Vista previa</p>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
            {renderIcon(currentIcon?.name || 'Check', 24, selectedColor)}
          </div>
          <div className="p-3 bg-gray-800 rounded-xl shadow-sm">
            {renderIcon(currentIcon?.name || 'Check', 24, selectedColor)}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

const RightStyleSidebar = ({
  isOpen,
  selectedNode,
  activeTab = 'styles',
  onTabChange,
  onStyleChange,
  onIconChange,
  onClose
}) => {
  const [internalTab, setInternalTab] = useState(activeTab);

  useEffect(() => {
    setInternalTab(activeTab);
  }, [activeTab]);

  const handleTabChange = (tab) => {
    setInternalTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

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
            <h3 className="text-sm font-semibold text-gray-900">Personalizar</h3>
            <p className="text-[10px] text-gray-500 truncate max-w-[180px]">
              {selectedNode ? `"${selectedNode.text || 'Sin texto'}"` : 'Ningún nodo'}
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

      {/* Tabs */}
      <TabSelector activeTab={internalTab} onTabChange={handleTabChange} />

      {/* Contenido scrollable */}
      {selectedNode ? (
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-6">
            {internalTab === 'styles' ? (
              <>
                <ShapeSection nodeStyle={nodeStyle} onChange={handleChange} />
                <hr className="border-gray-100" />
                <BackgroundColorSection nodeStyle={nodeStyle} onChange={handleChange} />
                <hr className="border-gray-100" />
                <BorderSection nodeStyle={nodeStyle} onChange={handleChange} />
                <hr className="border-gray-100" />
                <LineSection nodeStyle={nodeStyle} onChange={handleChange} />
              </>
            ) : (
              <IconsPanel 
                selectedNode={selectedNode} 
                onIconChange={onIconChange}
              />
            )}
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

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 shrink-0">
        <p className="text-[10px] text-gray-400 text-center">
          💡 Los cambios se aplican automáticamente
        </p>
      </div>
    </div>
  );
};

export default RightStyleSidebar;

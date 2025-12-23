import React from 'react';
import {
  Plus,
  Trash2,
  Undo2,
  Redo2,
  Target,
  FileJson,
  Image,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import UserDropdown from './UserDropdown';

const ToolbarButton = ({ icon, text, onClick, disabled, variant = 'default' }) => {
  const baseStyles = `
    flex items-center gap-2 px-3 py-2 rounded-lg
    text-sm font-medium transition-all duration-150
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const variants = {
    default: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    danger: 'text-red-600 hover:bg-red-50'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]}`}
      title={text}
    >
      {icon}
      <span className="hidden md:inline">{text}</span>
    </button>
  );
};

const Divider = () => (
  <div className="w-px h-6 bg-gray-200 mx-1" />
);

const Toolbar = ({
  onAddNode,
  onDeleteNode,
  onUndo,
  onRedo,
  onCenter,
  onExportJSON,
  onExportPNG,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  canUndo,
  canRedo,
  hasSelection,
  zoom,
  token,
  onRefreshNotifications,
  user,
  onOpenProfile,
  onLogout
}) => {
  return (
    <div className="
      h-16 bg-white border-b border-gray-200
      flex items-center justify-between px-4
      shadow-sm z-20 shrink-0
    ">
      {/* Grupo izquierdo: Acciones principales */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          icon={<Plus size={18} />}
          text="Nodo"
          onClick={onAddNode}
          variant="primary"
        />
        
        <ToolbarButton
          icon={<Trash2 size={18} />}
          text="Eliminar"
          onClick={onDeleteNode}
          disabled={!hasSelection}
          variant="danger"
        />
        
        <Divider />
        
        <ToolbarButton
          icon={<Undo2 size={18} />}
          text="Deshacer"
          onClick={onUndo}
          disabled={!canUndo}
        />
        
        <ToolbarButton
          icon={<Redo2 size={18} />}
          text="Rehacer"
          onClick={onRedo}
          disabled={!canRedo}
        />
        
        <Divider />
        
        <ToolbarButton
          icon={<Target size={18} />}
          text="Centrar"
          onClick={onCenter}
        />
        
        <Divider />
        
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={onZoomOut}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
            title="Alejar"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-xs font-medium text-gray-600 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={onZoomIn}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
            title="Acercar"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={onResetZoom}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
            title="Restablecer zoom"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Grupo derecho: Exportación, Notificaciones y Usuario */}
      <div className="flex items-center gap-2">
        <ToolbarButton
          icon={<FileJson size={18} />}
          text="JSON"
          onClick={onExportJSON}
        />
        
        <ToolbarButton
          icon={<Image size={18} />}
          text="PNG"
          onClick={onExportPNG}
        />

        <Divider />

        {/* Campanita de notificaciones */}
        <NotificationBell
          token={token}
          onRefresh={onRefreshNotifications}
        />

        {/* Avatar y dropdown de usuario */}
        <UserDropdown
          user={user}
          onOpenProfile={onOpenProfile}
          onLogout={onLogout}
        />
      </div>
    </div>
  );
};

export default Toolbar;

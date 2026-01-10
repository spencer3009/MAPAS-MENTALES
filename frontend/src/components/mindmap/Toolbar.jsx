import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Undo2,
  Redo2,
  Target,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlignLeft,
  Users
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import { ActivityBell } from '../activity';
import UserDropdown from './UserDropdown';
import ExportMenu from './ExportMenu';
import { ShareModal } from '../sharing/ShareModal';

// Componente Switch para toggle
const ToggleSwitch = ({ enabled, onChange, label }) => (
  <div className="flex items-center gap-2">
    <button
      onClick={() => onChange(!enabled)}
      className={`
        relative w-11 h-6 rounded-full transition-colors duration-200
        ${enabled ? 'bg-blue-500' : 'bg-gray-300'}
      `}
      title={label}
    >
      <span
        className={`
          absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow
          transition-transform duration-200
          ${enabled ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
    <span className="text-xs text-gray-600 font-medium hidden lg:inline">
      {label}
    </span>
  </div>
);

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

const Divider = ({ className = '' }) => (
  <div className={`w-px h-6 bg-gray-200 mx-1 ${className}`} />
);

const Toolbar = ({
  onAddNode,
  onDeleteNode,
  onUndo,
  onRedo,
  onCenter,
  projectName,
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
  onLogout,
  onAdminClick,
  isAdmin,
  // Alineación automática
  autoAlignEnabled,
  onToggleAutoAlign
}) => {
  return (
    <div className="
      h-14 md:h-16 bg-white border-b border-gray-200
      flex items-center justify-between px-2 md:px-4
      shadow-sm z-20 shrink-0
    ">
      {/* Grupo izquierdo: Acciones principales */}
      <div className="flex items-center gap-0.5 md:gap-1">
        <ToolbarButton
          icon={<Plus size={18} />}
          text="Nodo"
          onClick={onAddNode}
          variant="primary"
        />
        
        <ToolbarButton
          icon={<Trash2 size={18} />}
          text=""
          onClick={onDeleteNode}
          disabled={!hasSelection}
          variant="danger"
        />
        
        <Divider className="hidden md:block" />
        
        <div className="hidden sm:flex items-center gap-0.5 md:gap-1">
          <ToolbarButton
            icon={<Undo2 size={18} />}
            text=""
            onClick={onUndo}
            disabled={!canUndo}
          />
          
          <ToolbarButton
            icon={<Redo2 size={18} />}
            text=""
            onClick={onRedo}
            disabled={!canRedo}
          />
        </div>
        
        <Divider className="hidden md:block" />
        
        <ToolbarButton
          icon={<Target size={18} />}
          text=""
          onClick={onCenter}
        />
        
        <Divider className="hidden md:block" />
        
        <div className="hidden md:flex items-center gap-1 bg-gray-100 rounded-lg p-1">
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

        <Divider className="hidden lg:block" />

        {/* Switch de Alineación Automática - Solo en pantallas grandes */}
        <div className="hidden lg:flex items-center gap-2 px-2">
          <AlignLeft size={16} className={autoAlignEnabled ? 'text-blue-500' : 'text-gray-400'} />
          <ToggleSwitch
            enabled={autoAlignEnabled}
            onChange={onToggleAutoAlign}
            label="Alineación automática"
          />
        </div>
      </div>

      {/* Grupo derecho: Exportación, Notificaciones y Usuario */}
      <div className="flex items-center gap-1 md:gap-2">
        <div className="hidden sm:block">
          <ExportMenu projectName={projectName} />
        </div>

        <Divider className="hidden sm:block" />

        {/* Campanita de actividad/colaboración */}
        <ActivityBell token={token} />

        {/* Campanita de notificaciones de recordatorios */}
        <NotificationBell
          token={token}
          onRefresh={onRefreshNotifications}
        />

        {/* Avatar y dropdown de usuario - Solo desktop */}
        <div className="hidden md:block">
          <UserDropdown
            user={user}
            onOpenProfile={onOpenProfile}
            onLogout={onLogout}
            onAdminClick={onAdminClick}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    </div>
  );
};

export default Toolbar;

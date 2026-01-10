/**
 * ActivityBell - Botón de notificaciones de actividad
 * Muestra un dropdown con el feed de actividad reciente
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Activity, 
  Bell, 
  Check, 
  CheckCheck, 
  X, 
  Settings,
  MessageSquare,
  Users,
  Edit3,
  Trash2,
  UserPlus,
  Link2,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Map,
  LayoutGrid,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { NotificationPreferences } from './NotificationPreferences';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Íconos para cada tipo de acción
const ACTION_ICONS = {
  created: Edit3,
  edited: Edit3,
  deleted: Trash2,
  shared: Link2,
  invited: UserPlus,
  invite_accepted: Users,
  commented: MessageSquare,
  mentioned: MessageSquare,
  collaborator_added: Users,
  collaborator_removed: Users,
  role_changed: Users,
  task_created: CheckCircle2,
  task_completed: CheckCircle2,
  node_added: Edit3,
  restored: RefreshCw,
};

// Colores para cada tipo de acción
const ACTION_COLORS = {
  created: 'text-green-500',
  edited: 'text-blue-500',
  deleted: 'text-red-500',
  shared: 'text-purple-500',
  invited: 'text-amber-500',
  invite_accepted: 'text-green-500',
  commented: 'text-blue-500',
  mentioned: 'text-amber-500',
  collaborator_added: 'text-green-500',
  collaborator_removed: 'text-red-500',
  role_changed: 'text-purple-500',
  task_created: 'text-blue-500',
  task_completed: 'text-green-500',
};

// Íconos para tipos de recursos
const RESOURCE_ICONS = {
  mindmap: Map,
  board: LayoutGrid,
  contact: Users,
  reminder: Bell,
};

export function ActivityBell({ token }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activities, setActivities] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const getAuthHeaders = useCallback(() => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }, [token]);

  // Cargar contador de no leídos
  const loadUnreadCount = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_URL}/api/activity/unread-count`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unread_count || 0);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  }, [token, getAuthHeaders]);

  // Cargar actividades
  const loadActivities = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/activity/feed?limit=20`,
        { headers: getAuthHeaders() }
      );
      
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  }, [token, getAuthHeaders]);

  // Marcar todas como leídas
  const markAllAsRead = useCallback(async () => {
    if (!token) return;
    
    try {
      await fetch(`${API_URL}/api/activity/mark-read`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ activity_ids: null }),
      });
      
      setUnreadCount(0);
      setActivities(prev => prev.map(a => ({ ...a, is_read: true })));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, [token, getAuthHeaders]);

  // Cargar contador al montar y periódicamente
  useEffect(() => {
    loadUnreadCount();
    
    // Auto-refresh cada 60 segundos
    const interval = setInterval(loadUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  // Manejar apertura del dropdown
  const handleOpen = async () => {
    setIsOpen(true);
    await loadActivities();
  };

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      handleOpen();
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
      <div className="relative">
        {/* Botón de actividad */}
        <button
          ref={buttonRef}
          onClick={handleToggle}
          className={`
            relative p-2 rounded-lg transition-all duration-200
            ${isOpen 
              ? 'bg-purple-100 text-purple-600' 
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
            }
          `}
          title={unreadCount > 0 ? `${unreadCount} actividades nuevas` : 'Actividad'}
          data-testid="activity-bell-btn"
        >
          <Activity size={20} />
          
          {/* Badge numérico */}
          {unreadCount > 0 && (
            <span className="
              absolute -top-1 -right-1
              min-w-[18px] h-[18px]
              bg-purple-500 text-white
              text-[10px] font-bold
              rounded-full
              flex items-center justify-center
              px-1
              shadow-sm
              animate-pulse
            ">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Dropdown - Fixed position para evitar ser cortado por el header */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="
            fixed
            w-[calc(100vw-2rem)] sm:w-96
            max-w-[400px]
            bg-white rounded-xl shadow-2xl
            border border-gray-200
            overflow-hidden
            animate-in fade-in slide-in-from-top-2
            duration-200
          "
          style={{ 
            zIndex: 9999,
            top: buttonRef.current ? buttonRef.current.getBoundingClientRect().bottom + 8 : 60,
            right: 16,
            maxHeight: 'calc(100vh - 100px)'
          }}
          data-testid="activity-dropdown"
        >
            {/* Header del dropdown */}
            <div className="
              flex items-center justify-between
              px-4 py-3
              bg-gradient-to-r from-purple-50 to-blue-50
              border-b border-gray-100
            ">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-purple-500" />
                <h3 className="font-semibold text-gray-800 text-sm">
                  Actividad Reciente
                </h3>
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="
                      p-1.5 rounded-lg
                      text-gray-400 hover:text-purple-600
                      hover:bg-purple-50
                      transition-colors
                    "
                    title="Marcar todo como leído"
                  >
                    <CheckCheck size={16} />
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowPreferences(true);
                  }}
                  className="
                    p-1.5 rounded-lg
                    text-gray-400 hover:text-gray-600
                    hover:bg-gray-100
                    transition-colors
                  "
                  title="Preferencias de notificación"
                  data-testid="notification-preferences-btn"
                >
                  <Settings size={16} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="
                    p-1.5 rounded-lg
                    text-gray-400 hover:text-gray-600
                    hover:bg-gray-100
                    transition-colors
                  "
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Lista de actividades */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-purple-500" />
                </div>
              ) : activities.length === 0 ? (
                <div className="
                  flex flex-col items-center justify-center
                  py-8 px-4
                  text-gray-400
                ">
                  <Activity size={32} className="mb-2 opacity-50" />
                  <p className="text-sm font-medium">No hay actividad reciente</p>
                  <p className="text-xs mt-1">La actividad de colaboración aparecerá aquí</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {activities.map((activity) => {
                    const ActionIcon = ACTION_ICONS[activity.action] || Activity;
                    const ResourceIcon = RESOURCE_ICONS[activity.resource_type] || Activity;
                    const actionColor = ACTION_COLORS[activity.action] || 'text-gray-500';

                    return (
                      <div
                        key={activity.id}
                        className={`
                          px-4 py-3
                          hover:bg-gray-50
                          transition-colors
                          cursor-default
                          ${!activity.is_read ? 'bg-purple-50/30' : ''}
                        `}
                      >
                        <div className="flex gap-3">
                          {/* Avatar */}
                          <Avatar className="w-8 h-8 flex-shrink-0">
                            <AvatarImage src={activity.actor?.picture} />
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-xs">
                              {getInitials(activity.actor?.full_name)}
                            </AvatarFallback>
                          </Avatar>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800">
                              <span className="font-medium">
                                {activity.actor?.full_name || activity.actor?.username}
                              </span>{' '}
                              <span className="text-gray-600">
                                {activity.message}
                              </span>
                            </p>

                            <div className="flex items-center gap-2 mt-1">
                              <ActionIcon className={`w-3 h-3 ${actionColor}`} />
                              <span className="text-xs text-gray-400">
                                {activity.human_time}
                              </span>
                              {!activity.is_read && (
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                              )}
                            </div>
                          </div>

                          {/* Resource Icon */}
                          <div className="flex-shrink-0">
                            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                              <ResourceIcon className="w-3.5 h-3.5 text-gray-500" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {activities.length > 0 && (
              <div className="
                px-4 py-2
                bg-gray-50
                border-t border-gray-100
              ">
                <button
                  onClick={loadActivities}
                  disabled={loading}
                  className="
                    w-full py-2
                    text-xs font-medium
                    text-purple-600 hover:text-purple-700
                    hover:bg-purple-50
                    rounded-lg
                    transition-colors
                    disabled:opacity-50
                    flex items-center justify-center gap-2
                  "
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                  {loading ? 'Actualizando...' : 'Actualizar'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de preferencias */}
      <NotificationPreferences
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
      />
    </>
  );
}

export default ActivityBell;

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, Clock, CheckCircle, X, FileText, Calendar, Loader2 } from 'lucide-react';

const ITEMS_PER_PAGE = 20;

const NotificationBell = ({ 
  token,
  onRefresh 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);

  // Use relative URLs for production compatibility
const API_URL = '';

  // Cargar contador de no vistos
  const loadUnseenCount = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_URL}/api/notifications/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUnseenCount(data.unseen_count);
      }
    } catch (error) {
      console.error('Error loading notification stats:', error);
    }
  }, [token, API_URL]);

  // Cargar notificaciones con paginación
  const loadNotifications = useCallback(async (reset = false) => {
    if (!token) return;
    
    const currentSkip = reset ? 0 : skip;
    
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const response = await fetch(
        `${API_URL}/api/notifications/completed?skip=${currentSkip}&limit=${ITEMS_PER_PAGE}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        if (reset) {
          setNotifications(data.reminders);
          setSkip(ITEMS_PER_PAGE);
        } else {
          setNotifications(prev => [...prev, ...data.reminders]);
          setSkip(prev => prev + ITEMS_PER_PAGE);
        }
        
        setHasMore(data.has_more);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [token, skip, API_URL]);

  // Marcar notificaciones como vistas
  const markAsSeen = useCallback(async (reminderIds) => {
    if (!token || reminderIds.length === 0) return;
    
    try {
      await fetch(`${API_URL}/api/notifications/mark-seen`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reminder_ids: reminderIds })
      });
      
      // Actualizar contador local
      setUnseenCount(prev => Math.max(0, prev - reminderIds.length));
      
      // Actualizar estado local de notificaciones
      setNotifications(prev => prev.map(n => 
        reminderIds.includes(n.id) ? { ...n, seen: true } : n
      ));
    } catch (error) {
      console.error('Error marking notifications as seen:', error);
    }
  }, [token, API_URL]);

  // Cargar contador al montar y periódicamente
  useEffect(() => {
    loadUnseenCount();
    
    // Auto-refresh cada 30 segundos
    const interval = setInterval(loadUnseenCount, 30000);
    return () => clearInterval(interval);
  }, [loadUnseenCount]);

  // Manejar apertura del dropdown
  const handleOpen = useCallback(async () => {
    setIsOpen(true);
    setSkip(0);
    await loadNotifications(true);
    
    // Marcar las notificaciones no vistas como vistas después de cargar
    setTimeout(async () => {
      const unseenIds = notifications
        .filter(n => !n.seen)
        .map(n => n.id);
      
      if (unseenIds.length > 0) {
        await markAsSeen(unseenIds);
      }
    }, 500);
  }, [loadNotifications, notifications, markAsSeen]);

  // Efecto para marcar como vistas cuando se cargan nuevas notificaciones
  useEffect(() => {
    if (isOpen && notifications.length > 0) {
      const unseenIds = notifications
        .filter(n => !n.seen)
        .map(n => n.id);
      
      if (unseenIds.length > 0) {
        markAsSeen(unseenIds);
      }
    }
  }, [isOpen, notifications, markAsSeen]);

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

  // Scroll infinito
  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    
    // Cargar más cuando llegue cerca del final
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      if (hasMore && !loadingMore && !loading) {
        loadNotifications(false);
      }
    }
  }, [hasMore, loadingMore, loading, loadNotifications]);

  // Formatear fecha para mostrar
  const formatDate = (dateString) => {
    if (!dateString) return 'Sin fecha';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Sin fecha';
    }
  };

  // Formatear fecha programada original
  const formatScheduledDate = (date, time) => {
    if (!date || !time) return 'Sin programar';
    try {
      return `${date} a las ${time}`;
    } catch {
      return 'Sin programar';
    }
  };

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      handleOpen();
    }
  };

  const handleRefresh = async () => {
    setSkip(0);
    await loadNotifications(true);
    await loadUnseenCount();
    if (onRefresh) onRefresh();
  };

  return (
    <div className="relative">
      {/* Botón de la campanita */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className={`
          relative p-2 rounded-lg transition-all duration-200
          ${isOpen 
            ? 'bg-blue-100 text-blue-600' 
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
          }
        `}
        title={unseenCount > 0 ? `${unseenCount} notificaciones nuevas` : 'Notificaciones'}
      >
        <Bell size={20} />
        
        {/* Badge numérico - solo se muestra si hay no vistos */}
        {unseenCount > 0 && (
          <span className="
            absolute -top-1 -right-1
            min-w-[18px] h-[18px]
            bg-red-500 text-white
            text-[10px] font-bold
            rounded-full
            flex items-center justify-center
            px-1
            shadow-sm
            animate-pulse
          ">
            {unseenCount > 99 ? '99+' : unseenCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="
            absolute right-0 top-full mt-2
            w-[calc(100vw-2rem)] sm:w-96
            max-w-[400px]
            bg-white rounded-xl shadow-xl
            border border-gray-200
            overflow-hidden
            z-[100]
            animate-in fade-in slide-in-from-top-2
            duration-200
          "
          style={{ maxHeight: 'calc(100vh - 100px)' }}
        >
          {/* Header del dropdown */}
          <div className="
            flex items-center justify-between
            px-4 py-3
            bg-gradient-to-r from-blue-50 to-purple-50
            border-b border-gray-100
          ">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-green-500" />
              <h3 className="font-semibold text-gray-800 text-sm">
                Recordatorios Cumplidos
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <span className="
                  bg-green-100 text-green-700
                  text-xs font-medium
                  px-2 py-0.5 rounded-full
                ">
                  {notifications.length}
                </span>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="
                  p-1 rounded-lg
                  text-gray-400 hover:text-gray-600
                  hover:bg-gray-100
                  transition-colors
                "
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Lista de notificaciones con scroll */}
          <div 
            ref={listRef}
            className="max-h-80 overflow-y-auto"
            onScroll={handleScroll}
          >
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-blue-500" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="
                flex flex-col items-center justify-center
                py-8 px-4
                text-gray-400
              ">
                <Bell size={32} className="mb-2 opacity-50" />
                <p className="text-sm font-medium">No hay recordatorios cumplidos</p>
                <p className="text-xs mt-1">Los recordatorios enviados aparecerán aquí</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((reminder) => (
                  <div
                    key={reminder.id}
                    className={`
                      px-4 py-3
                      hover:bg-gray-50
                      transition-colors
                      cursor-default
                      ${!reminder.seen ? 'bg-blue-50/30' : ''}
                    `}
                  >
                    {/* Tipo y estado */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        {reminder.type === 'project' ? (
                          <span className="
                            inline-flex items-center gap-1
                            text-xs font-medium
                            text-purple-600 bg-purple-50
                            px-2 py-0.5 rounded-full
                          ">
                            <FileText size={10} />
                            Proyecto
                          </span>
                        ) : (
                          <span className="
                            inline-flex items-center gap-1
                            text-xs font-medium
                            text-blue-600 bg-blue-50
                            px-2 py-0.5 rounded-full
                          ">
                            <Clock size={10} />
                            Nodo
                          </span>
                        )}
                        {!reminder.seen && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full" title="Nuevo" />
                        )}
                      </div>
                      <span className="
                        inline-flex items-center gap-1
                        text-xs font-medium
                        text-green-600 bg-green-50
                        px-2 py-0.5 rounded-full
                      ">
                        <CheckCircle size={10} />
                        Enviado
                      </span>
                    </div>

                    {/* Título/Mensaje */}
                    <p className="
                      text-sm font-medium text-gray-800
                      line-clamp-2 mb-1
                    ">
                      {reminder.message || 'Sin mensaje'}
                    </p>

                    {/* Proyecto */}
                    <p className="text-xs text-gray-500 mb-1.5">
                      📁 {reminder.project_name || 'Proyecto desconocido'}
                      {reminder.node_text && (
                        <span className="ml-1">• 📌 {reminder.node_text}</span>
                      )}
                    </p>

                    {/* Fechas */}
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        Programado: {formatScheduledDate(reminder.scheduled_date, reminder.scheduled_time)}
                      </span>
                    </div>
                    {reminder.sent_at && (
                      <div className="text-xs text-green-500 mt-1">
                        ✓ Enviado: {formatDate(reminder.sent_at)}
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Indicador de carga para scroll infinito */}
                {loadingMore && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 size={20} className="animate-spin text-blue-500" />
                    <span className="ml-2 text-sm text-gray-500">Cargando más...</span>
                  </div>
                )}
                
                {/* Mensaje cuando no hay más */}
                {!hasMore && notifications.length > 0 && (
                  <div className="text-center py-3 text-xs text-gray-400">
                    No hay más notificaciones
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer con acción */}
          {notifications.length > 0 && (
            <div className="
              px-4 py-2
              bg-gray-50
              border-t border-gray-100
            ">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="
                  w-full py-2
                  text-xs font-medium
                  text-blue-600 hover:text-blue-700
                  hover:bg-blue-50
                  rounded-lg
                  transition-colors
                  disabled:opacity-50
                "
              >
                {loading ? 'Actualizando...' : 'Actualizar notificaciones'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

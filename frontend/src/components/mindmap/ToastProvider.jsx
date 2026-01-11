import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { Bell, X, Clock, CheckCircle, AlertTriangle, Calendar, ChevronRight } from 'lucide-react';

// Use relative URLs for production compatibility
const API_URL = '';

// Contexto para el sistema de notificaciones global
const NotificationContext = createContext(null);

// Hook para usar las notificaciones
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Sonido de notificación (base64 encoded short beep)
const NOTIFICATION_SOUND = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7v/////////////////////////////////' + 
'//////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';

// Componente de Toast elegante
const Toast = ({ notification, onDismiss, onViewDetails }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const duration = 10000; // 10 segundos
  
  useEffect(() => {
    // Barra de progreso
    const interval = setInterval(() => {
      setProgress(prev => Math.max(0, prev - (100 / (duration / 100))));
    }, 100);
    
    // Auto-dismiss
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);
  
  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(notification), 300);
  };
  
  const handleViewDetails = () => {
    onViewDetails(notification);
    handleDismiss();
  };
  
  const formatTime = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };
  
  return (
    <div
      className={`
        transform transition-all duration-300 ease-out
        ${isExiting ? 'translate-x-full opacity-0 scale-95' : 'translate-x-0 opacity-100 scale-100'}
      `}
    >
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden w-[360px]">
        {/* Header elegante */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                <Bell size={16} className="text-white" />
              </div>
              <span className="text-white font-medium text-sm">Recordatorio</span>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={16} className="text-white/70" />
            </button>
          </div>
        </div>
        
        {/* Contenido */}
        <div className="p-4">
          <h4 className="font-semibold text-gray-800 text-sm mb-1 line-clamp-2">
            {notification.title || notification.message || 'Sin título'}
          </h4>
          
          {notification.description && (
            <p className="text-gray-500 text-xs mb-2 line-clamp-2">
              {notification.description}
            </p>
          )}
          
          <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>{formatTime(notification.reminder_date || notification.scheduled_datetime)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={12} />
              <span>
                {new Date(notification.reminder_date || notification.scheduled_datetime).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short'
                })}
              </span>
            </div>
          </div>
          
          {/* Botón Ver detalles */}
          <button
            onClick={handleViewDetails}
            className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            Ver detalles
            <ChevronRight size={16} />
          </button>
        </div>
        
        {/* Barra de progreso */}
        <div className="h-1 bg-gray-100">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// Componente de Toast agrupado (múltiples recordatorios)
const GroupedToast = ({ count, onDismiss, onViewAll }) => {
  const [isExiting, setIsExiting] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, 15000);
    
    return () => clearTimeout(timer);
  }, []);
  
  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(), 300);
  };
  
  return (
    <div
      className={`
        transform transition-all duration-300 ease-out
        ${isExiting ? 'translate-x-full opacity-0 scale-95' : 'translate-x-0 opacity-100 scale-100'}
      `}
    >
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden w-[360px]">
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                <Bell size={16} className="text-white" />
              </div>
              <span className="text-white font-medium text-sm">Recordatorios</span>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={16} className="text-white/70" />
            </button>
          </div>
        </div>
        
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <span className="text-xl font-bold text-blue-600">{count}</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 text-sm">
                Tienes {count} recordatorios vencidos
              </h4>
              <p className="text-gray-500 text-xs">
                Haz clic para verlos todos
              </p>
            </div>
          </div>
          
          <button
            onClick={() => {
              onViewAll();
              handleDismiss();
            }}
            className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            Ver todos los recordatorios
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Provider principal del sistema de notificaciones
export const NotificationProvider = ({ children, token, onNavigateToReminders }) => {
  const [currentToast, setCurrentToast] = useState(null);
  const [toastQueue, setToastQueue] = useState([]);
  const [triggeredIds, setTriggeredIds] = useState(new Set());
  const audioRef = useRef(null);
  const checkIntervalRef = useRef(null);
  
  // Inicializar audio
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.volume = 0.3;
  }, []);
  
  // Reproducir sonido
  const playSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Silently fail if autoplay is blocked
      });
    }
  }, []);
  
  // Marcar recordatorio como triggered en backend
  const markAsTriggered = useCallback(async (reminderId) => {
    if (!token) return;
    
    try {
      await fetch(`${API_URL}/api/reminders/${reminderId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notification_status: 'triggered' })
      });
    } catch (error) {
      console.error('Error marking reminder as triggered:', error);
    }
  }, [token]);
  
  // Marcar recordatorio como read
  const markAsRead = useCallback(async (reminderId) => {
    if (!token) return;
    
    try {
      await fetch(`${API_URL}/api/reminders/${reminderId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notification_status: 'read' })
      });
    } catch (error) {
      console.error('Error marking reminder as read:', error);
    }
  }, [token]);
  
  // Verificar recordatorios vencidos
  const checkReminders = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_URL}/api/reminders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) return;
      
      const reminders = await response.json();
      const now = new Date();
      
      // Filtrar recordatorios que acaban de vencer y no han sido notificados
      const newlyDue = reminders.filter(r => {
        if (r.is_completed) return false;
        if (r.notification_status === 'triggered' || r.notification_status === 'read') return false;
        if (triggeredIds.has(r.id)) return false;
        
        try {
          const reminderDate = new Date(r.reminder_date || r.scheduled_datetime);
          return !isNaN(reminderDate.getTime()) && reminderDate <= now;
        } catch {
          return false;
        }
      });
      
      if (newlyDue.length === 0) return;
      
      // Agregar a IDs ya procesados
      const newTriggeredIds = new Set(triggeredIds);
      newlyDue.forEach(r => {
        newTriggeredIds.add(r.id);
        markAsTriggered(r.id);
      });
      setTriggeredIds(newTriggeredIds);
      
      // Reproducir sonido solo una vez
      playSound();
      
      // Si hay múltiples, mostrar toast agrupado
      if (newlyDue.length > 1) {
        setToastQueue(prev => [...prev, { type: 'grouped', count: newlyDue.length }]);
      } else {
        // Si solo hay uno, mostrarlo individual
        setToastQueue(prev => [...prev, { type: 'single', reminder: newlyDue[0] }]);
      }
      
    } catch (error) {
      console.error('Error checking reminders:', error);
    }
  }, [token, triggeredIds, markAsTriggered, playSound]);
  
  // Procesar cola de toasts (máximo 1 a la vez)
  useEffect(() => {
    if (!currentToast && toastQueue.length > 0) {
      setCurrentToast(toastQueue[0]);
      setToastQueue(prev => prev.slice(1));
    }
  }, [currentToast, toastQueue]);
  
  // Verificar recordatorios periódicamente
  useEffect(() => {
    if (!token) return;
    
    // Verificar inmediatamente al cargar
    checkReminders();
    
    // Verificar cada 30 segundos
    checkIntervalRef.current = setInterval(checkReminders, 30000);
    
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [token, checkReminders]);
  
  // Manejar dismiss de toast individual
  const handleDismissSingle = useCallback((notification) => {
    setCurrentToast(null);
    if (notification?.id) {
      markAsRead(notification.id);
    }
  }, [markAsRead]);
  
  // Manejar dismiss de toast agrupado
  const handleDismissGrouped = useCallback(() => {
    setCurrentToast(null);
  }, []);
  
  // Manejar "Ver detalles"
  const handleViewDetails = useCallback((notification) => {
    if (notification?.id) {
      markAsRead(notification.id);
    }
    if (onNavigateToReminders) {
      onNavigateToReminders(notification?.id);
    }
  }, [markAsRead, onNavigateToReminders]);
  
  // Manejar "Ver todos"
  const handleViewAll = useCallback(() => {
    if (onNavigateToReminders) {
      onNavigateToReminders();
    }
  }, [onNavigateToReminders]);
  
  // Funciones públicas del contexto
  const showSuccess = useCallback((message) => {
    playSound();
    setToastQueue(prev => [...prev, { 
      type: 'success', 
      message,
      id: Date.now()
    }]);
  }, [playSound]);
  
  return (
    <NotificationContext.Provider value={{ showSuccess, checkReminders }}>
      {children}
      
      {/* Contenedor de Toast - Esquina inferior derecha */}
      <div className="fixed bottom-6 right-6 z-[9999]">
        {currentToast && currentToast.type === 'single' && (
          <Toast
            notification={currentToast.reminder}
            onDismiss={handleDismissSingle}
            onViewDetails={handleViewDetails}
          />
        )}
        
        {currentToast && currentToast.type === 'grouped' && (
          <GroupedToast
            count={currentToast.count}
            onDismiss={handleDismissGrouped}
            onViewAll={handleViewAll}
          />
        )}
        
        {currentToast && currentToast.type === 'success' && (
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden w-[320px] animate-in slide-in-from-right">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-white" />
                <span className="text-white font-medium text-sm">Éxito</span>
              </div>
              <button
                onClick={() => setCurrentToast(null)}
                className="p-1 hover:bg-white/10 rounded-lg"
              >
                <X size={14} className="text-white/70" />
              </button>
            </div>
            <div className="p-3">
              <p className="text-gray-700 text-sm">{currentToast.message}</p>
            </div>
          </div>
        )}
      </div>
    </NotificationContext.Provider>
  );
};

// Export legacy hooks for compatibility
export const useToast = () => {
  const context = useContext(NotificationContext);
  return {
    showReminder: () => {},
    showSuccess: context?.showSuccess || (() => {}),
    showWarning: () => {}
  };
};

export default NotificationProvider;

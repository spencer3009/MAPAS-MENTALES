import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Bell, X, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

// Contexto para el sistema de Toast
const ToastContext = createContext(null);

// Hook para usar el toast
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Componente individual de Toast
const Toast = ({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);
  
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => onDismiss(toast.id), 300);
      }, toast.duration);
      
      return () => clearTimeout(timer);
    }
  }, [toast, onDismiss]);
  
  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 300);
  };
  
  const getIcon = () => {
    switch (toast.type) {
      case 'reminder':
        return <Bell className="text-white" size={20} />;
      case 'success':
        return <CheckCircle className="text-white" size={20} />;
      case 'warning':
        return <AlertTriangle className="text-white" size={20} />;
      default:
        return <Clock className="text-white" size={20} />;
    }
  };
  
  const getBgColor = () => {
    switch (toast.type) {
      case 'reminder':
        return 'bg-gradient-to-r from-orange-500 to-red-500';
      case 'success':
        return 'bg-gradient-to-r from-green-500 to-emerald-500';
      case 'warning':
        return 'bg-gradient-to-r from-yellow-500 to-orange-500';
      default:
        return 'bg-gradient-to-r from-blue-500 to-indigo-500';
    }
  };
  
  return (
    <div
      className={`
        transform transition-all duration-300 ease-out
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
      `}
    >
      <div className={`
        ${getBgColor()}
        rounded-xl shadow-2xl p-4 min-w-[320px] max-w-[400px]
        flex items-start gap-3
        animate-in slide-in-from-right
      `}>
        <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-white text-sm">
              {toast.title || 'Recordatorio'}
            </h4>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={16} className="text-white/80" />
            </button>
          </div>
          
          {toast.message && (
            <p className="text-white/90 text-sm mt-1 line-clamp-2">
              {toast.message}
            </p>
          )}
          
          {toast.time && (
            <div className="flex items-center gap-1 mt-2 text-white/70 text-xs">
              <Clock size={12} />
              <span>{toast.time}</span>
            </div>
          )}
          
          {toast.action && (
            <button
              onClick={() => {
                toast.action.onClick();
                handleDismiss();
              }}
              className="mt-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg transition-colors"
            >
              {toast.action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Provider del sistema de Toast
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  
  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { ...toast, id }]);
    return id;
  }, []);
  
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  
  const showReminder = useCallback((reminder) => {
    const time = new Date(reminder.reminder_date);
    return addToast({
      type: 'reminder',
      title: '🔔 Recordatorio',
      message: reminder.title,
      time: time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      duration: 10000, // 10 segundos
      action: {
        label: 'Ver detalles',
        onClick: () => console.log('Ver recordatorio:', reminder.id)
      }
    });
  }, [addToast]);
  
  const showSuccess = useCallback((message, duration = 5000) => {
    return addToast({
      type: 'success',
      title: 'Éxito',
      message,
      duration
    });
  }, [addToast]);
  
  const showWarning = useCallback((message, duration = 7000) => {
    return addToast({
      type: 'warning',
      title: 'Atención',
      message,
      duration
    });
  }, [addToast]);
  
  return (
    <ToastContext.Provider value={{ addToast, removeToast, showReminder, showSuccess, showWarning }}>
      {children}
      
      {/* Contenedor de Toasts - Esquina inferior derecha */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3">
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;

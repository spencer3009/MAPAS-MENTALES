import React, { useState, useRef, useEffect } from 'react';
import { Bell, Clock, CheckCircle, X, FileText, Calendar } from 'lucide-react';

const NotificationBell = ({ completedReminders = [], onRefresh }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

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

  const count = completedReminders.length;

  return (
    <div className="relative">
      {/* Botón de la campanita */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative p-2 rounded-lg transition-all duration-200
          ${isOpen 
            ? 'bg-blue-100 text-blue-600' 
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
          }
        `}
        title={count > 0 ? `${count} recordatorios cumplidos` : 'Notificaciones'}
      >
        <Bell size={20} />
        
        {/* Badge numérico */}
        {count > 0 && (
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
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="
            absolute right-0 top-full mt-2
            w-80 sm:w-96
            bg-white rounded-xl shadow-xl
            border border-gray-200
            overflow-hidden
            z-50
            animate-in fade-in slide-in-from-top-2
            duration-200
          "
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
              {count > 0 && (
                <span className="
                  bg-green-100 text-green-700
                  text-xs font-medium
                  px-2 py-0.5 rounded-full
                ">
                  {count}
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

          {/* Lista de recordatorios */}
          <div className="max-h-80 overflow-y-auto">
            {count === 0 ? (
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
                {completedReminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="
                      px-4 py-3
                      hover:bg-gray-50
                      transition-colors
                      cursor-default
                    "
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
              </div>
            )}
          </div>

          {/* Footer con acción */}
          {count > 0 && onRefresh && (
            <div className="
              px-4 py-2
              bg-gray-50
              border-t border-gray-100
            ">
              <button
                onClick={() => {
                  onRefresh();
                  setIsOpen(false);
                }}
                className="
                  w-full py-2
                  text-xs font-medium
                  text-blue-600 hover:text-blue-700
                  hover:bg-blue-50
                  rounded-lg
                  transition-colors
                "
              >
                Actualizar notificaciones
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

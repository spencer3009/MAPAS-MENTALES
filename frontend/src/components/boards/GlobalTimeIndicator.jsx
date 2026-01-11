import React, { useState } from 'react';
import { Clock, X, Square } from 'lucide-react';
import { useTimeTracking } from '../../contexts/TimeTrackingContext';

// Use relative URLs for production compatibility
const API_URL = '';

const GlobalTimeIndicator = ({ onOpenTask }) => {
  const { activeEntry, elapsedTime, isTracking, formattedTime, stopTracking } = useTimeTracking();
  const [showPopup, setShowPopup] = useState(false);
  const [stopping, setStopping] = useState(false);

  if (!isTracking) return null;

  const handleStop = async (e) => {
    e.stopPropagation();
    setStopping(true);
    await stopTracking();
    setStopping(false);
    setShowPopup(false);
  };

  const handleOpenTask = () => {
    if (onOpenTask && activeEntry) {
      onOpenTask(activeEntry.board_id, activeEntry.task_id);
    }
    setShowPopup(false);
  };

  return (
    <>
      {/* Botón rojo en el header */}
      <button
        onClick={() => setShowPopup(!showPopup)}
        className="flex items-center gap-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full font-mono text-sm font-semibold transition-all shadow-lg animate-pulse"
        data-testid="global-time-indicator"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
        </span>
        <Clock size={14} />
        <span>{formattedTime}</span>
      </button>

      {/* Popup flotante */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-start justify-end pt-16 pr-4">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/20" 
            onClick={() => setShowPopup(false)}
          />
          
          {/* Popup */}
          <div className="relative bg-white rounded-xl shadow-2xl w-80 overflow-hidden border border-gray-200 animate-in slide-in-from-top-2">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Clock size={18} />
                  Registro del Tiempo
                </h3>
                <button 
                  onClick={() => setShowPopup(false)}
                  className="p-1 hover:bg-white/20 rounded"
                >
                  <X size={16} />
                </button>
              </div>
              
              {/* Tiempo grande */}
              <div className="text-center py-3">
                <div className="text-4xl font-mono font-bold">{formattedTime}</div>
                <p className="text-red-100 text-sm mt-1">Tiempo Total</p>
              </div>
            </div>

            {/* Contenido */}
            <div className="p-4 space-y-4">
              {/* Tarea actual */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Tarea actual</p>
                <p 
                  className="font-medium text-gray-800 cursor-pointer hover:text-cyan-600 transition-colors"
                  onClick={handleOpenTask}
                >
                  {activeEntry?.task_title || 'Tarea sin nombre'}
                </p>
              </div>

              {/* Indicador visual */}
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span>Registrando tiempo...</span>
              </div>

              {/* Botones */}
              <div className="flex gap-2">
                <button
                  onClick={handleOpenTask}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Ver tarea
                </button>
                <button
                  onClick={handleStop}
                  disabled={stopping}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {stopping ? (
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                  ) : (
                    <>
                      <Square size={14} fill="white" />
                      Detener
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GlobalTimeIndicator;

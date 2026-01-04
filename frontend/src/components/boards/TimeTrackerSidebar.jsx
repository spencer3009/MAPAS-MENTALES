import React, { useState, useEffect, useCallback } from 'react';
import { Play, Square, Clock, TrendingUp, Users, Timer, ChevronDown, ChevronUp } from 'lucide-react';
import { useTimeTracking } from '../../contexts/TimeTrackingContext';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

/**
 * TimeTrackerSidebar - Versión compacta del registro de tiempo para el sidebar del modal
 * Siempre visible con contador 00:00:00
 * Se expande al presionar Play mostrando estadísticas
 */
const TimeTrackerSidebar = ({ taskId, boardId, listId, taskTitle, onTimeUpdate }) => {
  const { 
    activeEntry, 
    elapsedTime, 
    isTracking, 
    formattedTime, 
    startTracking, 
    stopTracking, 
    isTaskTracking,
    refreshActiveEntry
  } = useTimeTracking();
  
  const [totalTime, setTotalTime] = useState(0);
  const [weeklyData, setWeeklyData] = useState([]);
  const [userTotals, setUserTotals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const token = localStorage.getItem('mm_auth_token');
  
  const isThisTaskTracking = isTaskTracking(taskId);

  // Formatear tiempo
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cargar datos de la tarea
  const loadTaskData = useCallback(async () => {
    if (!taskId || !token) return;
    
    try {
      const entriesRes = await fetch(`${API_URL}/api/time-tracking/task/${taskId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (entriesRes.ok) {
        const data = await entriesRes.json();
        setTotalTime(data.total_seconds || 0);
        setUserTotals(data.user_totals || []);
      }
      
      const weeklyRes = await fetch(`${API_URL}/api/time-tracking/task/${taskId}/weekly`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (weeklyRes.ok) {
        const weeklyDataResponse = await weeklyRes.json();
        setWeeklyData(weeklyDataResponse.chart_data || []);
      }
    } catch (error) {
      console.error('Error loading time data:', error);
    } finally {
      setLoading(false);
    }
  }, [taskId, token]);

  useEffect(() => {
    loadTaskData();
  }, [loadTaskData]);

  // Auto-expandir cuando está tracking
  useEffect(() => {
    if (isThisTaskTracking) {
      setShowStats(true);
    }
  }, [isThisTaskTracking]);

  const handleStart = async () => {
    const entry = await startTracking(taskId, boardId, listId, taskTitle);
    if (entry) {
      setShowStats(true);
      if (onTimeUpdate) onTimeUpdate();
    }
  };

  const handleStop = async () => {
    const result = await stopTracking();
    if (result) {
      setTotalTime(prev => prev + elapsedTime);
      loadTaskData();
      if (onTimeUpdate) onTimeUpdate();
    }
  };

  const displayTime = isThisTaskTracking ? elapsedTime : 0;
  const totalDisplayTime = totalTime + displayTime;

  // Calcular máximo para gráfica
  const maxChartValue = Math.max(
    ...weeklyData.map(d => Math.max(d.my_time, d.others_time)),
    3600
  );

  const secondsToHours = (s) => (s / 3600).toFixed(1);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-cyan-50 rounded-xl p-4 animate-pulse">
        <div className="h-16 bg-slate-200 rounded"></div>
      </div>
    );
  }

  return (
    <div 
      className={`rounded-xl overflow-hidden transition-all duration-300 ${
        isThisTaskTracking 
          ? 'bg-gradient-to-br from-red-50 to-orange-50 ring-2 ring-red-200' 
          : 'bg-gradient-to-br from-slate-50 to-cyan-50'
      }`}
      data-testid="time-tracker-sidebar"
    >
      {/* Sección principal - SIEMPRE VISIBLE */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
            isThisTaskTracking ? 'bg-red-100' : 'bg-cyan-100'
          }`}>
            <Clock className={`w-4 h-4 ${isThisTaskTracking ? 'text-red-600' : 'text-cyan-600'}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-800">Registro de Tiempo</h3>
          </div>
          {isThisTaskTracking && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
          )}
        </div>

        {/* Contador Principal y Botón */}
        <div className={`rounded-lg p-3 ${
          isThisTaskTracking ? 'bg-white/70' : 'bg-white'
        } shadow-sm`}>
          <div className="flex items-center gap-3">
            {/* Botón Play/Stop */}
            <button
              onClick={isThisTaskTracking ? handleStop : handleStart}
              disabled={isTracking && !isThisTaskTracking}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                isThisTaskTracking 
                  ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' 
                  : isTracking 
                    ? 'bg-gray-300'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700'
              }`}
              data-testid="time-toggle-btn"
            >
              {isThisTaskTracking ? (
                <Square className="w-5 h-5 text-white" fill="white" />
              ) : (
                <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
              )}
            </button>
            
            {/* Tiempo actual - SIEMPRE VISIBLE */}
            <div className="flex-1">
              <div className={`text-2xl font-mono font-bold tracking-tight ${
                isThisTaskTracking ? 'text-red-600' : 'text-gray-800'
              }`}>
                {formatTime(displayTime)}
              </div>
              <p className="text-[11px] text-gray-500 leading-tight">
                {isThisTaskTracking 
                  ? '⏱️ Registrando tiempo...' 
                  : isTracking 
                    ? '⚠️ Hay otro registro activo'
                    : '▶️ Presiona play para iniciar'
                }
              </p>
            </div>
          </div>
          
          {/* Tiempo total acumulado */}
          {totalTime > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">Tiempo total:</span>
              <span className="text-sm font-mono font-semibold text-cyan-600">
                {formatTime(totalDisplayTime)}
              </span>
            </div>
          )}
        </div>
        
        {/* Botón para mostrar/ocultar estadísticas */}
        {(totalTime > 0 || userTotals.length > 0 || weeklyData.some(d => d.my_time > 0 || d.others_time > 0)) && (
          <button
            onClick={() => setShowStats(!showStats)}
            className="w-full mt-3 flex items-center justify-center gap-1 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-lg transition-colors"
          >
            {showStats ? (
              <>
                <ChevronUp size={14} />
                Ocultar estadísticas
              </>
            ) : (
              <>
                <ChevronDown size={14} />
                Ver estadísticas
              </>
            )}
          </button>
        )}
      </div>

      {/* Sección de Estadísticas - EXPANDIBLE */}
      {showStats && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100/50">
          {/* Gráfica semanal mini */}
          <div className="bg-white rounded-lg p-3 shadow-sm mt-3">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-600" />
              <h4 className="text-xs font-semibold text-gray-700">Actividad Semanal</h4>
            </div>
            
            {/* Leyenda */}
            <div className="flex items-center gap-3 mb-2 text-[10px]">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                <span className="text-gray-500">Yo</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                <span className="text-gray-500">Otros</span>
              </div>
            </div>
            
            {/* Gráfica de barras compacta */}
            <div className="flex items-end justify-between h-16 gap-1">
              {weeklyData.map((day, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex flex-col items-center h-12 justify-end gap-0.5">
                    <div 
                      className="w-full bg-slate-200 rounded-t transition-all"
                      style={{ 
                        height: `${Math.max((day.others_time / maxChartValue) * 100, day.others_time > 0 ? 4 : 0)}%`
                      }}
                    />
                    <div 
                      className="w-full bg-gradient-to-t from-cyan-500 to-cyan-400 rounded-t transition-all"
                      style={{ 
                        height: `${Math.max((day.my_time / maxChartValue) * 100, day.my_time > 0 ? 4 : 0)}%`
                      }}
                    />
                  </div>
                  <span className="text-[8px] text-gray-400 mt-0.5">{day.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tiempo por usuario */}
          {userTotals.length > 0 && (
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-1.5 mb-2">
                <Users className="w-3.5 h-3.5 text-cyan-600" />
                <h4 className="text-xs font-semibold text-gray-700">Por Usuario</h4>
              </div>
              
              <div className="space-y-1.5">
                {userTotals.slice(0, 3).map((user, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs text-gray-700">{user.username}</span>
                    </div>
                    <span className="text-xs font-mono font-semibold text-cyan-600">
                      {formatTime(user.total_seconds)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TimeTrackerSidebar;

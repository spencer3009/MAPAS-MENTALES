import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, Clock, Users, TrendingUp, Timer } from 'lucide-react';
import { useTimeTracking } from '../../contexts/TimeTrackingContext';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const TimeTracker = ({ taskId, boardId, listId, taskTitle, onTimeUpdate }) => {
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
  const token = localStorage.getItem('mm_auth_token');
  
  const isThisTaskTracking = isTaskTracking(taskId);

  // Formatear tiempo local
  const formatTimeLocal = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cargar datos de la tarea
  const loadTaskData = useCallback(async () => {
    if (!taskId || !token) return;
    
    try {
      // Cargar entradas de tiempo
      const entriesRes = await fetch(`${API_URL}/api/time-tracking/task/${taskId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (entriesRes.ok) {
        const data = await entriesRes.json();
        setTotalTime(data.total_seconds || 0);
        setUserTotals(data.user_totals || []);
      }
      
      // Cargar datos semanales
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

  // Efecto inicial
  useEffect(() => {
    loadTaskData();
  }, [loadTaskData]);

  // Iniciar tracking
  const handleStart = async () => {
    const entry = await startTracking(taskId, boardId, listId, taskTitle);
    if (entry && onTimeUpdate) {
      onTimeUpdate();
    }
  };

  // Detener tracking
  const handleStop = async () => {
    const result = await stopTracking();
    if (result) {
      setTotalTime(prev => prev + elapsedTime);
      loadTaskData();
      if (onTimeUpdate) {
        onTimeUpdate();
      }
    }
  };

  // Calcular máximo para la gráfica
  const maxChartValue = Math.max(
    ...weeklyData.map(d => Math.max(d.my_time, d.others_time)),
    3600
  );

  // Convertir segundos a horas
  const secondsToHours = (s) => (s / 3600).toFixed(1);

  // Tiempo actual mostrado
  const displayTime = isThisTaskTracking ? elapsedTime : 0;
  const totalDisplayTime = totalTime + displayTime;

  if (loading) {
    return (
      <div className="bg-slate-50 rounded-xl p-4 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="h-20 bg-slate-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-cyan-50 rounded-xl p-4 space-y-4" data-testid="time-tracker">
      {/* Header con tiempo total */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isThisTaskTracking ? 'bg-red-100' : 'bg-cyan-100'}`}>
            <Clock className={`w-4 h-4 ${isThisTaskTracking ? 'text-red-600' : 'text-cyan-600'}`} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Registro de Tiempo</h3>
            <p className="text-xs text-gray-500">Tiempo total: {formatTimeLocal(totalDisplayTime)}</p>
          </div>
        </div>
      </div>

      {/* Contador principal y botón */}
      <div className={`rounded-xl p-4 shadow-sm border ${isThisTaskTracking ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Botón Play/Pause */}
            <button
              onClick={isThisTaskTracking ? handleStop : handleStart}
              disabled={isTracking && !isThisTaskTracking}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                isThisTaskTracking 
                  ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' 
                  : isTracking 
                    ? 'bg-gray-300'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700'
              }`}
              data-testid="time-toggle-btn"
            >
              {isThisTaskTracking ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white ml-1" />
              )}
            </button>
            
            {/* Tiempo actual */}
            <div>
              <div className={`text-3xl font-mono font-bold ${isThisTaskTracking ? 'text-red-600' : 'text-gray-400'}`}>
                {formatTimeLocal(displayTime)}
              </div>
              <p className="text-xs text-gray-500">
                {isThisTaskTracking 
                  ? 'Registrando...' 
                  : isTracking 
                    ? 'Hay otro registro activo'
                    : 'Presiona play para iniciar'
                }
              </p>
            </div>
          </div>
          
          {/* Indicador de estado */}
          {isThisTaskTracking && (
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <span className="text-xs text-red-600 font-medium">Activo</span>
            </div>
          )}
        </div>
      </div>

      {/* Gráfica semanal */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-cyan-600" />
          <h4 className="text-sm font-semibold text-gray-800">Actividad Semanal</h4>
        </div>
        
        {/* Leyenda */}
        <div className="flex items-center gap-4 mb-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
            <span className="text-gray-600">Yo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-slate-300"></div>
            <span className="text-gray-600">Otros</span>
          </div>
        </div>
        
        {/* Gráfica de barras */}
        <div className="flex items-end justify-between h-32 gap-2">
          {weeklyData.map((day, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center">
              <div className="w-full flex flex-col items-center h-24 justify-end gap-0.5">
                <div 
                  className="w-full bg-slate-200 rounded-t transition-all duration-300"
                  style={{ 
                    height: `${Math.max((day.others_time / maxChartValue) * 100, day.others_time > 0 ? 4 : 0)}%`
                  }}
                  title={`Otros: ${formatTimeLocal(day.others_time)}`}
                />
                <div 
                  className="w-full bg-gradient-to-t from-cyan-500 to-cyan-400 rounded-t transition-all duration-300"
                  style={{ 
                    height: `${Math.max((day.my_time / maxChartValue) * 100, day.my_time > 0 ? 4 : 0)}%`
                  }}
                  title={`Yo: ${formatTimeLocal(day.my_time)}`}
                />
              </div>
              <span className="text-[10px] text-gray-500 mt-1 font-medium">{day.day}</span>
            </div>
          ))}
        </div>
        
        <div className="flex justify-between text-[10px] text-gray-400 mt-2 px-1">
          <span>0h</span>
          <span>{secondsToHours(maxChartValue / 2)}h</span>
          <span>{secondsToHours(maxChartValue)}h</span>
        </div>
      </div>

      {/* Historial de usuarios */}
      {userTotals.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-cyan-600" />
            <h4 className="text-sm font-semibold text-gray-800">Tiempo por Usuario</h4>
          </div>
          
          <div className="space-y-2">
            {userTotals.map((user, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{user.username}</p>
                    <p className="text-xs text-gray-500">{user.entries_count} registros</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-mono font-semibold text-cyan-600">
                    {formatTimeLocal(user.total_seconds)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeTracker;

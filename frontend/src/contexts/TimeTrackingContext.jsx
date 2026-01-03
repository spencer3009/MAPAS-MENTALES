import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const TimeTrackingContext = createContext(null);

export const useTimeTracking = () => {
  const context = useContext(TimeTrackingContext);
  if (!context) {
    throw new Error('useTimeTracking must be used within TimeTrackingProvider');
  }
  return context;
};

export const TimeTrackingProvider = ({ children }) => {
  const [activeEntry, setActiveEntry] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef(null);
  const token = localStorage.getItem('mm_auth_token');

  // Formatear tiempo
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cargar registro activo al iniciar
  const loadActiveEntry = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/time-tracking/active`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.active_entry) {
          setActiveEntry(data.active_entry);
          setElapsedTime(data.active_entry.elapsed_seconds || 0);
        } else {
          setActiveEntry(null);
          setElapsedTime(0);
        }
      }
    } catch (error) {
      console.error('Error loading active time entry:', error);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Cargar al montar
  useEffect(() => {
    loadActiveEntry();
  }, [loadActiveEntry]);

  // Contador en tiempo real
  useEffect(() => {
    if (activeEntry) {
      intervalRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setElapsedTime(0);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [activeEntry]);

  // Iniciar tracking
  const startTracking = async (taskId, boardId, listId, taskTitle) => {
    if (!token) return null;
    
    try {
      const response = await fetch(`${API_URL}/api/time-tracking/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          task_id: taskId,
          board_id: boardId,
          list_id: listId,
          task_title: taskTitle
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const newEntry = {
          ...data.entry,
          elapsed_seconds: 0
        };
        setActiveEntry(newEntry);
        setElapsedTime(0);
        return newEntry;
      }
    } catch (error) {
      console.error('Error starting time tracking:', error);
    }
    return null;
  };

  // Detener tracking
  const stopTracking = async () => {
    if (!token || !activeEntry) return null;
    
    try {
      const response = await fetch(`${API_URL}/api/time-tracking/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ task_id: activeEntry.task_id })
      });
      
      if (response.ok) {
        const data = await response.json();
        setActiveEntry(null);
        setElapsedTime(0);
        return data;
      }
    } catch (error) {
      console.error('Error stopping time tracking:', error);
    }
    return null;
  };

  // Verificar si una tarea tiene tracking activo
  const isTaskTracking = (taskId) => {
    return activeEntry?.task_id === taskId;
  };

  const value = {
    activeEntry,
    elapsedTime,
    isLoading,
    isTracking: !!activeEntry,
    formattedTime: formatTime(elapsedTime),
    startTracking,
    stopTracking,
    isTaskTracking,
    refreshActiveEntry: loadActiveEntry
  };

  return (
    <TimeTrackingContext.Provider value={value}>
      {children}
    </TimeTrackingContext.Provider>
  );
};

export default TimeTrackingContext;

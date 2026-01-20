import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, Calendar, CheckSquare, Clock, Flag, 
  Plus, Trash2, Check, Edit2, AlertCircle,
  Play, Pause, RotateCcw, ListTodo, ChevronRight
} from 'lucide-react';

// Prioridades
const PRIORITIES = [
  { id: 'low', label: 'Baja', color: '#22C55E', icon: '🟢' },
  { id: 'medium', label: 'Media', color: '#EAB308', icon: '🟡' },
  { id: 'high', label: 'Alta', color: '#F97316', icon: '🟠' },
  { id: 'urgent', label: 'Urgente', color: '#EF4444', icon: '🔴' },
];

// Formatear tiempo
const formatTime = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const NodeTaskModal = ({ node, onClose, onUpdate }) => {
  const taskData = node?.taskData || {};
  const taskStatus = node?.taskStatus || 'pending';
  
  // Estados locales
  const [checklist, setChecklist] = useState(taskData.checklist || []);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [dueDate, setDueDate] = useState(taskData.dueDate || '');
  const [priority, setPriority] = useState(taskData.priority || '');
  const [notes, setNotes] = useState(taskData.notes || '');
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  
  // Temporizador
  const [timerRunning, setTimerRunning] = useState(taskData.timerRunning || false);
  const [timerSeconds, setTimerSeconds] = useState(taskData.timerSeconds || 0);
  const timerRef = useRef(null);
  
  // Calcular progreso
  const completedItems = checklist.filter(item => item.completed).length;
  const totalItems = checklist.length;
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  
  // Efecto para el temporizador
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);
  
  // Guardar cambios
  const saveChanges = useCallback(() => {
    if (!node || !onUpdate) return;
    
    onUpdate(node.id, {
      checklist,
      dueDate,
      priority,
      notes,
      timerRunning,
      timerSeconds,
      progress
    });
  }, [node, onUpdate, checklist, dueDate, priority, notes, timerRunning, timerSeconds, progress]);
  
  // Auto-guardar cuando cambian los datos
  useEffect(() => {
    const timeout = setTimeout(() => {
      saveChanges();
    }, 500);
    return () => clearTimeout(timeout);
  }, [checklist, dueDate, priority, notes, timerSeconds]);
  
  // Agregar item a checklist
  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    const newItem = {
      id: Date.now().toString(),
      text: newChecklistItem.trim(),
      completed: false
    };
    setChecklist([...checklist, newItem]);
    setNewChecklistItem('');
  };
  
  // Toggle item completado
  const toggleChecklistItem = (itemId) => {
    setChecklist(checklist.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    ));
  };
  
  // Eliminar item
  const deleteChecklistItem = (itemId) => {
    setChecklist(checklist.filter(item => item.id !== itemId));
  };
  
  // Control del temporizador
  const toggleTimer = () => {
    setTimerRunning(!timerRunning);
  };
  
  const resetTimer = () => {
    setTimerRunning(false);
    setTimerSeconds(0);
  };
  
  // Obtener estado visual
  const getStatusBadge = () => {
    switch(taskStatus) {
      case 'completed':
        return <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">✅ Completada</span>;
      case 'in_progress':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">⏳ En progreso</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">📋 Pendiente</span>;
    }
  };

  if (!node) return null;

  return (
    <>
      {/* Overlay oscuro - click para cerrar */}
      <div 
        className="fixed inset-0 bg-black/30 z-[9998]"
        onClick={onClose}
      />
      
      {/* Panel lateral derecho */}
      <div 
        className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[9999] flex flex-col transform transition-transform duration-300 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-yellow-50 to-orange-50 flex-shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <ListTodo className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-gray-800 truncate">{node.text}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                {getStatusBadge()}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors flex-shrink-0 ml-2"
          >
            <ChevronRight size={20} className="text-gray-500" />
          </button>
        </div>
        
        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Progreso */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">Progreso</span>
              <span className="text-gray-500">{completedItems}/{totalItems} sub-tareas</span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  progress === 100 ? 'bg-orange-500' : 'bg-yellow-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            {progress === 100 && (
              <p className="text-sm text-orange-600 font-medium">🎉 ¡Tarea completada!</p>
            )}
          </div>
          
          {/* Temporizador */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Tiempo</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-mono font-bold text-gray-800">
                  {formatTime(timerSeconds)}
                </span>
                <button
                  onClick={toggleTimer}
                  className={`p-1.5 rounded-lg transition-colors ${
                    timerRunning 
                      ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                      : 'bg-green-100 text-green-600 hover:bg-green-200'
                  }`}
                >
                  {timerRunning ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button
                  onClick={resetTimer}
                  className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            </div>
          </div>
          
          {/* Sub-tareas (Checklist) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Sub-tareas</span>
            </div>
            
            {/* Lista de items */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {checklist.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-2">No hay sub-tareas</p>
              )}
              {checklist.map((item) => (
                <div 
                  key={item.id}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all ${
                    item.completed 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <button
                    onClick={() => toggleChecklistItem(item.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                      item.completed 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : 'border-gray-300 hover:border-green-500'
                    }`}
                  >
                    {item.completed && <Check size={12} />}
                  </button>
                  <span className={`flex-1 text-sm ${item.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {item.text}
                  </span>
                  <button
                    onClick={() => deleteChecklistItem(item.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            
            {/* Agregar nuevo item */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addChecklistItem()}
                placeholder="Nueva sub-tarea..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors"
              />
              <button
                onClick={addChecklistItem}
                disabled={!newChecklistItem.trim()}
                className="px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
          
          {/* Fecha límite y Prioridad */}
          <div className="grid grid-cols-2 gap-3">
            {/* Fecha límite */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-medium text-gray-700">Fecha límite</span>
              </div>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-2.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors"
              />
            </div>
            
            {/* Prioridad */}
            <div className="space-y-1.5 relative">
              <div className="flex items-center gap-1.5">
                <Flag className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-medium text-gray-700">Prioridad</span>
              </div>
              <button
                onClick={() => setShowPriorityPicker(!showPriorityPicker)}
                className="w-full px-2.5 py-2 text-sm border border-gray-300 rounded-lg text-left flex items-center justify-between hover:border-gray-400 transition-colors"
              >
                {priority ? (
                  <span className="flex items-center gap-1.5">
                    <span>{PRIORITIES.find(p => p.id === priority)?.icon}</span>
                    <span>{PRIORITIES.find(p => p.id === priority)?.label}</span>
                  </span>
                ) : (
                  <span className="text-gray-400">Sin prioridad</span>
                )}
              </button>
              
              {showPriorityPicker && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setPriority(p.id);
                        setShowPriorityPicker(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors"
                    >
                      <span>{p.icon}</span>
                      <span>{p.label}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setPriority('');
                      setShowPriorityPicker(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-400 hover:bg-gray-50 transition-colors border-t"
                  >
                    Sin prioridad
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Descripción / Notas */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Edit2 className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-medium text-gray-700">Descripción</span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agrega una descripción o notas..."
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors resize-none"
            />
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-gray-500">
            {progress === 100 
              ? '✅ Tarea completada' 
              : progress > 0 
                ? `⏳ ${progress}% completado` 
                : '📋 Sin progreso'
            }
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </>
  );
};

export default NodeTaskModal;

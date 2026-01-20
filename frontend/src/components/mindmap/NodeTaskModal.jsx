import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, Calendar, CheckSquare, Clock, Flag, 
  Plus, Trash2, Check, Edit2, AlertCircle,
  Play, Pause, RotateCcw, ListTodo
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
        return <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">Completada</span>;
      case 'in_progress':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">En progreso</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">Pendiente</span>;
    }
  };

  if (!node) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-yellow-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
              <ListTodo className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800 line-clamp-1">{node.text}</h2>
              <div className="flex items-center gap-2 mt-1">
                {getStatusBadge()}
                {progress > 0 && (
                  <span className="text-xs text-gray-500">{progress}% completado</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
          </div>
          
          {/* Temporizador */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-500" />
                <span className="font-medium text-gray-700">Tiempo dedicado</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-mono font-bold text-gray-800">
                  {formatTime(timerSeconds)}
                </span>
                <button
                  onClick={toggleTimer}
                  className={`p-2 rounded-lg transition-colors ${
                    timerRunning 
                      ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                      : 'bg-green-100 text-green-600 hover:bg-green-200'
                  }`}
                >
                  {timerRunning ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <button
                  onClick={resetTimer}
                  className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  <RotateCcw size={18} />
                </button>
              </div>
            </div>
          </div>
          
          {/* Sub-tareas (Checklist) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-700">Sub-tareas</span>
            </div>
            
            {/* Lista de items */}
            <div className="space-y-2">
              {checklist.map((item) => (
                <div 
                  key={item.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    item.completed 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <button
                    onClick={() => toggleChecklistItem(item.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      item.completed 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : 'border-gray-300 hover:border-green-500'
                    }`}
                  >
                    {item.completed && <Check size={12} />}
                  </button>
                  <span className={`flex-1 ${item.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {item.text}
                  </span>
                  <button
                    onClick={() => deleteChecklistItem(item.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
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
                placeholder="Agregar sub-tarea..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors"
              />
              <button
                onClick={addChecklistItem}
                disabled={!newChecklistItem.trim()}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
          
          {/* Fecha límite y Prioridad */}
          <div className="grid grid-cols-2 gap-4">
            {/* Fecha límite */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Fecha límite</span>
              </div>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors"
              />
            </div>
            
            {/* Prioridad */}
            <div className="space-y-2 relative">
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Prioridad</span>
              </div>
              <button
                onClick={() => setShowPriorityPicker(!showPriorityPicker)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left flex items-center justify-between hover:border-gray-400 transition-colors"
              >
                {priority ? (
                  <span className="flex items-center gap-2">
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
                      className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-gray-50 transition-colors"
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
                    className="w-full px-3 py-2 text-left text-gray-400 hover:bg-gray-50 transition-colors border-t"
                  >
                    Sin prioridad
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Notas */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Notas</span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agregar notas sobre esta tarea..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors resize-none"
            />
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {taskStatus === 'completed' 
              ? '✅ Tarea completada' 
              : progress > 0 
                ? `⏳ ${progress}% completado` 
                : '📋 Tarea pendiente'
            }
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default NodeTaskModal;

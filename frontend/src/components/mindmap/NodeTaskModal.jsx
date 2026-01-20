import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, Calendar, CheckSquare, Clock, Flag, 
  Plus, Trash2, Check, Paperclip, Image,
  Play, Pause, ChevronDown, ChevronUp,
  Pin, Tag, Users, MessageSquare, BarChart3
} from 'lucide-react';

// Prioridades con colores distintivos
const PRIORITIES = [
  { id: 'low', label: 'Baja', color: '#22C55E', bgColor: '#DCFCE7', icon: '🟢' },
  { id: 'medium', label: 'Media', color: '#EAB308', bgColor: '#FEF9C3', icon: '🟡' },
  { id: 'high', label: 'Alta', color: '#F97316', bgColor: '#FFEDD5', icon: '🟠' },
  { id: 'urgent', label: 'Urgente', color: '#EF4444', bgColor: '#FEE2E2', icon: '🔴' },
];

// Formatear tiempo
export const formatTime = (seconds) => {
  if (!seconds || seconds < 0) seconds = 0;
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Formatear fecha para mostrar en el nodo
export const formatDateShort = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateString;
  }
};

// Exportar prioridades para uso en NodeItem
export { PRIORITIES };

const NodeTaskModal = ({ node, onClose, onUpdate, onUpdateTitle, onDelete }) => {
  const taskData = node?.taskData || {};
  const taskStatus = node?.taskStatus || 'pending';
  
  // Estados locales
  const [title, setTitle] = useState(node?.text || 'Nueva tarea');
  const [description, setDescription] = useState(taskData.notes || '');
  const [checklist, setChecklist] = useState(taskData.checklist || []);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [dueDate, setDueDate] = useState(taskData.dueDate || '');
  const [priority, setPriority] = useState(taskData.priority || '');
  const [isPinned, setIsPinned] = useState(taskData.isPinned || false);
  const [showStats, setShowStats] = useState(false);
  
  // Temporizador
  const [timerRunning, setTimerRunning] = useState(taskData.timerRunning || false);
  const [timerSeconds, setTimerSeconds] = useState(taskData.timerSeconds || 0);
  const [totalTime, setTotalTime] = useState(taskData.totalTime || 0);
  const timerRef = useRef(null);
  
  // Activity log
  const [activities, setActivities] = useState(taskData.activities || []);
  const [newComment, setNewComment] = useState('');
  
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
  
  // Sincronizar título con prop
  useEffect(() => {
    setTitle(node?.text || 'Nueva tarea');
  }, [node?.text]);
  
  // Guardar cambios
  const saveChanges = useCallback(() => {
    if (!node || !onUpdate) return;
    
    onUpdate(node.id, {
      checklist,
      dueDate,
      priority,
      notes: description,
      timerRunning,
      timerSeconds,
      totalTime: timerRunning ? totalTime : totalTime + timerSeconds,
      progress,
      isPinned,
      activities
    });
  }, [node, onUpdate, checklist, dueDate, priority, description, timerRunning, timerSeconds, totalTime, progress, isPinned, activities]);
  
  // Guardar título
  const saveTitle = useCallback(() => {
    if (!node || !onUpdateTitle) return;
    if (title.trim() !== node.text) {
      onUpdateTitle(node.id, title.trim() || 'Nueva tarea');
    }
  }, [node, onUpdateTitle, title]);
  
  // Auto-guardar
  useEffect(() => {
    const timeout = setTimeout(() => saveChanges(), 300);
    return () => clearTimeout(timeout);
  }, [checklist, dueDate, priority, description, timerSeconds, timerRunning, isPinned]);
  
  useEffect(() => {
    const timeout = setTimeout(() => saveTitle(), 500);
    return () => clearTimeout(timeout);
  }, [title]);
  
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
    const newRunning = !timerRunning;
    
    // Agregar actividad
    const newActivity = {
      id: Date.now().toString(),
      type: newRunning ? 'timer_start' : 'timer_stop',
      user: 'Usuario',
      timestamp: new Date().toISOString(),
      duration: newRunning ? null : timerSeconds
    };
    setActivities([newActivity, ...activities]);
    
    if (!newRunning) {
      // Al pausar, acumular el tiempo
      setTotalTime(prev => prev + timerSeconds);
      setTimerSeconds(0);
    }
    
    setTimerRunning(newRunning);
  };
  
  // Agregar comentario
  const addComment = () => {
    if (!newComment.trim()) return;
    const activity = {
      id: Date.now().toString(),
      type: 'comment',
      user: 'Usuario',
      timestamp: new Date().toISOString(),
      text: newComment.trim()
    };
    setActivities([activity, ...activities]);
    setNewComment('');
  };
  
  // Eliminar tarea
  const handleDelete = () => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta tarea?')) {
      if (onDelete) {
        onDelete(node.id);
      }
      onClose();
    }
  };
  
  // Cerrar panel
  const handleClose = () => {
    saveChanges();
    onClose();
  };
  
  // Formatear fecha relativa
  const formatRelativeTime = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    return date.toLocaleDateString('es-ES');
  };

  if (!node) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/40 z-[9998]"
        onClick={handleClose}
      />
      
      {/* Modal centrado */}
      <div 
        className="fixed inset-4 md:inset-10 lg:inset-16 bg-gray-50 rounded-2xl shadow-2xl z-[9999] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xl font-bold text-gray-800 bg-transparent outline-none flex-1 mr-4"
            placeholder="Nombre de la tarea..."
          />
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        {/* Content - Two columns */}
        <div className="flex-1 flex overflow-hidden">
          {/* ========== COLUMNA IZQUIERDA ========== */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Descripción */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-600">
                <MessageSquare size={18} />
                <span className="font-medium">Descripción</span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Añade una descripción más detallada..."
                rows={3}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none text-gray-700"
              />
            </div>
            
            {/* Checklist */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-gray-600">
                <CheckSquare size={18} />
                <span className="font-medium">Checklist</span>
                {totalItems > 0 && (
                  <span className="text-sm text-gray-400">({completedItems}/{totalItems})</span>
                )}
              </div>
              
              {/* Progress bar */}
              {totalItems > 0 && (
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
              
              {/* Items */}
              <div className="space-y-2">
                {checklist.map((item) => (
                  <div 
                    key={item.id}
                    className={`flex items-center gap-3 p-3 bg-white rounded-lg border ${
                      item.completed ? 'border-green-200 bg-green-50' : 'border-gray-200'
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
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Add item input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addChecklistItem()}
                  placeholder="Añadir elemento..."
                  className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                />
                <button
                  onClick={addChecklistItem}
                  disabled={!newChecklistItem.trim()}
                  className="px-4 py-2 bg-rose-400 text-white rounded-lg hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                >
                  Añadir
                </button>
              </div>
            </div>
            
            {/* Adjuntos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
                  <Paperclip size={18} />
                  <span className="font-medium">Adjuntos</span>
                </div>
                <button className="text-blue-500 hover:text-blue-600 text-sm font-medium flex items-center gap-1">
                  <Plus size={14} />
                  Añadir
                </button>
              </div>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer">
                <Image size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500 text-sm">Haz clic para adjuntar una imagen</p>
                <p className="text-gray-400 text-xs mt-1">JPG, PNG, GIF o WebP (máx. 10MB)</p>
              </div>
            </div>
            
            {/* Actividad */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-gray-600">
                <MessageSquare size={18} />
                <span className="font-medium">Actividad</span>
              </div>
              
              {/* Add comment */}
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  U
                </div>
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addComment()}
                  placeholder="Escribe un comentario..."
                  className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                />
              </div>
              
              {/* Activity list */}
              <div className="space-y-3 mt-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex gap-3 items-start">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      activity.type === 'timer_start' ? 'bg-green-500' :
                      activity.type === 'timer_stop' ? 'bg-red-500' :
                      'bg-blue-500'
                    }`}>
                      {activity.type === 'timer_start' ? <Play size={14} className="text-white" /> :
                       activity.type === 'timer_stop' ? <Pause size={14} className="text-white" /> :
                       <MessageSquare size={14} className="text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 uppercase font-medium">
                        {formatRelativeTime(activity.timestamp)}
                      </p>
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">{activity.user}</span>
                        {activity.type === 'timer_start' && ' comenzó a hacer un registro del tiempo.'}
                        {activity.type === 'timer_stop' && ` dejó de hacer un registro del tiempo.`}
                        {activity.type === 'comment' && `: ${activity.text}`}
                      </p>
                      {activity.type === 'timer_stop' && activity.duration && (
                        <p className="text-xs text-gray-500">Duración: {formatTime(activity.duration)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* ========== COLUMNA DERECHA (SIDEBAR) ========== */}
          <div className="w-72 bg-white border-l overflow-y-auto p-4 space-y-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Añadir a la tarjeta
            </h3>
            
            {/* Registro de Tiempo */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-gray-600">
                <Clock size={16} />
                <span className="font-medium text-sm">Registro de Tiempo</span>
              </div>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleTimer}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                    timerRunning 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {timerRunning 
                    ? <Pause size={24} className="text-white" />
                    : <Play size={24} className="text-white ml-1" />
                  }
                </button>
                <div>
                  <p className="text-2xl font-mono font-bold text-gray-800">
                    {formatTime(timerSeconds)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {timerRunning ? '⏱️ Registrando...' : '▶️ Presiona play para iniciar'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Tiempo total:</span>
                <span className="font-mono font-bold text-rose-500">
                  {formatTime(totalTime + (timerRunning ? timerSeconds : 0))}
                </span>
              </div>
              
              <button 
                onClick={() => setShowStats(!showStats)}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 w-full justify-center"
              >
                {showStats ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                Ver estadísticas
              </button>
            </div>
            
            {/* Anclar */}
            <button 
              onClick={() => setIsPinned(!isPinned)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
                isPinned 
                  ? 'bg-amber-50 border-amber-200 text-amber-700' 
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Pin size={18} className={isPinned ? 'fill-current' : ''} />
              <span className="font-medium">Anclar</span>
            </button>
            
            {/* Fecha límite */}
            <div className="space-y-2">
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors">
                <Calendar size={18} />
                <span className="font-medium">Fecha límite</span>
              </button>
              {dueDate ? (
                <div className="flex items-center justify-between px-4 py-2 bg-blue-50 rounded-lg">
                  <span className="text-sm text-blue-700">{formatDateShort(dueDate)}</span>
                  <button 
                    onClick={() => setDueDate('')}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
            
            {/* Etiquetas */}
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors">
              <Tag size={18} />
              <span className="font-medium">Etiquetas</span>
            </button>
            
            {/* Prioridad */}
            <div className="space-y-2">
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors">
                <Flag size={18} />
                <span className="font-medium">Prioridad</span>
              </button>
              <div className="grid grid-cols-2 gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPriority(priority === p.id ? '' : p.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      priority === p.id 
                        ? 'ring-2 ring-offset-1' 
                        : 'hover:opacity-80'
                    }`}
                    style={{ 
                      backgroundColor: p.bgColor, 
                      color: p.color,
                      ringColor: p.color 
                    }}
                  >
                    {p.icon} {p.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Miembros */}
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors">
              <Users size={18} />
              <span className="font-medium">Miembros</span>
            </button>
            
            {/* Adjuntos */}
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors">
              <Paperclip size={18} />
              <span className="font-medium">Adjuntos</span>
            </button>
            
            {/* Acciones */}
            <div className="pt-4 border-t">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Acciones
              </h3>
              <button 
                onClick={handleDelete}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                <Trash2 size={18} />
                <span className="font-medium">Eliminar tarea</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default NodeTaskModal;

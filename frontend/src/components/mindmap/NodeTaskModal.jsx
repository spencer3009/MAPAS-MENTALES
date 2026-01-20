import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, Calendar, CheckSquare, Clock, Flag, 
  Plus, Trash2, Check, Paperclip, Image,
  Play, Pause, ChevronDown, ChevronUp,
  Pin, Tag, Users, MessageSquare, ChevronRight
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

// Formatear fecha para mostrar
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
  const panelRef = useRef(null);
  
  // Estados locales
  const [title, setTitle] = useState(node?.text || 'Nueva tarea');
  const [description, setDescription] = useState(taskData.notes || '');
  const [checklist, setChecklist] = useState(taskData.checklist || []);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [dueDate, setDueDate] = useState(taskData.dueDate || '');
  const [priority, setPriority] = useState(taskData.priority || '');
  const [attachments, setAttachments] = useState(taskData.attachments || []);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);
  
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
  
  // ========== PREVENIR SCROLL DEL CANVAS ==========
  // Captura robusta de eventos de scroll para aislar el Side Panel
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    
    // Handler principal para wheel events
    const handleWheel = (e) => {
      // Siempre detener la propagación cuando estamos en el panel
      e.stopPropagation();
      
      // Encontrar el elemento scrolleable más cercano
      const scrollableContent = panel.querySelector('.overflow-y-auto');
      if (!scrollableContent) return;
      
      const { scrollTop, scrollHeight, clientHeight } = scrollableContent;
      const isScrollingDown = e.deltaY > 0;
      const isScrollingUp = e.deltaY < 0;
      
      // Verificar si podemos hacer scroll en la dirección deseada
      const canScrollDown = scrollTop + clientHeight < scrollHeight;
      const canScrollUp = scrollTop > 0;
      
      // Si intentamos hacer scroll más allá de los límites, prevenir el default
      // para evitar que el evento se propague al canvas
      if ((isScrollingDown && !canScrollDown) || (isScrollingUp && !canScrollUp)) {
        e.preventDefault();
      }
    };
    
    // Handler para touchmove (móviles y touchpad)
    const handleTouchMove = (e) => {
      e.stopPropagation();
    };
    
    // Agregar listeners con capture para interceptar antes del canvas
    panel.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    panel.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    return () => {
      panel.removeEventListener('wheel', handleWheel, { capture: true });
      panel.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);
  
  // Bloquear eventos de wheel a nivel del documento cuando el panel está abierto
  useEffect(() => {
    const handleDocumentWheel = (e) => {
      // Si el evento se originó dentro del panel, no hacer nada extra
      // (ya lo manejamos arriba)
      if (panelRef.current && panelRef.current.contains(e.target)) {
        return;
      }
    };
    
    document.addEventListener('wheel', handleDocumentWheel, { passive: true });
    return () => document.removeEventListener('wheel', handleDocumentWheel);
  }, []);
  
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
      {/* Overlay semi-transparente - click para cerrar */}
      <div 
        className="fixed inset-0 bg-black/20 z-[9998] transition-opacity"
        onClick={handleClose}
      />
      
      {/* Side Panel desde la derecha */}
      <div 
        ref={panelRef}
        data-task-panel="true"
        className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-[9999] flex flex-col transform transition-transform duration-300 ease-out animate-slide-in-right"
        style={{ 
          boxShadow: '-4px 0 25px rgba(0,0,0,0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
        onWheelCapture={(e) => {
          // Capturar el evento de wheel en fase de captura
          // para prevenir que llegue al canvas
          e.stopPropagation();
        }}
        onWheel={(e) => {
          // También detener en fase de burbujeo
          e.stopPropagation();
        }}
      >
        {/* Header fijo */}
        <div className="flex-shrink-0 border-b bg-white">
          {/* Título editable */}
          <div className="flex items-center gap-3 px-5 py-4">
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Cerrar panel"
            >
              <ChevronRight size={20} className="text-gray-400" />
            </button>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 text-lg font-bold text-gray-800 bg-transparent outline-none"
              placeholder="Nombre de la tarea..."
            />
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={18} className="text-gray-400" />
            </button>
          </div>
          
          {/* Timer siempre visible en header cuando está activo */}
          {timerRunning && (
            <div className="px-5 pb-3">
              <div className="flex items-center gap-3 px-4 py-2 bg-red-50 rounded-lg border border-red-200">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <Clock size={16} className="text-red-500" />
                <span className="text-sm font-medium text-red-700">Registrando tiempo</span>
                <span className="ml-auto text-lg font-mono font-bold text-red-600">
                  {formatTime(timerSeconds)}
                </span>
                <button
                  onClick={toggleTimer}
                  className="p-1.5 bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                >
                  <Pause size={14} className="text-white" />
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Contenido scrolleable */}
        <div 
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{ 
            // Forzar que el scroll sea solo dentro de este contenedor
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch'
          }}
          onWheelCapture={(e) => {
            e.stopPropagation();
          }}
          onWheel={(e) => {
            e.stopPropagation();
          }}
        >
          <div className="p-5 space-y-6">
            
            {/* ========== REGISTRO DE TIEMPO ========== */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-gray-600">
                <Clock size={18} />
                <span className="font-semibold text-sm">Registro de Tiempo</span>
              </div>
              
              {!timerRunning && (
                <div className="flex items-center gap-4">
                  <button
                    onClick={toggleTimer}
                    className="w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center transition-colors shadow-lg"
                  >
                    <Play size={24} className="text-white ml-1" />
                  </button>
                  <div>
                    <p className="text-2xl font-mono font-bold text-gray-800">
                      {formatTime(timerSeconds)}
                    </p>
                    <p className="text-xs text-gray-500">▶️ Presiona play para iniciar</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200">
                <span className="text-gray-500">Tiempo total:</span>
                <span className="font-mono font-bold text-rose-500">
                  {formatTime(totalTime + (timerRunning ? timerSeconds : 0))}
                </span>
              </div>
            </div>
            
            {/* ========== DESCRIPCIÓN ========== */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-600">
                <MessageSquare size={16} />
                <span className="font-semibold text-sm">Descripción</span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Añade una descripción más detallada..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none text-sm text-gray-700"
              />
            </div>
            
            {/* ========== CHECKLIST ========== */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
                  <CheckSquare size={16} />
                  <span className="font-semibold text-sm">Checklist</span>
                  {totalItems > 0 && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {completedItems}/{totalItems}
                    </span>
                  )}
                </div>
                {totalItems > 0 && (
                  <span className="text-xs font-medium text-gray-500">{progress}%</span>
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
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      item.completed 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-gray-200 bg-white hover:border-gray-300'
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
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Add item */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addChecklistItem()}
                  placeholder="Añadir elemento..."
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                />
                <button
                  onClick={addChecklistItem}
                  disabled={!newChecklistItem.trim()}
                  className="px-4 py-2.5 bg-rose-400 text-white rounded-lg hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                >
                  Añadir
                </button>
              </div>
            </div>
            
            {/* ========== FECHA LÍMITE ========== */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar size={16} />
                <span className="font-semibold text-sm">Fecha límite</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
                {dueDate && (
                  <button 
                    onClick={() => setDueDate('')}
                    className="px-3 text-gray-400 hover:text-red-500"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
            
            {/* ========== PRIORIDAD ========== */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-600">
                <Flag size={16} />
                <span className="font-semibold text-sm">Prioridad</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPriority(priority === p.id ? '' : p.id)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      priority === p.id 
                        ? 'ring-2 ring-offset-1 scale-[1.02]' 
                        : 'hover:scale-[1.02]'
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
            
            {/* ========== OPCIONES ADICIONALES ========== */}
            <div className="space-y-2 pt-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Opciones
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button className="flex items-center gap-2 px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors">
                  <Tag size={16} />
                  Etiquetas
                </button>
                <button className="flex items-center gap-2 px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors">
                  <Users size={16} />
                  Miembros
                </button>
                <label className="flex items-center gap-2 px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors cursor-pointer">
                  <Paperclip size={16} />
                  Adjuntos
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            
            {/* ========== ADJUNTOS ========== */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-600">
                <Image size={16} />
                <span className="font-semibold text-sm">Adjuntos</span>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-gray-400 transition-colors cursor-pointer">
                <Image size={28} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500 text-sm">Haz clic para adjuntar</p>
                <p className="text-gray-400 text-xs mt-1">JPG, PNG, GIF (máx. 10MB)</p>
              </div>
            </div>
            
            {/* ========== ACTIVIDAD ========== */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-gray-600">
                <MessageSquare size={16} />
                <span className="font-semibold text-sm">Actividad</span>
              </div>
              
              {/* Add comment */}
              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  U
                </div>
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addComment()}
                  placeholder="Escribe un comentario..."
                  className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              
              {/* Activity list */}
              {activities.length > 0 && (
                <div className="space-y-3 pt-2">
                  {activities.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex gap-3 items-start">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        activity.type === 'timer_start' ? 'bg-green-100' :
                        activity.type === 'timer_stop' ? 'bg-red-100' :
                        'bg-blue-100'
                      }`}>
                        {activity.type === 'timer_start' ? <Play size={12} className="text-green-600" /> :
                         activity.type === 'timer_stop' ? <Pause size={12} className="text-red-600" /> :
                         <MessageSquare size={12} className="text-blue-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400">{formatRelativeTime(activity.timestamp)}</p>
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">{activity.user}</span>
                          {activity.type === 'timer_start' && ' inició el registro de tiempo'}
                          {activity.type === 'timer_stop' && ` pausó el registro (${formatTime(activity.duration || 0)})`}
                          {activity.type === 'comment' && `: ${activity.text}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* ========== ELIMINAR TAREA ========== */}
            <div className="pt-4 border-t">
              <button 
                onClick={handleDelete}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors font-medium text-sm"
              >
                <Trash2 size={16} />
                Eliminar tarea
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* CSS para animación */}
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default NodeTaskModal;

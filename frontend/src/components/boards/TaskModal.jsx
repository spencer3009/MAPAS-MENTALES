import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, Calendar, Tag, Users, CheckSquare, Paperclip, 
  MessageSquare, Clock, Flag, Link2, Eye, MoreHorizontal,
  Plus, Trash2, Check, Edit2, ChevronRight, AlertCircle,
  Play, Square, ChevronLeft, Upload, Image, Loader2
} from 'lucide-react';
import TimeTracker from './TimeTracker';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Colores de etiquetas
const LABEL_COLORS = [
  { id: 'green', value: '#22C55E', name: 'Verde' },
  { id: 'yellow', value: '#EAB308', name: 'Amarillo' },
  { id: 'orange', value: '#F97316', name: 'Naranja' },
  { id: 'red', value: '#EF4444', name: 'Rojo' },
  { id: 'purple', value: '#A855F7', name: 'Morado' },
  { id: 'blue', value: '#3B82F6', name: 'Azul' },
  { id: 'cyan', value: '#06B6D4', name: 'Cyan' },
  { id: 'pink', value: '#EC4899', name: 'Rosa' },
];

// Prioridades
const PRIORITIES = [
  { id: 'low', label: 'Baja', color: '#22C55E', icon: '🟢' },
  { id: 'medium', label: 'Media', color: '#EAB308', icon: '🟡' },
  { id: 'high', label: 'Alta', color: '#F97316', icon: '🟠' },
  { id: 'urgent', label: 'Urgente', color: '#EF4444', icon: '🔴' },
];

const TaskModal = ({ card, listId, listTitle, boardId, onClose, onUpdate, onDelete }) => {
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(card.title || '');
  const [description, setDescription] = useState(card.description || '');
  const [editingDescription, setEditingDescription] = useState(false);
  const [dueDate, setDueDate] = useState(card.due_date || '');
  const [priority, setPriority] = useState(card.priority || '');
  const [labels, setLabels] = useState(card.labels || []);
  const [checklist, setChecklist] = useState(card.checklist || []);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [comments, setComments] = useState(card.comments || []);
  const [newComment, setNewComment] = useState('');
  const [attachments, setAttachments] = useState(card.attachments || []);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [timeEntries, setTimeEntries] = useState([]);
  
  // Estados para el selector de fecha límite
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [dueTime, setDueTime] = useState(card.due_time || '12:00');
  const [dueDateActivities, setDueDateActivities] = useState(card.due_date_activities || []);
  
  // Estados para adjuntos
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState('');
  const [lightboxImage, setLightboxImage] = useState(null); // Para vista ampliada
  const fileInputRef = useRef(null);
  
  const token = localStorage.getItem('mm_auth_token');
  const currentUser = JSON.parse(localStorage.getItem('mm_user') || '{}');

  // Cargar historial de tiempos
  const loadTimeEntries = useCallback(async () => {
    if (!token || !card.id) return;
    try {
      const response = await fetch(`${API_URL}/api/time-tracking/task/${card.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTimeEntries(data.entries || []);
      }
    } catch (error) {
      console.error('Error loading time entries:', error);
    }
  }, [token, card.id]);

  // Cargar entradas de tiempo al montar
  useEffect(() => {
    loadTimeEntries();
  }, [loadTimeEntries]);

  // Formatear tiempo relativo
  const formatRelativeTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSecs < 60) return 'HACE UNOS SEGUNDOS';
    if (diffMins < 60) return `HACE ${diffMins} MINUTO${diffMins > 1 ? 'S' : ''}`;
    if (diffHours < 24) return `HACE ${diffHours} HORA${diffHours > 1 ? 'S' : ''}`;
    return `HACE ${diffDays} DÍA${diffDays > 1 ? 'S' : ''}`;
  };

  // Formatear duración
  const formatDuration = (seconds) => {
    if (!seconds) return '00:00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Combinar actividades (comentarios + eventos de tiempo + eventos de fecha límite)
  const getAllActivities = () => {
    const activities = [];
    
    // Agregar comentarios
    comments.forEach(comment => {
      activities.push({
        type: 'comment',
        id: comment.id,
        author: comment.author || 'Usuario',
        text: comment.text,
        created_at: comment.created_at
      });
    });
    
    // Agregar eventos de tiempo
    timeEntries.forEach(entry => {
      // Evento de inicio
      activities.push({
        type: 'time_start',
        id: `${entry.id}_start`,
        author: entry.username,
        created_at: entry.start_time,
        duration: entry.duration
      });
      
      // Evento de fin (si existe)
      if (entry.end_time) {
        activities.push({
          type: 'time_stop',
          id: `${entry.id}_stop`,
          author: entry.username,
          created_at: entry.end_time,
          duration: entry.duration
        });
      }
    });
    
    // Agregar eventos de fecha límite
    dueDateActivities.forEach(activity => {
      activities.push({
        type: 'due_date',
        id: activity.id,
        author: activity.author,
        text: activity.text,
        created_at: activity.created_at
      });
    });
    
    // Ordenar por fecha descendente (más reciente primero)
    return activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  // Guardar cambios automáticamente
  const saveChanges = async (updates) => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('mm_auth_token');
      await fetch(`${API_URL}/api/boards/${boardId}/lists/${listId}/cards/${card.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      onUpdate(card.id, updates);
    } catch (error) {
      console.error('Error saving card:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Guardar título
  const handleSaveTitle = () => {
    if (title.trim() && title !== card.title) {
      saveChanges({ title: title.trim() });
    }
    setEditingTitle(false);
  };

  // Guardar descripción
  const handleSaveDescription = () => {
    if (description !== card.description) {
      saveChanges({ description });
    }
    setEditingDescription(false);
  };

  // Toggle label
  const toggleLabel = (colorId) => {
    const hasLabel = labels.some(l => l.color === colorId);
    let newLabels;
    if (hasLabel) {
      newLabels = labels.filter(l => l.color !== colorId);
    } else {
      newLabels = [...labels, { id: `label_${crypto.randomUUID()}`, color: colorId }];
    }
    setLabels(newLabels);
    saveChanges({ labels: newLabels });
  };

  // Set priority
  const handleSetPriority = (priorityId) => {
    setPriority(priorityId);
    saveChanges({ priority: priorityId });
    setShowPriorityPicker(false);
  };

  // Funciones del calendario
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Lunes = 0
    
    const days = [];
    // Días vacíos al inicio
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Días del mes
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const formatMonthYear = (date) => {
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  const prevMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1));
  };

  const isToday = (day) => {
    if (!day) return false;
    const today = new Date();
    return day === today.getDate() && 
           selectedMonth.getMonth() === today.getMonth() && 
           selectedMonth.getFullYear() === today.getFullYear();
  };

  const isSelectedDate = (day) => {
    if (!day || !dueDate) return false;
    // Parsear fecha directamente del string YYYY-MM-DD para evitar problemas de zona horaria
    const [year, month, dayOfMonth] = dueDate.split('-').map(Number);
    return day === dayOfMonth && 
           selectedMonth.getMonth() === (month - 1) && 
           selectedMonth.getFullYear() === year;
  };

  // Set due date con registro de actividad
  const handleSetDueDate = (date, time = dueTime) => {
    const previousDate = dueDate;
    const username = currentUser.username || currentUser.name || 'Usuario';
    
    // Crear registro de actividad
    let activityText = '';
    if (!previousDate && date) {
      activityText = `${username} estableció una fecha límite`;
    } else if (previousDate && date) {
      activityText = `${username} cambió el plazo`;
    } else if (previousDate && !date) {
      activityText = `${username} eliminó la fecha límite`;
    }
    
    const newActivity = activityText ? {
      id: `due_${Date.now()}`,
      type: 'due_date',
      text: activityText,
      author: username,
      created_at: new Date().toISOString(),
      old_date: previousDate,
      new_date: date
    } : null;
    
    const updatedActivities = newActivity 
      ? [newActivity, ...dueDateActivities]
      : dueDateActivities;
    
    setDueDate(date);
    setDueTime(time);
    setDueDateActivities(updatedActivities);
    saveChanges({ 
      due_date: date, 
      due_time: time,
      due_date_activities: updatedActivities 
    });
  };

  const handleSelectDay = (day) => {
    if (!day) return;
    // Crear fecha en formato YYYY-MM-DD sin conversión de zona horaria
    const year = selectedMonth.getFullYear();
    const month = String(selectedMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
    handleSetDueDate(dateStr, dueTime);
  };

  const clearDueDate = () => {
    handleSetDueDate('', '');
    setShowDatePicker(false);
  };

  const formatDueDateDisplay = () => {
    if (!dueDate) return null;
    // Parsear fecha directamente del string para evitar problemas de zona horaria
    const [year, month, day] = dueDate.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0); // Usar mediodía para evitar problemas
    const formattedDate = date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
    
    if (!dueTime) return formattedDate;
    
    // Convertir hora a formato 12h con AM/PM
    const [h, m] = dueTime.split(':');
    const hour = parseInt(h);
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedTime = `${displayHour}:${m} ${ampm}`;
    
    return `${formattedDate} ${formattedTime}`;
  };

  // Determinar color de fecha límite
  const getDueDateStatus = () => {
    if (!dueDate) return null;
    const now = new Date();
    // Parsear fecha directamente del string para evitar problemas de zona horaria
    const [year, month, day] = dueDate.split('-').map(Number);
    const due = new Date(year, month - 1, day, 12, 0, 0);
    if (dueTime) {
      const [hours, minutes] = dueTime.split(':');
      due.setHours(parseInt(hours), parseInt(minutes));
    }
    
    const diffMs = due - now;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    if (diffMs < 0) return 'overdue'; // Vencido
    if (diffDays <= 1) return 'urgent'; // Hoy o mañana
    if (diffDays <= 3) return 'soon'; // Próximos 3 días
    return 'normal';
  };

  // Checklist functions
  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    const newItem = {
      id: `check_${crypto.randomUUID()}`,
      text: newChecklistItem.trim(),
      completed: false
    };
    const newChecklist = [...checklist, newItem];
    setChecklist(newChecklist);
    setNewChecklistItem('');
    saveChanges({ checklist: newChecklist });
  };

  const toggleChecklistItem = (itemId) => {
    const newChecklist = checklist.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    setChecklist(newChecklist);
    saveChanges({ checklist: newChecklist });
  };

  const deleteChecklistItem = (itemId) => {
    const newChecklist = checklist.filter(item => item.id !== itemId);
    setChecklist(newChecklist);
    saveChanges({ checklist: newChecklist });
  };

  // Comments
  const addComment = () => {
    if (!newComment.trim()) return;
    const comment = {
      id: `comment_${crypto.randomUUID()}`,
      text: newComment.trim(),
      author: 'Usuario',
      created_at: new Date().toISOString()
    };
    const newComments = [...comments, comment];
    setComments(newComments);
    setNewComment('');
    saveChanges({ comments: newComments });
  };

  // Attachments - Subir imagen
  const handleAttachmentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validar que es una imagen
    if (!file.type.startsWith('image/')) {
      setAttachmentError('Solo se permiten archivos de imagen');
      setTimeout(() => setAttachmentError(''), 3000);
      return;
    }
    
    // Validar tamaño máximo (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setAttachmentError('La imagen no puede superar 10MB');
      setTimeout(() => setAttachmentError(''), 3000);
      return;
    }
    
    setUploadingAttachment(true);
    setAttachmentError('');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(
        `${API_URL}/api/boards/${boardId}/lists/${listId}/cards/${card.id}/attachments`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        // Agregar el adjunto al estado local
        const newAttachment = {
          ...data.attachment,
          data: data.attachment.data_url?.split(',')[1] // Extraer solo base64
        };
        setAttachments([...attachments, newAttachment]);
        
        // Notificar al padre para actualizar la tarjeta en el tablero
        if (onUpdate) {
          onUpdate({ ...card, attachments: [...attachments, newAttachment] });
        }
      } else {
        const errorData = await response.json();
        setAttachmentError(errorData.detail || 'Error al subir imagen');
        setTimeout(() => setAttachmentError(''), 3000);
      }
    } catch (error) {
      console.error('Error uploading attachment:', error);
      setAttachmentError('Error de conexión al subir imagen');
      setTimeout(() => setAttachmentError(''), 3000);
    } finally {
      setUploadingAttachment(false);
      // Limpiar el input para permitir subir el mismo archivo de nuevo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Attachments - Eliminar
  const handleDeleteAttachment = async (attachmentId) => {
    try {
      const response = await fetch(
        `${API_URL}/api/boards/${boardId}/lists/${listId}/cards/${card.id}/attachments/${attachmentId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (response.ok) {
        const newAttachments = attachments.filter(a => a.id !== attachmentId);
        setAttachments(newAttachments);
        
        // Notificar al padre
        if (onUpdate) {
          onUpdate({ ...card, attachments: newAttachments });
        }
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
    }
  };
  
  // Obtener URL de imagen preview (versión chica)
  const getAttachmentUrl = (attachment) => {
    if (attachment.data_url) return attachment.data_url;
    if (attachment.data) return `data:image/webp;base64,${attachment.data}`;
    return null;
  };
  
  // Obtener URL de imagen grande (vista ampliada)
  const getAttachmentUrlLarge = (attachment) => {
    if (attachment.data_url_large) return attachment.data_url_large;
    if (attachment.data_large) return `data:image/webp;base64,${attachment.data_large}`;
    // Fallback a preview si no hay versión grande
    return getAttachmentUrl(attachment);
  };
  
  // Abrir lightbox con imagen grande
  const openLightbox = (attachment) => {
    setLightboxImage({
      url: getAttachmentUrlLarge(attachment),
      filename: attachment.filename,
      width: attachment.width_large || attachment.width,
      height: attachment.height_large || attachment.height
    });
  };

  // Calcular progreso del checklist
  const checklistProgress = checklist.length > 0
    ? Math.round((checklist.filter(i => i.completed).length / checklist.length) * 100)
    : 0;

  // Obtener prioridad actual
  const currentPriority = PRIORITIES.find(p => p.id === priority);

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
      data-testid="task-modal-overlay"
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-4xl my-8 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        data-testid="task-modal"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4 flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Labels */}
            {labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {labels.map((label, idx) => {
                  const color = LABEL_COLORS.find(c => c.id === label.color);
                  return (
                    <span
                      key={idx}
                      className="h-2 w-10 rounded-full"
                      style={{ backgroundColor: color?.value || '#3B82F6' }}
                    />
                  );
                })}
              </div>
            )}
            
            {/* Title */}
            {editingTitle ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') { setEditingTitle(false); setTitle(card.title); }
                }}
                className="w-full text-xl font-bold bg-white/20 text-white placeholder-white/50 px-2 py-1 rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
                autoFocus
              />
            ) : (
              <h2 
                onClick={() => setEditingTitle(true)}
                className="text-xl font-bold text-white cursor-text hover:bg-white/10 px-2 py-1 -mx-2 rounded-lg transition-colors"
              >
                {title}
              </h2>
            )}
            
            {/* List info */}
            <div className="flex items-center gap-2 mt-2 text-white/70 text-sm">
              <span>en lista</span>
              <span className="bg-white/20 px-2 py-0.5 rounded font-medium">{listTitle}</span>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
            data-testid="close-task-modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col lg:flex-row">
          {/* Main content */}
          <div className="flex-1 p-6 space-y-6">
            {/* Description */}
            <div>
              <div className="flex items-center gap-2 mb-3 text-gray-700">
                <MessageSquare size={18} />
                <h3 className="font-semibold">Descripción</h3>
              </div>
              
              {editingDescription ? (
                <div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Añade una descripción más detallada..."
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 resize-none min-h-[120px]"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleSaveDescription}
                      className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => { setEditingDescription(false); setDescription(card.description || ''); }}
                      className="px-4 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setEditingDescription(true)}
                  className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-text min-h-[80px] transition-colors"
                >
                  {description ? (
                    <p className="text-gray-700 whitespace-pre-wrap">{description}</p>
                  ) : (
                    <p className="text-gray-400">Añade una descripción más detallada...</p>
                  )}
                </div>
              )}
            </div>

            {/* Checklist */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-gray-700">
                  <CheckSquare size={18} />
                  <h3 className="font-semibold">Checklist</h3>
                </div>
                {checklist.length > 0 && (
                  <span className="text-sm text-gray-500">{checklistProgress}%</span>
                )}
              </div>
              
              {/* Progress bar */}
              {checklist.length > 0 && (
                <div className="h-2 bg-gray-200 rounded-full mb-3 overflow-hidden">
                  <div 
                    className="h-full bg-cyan-500 transition-all duration-300"
                    style={{ width: `${checklistProgress}%` }}
                  />
                </div>
              )}
              
              {/* Checklist items */}
              <div className="space-y-2 mb-3">
                {checklist.map(item => (
                  <div key={item.id} className="flex items-center gap-3 group">
                    <button
                      onClick={() => toggleChecklistItem(item.id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        item.completed 
                          ? 'bg-cyan-500 border-cyan-500 text-white' 
                          : 'border-gray-300 hover:border-cyan-400'
                      }`}
                    >
                      {item.completed && <Check size={12} />}
                    </button>
                    <span className={`flex-1 ${item.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {item.text}
                    </span>
                    <button
                      onClick={() => deleteChecklistItem(item.id)}
                      className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Add checklist item */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
                  placeholder="Añadir elemento..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 text-sm"
                />
                <button
                  onClick={addChecklistItem}
                  disabled={!newChecklistItem.trim()}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Añadir
                </button>
              </div>
            </div>

            {/* Attachments Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-gray-700">
                  <Paperclip size={18} />
                  <h3 className="font-semibold">Adjuntos</h3>
                  {attachments.length > 0 && (
                    <span className="text-xs text-gray-400">({attachments.length})</span>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAttachment}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  {uploadingAttachment ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                  Añadir
                </button>
              </div>
              
              {/* Error message */}
              {attachmentError && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle size={14} />
                  {attachmentError}
                </div>
              )}
              
              {/* Upload progress */}
              {uploadingAttachment && (
                <div className="mb-3 p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
                  <div className="flex items-center gap-2 text-cyan-700">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">Subiendo y optimizando imagen...</span>
                  </div>
                </div>
              )}
              
              {/* Attachments grid */}
              {attachments.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {attachments.map(attachment => (
                    <div 
                      key={attachment.id}
                      className="group relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
                    >
                      <img
                        src={getAttachmentUrl(attachment)}
                        alt={attachment.filename}
                        className="w-full h-32 object-cover"
                      />
                      {/* Hover overlay con íconos */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-3 z-10">
                        {/* Ícono Ver (ojo) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openLightbox(attachment);
                          }}
                          className="p-2.5 bg-white text-gray-700 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-cyan-50 hover:text-cyan-600 shadow-lg hover:scale-110 pointer-events-auto"
                          title="Ver imagen"
                        >
                          <Eye size={16} />
                        </button>
                        {/* Ícono Eliminar (tachito) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleDeleteAttachment(attachment.id);
                          }}
                          className="p-2.5 bg-white text-gray-700 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-50 hover:text-red-600 shadow-lg hover:scale-110 pointer-events-auto"
                          title="Eliminar adjunto"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      {/* Info del archivo */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                        <p className="text-xs text-white truncate font-medium">{attachment.filename}</p>
                        {attachment.size_kb && (
                          <p className="text-[10px] text-white/80">{attachment.size_kb} KB</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-cyan-400 hover:bg-cyan-50/50 transition-colors"
                >
                  <Image size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">Haz clic para adjuntar una imagen</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, GIF o WebP (máx. 10MB)</p>
                </div>
              )}
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAttachmentUpload}
                className="hidden"
              />
            </div>

            {/* Time Tracking */}
            <TimeTracker 
              taskId={card.id}
              boardId={boardId}
              listId={listId}
              taskTitle={card.title}
              onTimeUpdate={loadTimeEntries}
            />

            {/* Comments / Activity */}
            <div>
              <div className="flex items-center gap-2 mb-3 text-gray-700">
                <MessageSquare size={18} />
                <h3 className="font-semibold">Actividad</h3>
              </div>
              
              {/* Add comment */}
              <div className="flex gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  U
                </div>
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Escribe un comentario..."
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 resize-none text-sm"
                    rows={2}
                  />
                  {newComment && (
                    <button
                      onClick={addComment}
                      className="mt-2 px-4 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Guardar
                    </button>
                  )}
                </div>
              </div>
              
              {/* Activity list - Combined comments and time events and due date events */}
              <div className="space-y-3">
                {getAllActivities().map(activity => (
                  <div key={activity.id} className="flex gap-3">
                    {/* Icon based on activity type */}
                    {activity.type === 'time_start' && (
                      <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                        <Play size={14} className="text-white ml-0.5" fill="white" />
                      </div>
                    )}
                    {activity.type === 'time_stop' && (
                      <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                        <Square size={12} className="text-white" fill="white" />
                      </div>
                    )}
                    {activity.type === 'due_date' && (
                      <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                        <Calendar size={14} className="text-white" />
                      </div>
                    )}
                    {activity.type === 'comment' && (
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm font-bold flex-shrink-0">
                        {activity.author?.charAt(0) || 'U'}
                      </div>
                    )}
                    
                    <div className="flex-1">
                      {/* Time event */}
                      {(activity.type === 'time_start' || activity.type === 'time_stop') && (
                        <div>
                          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                            {formatRelativeTime(activity.created_at)}
                          </p>
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">{activity.author}</span>
                            {activity.type === 'time_start' 
                              ? ' comenzó a hacer un registro del tiempo.'
                              : ' dejó de hacer un registro del tiempo.'
                            }
                          </p>
                          {activity.type === 'time_stop' && activity.duration && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Duración: {formatDuration(activity.duration)}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Due date event */}
                      {activity.type === 'due_date' && (
                        <div>
                          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                            {formatRelativeTime(activity.created_at)}
                          </p>
                          <p className="text-sm text-gray-700">
                            {activity.text}
                          </p>
                        </div>
                      )}
                      
                      {/* Comment */}
                      {activity.type === 'comment' && (
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm text-gray-900">{activity.author}</span>
                            <span className="text-xs text-gray-400">
                              {new Date(activity.created_at).toLocaleDateString('es-ES', { 
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{activity.text}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {getAllActivities().length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No hay actividad aún</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-72 bg-gray-50 p-6 space-y-4 border-t lg:border-t-0 lg:border-l border-gray-200">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Añadir a la tarjeta</h4>
            
            {/* Labels */}
            <div className="relative">
              <button
                onClick={() => setShowLabelPicker(!showLabelPicker)}
                className="w-full flex items-center gap-3 px-3 py-2.5 bg-white hover:bg-gray-100 rounded-lg transition-colors text-left border border-gray-200"
              >
                <Tag size={16} className="text-gray-500" />
                <span className="text-sm text-gray-700">Etiquetas</span>
                {labels.length > 0 && (
                  <span className="ml-auto text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full">
                    {labels.length}
                  </span>
                )}
              </button>
              
              {showLabelPicker && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-10">
                  <div className="grid grid-cols-4 gap-2">
                    {LABEL_COLORS.map(color => {
                      const isSelected = labels.some(l => l.color === color.id);
                      return (
                        <button
                          key={color.id}
                          onClick={() => toggleLabel(color.id)}
                          className={`h-8 rounded-lg transition-all ${
                            isSelected ? 'ring-2 ring-offset-2 ring-gray-400 scale-105' : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Due Date con Calendario */}
            <div className="relative">
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left border ${
                  dueDate 
                    ? getDueDateStatus() === 'overdue'
                      ? 'bg-red-50 border-red-200 hover:bg-red-100'
                      : getDueDateStatus() === 'urgent'
                        ? 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                        : 'bg-white border-gray-200 hover:bg-gray-100'
                    : 'bg-white border-gray-200 hover:bg-gray-100'
                }`}
              >
                <Calendar size={16} className={`${
                  getDueDateStatus() === 'overdue' ? 'text-red-500' :
                  getDueDateStatus() === 'urgent' ? 'text-amber-500' : 'text-gray-500'
                }`} />
                <span className={`text-sm ${
                  getDueDateStatus() === 'overdue' ? 'text-red-600 font-medium' :
                  getDueDateStatus() === 'urgent' ? 'text-amber-600 font-medium' : 'text-gray-700'
                }`}>
                  {dueDate ? formatDueDateDisplay() : 'Fecha límite'}
                </span>
              </button>
              
              {/* Popup del calendario */}
              {showDatePicker && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-20">
                  {/* Header del calendario */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={prevMonth}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronLeft size={18} className="text-gray-600" />
                    </button>
                    <span className="text-sm font-semibold text-gray-700 capitalize">
                      {formatMonthYear(selectedMonth)}
                    </span>
                    <button
                      onClick={nextMonth}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronRight size={18} className="text-gray-600" />
                    </button>
                  </div>
                  
                  {/* Días de la semana */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['LU', 'MA', 'MI', 'JU', 'VI', 'SÁ', 'DO'].map(day => (
                      <div key={day} className="text-center text-xs font-medium text-gray-400 py-1">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Grid de días */}
                  <div className="grid grid-cols-7 gap-1 mb-4">
                    {getDaysInMonth(selectedMonth).map((day, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectDay(day)}
                        disabled={!day}
                        className={`h-8 w-8 rounded-full text-sm transition-colors ${
                          !day 
                            ? 'cursor-default' 
                            : isSelectedDate(day)
                              ? 'bg-cyan-500 text-white font-semibold'
                              : isToday(day)
                                ? 'bg-cyan-100 text-cyan-700 font-medium'
                                : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                  
                  {/* Selector de hora con AM/PM */}
                  <div className="border-t border-gray-200 pt-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-gray-600">Vence a las</span>
                      <div className="flex items-center gap-1">
                        {/* Selector de hora (1-12) */}
                        <select
                          value={(() => {
                            const [h] = dueTime.split(':');
                            const hour = parseInt(h);
                            if (hour === 0) return '12';
                            if (hour > 12) return String(hour - 12);
                            return String(hour);
                          })()}
                          onChange={(e) => {
                            const [, m] = dueTime.split(':');
                            const [h] = dueTime.split(':');
                            const currentHour = parseInt(h);
                            const isPM = currentHour >= 12;
                            let newHour = parseInt(e.target.value);
                            if (isPM) {
                              newHour = newHour === 12 ? 12 : newHour + 12;
                            } else {
                              newHour = newHour === 12 ? 0 : newHour;
                            }
                            const newTime = `${String(newHour).padStart(2, '0')}:${m}`;
                            setDueTime(newTime);
                            if (dueDate) handleSetDueDate(dueDate, newTime);
                          }}
                          className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 bg-white"
                        >
                          {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <span className="text-gray-400">:</span>
                        {/* Selector de minutos */}
                        <select
                          value={dueTime.split(':')[1]}
                          onChange={(e) => {
                            const [h] = dueTime.split(':');
                            const newTime = `${h}:${e.target.value}`;
                            setDueTime(newTime);
                            if (dueDate) handleSetDueDate(dueDate, newTime);
                          }}
                          className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 bg-white"
                        >
                          {['00', '15', '30', '45'].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        {/* Selector AM/PM */}
                        <select
                          value={parseInt(dueTime.split(':')[0]) >= 12 ? 'PM' : 'AM'}
                          onChange={(e) => {
                            const [h, m] = dueTime.split(':');
                            let hour = parseInt(h);
                            const isPM = e.target.value === 'PM';
                            
                            // Convertir a formato 24h
                            if (isPM && hour < 12) {
                              hour += 12;
                            } else if (!isPM && hour >= 12) {
                              hour -= 12;
                            }
                            
                            const newTime = `${String(hour).padStart(2, '0')}:${m}`;
                            setDueTime(newTime);
                            if (dueDate) handleSetDueDate(dueDate, newTime);
                          }}
                          className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 bg-white font-medium"
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  {/* Fecha seleccionada y botón borrar */}
                  {dueDate && (
                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">Fecha límite:</span>
                        <span className="font-medium text-gray-900">{formatDueDateDisplay()}</span>
                      </div>
                      <button
                        onClick={clearDueDate}
                        className="w-full py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium border border-red-200"
                      >
                        Borrar Fecha Límite
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Priority */}
            <div className="relative">
              <button
                onClick={() => setShowPriorityPicker(!showPriorityPicker)}
                className="w-full flex items-center gap-3 px-3 py-2.5 bg-white hover:bg-gray-100 rounded-lg transition-colors text-left border border-gray-200"
              >
                <Flag size={16} className="text-gray-500" />
                <span className="text-sm text-gray-700">
                  {currentPriority ? (
                    <span className="flex items-center gap-2">
                      <span>{currentPriority.icon}</span>
                      <span>{currentPriority.label}</span>
                    </span>
                  ) : 'Prioridad'}
                </span>
              </button>
              
              {showPriorityPicker && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-10">
                  {PRIORITIES.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleSetPriority(p.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors ${
                        priority === p.id ? 'bg-gray-50' : ''
                      }`}
                    >
                      <span>{p.icon}</span>
                      <span className="text-sm text-gray-700">{p.label}</span>
                      {priority === p.id && <Check size={14} className="ml-auto text-cyan-500" />}
                    </button>
                  ))}
                  {priority && (
                    <button
                      onClick={() => handleSetPriority('')}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-sm text-gray-500 border-t border-gray-100"
                    >
                      <X size={14} />
                      Quitar prioridad
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Members (placeholder) */}
            <button className="w-full flex items-center gap-3 px-3 py-2.5 bg-white hover:bg-gray-100 rounded-lg transition-colors text-left border border-gray-200">
              <Users size={16} className="text-gray-500" />
              <span className="text-sm text-gray-700">Miembros</span>
            </button>

            {/* Attachments */}
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAttachment}
              className="w-full flex items-center gap-3 px-3 py-2.5 bg-white hover:bg-gray-100 rounded-lg transition-colors text-left border border-gray-200 disabled:opacity-50"
            >
              {uploadingAttachment ? (
                <Loader2 size={16} className="text-cyan-500 animate-spin" />
              ) : (
                <Paperclip size={16} className="text-gray-500" />
              )}
              <span className="text-sm text-gray-700">
                {uploadingAttachment ? 'Subiendo...' : 'Adjuntos'}
                {attachments.length > 0 && !uploadingAttachment && (
                  <span className="ml-1 text-gray-400">({attachments.length})</span>
                )}
              </span>
            </button>

            {/* Divider */}
            <hr className="border-gray-200" />

            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</h4>

            {/* Move (placeholder) */}
            <button className="w-full flex items-center gap-3 px-3 py-2.5 bg-white hover:bg-gray-100 rounded-lg transition-colors text-left border border-gray-200">
              <ChevronRight size={16} className="text-gray-500" />
              <span className="text-sm text-gray-700">Mover</span>
            </button>

            {/* Watch (placeholder) */}
            <button className="w-full flex items-center gap-3 px-3 py-2.5 bg-white hover:bg-gray-100 rounded-lg transition-colors text-left border border-gray-200">
              <Eye size={16} className="text-gray-500" />
              <span className="text-sm text-gray-700">Seguir</span>
            </button>

            {/* Delete */}
            <button 
              onClick={() => {
                if (window.confirm('¿Eliminar esta tarea?')) {
                  onDelete(card.id);
                  onClose();
                }
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-left border border-red-200"
            >
              <Trash2 size={16} className="text-red-500" />
              <span className="text-sm text-red-600">Eliminar tarea</span>
            </button>

            {/* Metadata */}
            <div className="pt-4 border-t border-gray-200 text-xs text-gray-400 space-y-1">
              <p>ID: {card.id}</p>
              {card.created_at && (
                <p>Creado: {new Date(card.created_at).toLocaleDateString('es-ES')}</p>
              )}
              {isSaving && (
                <p className="text-cyan-500 flex items-center gap-1">
                  <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
                  Guardando...
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Lightbox para vista ampliada de imagen */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          {/* Botón cerrar */}
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={24} className="text-white" />
          </button>
          
          {/* Info de la imagen */}
          <div className="absolute top-4 left-4 text-white">
            <p className="font-medium">{lightboxImage.filename}</p>
            <p className="text-sm text-white/70">
              {lightboxImage.width} × {lightboxImage.height} px
            </p>
          </div>
          
          {/* Imagen ampliada */}
          <img
            src={lightboxImage.url}
            alt={lightboxImage.filename}
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default TaskModal;

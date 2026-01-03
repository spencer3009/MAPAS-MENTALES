import React, { useState, useEffect } from 'react';
import { 
  X, Calendar, Tag, Users, CheckSquare, Paperclip, 
  MessageSquare, Clock, Flag, Link2, Eye, MoreHorizontal,
  Plus, Trash2, Check, Edit2, ChevronRight, AlertCircle
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

  // Set due date
  const handleSetDueDate = (date) => {
    setDueDate(date);
    saveChanges({ due_date: date });
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

            {/* Time Tracking */}
            <TimeTracker 
              taskId={card.id}
              boardId={boardId}
              listId={listId}
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
              
              {/* Comments list */}
              <div className="space-y-4">
                {comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm font-bold flex-shrink-0">
                      {comment.author?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-900">{comment.author || 'Usuario'}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(comment.created_at).toLocaleDateString('es-ES', { 
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{comment.text}</p>
                    </div>
                  </div>
                ))}
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

            {/* Due Date */}
            <div>
              <button
                onClick={() => document.getElementById('due-date-input').showPicker()}
                className="w-full flex items-center gap-3 px-3 py-2.5 bg-white hover:bg-gray-100 rounded-lg transition-colors text-left border border-gray-200"
              >
                <Calendar size={16} className="text-gray-500" />
                <span className="text-sm text-gray-700">
                  {dueDate ? new Date(dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : 'Fecha límite'}
                </span>
                {dueDate && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSetDueDate(''); }}
                    className="ml-auto p-1 hover:bg-gray-200 rounded"
                  >
                    <X size={14} className="text-gray-400" />
                  </button>
                )}
              </button>
              <input
                id="due-date-input"
                type="date"
                value={dueDate}
                onChange={(e) => handleSetDueDate(e.target.value)}
                className="sr-only"
              />
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

            {/* Attachments (placeholder) */}
            <button className="w-full flex items-center gap-3 px-3 py-2.5 bg-white hover:bg-gray-100 rounded-lg transition-colors text-left border border-gray-200">
              <Paperclip size={16} className="text-gray-500" />
              <span className="text-sm text-gray-700">Adjuntos</span>
            </button>

            {/* Divider */}
            <hr className="border-gray-200" />

            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</h4>

            {/* Move (placeholder) */}
            <button className="w-full flex items-center gap-3 px-3 py-2.5 bg-white hover:bg-gray-100 rounded-lg transition-colors text-left border border-gray-200">
              <ChevronRight size={16} className="text-gray-500" />
              <span className="text-sm text-gray-700">Mover</span>
            </button>

            {/* Copy (placeholder) */}
            <button className="w-full flex items-center gap-3 px-3 py-2.5 bg-white hover:bg-gray-100 rounded-lg transition-colors text-left border border-gray-200">
              <Link2 size={16} className="text-gray-500" />
              <span className="text-sm text-gray-700">Copiar</span>
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
    </div>
  );
};

export default TaskModal;

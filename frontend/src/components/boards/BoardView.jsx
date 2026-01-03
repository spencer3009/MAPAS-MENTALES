import React, { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Plus, X, ArrowLeft, Trash2, 
  Tag, Edit2, Check,
  Lightbulb, TrendingUp, CheckCircle2, 
  Users, Share2, LayoutGrid, Clock, Bell,
  MoreHorizontal, Calendar, CheckSquare
} from 'lucide-react';
import TaskModal from './TaskModal';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Colores de etiquetas para tarjetas
const LABEL_COLORS = [
  { id: 'green', value: '#22C55E' },
  { id: 'yellow', value: '#EAB308' },
  { id: 'orange', value: '#F97316' },
  { id: 'red', value: '#EF4444' },
  { id: 'purple', value: '#A855F7' },
  { id: 'blue', value: '#3B82F6' },
];

// Colores predefinidos para listas según referencia visual
// Abiertas: Cyan/Teal, En Progreso: Azul, Listo: Morado
const LIST_THEMES = {
  // Columna por defecto (primera o "Abiertas")
  abiertas: { bg: '#CFFAFE', header: '#06B6D4', text: '#FFFFFF', icon: Lightbulb },
  // Columna de progreso
  progreso: { bg: '#DBEAFE', header: '#3B82F6', text: '#FFFFFF', icon: TrendingUp },
  // Columna completado
  listo: { bg: '#EDE9FE', header: '#8B5CF6', text: '#FFFFFF', icon: CheckCircle2 },
  // Fallback gris
  default: { bg: '#F3F4F6', header: '#9CA3AF', text: '#FFFFFF', icon: LayoutGrid },
};

// ==========================================
// SORTABLE CARD COMPONENT
// Toda la tarjeta es draggable (UX mejorado)
// ==========================================
const SortableCard = ({ card, listId, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [showActions, setShowActions] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, data: { type: 'card', card, listId } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle !== card.title) {
      onUpdate(card.id, { title: editTitle.trim() });
    }
    setIsEditing(false);
  };

  const toggleLabel = (colorId) => {
    const currentLabels = card.labels || [];
    const hasLabel = currentLabels.some(l => l.color === colorId);
    
    let newLabels;
    if (hasLabel) {
      newLabels = currentLabels.filter(l => l.color !== colorId);
    } else {
      newLabels = [...currentLabels, { id: `label_${crypto.randomUUID()}`, color: colorId }];
    }
    
    onUpdate(card.id, { labels: newLabels });
  };

  // Si está editando, no hacer draggable
  if (isEditing) {
    return (
      <div
        ref={setNodeRef}
        data-testid={`card-${card.id}`}
        className="bg-white rounded-lg shadow-sm border border-cyan-300 ring-2 ring-cyan-200"
      >
        <div className="p-3">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveTitle();
              if (e.key === 'Escape') { setIsEditing(false); setEditTitle(card.title); }
            }}
            onBlur={handleSaveTitle}
            className="w-full px-2 py-1.5 text-sm border border-cyan-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
            autoFocus
          />
          <div className="flex justify-end gap-1 mt-2">
            <button
              onClick={() => { setIsEditing(false); setEditTitle(card.title); }}
              className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveTitle}
              className="px-2 py-1 text-xs bg-cyan-500 text-white rounded hover:bg-cyan-600"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-testid={`card-${card.id}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowLabelPicker(false); }}
      className={`group bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 select-none ${
        isDragging 
          ? 'shadow-2xl ring-2 ring-cyan-400 rotate-2 scale-105' 
          : 'border border-gray-100 hover:border-cyan-200'
      }`}
    >
      {/* Labels */}
      {card.labels && card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pt-3">
          {card.labels.map((label, idx) => {
            const color = LABEL_COLORS.find(c => c.id === label.color);
            return (
              <div
                key={idx}
                className="h-2 w-12 rounded-full"
                style={{ backgroundColor: color?.value || '#3B82F6' }}
              />
            );
          })}
        </div>
      )}
      
      {/* Content */}
      <div className="p-3">
        <p className="text-sm text-gray-700 leading-relaxed break-words pr-6">{card.title}</p>
        
        {/* Actions - visible on hover */}
        {showActions && (
          <div className="flex items-center gap-1 mt-2 animate-fadeIn">
            <button
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="p-1.5 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
              title="Editar"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowLabelPicker(!showLabelPicker); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              title="Etiquetas"
            >
              <Tag size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Eliminar"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
        
        {/* Label Picker */}
        {showLabelPicker && (
          <div 
            className="mt-3 p-2 bg-gray-50 rounded-lg border border-gray-100"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap gap-1.5">
              {LABEL_COLORS.map(color => {
                const isSelected = card.labels?.some(l => l.color === color.id);
                return (
                  <button
                    key={color.id}
                    onClick={(e) => { e.stopPropagation(); toggleLabel(color.id); }}
                    className={`w-7 h-7 rounded-md transition-all ${
                      isSelected ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.value }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// DROPPABLE LIST AREA (para drop en listas vacías)
// ==========================================
const DroppableListArea = ({ listId, children }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `droppable-${listId}`,
    data: { type: 'list', listId }
  });

  return (
    <div 
      ref={setNodeRef}
      className={`min-h-[120px] rounded-lg transition-colors ${
        isOver ? 'bg-cyan-100/50 ring-2 ring-cyan-300 ring-dashed' : ''
      }`}
    >
      {children}
    </div>
  );
};

// ==========================================
// SORTABLE LIST COMPONENT (Columna tipo Trello)
// ==========================================
const SortableList = ({ list, listIndex, boardId, onUpdateList, onDeleteList, onAddCard, onUpdateCard, onDeleteCard }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(list.title);
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  
  // Determinar tema de la lista basado en el color guardado, título o índice
  const getListTheme = () => {
    const titleLower = list.title.toLowerCase();
    
    // Usar el color de la lista si existe (desde backend)
    if (list.color) {
      if (list.color === '#06B6D4') return LIST_THEMES.abiertas;
      if (list.color === '#3B82F6') return LIST_THEMES.progreso;
      if (list.color === '#8B5CF6') return LIST_THEMES.listo;
    }
    
    // Fallback por título
    if (titleLower.includes('abierta') || titleLower.includes('open') || titleLower.includes('to do') || titleLower.includes('todo')) {
      return LIST_THEMES.abiertas;
    }
    if (titleLower.includes('progreso') || titleLower.includes('progress') || titleLower.includes('doing')) {
      return LIST_THEMES.progreso;
    }
    if (titleLower.includes('listo') || titleLower.includes('done') || titleLower.includes('completado') || titleLower.includes('complete')) {
      return LIST_THEMES.listo;
    }
    
    // Fallback por posición (primeras 3 columnas)
    if (listIndex === 0) return LIST_THEMES.abiertas;
    if (listIndex === 1) return LIST_THEMES.progreso;
    if (listIndex === 2) return LIST_THEMES.listo;
    
    return LIST_THEMES.default;
  };
  
  const theme = getListTheme();
  const IconComponent = theme.icon;
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: list.id, data: { type: 'list', list } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  };

  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle !== list.title) {
      onUpdateList(list.id, editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleAddCard = () => {
    if (newCardTitle.trim()) {
      onAddCard(list.id, newCardTitle.trim());
      setNewCardTitle('');
      setShowAddCard(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`list-${list.id}`}
      className={`flex-shrink-0 w-72 rounded-xl overflow-hidden flex flex-col ${
        isDragging ? 'ring-2 ring-cyan-400 shadow-xl' : 'shadow-sm'
      }`}
    >
      {/* Header con color distintivo - draggable para mover columna */}
      <div 
        {...attributes}
        {...listeners}
        className="px-4 py-3 flex items-center gap-2 cursor-grab active:cursor-grabbing"
        style={{ backgroundColor: theme.header }}
      >
        <IconComponent size={18} className="text-white/90" />
        
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveTitle();
              if (e.key === 'Escape') { setIsEditing(false); setEditTitle(list.title); }
            }}
            onBlur={handleSaveTitle}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex-1 px-2 py-1 text-sm font-semibold bg-white/20 text-white placeholder-white/50 border border-white/30 rounded focus:outline-none focus:ring-1 focus:ring-white/50"
            autoFocus
          />
        ) : (
          <h3
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex-1 font-semibold cursor-text hover:opacity-80 transition-opacity"
            style={{ color: theme.text }}
          >
            {list.title}
          </h3>
        )}
        
        {/* Contador de tarjetas */}
        <span 
          className="px-2 py-0.5 text-xs font-medium rounded-full bg-white/20"
          style={{ color: theme.text }}
        >
          {list.cards.length}
        </span>
        
        <button
          onClick={(e) => { e.stopPropagation(); onDeleteList(list.id); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>
      
      {/* Cards Container - SIEMPRE visible con altura mínima */}
      <div 
        className="px-3 py-3 flex-1 overflow-y-auto"
        style={{ backgroundColor: theme.bg, minHeight: '200px', maxHeight: '65vh' }}
      >
        {/* Botón añadir tarea superior */}
        <button
          onClick={() => setShowAddCard(true)}
          className="w-full mb-3 flex items-center justify-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-700 bg-white/60 hover:bg-white rounded-lg transition-all text-sm font-medium border border-dashed border-gray-300 hover:border-gray-400"
          data-testid={`add-card-btn-${list.id}`}
        >
          <Plus size={16} />
          Añadir Tarea
        </button>
        
        {/* Área droppable para las tarjetas */}
        <DroppableListArea listId={list.id}>
          <SortableContext
            items={list.cards.map(c => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {list.cards.length === 0 && !showAddCard ? (
                /* Estado vacío - SIEMPRE visible */
                <div className="py-6 flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full bg-white/80 flex items-center justify-center mb-3 shadow-sm">
                    <CheckCircle2 size={28} className="text-gray-300" />
                  </div>
                  <p className="text-gray-400 text-sm font-medium">No hay tareas</p>
                  <p className="text-gray-300 text-xs mt-1">Arrastra aquí o crea una nueva</p>
                </div>
              ) : (
                list.cards.map(card => (
                  <SortableCard
                    key={card.id}
                    card={card}
                    listId={list.id}
                    onUpdate={(cardId, data) => onUpdateCard(list.id, cardId, data)}
                    onDelete={(cardId) => onDeleteCard(list.id, cardId)}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </DroppableListArea>
        
        {/* Add Card Form */}
        {showAddCard && (
          <div className="mt-2 bg-white rounded-lg shadow-sm border border-gray-200 p-3">
            <textarea
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              placeholder="¿Qué necesitas hacer?"
              className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 resize-none"
              rows={2}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddCard();
                }
                if (e.key === 'Escape') {
                  setShowAddCard(false);
                  setNewCardTitle('');
                }
              }}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleAddCard}
                disabled={!newCardTitle.trim()}
                className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-300 text-white text-sm rounded-lg transition-colors font-medium"
              >
                Añadir
              </button>
              <button
                onClick={() => { setShowAddCard(false); setNewCardTitle(''); }}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// COLLABORATION SECTION (Sección de invitar)
// ==========================================
const CollaborationSection = () => {
  return (
    <div className="flex-shrink-0 w-72 bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users size={20} className="text-gray-400" />
          <h3 className="font-semibold text-gray-700">Añadir miembros</h3>
        </div>
        
        <p className="text-sm text-gray-500 mb-4 leading-relaxed">
          Lleva tu productividad a otras alturas y colabora con colegas y amigos.
        </p>
        
        <button 
          className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors font-medium text-sm"
          data-testid="invite-members-btn"
        >
          Invitar
        </button>
      </div>
      
      {/* Avatar placeholders */}
      <div className="px-4 pb-4">
        <div className="flex -space-x-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
            <span className="text-xs text-gray-400">+</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// MAIN BOARD VIEW COMPONENT
// ==========================================
const BoardView = ({ board: initialBoard, onBack }) => {
  const [board, setBoard] = useState(initialBoard);
  const [activeId, setActiveId] = useState(null);
  const [activeItem, setActiveItem] = useState(null);
  const [showAddList, setShowAddList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Fetch fresh board data on mount
  useEffect(() => {
    let isMounted = true;
    const loadBoard = async () => {
      try {
        const token = localStorage.getItem('mm_auth_token');
        const response = await fetch(`${API_URL}/api/boards/${initialBoard.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok && isMounted) {
          const data = await response.json();
          setBoard(data.board);
        }
      } catch (error) {
        console.error('Error fetching board:', error);
      }
    };
    loadBoard();
    return () => { isMounted = false; };
  }, [initialBoard.id]);

  // API Calls
  const addList = async () => {
    if (!newListTitle.trim()) return;
    
    try {
      const token = localStorage.getItem('mm_auth_token');
      const response = await fetch(`${API_URL}/api/boards/${board.id}/lists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: newListTitle.trim() })
      });
      
      if (response.ok) {
        const data = await response.json();
        setBoard(prev => ({
          ...prev,
          lists: [...prev.lists, { ...data.list, cards: [] }]
        }));
        setNewListTitle('');
        setShowAddList(false);
      }
    } catch (error) {
      console.error('Error creating list:', error);
    }
  };

  const updateList = async (listId, title) => {
    try {
      const token = localStorage.getItem('mm_auth_token');
      await fetch(`${API_URL}/api/boards/${board.id}/lists/${listId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title })
      });
      
      setBoard(prev => ({
        ...prev,
        lists: prev.lists.map(l => l.id === listId ? { ...l, title } : l)
      }));
    } catch (error) {
      console.error('Error updating list:', error);
    }
  };

  const deleteList = async (listId) => {
    if (!window.confirm('¿Eliminar esta lista y todas sus tarjetas?')) return;
    
    try {
      const token = localStorage.getItem('mm_auth_token');
      await fetch(`${API_URL}/api/boards/${board.id}/lists/${listId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setBoard(prev => ({
        ...prev,
        lists: prev.lists.filter(l => l.id !== listId)
      }));
    } catch (error) {
      console.error('Error deleting list:', error);
    }
  };

  const addCard = async (listId, title) => {
    try {
      const token = localStorage.getItem('mm_auth_token');
      const response = await fetch(`${API_URL}/api/boards/${board.id}/lists/${listId}/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title })
      });
      
      if (response.ok) {
        const data = await response.json();
        setBoard(prev => ({
          ...prev,
          lists: prev.lists.map(l => 
            l.id === listId 
              ? { ...l, cards: [...l.cards, data.card] }
              : l
          )
        }));
      }
    } catch (error) {
      console.error('Error creating card:', error);
    }
  };

  const updateCard = async (listId, cardId, updates) => {
    try {
      const token = localStorage.getItem('mm_auth_token');
      await fetch(`${API_URL}/api/boards/${board.id}/lists/${listId}/cards/${cardId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      
      setBoard(prev => ({
        ...prev,
        lists: prev.lists.map(l => 
          l.id === listId 
            ? { ...l, cards: l.cards.map(c => c.id === cardId ? { ...c, ...updates } : c) }
            : l
        )
      }));
    } catch (error) {
      console.error('Error updating card:', error);
    }
  };

  const deleteCard = async (listId, cardId) => {
    try {
      const token = localStorage.getItem('mm_auth_token');
      await fetch(`${API_URL}/api/boards/${board.id}/lists/${listId}/cards/${cardId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setBoard(prev => ({
        ...prev,
        lists: prev.lists.map(l => 
          l.id === listId 
            ? { ...l, cards: l.cards.filter(c => c.id !== cardId) }
            : l
        )
      }));
    } catch (error) {
      console.error('Error deleting card:', error);
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);
    setActiveItem(active.data.current);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const activeType = active.data.current?.type;
    
    // Solo manejar cards durante dragOver para permitir drop en listas vacías
    if (activeType === 'card') {
      const activeCard = active.data.current.card;
      const sourceListId = active.data.current.listId;
      
      // Determinar destino
      let destListId = null;
      
      if (over.data.current?.type === 'card') {
        destListId = over.data.current.listId;
      } else if (over.data.current?.type === 'list') {
        destListId = over.data.current.listId || over.id;
      } else if (over.id.toString().startsWith('droppable-')) {
        destListId = over.data.current?.listId;
      }
      
      // Si cambiamos de lista, mover la tarjeta
      if (destListId && sourceListId !== destListId) {
        setBoard(prev => {
          const newLists = prev.lists.map(l => {
            if (l.id === sourceListId) {
              return { ...l, cards: l.cards.filter(c => c.id !== active.id) };
            }
            if (l.id === destListId) {
              // Evitar duplicados
              if (l.cards.some(c => c.id === activeCard.id)) return l;
              return { ...l, cards: [...l.cards, activeCard] };
            }
            return l;
          });
          return { ...prev, lists: newLists };
        });
        
        // Actualizar la referencia del listId activo
        active.data.current.listId = destListId;
      }
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    setActiveId(null);
    setActiveItem(null);
    
    if (!over) return;

    const activeType = active.data.current?.type;
    
    if (activeType === 'list') {
      // Reorder lists
      if (active.id !== over.id) {
        const oldIndex = board.lists.findIndex(l => l.id === active.id);
        let newIndex = board.lists.findIndex(l => l.id === over.id);
        
        if (newIndex === -1) newIndex = board.lists.length - 1;
        
        const newLists = arrayMove(board.lists, oldIndex, newIndex);
        setBoard(prev => ({ ...prev, lists: newLists }));
        
        // Save to backend
        const token = localStorage.getItem('mm_auth_token');
        await fetch(`${API_URL}/api/boards/${board.id}/lists/reorder`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ list_ids: newLists.map(l => l.id) })
        });
      }
    } else if (activeType === 'card') {
      const activeCard = active.data.current.card;
      const sourceListId = active.data.current.listId;
      
      // Determinar destino final
      let destListId = sourceListId;
      let newPosition = 0;
      
      if (over.data.current?.type === 'card') {
        destListId = over.data.current.listId;
        const destList = board.lists.find(l => l.id === destListId);
        newPosition = destList?.cards.findIndex(c => c.id === over.id) ?? 0;
      } else if (over.data.current?.type === 'list' || over.id.toString().startsWith('droppable-')) {
        destListId = over.data.current?.listId || over.id;
        const destList = board.lists.find(l => l.id === destListId);
        newPosition = destList?.cards.length ?? 0;
      }
      
      // Reordenar dentro de la misma lista
      if (sourceListId === destListId && over.data.current?.type === 'card') {
        const list = board.lists.find(l => l.id === sourceListId);
        const oldIndex = list.cards.findIndex(c => c.id === active.id);
        if (oldIndex !== newPosition) {
          const newCards = arrayMove(list.cards, oldIndex, newPosition);
          setBoard(prev => ({
            ...prev,
            lists: prev.lists.map(l => 
              l.id === sourceListId ? { ...l, cards: newCards } : l
            )
          }));
        }
      } else if (sourceListId !== destListId) {
        // Guardar en backend el movimiento entre listas
        const token = localStorage.getItem('mm_auth_token');
        await fetch(`${API_URL}/api/boards/${board.id}/cards/move`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            source_list_id: sourceListId,
            destination_list_id: destListId,
            card_id: active.id,
            new_position: newPosition
          })
        });
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA]" data-testid="board-view">
      {/* Header - Barra superior estilo referencia */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="px-4 py-3 flex items-center justify-between">
          {/* Left section */}
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              data-testid="back-btn"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: board.background_color }}>
                <LayoutGrid size={16} className="text-white" />
              </div>
              <h1 className="text-lg font-semibold text-gray-800">{board.title}</h1>
            </div>
          </div>
          
          {/* Right section - Actions */}
          <div className="flex items-center gap-2">
            <button 
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
              data-testid="share-board-btn"
            >
              <Share2 size={16} />
              Compartir
            </button>
            
            <div className="flex items-center gap-1 ml-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Vista tabla">
                <LayoutGrid size={18} className="text-gray-500" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Miembros">
                <Users size={18} className="text-gray-500" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Tiempo">
                <Clock size={18} className="text-gray-500" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Completadas">
                <CheckCircle2 size={18} className="text-gray-500" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Notificaciones">
                <Bell size={18} className="text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Board Content - SCROLL HORIZONTAL MEJORADO */}
      <div 
        className="flex-1 overflow-x-auto overflow-y-hidden"
        style={{ 
          scrollbarWidth: 'thin',
          scrollbarColor: '#06B6D4 #E5E7EB'
        }}
      >
        <div className="p-6 min-w-max">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={board.lists.map(l => l.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex gap-5 items-start pb-4">
                {board.lists.map((list, index) => (
                <SortableList
                  key={list.id}
                  list={list}
                  listIndex={index}
                  boardId={board.id}
                  onUpdateList={updateList}
                  onDeleteList={deleteList}
                  onAddCard={addCard}
                  onUpdateCard={updateCard}
                  onDeleteCard={deleteCard}
                />
              ))}
              
              {/* Add List Button / Form */}
              <div className="flex-shrink-0 w-72">
                {showAddList ? (
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <input
                      type="text"
                      value={newListTitle}
                      onChange={(e) => setNewListTitle(e.target.value)}
                      placeholder="Nombre de la sección..."
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addList();
                        if (e.key === 'Escape') { setShowAddList(false); setNewListTitle(''); }
                      }}
                    />
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={addList}
                        disabled={!newListTitle.trim()}
                        className="flex-1 px-3 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-300 text-white text-sm rounded-lg transition-colors font-medium"
                      >
                        Añadir sección
                      </button>
                      <button
                        onClick={() => { setShowAddList(false); setNewListTitle(''); }}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddList(true)}
                    className="w-full flex items-center gap-2 px-4 py-3 text-cyan-600 hover:text-cyan-700 bg-white/80 hover:bg-white rounded-xl transition-all font-medium text-sm border border-dashed border-cyan-300 hover:border-cyan-400"
                    data-testid="add-section-btn"
                  >
                    <Plus size={20} />
                    Añadir Sección
                  </button>
                )}
              </div>
              
              {/* Collaboration Section */}
              <CollaborationSection />
            </div>
          </SortableContext>

          {/* Drag Overlay - Visual feedback mejorado */}
          <DragOverlay>
            {activeItem?.type === 'card' && (
              <div className="bg-white rounded-lg shadow-2xl border-2 border-cyan-400 p-3 w-64 rotate-3 scale-105">
                {activeItem.card.labels && activeItem.card.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {activeItem.card.labels.map((label, idx) => {
                      const color = LABEL_COLORS.find(c => c.id === label.color);
                      return (
                        <div
                          key={idx}
                          className="h-2 w-12 rounded-full"
                          style={{ backgroundColor: color?.value || '#3B82F6' }}
                        />
                      );
                    })}
                  </div>
                )}
                <p className="text-sm text-gray-800 font-medium">{activeItem.card.title}</p>
              </div>
            )}
            {activeItem?.type === 'list' && (
              <div className="bg-gray-100 rounded-xl w-72 p-3 shadow-2xl rotate-2 border-2 border-cyan-400">
                <h3 className="font-semibold text-gray-800">{activeItem.list.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{activeItem.list.cards?.length || 0} tarjetas</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
        </div>
      </div>
    </div>
  );
};

export default BoardView;

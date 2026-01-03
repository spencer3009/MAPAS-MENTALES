import React, { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
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
  Plus, X, MoreHorizontal, ArrowLeft, Trash2, 
  GripVertical, Tag, Edit2, Check 
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Colores de etiquetas
const LABEL_COLORS = [
  { id: 'green', value: '#22C55E' },
  { id: 'yellow', value: '#EAB308' },
  { id: 'orange', value: '#F97316' },
  { id: 'red', value: '#EF4444' },
  { id: 'purple', value: '#A855F7' },
  { id: 'blue', value: '#3B82F6' },
];

// ==========================================
// SORTABLE CARD COMPONENT
// ==========================================
const SortableCard = ({ card, listId, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  
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
    opacity: isDragging ? 0.5 : 1,
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
      newLabels = [...currentLabels, { id: `label_${Date.now()}`, color: colorId }];
    }
    
    onUpdate(card.id, { labels: newLabels });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-white rounded-lg shadow-sm border border-gray-200 hover:border-gray-300 transition-all ${
        isDragging ? 'shadow-lg ring-2 ring-blue-400' : ''
      }`}
    >
      {/* Labels */}
      {card.labels && card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 pt-2">
          {card.labels.map((label, idx) => {
            const color = LABEL_COLORS.find(c => c.id === label.color);
            return (
              <div
                key={idx}
                className="h-2 w-10 rounded-full"
                style={{ backgroundColor: color?.value || '#3B82F6' }}
              />
            );
          })}
        </div>
      )}
      
      {/* Content */}
      <div className="p-3">
        {isEditing ? (
          <div className="flex gap-1">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
              onBlur={handleSaveTitle}
              className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={handleSaveTitle}
              className="p-1 text-green-600 hover:bg-green-50 rounded"
            >
              <Check size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <button
              {...attributes}
              {...listeners}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing transition-opacity"
            >
              <GripVertical size={14} />
            </button>
            <p className="flex-1 text-sm text-gray-800 break-words">{card.title}</p>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Editar"
          >
            <Edit2 size={12} />
          </button>
          <button
            onClick={() => setShowLabelPicker(!showLabelPicker)}
            className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
            title="Etiquetas"
          >
            <Tag size={12} />
          </button>
          <button
            onClick={() => onDelete(card.id)}
            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Eliminar"
          >
            <Trash2 size={12} />
          </button>
        </div>
        
        {/* Label Picker */}
        {showLabelPicker && (
          <div className="mt-2 p-2 bg-gray-50 rounded-lg">
            <div className="flex flex-wrap gap-1">
              {LABEL_COLORS.map(color => {
                const isSelected = card.labels?.some(l => l.color === color.id);
                return (
                  <button
                    key={color.id}
                    onClick={() => toggleLabel(color.id)}
                    className={`w-6 h-6 rounded transition-all ${
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
// SORTABLE LIST COMPONENT
// ==========================================
const SortableList = ({ list, boardId, onUpdateList, onDeleteList, onAddCard, onUpdateCard, onDeleteCard }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(list.title);
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  
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
    opacity: isDragging ? 0.5 : 1,
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
      className={`flex-shrink-0 w-72 bg-gray-100 rounded-xl ${isDragging ? 'ring-2 ring-blue-400' : ''}`}
    >
      {/* Header */}
      <div className="p-3 flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
        >
          <GripVertical size={16} />
        </button>
        
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
            onBlur={handleSaveTitle}
            className="flex-1 px-2 py-1 text-sm font-medium border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
        ) : (
          <h3
            onClick={() => setIsEditing(true)}
            className="flex-1 font-medium text-gray-800 cursor-pointer hover:text-blue-600 transition-colors"
          >
            {list.title}
          </h3>
        )}
        
        <button
          onClick={() => onDeleteList(list.id)}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <X size={16} />
        </button>
      </div>
      
      {/* Cards Container */}
      <div className="px-2 pb-2 max-h-[60vh] overflow-y-auto">
        <SortableContext
          items={list.cards.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {list.cards.map(card => (
              <SortableCard
                key={card.id}
                card={card}
                listId={list.id}
                onUpdate={(cardId, data) => onUpdateCard(list.id, cardId, data)}
                onDelete={(cardId) => onDeleteCard(list.id, cardId)}
              />
            ))}
          </div>
        </SortableContext>
        
        {/* Add Card */}
        {showAddCard ? (
          <div className="mt-2">
            <textarea
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              placeholder="Título de la tarjeta..."
              className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
              rows={2}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddCard();
                }
              }}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleAddCard}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
              >
                Añadir
              </button>
              <button
                onClick={() => { setShowAddCard(false); setNewCardTitle(''); }}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddCard(true)}
            className="w-full mt-2 flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors text-sm"
          >
            <Plus size={16} />
            Añadir tarjeta
          </button>
        )}
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
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Fetch fresh board data
  useEffect(() => {
    fetchBoard();
  }, [initialBoard.id]);

  const fetchBoard = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/boards/${initialBoard.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBoard(data.board);
      }
    } catch (error) {
      console.error('Error fetching board:', error);
    }
  };

  // API Calls
  const updateBoardInDB = async (updates) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/boards/${board.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
    } catch (error) {
      console.error('Error updating board:', error);
    }
  };

  const addList = async () => {
    if (!newListTitle.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
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
      const token = localStorage.getItem('token');
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
      const token = localStorage.getItem('token');
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
      const token = localStorage.getItem('token');
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
      const token = localStorage.getItem('token');
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
      const token = localStorage.getItem('token');
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

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      setActiveItem(null);
      return;
    }

    const activeType = active.data.current?.type;
    
    if (activeType === 'list') {
      // Reorder lists
      if (active.id !== over.id) {
        const oldIndex = board.lists.findIndex(l => l.id === active.id);
        const newIndex = board.lists.findIndex(l => l.id === over.id);
        
        const newLists = arrayMove(board.lists, oldIndex, newIndex);
        setBoard(prev => ({ ...prev, lists: newLists }));
        
        // Save to backend
        const token = localStorage.getItem('token');
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
      // Move card
      const activeCard = active.data.current.card;
      const sourceListId = active.data.current.listId;
      
      // Find destination
      let destListId = sourceListId;
      let newPosition = 0;
      
      if (over.data.current?.type === 'card') {
        destListId = over.data.current.listId;
        const destList = board.lists.find(l => l.id === destListId);
        newPosition = destList.cards.findIndex(c => c.id === over.id);
      } else if (over.data.current?.type === 'list') {
        destListId = over.id;
        const destList = board.lists.find(l => l.id === destListId);
        newPosition = destList.cards.length;
      }
      
      if (sourceListId === destListId) {
        // Reorder within same list
        const list = board.lists.find(l => l.id === sourceListId);
        const oldIndex = list.cards.findIndex(c => c.id === active.id);
        const newCards = arrayMove(list.cards, oldIndex, newPosition);
        
        setBoard(prev => ({
          ...prev,
          lists: prev.lists.map(l => 
            l.id === sourceListId ? { ...l, cards: newCards } : l
          )
        }));
      } else {
        // Move to different list
        setBoard(prev => {
          const newLists = prev.lists.map(l => {
            if (l.id === sourceListId) {
              return { ...l, cards: l.cards.filter(c => c.id !== active.id) };
            }
            if (l.id === destListId) {
              const newCards = [...l.cards];
              newCards.splice(newPosition, 0, activeCard);
              return { ...l, cards: newCards };
            }
            return l;
          });
          return { ...prev, lists: newLists };
        });
        
        // Save to backend
        const token = localStorage.getItem('token');
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
    
    setActiveId(null);
    setActiveItem(null);
  };

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: board.background_color }}
    >
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>
          
          <h1 className="text-xl font-semibold text-white">{board.title}</h1>
        </div>
      </div>

      {/* Board Content */}
      <div className="flex-1 overflow-x-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={board.lists.map(l => l.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex gap-4 items-start min-h-full">
              {board.lists.map(list => (
                <SortableList
                  key={list.id}
                  list={list}
                  boardId={board.id}
                  onUpdateList={updateList}
                  onDeleteList={deleteList}
                  onAddCard={addCard}
                  onUpdateCard={updateCard}
                  onDeleteCard={deleteCard}
                />
              ))}
              
              {/* Add List */}
              <div className="flex-shrink-0 w-72">
                {showAddList ? (
                  <div className="bg-gray-100 rounded-xl p-3">
                    <input
                      type="text"
                      value={newListTitle}
                      onChange={(e) => setNewListTitle(e.target.value)}
                      placeholder="Nombre de la lista..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && addList()}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={addList}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                      >
                        Añadir lista
                      </button>
                      <button
                        onClick={() => { setShowAddList(false); setNewListTitle(''); }}
                        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddList(true)}
                    className="w-full flex items-center gap-2 px-4 py-3 bg-white/30 hover:bg-white/40 text-white rounded-xl transition-colors font-medium"
                  >
                    <Plus size={20} />
                    Añadir lista
                  </button>
                )}
              </div>
            </div>
          </SortableContext>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeItem?.type === 'card' && (
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 w-64">
                <p className="text-sm text-gray-800">{activeItem.card.title}</p>
              </div>
            )}
            {activeItem?.type === 'list' && (
              <div className="bg-gray-100 rounded-xl w-72 p-3">
                <h3 className="font-medium text-gray-800">{activeItem.list.title}</h3>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
};

export default BoardView;

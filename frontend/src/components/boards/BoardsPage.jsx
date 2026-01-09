import React, { useState, useEffect, useRef } from 'react';
import { Plus, LayoutGrid, Search, Trash2, ArrowLeft, MoreHorizontal, Star, Clock, AlertTriangle, X, Pencil, Copy, FolderInput, Loader2, Check, Users } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { ShareModal } from '../sharing/ShareModal';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Colores disponibles para tableros (paleta profesional)
const BOARD_COLORS = [
  { id: 'blue', value: '#3B82F6', name: 'Azul' },
  { id: 'cyan', value: '#06B6D4', name: 'Cyan' },
  { id: 'green', value: '#10B981', name: 'Verde' },
  { id: 'purple', value: '#8B5CF6', name: 'Morado' },
  { id: 'pink', value: '#EC4899', name: 'Rosa' },
  { id: 'orange', value: '#F59E0B', name: 'Naranja' },
  { id: 'red', value: '#EF4444', name: 'Rojo' },
  { id: 'teal', value: '#14B8A6', name: 'Teal' },
  { id: 'indigo', value: '#6366F1', name: 'Índigo' },
  { id: 'gray', value: '#6B7280', name: 'Gris' },
];

const BoardsPage = ({ onBack, onSelectBoard, onTrashUpdate }) => {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newBoardColor, setNewBoardColor] = useState('#3B82F6');
  const [creating, setCreating] = useState(false);
  
  // Estados para edición inline
  const [editingBoardId, setEditingBoardId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const [titleError, setTitleError] = useState('');
  const editInputRef = useRef(null);
  
  // Estado para duplicación
  const [duplicatingBoardId, setDuplicatingBoardId] = useState(null);
  
  // Estado para compartir
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareBoard, setShareBoard] = useState(null);
  
  // Estado para mensajes de éxito/error
  const [toast, setToast] = useState(null);

  // Cargar tableros
  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      const token = localStorage.getItem('mm_auth_token');
      const response = await fetch(`${API_URL}/api/boards`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBoards(data.boards || []);
      }
    } catch (error) {
      console.error('Error fetching boards:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mostrar toast temporal
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Iniciar edición inline
  const startEditing = (board) => {
    setEditingBoardId(board.id);
    setEditingTitle(board.title);
    setTitleError('');
    // Focus en el input después de renderizar
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  // Cancelar edición
  const cancelEditing = () => {
    setEditingBoardId(null);
    setEditingTitle('');
    setTitleError('');
  };

  // Guardar título editado
  const saveTitle = async (boardId) => {
    const trimmedTitle = editingTitle.trim();
    
    // Validaciones
    if (!trimmedTitle) {
      setTitleError('El nombre no puede estar vacío');
      return;
    }
    if (trimmedTitle.length > 60) {
      setTitleError('Máximo 60 caracteres');
      return;
    }
    
    // Verificar si cambió
    const board = boards.find(b => b.id === boardId);
    if (board && board.title === trimmedTitle) {
      cancelEditing();
      return;
    }
    
    setSavingTitle(true);
    setTitleError('');
    
    try {
      const token = localStorage.getItem('mm_auth_token');
      const response = await fetch(`${API_URL}/api/boards/${boardId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: trimmedTitle })
      });
      
      if (response.ok) {
        const data = await response.json();
        setBoards(boards.map(b => b.id === boardId ? data.board : b));
        cancelEditing();
        showToast('Nombre actualizado');
      } else {
        const errorData = await response.json();
        setTitleError(errorData.detail || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error saving title:', error);
      setTitleError('Error de conexión');
    } finally {
      setSavingTitle(false);
    }
  };

  // Duplicar tablero
  const duplicateBoard = async (board) => {
    setDuplicatingBoardId(board.id);
    
    try {
      const token = localStorage.getItem('mm_auth_token');
      const response = await fetch(`${API_URL}/api/boards/${board.id}/duplicate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBoards([...boards, data.board]);
        showToast(`Tablero "${data.board.title}" creado`);
      } else {
        const errorData = await response.json();
        showToast(errorData.detail || 'Error al duplicar', 'error');
      }
    } catch (error) {
      console.error('Error duplicating board:', error);
      showToast('Error de conexión', 'error');
    } finally {
      setDuplicatingBoardId(null);
    }
  };

  // Hook para mover a carpeta (preparado para futuro)
  const moveToFolder = (board) => {
    showToast('Función próximamente disponible', 'info');
    // TODO: Implementar cuando exista la UI de carpetas
  };

  const createBoard = async () => {
    if (!newBoardTitle.trim()) return;
    
    setCreating(true);
    try {
      const token = localStorage.getItem('mm_auth_token');
      const response = await fetch(`${API_URL}/api/boards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newBoardTitle,
          background_color: newBoardColor
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setBoards([...boards, data.board]);
        setShowCreateModal(false);
        setNewBoardTitle('');
        setNewBoardColor('#3B82F6');
      }
    } catch (error) {
      console.error('Error creating board:', error);
    } finally {
      setCreating(false);
    }
  };

  const [confirmDeleteBoard, setConfirmDeleteBoard] = useState(null);
  
  const deleteBoard = async (boardId) => {
    try {
      const token = localStorage.getItem('mm_auth_token');
      const response = await fetch(`${API_URL}/api/boards/${boardId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        setBoards(boards.filter(b => b.id !== boardId));
        setConfirmDeleteBoard(null);
        if (onTrashUpdate) onTrashUpdate(); // Actualizar contador de papelera
      }
    } catch (error) {
      console.error('Error deleting board:', error);
    }
  };

  const filteredBoards = boards.filter(board =>
    board.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen w-full bg-[#F5F7FA]" data-testid="boards-page">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                data-testid="back-btn"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <LayoutGrid className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Tableros</h1>
                  <p className="text-xs text-gray-500">Organiza tus proyectos</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl transition-colors font-medium text-sm shadow-sm"
              data-testid="create-board-btn"
            >
              <Plus size={18} />
              Crear tablero
            </button>
          </div>
        </div>
      </div>

      {/* Content - Ancho completo */}
      <div className="px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar tableros..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 shadow-sm"
              data-testid="search-boards-input"
            />
          </div>
        </div>

        {/* Boards Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full" />
          </div>
        ) : filteredBoards.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
              <LayoutGrid className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm ? 'No se encontraron tableros' : 'No tienes tableros aún'}
            </h3>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">
              {searchTerm ? 'Intenta con otro término de búsqueda' : 'Crea tu primer tablero para organizar tus proyectos con estilo Kanban'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl transition-colors font-medium shadow-sm"
                data-testid="create-first-board-btn"
              >
                <Plus size={20} />
                Crear mi primer tablero
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Section Header */}
            <div className="flex items-center gap-2 mb-4">
              <Star size={16} className="text-yellow-500" />
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Mis Tableros</h2>
              <span className="text-xs text-gray-400">({filteredBoards.length})</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredBoards.map(board => (
                <div
                  key={board.id}
                  onClick={() => {
                    if (editingBoardId !== board.id) {
                      onSelectBoard(board);
                    }
                  }}
                  className={`group relative bg-white rounded-xl cursor-pointer border border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 ${
                    duplicatingBoardId === board.id ? 'opacity-70 pointer-events-none' : ''
                  }`}
                  data-testid={`board-card-${board.id}`}
                >
                  {/* Color accent bar - top */}
                  <div 
                    className="h-1.5 rounded-t-xl"
                    style={{ backgroundColor: board.background_color }}
                  />
                  
                  {/* Indicador de duplicando */}
                  {duplicatingBoardId === board.id && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-20 rounded-xl">
                      <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                        <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
                        <span className="text-sm font-medium text-gray-700">Duplicando...</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Content */}
                  <div className="p-4">
                    {/* Header with title and menu */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      {/* Título editable */}
                      {editingBoardId === board.id ? (
                        <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editingTitle}
                            onChange={(e) => {
                              setEditingTitle(e.target.value);
                              if (titleError) setTitleError('');
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                saveTitle(board.id);
                              }
                              if (e.key === 'Escape') {
                                cancelEditing();
                              }
                            }}
                            onBlur={() => {
                              if (!savingTitle) {
                                saveTitle(board.id);
                              }
                            }}
                            maxLength={60}
                            className={`w-full bg-gray-50 text-gray-900 font-semibold text-sm rounded-lg px-3 py-2 outline-none ring-2 ${
                              titleError ? 'ring-red-400' : 'ring-cyan-400'
                            }`}
                            data-testid={`edit-board-title-input-${board.id}`}
                          />
                          {titleError && (
                            <div className="mt-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
                              {titleError}
                            </div>
                          )}
                          <div className="mt-2 flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                saveTitle(board.id);
                              }}
                              disabled={savingTitle}
                              className="p-1.5 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-white transition-colors"
                              data-testid={`save-board-title-${board.id}`}
                            >
                              {savingTitle ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelEditing();
                              }}
                              className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
                              data-testid={`cancel-edit-board-${board.id}`}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 min-w-0">
                          <h3 
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(board);
                            }}
                            className="text-gray-900 font-semibold text-base leading-tight line-clamp-2 hover:text-cyan-600 cursor-pointer transition-colors"
                            title="Clic para editar nombre"
                            data-testid={`board-title-${board.id}`}
                          >
                            {board.title}
                          </h3>
                        </div>
                      )}
                      
                      {/* Color indicator + Menu */}
                      {editingBoardId !== board.id && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <div 
                            className="w-3 h-3 rounded-full ring-2 ring-white shadow-sm"
                            style={{ backgroundColor: board.background_color }}
                            title="Color del tablero"
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                data-testid={`board-menu-${board.id}`}
                              >
                                <MoreHorizontal size={16} className="text-gray-400" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditing(board);
                                }}
                                className="cursor-pointer"
                                data-testid={`rename-board-${board.id}`}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Renombrar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  duplicateBoard(board);
                                }}
                                className="cursor-pointer"
                                data-testid={`duplicate-board-${board.id}`}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicar tablero
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShareBoard(board);
                                  setShareModalOpen(true);
                                }}
                                className="cursor-pointer text-blue-600"
                                data-testid={`share-board-${board.id}`}
                              >
                                <Users className="mr-2 h-4 w-4" />
                                Compartir
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveToFolder(board);
                                }}
                                className="cursor-pointer text-gray-400"
                                data-testid={`move-board-${board.id}`}
                              >
                                <FolderInput className="mr-2 h-4 w-4" />
                                Mover a carpeta
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteBoard(board);
                                }}
                                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                                data-testid={`delete-menu-board-${board.id}`}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar tablero
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                    
                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} />
                        <span>{new Date(board.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      {board.lists && (
                        <div className="flex items-center gap-1.5">
                          <LayoutGrid size={12} />
                          <span>{board.lists.length} {board.lists.length === 1 ? 'lista' : 'listas'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Hover effect bar */}
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: board.background_color }}
                  />
                </div>
              ))}
              
              {/* Create new board card */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="min-h-[120px] rounded-xl border-2 border-dashed border-gray-200 hover:border-cyan-400 bg-gray-50/50 hover:bg-white transition-all duration-200 flex flex-col items-center justify-center gap-3 group"
                data-testid="create-board-card"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-cyan-50 flex items-center justify-center transition-colors">
                  <Plus size={20} className="text-gray-400 group-hover:text-cyan-500 transition-colors" />
                </div>
                <span className="text-sm font-medium text-gray-400 group-hover:text-cyan-600 transition-colors">
                  Nuevo tablero
                </span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div 
            className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Crear tablero</h2>
              
              {/* Preview */}
              <div
                className="rounded-xl h-28 mb-6 p-4 flex items-end relative overflow-hidden"
                style={{ backgroundColor: newBoardColor }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                <span className="text-white font-semibold text-lg truncate drop-shadow relative z-10">
                  {newBoardTitle || 'Nombre del tablero'}
                </span>
              </div>
              
              {/* Title input */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Título del tablero
                </label>
                <input
                  type="text"
                  value={newBoardTitle}
                  onChange={(e) => setNewBoardTitle(e.target.value)}
                  placeholder="Ej: Proyecto Web, Marketing Q1..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 text-sm"
                  autoFocus
                  data-testid="new-board-title-input"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newBoardTitle.trim()) createBoard();
                    if (e.key === 'Escape') setShowCreateModal(false);
                  }}
                />
              </div>
              
              {/* Color picker */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Color de fondo
                </label>
                <div className="flex flex-wrap gap-2">
                  {BOARD_COLORS.map(color => (
                    <button
                      key={color.id}
                      onClick={() => setNewBoardColor(color.value)}
                      className={`w-10 h-10 rounded-xl transition-all duration-200 ${
                        newBoardColor === color.value 
                          ? 'ring-2 ring-offset-2 ring-gray-400 scale-110 shadow-lg' 
                          : 'hover:scale-105 hover:shadow-md'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                      data-testid={`color-${color.id}`}
                    />
                  ))}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={createBoard}
                  disabled={!newBoardTitle.trim() || creating}
                  className="flex-1 px-4 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors font-medium"
                  data-testid="confirm-create-board-btn"
                >
                  {creating ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creando...
                    </span>
                  ) : 'Crear tablero'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {confirmDeleteBoard && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div 
            className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-7 h-7 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">¿Eliminar tablero?</h2>
                <p className="text-gray-600">
                  ¿Estás seguro de que deseas eliminar <span className="font-semibold">&ldquo;{confirmDeleteBoard.title}&rdquo;</span>?
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Puedes recuperarlo luego desde la <span className="font-medium text-cyan-600">Papelera</span>.
                </p>
              </div>
              
              {/* Preview del tablero a eliminar */}
              <div 
                className="rounded-xl h-16 mb-6 p-3 flex items-end relative overflow-hidden"
                style={{ backgroundColor: confirmDeleteBoard.background_color }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                <span className="text-white font-semibold text-sm truncate drop-shadow relative z-10">
                  {confirmDeleteBoard.title}
                </span>
              </div>
              
              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeleteBoard(null)}
                  className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => deleteBoard(confirmDeleteBoard.id)}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast de notificación */}
      {toast && (
        <div 
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-4 ${
            toast.type === 'error' ? 'bg-red-600 text-white' :
            toast.type === 'info' ? 'bg-gray-800 text-white' :
            'bg-green-600 text-white'
          }`}
          data-testid="toast-notification"
        >
          {toast.type === 'success' && <Check size={18} />}
          {toast.type === 'error' && <AlertTriangle size={18} />}
          <span className="text-sm font-medium">{toast.message}</span>
          <button 
            onClick={() => setToast(null)}
            className="ml-2 p-1 hover:bg-white/20 rounded"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Modal de Compartir */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => {
          setShareModalOpen(false);
          setShareBoard(null);
        }}
        resourceType="board"
        resourceId={shareBoard?.id}
        resourceName={shareBoard?.title}
        onCollaboratorsChange={fetchBoards}
      />
    </div>
  );
};

export default BoardsPage;

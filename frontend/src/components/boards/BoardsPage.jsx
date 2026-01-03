import React, { useState, useEffect } from 'react';
import { Plus, LayoutGrid, Search, Trash2, MoreHorizontal, ArrowLeft } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Colores disponibles para tableros
const BOARD_COLORS = [
  { id: 'blue', value: '#3B82F6', name: 'Azul' },
  { id: 'green', value: '#10B981', name: 'Verde' },
  { id: 'purple', value: '#8B5CF6', name: 'Morado' },
  { id: 'pink', value: '#EC4899', name: 'Rosa' },
  { id: 'orange', value: '#F59E0B', name: 'Naranja' },
  { id: 'red', value: '#EF4444', name: 'Rojo' },
  { id: 'teal', value: '#14B8A6', name: 'Teal' },
  { id: 'indigo', value: '#6366F1', name: 'Índigo' },
];

const BoardsPage = ({ onBack, onSelectBoard }) => {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newBoardColor, setNewBoardColor] = useState('#3B82F6');
  const [creating, setCreating] = useState(false);

  // Cargar tableros
  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      const token = localStorage.getItem('token');
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

  const createBoard = async () => {
    if (!newBoardTitle.trim()) return;
    
    setCreating(true);
    try {
      const token = localStorage.getItem('token');
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

  const deleteBoard = async (boardId, e) => {
    e.stopPropagation();
    if (!window.confirm('¿Estás seguro de eliminar este tablero?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/boards/${boardId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        setBoards(boards.filter(b => b.id !== boardId));
      }
    } catch (error) {
      console.error('Error deleting board:', error);
    }
  };

  const filteredBoards = boards.filter(board =>
    board.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-6 h-6 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900">Tableros</h1>
              </div>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm"
            >
              <Plus size={18} />
              Crear tablero
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar tableros..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Boards Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : filteredBoards.length === 0 ? (
          <div className="text-center py-12">
            <LayoutGrid className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No se encontraron tableros' : 'No tienes tableros aún'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm ? 'Intenta con otro término de búsqueda' : 'Crea tu primer tablero para organizar tus proyectos'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus size={18} />
                Crear tablero
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredBoards.map(board => (
              <div
                key={board.id}
                onClick={() => onSelectBoard(board)}
                className="group relative rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-lg transition-all duration-200 h-32"
                style={{ backgroundColor: board.background_color }}
              >
                {/* Content */}
                <div className="absolute inset-0 p-4 flex flex-col justify-between">
                  <h3 className="text-white font-semibold text-lg truncate drop-shadow-sm">
                    {board.title}
                  </h3>
                  
                  {/* Actions */}
                  <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white/70 text-xs">
                      {new Date(board.created_at).toLocaleDateString('es-ES')}
                    </span>
                    <button
                      onClick={(e) => deleteBoard(board.id, e)}
                      className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} className="text-white" />
                    </button>
                  </div>
                </div>
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Crear tablero</h2>
              
              {/* Preview */}
              <div
                className="rounded-lg h-24 mb-6 p-4 flex items-end"
                style={{ backgroundColor: newBoardColor }}
              >
                <span className="text-white font-medium truncate drop-shadow">
                  {newBoardTitle || 'Nombre del tablero'}
                </span>
              </div>
              
              {/* Title input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título del tablero
                </label>
                <input
                  type="text"
                  value={newBoardTitle}
                  onChange={(e) => setNewBoardTitle(e.target.value)}
                  placeholder="Mi nuevo tablero"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  autoFocus
                />
              </div>
              
              {/* Color picker */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color de fondo
                </label>
                <div className="flex flex-wrap gap-2">
                  {BOARD_COLORS.map(color => (
                    <button
                      key={color.id}
                      onClick={() => setNewBoardColor(color.value)}
                      className={`w-10 h-10 rounded-lg transition-all ${
                        newBoardColor === color.value ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={createBoard}
                  disabled={!newBoardTitle.trim() || creating}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl transition-colors font-medium"
                >
                  {creating ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardsPage;

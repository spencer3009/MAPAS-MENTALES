import React, { useState, useEffect, useCallback } from 'react';
import { 
  Trash2, RotateCcw, AlertTriangle, X, Clock, 
  FileText, Loader2, ArrowLeft, Layers, Trash, LayoutGrid
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TrashView = ({ isOpen, onClose, onProjectRestored, token }) => {
  const [trashProjects, setTrashProjects] = useState([]);
  const [trashBoards, setTrashBoards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [emptyingTrash, setEmptyingTrash] = useState(false);
  const [activeTab, setActiveTab] = useState('maps'); // 'maps' or 'boards'

  // Cargar proyectos y tableros de la papelera
  const fetchTrashItems = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Cargar mapas
      const projectsRes = await fetch(`${API_URL}/api/projects/trash`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setTrashProjects(projectsData);
      }
      
      // Cargar tableros
      const boardsRes = await fetch(`${API_URL}/api/boards/trash`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (boardsRes.ok) {
        const boardsData = await boardsRes.json();
        setTrashBoards(boardsData);
      }
    } catch (err) {
      console.error('Error fetching trash:', err);
      setError('No se pudo cargar la papelera');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Cargar cuando se abre
  useEffect(() => {
    if (isOpen) {
      fetchTrashItems();
    }
  }, [isOpen, fetchTrashItems]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (confirmDelete) {
          setConfirmDelete(null);
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose, confirmDelete]);

  // Restaurar proyecto (mapa)
  const handleRestoreProject = async (projectId) => {
    setActionLoading(projectId);
    
    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/restore`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Error al restaurar');
      }
      
      setTrashProjects(prev => prev.filter(p => p.id !== projectId));
      if (onProjectRestored) onProjectRestored();
    } catch (err) {
      console.error('Error restoring project:', err);
      setError('No se pudo restaurar el mapa');
    } finally {
      setActionLoading(null);
    }
  };

  // Restaurar tablero
  const handleRestoreBoard = async (boardId) => {
    setActionLoading(boardId);
    
    try {
      const response = await fetch(`${API_URL}/api/boards/${boardId}/restore`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Error al restaurar');
      }
      
      setTrashBoards(prev => prev.filter(b => b.id !== boardId));
      if (onProjectRestored) onProjectRestored(); // Actualizar contador
    } catch (err) {
      console.error('Error restoring board:', err);
      setError('No se pudo restaurar el tablero');
    } finally {
      setActionLoading(null);
    }
  };

  // Eliminar permanentemente proyecto (mapa)
  const handleDeletePermanentProject = async (projectId) => {
    setActionLoading(projectId);
    
    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/permanent`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Error al eliminar');
      }
      
      setTrashProjects(prev => prev.filter(p => p.id !== projectId));
      setConfirmDelete(null);
      if (onProjectRestored) onProjectRestored(); // Actualizar contador
    } catch (err) {
      console.error('Error deleting project:', err);
      setError('No se pudo eliminar el mapa');
    } finally {
      setActionLoading(null);
    }
  };

  // Eliminar permanentemente tablero
  const handleDeletePermanentBoard = async (boardId) => {
    setActionLoading(boardId);
    
    try {
      const response = await fetch(`${API_URL}/api/boards/${boardId}/permanent`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Error al eliminar');
      }
      
      setTrashBoards(prev => prev.filter(b => b.id !== boardId));
      setConfirmDelete(null);
      if (onProjectRestored) onProjectRestored(); // Actualizar contador
    } catch (err) {
      console.error('Error deleting board:', err);
      setError('No se pudo eliminar el tablero');
    } finally {
      setActionLoading(null);
    }
  };

  // Vaciar papelera completa
  const handleEmptyTrash = async () => {
    setEmptyingTrash(true);
    
    try {
      // Vaciar mapas
      await fetch(`${API_URL}/api/projects/trash/empty`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Vaciar tableros
      await fetch(`${API_URL}/api/boards/trash/empty`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setTrashProjects([]);
      setTrashBoards([]);
      setConfirmEmptyTrash(false);
      if (onProjectRestored) onProjectRestored(); // Actualizar contador
    } catch (err) {
      console.error('Error emptying trash:', err);
      setError('No se pudo vaciar la papelera');
    } finally {
      setEmptyingTrash(false);
    }
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha desconocida';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  const totalItems = trashProjects.length + trashBoards.length;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-orange-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Papelera</h2>
              <p className="text-white/70 text-sm">{totalItems} elementos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('maps')}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'maps'
                ? 'text-cyan-600 border-b-2 border-cyan-500 bg-cyan-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Layers size={16} />
            Mapas ({trashProjects.length})
          </button>
          <button
            onClick={() => setActiveTab('boards')}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'boards'
                ? 'text-cyan-600 border-b-2 border-cyan-500 bg-cyan-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <LayoutGrid size={16} />
            Tableros ({trashBoards.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <p className="text-gray-600">{error}</p>
            </div>
          ) : (
            <>
              {/* Mapas */}
              {activeTab === 'maps' && (
                <>
                  {trashProjects.length === 0 ? (
                    <div className="text-center py-12">
                      <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No hay mapas en la papelera</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {trashProjects.map((project) => (
                        <div
                          key={project.id}
                          className="bg-gray-50 rounded-xl p-4 flex items-center justify-between group hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FileText className="w-5 h-5 text-white" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-medium text-gray-900 truncate">{project.name}</h3>
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock size={10} />
                                Eliminado: {formatDate(project.deletedAt)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleRestoreProject(project.id)}
                              disabled={actionLoading === project.id}
                              className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                              title="Restaurar"
                            >
                              {actionLoading === project.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <RotateCcw size={16} />
                              )}
                            </button>
                            <button
                              onClick={() => setConfirmDelete({ type: 'project', id: project.id, name: project.name })}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                              title="Eliminar permanentemente"
                            >
                              <Trash size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Tableros */}
              {activeTab === 'boards' && (
                <>
                  {trashBoards.length === 0 ? (
                    <div className="text-center py-12">
                      <LayoutGrid className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No hay tableros en la papelera</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {trashBoards.map((board) => (
                        <div
                          key={board.id}
                          className="bg-gray-50 rounded-xl p-4 flex items-center justify-between group hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div 
                              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: board.background_color || '#3B82F6' }}
                            >
                              <LayoutGrid className="w-5 h-5 text-white" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-medium text-gray-900 truncate">
                                {board.title}
                                {board.is_onboarding && (
                                  <span className="ml-2 text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full">
                                    Ejemplo
                                  </span>
                                )}
                              </h3>
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock size={10} />
                                Eliminado: {formatDate(board.deleted_at)}
                                <span className="mx-1">•</span>
                                {board.lists_count || 0} listas
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleRestoreBoard(board.id)}
                              disabled={actionLoading === board.id}
                              className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                              title="Restaurar"
                            >
                              {actionLoading === board.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <RotateCcw size={16} />
                              )}
                            </button>
                            <button
                              onClick={() => setConfirmDelete({ type: 'board', id: board.id, name: board.title })}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                              title="Eliminar permanentemente"
                            >
                              <Trash size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {totalItems > 0 && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <button
              onClick={() => setConfirmEmptyTrash(true)}
              className="w-full py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              <Trash2 size={16} />
              Vaciar papelera completa
            </button>
          </div>
        )}

        {/* Modal de confirmación - Eliminar item */}
        {confirmDelete && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-10">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">¿Eliminar permanentemente?</h3>
                <p className="text-sm text-gray-600">
                  Esta acción no se puede deshacer. Se eliminará &ldquo;{confirmDelete.name}&rdquo; de forma permanente.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (confirmDelete.type === 'project') {
                      handleDeletePermanentProject(confirmDelete.id);
                    } else {
                      handleDeletePermanentBoard(confirmDelete.id);
                    }
                  }}
                  disabled={actionLoading === confirmDelete.id}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading === confirmDelete.id && <Loader2 size={14} className="animate-spin" />}
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmación - Vaciar papelera */}
        {confirmEmptyTrash && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-10">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">¿Vaciar toda la papelera?</h3>
                <p className="text-sm text-gray-600">
                  Se eliminarán permanentemente {totalItems} elementos. Esta acción no se puede deshacer.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmEmptyTrash(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEmptyTrash}
                  disabled={emptyingTrash}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {emptyingTrash && <Loader2 size={14} className="animate-spin" />}
                  Vaciar todo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrashView;

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Trash2, RotateCcw, AlertTriangle, X, Clock, 
  FileText, Loader2, ArrowLeft, Layers, Trash
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TrashView = ({ isOpen, onClose, onProjectRestored, token }) => {
  const [trashProjects, setTrashProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [emptyingTrash, setEmptyingTrash] = useState(false);

  // Cargar proyectos de la papelera
  const fetchTrashProjects = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/projects/trash`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al cargar la papelera');
      }
      
      const data = await response.json();
      setTrashProjects(data);
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
      fetchTrashProjects();
    }
  }, [isOpen, fetchTrashProjects]);

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

  // Restaurar proyecto
  const handleRestore = async (projectId) => {
    setActionLoading(projectId);
    
    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al restaurar');
      }
      
      // Actualizar lista local
      setTrashProjects(prev => prev.filter(p => p.id !== projectId));
      
      // Notificar al componente padre
      if (onProjectRestored) {
        onProjectRestored();
      }
    } catch (err) {
      console.error('Error restoring project:', err);
      setError('No se pudo restaurar el proyecto');
    } finally {
      setActionLoading(null);
    }
  };

  // Eliminar permanentemente
  const handlePermanentDelete = async (projectId) => {
    setActionLoading(projectId);
    
    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/permanent`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al eliminar');
      }
      
      // Actualizar lista local
      setTrashProjects(prev => prev.filter(p => p.id !== projectId));
      setConfirmDelete(null);
    } catch (err) {
      console.error('Error deleting permanently:', err);
      setError('No se pudo eliminar el proyecto');
    } finally {
      setActionLoading(null);
    }
  };

  // Vaciar toda la papelera
  const handleEmptyTrash = async () => {
    setEmptyingTrash(true);
    
    try {
      const response = await fetch(`${API_URL}/api/projects/trash/empty`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al vaciar la papelera');
      }
      
      // Limpiar lista local
      setTrashProjects([]);
      setConfirmEmptyTrash(false);
      
      // Notificar al componente padre PRIMERO para actualizar el contador
      if (onProjectRestored) {
        onProjectRestored();
      }
      
      // Cerrar la papelera después de vaciarla
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error('Error emptying trash:', err);
      setError('No se pudo vaciar la papelera');
    } finally {
      setEmptyingTrash(false);
    }
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Fecha desconocida';
    }
  };

  // Obtener icono de layout
  const getLayoutIcon = (layoutType) => {
    switch (layoutType) {
      case 'mindtree':
        return '🌳';
      case 'mindhybrid':
        return '🔀';
      default:
        return '🗺️';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-red-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <Trash2 className="text-red-500" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Papelera</h2>
              <p className="text-sm text-gray-500">
                {trashProjects.length} proyecto{trashProjects.length !== 1 ? 's' : ''} eliminado{trashProjects.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Botón Vaciar Papelera */}
            {trashProjects.length > 0 && (
              <button
                onClick={() => setConfirmEmptyTrash(true)}
                disabled={emptyingTrash}
                className="
                  px-3 py-2 rounded-lg
                  bg-red-500 hover:bg-red-600
                  text-white text-sm font-medium
                  flex items-center gap-2
                  transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
                title="Vaciar toda la papelera"
              >
                <Trash size={16} />
                Vaciar papelera
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="animate-spin text-gray-400 mb-3" size={32} />
              <p className="text-gray-500">Cargando papelera...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="text-red-400 mb-3" size={32} />
              <p className="text-red-500">{error}</p>
              <button
                onClick={fetchTrashProjects}
                className="mt-3 px-4 py-2 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
              >
                Reintentar
              </button>
            </div>
          ) : trashProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Trash2 className="text-gray-400" size={28} />
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-1">Papelera vacía</h3>
              <p className="text-sm text-gray-500 text-center max-w-sm">
                Los proyectos que elimines aparecerán aquí. Podrás restaurarlos o eliminarlos permanentemente.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {trashProjects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-all"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                      <span className="text-lg">{getLayoutIcon(project.layoutType)}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 truncate">{project.name}</h3>
                        <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-600 rounded-full shrink-0">
                          Eliminado
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {formatDate(project.deletedAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Layers size={14} />
                          {project.nodeCount} nodos
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRestore(project.id)}
                        disabled={actionLoading === project.id}
                        className="
                          px-3 py-2 rounded-lg
                          bg-green-50 hover:bg-green-100
                          text-green-600 hover:text-green-700
                          text-sm font-medium
                          flex items-center gap-1.5
                          transition-all duration-200
                          disabled:opacity-50 disabled:cursor-not-allowed
                        "
                        title="Restaurar proyecto"
                      >
                        {actionLoading === project.id ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          <RotateCcw size={16} />
                        )}
                        Restaurar
                      </button>
                      <button
                        onClick={() => setConfirmDelete(project.id)}
                        disabled={actionLoading === project.id}
                        className="
                          px-3 py-2 rounded-lg
                          bg-red-50 hover:bg-red-100
                          text-red-600 hover:text-red-700
                          text-sm font-medium
                          flex items-center gap-1.5
                          transition-all duration-200
                          disabled:opacity-50 disabled:cursor-not-allowed
                        "
                        title="Eliminar permanentemente"
                      >
                        <Trash2 size={16} />
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-gray-200 bg-amber-50">
          <p className="text-xs text-amber-700 flex items-center gap-2">
            <AlertTriangle size={14} />
            Los proyectos eliminados permanentemente no se pueden recuperar.
          </p>
        </div>
      </div>

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="text-red-500" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">¿Eliminar permanentemente?</h3>
                <p className="text-sm text-gray-500">Esta acción no se puede deshacer</p>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-red-700">
                <strong>Este proyecto será eliminado definitivamente.</strong>
                <br />
                No podrás recuperarlo después de confirmar.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="
                  flex-1 px-4 py-3 rounded-xl
                  bg-gray-100 hover:bg-gray-200
                  text-gray-700 font-medium
                  transition-colors
                "
              >
                Cancelar
              </button>
              <button
                onClick={() => handlePermanentDelete(confirmDelete)}
                disabled={actionLoading === confirmDelete}
                className="
                  flex-1 px-4 py-3 rounded-xl
                  bg-red-500 hover:bg-red-600
                  text-white font-medium
                  flex items-center justify-center gap-2
                  transition-colors
                  disabled:opacity-50
                "
              >
                {actionLoading === confirmDelete ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Trash2 size={18} />
                )}
                Eliminar definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Empty Trash Modal */}
      {confirmEmptyTrash && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash className="text-red-500" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">¿Vaciar papelera?</h3>
                <p className="text-sm text-gray-500">Esta acción no se puede deshacer</p>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-red-700">
                <strong>Se eliminarán {trashProjects.length} proyecto{trashProjects.length !== 1 ? 's' : ''} permanentemente.</strong>
                <br /><br />
                Todos los proyectos en la papelera serán eliminados de forma definitiva y no podrás recuperarlos.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmEmptyTrash(false)}
                className="
                  flex-1 px-4 py-3 rounded-xl
                  bg-gray-100 hover:bg-gray-200
                  text-gray-700 font-medium
                  transition-colors
                "
              >
                Cancelar
              </button>
              <button
                onClick={handleEmptyTrash}
                disabled={emptyingTrash}
                className="
                  flex-1 px-4 py-3 rounded-xl
                  bg-red-500 hover:bg-red-600
                  text-white font-medium
                  flex items-center justify-center gap-2
                  transition-colors
                  disabled:opacity-50
                "
              >
                {emptyingTrash ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Trash size={18} />
                )}
                Vaciar papelera ({trashProjects.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrashView;

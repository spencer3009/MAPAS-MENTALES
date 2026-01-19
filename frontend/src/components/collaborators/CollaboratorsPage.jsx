import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, UserPlus, Search, X, Trash2, Edit2, 
  Mail, Loader2, MoreHorizontal, AlertCircle,
  Shield, Crown, User, Clock, Check, Building2,
  UserCog, RefreshCw, CheckCircle, XCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';

const API_URL = '';

// Constantes de roles
const ROLE_LABELS = {
  owner: 'Propietario',
  admin: 'Administrador',
  collaborator: 'Colaborador Operativo'
};

const ROLE_DESCRIPTIONS = {
  owner: 'Acceso total. Puede eliminar empresa y gestionar colaboradores.',
  admin: 'Acceso total excepto eliminar empresa.',
  collaborator: 'Acceso a Finanzas, Contactos y Tableros. Sin configuraciones.'
};

const ROLE_COLORS = {
  owner: 'bg-amber-100 text-amber-800 border-amber-200',
  admin: 'bg-purple-100 text-purple-800 border-purple-200',
  collaborator: 'bg-blue-100 text-blue-800 border-blue-200'
};

const STATUS_LABELS = {
  active: 'Activo',
  pending: 'Invitación pendiente'
};

const STATUS_COLORS = {
  active: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-orange-100 text-orange-800'
};

// Badge de rol
const RoleBadge = ({ role, small = false }) => (
  <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${ROLE_COLORS[role] || ROLE_COLORS.collaborator} ${small ? 'text-[10px] px-2 py-0.5' : ''}`}>
    {role === 'owner' && <Crown className="w-3 h-3 mr-1" />}
    {role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
    {role === 'collaborator' && <User className="w-3 h-3 mr-1" />}
    {ROLE_LABELS[role] || role}
  </span>
);

// Badge de estado
const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[status] || STATUS_COLORS.pending}`}>
    {status === 'active' ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
    {STATUS_LABELS[status] || status}
  </span>
);

// Modal para invitar colaborador
const InviteModal = ({ onClose, onInvite, loading }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('collaborator');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim()) {
      setError('El email es requerido');
      return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email inválido');
      return;
    }
    
    const result = await onInvite(email, role);
    if (!result.success) {
      setError(result.error || 'Error al enviar invitación');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Invitar Colaborador</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email del colaborador
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colaborador@email.com"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              disabled={loading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rol asignado
            </label>
            <div className="space-y-2">
              {['admin', 'collaborator'].map((r) => (
                <label
                  key={r}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    role === r ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    checked={role === r}
                    onChange={(e) => setRole(e.target.value)}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    disabled={loading}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      {r === 'admin' ? <Shield size={14} className="text-purple-600" /> : <User size={14} className="text-blue-600" />}
                      <span className="font-medium text-gray-800">{ROLE_LABELS[r]}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{ROLE_DESCRIPTIONS[r]}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus size={16} />}
              Enviar invitación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal para editar rol
const EditRoleModal = ({ collaborator, onClose, onSave, loading }) => {
  const [role, setRole] = useState(collaborator.role);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave(collaborator.id, role);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Edit2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Editar Rol</h2>
              <p className="text-sm text-gray-500">{collaborator.username || collaborator.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            {['admin', 'collaborator'].map((r) => (
              <label
                key={r}
                className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  role === r ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={r}
                  checked={role === r}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  disabled={loading}
                />
                <div>
                  <div className="flex items-center gap-2">
                    {r === 'admin' ? <Shield size={14} className="text-purple-600" /> : <User size={14} className="text-blue-600" />}
                    <span className="font-medium text-gray-800">{ROLE_LABELS[r]}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{ROLE_DESCRIPTIONS[r]}</p>
                </div>
              </label>
            ))}
          </div>
          
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || role === collaborator.role}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check size={16} />}
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal de confirmación para eliminar
const DeleteConfirmModal = ({ collaborator, onClose, onConfirm, loading }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800">Quitar acceso</h2>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <X size={20} className="text-gray-500" />
        </button>
      </div>
      
      <div className="p-6">
        <p className="text-gray-600 mb-4">
          ¿Estás seguro de quitar el acceso a <strong>{collaborator.username || collaborator.email}</strong> de esta empresa?
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Esta acción solo elimina el vínculo con la empresa. La cuenta del usuario no será afectada.
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(collaborator.id)}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 size={16} />}
            Quitar acceso
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Componente principal
const CollaboratorsPage = () => {
  const { token } = useAuth();
  const { activeCompany } = useCompany();
  
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  
  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState(null);
  const [deletingCollaborator, setDeletingCollaborator] = useState(null);
  
  // Dropdown de acciones
  const [openDropdown, setOpenDropdown] = useState(null);

  // Cargar colaboradores
  const loadCollaborators = useCallback(async () => {
    if (!activeCompany || !token) {
      setCollaborators([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_URL}/api/finanzas/companies/${activeCompany.id}/collaborators`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCollaborators(data);
      } else {
        const err = await response.json();
        setError(err.detail || 'Error al cargar colaboradores');
      }
    } catch (err) {
      console.error('Error loading collaborators:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [activeCompany, token]);

  // Cargar al montar y cuando cambie la empresa
  useEffect(() => {
    loadCollaborators();
  }, [loadCollaborators]);

  // Invitar colaborador
  const handleInvite = async (email, role) => {
    if (!activeCompany) return { success: false, error: 'No hay empresa seleccionada' };
    
    setActionLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/finanzas/companies/${activeCompany.id}/collaborators/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, role }),
      });

      if (response.ok) {
        await loadCollaborators();
        setShowInviteModal(false);
        return { success: true };
      } else {
        const err = await response.json();
        return { success: false, error: err.detail || 'Error al enviar invitación' };
      }
    } catch (err) {
      return { success: false, error: 'Error de conexión' };
    } finally {
      setActionLoading(false);
    }
  };

  // Actualizar rol
  const handleUpdateRole = async (collaboratorId, newRole) => {
    setActionLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/finanzas/companies/${activeCompany.id}/collaborators/${collaboratorId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        await loadCollaborators();
        setEditingCollaborator(null);
      } else {
        const err = await response.json();
        setError(err.detail || 'Error al actualizar rol');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setActionLoading(false);
    }
  };

  // Eliminar colaborador
  const handleDelete = async (collaboratorId) => {
    setActionLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/finanzas/companies/${activeCompany.id}/collaborators/${collaboratorId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        await loadCollaborators();
        setDeletingCollaborator(null);
      } else {
        const err = await response.json();
        setError(err.detail || 'Error al quitar acceso');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtrar colaboradores
  const filteredCollaborators = collaborators.filter(c => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (c.username || '').toLowerCase().includes(searchLower) ||
      (c.email || '').toLowerCase().includes(searchLower)
    );
  });

  // Obtener rol del usuario actual en la empresa
  const userRole = activeCompany?.user_role || 'owner';
  const canManage = userRole === 'owner' || userRole === 'admin';

  // Si no hay empresa seleccionada
  if (!activeCompany) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Selecciona una empresa</h2>
          <p className="text-gray-500 max-w-sm">
            Para gestionar colaboradores, primero selecciona una empresa desde el selector en el menú lateral.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-full overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Colaboradores</h1>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Building2 size={14} />
                {activeCompany.name}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={loadCollaborators}
              disabled={loading}
              className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Actualizar lista"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            
            {canManage && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium shadow-sm"
              >
                <UserPlus size={18} />
                <span className="hidden sm:inline">Invitar colaborador</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search and info bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          <div className="text-sm text-gray-500">
            {filteredCollaborators.length} de {collaborators.length} colaboradores
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto p-1 hover:bg-red-100 rounded">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : filteredCollaborators.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-1">
              {searchTerm ? 'No se encontraron resultados' : 'Sin colaboradores'}
            </h3>
            <p className="text-gray-500 text-sm max-w-sm">
              {searchTerm 
                ? 'Intenta con otro término de búsqueda'
                : 'Invita a miembros de tu equipo para colaborar en esta empresa'
              }
            </p>
            {!searchTerm && canManage && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
              >
                <UserPlus size={16} />
                Invitar colaborador
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Estado
                  </th>
                  {canManage && (
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCollaborators.map((collaborator) => (
                  <tr 
                    key={collaborator.id} 
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                          collaborator.role === 'owner' ? 'bg-amber-500' :
                          collaborator.role === 'admin' ? 'bg-purple-500' : 'bg-blue-500'
                        }`}>
                          {(collaborator.username || collaborator.email || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            {collaborator.username || 'Sin nombre'}
                          </p>
                          {collaborator.role === 'owner' && (
                            <span className="text-xs text-amber-600">Propietario</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail size={14} className="text-gray-400" />
                        <span>{collaborator.email || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <RoleBadge role={collaborator.role} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={collaborator.status || 'active'} />
                    </td>
                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        {collaborator.role !== 'owner' && (
                          <div className="relative inline-block">
                            <button
                              onClick={() => setOpenDropdown(openDropdown === collaborator.id ? null : collaborator.id)}
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <MoreHorizontal size={18} />
                            </button>
                            
                            {openDropdown === collaborator.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-10" 
                                  onClick={() => setOpenDropdown(null)}
                                />
                                <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 z-20 py-1">
                                  <button
                                    onClick={() => {
                                      setEditingCollaborator(collaborator);
                                      setOpenDropdown(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Edit2 size={14} />
                                    Cambiar rol
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDeletingCollaborator(collaborator);
                                      setOpenDropdown(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <Trash2 size={14} />
                                    Quitar acceso
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Roles info panel */}
      <div className="bg-white border-t border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-6 text-xs text-gray-500">
          <span className="font-medium text-gray-700">Roles:</span>
          <div className="flex items-center gap-2">
            <Crown size={12} className="text-amber-500" />
            <span>Propietario - Acceso total</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield size={12} className="text-purple-500" />
            <span>Administrador - Gestión sin eliminar empresa</span>
          </div>
          <div className="flex items-center gap-2">
            <User size={12} className="text-blue-500" />
            <span>Colaborador - Finanzas, Contactos y Tableros</span>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showInviteModal && (
        <InviteModal
          onClose={() => setShowInviteModal(false)}
          onInvite={handleInvite}
          loading={actionLoading}
        />
      )}

      {editingCollaborator && (
        <EditRoleModal
          collaborator={editingCollaborator}
          onClose={() => setEditingCollaborator(null)}
          onSave={handleUpdateRole}
          loading={actionLoading}
        />
      )}

      {deletingCollaborator && (
        <DeleteConfirmModal
          collaborator={deletingCollaborator}
          onClose={() => setDeletingCollaborator(null)}
          onConfirm={handleDelete}
          loading={actionLoading}
        />
      )}
    </div>
  );
};

export default CollaboratorsPage;

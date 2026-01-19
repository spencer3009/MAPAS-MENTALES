import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, Shield, User, Trash2, X, Mail, 
  Crown, CheckCircle2, XCircle, Clock, AlertTriangle,
  ChevronDown, Settings, Loader2
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Constantes de roles
const ROLE_LABELS = {
  owner: 'Propietario',
  admin: 'Administrador',
  collaborator: 'Colaborador Operativo'
};

const ROLE_DESCRIPTIONS = {
  owner: 'Acceso total a la empresa. Puede eliminar la empresa.',
  admin: 'Puede gestionar colaboradores y editar configuraciones.',
  collaborator: 'Acceso a finanzas, contactos y tableros. Sin configuraciones.'
};

const ROLE_COLORS = {
  owner: 'bg-amber-100 text-amber-800 border-amber-200',
  admin: 'bg-purple-100 text-purple-800 border-purple-200',
  collaborator: 'bg-blue-100 text-blue-800 border-blue-200'
};

// Badge de rol
const RoleBadge = ({ role }) => (
  <span className={`px-2 py-1 text-xs font-medium rounded-full border ${ROLE_COLORS[role] || ROLE_COLORS.collaborator}`}>
    {role === 'owner' && <Crown className="w-3 h-3 inline mr-1" />}
    {role === 'admin' && <Shield className="w-3 h-3 inline mr-1" />}
    {role === 'collaborator' && <User className="w-3 h-3 inline mr-1" />}
    {ROLE_LABELS[role] || role}
  </span>
);

// Modal de invitación
const InviteModal = ({ onClose, onInvite, companyName, isLoading }) => {
  const [form, setForm] = useState({
    email: '',
    role: 'collaborator',
    message: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.email.trim()) return;
    onInvite(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
          <div className="flex items-center gap-3">
            <UserPlus className="w-6 h-6" />
            <div>
              <h2 className="text-lg font-semibold">Invitar Colaborador</h2>
              <p className="text-sm opacity-90">{companyName}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email del colaborador *
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="colaborador@email.com"
              required
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Se enviará una invitación por email
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rol a asignar
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              disabled={isLoading}
            >
              <option value="collaborator">Colaborador Operativo</option>
              <option value="admin">Administrador</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {ROLE_DESCRIPTIONS[form.role]}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mensaje personalizado (opcional)
            </label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
              placeholder="Ej: Te invito a colaborar en la gestión financiera..."
              rows={3}
              maxLength={500}
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !form.email.trim()}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Enviar Invitación
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal de cambio de rol
const ChangeRoleModal = ({ collaborator, onClose, onSave, isLoading }) => {
  const [role, setRole] = useState(collaborator.role);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
          <h2 className="text-lg font-semibold">Cambiar Rol</h2>
          <p className="text-sm opacity-90">{collaborator.full_name || collaborator.username}</p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecciona el nuevo rol
            </label>
            <div className="space-y-2">
              {['admin', 'collaborator'].map((r) => (
                <label
                  key={r}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    role === r ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    checked={role === r}
                    onChange={() => setRole(r)}
                    className="mt-1"
                    disabled={isLoading}
                  />
                  <div>
                    <div className="font-medium text-gray-800">{ROLE_LABELS[r]}</div>
                    <div className="text-xs text-gray-500">{ROLE_DESCRIPTIONS[r]}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => onSave(role)}
              disabled={isLoading || role === collaborator.role}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Modal de confirmación de eliminación
const RemoveCollaboratorModal = ({ collaborator, onClose, onConfirm, isLoading }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-red-500 to-rose-600 text-white">
        <h2 className="text-lg font-semibold">Eliminar Colaborador</h2>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-10 h-10 text-red-500" />
          <div>
            <p className="font-medium text-gray-800">¿Estás seguro?</p>
            <p className="text-sm text-gray-600">
              <strong>{collaborator.full_name || collaborator.username}</strong> perderá acceso a la empresa.
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Componente principal de gestión de colaboradores
export const CollaboratorsManager = ({ company, token, onClose, userRole }) => {
  const [collaborators, setCollaborators] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showChangeRoleModal, setShowChangeRoleModal] = useState(null);
  const [showRemoveModal, setShowRemoveModal] = useState(null);
  const [activeTab, setActiveTab] = useState('collaborators');

  const canManage = userRole === 'owner' || userRole === 'admin';

  // Cargar datos
  useEffect(() => {
    loadData();
  }, [company.id]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [collabRes, invitationsRes] = await Promise.all([
        fetch(`${API_URL}/api/finanzas/companies/${company.id}/collaborators`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/finanzas/companies/${company.id}/invitations?status=pending`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (collabRes.ok) {
        const data = await collabRes.json();
        setCollaborators(data.collaborators || []);
      }

      if (invitationsRes.ok) {
        const data = await invitationsRes.json();
        setInvitations(data.invitations || []);
      }
    } catch (err) {
      console.error('Error loading collaborators:', err);
      setError('Error al cargar colaboradores');
    } finally {
      setLoading(false);
    }
  };

  // Invitar colaborador
  const handleInvite = async (form) => {
    setActionLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/finanzas/companies/${company.id}/collaborators/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });

      if (response.ok) {
        setShowInviteModal(false);
        loadData();
      } else {
        const error = await response.json();
        alert(error.detail || 'Error al enviar invitación');
      }
    } catch (err) {
      console.error('Error inviting:', err);
      alert('Error de conexión');
    } finally {
      setActionLoading(false);
    }
  };

  // Cambiar rol
  const handleChangeRole = async (newRole) => {
    if (!showChangeRoleModal) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/finanzas/companies/${company.id}/collaborators/${showChangeRoleModal.username}/role`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ role: newRole })
        }
      );

      if (response.ok) {
        setShowChangeRoleModal(null);
        loadData();
      } else {
        const error = await response.json();
        alert(error.detail || 'Error al cambiar rol');
      }
    } catch (err) {
      console.error('Error changing role:', err);
      alert('Error de conexión');
    } finally {
      setActionLoading(false);
    }
  };

  // Eliminar colaborador
  const handleRemove = async () => {
    if (!showRemoveModal) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/finanzas/companies/${company.id}/collaborators/${showRemoveModal.username}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        setShowRemoveModal(null);
        loadData();
      } else {
        const error = await response.json();
        alert(error.detail || 'Error al eliminar colaborador');
      }
    } catch (err) {
      console.error('Error removing:', err);
      alert('Error de conexión');
    } finally {
      setActionLoading(false);
    }
  };

  // Revocar invitación
  const handleRevokeInvitation = async (invitationId) => {
    try {
      const response = await fetch(
        `${API_URL}/api/finanzas/companies/${company.id}/invitations/${invitationId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        loadData();
      }
    } catch (err) {
      console.error('Error revoking invitation:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6" />
            <div>
              <h2 className="text-lg font-semibold">Configuración de Empresa</h2>
              <p className="text-sm opacity-90">{company.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('collaborators')}
              className={`py-3 px-1 border-b-2 transition-colors ${
                activeTab === 'collaborators' 
                  ? 'border-emerald-500 text-emerald-600 font-medium' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Colaboradores ({collaborators.length})
            </button>
            {canManage && (
              <button
                onClick={() => setActiveTab('invitations')}
                className={`py-3 px-1 border-b-2 transition-colors ${
                  activeTab === 'invitations' 
                    ? 'border-emerald-500 text-emerald-600 font-medium' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Mail className="w-4 h-4 inline mr-2" />
                Invitaciones ({invitations.length})
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-2" />
              <p>{error}</p>
            </div>
          ) : activeTab === 'collaborators' ? (
            <div className="space-y-3">
              {collaborators.map((collab) => (
                <div
                  key={collab.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      collab.is_owner ? 'bg-amber-100' : 'bg-emerald-100'
                    }`}>
                      {collab.is_owner ? (
                        <Crown className="w-5 h-5 text-amber-600" />
                      ) : (
                        <User className="w-5 h-5 text-emerald-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">
                        {collab.full_name || collab.username}
                      </div>
                      <div className="text-sm text-gray-500">{collab.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <RoleBadge role={collab.role} />
                    
                    {canManage && !collab.is_owner && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => setShowChangeRoleModal(collab)}
                          className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Cambiar rol"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowRemoveModal(collab)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {collaborators.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No hay colaboradores aún</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">{inv.email}</div>
                      <div className="text-sm text-gray-500">
                        Invitado como {ROLE_LABELS[inv.role] || inv.role}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                      Pendiente
                    </span>
                    <button
                      onClick={() => handleRevokeInvitation(inv.id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Revocar invitación"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {invitations.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Mail className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No hay invitaciones pendientes</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {canManage && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
            <button
              onClick={() => setShowInviteModal(true)}
              className="w-full px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <UserPlus className="w-5 h-5" />
              Invitar Colaborador
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showInviteModal && (
        <InviteModal
          onClose={() => setShowInviteModal(false)}
          onInvite={handleInvite}
          companyName={company.name}
          isLoading={actionLoading}
        />
      )}

      {showChangeRoleModal && (
        <ChangeRoleModal
          collaborator={showChangeRoleModal}
          onClose={() => setShowChangeRoleModal(null)}
          onSave={handleChangeRole}
          isLoading={actionLoading}
        />
      )}

      {showRemoveModal && (
        <RemoveCollaboratorModal
          collaborator={showRemoveModal}
          onClose={() => setShowRemoveModal(null)}
          onConfirm={handleRemove}
          isLoading={actionLoading}
        />
      )}
    </div>
  );
};

// Banner de invitaciones pendientes
export const PendingInvitationsBanner = ({ token, onAccept, onReject }) => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      const response = await fetch(`${API_URL}/api/invitations/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations || []);
      }
    } catch (err) {
      console.error('Error loading invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId) => {
    setActionLoading(invitationId);
    try {
      const response = await fetch(`${API_URL}/api/invitations/${invitationId}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        if (onAccept) onAccept(data);
      } else {
        const error = await response.json();
        alert(error.detail || 'Error al aceptar invitación');
      }
    } catch (err) {
      console.error('Error accepting:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (invitationId) => {
    setActionLoading(invitationId);
    try {
      const response = await fetch(`${API_URL}/api/invitations/${invitationId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        if (onReject) onReject(invitationId);
      }
    } catch (err) {
      console.error('Error rejecting:', err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading || invitations.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm space-y-2">
      {invitations.map((inv) => (
        <div
          key={inv.id}
          className="bg-white rounded-xl shadow-lg border border-emerald-200 p-4 animate-slide-in"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 text-sm">
                Invitación de colaboración
              </p>
              <p className="text-xs text-gray-600 mt-1">
                <strong>{inv.invited_by_name}</strong> te invita a{' '}
                <strong className="text-emerald-600">{inv.company_name}</strong>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Rol: {ROLE_LABELS[inv.role] || inv.role}
              </p>
              
              {inv.message && (
                <p className="text-xs text-gray-500 mt-2 italic bg-gray-50 p-2 rounded">
                  "{inv.message}"
                </p>
              )}
              
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleAccept(inv.id)}
                  disabled={actionLoading === inv.id}
                  className="flex-1 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {actionLoading === inv.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      Aceptar
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleReject(inv.id)}
                  disabled={actionLoading === inv.id}
                  className="flex-1 px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <XCircle className="w-3 h-3" />
                  Rechazar
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CollaboratorsManager;

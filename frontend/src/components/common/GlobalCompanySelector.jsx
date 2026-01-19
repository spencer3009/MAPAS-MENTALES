import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, ChevronDown, Plus, Settings, Users, Trash2, 
  X, AlertTriangle, Loader2, Check, Mail, Shield, Crown,
  User, Clock, UserPlus, XCircle
} from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

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

// Badge de rol
const RoleBadge = ({ role, small = false }) => (
  <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${ROLE_COLORS[role] || ROLE_COLORS.collaborator} ${small ? 'text-[10px]' : ''}`}>
    {role === 'owner' && <Crown className="w-3 h-3 inline mr-1" />}
    {role === 'admin' && <Shield className="w-3 h-3 inline mr-1" />}
    {role === 'collaborator' && <User className="w-3 h-3 inline mr-1" />}
    {ROLE_LABELS[role] || role}
  </span>
);

/**
 * GlobalCompanySelector - Selector de empresa global para el header
 */
const GlobalCompanySelector = ({ token }) => {
  const { 
    companies, 
    activeCompany, 
    loading, 
    selectCompany, 
    createCompany, 
    updateCompany, 
    deleteCompany,
    refreshCompanies 
  } = useCompany();
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 rounded-lg">
        <Loader2 size={16} className="animate-spin text-slate-400" />
        <span className="text-sm text-slate-400">Cargando...</span>
      </div>
    );
  }

  // Si no hay empresas, mostrar botón de crear
  if (companies.length === 0) {
    return (
      <>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Crear empresa</span>
        </button>
        
        {showCreateModal && (
          <CompanyCreateModal
            onClose={() => setShowCreateModal(false)}
            onSave={async (data) => {
              const result = await createCompany(data);
              if (result.success) {
                setShowCreateModal(false);
              } else {
                alert(result.error);
              }
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      {/* Selector principal */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-colors min-w-[160px] max-w-[240px]"
        >
          <Building2 size={16} className="text-emerald-400 flex-shrink-0" />
          <span className="text-sm text-white font-medium truncate flex-1 text-left">
            {activeCompany?.name || 'Seleccionar'}
          </span>
          <ChevronDown size={16} className={`text-slate-400 flex-shrink-0 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown menu */}
        {showDropdown && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowDropdown(false)} 
            />
            <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
              {/* Header del dropdown */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Mis Empresas</p>
              </div>
              
              {/* Lista de empresas */}
              <div className="max-h-64 overflow-y-auto">
                {companies.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => {
                      selectCompany(company);
                      setShowDropdown(false);
                    }}
                    className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left ${
                      activeCompany?.id === company.id ? 'bg-emerald-50' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      activeCompany?.id === company.id ? 'bg-emerald-100' : 'bg-gray-100'
                    }`}>
                      <Building2 size={16} className={activeCompany?.id === company.id ? 'text-emerald-600' : 'text-gray-500'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        activeCompany?.id === company.id ? 'text-emerald-700' : 'text-gray-800'
                      }`}>
                        {company.name}
                      </p>
                      {company.user_role && company.user_role !== 'owner' && (
                        <p className="text-xs text-gray-500">
                          {ROLE_LABELS[company.user_role] || company.user_role}
                        </p>
                      )}
                    </div>
                    {activeCompany?.id === company.id && (
                      <Check size={16} className="text-emerald-600 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
              
              {/* Acciones */}
              <div className="border-t border-gray-200 p-2 space-y-1">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    setShowCreateModal(true);
                  }}
                  className="w-full px-3 py-2 flex items-center gap-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  Nueva empresa
                </button>
                
                {activeCompany && (
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      setShowConfigModal(true);
                    }}
                    className="w-full px-3 py-2 flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Settings size={16} />
                    Configuración de empresa
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal crear empresa */}
      {showCreateModal && (
        <CompanyCreateModal
          onClose={() => setShowCreateModal(false)}
          onSave={async (data) => {
            const result = await createCompany(data);
            if (result.success) {
              setShowCreateModal(false);
            } else {
              alert(result.error);
            }
          }}
        />
      )}

      {/* Modal configuración de empresa (con colaboradores) */}
      {showConfigModal && activeCompany && (
        <CompanyConfigModal
          company={activeCompany}
          token={token}
          onClose={() => setShowConfigModal(false)}
          onSave={async (data) => {
            const result = await updateCompany(activeCompany.id, data);
            if (result.success) {
              return { success: true };
            } else {
              return { success: false, error: result.error };
            }
          }}
          onDelete={async (companyId, confirmation) => {
            const result = await deleteCompany(companyId, confirmation);
            if (result.success) {
              setShowConfigModal(false);
            }
            return result;
          }}
        />
      )}
    </>
  );
};

/**
 * CompanyCreateModal - Modal simple para crear empresa
 */
const CompanyCreateModal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({
    name: '',
    ruc: '',
    currency: 'PEN',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || !form.name.trim()) return;
    
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Nueva Empresa</h2>
            <p className="text-sm opacity-90">Crea una empresa para gestionar tus datos</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la empresa *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Ej: Mi Empresa SAC"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RUC / NIF</label>
              <input
                type="text"
                value={form.ruc}
                onChange={(e) => setForm({ ...form, ruc: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="20123456789"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="PEN">PEN (Soles)</option>
                <option value="USD">USD (Dólares)</option>
                <option value="EUR">EUR (Euros)</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {saving ? 'Creando...' : 'Crear Empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * CompanyConfigModal - Modal de configuración de empresa CON colaboradores
 */
const CompanyConfigModal = ({ company, token, onClose, onSave, onDelete }) => {
  const [activeTab, setActiveTab] = useState('general');
  const userRole = company?.user_role || 'owner';
  const canManageCollaborators = userRole === 'owner' || userRole === 'admin';
  const canDeleteCompany = userRole === 'owner';

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'collaborators', label: 'Colaboradores', icon: Users },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-t-2xl flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold">Configuración de Empresa</h2>
            <p className="text-sm opacity-90">{company?.name}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6 flex-shrink-0">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id 
                      ? 'border-emerald-500 text-emerald-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'general' && (
            <GeneralTab 
              company={company} 
              onSave={onSave} 
              onDelete={onDelete}
              canDelete={canDeleteCompany}
            />
          )}
          {activeTab === 'collaborators' && (
            <CollaboratorsTab 
              company={company} 
              token={token}
              canManage={canManageCollaborators}
            />
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * GeneralTab - Pestaña de configuración general
 */
const GeneralTab = ({ company, onSave, onDelete, canDelete }) => {
  const [form, setForm] = useState({
    name: company?.name || '',
    ruc: company?.ruc || '',
    address: company?.address || '',
    phone: company?.phone || '',
    email: company?.email || '',
    currency: company?.currency || 'PEN',
  });
  const [saving, setSaving] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || !form.name.trim()) return;
    
    setSaving(true);
    try {
      const result = await onSave(form);
      if (result.success) {
        // Éxito silencioso
      } else {
        alert(result.error || 'Error al guardar');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || deleting) return;
    
    const companyName = company?.name || '';
    if (deleteConfirmation !== companyName && deleteConfirmation !== 'ELIMINAR') {
      alert(`Debes escribir "${companyName}" o "ELIMINAR" para confirmar`);
      return;
    }
    
    setDeleting(true);
    try {
      const result = await onDelete(company.id, deleteConfirmation);
      if (!result.success) {
        alert(result.error || 'Error al eliminar');
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la empresa *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">RUC / NIF</label>
            <input
              type="text"
              value={form.ruc}
              onChange={(e) => setForm({ ...form, ruc: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="PEN">PEN (Soles)</option>
              <option value="USD">USD (Dólares)</option>
              <option value="EUR">EUR (Euros)</option>
              <option value="MXN">MXN (Pesos MX)</option>
              <option value="COP">COP (Pesos CO)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving || !form.name.trim()}
            className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>

      {/* Zona de Riesgo */}
      {canDelete && (
        <div className="border-t border-gray-200">
          <button
            type="button"
            onClick={() => setShowDangerZone(!showDangerZone)}
            className="w-full px-6 py-3 flex items-center justify-between text-left hover:bg-red-50 transition-colors"
          >
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle size={18} />
              <span className="font-medium">Zona de riesgo</span>
            </div>
            <ChevronDown size={18} className={`text-red-400 transition-transform ${showDangerZone ? 'rotate-180' : ''}`} />
          </button>
          
          {showDangerZone && (
            <div className="px-6 pb-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                    <Trash2 size={20} className="text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-red-800">Eliminar empresa permanentemente</h4>
                    <p className="text-sm text-red-600 mt-1">
                      Esta acción es <strong>IRREVERSIBLE</strong>. Se eliminarán:
                    </p>
                    <ul className="text-sm text-red-600 mt-2 space-y-1 list-disc list-inside">
                      <li>Todos los datos financieros</li>
                      <li>Todos los contactos de la empresa</li>
                      <li>Todos los tableros y tarjetas</li>
                      <li>Todos los recordatorios operativos</li>
                      <li>Todos los colaboradores perderán acceso</li>
                    </ul>
                    <p className="text-sm text-red-700 mt-3 font-medium">
                      ⚠️ Los mapas mentales y recordatorios personales NO serán afectados.
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-red-700 mb-2">
                  Para confirmar, escribe <strong>"{company?.name}"</strong> o <strong>"ELIMINAR"</strong>
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-red-50"
                  placeholder="Escribe aquí para confirmar"
                />
              </div>
              
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || (deleteConfirmation !== company?.name && deleteConfirmation !== 'ELIMINAR')}
                className="w-full px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                {deleting ? 'Eliminando...' : 'Eliminar empresa permanentemente'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * CollaboratorsTab - Pestaña de colaboradores
 */
const CollaboratorsTab = ({ company, token, canManage }) => {
  const [collaborators, setCollaborators] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'collaborator', message: '' });
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    if (!company?.id || !token) return;
    
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
  }, [company?.id, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Invitar colaborador
  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteForm.email.trim() || actionLoading) return;
    
    setActionLoading('invite');
    try {
      const response = await fetch(`${API_URL}/api/finanzas/companies/${company.id}/collaborators/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(inviteForm)
      });

      if (response.ok) {
        setShowInviteForm(false);
        setInviteForm({ email: '', role: 'collaborator', message: '' });
        loadData();
      } else {
        const error = await response.json();
        alert(error.detail || 'Error al enviar invitación');
      }
    } catch (err) {
      console.error('Error inviting:', err);
      alert('Error de conexión');
    } finally {
      setActionLoading(null);
    }
  };

  // Cambiar rol
  const handleChangeRole = async (username, newRole) => {
    setActionLoading(`role-${username}`);
    try {
      const response = await fetch(
        `${API_URL}/api/finanzas/companies/${company.id}/collaborators/${username}/role`,
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
        loadData();
      } else {
        const error = await response.json();
        alert(error.detail || 'Error al cambiar rol');
      }
    } catch (err) {
      console.error('Error changing role:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Eliminar colaborador
  const handleRemove = async (username) => {
    if (!confirm('¿Estás seguro de eliminar a este colaborador?')) return;
    
    setActionLoading(`remove-${username}`);
    try {
      const response = await fetch(
        `${API_URL}/api/finanzas/companies/${company.id}/collaborators/${username}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        loadData();
      } else {
        const error = await response.json();
        alert(error.detail || 'Error al eliminar colaborador');
      }
    } catch (err) {
      console.error('Error removing:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Revocar invitación
  const handleRevokeInvitation = async (invitationId) => {
    setActionLoading(`revoke-${invitationId}`);
    try {
      await fetch(
        `${API_URL}/api/finanzas/companies/${company.id}/invitations/${invitationId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      loadData();
    } catch (err) {
      console.error('Error revoking invitation:', err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        <AlertTriangle className="w-12 h-12 mx-auto mb-2" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Descripción de roles */}
      <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <h4 className="font-medium text-slate-800 mb-3">Roles disponibles</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <RoleBadge role="owner" small />
            <span className="text-gray-600">{ROLE_DESCRIPTIONS.owner}</span>
          </div>
          <div className="flex items-start gap-2">
            <RoleBadge role="admin" small />
            <span className="text-gray-600">{ROLE_DESCRIPTIONS.admin}</span>
          </div>
          <div className="flex items-start gap-2">
            <RoleBadge role="collaborator" small />
            <span className="text-gray-600">{ROLE_DESCRIPTIONS.collaborator}</span>
          </div>
        </div>
        <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          <strong>Nota:</strong> Los colaboradores NO tienen acceso a mapas mentales ni recordatorios personales.
        </div>
      </div>

      {/* Lista de colaboradores */}
      <div className="space-y-3 mb-6">
        <h4 className="font-medium text-gray-800">Miembros ({collaborators.length})</h4>
        
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
              {canManage && !collab.is_owner ? (
                <select
                  value={collab.role}
                  onChange={(e) => handleChangeRole(collab.username, e.target.value)}
                  disabled={actionLoading === `role-${collab.username}`}
                  className="text-xs px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="admin">Administrador</option>
                  <option value="collaborator">Colaborador Operativo</option>
                </select>
              ) : (
                <RoleBadge role={collab.role} />
              )}
              
              {canManage && !collab.is_owner && (
                <button
                  onClick={() => handleRemove(collab.username)}
                  disabled={actionLoading === `remove-${collab.username}`}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Eliminar"
                >
                  {actionLoading === `remove-${collab.username}` ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Invitaciones pendientes */}
      {invitations.length > 0 && (
        <div className="space-y-3 mb-6">
          <h4 className="font-medium text-gray-800">Invitaciones pendientes ({invitations.length})</h4>
          
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
                {canManage && (
                  <button
                    onClick={() => handleRevokeInvitation(inv.id)}
                    disabled={actionLoading === `revoke-${inv.id}`}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Revocar invitación"
                  >
                    {actionLoading === `revoke-${inv.id}` ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulario de invitación */}
      {canManage && (
        <div className="border-t border-gray-200 pt-6">
          {!showInviteForm ? (
            <button
              onClick={() => setShowInviteForm(true)}
              className="w-full px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <UserPlus size={18} />
              Invitar Colaborador
            </button>
          ) : (
            <form onSubmit={handleInvite} className="space-y-4">
              <h4 className="font-medium text-gray-800">Nueva invitación</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="colaborador@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="collaborator">Colaborador Operativo</option>
                  <option value="admin">Administrador</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">{ROLE_DESCRIPTIONS[inviteForm.role]}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje (opcional)</label>
                <textarea
                  value={inviteForm.message}
                  onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder="Te invito a colaborar..."
                  rows={2}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteForm(false);
                    setInviteForm({ email: '', role: 'collaborator', message: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'invite' || !inviteForm.email.trim()}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading === 'invite' ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Mail size={16} />
                  )}
                  Enviar Invitación
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {!canManage && (
        <div className="text-center py-4 text-gray-500 text-sm">
          Solo los administradores pueden gestionar colaboradores.
        </div>
      )}
    </div>
  );
};

export { GlobalCompanySelector, CompanyCreateModal, CompanyConfigModal };
export default GlobalCompanySelector;

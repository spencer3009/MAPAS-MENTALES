import React, { useState } from 'react';
import { 
  Building2, ChevronDown, Plus, Settings, Users, Trash2, 
  X, AlertTriangle, Loader2, Pencil, Check
} from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { CollaboratorsManager } from '../company/CollaboratorsManager';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

/**
 * GlobalCompanySelector - Selector de empresa global para el header
 * Permite: cambiar empresa, crear, editar, eliminar, gestionar colaboradores
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);

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
          <CompanyFormModal
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
                          {company.user_role === 'admin' ? 'Administrador' : 'Colaborador'}
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
                  <>
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        setShowEditModal(true);
                      }}
                      className="w-full px-3 py-2 flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Settings size={16} />
                      Configuración de empresa
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        setShowCollaborators(true);
                      }}
                      className="w-full px-3 py-2 flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Users size={16} />
                      Colaboradores
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modales */}
      {showCreateModal && (
        <CompanyFormModal
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

      {showEditModal && activeCompany && (
        <CompanyFormModal
          company={activeCompany}
          onClose={() => setShowEditModal(false)}
          onSave={async (data) => {
            const result = await updateCompany(activeCompany.id, data);
            if (result.success) {
              setShowEditModal(false);
            } else {
              alert(result.error);
            }
          }}
          onDelete={async (companyId, confirmation) => {
            const result = await deleteCompany(companyId, confirmation);
            if (result.success) {
              setShowEditModal(false);
            } else {
              alert(result.error);
            }
          }}
        />
      )}

      {showCollaborators && activeCompany && (
        <CollaboratorsManager
          company={activeCompany}
          token={token}
          onClose={() => setShowCollaborators(false)}
          userRole={activeCompany.user_role || 'owner'}
        />
      )}
    </>
  );
};

/**
 * CompanyFormModal - Modal para crear/editar empresa
 */
const CompanyFormModal = ({ company = null, onClose, onSave, onDelete }) => {
  const isEditing = !!company;
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
      await onSave(form);
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
      await onDelete(company.id, deleteConfirmation);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header - Fixed */}
        <div className={`px-6 py-4 flex items-center justify-between flex-shrink-0 ${
          isEditing ? 'bg-gradient-to-r from-slate-700 to-slate-800' : 'bg-gradient-to-r from-emerald-500 to-teal-600'
        } text-white rounded-t-2xl`}>
          <div>
            <h2 className="text-lg font-semibold">
              {isEditing ? 'Configuración de Empresa' : 'Nueva Empresa'}
            </h2>
            <p className="text-sm opacity-90">
              {isEditing ? company?.name : 'Crea una empresa para gestionar tus datos'}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de la empresa *
              </label>
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
                placeholder="Av. Principal 123"
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
                  placeholder="+51 999 999 999"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="contacto@empresa.com"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !form.name.trim()}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  isEditing ? 'bg-slate-700 hover:bg-slate-800' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  isEditing ? 'Guardar Cambios' : 'Crear Empresa'
                )}
              </button>
            </div>
          </form>

          {/* Zona de Riesgo - Solo en modo edición y si es propietario */}
          {isEditing && onDelete && (
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
                <ChevronDown 
                  size={18} 
                  className={`text-red-400 transition-transform ${showDangerZone ? 'rotate-180' : ''}`} 
                />
              </button>
              
              {showDangerZone && (
                <div className="px-6 pb-6 space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                        <Trash2 size={20} className="text-red-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-red-800">
                          Eliminar empresa permanentemente
                        </h4>
                        <p className="text-sm text-red-600 mt-1">
                          Esta acción es <strong>IRREVERSIBLE</strong>. Se eliminarán permanentemente:
                        </p>
                        <ul className="text-sm text-red-600 mt-2 space-y-1 list-disc list-inside">
                          <li>Todos los datos financieros (ingresos, gastos, inversiones)</li>
                          <li>Todos los contactos de la empresa</li>
                          <li>Todos los tableros y sus tarjetas</li>
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
                    {deleting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Eliminando...
                      </>
                    ) : (
                      <>
                        <Trash2 size={18} />
                        Eliminar empresa permanentemente
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { GlobalCompanySelector, CompanyFormModal };
export default GlobalCompanySelector;

import React, { useState } from 'react';
import { Building2, ChevronDown, Plus, Pencil, X, AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';

/**
 * CompanySelector - Selector de empresa global reutilizable
 * 
 * Props:
 * - showCreateButton: boolean - Mostrar botón de crear empresa
 * - showEditButton: boolean - Mostrar botón de editar empresa
 * - onCreateClick: function - Callback cuando se hace clic en crear
 * - onEditClick: function - Callback cuando se hace clic en editar
 * - compact: boolean - Modo compacto (solo icono y nombre)
 * - className: string - Clases adicionales
 */
const CompanySelector = ({ 
  showCreateButton = true, 
  showEditButton = true,
  onCreateClick,
  onEditClick,
  compact = false,
  className = ''
}) => {
  const { companies, activeCompany, selectCompany, loading } = useCompany();

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
        <div className="w-32 h-8 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <button
        onClick={onCreateClick}
        className={`flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors ${className}`}
      >
        <Plus size={18} />
        <span className="text-sm font-medium">Crear empresa</span>
      </button>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Selector de empresa */}
      <div className="relative">
        <select
          value={activeCompany?.id || ''}
          onChange={(e) => {
            const company = companies.find(c => c.id === e.target.value);
            selectCompany(company);
          }}
          className={`appearance-none pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer ${compact ? 'min-w-[140px]' : 'min-w-[180px]'}`}
        >
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
        <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>

      {/* Botón editar */}
      {showEditButton && activeCompany && (
        <button
          onClick={() => onEditClick && onEditClick(activeCompany)}
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Editar empresa"
        >
          <Pencil size={18} />
        </button>
      )}

      {/* Botón crear */}
      {showCreateButton && (
        <button
          onClick={onCreateClick}
          className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
          title="Nueva empresa"
        >
          <Plus size={20} />
        </button>
      )}
    </div>
  );
};

/**
 * CompanyRequiredWrapper - Wrapper que muestra estado vacío si no hay empresa
 * 
 * Props:
 * - children: ReactNode - Contenido a renderizar si hay empresa
 * - moduleName: string - Nombre del módulo (para el mensaje)
 * - onCreateCompany: function - Callback para crear empresa
 */
export const CompanyRequiredWrapper = ({ 
  children, 
  moduleName = 'este módulo',
  onCreateCompany 
}) => {
  const { activeCompany, loading, hasCompanies } = useCompany();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (!hasCompanies || !activeCompany) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Building2 size={32} className="text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Empresa requerida
          </h2>
          <p className="text-gray-500 mb-6">
            Para usar <strong>{moduleName}</strong>, primero debes crear o seleccionar una empresa. 
            Los datos de este módulo están asociados a cada empresa de forma independiente.
          </p>
          <button
            onClick={onCreateCompany}
            className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Crear mi primera empresa
          </button>
        </div>
      </div>
    );
  }

  return children;
};

/**
 * CompanyModal - Modal para crear/editar empresa
 */
export const CompanyModal = ({ onClose, onSave, company = null }) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className={`px-6 py-4 flex items-center justify-between ${isEditing ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-gradient-to-r from-emerald-500 to-teal-600'} text-white`}>
          <div>
            <h2 className="text-lg font-semibold">{isEditing ? 'Editar Empresa' : 'Nueva Empresa'}</h2>
            <p className="text-sm opacity-90">{isEditing ? 'Modifica los datos de tu empresa' : 'Crea una empresa para gestionar tus datos'}</p>
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
              autoFocus
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
              className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isEditing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            >
              {saving ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Crear Empresa')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanySelector;

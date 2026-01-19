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
 * CompanyModal - Modal para crear/editar empresa con zona de riesgo
 */
export const CompanyModal = ({ onClose, onSave, onDelete, company = null }) => {
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
    
    // Verificar confirmación
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className={`px-6 py-4 flex items-center justify-between ${isEditing ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-gradient-to-r from-emerald-500 to-teal-600'} text-white sticky top-0`}>
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

        {/* Zona de Riesgo - Solo visible en modo edición */}
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
              <ChevronDown size={18} className={`text-red-400 transition-transform ${showDangerZone ? 'rotate-180' : ''}`} />
            </button>
            
            {showDangerZone && (
              <div className="px-6 pb-6 space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Trash2 size={20} className="text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-red-800">Eliminar empresa permanentemente</h4>
                      <p className="text-sm text-red-600 mt-1">
                        Esta acción es <strong>IRREVERSIBLE</strong>. Se eliminarán permanentemente:
                      </p>
                      <ul className="text-sm text-red-600 mt-2 space-y-1 list-disc list-inside">
                        <li>Todos los datos financieros (ingresos, gastos, inversiones)</li>
                        <li>Todos los contactos de la empresa</li>
                        <li>Todos los tableros y sus tarjetas</li>
                        <li>Todos los recordatorios operativos</li>
                      </ul>
                      <p className="text-sm text-red-700 mt-3 font-medium">
                        Los mapas mentales y recordatorios personales NO serán afectados.
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
  );
};

export default CompanySelector;

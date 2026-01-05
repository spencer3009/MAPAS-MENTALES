import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, UserPlus, Building2, UserCheck, 
  Search, Plus, X, Settings, Trash2, Edit2, 
  Phone, Mail, Calendar, ChevronDown, Check,
  Loader2, MoreHorizontal, Save, AlertCircle,
  Type, Hash, List, CheckSquare, AlignLeft
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Tipos de contacto con sus etiquetas
const CONTACT_TYPES = {
  client: { id: 'client', label: 'Clientes', icon: UserCheck, color: 'cyan', singular: 'cliente' },
  prospect: { id: 'prospect', label: 'Prospectos', icon: Users, color: 'amber', singular: 'prospecto' },
  supplier: { id: 'supplier', label: 'Proveedores', icon: Building2, color: 'purple', singular: 'proveedor' }
};

// Tipos de campos personalizados con iconos de Lucide
const FIELD_TYPES = [
  { id: 'text', label: 'Texto', description: 'Texto libre', icon: Type },
  { id: 'number', label: 'Número', description: 'Solo valores numéricos', icon: Hash },
  { id: 'textarea', label: 'Área de texto', description: 'Texto largo multilínea', icon: AlignLeft },
  { id: 'select', label: 'Selector', description: 'Lista desplegable', icon: List },
  { id: 'multiselect', label: 'Selector múltiple', description: 'Selección múltiple', icon: CheckSquare }
];

// Colores disponibles para campos
const FIELD_COLORS = [
  { id: 'gray', value: '#6B7280' },
  { id: 'red', value: '#EF4444' },
  { id: 'orange', value: '#F97316' },
  { id: 'amber', value: '#F59E0B' },
  { id: 'green', value: '#22C55E' },
  { id: 'cyan', value: '#06B6D4' },
  { id: 'blue', value: '#3B82F6' },
  { id: 'purple', value: '#A855F7' }
];

const ContactsPage = () => {
  const [activeTab, setActiveTab] = useState('client');
  const [contacts, setContacts] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFieldsConfig, setShowFieldsConfig] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    whatsapp: '',
    email: '',
    custom_fields: {}
  });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  
  // Custom field form
  const [newField, setNewField] = useState({
    name: '',
    field_type: 'text',
    is_required: false,
    color: null,
    options: []
  });
  const [newOption, setNewOption] = useState('');
  
  const token = localStorage.getItem('mm_auth_token');

  // Cargar contactos y campos personalizados
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Cargar contactos
      const contactsRes = await fetch(`${API_URL}/api/contacts?contact_type=${activeTab}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (contactsRes.ok) {
        const data = await contactsRes.json();
        setContacts(data.contacts || []);
      }
      
      // Cargar campos personalizados
      const fieldsRes = await fetch(`${API_URL}/api/contacts/config/fields/${activeTab}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (fieldsRes.ok) {
        const data = await fieldsRes.json();
        setCustomFields(data.config?.fields || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Validar formulario
  const validateForm = () => {
    const errors = {};
    if (!formData.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    if (!formData.apellidos.trim()) errors.apellidos = 'Los apellidos son obligatorios';
    if (!formData.whatsapp.trim()) errors.whatsapp = 'El WhatsApp es obligatorio';
    
    // Validar campos personalizados obligatorios
    customFields.forEach(field => {
      if (field.is_required) {
        const value = formData.custom_fields[field.id];
        if (!value || (Array.isArray(value) && value.length === 0) || (typeof value === 'string' && !value.trim())) {
          errors[`custom_${field.id}`] = `${field.name} es obligatorio`;
        }
      }
    });
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Guardar contacto
  const handleSaveContact = async () => {
    if (!validateForm()) return;
    
    setSaving(true);
    try {
      const url = editingContact 
        ? `${API_URL}/api/contacts/${editingContact.id}`
        : `${API_URL}/api/contacts`;
      
      const method = editingContact ? 'PUT' : 'POST';
      
      const body = editingContact 
        ? formData 
        : { ...formData, contact_type: activeTab };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      
      if (response.ok) {
        loadData();
        closeModal();
      }
    } catch (error) {
      console.error('Error saving contact:', error);
    } finally {
      setSaving(false);
    }
  };

  // Eliminar contacto
  const handleDeleteContact = async (contactId) => {
    try {
      const response = await fetch(`${API_URL}/api/contacts/${contactId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        loadData();
        setConfirmDelete(null);
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
    }
  };

  // Crear campo personalizado
  const handleCreateField = async () => {
    if (!newField.name.trim()) return;
    
    try {
      const response = await fetch(`${API_URL}/api/contacts/config/fields/${activeTab}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newField)
      });
      
      if (response.ok) {
        loadData();
        setNewField({ name: '', field_type: 'text', is_required: false, color: null, options: [] });
      }
    } catch (error) {
      console.error('Error creating field:', error);
    }
  };

  // Eliminar campo personalizado
  const handleDeleteField = async (fieldId) => {
    try {
      const response = await fetch(`${API_URL}/api/contacts/config/fields/${activeTab}/${fieldId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Error deleting field:', error);
    }
  };

  // Cerrar modal y limpiar
  const closeModal = () => {
    setShowCreateModal(false);
    setEditingContact(null);
    setFormData({ nombre: '', apellidos: '', whatsapp: '', email: '', custom_fields: {} });
    setFormErrors({});
  };

  // Abrir modal de edición
  const openEditModal = (contact) => {
    setEditingContact(contact);
    setFormData({
      nombre: contact.nombre,
      apellidos: contact.apellidos,
      whatsapp: contact.whatsapp,
      email: contact.email || '',
      custom_fields: contact.custom_fields || {}
    });
    setShowCreateModal(true);
  };

  // Filtrar contactos
  const filteredContacts = contacts.filter(contact => {
    const searchLower = searchTerm.toLowerCase();
    return (
      contact.nombre.toLowerCase().includes(searchLower) ||
      contact.apellidos.toLowerCase().includes(searchLower) ||
      contact.whatsapp.includes(searchLower) ||
      (contact.email && contact.email.toLowerCase().includes(searchLower))
    );
  });

  const currentType = CONTACT_TYPES[activeTab];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Contactos</h1>
                  <p className="text-sm text-gray-500">Gestiona tus clientes, prospectos y proveedores</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-200 -mb-px">
            {Object.values(CONTACT_TYPES).map(type => {
              const Icon = type.icon;
              const isActive = activeTab === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setActiveTab(type.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    isActive 
                      ? `border-${type.color}-500 text-${type.color}-600` 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  style={isActive ? { 
                    borderBottomColor: type.color === 'cyan' ? '#06B6D4' : type.color === 'amber' ? '#F59E0B' : '#A855F7',
                    color: type.color === 'cyan' ? '#0891B2' : type.color === 'amber' ? '#D97706' : '#9333EA'
                  } : {}}
                >
                  <Icon size={16} />
                  {type.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar contactos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400"
            />
          </div>
          
          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowFieldsConfig(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Settings size={16} />
              <span className="hidden sm:inline">Configurar campos</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-sm font-medium text-white hover:from-cyan-600 hover:to-blue-700 transition-colors shadow-sm"
            >
              <Plus size={16} />
              Crear {currentType.singular}
            </button>
          </div>
        </div>

        {/* Contacts Table */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mb-4" />
            <p className="text-gray-500">Cargando contactos...</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <currentType.icon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              {searchTerm ? 'No se encontraron resultados' : `No hay ${currentType.label.toLowerCase()}`}
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              {searchTerm ? 'Prueba con otros términos de búsqueda' : `Crea tu primer ${currentType.singular}`}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus size={16} />
                Crear {currentType.singular}
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Nombre completo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      WhatsApp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    {customFields.map(field => (
                      <th key={field.id} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {field.name}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Fecha de creación
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredContacts.map(contact => (
                    <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                            {contact.nombre.charAt(0)}{contact.apellidos.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{contact.nombre} {contact.apellidos}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Phone size={14} className="text-gray-400" />
                          {contact.whatsapp}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {contact.email ? (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Mail size={14} className="text-gray-400" />
                            {contact.email}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      {customFields.map(field => (
                        <td key={field.id} className="px-4 py-3 text-gray-600 text-sm">
                          {renderFieldValue(contact.custom_fields?.[field.id], field)}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                          <Calendar size={14} className="text-gray-400" />
                          {new Date(contact.created_at).toLocaleDateString('es-ES', { 
                            day: 'numeric', 
                            month: 'short', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(contact)}
                            className="p-2 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(contact)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Contact Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">
                {editingContact ? `Editar ${currentType.singular}` : `Crear ${currentType.singular}`}
              </h2>
              <button onClick={closeModal} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 ${
                      formErrors.nombre ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                    placeholder="Nombre"
                  />
                  {formErrors.nombre && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle size={12} /> {formErrors.nombre}
                    </p>
                  )}
                </div>
                
                {/* Apellidos */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Apellidos <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.apellidos}
                    onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 ${
                      formErrors.apellidos ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                    placeholder="Apellidos"
                  />
                  {formErrors.apellidos && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle size={12} /> {formErrors.apellidos}
                    </p>
                  )}
                </div>
                
                {/* WhatsApp */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 ${
                      formErrors.whatsapp ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                    placeholder="+52 123 456 7890"
                  />
                  {formErrors.whatsapp && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle size={12} /> {formErrors.whatsapp}
                    </p>
                  )}
                </div>
                
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-gray-400 text-xs">(opcional)</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                
                {/* Custom Fields */}
                {customFields.length > 0 && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Campos personalizados</h3>
                    <div className="space-y-4">
                      {customFields.map(field => (
                        <div key={field.id}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {field.name} {field.is_required && <span className="text-red-500">*</span>}
                          </label>
                          {renderFieldInput(field, formData.custom_fields[field.id], (value) => {
                            setFormData({
                              ...formData,
                              custom_fields: { ...formData.custom_fields, [field.id]: value }
                            });
                          })}
                          {formErrors[`custom_${field.id}`] && (
                            <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                              <AlertCircle size={12} /> {formErrors[`custom_${field.id}`]}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveContact}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editingContact ? 'Guardar cambios' : 'Crear contacto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configure Custom Fields Modal */}
      {showFieldsConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Configurar campos</h2>
                <p className="text-sm text-gray-300">Campos personalizados para {currentType.label.toLowerCase()}</p>
              </div>
              <button onClick={() => setShowFieldsConfig(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {/* Existing Fields */}
              {customFields.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Campos existentes</h3>
                  <div className="space-y-2">
                    {customFields.map(field => (
                      <div 
                        key={field.id} 
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center gap-3">
                          {field.color && (
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: field.color }}
                            />
                          )}
                          <div>
                            <span className="font-medium text-gray-800">{field.name}</span>
                            <span className="ml-2 text-xs text-gray-500">
                              ({FIELD_TYPES.find(t => t.id === field.field_type)?.label || field.field_type})
                            </span>
                            {field.is_required && (
                              <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                                Obligatorio
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteField(field.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Create New Field */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Crear nuevo campo</h3>
                <div className="space-y-4">
                  {/* Field Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Nombre del campo</label>
                    <input
                      type="text"
                      value={newField.name}
                      onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                      placeholder="Ej: Ciudad, Empresa, Referido por..."
                    />
                  </div>
                  
                  {/* Field Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Tipo de campo</label>
                    <div className="grid grid-cols-1 gap-2">
                      {FIELD_TYPES.map(type => {
                        const IconComponent = type.icon;
                        const isSelected = newField.field_type === type.id;
                        return (
                          <button
                            key={type.id}
                            onClick={() => setNewField({ ...newField, field_type: type.id, options: type.id === 'select' || type.id === 'multiselect' ? newField.options : [] })}
                            className={`flex items-center gap-3 p-3 border rounded-lg text-left transition-all ${
                              isSelected 
                                ? 'border-cyan-400 bg-cyan-50 ring-2 ring-cyan-200' 
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              isSelected ? 'bg-cyan-500 text-white' : 'bg-gray-100 text-gray-500'
                            }`}>
                              <IconComponent size={20} />
                            </div>
                            <div className="flex-1">
                              <span className={`block text-sm font-medium ${isSelected ? 'text-cyan-700' : 'text-gray-700'}`}>
                                {type.label}
                              </span>
                              <span className="text-xs text-gray-500">{type.description}</span>
                            </div>
                            {isSelected && (
                              <Check size={18} className="text-cyan-500" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Options for select/multiselect */}
                  {(newField.field_type === 'select' || newField.field_type === 'multiselect') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Opciones</label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={newOption}
                          onChange={(e) => setNewOption(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newOption.trim()) {
                              setNewField({ ...newField, options: [...newField.options, newOption.trim()] });
                              setNewOption('');
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                          placeholder="Agregar opción y presiona Enter"
                        />
                        <button
                          onClick={() => {
                            if (newOption.trim()) {
                              setNewField({ ...newField, options: [...newField.options, newOption.trim()] });
                              setNewOption('');
                            }
                          }}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          <Plus size={18} className="text-gray-600" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {newField.options.map((opt, idx) => (
                          <span 
                            key={idx} 
                            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg text-sm"
                          >
                            {opt}
                            <button
                              onClick={() => setNewField({ 
                                ...newField, 
                                options: newField.options.filter((_, i) => i !== idx) 
                              })}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <X size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Color */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Color (opcional)</label>
                    <div className="flex gap-2">
                      {FIELD_COLORS.map(color => (
                        <button
                          key={color.id}
                          onClick={() => setNewField({ ...newField, color: newField.color === color.value ? null : color.value })}
                          className={`w-8 h-8 rounded-lg transition-all ${
                            newField.color === color.value ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: color.value }}
                        />
                      ))}
                    </div>
                  </div>
                  
                  {/* Is Required */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">¿Es obligatorio?</span>
                    <button
                      onClick={() => setNewField({ ...newField, is_required: !newField.is_required })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        newField.is_required ? 'bg-cyan-500' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        newField.is_required ? 'translate-x-7' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  
                  {/* Create Button */}
                  <button
                    onClick={handleCreateField}
                    disabled={!newField.name.trim()}
                    className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Crear campo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">¿Eliminar contacto?</h3>
              <p className="text-gray-500 text-sm mb-6">
                Esta acción eliminará permanentemente a <strong>{confirmDelete.nombre} {confirmDelete.apellidos}</strong>. 
                Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteContact(confirmDelete.id)}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper: Renderizar input según tipo de campo
const renderFieldInput = (field, value, onChange) => {
  switch (field.field_type) {
    case 'text':
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          placeholder={`Ingresa ${field.name.toLowerCase()}`}
        />
      );
    
    case 'select':
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
        >
          <option value="">Seleccionar...</option>
          {field.options?.map((opt, idx) => (
            <option key={idx} value={opt}>{opt}</option>
          ))}
        </select>
      );
    
    case 'multiselect':
      const selectedValues = value || [];
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {field.options?.map((opt, idx) => {
              const isSelected = selectedValues.includes(opt);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      onChange(selectedValues.filter(v => v !== opt));
                    } else {
                      onChange([...selectedValues, opt]);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    isSelected 
                      ? 'bg-cyan-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {isSelected && <Check size={14} className="inline mr-1" />}
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      );
    
    default:
      return null;
  }
};

// Helper: Renderizar valor de campo en tabla
const renderFieldValue = (value, field) => {
  if (!value) return <span className="text-gray-400">-</span>;
  
  if (field.field_type === 'multiselect' && Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((v, idx) => (
          <span key={idx} className="px-2 py-0.5 bg-gray-100 rounded text-xs">
            {v}
          </span>
        ))}
      </div>
    );
  }
  
  return value;
};

export default ContactsPage;

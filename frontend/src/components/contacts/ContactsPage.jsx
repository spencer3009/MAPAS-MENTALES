import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, UserPlus, Building2, UserCheck, 
  Search, Plus, X, Settings, Trash2, Edit2, 
  Phone, Mail, Calendar as CalendarIcon, ChevronDown, Check,
  Loader2, MoreHorizontal, Save, AlertCircle,
  Type, Hash, List, CheckSquare, AlignLeft, Clock,
  ChevronUp, Columns3, GripVertical, Eye, EyeOff
} from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Columnas predeterminadas (fijas del sistema)
const DEFAULT_COLUMNS = [
  { id: 'nombre', label: 'Nombre completo', required: true },
  { id: 'whatsapp', label: 'WhatsApp', required: false },
  { id: 'email', label: 'Email', required: false },
  { id: 'created_at', label: 'Fecha de creación', required: false }
];

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
  { id: 'date', label: 'Fecha', description: 'Selector de calendario', icon: CalendarIcon },
  { id: 'time', label: 'Hora', description: 'Formato 12h (AM/PM)', icon: Clock },
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
  const [showColumnsConfig, setShowColumnsConfig] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  
  // Column configuration state (per tab)
  // null significa "sin configuración" = mostrar todas las columnas
  const [columnConfig, setColumnConfig] = useState({
    client: null,
    prospect: null,
    supplier: null
  });
  const [draggedColumn, setDraggedColumn] = useState(null);
  
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

  // Cargar configuración de columnas desde localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('contacts_column_config');
    if (savedConfig) {
      try {
        setColumnConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error('Error loading column config:', e);
      }
    }
  }, []);

  // Guardar configuración de columnas en localStorage
  const saveColumnConfig = (newConfig) => {
    setColumnConfig(newConfig);
    localStorage.setItem('contacts_column_config', JSON.stringify(newConfig));
  };

  // Obtener todas las columnas disponibles (fijas + personalizadas)
  const getAllColumns = useCallback(() => {
    const allColumns = [
      ...DEFAULT_COLUMNS,
      ...customFields.map(f => ({ id: `custom_${f.id}`, label: f.name, required: false, fieldId: f.id }))
    ];
    return allColumns;
  }, [customFields]);

  // Obtener columnas visibles y ordenadas para la pestaña actual
  const getVisibleColumns = useCallback(() => {
    const allColumns = getAllColumns();
    const tabConfig = columnConfig[activeTab];
    
    // Si no hay configuración para esta pestaña (null), mostrar todas en orden original
    if (!tabConfig || !tabConfig.visible) {
      return allColumns;
    }
    
    // Obtener el orden (usar orden guardado o el original)
    const orderList = tabConfig.order && tabConfig.order.length > 0 
      ? tabConfig.order 
      : allColumns.map(c => c.id);
    
    // Filtrar y ordenar columnas según configuración
    const orderedColumns = [];
    orderList.forEach(colId => {
      const col = allColumns.find(c => c.id === colId);
      if (col) {
        // Mostrar si es obligatoria O si está en el array visible
        if (col.required || tabConfig.visible.includes(colId)) {
          orderedColumns.push(col);
        }
      }
    });
    
    // Agregar columnas nuevas que no estén en la configuración de orden
    allColumns.forEach(col => {
      if (!orderList.includes(col.id)) {
        // Columnas nuevas se muestran por defecto
        orderedColumns.push(col);
      }
    });
    
    return orderedColumns;
  }, [getAllColumns, columnConfig, activeTab]);

  // Toggle visibilidad de columna
  const toggleColumnVisibility = (columnId) => {
    const allColumns = getAllColumns();
    const column = allColumns.find(c => c.id === columnId);
    
    // No permitir ocultar columnas obligatorias
    if (column?.required) return;
    
    const tabConfig = columnConfig[activeTab];
    
    // Si no hay configuración, inicializar con todas las columnas visibles
    const currentVisible = tabConfig?.visible 
      ? [...tabConfig.visible]
      : allColumns.map(c => c.id);
    
    const currentOrder = tabConfig?.order && tabConfig.order.length > 0 
      ? tabConfig.order 
      : allColumns.map(c => c.id);
    
    let newVisible;
    if (currentVisible.includes(columnId)) {
      // Ocultar columna
      newVisible = currentVisible.filter(id => id !== columnId);
    } else {
      // Mostrar columna
      newVisible = [...currentVisible, columnId];
    }
    
    const newConfig = {
      ...columnConfig,
      [activeTab]: {
        visible: newVisible,
        order: currentOrder
      }
    };
    
    saveColumnConfig(newConfig);
  };

  // Verificar si una columna está visible
  const isColumnVisible = (columnId) => {
    const allColumns = getAllColumns();
    const column = allColumns.find(c => c.id === columnId);
    
    // Columnas obligatorias siempre visibles
    if (column?.required) return true;
    
    const tabConfig = columnConfig[activeTab];
    
    // Si no hay configuración para esta pestaña (null), todas visibles por defecto
    if (!tabConfig || !tabConfig.visible) {
      return true;
    }
    
    // Si hay configuración, verificar si la columna está en el array visible
    return tabConfig.visible.includes(columnId);
  };

  // Drag & Drop handlers
  const handleDragStart = (e, columnId) => {
    setDraggedColumn(columnId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    if (draggedColumn === columnId) return;
  };

  const handleDrop = (e, targetColumnId) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetColumnId) {
      setDraggedColumn(null);
      return;
    }
    
    const allColumns = getAllColumns();
    const tabConfig = columnConfig[activeTab];
    let currentOrder = tabConfig?.order || allColumns.map(c => c.id);
    
    // Reordenar
    const dragIndex = currentOrder.indexOf(draggedColumn);
    const targetIndex = currentOrder.indexOf(targetColumnId);
    
    if (dragIndex === -1 || targetIndex === -1) {
      setDraggedColumn(null);
      return;
    }
    
    const newOrder = [...currentOrder];
    newOrder.splice(dragIndex, 1);
    newOrder.splice(targetIndex, 0, draggedColumn);
    
    const newConfig = {
      ...columnConfig,
      [activeTab]: {
        ...tabConfig,
        visible: tabConfig?.visible || allColumns.map(c => c.id),
        order: newOrder
      }
    };
    
    saveColumnConfig(newConfig);
    setDraggedColumn(null);
  };

  // Validar formulario
  const validateForm = () => {
    const errors = {};
    if (!formData.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    if (!formData.apellidos.trim()) errors.apellidos = 'Los apellidos son obligatorios';
    if (!formData.whatsapp.trim()) errors.whatsapp = 'El WhatsApp es obligatorio';
    
    // Validar campos personalizados
    customFields.forEach(field => {
      const value = formData.custom_fields[field.id];
      const fieldType = field.field_type || 'text';
      
      // Validar campos obligatorios
      if (field.is_required) {
        if (!value || (Array.isArray(value) && value.length === 0) || (typeof value === 'string' && !value.trim())) {
          errors[`custom_${field.id}`] = `${field.name} es obligatorio`;
          return; // continuar al siguiente campo
        }
      }
      
      // Validar campos numéricos (si tienen valor)
      if (fieldType === 'number' && value && value.trim()) {
        if (isNaN(Number(value))) {
          errors[`custom_${field.id}`] = `${field.name} debe ser un número válido`;
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

  // Función helper para renderizar celda de columna
  const renderColumnCell = (col, contact) => {
    switch (col.id) {
      case 'nombre':
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
              {contact.nombre.charAt(0)}{contact.apellidos.charAt(0)}
            </div>
            <div>
              <div className="font-medium text-gray-900">{contact.nombre} {contact.apellidos}</div>
            </div>
          </div>
        );
      case 'whatsapp':
        return (
          <div className="flex items-center gap-1.5 text-gray-600">
            <Phone size={14} className="text-gray-400" />
            {contact.whatsapp}
          </div>
        );
      case 'email':
        return contact.email ? (
          <div className="flex items-center gap-1.5 text-gray-600">
            <Mail size={14} className="text-gray-400" />
            {contact.email}
          </div>
        ) : (
          <span className="text-gray-400 text-sm">-</span>
        );
      case 'created_at':
        return (
          <div className="flex items-center gap-1.5 text-gray-500 text-sm">
            <CalendarIcon size={14} className="text-gray-400" />
            {new Date(contact.created_at).toLocaleDateString('es-ES', { 
              day: '2-digit', 
              month: 'short', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        );
      default:
        // Campos personalizados
        if (col.id.startsWith('custom_')) {
          const field = customFields.find(f => f.id === col.fieldId);
          if (field) {
            return (
              <span className="text-gray-600 text-sm">
                {renderFieldValue(contact.custom_fields?.[col.fieldId], field)}
              </span>
            );
          }
        }
        return <span className="text-gray-400">-</span>;
    }
  };

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
              onClick={() => setShowColumnsConfig(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Columns3 size={16} />
              <span className="hidden sm:inline">Personalizar columnas</span>
            </button>
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
                    {getVisibleColumns().map(col => (
                      <th key={col.id} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {col.label}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredContacts.map(contact => (
                    <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                      {getVisibleColumns().map(col => (
                        <td key={col.id} className="px-4 py-3">
                          {renderColumnCell(col, contact)}
                        </td>
                      ))}
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
                      {customFields.map(field => {
                        const fieldType = field.field_type || 'text';
                        const FieldTypeInfo = FIELD_TYPES.find(t => t.id === fieldType);
                        const FieldIcon = FieldTypeInfo?.icon;
                        
                        return (
                          <div key={field.id}>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                              {FieldIcon && (
                                <span className="text-gray-400">
                                  <FieldIcon size={14} />
                                </span>
                              )}
                              {field.name} 
                              {field.is_required && <span className="text-red-500">*</span>}
                              {fieldType === 'number' && (
                                <span className="text-xs text-gray-400 font-normal">(solo números)</span>
                              )}
                            </label>
                            {renderFieldInput(
                              field, 
                              formData.custom_fields[field.id], 
                              (value) => {
                                setFormData({
                                  ...formData,
                                  custom_fields: { ...formData.custom_fields, [field.id]: value }
                                });
                                // Limpiar error al escribir
                                if (formErrors[`custom_${field.id}`]) {
                                  setFormErrors(prev => {
                                    const newErrors = { ...prev };
                                    delete newErrors[`custom_${field.id}`];
                                    return newErrors;
                                  });
                                }
                              },
                              formErrors[`custom_${field.id}`],
                              (error) => {
                                if (error) {
                                  setFormErrors(prev => ({ ...prev, [`custom_${field.id}`]: error }));
                                } else {
                                  setFormErrors(prev => {
                                    const newErrors = { ...prev };
                                    delete newErrors[`custom_${field.id}`];
                                    return newErrors;
                                  });
                                }
                              }
                            )}
                            {formErrors[`custom_${field.id}`] && fieldType !== 'number' && (
                              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle size={12} /> {formErrors[`custom_${field.id}`]}
                              </p>
                            )}
                          </div>
                        );
                      })}
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
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Campos existentes ({customFields.length})</h3>
                  <div className="space-y-2">
                    {customFields.map(field => {
                      const fieldTypeInfo = FIELD_TYPES.find(t => t.id === field.field_type) || FIELD_TYPES[0];
                      const FieldIcon = fieldTypeInfo.icon;
                      return (
                        <div 
                          key={field.id} 
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {field.color ? (
                              <div 
                                className="w-8 h-8 rounded-lg flex items-center justify-center" 
                                style={{ backgroundColor: field.color + '20' }}
                              >
                                <FieldIcon size={16} style={{ color: field.color }} />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center">
                                <FieldIcon size={16} className="text-gray-500" />
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-800">{field.name}</span>
                                {field.is_required && (
                                  <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">
                                    Obligatorio
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">
                                {fieldTypeInfo.label}
                                {(field.field_type === 'select' || field.field_type === 'multiselect') && field.options?.length > 0 && (
                                  <span className="ml-1">• {field.options.length} opciones</span>
                                )}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteField(field.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar campo"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}
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

      {/* Columns Config Modal */}
      {showColumnsConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Columns3 className="w-5 h-5 text-white" />
                <h2 className="text-lg font-bold text-white">Personalizar columnas</h2>
              </div>
              <button onClick={() => setShowColumnsConfig(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <p className="text-sm text-gray-500 mb-4">
                Arrastra para reordenar. Marca/desmarca para mostrar/ocultar columnas.
              </p>
              
              <div className="space-y-2">
                {getAllColumns().map((col) => {
                  const isVisible = isColumnVisible(col.id);
                  
                  return (
                    <div
                      key={col.id}
                      data-testid={`column-row-${col.id}`}
                      draggable={!col.required}
                      onDragStart={(e) => handleDragStart(e, col.id)}
                      onDragOver={(e) => handleDragOver(e, col.id)}
                      onDrop={(e) => handleDrop(e, col.id)}
                      className={`flex items-center gap-3 p-3 border rounded-lg transition-all ${
                        draggedColumn === col.id 
                          ? 'border-cyan-400 bg-cyan-50 opacity-50' 
                          : 'border-gray-200 hover:bg-gray-50'
                      } ${!col.required ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    >
                      {/* Drag Handle */}
                      <div className={`${col.required ? 'opacity-30' : 'text-gray-400'}`}>
                        <GripVertical size={18} />
                      </div>
                      
                      {/* Checkbox */}
                      <button
                        type="button"
                        data-testid={`column-toggle-${col.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleColumnVisibility(col.id);
                        }}
                        disabled={col.required}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isVisible 
                            ? 'bg-cyan-500 border-cyan-500 text-white' 
                            : 'border-gray-300 hover:border-gray-400'
                        } ${col.required ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        {isVisible && <Check size={14} />}
                      </button>
                      
                      {/* Column Name */}
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-700">{col.label}</span>
                        {col.required && (
                          <span className="ml-2 text-xs text-gray-400">(obligatoria)</span>
                        )}
                      </div>
                      
                      {/* Visibility Icon */}
                      <div className={`${isVisible ? 'text-cyan-500' : 'text-gray-300'}`}>
                        {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    // Restaurar valores por defecto
                    const allColumns = getAllColumns();
                    const newConfig = {
                      ...columnConfig,
                      [activeTab]: {
                        visible: allColumns.map(c => c.id),
                        order: allColumns.map(c => c.id)
                      }
                    };
                    saveColumnConfig(newConfig);
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Restaurar por defecto
                </button>
                <button
                  onClick={() => setShowColumnsConfig(false)}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Listo
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
const renderFieldInput = (field, value, onChange, error, setError) => {
  // Normalizar tipo de campo - si no tiene tipo, default a 'text'
  const fieldType = field.field_type || 'text';
  
  switch (fieldType) {
    case 'text':
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 ${
            error ? 'border-red-300 bg-red-50' : 'border-gray-200'
          }`}
          placeholder={`Ingresa ${field.name.toLowerCase()}`}
        />
      );
    
    case 'number':
      return (
        <div>
          <input
            type="text"
            inputMode="numeric"
            value={value || ''}
            onChange={(e) => {
              const newValue = e.target.value;
              // Permitir vacío, dígitos, punto decimal y signo negativo
              if (newValue === '' || /^-?\d*\.?\d*$/.test(newValue)) {
                onChange(newValue);
                if (setError) setError(null);
              } else {
                if (setError) setError('Este campo solo acepta números');
              }
            }}
            onBlur={(e) => {
              // Validar al perder foco
              const val = e.target.value;
              if (val && isNaN(Number(val))) {
                if (setError) setError('Este campo solo acepta números');
              }
            }}
            className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 ${
              error ? 'border-red-300 bg-red-50' : 'border-gray-200'
            }`}
            placeholder={`Ingresa ${field.name.toLowerCase()} (solo números)`}
          />
          {error && (
            <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle size={12} /> {error}
            </p>
          )}
        </div>
      );
    
    case 'date':
      return <DatePickerField value={value} onChange={onChange} error={error} fieldName={field.name} />;
    
    case 'time':
      return <TimePickerField value={value} onChange={onChange} error={error} fieldName={field.name} />;
    
    case 'textarea':
      return (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 resize-none ${
            error ? 'border-red-300 bg-red-50' : 'border-gray-200'
          }`}
          placeholder={`Ingresa ${field.name.toLowerCase()}`}
        />
      );
    
    case 'select':
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 ${
            error ? 'border-red-300 bg-red-50' : 'border-gray-200'
          }`}
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
          {(!field.options || field.options.length === 0) && (
            <p className="text-xs text-gray-400">No hay opciones configuradas</p>
          )}
        </div>
      );
    
    default:
      // Fallback para tipos desconocidos - tratar como texto
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          placeholder={`Ingresa ${field.name.toLowerCase()}`}
        />
      );
  }
};

// Componente: Date Picker para campos de fecha
const DatePickerField = ({ value, onChange, error, fieldName }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Parsear fecha si existe
  const selectedDate = value ? new Date(value) : undefined;
  
  const handleSelect = (date) => {
    if (date) {
      // Guardar en formato ISO (YYYY-MM-DD)
      onChange(format(date, 'yyyy-MM-dd'));
    } else {
      onChange('');
    }
    setIsOpen(false);
  };
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`w-full px-3 py-2.5 border rounded-lg text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-cyan-500/20 ${
            error ? 'border-red-300 bg-red-50' : 'border-gray-200'
          } ${value ? 'text-gray-900' : 'text-gray-400'}`}
        >
          <span className="flex items-center gap-2">
            <CalendarIcon size={16} className="text-gray-400" />
            {value ? format(selectedDate, "d 'de' MMMM, yyyy", { locale: es }) : `Seleccionar ${fieldName.toLowerCase()}`}
          </span>
          <ChevronDown size={16} className="text-gray-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-white" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          initialFocus
          locale={es}
        />
        {value && (
          <div className="p-2 border-t">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className="w-full py-1.5 text-xs text-red-500 hover:bg-red-50 rounded transition-colors"
            >
              Limpiar fecha
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

// Componente: Time Picker para campos de hora (formato 12h AM/PM)
const TimePickerField = ({ value, onChange, error, fieldName }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Parsear hora si existe (formato interno: HH:mm)
  const parseTime = (timeStr) => {
    if (!timeStr) return { hours: 12, minutes: 0, period: 'AM' };
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hours12 = h % 12 || 12;
    return { hours: hours12, minutes: m || 0, period };
  };
  
  const { hours, minutes, period } = parseTime(value);
  
  // Formatear para mostrar
  const displayValue = value 
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`
    : '';
  
  // Convertir a formato 24h para guardar
  const updateTime = (newHours, newMinutes, newPeriod) => {
    let hours24 = newHours;
    if (newPeriod === 'PM' && newHours !== 12) {
      hours24 = newHours + 12;
    } else if (newPeriod === 'AM' && newHours === 12) {
      hours24 = 0;
    }
    onChange(`${String(hours24).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`);
  };
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`w-full px-3 py-2.5 border rounded-lg text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-cyan-500/20 ${
            error ? 'border-red-300 bg-red-50' : 'border-gray-200'
          } ${value ? 'text-gray-900' : 'text-gray-400'}`}
        >
          <span className="flex items-center gap-2">
            <Clock size={16} className="text-gray-400" />
            {displayValue || `Seleccionar ${fieldName.toLowerCase()}`}
          </span>
          <ChevronDown size={16} className="text-gray-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4 bg-white" align="start">
        <div className="space-y-4">
          <p className="text-sm font-medium text-gray-700 text-center">Seleccionar hora</p>
          
          {/* Time Selector */}
          <div className="flex items-center justify-center gap-2">
            {/* Hours */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => {
                  const newHours = hours === 12 ? 1 : hours + 1;
                  updateTime(newHours, minutes, period);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronUp size={18} className="text-gray-500" />
              </button>
              <span className="w-12 h-10 flex items-center justify-center text-2xl font-mono bg-gray-100 rounded">
                {String(hours).padStart(2, '0')}
              </span>
              <button
                type="button"
                onClick={() => {
                  const newHours = hours === 1 ? 12 : hours - 1;
                  updateTime(newHours, minutes, period);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronDown size={18} className="text-gray-500" />
              </button>
            </div>
            
            <span className="text-2xl font-mono text-gray-400">:</span>
            
            {/* Minutes */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => {
                  const newMinutes = (minutes + 5) % 60;
                  updateTime(hours, newMinutes, period);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronUp size={18} className="text-gray-500" />
              </button>
              <span className="w-12 h-10 flex items-center justify-center text-2xl font-mono bg-gray-100 rounded">
                {String(minutes).padStart(2, '0')}
              </span>
              <button
                type="button"
                onClick={() => {
                  const newMinutes = minutes < 5 ? 55 : minutes - 5;
                  updateTime(hours, newMinutes, period);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronDown size={18} className="text-gray-500" />
              </button>
            </div>
            
            {/* AM/PM */}
            <div className="flex flex-col gap-1 ml-2">
              <button
                type="button"
                onClick={() => updateTime(hours, minutes, 'AM')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  period === 'AM' 
                    ? 'bg-cyan-500 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => updateTime(hours, minutes, 'PM')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  period === 'PM' 
                    ? 'bg-cyan-500 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                PM
              </button>
            </div>
          </div>
          
          {/* Quick Select */}
          <div className="grid grid-cols-4 gap-1 border-t pt-3">
            {['09:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'].map(time => (
              <button
                key={time}
                type="button"
                onClick={() => {
                  onChange(time);
                  setIsOpen(false);
                }}
                className="px-2 py-1.5 text-xs text-gray-600 hover:bg-cyan-50 hover:text-cyan-600 rounded transition-colors"
              >
                {(() => {
                  const [h] = time.split(':').map(Number);
                  const p = h >= 12 ? 'PM' : 'AM';
                  const h12 = h % 12 || 12;
                  return `${h12}${p}`;
                })()}
              </button>
            ))}
          </div>
          
          {/* Clear */}
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className="w-full py-1.5 text-xs text-red-500 hover:bg-red-50 rounded transition-colors border-t pt-2"
            >
              Limpiar hora
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Helper: Renderizar valor de campo en tabla
const renderFieldValue = (value, field) => {
  if (value === null || value === undefined || value === '') {
    return <span className="text-gray-400">-</span>;
  }
  
  // Normalizar tipo de campo
  const fieldType = field.field_type || 'text';
  
  if (fieldType === 'multiselect' && Array.isArray(value)) {
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
  
  if (fieldType === 'number') {
    // Formatear números con separador de miles si es grande
    const num = Number(value);
    if (!isNaN(num) && Math.abs(num) >= 1000) {
      return <span className="font-mono">{num.toLocaleString('es-ES')}</span>;
    }
    return <span className="font-mono">{value}</span>;
  }
  
  if (fieldType === 'date') {
    // Formatear fecha legible
    try {
      const date = new Date(value);
      return (
        <span className="flex items-center gap-1 text-gray-700">
          <CalendarIcon size={14} className="text-gray-400" />
          {format(date, "d MMM yyyy", { locale: es })}
        </span>
      );
    } catch {
      return value;
    }
  }
  
  if (fieldType === 'time') {
    // Formatear hora en 12h
    try {
      const [h, m] = value.split(':').map(Number);
      const period = h >= 12 ? 'PM' : 'AM';
      const hours12 = h % 12 || 12;
      return (
        <span className="flex items-center gap-1 text-gray-700 font-mono">
          <Clock size={14} className="text-gray-400" />
          {`${String(hours12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`}
        </span>
      );
    } catch {
      return value;
    }
  }
  
  if (fieldType === 'textarea') {
    // Mostrar texto truncado si es muy largo
    const maxLength = 50;
    if (String(value).length > maxLength) {
      return (
        <span title={value} className="cursor-help">
          {String(value).substring(0, maxLength)}...
        </span>
      );
    }
  }
  
  return value;
};

// Helper: Obtener tipo de campo con label legible
const getFieldTypeLabel = (fieldType) => {
  const type = FIELD_TYPES.find(t => t.id === fieldType);
  return type ? type.label : 'Texto';
};

export default ContactsPage;

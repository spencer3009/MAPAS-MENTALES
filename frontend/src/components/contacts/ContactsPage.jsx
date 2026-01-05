import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, UserPlus, Building2, UserCheck, 
  Search, Plus, X, Settings, Trash2, Edit2, 
  Phone, Mail, Calendar as CalendarIcon, ChevronDown, Check,
  Loader2, MoreHorizontal, Save, AlertCircle,
  Type, Hash, List, CheckSquare, AlignLeft, Clock,
  ChevronUp, Columns3, GripVertical, Eye, EyeOff, Tag,
  Filter, FilterX, CalendarDays, CalendarRange, ChevronLeft, ChevronRight,
  BarChart3, PieChart, TrendingUp, Award
} from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { 
  format, parse, startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  startOfYear, endOfYear, getWeek, getYear, addWeeks, subWeeks,
  addMonths, subMonths, isSameWeek, isWithinInterval, parseISO,
  eachWeekOfInterval, getMonth, eachDayOfInterval, eachMonthOfInterval,
  startOfDay, endOfDay
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Columnas predeterminadas (fijas del sistema)
const DEFAULT_COLUMNS = [
  { id: 'nombre', label: 'Nombre completo', required: true },
  { id: 'whatsapp', label: 'WhatsApp', required: false },
  { id: 'email', label: 'Email', required: false },
  { id: 'labels', label: 'Etiquetas', required: false },
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

// Colores predefinidos para etiquetas
const LABEL_COLORS = [
  { id: 'blue', name: 'Azul', value: '#3B82F6' },
  { id: 'cyan', name: 'Cyan', value: '#06B6D4' },
  { id: 'green', name: 'Verde', value: '#22C55E' },
  { id: 'yellow', name: 'Amarillo', value: '#EAB308' },
  { id: 'orange', name: 'Naranja', value: '#F97316' },
  { id: 'red', name: 'Rojo', value: '#EF4444' },
  { id: 'pink', name: 'Rosa', value: '#EC4899' },
  { id: 'purple', name: 'Morado', value: '#A855F7' },
  { id: 'indigo', name: 'Índigo', value: '#6366F1' },
  { id: 'gray', name: 'Gris', value: '#6B7280' }
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
  const [contactLabels, setContactLabels] = useState([]); // Etiquetas disponibles
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFieldsConfig, setShowFieldsConfig] = useState(false);
  const [showColumnsConfig, setShowColumnsConfig] = useState(false);
  const [showLabelsConfig, setShowLabelsConfig] = useState(false); // Modal de etiquetas
  const [showViewModal, setShowViewModal] = useState(null); // Contact to view
  const [editingContact, setEditingContact] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  
  // Labels management states
  const [editingLabel, setEditingLabel] = useState(null);
  const [newLabel, setNewLabel] = useState({ name: '', color: '#3B82F6' });
  const [labelError, setLabelError] = useState('');
  
  // Column configuration state (per tab)
  // null significa "sin configuración" = mostrar todas las columnas
  const [columnConfig, setColumnConfig] = useState({
    client: null,
    prospect: null,
    supplier: null
  });
  const [draggedColumn, setDraggedColumn] = useState(null);
  
  // Column filter states
  const [columnFilters, setColumnFilters] = useState({}); // { columnId: [selectedValues] }
  const [openFilterDropdown, setOpenFilterDropdown] = useState(null); // columnId of open dropdown
  const [filterDropdownPosition, setFilterDropdownPosition] = useState({ top: 0, left: 0 }); // Position for portal dropdown
  const filterDropdownRef = useRef(null);
  const filterButtonRefs = useRef({}); // Store refs for each filter button
  
  // Date filter states
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateFilterMode, setDateFilterMode] = useState('day'); // 'day', 'week', 'month', 'year'
  const [dateFilterFrom, setDateFilterFrom] = useState(null);
  const [dateFilterTo, setDateFilterTo] = useState(null);
  const [dateFilterMonth, setDateFilterMonth] = useState(new Date().getMonth());
  const [dateFilterYear, setDateFilterYear] = useState(new Date().getFullYear());
  const [dateFilterMonthTo, setDateFilterMonthTo] = useState(new Date().getMonth());
  const [dateFilterYearTo, setDateFilterYearTo] = useState(new Date().getFullYear());
  const [dateFilterYears, setDateFilterYears] = useState([]); // For multi-year selection
  const [weekSelectorDate, setWeekSelectorDate] = useState(new Date());
  const [selectedWeeks, setSelectedWeeks] = useState([]); // Array of {start, end} for week ranges
  const dateFilterButtonRef = useRef(null);
  const [dateFilterDropdownPosition, setDateFilterDropdownPosition] = useState({ top: 0, left: 0 });
  
  // Form states
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    whatsapp: '',
    email: '',
    custom_fields: {},
    labels: [] // Etiquetas del contacto
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
  const [editingField, setEditingField] = useState(null); // Campo en edición
  const [newOption, setNewOption] = useState('');
  const [showTypeChangeWarning, setShowTypeChangeWarning] = useState(false);
  
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
      
      // Cargar etiquetas
      const labelsRes = await fetch(`${API_URL}/api/contacts/labels/${activeTab}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (labelsRes.ok) {
        const data = await labelsRes.json();
        setContactLabels(data.labels || []);
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

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setOpenFilterDropdown(null);
      }
      // Close date filter dropdown when clicking outside
      // But not if clicking inside a popover (calendar)
      const isInsideDateFilter = event.target.closest('[data-testid="date-filter-button"]') || 
                                  event.target.closest('[data-radix-popper-content-wrapper]');
      if (!isInsideDateFilter && showDateFilter && dateFilterButtonRef.current && !dateFilterButtonRef.current.contains(event.target)) {
        const dateFilterDropdown = document.querySelector('[style*="z-index: 99999"]');
        if (dateFilterDropdown && !dateFilterDropdown.contains(event.target)) {
          setShowDateFilter(false);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDateFilter]);

  // Reset filters when changing tabs
  useEffect(() => {
    setColumnFilters({});
    setOpenFilterDropdown(null);
  }, [activeTab]);

  // Guardar configuración de columnas en localStorage
  const saveColumnConfig = (newConfig) => {
    setColumnConfig(newConfig);
    localStorage.setItem('contacts_column_config', JSON.stringify(newConfig));
  };

  // Determinar si una columna es filtrable (select, multiselect, o labels)
  const isColumnFilterable = useCallback((col) => {
    // Labels column is always filterable
    if (col.id === 'labels') return true;
    
    // Custom fields of type select or multiselect are filterable
    if (col.id.startsWith('custom_')) {
      const field = customFields.find(f => f.id === col.fieldId);
      if (field && (field.field_type === 'select' || field.field_type === 'multiselect')) {
        return true;
      }
    }
    
    return false;
  }, [customFields]);

  // Get filter options for a column
  const getFilterOptions = useCallback((col) => {
    if (col.id === 'labels') {
      // Return all available labels
      return contactLabels.map(label => ({
        id: label.id,
        name: label.name,
        color: label.color
      }));
    }
    
    if (col.id.startsWith('custom_')) {
      const field = customFields.find(f => f.id === col.fieldId);
      if (field && field.options && field.options.length > 0) {
        return field.options.map(opt => ({
          id: opt,
          name: opt,
          color: field.color || null
        }));
      }
    }
    
    return [];
  }, [customFields, contactLabels]);

  // Check if column allows multiple selection (multiselect or labels)
  const isMultiSelectFilter = useCallback((col) => {
    if (col.id === 'labels') return true;
    
    if (col.id.startsWith('custom_')) {
      const field = customFields.find(f => f.id === col.fieldId);
      if (field && field.field_type === 'multiselect') {
        return true;
      }
    }
    
    return false;
  }, [customFields]);

  // Toggle filter value for a column
  const toggleFilterValue = (columnId, value, isMultiSelect) => {
    setColumnFilters(prev => {
      const currentValues = prev[columnId] || [];
      
      if (isMultiSelect) {
        // Multi-select: toggle the value
        if (currentValues.includes(value)) {
          const newValues = currentValues.filter(v => v !== value);
          if (newValues.length === 0) {
            const { [columnId]: _, ...rest } = prev;
            return rest;
          }
          return { ...prev, [columnId]: newValues };
        } else {
          return { ...prev, [columnId]: [...currentValues, value] };
        }
      } else {
        // Single select: replace or clear
        if (currentValues.includes(value)) {
          const { [columnId]: _, ...rest } = prev;
          return rest;
        } else {
          return { ...prev, [columnId]: [value] };
        }
      }
    });
  };

  // Clear filter for a column
  const clearColumnFilter = (columnId) => {
    setColumnFilters(prev => {
      const { [columnId]: _, ...rest } = prev;
      return rest;
    });
    setOpenFilterDropdown(null);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setColumnFilters({});
    setOpenFilterDropdown(null);
    clearDateFilter();
  };

  // Check if any filters are active
  const hasActiveFilters = Object.keys(columnFilters).length > 0 || 
    (dateFilterMode === 'day' && (dateFilterFrom !== null || dateFilterTo !== null)) ||
    (dateFilterMode === 'week' && selectedWeeks.length > 0) ||
    (dateFilterMode === 'year' && dateFilterYears.length > 0);

  // Open filter dropdown and calculate position (for portal)
  const openFilterDropdownWithPosition = (columnId, buttonElement) => {
    if (openFilterDropdown === columnId) {
      setOpenFilterDropdown(null);
      return;
    }
    
    if (buttonElement) {
      const rect = buttonElement.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      // Calculate position - align to left of button, below it
      let left = rect.left + scrollLeft;
      let top = rect.bottom + scrollTop + 4; // 4px gap
      
      // Ensure dropdown doesn't overflow right edge of viewport
      const dropdownWidth = 220; // min-width of dropdown
      if (left + dropdownWidth > window.innerWidth) {
        left = window.innerWidth - dropdownWidth - 16; // 16px margin
      }
      
      // Ensure dropdown doesn't overflow left edge
      if (left < 16) {
        left = 16;
      }
      
      setFilterDropdownPosition({ top, left });
    }
    
    setOpenFilterDropdown(columnId);
  };

  // Date filter functions
  const hasActiveDateFilter = dateFilterMode === 'day' 
    ? (dateFilterFrom !== null || dateFilterTo !== null)
    : dateFilterMode === 'week'
    ? selectedWeeks.length > 0
    : dateFilterMode === 'month'
    ? true // Always has a month/year selected
    : dateFilterMode === 'year'
    ? dateFilterYears.length > 0
    : false;

  const openDateFilterDropdown = (buttonElement) => {
    if (showDateFilter) {
      setShowDateFilter(false);
      return;
    }
    
    if (buttonElement) {
      const rect = buttonElement.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      let left = rect.left + scrollLeft;
      let top = rect.bottom + scrollTop + 4;
      
      // Ensure dropdown doesn't overflow
      const dropdownWidth = 380;
      if (left + dropdownWidth > window.innerWidth) {
        left = window.innerWidth - dropdownWidth - 16;
      }
      if (left < 16) left = 16;
      
      setDateFilterDropdownPosition({ top, left });
    }
    
    setShowDateFilter(true);
  };

  const clearDateFilter = () => {
    setDateFilterFrom(null);
    setDateFilterTo(null);
    setSelectedWeeks([]);
    setDateFilterYears([]);
    setDateFilterMonth(new Date().getMonth());
    setDateFilterYear(new Date().getFullYear());
    setDateFilterMonthTo(new Date().getMonth());
    setDateFilterYearTo(new Date().getFullYear());
    setShowDateFilter(false);
  };

  const getDateFilterRange = () => {
    switch (dateFilterMode) {
      case 'day':
        return {
          from: dateFilterFrom,
          to: dateFilterTo || dateFilterFrom
        };
      case 'week':
        if (selectedWeeks.length === 0) return null;
        const allStarts = selectedWeeks.map(w => w.start);
        const allEnds = selectedWeeks.map(w => w.end);
        return {
          from: new Date(Math.min(...allStarts)),
          to: new Date(Math.max(...allEnds))
        };
      case 'month':
        const fromMonth = new Date(dateFilterYear, dateFilterMonth, 1);
        const toMonth = new Date(dateFilterYearTo, dateFilterMonthTo + 1, 0); // Last day of month
        return { from: fromMonth, to: toMonth };
      case 'year':
        if (dateFilterYears.length === 0) return null;
        const minYear = Math.min(...dateFilterYears);
        const maxYear = Math.max(...dateFilterYears);
        return {
          from: new Date(minYear, 0, 1),
          to: new Date(maxYear, 11, 31)
        };
      default:
        return null;
    }
  };

  const getDateFilterLabel = () => {
    const range = getDateFilterRange();
    if (!range || (!range.from && !range.to)) return null;
    
    switch (dateFilterMode) {
      case 'day':
        if (range.from && range.to && range.from.getTime() === range.to.getTime()) {
          return format(range.from, "d MMM yyyy", { locale: es });
        }
        return `${format(range.from, "d MMM", { locale: es })} - ${format(range.to, "d MMM yyyy", { locale: es })}`;
      case 'week':
        if (selectedWeeks.length === 1) {
          return `Sem. ${getWeek(selectedWeeks[0].start, { locale: es })} de ${getYear(selectedWeeks[0].start)}`;
        }
        return `${selectedWeeks.length} semanas`;
      case 'month':
        const fromLabel = format(new Date(dateFilterYear, dateFilterMonth), "MMM yyyy", { locale: es });
        const toLabel = format(new Date(dateFilterYearTo, dateFilterMonthTo), "MMM yyyy", { locale: es });
        if (fromLabel === toLabel) return fromLabel;
        return `${fromLabel} - ${toLabel}`;
      case 'year':
        if (dateFilterYears.length === 1) return dateFilterYears[0].toString();
        return `${Math.min(...dateFilterYears)} - ${Math.max(...dateFilterYears)}`;
      default:
        return null;
    }
  };

  const toggleWeekSelection = (weekStart) => {
    const weekEnd = endOfWeek(weekStart, { locale: es });
    const existingIndex = selectedWeeks.findIndex(w => 
      w.start.getTime() === weekStart.getTime()
    );
    
    if (existingIndex >= 0) {
      setSelectedWeeks(prev => prev.filter((_, i) => i !== existingIndex));
    } else {
      setSelectedWeeks(prev => [...prev, { start: weekStart, end: weekEnd }]);
    }
  };

  const isWeekSelected = (date) => {
    const weekStart = startOfWeek(date, { locale: es });
    return selectedWeeks.some(w => w.start.getTime() === weekStart.getTime());
  };

  const toggleYearSelection = (year) => {
    if (dateFilterYears.includes(year)) {
      setDateFilterYears(prev => prev.filter(y => y !== year));
    } else {
      setDateFilterYears(prev => [...prev, year].sort());
    }
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

  // Iniciar edición de campo
  const startEditField = (field) => {
    setEditingField(field);
    setNewField({
      name: field.name,
      field_type: field.field_type || 'text',
      is_required: field.is_required || false,
      color: field.color || null,
      options: field.options || []
    });
  };

  // Cancelar edición
  const cancelEditField = () => {
    setEditingField(null);
    setNewField({ name: '', field_type: 'text', is_required: false, color: null, options: [] });
    setShowTypeChangeWarning(false);
  };

  // Actualizar campo personalizado
  const handleUpdateField = async () => {
    if (!newField.name.trim()) return;
    
    try {
      const response = await fetch(`${API_URL}/api/contacts/config/fields/${activeTab}/${editingField.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newField)
      });
      
      if (response.ok) {
        loadData();
        cancelEditField();
      }
    } catch (error) {
      console.error('Error updating field:', error);
    }
  };

  // Verificar si el cambio de tipo es compatible
  const checkTypeChangeCompatibility = (newType) => {
    if (!editingField) return true;
    
    const oldType = editingField.field_type || 'text';
    
    // Cambios que podrían causar problemas de datos
    const incompatibleChanges = [
      { from: 'number', to: 'date' },
      { from: 'number', to: 'time' },
      { from: 'date', to: 'number' },
      { from: 'time', to: 'number' },
      { from: 'select', to: 'multiselect' },
      { from: 'multiselect', to: 'select' }
    ];
    
    const isIncompatible = incompatibleChanges.some(
      c => c.from === oldType && c.to === newType
    );
    
    if (isIncompatible && oldType !== newType) {
      setShowTypeChangeWarning(true);
      return false;
    }
    
    return true;
  };

  // ==========================================
  // LABELS/TAGS MANAGEMENT
  // ==========================================
  
  // Crear etiqueta
  const handleCreateLabel = async () => {
    if (!newLabel.name.trim()) {
      setLabelError('El nombre es obligatorio');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/contacts/labels/${activeTab}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newLabel)
      });
      
      if (response.ok) {
        loadData();
        setNewLabel({ name: '', color: '#3B82F6' });
        setLabelError('');
      } else {
        const data = await response.json();
        setLabelError(data.detail || 'Error al crear etiqueta');
      }
    } catch (error) {
      console.error('Error creating label:', error);
      setLabelError('Error de conexión');
    }
  };

  // Actualizar etiqueta
  const handleUpdateLabel = async () => {
    if (!newLabel.name.trim()) {
      setLabelError('El nombre es obligatorio');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/contacts/labels/${activeTab}/${editingLabel.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newLabel)
      });
      
      if (response.ok) {
        loadData();
        cancelEditLabel();
      } else {
        const data = await response.json();
        setLabelError(data.detail || 'Error al actualizar etiqueta');
      }
    } catch (error) {
      console.error('Error updating label:', error);
      setLabelError('Error de conexión');
    }
  };

  // Eliminar etiqueta
  const handleDeleteLabel = async (labelId) => {
    try {
      const response = await fetch(`${API_URL}/api/contacts/labels/${activeTab}/${labelId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Error deleting label:', error);
    }
  };

  // Iniciar edición de etiqueta
  const startEditLabel = (label) => {
    setEditingLabel(label);
    setNewLabel({ name: label.name, color: label.color });
    setLabelError('');
  };

  // Cancelar edición de etiqueta
  const cancelEditLabel = () => {
    setEditingLabel(null);
    setNewLabel({ name: '', color: '#3B82F6' });
    setLabelError('');
  };

  // Toggle etiqueta en el formulario de contacto
  const toggleContactLabel = (labelId) => {
    const currentLabels = formData.labels || [];
    if (currentLabels.includes(labelId)) {
      setFormData({ ...formData, labels: currentLabels.filter(id => id !== labelId) });
    } else {
      setFormData({ ...formData, labels: [...currentLabels, labelId] });
    }
  };

  // Obtener info de etiqueta por ID
  const getLabelById = (labelId) => {
    return contactLabels.find(l => l.id === labelId);
  };

  // Cerrar modal y limpiar
  const closeModal = () => {
    setShowCreateModal(false);
    setEditingContact(null);
    setFormData({ nombre: '', apellidos: '', whatsapp: '', email: '', custom_fields: {}, labels: [] });
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
      custom_fields: contact.custom_fields || {},
      labels: contact.labels || []
    });
    setShowCreateModal(true);
  };

  // Filtrar contactos (búsqueda + filtros de columna)
  const filteredContacts = contacts.filter(contact => {
    // Text search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      contact.nombre.toLowerCase().includes(searchLower) ||
      contact.apellidos.toLowerCase().includes(searchLower) ||
      contact.whatsapp.includes(searchLower) ||
      (contact.email && contact.email.toLowerCase().includes(searchLower))
    );
    
    if (!matchesSearch) return false;
    
    // Date filter
    const dateRange = getDateFilterRange();
    if (dateRange && dateRange.from) {
      const contactDate = contact.created_at ? parseISO(contact.created_at) : null;
      if (contactDate) {
        const rangeStart = new Date(dateRange.from);
        rangeStart.setHours(0, 0, 0, 0);
        const rangeEnd = new Date(dateRange.to || dateRange.from);
        rangeEnd.setHours(23, 59, 59, 999);
        
        if (contactDate < rangeStart || contactDate > rangeEnd) {
          return false;
        }
      }
    }
    
    // Column filters
    for (const [columnId, filterValues] of Object.entries(columnFilters)) {
      if (!filterValues || filterValues.length === 0) continue;
      
      if (columnId === 'labels') {
        // Filter by labels
        const contactLabelIds = contact.labels || [];
        // Check if contact has ANY of the selected labels
        const hasMatchingLabel = filterValues.some(labelId => contactLabelIds.includes(labelId));
        if (!hasMatchingLabel) return false;
      } else if (columnId.startsWith('custom_')) {
        // Filter by custom field
        const fieldId = columnId.replace('custom_', '');
        const fieldValue = contact.custom_fields?.[fieldId];
        const field = customFields.find(f => f.id === fieldId);
        
        if (field) {
          if (field.field_type === 'multiselect') {
            // Multiselect: check if any selected value matches
            const contactValues = Array.isArray(fieldValue) ? fieldValue : [];
            const hasMatchingValue = filterValues.some(v => contactValues.includes(v));
            if (!hasMatchingValue) return false;
          } else {
            // Single select: check if value matches
            if (!filterValues.includes(fieldValue)) return false;
          }
        }
      }
    }
    
    return true;
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
      case 'labels':
        const contactLabelIds = contact.labels || [];
        if (contactLabelIds.length === 0) {
          return <span className="text-gray-400 text-sm">—</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {contactLabelIds.map(labelId => {
              const label = getLabelById(labelId);
              if (!label) return null;
              return (
                <span
                  key={labelId}
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: label.color + '20',
                    color: label.color,
                    border: `1px solid ${label.color}40`
                  }}
                >
                  {label.name}
                </span>
              );
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
              <span className="hidden sm:inline">Columnas</span>
            </button>
            <button
              onClick={() => setShowLabelsConfig(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Tag size={16} />
              <span className="hidden sm:inline">Etiquetas</span>
            </button>
            <button
              ref={dateFilterButtonRef}
              onClick={(e) => openDateFilterDropdown(e.currentTarget)}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors ${
                hasActiveDateFilter
                  ? 'bg-cyan-50 border-cyan-300 text-cyan-700 hover:bg-cyan-100'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
              data-testid="date-filter-button"
            >
              <CalendarRange size={16} />
              <span className="hidden sm:inline">
                {hasActiveDateFilter ? getDateFilterLabel() : 'Fecha'}
              </span>
              {hasActiveDateFilter && (
                <X 
                  size={14} 
                  className="ml-1 hover:text-cyan-900"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearDateFilter();
                  }}
                />
              )}
            </button>
            <button
              onClick={() => setShowFieldsConfig(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Settings size={16} />
              <span className="hidden sm:inline">Campos</span>
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
              {hasActiveFilters ? (
                <FilterX className="w-8 h-8 text-gray-400" />
              ) : (
                <currentType.icon className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              {searchTerm || hasActiveFilters ? 'No se encontraron resultados' : `No hay ${currentType.label.toLowerCase()}`}
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              {hasActiveFilters 
                ? 'Prueba ajustando los filtros o búsqueda' 
                : searchTerm 
                  ? 'Prueba con otros términos de búsqueda' 
                  : `Crea tu primer ${currentType.singular}`}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <FilterX size={16} />
                Limpiar filtros
              </button>
            ) : !searchTerm && (
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
            {/* Active filters indicator */}
            {hasActiveFilters && (
              <div className="px-4 py-2 bg-cyan-50 border-b border-cyan-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-cyan-700">
                  <Filter size={14} />
                  <span>Filtros activos:</span>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(columnFilters).map(([columnId, values]) => {
                      const col = getVisibleColumns().find(c => c.id === columnId) || getAllColumns().find(c => c.id === columnId);
                      const colLabel = col?.label || columnId;
                      return (
                        <span 
                          key={columnId}
                          className="px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded-full text-xs font-medium flex items-center gap-1"
                        >
                          {colLabel}: {values.length} seleccionado{values.length > 1 ? 's' : ''}
                          <button 
                            onClick={() => clearColumnFilter(columnId)}
                            className="hover:bg-cyan-200 rounded-full p-0.5"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
                <button 
                  onClick={clearAllFilters}
                  className="text-xs text-cyan-600 hover:text-cyan-800 font-medium flex items-center gap-1"
                >
                  <FilterX size={14} />
                  Limpiar todos
                </button>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {getVisibleColumns().map(col => {
                      const filterable = isColumnFilterable(col);
                      const hasFilter = columnFilters[col.id]?.length > 0;
                      const isOpen = openFilterDropdown === col.id;
                      const filterOptions = filterable ? getFilterOptions(col) : [];
                      
                      return (
                        <th 
                          key={col.id} 
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                        >
                          <div className="flex items-center gap-1">
                            <span>{col.label}</span>
                            {filterable && filterOptions.length > 0 && (
                              <button
                                ref={el => filterButtonRefs.current[col.id] = el}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openFilterDropdownWithPosition(col.id, e.currentTarget);
                                }}
                                className={`p-1 rounded transition-colors ${
                                  hasFilter 
                                    ? 'text-cyan-600 bg-cyan-50 hover:bg-cyan-100' 
                                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                }`}
                                title="Filtrar columna"
                                data-testid={`filter-${col.id}`}
                              >
                                <ChevronDown 
                                  size={14} 
                                  className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                />
                              </button>
                            )}
                          </div>
                        </th>
                      );
                    })}
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
                            onClick={() => setShowViewModal(contact)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver"
                            data-testid={`view-contact-${contact.id}`}
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => openEditModal(contact)}
                            className="p-2 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                            title="Editar"
                            data-testid={`edit-contact-${contact.id}`}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(contact)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                            data-testid={`delete-contact-${contact.id}`}
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
                
                {/* Labels Selector */}
                {contactLabels.length > 0 && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Tag size={16} className="text-gray-400" />
                      Etiquetas
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {contactLabels.map(label => {
                        const isSelected = (formData.labels || []).includes(label.id);
                        return (
                          <button
                            key={label.id}
                            type="button"
                            onClick={() => toggleContactLabel(label.id)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                              isSelected 
                                ? 'ring-2 ring-offset-1' 
                                : 'opacity-60 hover:opacity-100'
                            }`}
                            style={{
                              backgroundColor: label.color + (isSelected ? '30' : '15'),
                              color: label.color,
                              borderColor: label.color,
                              ringColor: label.color
                            }}
                          >
                            {isSelected && <Check size={14} className="inline mr-1" />}
                            {label.name}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Selecciona una o más etiquetas para clasificar este contacto</p>
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
              <button 
                onClick={() => {
                  setShowFieldsConfig(false);
                  cancelEditField();
                }} 
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
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
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEditField(field)}
                              className="p-2 text-gray-400 hover:text-cyan-500 hover:bg-cyan-50 rounded-lg transition-colors"
                              title="Editar campo"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteField(field.id)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar campo"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Create/Edit Field Form */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">
                    {editingField ? 'Editar campo' : 'Crear nuevo campo'}
                  </h3>
                  {editingField && (
                    <button
                      onClick={cancelEditField}
                      className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                      <X size={14} />
                      Cancelar edición
                    </button>
                  )}
                </div>
                
                {/* Type Change Warning */}
                {showTypeChangeWarning && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={18} className="text-amber-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Advertencia</p>
                        <p className="text-xs text-amber-600 mt-1">
                          Cambiar el tipo de campo puede afectar los datos existentes. 
                          Los valores incompatibles se mantendrán pero podrían no mostrarse correctamente.
                        </p>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => setShowTypeChangeWarning(false)}
                            className="text-xs px-2 py-1 bg-amber-200 hover:bg-amber-300 text-amber-800 rounded transition-colors"
                          >
                            Entendido, continuar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
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
                            onClick={() => {
                              if (editingField) {
                                checkTypeChangeCompatibility(type.id);
                              }
                              setNewField({ ...newField, field_type: type.id, options: type.id === 'select' || type.id === 'multiselect' ? newField.options : [] });
                            }}
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
                  
                  {/* Create/Update Button */}
                  {editingField ? (
                    <div className="flex gap-2">
                      <button
                        onClick={cancelEditField}
                        className="flex-1 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleUpdateField}
                        disabled={!newField.name.trim()}
                        className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Save size={16} />
                        Guardar cambios
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleCreateField}
                      disabled={!newField.name.trim()}
                      className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Crear campo
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Labels Management Modal */}
      {showLabelsConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Tag className="w-5 h-5 text-white" />
                <h2 className="text-lg font-bold text-white">Administrar etiquetas</h2>
              </div>
              <button 
                onClick={() => {
                  setShowLabelsConfig(false);
                  cancelEditLabel();
                }} 
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {/* Existing Labels */}
              {contactLabels.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Etiquetas existentes ({contactLabels.length})</h3>
                  <div className="space-y-2">
                    {contactLabels.map(label => (
                      <div 
                        key={label.id} 
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: label.color + '20' }}
                          >
                            <Tag size={16} style={{ color: label.color }} />
                          </div>
                          <span 
                            className="font-medium px-2 py-0.5 rounded-full text-sm"
                            style={{
                              backgroundColor: label.color + '20',
                              color: label.color
                            }}
                          >
                            {label.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEditLabel(label)}
                            className="p-2 text-gray-400 hover:text-cyan-500 hover:bg-cyan-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteLabel(label.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Create/Edit Label Form */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">
                    {editingLabel ? 'Editar etiqueta' : 'Crear nueva etiqueta'}
                  </h3>
                  {editingLabel && (
                    <button
                      onClick={cancelEditLabel}
                      className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                      <X size={14} />
                      Cancelar
                    </button>
                  )}
                </div>
                
                {labelError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600 flex items-center gap-2">
                      <AlertCircle size={16} />
                      {labelError}
                    </p>
                  </div>
                )}
                
                <div className="space-y-4">
                  {/* Label Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Nombre de la etiqueta</label>
                    <input
                      type="text"
                      value={newLabel.name}
                      onChange={(e) => {
                        setNewLabel({ ...newLabel, name: e.target.value });
                        setLabelError('');
                      }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      placeholder="Ej: Interesado, VIP, No contactar..."
                    />
                  </div>
                  
                  {/* Color Selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Color</label>
                    <div className="flex flex-wrap gap-2">
                      {LABEL_COLORS.map(color => (
                        <button
                          key={color.id}
                          onClick={() => setNewLabel({ ...newLabel, color: color.value })}
                          className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                            newLabel.color === color.value ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                  
                  {/* Preview */}
                  {newLabel.name && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">Vista previa</label>
                      <span
                        className="inline-flex px-3 py-1 rounded-full text-sm font-medium"
                        style={{
                          backgroundColor: newLabel.color + '20',
                          color: newLabel.color,
                          border: `1px solid ${newLabel.color}40`
                        }}
                      >
                        {newLabel.name}
                      </span>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  {editingLabel ? (
                    <div className="flex gap-2">
                      <button
                        onClick={cancelEditLabel}
                        className="flex-1 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleUpdateLabel}
                        disabled={!newLabel.name.trim()}
                        className="flex-1 py-2.5 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Save size={16} />
                        Guardar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleCreateLabel}
                      disabled={!newLabel.name.trim()}
                      className="w-full py-2.5 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus size={16} />
                      Crear etiqueta
                    </button>
                  )}
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

      {/* View Contact Modal */}
      {showViewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                    {showViewModal.nombre?.charAt(0)}{showViewModal.apellidos?.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {showViewModal.nombre} {showViewModal.apellidos}
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        showViewModal.contact_type === 'client' 
                          ? 'bg-cyan-500/20 text-cyan-300' 
                          : showViewModal.contact_type === 'prospect'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-purple-500/20 text-purple-300'
                      }`}>
                        {CONTACT_TYPES[showViewModal.contact_type]?.label || 'Contacto'}
                      </span>
                      <span className="text-slate-400 text-sm flex items-center gap-1">
                        <CalendarIcon size={14} />
                        {new Date(showViewModal.created_at).toLocaleDateString('es-ES', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowViewModal(null)} 
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {/* Datos Principales */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Users size={16} />
                  Datos principales
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Nombre</label>
                    <p className="text-gray-900 font-medium">{showViewModal.nombre || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Apellidos</label>
                    <p className="text-gray-900 font-medium">{showViewModal.apellidos || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1">
                      <Phone size={12} /> WhatsApp
                    </label>
                    <p className="text-gray-900 font-medium">{showViewModal.whatsapp || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1">
                      <Mail size={12} /> Email
                    </label>
                    <p className="text-gray-900 font-medium">{showViewModal.email || '— (sin dato)'}</p>
                  </div>
                </div>
              </div>
              
              {/* Campos Personalizados */}
              {customFields.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Settings size={16} />
                    Información adicional
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    {customFields.map(field => {
                      const value = showViewModal.custom_fields?.[field.id];
                      const fieldType = field.field_type || 'text';
                      
                      // Formatear valor según tipo
                      let displayValue = '— (sin dato)';
                      if (value !== null && value !== undefined && value !== '') {
                        if (fieldType === 'multiselect' && Array.isArray(value)) {
                          displayValue = value.length > 0 ? value.join(', ') : '— (sin dato)';
                        } else if (fieldType === 'date') {
                          try {
                            displayValue = format(new Date(value), "d 'de' MMMM, yyyy", { locale: es });
                          } catch {
                            displayValue = value;
                          }
                        } else if (fieldType === 'time') {
                          try {
                            const [h, m] = value.split(':').map(Number);
                            const period = h >= 12 ? 'PM' : 'AM';
                            const hours12 = h % 12 || 12;
                            displayValue = `${String(hours12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
                          } catch {
                            displayValue = value;
                          }
                        } else if (fieldType === 'number') {
                          const num = Number(value);
                          displayValue = !isNaN(num) && Math.abs(num) >= 1000 
                            ? num.toLocaleString('es-ES') 
                            : value;
                        } else {
                          displayValue = value;
                        }
                      }
                      
                      return (
                        <div key={field.id} className="flex items-start justify-between py-2 border-b border-gray-200 last:border-0">
                          <div className="flex items-center gap-2">
                            {field.color && (
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: field.color }}
                              />
                            )}
                            <label className="text-sm text-gray-600">{field.name}</label>
                          </div>
                          <p className={`text-sm font-medium text-right max-w-[60%] ${
                            displayValue === '— (sin dato)' ? 'text-gray-400 italic' : 'text-gray-900'
                          }`}>
                            {displayValue}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Etiquetas */}
              {(() => {
                const viewLabels = showViewModal.labels || [];
                if (viewLabels.length === 0 && contactLabels.length === 0) return null;
                return (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Tag size={16} />
                      Etiquetas
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-4">
                      {viewLabels.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {viewLabels.map(labelId => {
                            const label = getLabelById(labelId);
                            if (!label) return null;
                            return (
                              <span
                                key={labelId}
                                className="px-3 py-1 rounded-full text-sm font-medium"
                                style={{
                                  backgroundColor: label.color + '20',
                                  color: label.color,
                                  border: `1px solid ${label.color}40`
                                }}
                              >
                                {label.name}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-gray-400 text-sm italic">Sin etiquetas asignadas</p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                ID: {showViewModal.id?.slice(0, 8)}...
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowViewModal(null)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(null);
                    openEditModal(showViewModal);
                  }}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Edit2 size={16} />
                  Editar
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

      {/* Filter Dropdown Portal - Rendered outside table container to avoid overflow clipping */}
      {openFilterDropdown && createPortal(
        <div 
          ref={filterDropdownRef}
          className="fixed bg-white border border-gray-200 rounded-xl shadow-2xl min-w-[220px] max-h-[320px] overflow-hidden"
          style={{
            top: filterDropdownPosition.top,
            left: filterDropdownPosition.left,
            zIndex: 99999
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            const col = getVisibleColumns().find(c => c.id === openFilterDropdown) || getAllColumns().find(c => c.id === openFilterDropdown);
            if (!col) return null;
            
            const filterOptions = getFilterOptions(col);
            const isMulti = isMultiSelectFilter(col);
            const hasFilter = columnFilters[col.id]?.length > 0;
            
            return (
              <>
                <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">
                      Filtrar por {col.label}
                    </span>
                    {hasFilter && (
                      <button
                        onClick={() => clearColumnFilter(col.id)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {isMulti ? 'Selecciona una o más opciones' : 'Selecciona una opción'}
                  </p>
                </div>
                <div className="max-h-[240px] overflow-y-auto p-2">
                  {filterOptions.length === 0 ? (
                    <p className="text-sm text-gray-400 p-3 text-center">
                      No hay opciones disponibles
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {filterOptions.map(option => {
                        const isSelected = (columnFilters[col.id] || []).includes(option.id);
                        return (
                          <button
                            key={option.id}
                            onClick={() => toggleFilterValue(col.id, option.id, isMulti)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-all ${
                              isSelected 
                                ? 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200' 
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded ${isMulti ? 'rounded' : 'rounded-full'} border-2 flex items-center justify-center transition-colors ${
                              isSelected 
                                ? 'bg-cyan-500 border-cyan-500' 
                                : 'border-gray-300 bg-white'
                            }`}>
                              {isSelected && <Check size={12} className="text-white" />}
                            </div>
                            {option.color && col.id === 'labels' ? (
                              <span 
                                className="px-2.5 py-1 rounded-full text-xs font-medium"
                                style={{
                                  backgroundColor: option.color + '20',
                                  color: option.color,
                                  border: `1px solid ${option.color}40`
                                }}
                              >
                                {option.name}
                              </span>
                            ) : (
                              <span className="truncate font-medium">{option.name}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {hasFilter && (
                  <div className="p-2 border-t border-gray-100 bg-gray-50">
                    <div className="text-xs text-gray-500 text-center">
                      {columnFilters[col.id]?.length || 0} seleccionado{(columnFilters[col.id]?.length || 0) !== 1 ? 's' : ''}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>,
        document.body
      )}

      {/* Date Filter Portal */}
      {showDateFilter && createPortal(
        <div 
          className="fixed bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
          style={{
            top: dateFilterDropdownPosition.top,
            left: dateFilterDropdownPosition.left,
            zIndex: 99999,
            width: dateFilterMode === 'week' ? '360px' : '320px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-cyan-50 to-blue-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <CalendarDays size={16} className="text-cyan-600" />
                Filtrar por fecha
              </span>
              {hasActiveDateFilter && (
                <button
                  onClick={clearDateFilter}
                  className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                >
                  Limpiar
                </button>
              )}
            </div>
            
            {/* Mode selector */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {[
                { id: 'day', label: 'Día' },
                { id: 'week', label: 'Semana' },
                { id: 'month', label: 'Mes' },
                { id: 'year', label: 'Año' }
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setDateFilterMode(mode.id)}
                  className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                    dateFilterMode === mode.id
                      ? 'bg-white text-cyan-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content based on mode */}
          <div className="p-3">
            {dateFilterMode === 'day' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="w-full px-3 py-2 text-left text-sm border border-gray-200 rounded-lg hover:border-cyan-300 transition-colors flex items-center justify-between">
                        <span className={dateFilterFrom ? 'text-gray-900' : 'text-gray-400'}>
                          {dateFilterFrom ? format(dateFilterFrom, "d 'de' MMMM, yyyy", { locale: es }) : 'Seleccionar fecha'}
                        </span>
                        <CalendarIcon size={14} className="text-gray-400" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start" style={{ zIndex: 999999 }}>
                      <Calendar
                        mode="single"
                        selected={dateFilterFrom}
                        onSelect={setDateFilterFrom}
                        locale={es}
                        className="rounded-md border"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="w-full px-3 py-2 text-left text-sm border border-gray-200 rounded-lg hover:border-cyan-300 transition-colors flex items-center justify-between">
                        <span className={dateFilterTo ? 'text-gray-900' : 'text-gray-400'}>
                          {dateFilterTo ? format(dateFilterTo, "d 'de' MMMM, yyyy", { locale: es }) : 'Seleccionar fecha'}
                        </span>
                        <CalendarIcon size={14} className="text-gray-400" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start" style={{ zIndex: 999999 }}>
                      <Calendar
                        mode="single"
                        selected={dateFilterTo}
                        onSelect={setDateFilterTo}
                        locale={es}
                        disabled={(date) => dateFilterFrom && date < dateFilterFrom}
                        className="rounded-md border"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {dateFilterFrom && (
                  <p className="text-xs text-gray-500 text-center">
                    {dateFilterTo 
                      ? `${format(dateFilterFrom, "d MMM", { locale: es })} → ${format(dateFilterTo, "d MMM yyyy", { locale: es })}`
                      : `Solo ${format(dateFilterFrom, "d 'de' MMMM, yyyy", { locale: es })}`
                    }
                  </p>
                )}
              </div>
            )}

            {dateFilterMode === 'week' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <button 
                    onClick={() => setWeekSelectorDate(subMonths(weekSelectorDate, 1))}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-sm font-medium text-gray-700">
                    {format(weekSelectorDate, "MMMM yyyy", { locale: es })}
                  </span>
                  <button 
                    onClick={() => setWeekSelectorDate(addMonths(weekSelectorDate, 1))}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
                
                {/* Week headers */}
                <div className="grid grid-cols-8 gap-1 text-center text-xs text-gray-500 mb-1">
                  <div className="font-medium">Sem</div>
                  <div>L</div>
                  <div>M</div>
                  <div>X</div>
                  <div>J</div>
                  <div>V</div>
                  <div>S</div>
                  <div>D</div>
                </div>
                
                {/* Week rows */}
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {(() => {
                    const monthStart = startOfMonth(weekSelectorDate);
                    const monthEnd = endOfMonth(weekSelectorDate);
                    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { locale: es });
                    
                    return weeks.map((weekStart, idx) => {
                      const weekEnd = endOfWeek(weekStart, { locale: es });
                      const isSelected = isWeekSelected(weekStart);
                      const weekNum = getWeek(weekStart, { locale: es });
                      
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleWeekSelection(weekStart)}
                          className={`grid grid-cols-8 gap-1 text-center text-xs py-1.5 px-1 rounded-lg cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-cyan-100 text-cyan-800 ring-1 ring-cyan-300' 
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className={`font-medium ${isSelected ? 'text-cyan-700' : 'text-gray-600'}`}>
                            {weekNum}
                          </div>
                          {[0, 1, 2, 3, 4, 5, 6].map(dayOffset => {
                            const day = new Date(weekStart);
                            day.setDate(day.getDate() + dayOffset);
                            const isCurrentMonth = getMonth(day) === getMonth(weekSelectorDate);
                            return (
                              <div 
                                key={dayOffset} 
                                className={isCurrentMonth ? '' : 'text-gray-300'}
                              >
                                {day.getDate()}
                              </div>
                            );
                          })}
                        </div>
                      );
                    });
                  })()}
                </div>
                
                {selectedWeeks.length > 0 && (
                  <p className="text-xs text-gray-500 text-center pt-2 border-t">
                    {selectedWeeks.length} semana{selectedWeeks.length > 1 ? 's' : ''} seleccionada{selectedWeeks.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}

            {dateFilterMode === 'month' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
                    <div className="space-y-2">
                      <select
                        value={dateFilterMonth}
                        onChange={(e) => setDateFilterMonth(parseInt(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                      >
                        {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                          <option key={i} value={i}>{m}</option>
                        ))}
                      </select>
                      <select
                        value={dateFilterYear}
                        onChange={(e) => setDateFilterYear(parseInt(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                      >
                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
                    <div className="space-y-2">
                      <select
                        value={dateFilterMonthTo}
                        onChange={(e) => setDateFilterMonthTo(parseInt(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                      >
                        {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                          <option key={i} value={i}>{m}</option>
                        ))}
                      </select>
                      <select
                        value={dateFilterYearTo}
                        onChange={(e) => setDateFilterYearTo(parseInt(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                      >
                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center pt-2 border-t">
                  {format(new Date(dateFilterYear, dateFilterMonth), "MMMM yyyy", { locale: es })} → {format(new Date(dateFilterYearTo, dateFilterMonthTo), "MMMM yyyy", { locale: es })}
                </p>
              </div>
            )}

            {dateFilterMode === 'year' && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 mb-2">Selecciona uno o varios años:</p>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 9 }, (_, i) => new Date().getFullYear() - 4 + i).map(year => (
                    <button
                      key={year}
                      onClick={() => toggleYearSelection(year)}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        dateFilterYears.includes(year)
                          ? 'bg-cyan-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
                {dateFilterYears.length > 0 && (
                  <p className="text-xs text-gray-500 text-center pt-2 border-t">
                    {dateFilterYears.length === 1 
                      ? `Año ${dateFilterYears[0]}`
                      : `${dateFilterYears.length} años: ${Math.min(...dateFilterYears)} - ${Math.max(...dateFilterYears)}`
                    }
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
            <button
              onClick={() => setShowDateFilter(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Cerrar
            </button>
            {getDateFilterLabel() && (
              <span className="text-xs font-medium text-cyan-600">
                {getDateFilterLabel()}
              </span>
            )}
          </div>
        </div>,
        document.body
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

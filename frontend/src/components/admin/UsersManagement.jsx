import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Crown, Search, Loader2, Edit3, Save, X, Trash2, Ban, CheckCircle, 
  AlertTriangle, MoreVertical, CreditCard, Shield, Infinity, CalendarClock,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Calendar,
  Filter, ArrowUpDown, ArrowDown, ArrowUp, UserCog, LogIn, ExternalLink,
  Download, RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = '';

// Componente de Paginación
const Pagination = ({ currentPage, totalPages, onPageChange, totalItems, perPage }) => {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const start = (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-100">
      <p className="text-sm text-gray-500">
        Mostrando <span className="font-medium text-gray-700">{start}</span> a <span className="font-medium text-gray-700">{end}</span> de <span className="font-medium text-gray-700">{totalItems}</span> usuarios
      </p>
      
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Primera página"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        {getPageNumbers().map((page, index) => (
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="px-2 text-gray-400">...</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`min-w-[36px] h-9 px-3 rounded-lg font-medium transition-colors ${
                currentPage === page
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              {page}
            </button>
          )
        ))}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Última página"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Componente principal de Gestión de Usuarios
const UsersManagement = ({ token, onUserChange }) => {
  // Estados de datos
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPage] = useState(20);
  
  // Ordenamiento
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [filterType, setFilterType] = useState(''); // day, week, month
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Selección múltiple
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Modales y acciones
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);
  const [openMenuUser, setOpenMenuUser] = useState(null);
  const [planModal, setPlanModal] = useState(null);
  const [planForm, setPlanForm] = useState({ plan: 'free', expiresAt: '', unlimitedAccess: false });
  const [savingPlan, setSavingPlan] = useState(false);
  
  // Impersonación
  const { login: authLogin } = useAuth();
  const [impersonating, setImpersonating] = useState(false);

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch usuarios con filtros y paginación
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: perPage.toString(),
        sort_by: sortBy,
        sort_order: sortOrder
      });
      
      if (searchDebounced) params.append('search', searchDebounced);
      if (filterType) params.append('filter_type', filterType);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (planFilter !== 'all') params.append('plan_filter', planFilter);
      if (statusFilter !== 'all') params.append('status_filter', statusFilter);
      
      const response = await fetch(`${API_URL}/api/admin/users?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setTotalUsers(data.total);
        setTotalPages(data.total_pages);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
    setLoading(false);
  }, [token, currentPage, perPage, sortBy, sortOrder, searchDebounced, filterType, dateFrom, dateTo, planFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Limpiar selección cuando cambian los filtros/página
  useEffect(() => {
    setSelectedUsers([]);
    setSelectAll(false);
  }, [currentPage, searchDebounced, filterType, dateFrom, dateTo, planFilter, statusFilter]);

  // Handlers
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.filter(u => u.role !== 'admin').map(u => u.username));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectUser = (username) => {
    if (selectedUsers.includes(username)) {
      setSelectedUsers(selectedUsers.filter(u => u !== username));
    } else {
      setSelectedUsers([...selectedUsers, username]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) return;
    
    setActionLoading('bulk');
    try {
      const response = await fetch(`${API_URL}/api/admin/users/bulk-delete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ usernames: selectedUsers })
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`${result.message}`);
        fetchUsers();
        setSelectedUsers([]);
        setSelectAll(false);
      } else {
        const error = await response.json();
        alert(error.detail || 'Error al eliminar usuarios');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión');
    }
    setActionLoading(null);
    setBulkDeleteModal(false);
  };

  const handleImpersonate = async (username) => {
    setImpersonating(true);
    setOpenMenuUser(null);
    
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${username}/impersonate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Guardar tokens de admin para poder retornar después
        localStorage.setItem('admin_return_token', data.return_token);
        localStorage.setItem('admin_username', data.admin_user);
        localStorage.setItem('impersonating_user', username);
        
        // Crear objeto de usuario impersonado para el AuthContext
        const impersonatedUser = {
          username: data.impersonated_user,
          email: data.impersonated_email,
          full_name: data.impersonated_full_name,
          role: 'user', // Usuario impersonado no es admin
          plan: 'user', // Se actualizará al cargar /api/auth/me
          impersonated_by: data.admin_user
        };
        
        // Guardar en localStorage con las keys que usa AuthContext
        localStorage.setItem('mm_auth_token', data.access_token);
        localStorage.setItem('mm_auth_user', JSON.stringify(impersonatedUser));
        
        // Recargar la página para que AuthContext cargue el nuevo usuario
        window.location.href = '/';
      } else {
        const error = await response.json();
        alert(error.detail || 'Error al acceder como usuario');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión');
    }
    setImpersonating(false);
  };

  const handleOpenPlanModal = (user) => {
    setPlanModal(user);
    setPlanForm({
      plan: user.plan || 'free',
      expiresAt: user.plan_expires_at ? user.plan_expires_at.split('T')[0] : '',
      unlimitedAccess: user.plan_override || false
    });
    setOpenMenuUser(null);
  };

  const handleChangePlan = async () => {
    if (!planModal) return;
    setSavingPlan(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${planModal.username}/change-plan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plan: planForm.plan,
          expires_at: planForm.expiresAt ? new Date(planForm.expiresAt).toISOString() : null,
          unlimited_access: planForm.unlimitedAccess
        })
      });
      
      if (response.ok) {
        fetchUsers();
        setPlanModal(null);
      } else {
        const error = await response.json();
        alert(error.detail || 'Error al cambiar plan');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión');
    }
    setSavingPlan(false);
  };

  const handleEdit = (user) => {
    setEditingUser(user.username);
    setEditForm({
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      plan: user.plan || 'free'
    });
    setOpenMenuUser(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${editingUser}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      
      if (response.ok) {
        fetchUsers();
        setEditingUser(null);
      }
    } catch (error) {
      console.error('Error:', error);
    }
    setSaving(false);
  };

  const handleDelete = async (username) => {
    setActionLoading(username);
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${username}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.detail || 'Error al eliminar usuario');
      }
    } catch (error) {
      console.error('Error:', error);
    }
    setActionLoading(null);
    setConfirmModal(null);
  };

  const handleBlock = async (username, isBlocked) => {
    setActionLoading(username);
    try {
      const endpoint = isBlocked ? 'unblock' : 'block';
      const response = await fetch(`${API_URL}/api/admin/users/${username}/${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.detail || `Error al ${isBlocked ? 'desbloquear' : 'bloquear'} usuario`);
      }
    } catch (error) {
      console.error('Error:', error);
    }
    setActionLoading(null);
    setOpenMenuUser(null);
  };

  const clearFilters = () => {
    setFilterType('');
    setDateFrom('');
    setDateTo('');
    setPlanFilter('all');
    setStatusFilter('all');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />;
    return sortOrder === 'asc' 
      ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
      : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Modal de confirmación individual */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Eliminar Usuario</h3>
                <p className="text-sm text-gray-500">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que deseas eliminar permanentemente al usuario <strong>@{confirmModal}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmModal(null)} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium">
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmModal)}
                disabled={actionLoading === confirmModal}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-xl font-medium flex items-center gap-2"
              >
                {actionLoading === confirmModal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de eliminación masiva */}
      {bulkDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Eliminar {selectedUsers.length} Usuarios</h3>
                <p className="text-sm text-gray-500">Esta acción eliminará permanentemente los usuarios seleccionados</p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-red-700 font-medium mb-2">Se eliminarán los siguientes usuarios:</p>
              <div className="max-h-32 overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map(u => (
                    <span key={u} className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium">@{u}</span>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-gray-600 mb-6 text-sm">
              Todos sus datos, proyectos y configuraciones serán eliminados permanentemente. Los administradores no serán eliminados.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setBulkDeleteModal(false)} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium">
                Cancelar
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={actionLoading === 'bulk'}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-xl font-medium flex items-center gap-2"
              >
                {actionLoading === 'bulk' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Eliminar {selectedUsers.length} usuarios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de cambio de plan */}
      {planModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Cambiar plan</h3>
              </div>
              <button onClick={() => setPlanModal(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Usuario:</span>
                  <span className="font-medium text-gray-900">{planModal.full_name || planModal.username}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Email:</span>
                  <span className="text-gray-700">{planModal.email}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nuevo plan</label>
                <select
                  value={planForm.plan}
                  onChange={(e) => setPlanForm({...planForm, plan: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="free">Free - Gratuito</option>
                  <option value="pro">Pro - Profesional</option>
                  <option value="team">Team - Equipos</option>
                  <option value="business">Business - Empresas</option>
                  <option value="admin">Admin - Administrador</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Válido hasta <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="date"
                  value={planForm.expiresAt}
                  onChange={(e) => setPlanForm({...planForm, expiresAt: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                <input
                  type="checkbox"
                  id="unlimitedAccess"
                  checked={planForm.unlimitedAccess}
                  onChange={(e) => setPlanForm({...planForm, unlimitedAccess: e.target.checked})}
                  className="w-5 h-5 rounded border-yellow-300 text-yellow-600 focus:ring-yellow-500"
                />
                <label htmlFor="unlimitedAccess" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Infinity className="w-4 h-4 text-yellow-600" />
                    <span className="font-medium text-gray-900">Acceso ilimitado</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">Salta todos los límites del plan</p>
                </label>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50">
              <button onClick={() => setPlanModal(null)} className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium">
                Cancelar
              </button>
              <button
                onClick={handleChangePlan}
                disabled={savingPlan}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {savingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Aplicar plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-500 mt-1">Panel profesional de administración • {totalUsers} usuarios registrados</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsers}
            className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            title="Actualizar"
          >
            <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl transition-colors ${
              showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
          
          {selectedUsers.length > 0 && (
            <button
              onClick={() => setBulkDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/25"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar ({selectedUsers.length})
            </button>
          )}
        </div>
      </div>

      {/* Filtros expandibles */}
      {showFilters && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {/* Búsqueda */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Nombre, email o usuario..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* Filtro rápido de fecha */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Período</label>
              <select
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); setDateFrom(''); setDateTo(''); }}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="day">Hoy</option>
                <option value="week">Esta semana</option>
                <option value="month">Este mes</option>
              </select>
            </div>
            
            {/* Rango de fechas */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setFilterType(''); }}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setFilterType(''); }}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Plan */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Plan</label>
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="team">Team</option>
                <option value="business">Business</option>
              </select>
            </div>
            
            {/* Estado */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Estado</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="blocked">Bloqueados</option>
              </select>
            </div>
            
            {/* Por página */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Por página</label>
              <select
                value={perPage}
                onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            
            {/* Limpiar filtros */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de usuarios */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-4 text-left">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-4 text-left">
                      <button onClick={() => handleSort('username')} className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                        Usuario <SortIcon field="username" />
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <button onClick={() => handleSort('email')} className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                        Email <SortIcon field="email" />
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rol</th>
                    <th className="px-6 py-4 text-left">
                      <button onClick={() => handleSort('plan')} className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                        Plan <SortIcon field="plan" />
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-4 text-left">
                      <button onClick={() => handleSort('created_at')} className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                        Registro <SortIcon field="created_at" />
                      </button>
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((user) => (
                    <tr 
                      key={user.username} 
                      className={`hover:bg-gray-50 transition-colors ${selectedUsers.includes(user.username) ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-4 py-4">
                        {user.role !== 'admin' && (
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.username)}
                            onChange={() => handleSelectUser(user.username)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingUser === user.username ? (
                          <input
                            type="text"
                            value={editForm.full_name || ''}
                            onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Nombre completo"
                          />
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium text-sm">
                              {(user.full_name || user.username).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{user.full_name || user.username}</p>
                              <p className="text-xs text-gray-500">@{user.username}</p>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingUser === user.username ? (
                          <input
                            type="email"
                            value={editForm.email || ''}
                            onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-sm text-gray-600">{user.email}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingUser === user.username ? (
                          <select
                            value={editForm.role}
                            onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="user">Usuario</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            user.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {user.role === 'admin' && <Shield className="w-3 h-3" />}
                            {user.role === 'admin' ? 'Admin' : 'Usuario'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            user.plan === 'admin' || user.role === 'admin'
                              ? 'bg-gradient-to-r from-red-100 to-pink-100 text-red-700'
                              : user.plan === 'business'
                              ? 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700'
                              : user.plan === 'team' 
                              ? 'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700'
                              : user.plan === 'pro'
                              ? 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {(user.plan === 'pro' || user.plan === 'team' || user.plan === 'business' || user.plan === 'admin' || user.role === 'admin') && <Crown className="w-3 h-3" />}
                            {user.plan === 'admin' || user.role === 'admin' ? 'Admin' : 
                             user.plan === 'business' ? 'Business' :
                             user.plan === 'team' ? 'Team' : 
                             user.plan === 'pro' ? 'Pro' : 'Free'}
                          </span>
                          
                          {user.plan_source === 'manual_admin' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700">
                              <Shield className="w-2.5 h-2.5" />
                              Manual
                            </span>
                          )}
                          
                          {user.plan_expires_at && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 text-orange-700">
                              <CalendarClock className="w-2.5 h-2.5" />
                              {new Date(user.plan_expires_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </span>
                          )}
                          
                          {user.plan_override && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-700">
                              <Infinity className="w-2.5 h-2.5" />
                              Ilimitado
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                          user.disabled ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {user.disabled ? <Ban className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                          {user.disabled ? 'Bloqueado' : 'Activo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        }) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {editingUser === user.username ? (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={handleSave} disabled={saving} className="p-2 text-white bg-green-500 hover:bg-green-600 rounded-lg shadow-lg shadow-green-500/30">
                              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            </button>
                            <button onClick={() => setEditingUser(null)} className="p-2 text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <button
                              onClick={() => setOpenMenuUser(openMenuUser === user.username ? null : user.username)}
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                            
                            {openMenuUser === user.username && (
                              <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-10">
                                <button
                                  onClick={() => handleEdit(user)}
                                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Edit3 className="w-4 h-4" />
                                  Editar usuario
                                </button>
                                
                                <button
                                  onClick={() => handleOpenPlanModal(user)}
                                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-purple-600 hover:bg-purple-50"
                                >
                                  <CreditCard className="w-4 h-4" />
                                  Cambiar plan
                                </button>
                                
                                {user.role !== 'admin' && (
                                  <>
                                    <button
                                      onClick={() => handleImpersonate(user.username)}
                                      disabled={impersonating}
                                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50"
                                    >
                                      {impersonating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                                      Acceder como usuario
                                    </button>
                                    
                                    <button
                                      onClick={() => handleBlock(user.username, user.disabled)}
                                      disabled={actionLoading === user.username}
                                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm ${
                                        user.disabled ? 'text-green-600 hover:bg-green-50' : 'text-orange-600 hover:bg-orange-50'
                                      }`}
                                    >
                                      {actionLoading === user.username ? <Loader2 className="w-4 h-4 animate-spin" /> : user.disabled ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                      {user.disabled ? 'Desbloquear' : 'Bloquear acceso'}
                                    </button>
                                    
                                    <div className="border-t border-gray-100 my-1" />
                                    
                                    <button
                                      onClick={() => { setConfirmModal(user.username); setOpenMenuUser(null); }}
                                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Eliminar usuario
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {users.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No se encontraron usuarios</p>
                <p className="text-sm text-gray-400 mt-1">Prueba ajustando los filtros</p>
              </div>
            )}
            
            {/* Paginación */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={totalUsers}
                perPage={perPage}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UsersManagement;

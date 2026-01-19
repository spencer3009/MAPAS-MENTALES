import React, { useState, useEffect, useCallback } from 'react';
import { 
  DollarSign, TrendingUp, TrendingDown, PiggyBank, 
  ArrowUpCircle, ArrowDownCircle, Wallet, 
  Plus, Search, Filter, Calendar,
  CheckCircle2, Clock, AlertTriangle,
  BarChart3, RefreshCw, Building2, ChevronDown, X, Pencil, Users
} from 'lucide-react';
import ContactAutocomplete from './ContactAutocomplete';
import { useCompany } from '../../contexts/CompanyContext';

const API_URL = '';

// Hook para manejar las llamadas a la API de finanzas
const useFinanzas = (token) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWithAuth = useCallback(async (endpoint, options = {}) => {
    const response = await fetch(`${API_URL}/api/finanzas${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Error en la solicitud');
    }
    
    return response.json();
  }, [token]);

  return { fetchWithAuth, loading, setLoading, error, setError };
};

// Tabs del módulo
const TABS = [
  { id: 'summary', label: 'Resumen', icon: BarChart3 },
  { id: 'incomes', label: 'Ingresos', icon: ArrowUpCircle },
  { id: 'expenses', label: 'Gastos', icon: ArrowDownCircle },
  { id: 'investments', label: 'Inversiones', icon: PiggyBank },
  { id: 'receivables', label: 'Por Cobrar', icon: Clock },
  { id: 'payables', label: 'Por Pagar', icon: AlertTriangle },
];

// Formatear moneda
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

// Formatear fecha
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Badge de estado
const StatusBadge = ({ status, type }) => {
  const configs = {
    income: {
      collected: { bg: 'bg-green-100', text: 'text-green-700', label: 'Cobrado' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Por cobrar' },
    },
    expense: {
      paid: { bg: 'bg-green-100', text: 'text-green-700', label: 'Pagado' },
      pending: { bg: 'bg-red-100', text: 'text-red-700', label: 'Por pagar' },
    },
    investment: {
      active: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Activa' },
      recovered: { bg: 'bg-green-100', text: 'text-green-700', label: 'Recuperada' },
      loss: { bg: 'bg-red-100', text: 'text-red-700', label: 'Pérdida' },
    },
  };
  
  const config = configs[type]?.[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

// Indicador de salud financiera
const HealthIndicator = ({ status }) => {
  const configs = {
    good: { bg: 'bg-green-500', label: 'Saludable', icon: CheckCircle2 },
    warning: { bg: 'bg-yellow-500', label: 'Atención', icon: AlertTriangle },
    critical: { bg: 'bg-red-500', label: 'Crítico', icon: AlertTriangle },
  };
  
  const config = configs[status] || configs.warning;
  const Icon = config.icon;
  
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg} text-white`}>
      <Icon size={16} />
      <span className="text-sm font-medium">{config.label}</span>
    </div>
  );
};

// Card de resumen
const SummaryCard = ({ title, amount, icon: Icon, trend, trendLabel, color = 'blue' }) => {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    yellow: 'from-yellow-500 to-yellow-600',
  };
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(amount)}</p>
          {trendLabel && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {trendLabel}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${colors[color]} text-white`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
};

// Componente principal
const FinanzasModule = ({ token, projects = [] }) => {
  // Usar el contexto global de empresa
  const { 
    companies, 
    activeCompany: selectedCompany, 
    loading: loadingCompanies,
    refreshCompanies,
    selectCompany,
    createCompany,
    updateCompany,
    deleteCompany
  } = useCompany();
  
  const [activeTab, setActiveTab] = useState('summary');
  const [summary, setSummary] = useState(null);
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [incomeSources, setIncomeSources] = useState([]);
  const [receivables, setReceivables] = useState({ receivables: [], total: 0, count: 0 });
  const [payables, setPayables] = useState({ payables: [], total: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  // Modales
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [showCollaborators, setShowCollaborators] = useState(false);
  
  const { fetchWithAuth } = useFinanzas(token);

  // Cargar empresas
  const loadCompanies = useCallback(async () => {
    setLoadingCompanies(true);
    try {
      const response = await fetch(`${API_URL}/api/finanzas/companies`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
        // Seleccionar la primera empresa por defecto si existe
        if (data.length > 0 && !selectedCompany) {
          setSelectedCompany(data[0]);
        }
      }
    } catch (err) {
      console.error('Error loading companies:', err);
    } finally {
      setLoadingCompanies(false);
    }
  }, [token, selectedCompany]);

  // Cargar empresas al inicio
  useEffect(() => {
    if (token) {
      loadCompanies();
    }
  }, [token, loadCompanies]);

  // Cargar datos financieros (solo si hay empresa seleccionada)
  const loadData = useCallback(async () => {
    if (!selectedCompany) return;
    
    setLoading(true);
    try {
      const companyId = selectedCompany.id;
      const [summaryData, incomesData, expensesData, investmentsData, categoriesData, sourcesData, receivablesData, payablesData] = await Promise.all([
        fetchWithAuth(`/summary?company_id=${companyId}&period=${selectedPeriod}`),
        fetchWithAuth(`/incomes?company_id=${companyId}`),
        fetchWithAuth(`/expenses?company_id=${companyId}`),
        fetchWithAuth(`/investments?company_id=${companyId}`),
        fetchWithAuth('/categories'),
        fetchWithAuth('/income-sources'),
        fetchWithAuth(`/receivables?company_id=${companyId}`),
        fetchWithAuth(`/payables?company_id=${companyId}`),
      ]);
      
      setSummary(summaryData);
      setIncomes(incomesData);
      setExpenses(expensesData);
      setInvestments(investmentsData);
      setCategories(categoriesData.categories || []);
      setIncomeSources(sourcesData.sources || []);
      setReceivables(receivablesData);
      setPayables(payablesData);
    } catch (err) {
      console.error('Error loading finanzas data:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, selectedPeriod, selectedCompany]);

  useEffect(() => {
    if (token && selectedCompany) {
      loadData();
    }
  }, [token, selectedCompany, loadData]);

  // Crear empresa
  const handleCreateCompany = async (companyData) => {
    try {
      const response = await fetch(`${API_URL}/api/finanzas/companies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(companyData),
      });
      
      if (response.ok) {
        const newCompany = await response.json();
        setCompanies(prev => [newCompany, ...prev]);
        setSelectedCompany(newCompany);
        setShowCompanyModal(false);
      } else {
        const error = await response.json();
        console.error('Error creating company:', error);
        alert(`Error al crear empresa: ${error.detail || 'Error desconocido'}`);
      }
    } catch (err) {
      console.error('Error creating company:', err);
      alert(`Error de conexión: ${err.message}`);
    }
  };

  // Actualizar empresa
  const handleUpdateCompany = async (companyData) => {
    if (!editingCompany) return;
    try {
      const response = await fetch(`${API_URL}/api/finanzas/companies/${editingCompany.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(companyData),
      });
      
      if (response.ok) {
        const updatedCompany = await response.json();
        setCompanies(prev => prev.map(c => c.id === updatedCompany.id ? updatedCompany : c));
        if (selectedCompany?.id === updatedCompany.id) {
          setSelectedCompany(updatedCompany);
        }
        setEditingCompany(null);
      } else {
        const error = await response.json();
        alert(`Error al actualizar empresa: ${error.detail || 'Error desconocido'}`);
      }
    } catch (err) {
      console.error('Error updating company:', err);
      alert(`Error de conexión: ${err.message}`);
    }
  };

  // Eliminar empresa (con cascada de datos)
  const handleDeleteCompany = async (companyId, confirmation) => {
    try {
      const response = await fetch(`${API_URL}/api/finanzas/companies/${companyId}?confirmation=${encodeURIComponent(confirmation)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        // Remover la empresa de la lista
        const remainingCompanies = companies.filter(c => c.id !== companyId);
        setCompanies(remainingCompanies);
        
        // Si era la empresa seleccionada, seleccionar otra o ninguna
        if (selectedCompany?.id === companyId) {
          setSelectedCompany(remainingCompanies.length > 0 ? remainingCompanies[0] : null);
        }
        
        setEditingCompany(null);
        alert('Empresa eliminada exitosamente');
      } else {
        const error = await response.json();
        alert(`Error al eliminar empresa: ${error.detail || 'Error desconocido'}`);
      }
    } catch (err) {
      console.error('Error deleting company:', err);
      alert(`Error de conexión: ${err.message}`);
    }
  };

  // Crear ingreso
  const handleCreateIncome = async (data) => {
    if (!selectedCompany) return;
    try {
      await fetchWithAuth('/incomes', {
        method: 'POST',
        body: JSON.stringify({ ...data, company_id: selectedCompany.id }),
      });
      loadData();
      setShowIncomeModal(false);
    } catch (err) {
      console.error('Error creating income:', err);
    }
  };

  // Crear gasto
  const handleCreateExpense = async (data) => {
    if (!selectedCompany) return;
    try {
      await fetchWithAuth('/expenses', {
        method: 'POST',
        body: JSON.stringify({ ...data, company_id: selectedCompany.id }),
      });
      loadData();
      setShowExpenseModal(false);
    } catch (err) {
      console.error('Error creating expense:', err);
    }
  };

  // Crear inversión
  const handleCreateInvestment = async (data) => {
    if (!selectedCompany) return;
    try {
      await fetchWithAuth('/investments', {
        method: 'POST',
        body: JSON.stringify({ ...data, company_id: selectedCompany.id }),
      });
      loadData();
      setShowInvestmentModal(false);
    } catch (err) {
      console.error('Error creating investment:', err);
    }
  };

  // Actualizar estado de ingreso
  const handleUpdateIncomeStatus = async (id, status) => {
    try {
      await fetchWithAuth(`/incomes/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      loadData();
    } catch (err) {
      console.error('Error updating income:', err);
    }
  };

  // Actualizar estado de gasto
  const handleUpdateExpenseStatus = async (id, status) => {
    try {
      await fetchWithAuth(`/expenses/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      loadData();
    } catch (err) {
      console.error('Error updating expense:', err);
    }
  };

  // Eliminar ingreso
  const handleDeleteIncome = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este ingreso?')) return;
    try {
      await fetchWithAuth(`/incomes/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      console.error('Error deleting income:', err);
    }
  };

  // Eliminar gasto
  const handleDeleteExpense = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este gasto?')) return;
    try {
      await fetchWithAuth(`/expenses/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      console.error('Error deleting expense:', err);
    }
  };

  // Duplicar gasto (para recurrentes)
  const handleDuplicateExpense = async (id) => {
    try {
      await fetchWithAuth(`/expenses/${id}/duplicate`, { method: 'POST' });
      loadData();
    } catch (err) {
      console.error('Error duplicating expense:', err);
    }
  };

  // Loading inicial de empresas
  if (loadingCompanies) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // Estado vacío: No hay empresas
  if (companies.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Building2 size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Crea tu primera empresa
          </h2>
          <p className="text-gray-500 mb-6">
            Para comenzar a usar el módulo de Finanzas, necesitas crear al menos una empresa. 
            Cada empresa tendrá sus propios datos financieros independientes.
          </p>
          <button
            onClick={() => setShowCompanyModal(true)}
            className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Crear Empresa
          </button>
        </div>
        
        {/* Modal crear empresa */}
        {showCompanyModal && (
          <CompanyModal
            onClose={() => setShowCompanyModal(false)}
            onSave={handleCreateCompany}
          />
        )}
      </div>
    );
  }

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white">
                <DollarSign size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Finanzas</h1>
                <p className="text-sm text-gray-500">Control financiero para tu negocio</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              {/* Selector de empresa */}
              <div className="relative">
                <select
                  value={selectedCompany?.id || ''}
                  onChange={(e) => {
                    const company = companies.find(c => c.id === e.target.value);
                    setSelectedCompany(company);
                  }}
                  className="appearance-none pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer min-w-[180px]"
                >
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
                <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              
              <button
                onClick={() => setEditingCompany(selectedCompany)}
                className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                title="Editar empresa"
              >
                <Pencil size={18} />
              </button>
              
              {/* Botón colaboradores */}
              <button
                onClick={() => setShowCollaborators(true)}
                className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                title="Colaboradores y configuración"
              >
                <Users size={18} />
              </button>
              
              <button
                onClick={() => setShowCompanyModal(true)}
                className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                title="Nueva empresa"
              >
                <Plus size={20} />
              </button>
              
              {/* Selector de periodo */}
              <input
                type="month"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              
              {/* Health indicator */}
              {summary && <HealthIndicator status={summary.health_status} />}
              
              {/* Refresh */}
              <button
                onClick={loadData}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1 mt-4 overflow-x-auto pb-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                    ${activeTab === tab.id 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Resumen Tab */}
        {activeTab === 'summary' && summary && (
          <div className="space-y-6">
            {/* Cards principales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard 
                title="Ingresos del mes" 
                amount={summary.total_income_collected}
                icon={ArrowUpCircle}
                color="green"
              />
              <SummaryCard 
                title="Gastos del mes" 
                amount={summary.total_expenses_paid}
                icon={ArrowDownCircle}
                color="red"
              />
              <SummaryCard 
                title="Inversiones" 
                amount={summary.total_investments}
                icon={PiggyBank}
                color="purple"
              />
              <SummaryCard 
                title="Resultado neto" 
                amount={summary.net_result}
                icon={Wallet}
                color={summary.net_result >= 0 ? 'green' : 'red'}
              />
            </div>

            {/* Cards secundarias */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Por Cobrar</span>
                  <Clock size={18} className="text-yellow-500" />
                </div>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.total_income_pending)}</p>
                <p className="text-xs text-gray-400">{receivables.count} pendiente(s)</p>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Por Pagar</span>
                  <AlertTriangle size={18} className="text-red-500" />
                </div>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.total_expenses_pending)}</p>
                <p className="text-xs text-gray-400">{payables.count} pendiente(s)</p>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Caja Estimada</span>
                  <Wallet size={18} className="text-blue-500" />
                </div>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.estimated_cash)}</p>
                <p className="text-xs text-gray-400">Después de pagos</p>
              </div>
            </div>
          </div>
        )}

        {/* Ingresos Tab */}
        {activeTab === 'incomes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Ingresos</h2>
              <button
                onClick={() => setShowIncomeModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Plus size={18} />
                Nuevo Ingreso
              </button>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fuente</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {incomes.map((income) => (
                    <tr key={income.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(income.date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{income.description || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{income.source}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">{formatCurrency(income.amount)}</td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={income.status} type="income" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {income.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateIncomeStatus(income.id, 'collected')}
                              className="text-xs text-green-600 hover:text-green-700 font-medium"
                            >
                              Marcar cobrado
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteIncome(income.id)}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {incomes.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                        No hay ingresos registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Gastos Tab */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Gastos</h2>
              <button
                onClick={() => setShowExpenseModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Plus size={18} />
                Nuevo Gasto
              </button>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(expense.date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {expense.description || '-'}
                        {expense.is_recurring && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                            <RefreshCw size={10} className="mr-1" /> Recurrente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {categories.find(c => c.id === expense.category)?.name || expense.category}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">{formatCurrency(expense.amount)}</td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={expense.status} type="expense" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {expense.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateExpenseStatus(expense.id, 'paid')}
                              className="text-xs text-green-600 hover:text-green-700 font-medium"
                            >
                              Marcar pagado
                            </button>
                          )}
                          {expense.is_recurring && (
                            <button
                              onClick={() => handleDuplicateExpense(expense.id)}
                              className="text-xs text-blue-600 hover:text-blue-700"
                            >
                              Duplicar
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                        No hay gastos registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Inversiones Tab */}
        {activeTab === 'investments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Inversiones</h2>
              <button
                onClick={() => setShowInvestmentModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Plus size={18} />
                Nueva Inversión
              </button>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Objetivo</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {investments.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(inv.date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{inv.description}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{inv.objective || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">{formatCurrency(inv.amount)}</td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={inv.status} type="investment" />
                      </td>
                    </tr>
                  ))}
                  {investments.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                        No hay inversiones registradas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Por Cobrar Tab */}
        {activeTab === 'receivables' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Por Cobrar</h2>
                <p className="text-sm text-gray-500">Total: {formatCurrency(receivables.total)}</p>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {receivables.receivables.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(item.date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.description || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.client_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(item.due_date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">{formatCurrency(item.amount)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleUpdateIncomeStatus(item.id, 'collected')}
                          className="text-xs text-green-600 hover:text-green-700 font-medium"
                        >
                          Marcar cobrado
                        </button>
                      </td>
                    </tr>
                  ))}
                  {receivables.receivables.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                        No hay ingresos pendientes de cobro
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Por Pagar Tab */}
        {activeTab === 'payables' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Por Pagar</h2>
                <p className="text-sm text-gray-500">Total: {formatCurrency(payables.total)}</p>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioridad</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payables.payables.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                          ${item.priority === 'high' ? 'bg-red-100 text-red-700' : 
                            item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 
                            'bg-gray-100 text-gray-700'}
                        `}>
                          {item.priority === 'high' ? 'Alta' : item.priority === 'medium' ? 'Media' : 'Baja'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(item.date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.description || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {categories.find(c => c.id === item.category)?.name || item.category}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(item.due_date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">{formatCurrency(item.amount)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleUpdateExpenseStatus(item.id, 'paid')}
                          className="text-xs text-green-600 hover:text-green-700 font-medium"
                        >
                          Marcar pagado
                        </button>
                      </td>
                    </tr>
                  ))}
                  {payables.payables.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                        No hay gastos pendientes de pago
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal Nuevo Ingreso */}
      {showIncomeModal && (
        <IncomeModal
          onClose={() => setShowIncomeModal(false)}
          onSave={handleCreateIncome}
          sources={incomeSources}
          projects={projects}
          token={token}
        />
      )}

      {/* Modal Nuevo Gasto */}
      {showExpenseModal && (
        <ExpenseModal
          onClose={() => setShowExpenseModal(false)}
          onSave={handleCreateExpense}
          categories={categories}
          projects={projects}
          token={token}
        />
      )}

      {/* Modal Nueva Inversión */}
      {showInvestmentModal && (
        <InvestmentModal
          onClose={() => setShowInvestmentModal(false)}
          onSave={handleCreateInvestment}
          projects={projects}
        />
      )}

      {/* Modal Nueva Empresa */}
      {showCompanyModal && (
        <CompanyModal
          onClose={() => setShowCompanyModal(false)}
          onSave={handleCreateCompany}
        />
      )}

      {/* Modal Editar Empresa */}
      {editingCompany && (
        <CompanyModal
          onClose={() => setEditingCompany(null)}
          onSave={handleUpdateCompany}
          onDelete={handleDeleteCompany}
          company={editingCompany}
        />
      )}

      {/* Modal de Colaboradores */}
      {showCollaborators && selectedCompany && (
        <CollaboratorsManager
          company={selectedCompany}
          token={token}
          onClose={() => setShowCollaborators(false)}
          userRole={selectedCompany?.user_role || 'owner'}
        />
      )}
    </div>
  );
};

// Modal de Ingreso
const IncomeModal = ({ onClose, onSave, sources, projects, token }) => {
  const [form, setForm] = useState({
    amount: '',
    source: 'ventas',
    description: '',
    date: new Date().toISOString().split('T')[0],
    status: 'pending',
    client_name: '',
    client_id: null,
    due_date: '',
    project_id: '',
  });
  
  // Estado para el contacto seleccionado
  const [selectedContact, setSelectedContact] = useState(null);

  const handleContactChange = (contact) => {
    setSelectedContact(contact);
    setForm(prev => ({
      ...prev,
      client_id: contact?.id || null,
      client_name: contact?.name || '',
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      amount: parseFloat(form.amount),
      project_id: form.project_id || null,
      project_name: projects.find(p => p.id === form.project_id)?.name || null,
      due_date: form.due_date || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
          <h2 className="text-lg font-semibold">Nuevo Ingreso</h2>
          <p className="text-sm text-emerald-100">Registra un nuevo ingreso</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="0.00"
              required
              min="0.01"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fuente *</label>
            <select
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              {sources.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Ej: Pago de cliente ABC"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="pending">Por cobrar</option>
                <option value="collected">Cobrado</option>
              </select>
            </div>
          </div>

          <div>
            <ContactAutocomplete
              token={token}
              value={selectedContact}
              onChange={handleContactChange}
              label="Cliente"
              placeholder="Buscar cliente..."
              focusColor="emerald"
            />
          </div>

          {form.status === 'pending' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de vencimiento</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          )}

          {projects.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proyecto asociado</label>
              <select
                value={form.project_id}
                onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Sin proyecto</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

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
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal de Gasto
const ExpenseModal = ({ onClose, onSave, categories, projects, token }) => {
  const [form, setForm] = useState({
    amount: '',
    category: 'otros',
    description: '',
    date: new Date().toISOString().split('T')[0],
    status: 'pending',
    vendor_name: '',
    vendor_id: null,
    is_recurring: false,
    recurrence_period: '',
    priority: 'medium',
    due_date: '',
    project_id: '',
  });

  // Estado para el contacto/proveedor seleccionado
  const [selectedVendor, setSelectedVendor] = useState(null);

  const handleVendorChange = (contact) => {
    setSelectedVendor(contact);
    setForm(prev => ({
      ...prev,
      vendor_id: contact?.id || null,
      vendor_name: contact?.name || '',
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      amount: parseFloat(form.amount),
      project_id: form.project_id || null,
      project_name: projects.find(p => p.id === form.project_id)?.name || null,
      due_date: form.due_date || null,
      recurrence_period: form.is_recurring ? form.recurrence_period : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white sticky top-0">
          <h2 className="text-lg font-semibold">Nuevo Gasto</h2>
          <p className="text-sm text-red-100">Registra un nuevo gasto</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="0.00"
              required
              min="0.01"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Ej: Pago de servicios"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="pending">Por pagar</option>
                <option value="paid">Pagado</option>
              </select>
            </div>
          </div>

          <div>
            <ContactAutocomplete
              token={token}
              value={selectedVendor}
              onChange={handleVendorChange}
              label="Proveedor"
              placeholder="Buscar proveedor..."
              focusColor="red"
            />
          </div>

          {form.status === 'pending' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de vencimiento</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_recurring"
              checked={form.is_recurring}
              onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })}
              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <label htmlFor="is_recurring" className="text-sm text-gray-700">
              Gasto recurrente
            </label>
          </div>

          {form.is_recurring && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Periodo</label>
              <select
                value={form.recurrence_period}
                onChange={(e) => setForm({ ...form, recurrence_period: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Seleccionar...</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
                <option value="yearly">Anual</option>
              </select>
            </div>
          )}

          {projects.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proyecto asociado</label>
              <select
                value={form.project_id}
                onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Sin proyecto</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

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
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal de Inversión
const InvestmentModal = ({ onClose, onSave, projects }) => {
  const [form, setForm] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    status: 'active',
    objective: '',
    expected_return: '',
    project_id: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      amount: parseFloat(form.amount),
      expected_return: form.expected_return ? parseFloat(form.expected_return) : null,
      project_id: form.project_id || null,
      project_name: projects.find(p => p.id === form.project_id)?.name || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
          <h2 className="text-lg font-semibold">Nueva Inversión</h2>
          <p className="text-sm text-purple-100">Registra una inversión</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="0.00"
              required
              min="0.01"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Ej: Equipos de computación"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Objetivo</label>
            <input
              type="text"
              value={form.objective}
              onChange={(e) => setForm({ ...form, objective: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="¿Qué esperas lograr con esta inversión?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="active">Activa</option>
                <option value="recovered">Recuperada</option>
                <option value="loss">Pérdida</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Retorno esperado</label>
            <input
              type="number"
              value={form.expected_return}
              onChange={(e) => setForm({ ...form, expected_return: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          {projects.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proyecto asociado</label>
              <select
                value={form.project_id}
                onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Sin proyecto</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

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
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FinanzasModule;

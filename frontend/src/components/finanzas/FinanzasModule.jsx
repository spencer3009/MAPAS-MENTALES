import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  DollarSign, TrendingUp, TrendingDown, PiggyBank, 
  ArrowUpCircle, ArrowDownCircle, Wallet, 
  Plus, Search, Filter, Calendar,
  CheckCircle2, Clock, AlertTriangle,
  BarChart3, RefreshCw, Building2, ChevronDown, X,
  Mic, MicOff, Package, Edit2, Trash2, Repeat, Bell
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
  { id: 'products', label: 'Productos', icon: Package },
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
// ========== FUNCIONES DE UTILIDAD PARA FECHAS (SIN PROBLEMAS DE TIMEZONE) ==========

// Obtener fecha local en formato YYYY-MM-DD (sin usar toISOString que convierte a UTC)
const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Formatear fecha para mostrar (parsea YYYY-MM-DD como fecha local, no UTC)
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  
  // Si la fecha viene en formato YYYY-MM-DD, parsearla manualmente para evitar UTC
  if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day); // Mes es 0-indexed
    return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  
  // Para otros formatos, usar el parser normal pero ajustar timezone
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';
  
  // Si tiene hora UTC (contiene T o Z), es posible que necesite ajuste
  if (typeof dateStr === 'string' && (dateStr.includes('T') || dateStr.includes('Z'))) {
    // Extraer solo la parte de fecha
    const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    return localDate.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ========== SPEECH-TO-TEXT: RECONOCIMIENTO DE VOZ ==========

// Verificar soporte del navegador para Web Speech API
const isSpeechRecognitionSupported = () => {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
};

// Convertir números hablados en español a valor numérico
const spanishTextToNumber = (text) => {
  if (!text) return null;
  
  // Limpiar el texto
  let cleanText = text.toLowerCase().trim();
  
  // Eliminar palabras comunes que no son números
  cleanText = cleanText
    .replace(/\bsoles?\b/gi, '')
    .replace(/\bdólares?\b/gi, '')
    .replace(/\bpesos?\b/gi, '')
    .replace(/\bcon\b/gi, 'punto')
    .replace(/\by\b/gi, '')
    .trim();
  
  // Si ya es un número, devolverlo directamente
  const directNumber = parseFloat(cleanText.replace(',', '.'));
  if (!isNaN(directNumber)) {
    return directNumber;
  }
  
  // Diccionario de números en español
  const units = {
    'cero': 0, 'uno': 1, 'una': 1, 'un': 1, 'dos': 2, 'tres': 3, 'cuatro': 4,
    'cinco': 5, 'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10,
    'once': 11, 'doce': 12, 'trece': 13, 'catorce': 14, 'quince': 15,
    'dieciséis': 16, 'dieciseis': 16, 'diecisiete': 17, 'dieciocho': 18, 'diecinueve': 19,
    'veinte': 20, 'veintiuno': 21, 'veintiuna': 21, 'veintidós': 22, 'veintidos': 22,
    'veintitrés': 23, 'veintitres': 23, 'veinticuatro': 24, 'veinticinco': 25,
    'veintiséis': 26, 'veintiseis': 26, 'veintisiete': 27, 'veintiocho': 28, 'veintinueve': 29,
    'treinta': 30, 'cuarenta': 40, 'cincuenta': 50, 'sesenta': 60,
    'setenta': 70, 'ochenta': 80, 'noventa': 90
  };
  
  const hundreds = {
    'cien': 100, 'ciento': 100, 'doscientos': 200, 'doscientas': 200,
    'trescientos': 300, 'trescientas': 300, 'cuatrocientos': 400, 'cuatrocientas': 400,
    'quinientos': 500, 'quinientas': 500, 'seiscientos': 600, 'seiscientas': 600,
    'setecientos': 700, 'setecientas': 700, 'ochocientos': 800, 'ochocientas': 800,
    'novecientos': 900, 'novecientas': 900
  };
  
  const multipliers = {
    'mil': 1000, 'millón': 1000000, 'millon': 1000000, 'millones': 1000000
  };
  
  // Procesar "punto" para decimales
  let integerPart = cleanText;
  let decimalPart = '';
  
  if (cleanText.includes('punto')) {
    const parts = cleanText.split('punto');
    integerPart = parts[0].trim();
    decimalPart = parts[1]?.trim() || '';
  }
  
  // Función para convertir una parte a número
  const parseSpanishNumber = (str) => {
    if (!str) return 0;
    
    const words = str.split(/\s+/);
    let result = 0;
    let current = 0;
    
    for (const word of words) {
      if (units[word] !== undefined) {
        current += units[word];
      } else if (hundreds[word] !== undefined) {
        if (current === 0) current = 1;
        current *= hundreds[word] / 100;
        current = current * 100 + (hundreds[word] % 100 === 0 ? 0 : hundreds[word]);
        if (word === 'cien' || word === 'ciento') {
          current = hundreds[word];
        } else {
          current = hundreds[word];
        }
      } else if (multipliers[word] !== undefined) {
        if (current === 0) current = 1;
        current *= multipliers[word];
        result += current;
        current = 0;
      }
    }
    
    return result + current;
  };
  
  // Intentar parsear de forma más simple
  let total = 0;
  const words = integerPart.split(/\s+/);
  
  for (const word of words) {
    if (units[word] !== undefined) {
      total += units[word];
    } else if (hundreds[word] !== undefined) {
      total += hundreds[word];
    } else if (multipliers[word] !== undefined) {
      total = (total || 1) * multipliers[word];
    }
  }
  
  // Procesar decimales
  if (decimalPart) {
    let decimal = 0;
    const decWords = decimalPart.split(/\s+/);
    for (const word of decWords) {
      if (units[word] !== undefined) {
        decimal = decimal * 10 + units[word];
      } else {
        const num = parseInt(word);
        if (!isNaN(num)) {
          decimal = decimal * 10 + num;
        }
      }
    }
    if (decimal > 0) {
      const decimalPlaces = Math.pow(10, decimalPart.replace(/\s+/g, '').length);
      total += decimal / (decimal < 10 ? 10 : decimal < 100 ? 100 : 1000);
    }
  }
  
  return total > 0 ? total : null;
};

// Hook personalizado para reconocimiento de voz
const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);
  
  useEffect(() => {
    if (!isSpeechRecognitionSupported()) return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'es-PE'; // Español de Perú
    
    recognitionRef.current.onresult = (event) => {
      const result = event.results[0][0].transcript;
      setTranscript(result);
    };
    
    recognitionRef.current.onend = () => {
      setIsListening(false);
    };
    
    recognitionRef.current.onerror = () => {
      setIsListening(false);
    };
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);
  
  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    setTranscript('');
    setIsListening(true);
    try {
      recognitionRef.current.start();
    } catch (e) {
      setIsListening(false);
    }
  }, [isListening]);
  
  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsListening(false);
  }, []);
  
  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported: isSpeechRecognitionSupported()
  };
};

// Componente de botón de micrófono
const VoiceMicButton = ({ onResult, isNumeric = false, className = '' }) => {
  const { isListening, transcript, startListening, stopListening, isSupported } = useSpeechRecognition();
  
  useEffect(() => {
    if (transcript) {
      if (isNumeric) {
        // Convertir texto hablado a número
        const number = spanishTextToNumber(transcript);
        if (number !== null && number > 0) {
          onResult(number.toString());
        }
      } else {
        // Texto libre - capitalizar primera letra
        const cleanText = transcript.charAt(0).toUpperCase() + transcript.slice(1);
        onResult(cleanText);
      }
    }
  }, [transcript, onResult, isNumeric]);
  
  // No mostrar si el navegador no soporta reconocimiento de voz
  if (!isSupported) return null;
  
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };
  
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all ${
        isListening 
          ? 'bg-red-100 text-red-600 animate-pulse' 
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
      } ${className}`}
      title={isListening ? 'Escuchando... (clic para detener)' : 'Dictar por voz'}
    >
      {isListening ? <MicOff size={16} /> : <Mic size={16} />}
    </button>
  );
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
    refreshCompanies
  } = useCompany();
  
  const [activeTab, setActiveTab] = useState('summary');
  const [summary, setSummary] = useState(null);
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [incomeSources, setIncomeSources] = useState([]);
  const [receivables, setReceivables] = useState({ receivables: [], total: 0, total_facturado: 0, total_abonado: 0, count: 0 });
  const [payables, setPayables] = useState({ payables: [], total: 0, count: 0 });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // ========== NUEVO: Sistema de filtro por período (Día/Mes/Año) ==========
  const [filterMode, setFilterMode] = useState('day'); // 'day' | 'month' | 'year'
  const [selectedDate, setSelectedDate] = useState(() => {
    return getLocalDateString(); // YYYY-MM-DD (hoy por defecto, sin UTC)
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    return new Date().getFullYear().toString();
  });
  
  // Período para la API (compatibilidad con el backend)
  const selectedPeriod = selectedMonth;
  
  // Modales de finanzas (no de empresa - eso está en GlobalCompanySelector)
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  
  const { fetchWithAuth } = useFinanzas(token);

  // Cargar datos financieros (solo si hay empresa seleccionada)
  const loadData = useCallback(async () => {
    if (!selectedCompany) return;
    
    setLoading(true);
    try {
      const companyId = selectedCompany.id;
      const [summaryData, incomesData, expensesData, investmentsData, categoriesData, sourcesData, receivablesData, payablesData, productsData] = await Promise.all([
        fetchWithAuth(`/summary?company_id=${companyId}&period=${selectedPeriod}`),
        fetchWithAuth(`/incomes?company_id=${companyId}`),
        fetchWithAuth(`/expenses?company_id=${companyId}`),
        fetchWithAuth(`/investments?company_id=${companyId}`),
        fetchWithAuth('/categories'),
        fetchWithAuth('/income-sources'),
        fetchWithAuth(`/receivables?company_id=${companyId}`),
        fetchWithAuth(`/payables?company_id=${companyId}`),
        fetchWithAuth(`/products?company_id=${companyId}&status=activo`),
      ]);
      
      setSummary(summaryData);
      setIncomes(incomesData);
      setExpenses(expensesData);
      setInvestments(investmentsData);
      setCategories(categoriesData.categories || []);
      setIncomeSources(sourcesData.sources || []);
      setReceivables(receivablesData);
      setPayables(payablesData);
      setProducts(productsData || []);
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

  // ========== FUNCIONES DE FILTRADO POR PERÍODO ==========
  
  // Función para extraer fecha en formato YYYY-MM-DD de cualquier formato
  const extractDateString = (dateStr) => {
    if (!dateStr) return null;
    
    // Si ya está en formato YYYY-MM-DD, usarlo directamente
    if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }
    
    // Si tiene formato ISO con hora (2026-01-20T00:00:00.000Z), extraer solo la fecha
    if (typeof dateStr === 'string' && dateStr.includes('T')) {
      return dateStr.split('T')[0];
    }
    
    // Para otros formatos, parsear y extraer fecha local
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Función para verificar si una fecha está dentro del período seleccionado
  const isDateInPeriod = useCallback((dateStr) => {
    const dateYMD = extractDateString(dateStr);
    if (!dateYMD) return false;
    
    if (filterMode === 'day') {
      // Comparar día específico (string vs string, sin timezone)
      return dateYMD === selectedDate;
    } else if (filterMode === 'month') {
      // Comparar mes y año (primeros 7 caracteres: YYYY-MM)
      return dateYMD.substring(0, 7) === selectedMonth;
    } else if (filterMode === 'year') {
      // Comparar solo año (primeros 4 caracteres)
      return dateYMD.substring(0, 4) === selectedYear;
    }
    return true;
  }, [filterMode, selectedDate, selectedMonth, selectedYear]);

  // Filtrar ingresos por período
  const filteredIncomes = incomes.filter(inc => isDateInPeriod(inc.date));
  
  // ========== CÁLCULO DE INGRESOS REALES (CAJA REAL) ==========
  // Regla contable: Solo cuenta el dinero efectivamente recibido
  // - Cobrado: suma el monto total (amount)
  // - Por cobrar/Parcial: suma solo el pago recibido (paid_amount)
  const calculateRealIncome = (income) => {
    if (income.status === 'collected') {
      return income.amount || 0;
    } else if (income.status === 'pending' || income.status === 'partial') {
      return income.paid_amount || 0;
    }
    return 0;
  };
  
  // Total de dinero REAL en caja (suma de pagos recibidos)
  const totalRealIncome = filteredIncomes.reduce((sum, inc) => sum + calculateRealIncome(inc), 0);
  
  // Contador de ingresos con dinero recibido
  const incomesWithPayment = filteredIncomes.filter(inc => calculateRealIncome(inc) > 0).length;
  
  // ========== CÁLCULO DE IGV - DETERMINACIÓN FISCAL ==========
  // IGV a pagar = IGV de Ventas - IGV de Gastos (crédito fiscal)
  const IGV_RATE = 0.18;
  
  // IGV de Ventas (débito fiscal) - basado en ingresos reales
  const filteredSubtotal = totalRealIncome / (1 + IGV_RATE);
  const igvVentas = totalRealIncome - filteredSubtotal;
  
  // IGV de Gastos (crédito fiscal) - solo gastos con IGV del período
  const filteredExpenses = expenses.filter(exp => isDateInPeriod(exp.date));
  const igvGastos = filteredExpenses.reduce((sum, exp) => {
    // Solo contar IGV de gastos que tienen includes_igv = true
    if (exp.includes_igv) {
      return sum + (exp.igv_gasto || (exp.amount - (exp.amount / (1 + IGV_RATE))));
    }
    return sum;
  }, 0);
  
  // Determinación del IGV
  const igvDeterminado = igvVentas - igvGastos;
  const igvAPagar = igvDeterminado > 0;
  const igvAFavor = igvDeterminado < 0;
  const igvAbsoluto = Math.abs(igvDeterminado);
  
  // Para compatibilidad con código existente
  const filteredIgv = igvDeterminado;
  
  // Legacy: mantener para compatibilidad con otros cálculos
  const filteredCollectedIncomes = filteredIncomes.filter(inc => inc.status === 'collected');
  const totalFilteredCollected = totalRealIncome; // Usar el nuevo cálculo
  
  // ========== CÁLCULO DE ESTADO FINANCIERO (FUNCIONAL) ==========
  // Lógica mejorada con determinación de IGV:
  // 🟢 Saludable: IGV a favor O (Ingresos cobrados > IGV a pagar + Por pagar)
  // 🟡 Atención: IGV a pagar > 0 O hay montos por pagar
  // 🔴 Crítico: Gastos pendientes > Ingresos cobrados
  
  const calculateHealthStatus = useCallback(() => {
    const totalPayables = payables?.total || 0;
    const ingresosCobrados = totalFilteredCollected;
    
    // Si no hay ingresos ni gastos, estado neutral (saludable)
    if (ingresosCobrados === 0 && totalPayables === 0) {
      return 'good';
    }
    
    // Crítico: Por pagar > Ingresos cobrados
    if (totalPayables > ingresosCobrados) {
      return 'critical';
    }
    
    // Si hay IGV a favor, es saludable
    if (igvAFavor) {
      return 'good';
    }
    
    // Saludable: Ingresos cobrados > IGV a pagar + Por pagar
    if (ingresosCobrados > (igvAbsoluto + totalPayables)) {
      return 'good';
    }
    
    // Atención: IGV a pagar > 0 o hay montos por pagar
    if (igvAPagar || totalPayables > 0) {
      return 'warning';
    }
    
    return 'good';
  }, [totalFilteredCollected, igvAPagar, igvAFavor, igvAbsoluto, payables]);
  
  const healthStatus = calculateHealthStatus();
  
  // Obtener etiqueta del período actual
  const getPeriodLabel = () => {
    if (filterMode === 'day') {
      const date = new Date(selectedDate);
      return date.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } else if (filterMode === 'month') {
      const [year, month] = selectedMonth.split('-');
      const date = new Date(year, month - 1);
      return date.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
    } else {
      return `Año ${selectedYear}`;
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

  // ========== HANDLERS PARA PRODUCTOS/SERVICIOS ==========
  
  const handleSaveProduct = async (productData) => {
    try {
      if (editingProduct) {
        // Actualizar producto existente
        await fetchWithAuth(`/products/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(productData)
        });
      } else {
        // Crear nuevo producto
        await fetchWithAuth(`/products?company_id=${selectedCompany.id}`, {
          method: 'POST',
          body: JSON.stringify(productData)
        });
      }
      setShowProductModal(false);
      setEditingProduct(null);
      loadData();
    } catch (err) {
      console.error('Error saving product:', err);
      alert('Error al guardar el producto');
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowProductModal(true);
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este producto/servicio?')) return;
    try {
      await fetchWithAuth(`/products/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      console.error('Error deleting product:', err);
    }
  };

  const handleToggleProductStatus = async (product) => {
    try {
      const newStatus = product.status === 'activo' ? 'inactivo' : 'activo';
      await fetchWithAuth(`/products/${product.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      loadData();
    } catch (err) {
      console.error('Error toggling product status:', err);
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
            Usa el <strong>selector de empresa</strong> en el menú lateral para crear tu primera empresa.
          </p>
          <div className="flex items-center justify-center gap-2 text-emerald-600">
            <Building2 size={20} />
            <span className="text-sm">Expande el menú lateral para ver el selector de empresa</span>
          </div>
        </div>
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
                <p className="text-sm text-gray-500">
                  {selectedCompany?.name || 'Selecciona una empresa'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              {/* ========== SELECTOR DE PERÍODO CON 3 MODOS ========== */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                {/* Botones de modo */}
                <button
                  onClick={() => setFilterMode('day')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    filterMode === 'day' 
                      ? 'bg-white text-emerald-700 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Día
                </button>
                <button
                  onClick={() => setFilterMode('month')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    filterMode === 'month' 
                      ? 'bg-white text-emerald-700 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Mes
                </button>
                <button
                  onClick={() => setFilterMode('year')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    filterMode === 'year' 
                      ? 'bg-white text-emerald-700 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Año
                </button>
              </div>
              
              {/* Input según el modo */}
              {filterMode === 'day' && (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              )}
              {filterMode === 'month' && (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              )}
              {filterMode === 'year' && (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return <option key={year} value={year}>{year}</option>;
                  })}
                </select>
              )}
              
              {/* Health indicator - AHORA FUNCIONAL */}
              <HealthIndicator status={healthStatus} />
              
              {/* Refresh */}
              <button
                onClick={loadData}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Recargar datos"
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

            {/* ========== SECCIÓN DE DETERMINACIÓN DE IGV ========== */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Wallet size={20} className="text-blue-500" />
                Determinación del IGV
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* IGV Ventas (Débito Fiscal) */}
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <p className="text-xs text-amber-700 font-medium uppercase mb-1">IGV Ventas</p>
                  <p className="text-2xl font-bold text-amber-700">
                    S/ {igvVentas.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-amber-600 mt-1">Débito fiscal</p>
                </div>

                {/* IGV Gastos (Crédito Fiscal) */}
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-xs text-green-700 font-medium uppercase mb-1">IGV Gastos</p>
                  <p className="text-2xl font-bold text-green-700">
                    S/ {igvGastos.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-green-600 mt-1">Crédito fiscal</p>
                </div>

                {/* Subtotal de Gastos con IGV */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-xs text-gray-500 font-medium uppercase mb-1">Base Gastos c/IGV</p>
                  <p className="text-2xl font-bold text-gray-700">
                    S/ {filteredExpenses.reduce((sum, exp) => sum + (exp.includes_igv ? (exp.base_imponible || exp.amount / 1.18) : 0), 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Subtotal sin impuesto</p>
                </div>

                {/* Resultado: IGV a Pagar o a Favor */}
                <div className={`rounded-lg p-4 border ${
                  igvAFavor 
                    ? 'bg-green-50 border-green-300' 
                    : igvAPagar 
                      ? 'bg-red-50 border-red-200' 
                      : 'bg-gray-50 border-gray-200'
                }`}>
                  <p className={`text-xs font-medium uppercase mb-1 ${
                    igvAFavor ? 'text-green-700' : igvAPagar ? 'text-red-700' : 'text-gray-500'
                  }`}>
                    {igvAFavor ? 'IGV a Favor' : igvAPagar ? 'IGV a Pagar' : 'IGV Neto'}
                  </p>
                  <p className={`text-2xl font-bold ${
                    igvAFavor ? 'text-green-700' : igvAPagar ? 'text-red-700' : 'text-gray-700'
                  }`}>
                    S/ {igvAbsoluto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className={`text-xs mt-1 ${
                    igvAFavor ? 'text-green-600' : igvAPagar ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {igvAFavor ? 'Crédito disponible' : igvAPagar ? 'Por pagar a SUNAT' : 'Sin movimientos'}
                  </p>
                </div>
              </div>

              {/* Fórmula explicativa */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 text-center">
                  <span className="font-medium">Fórmula:</span> IGV Ventas (S/ {igvVentas.toFixed(2)}) − IGV Gastos (S/ {igvGastos.toFixed(2)}) = {igvAFavor ? 'IGV a Favor' : 'IGV a Pagar'} (S/ {igvAbsoluto.toFixed(2)})
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Ingresos Tab */}
        {activeTab === 'incomes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Ingresos</h2>
                <p className="text-sm text-gray-500 capitalize">{getPeriodLabel()}</p>
              </div>
              <button
                onClick={() => setShowIncomeModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Plus size={18} />
                Nuevo Ingreso
              </button>
            </div>
            
            {/* ========== DASHBOARD DE RESUMEN FINANCIERO (FILTRADO POR PERÍODO) ========== */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {/* Card 1: Total del período (Verde) - DINERO REAL EN CAJA */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">
                      {filterMode === 'day' ? 'Total del día' : filterMode === 'month' ? 'Total del mes' : 'Total del año'}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      S/ {totalRealIncome.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {incomesWithPayment} ingreso(s) con pago recibido
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                    <DollarSign size={24} />
                  </div>
                </div>
              </div>
              
              {/* Card 2: Subtotal sin IGV (Azul) */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Subtotal</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      S/ {filteredSubtotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Monto base sin impuesto
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    <TrendingUp size={24} />
                  </div>
                </div>
              </div>
              
              {/* Card 3: Determinación IGV (Dinámico según resultado) */}
              <div className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow ${
                igvAFavor ? 'border-green-200' : igvAPagar ? 'border-amber-200' : 'border-gray-200'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`text-sm font-medium ${
                      igvAFavor ? 'text-green-600' : igvAPagar ? 'text-amber-600' : 'text-gray-500'
                    }`}>
                      {igvAFavor ? 'IGV a favor ✓' : igvAPagar ? 'IGV a pagar' : 'IGV (18%)'}
                    </p>
                    <p className={`text-3xl font-bold mt-2 ${
                      igvAFavor ? 'text-green-600' : igvAPagar ? 'text-amber-600' : 'text-gray-900'
                    }`}>
                      S/ {igvAbsoluto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {igvAFavor 
                        ? 'Crédito fiscal disponible' 
                        : igvAPagar 
                          ? 'Ventas - Compras con IGV' 
                          : 'Sin movimientos'}
                    </p>
                    {/* Desglose del cálculo */}
                    {(igvVentas > 0 || igvGastos > 0) && (
                      <div className="mt-2 pt-2 border-t border-gray-100 text-xs space-y-0.5">
                        <div className="flex justify-between text-gray-500">
                          <span>IGV Ventas:</span>
                          <span className="text-gray-700">S/ {igvVentas.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                          <span>IGV Gastos (−):</span>
                          <span className="text-green-600">S/ {igvGastos.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={`p-3 rounded-xl text-white ${
                    igvAFavor 
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                      : 'bg-gradient-to-br from-orange-500 to-amber-600'
                  }`}>
                    {igvAFavor ? <CheckCircle2 size={24} /> : <Wallet size={24} />}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fuente</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ingreso Real</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">IGV</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredIncomes.map((income) => {
                    // Calcular el ingreso real para esta fila
                    const realIncome = calculateRealIncome(income);
                    const isPending = income.status === 'pending';
                    const hasPendingBalance = isPending && (income.pending_balance > 0 || (income.amount - (income.paid_amount || 0)) > 0);
                    // Calcular Subtotal e IGV (18%) del ingreso real
                    const incomeSubtotal = realIncome / 1.18;
                    const incomeIgv = realIncome - incomeSubtotal;
                    
                    return (
                      <tr key={income.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(income.date)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{income.description || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{income.source}</td>
                        <td className="px-4 py-3 text-right">
                          {/* Monto principal: dinero recibido */}
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(realIncome)}
                          </div>
                          {/* Referencia: monto total de la venta (solo si está pendiente y hay diferencia) */}
                          {hasPendingBalance && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              de {formatCurrency(income.amount)} total
                            </div>
                          )}
                        </td>
                        {/* Subtotal (Base Imponible) */}
                        <td className="px-4 py-3 text-right text-sm text-gray-600">
                          S/ {incomeSubtotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        {/* IGV (18%) */}
                        <td className="px-4 py-3 text-right text-sm text-amber-600 font-medium">
                          S/ {incomeIgv.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={income.status} type="income" />
                          {/* Mostrar saldo pendiente si aplica */}
                          {hasPendingBalance && (
                            <div className="text-xs text-amber-600 mt-1">
                              Pendiente: {formatCurrency(income.amount - (income.paid_amount || 0))}
                            </div>
                          )}
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
                    );
                  })}
                  {filteredIncomes.length === 0 && (
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                        No hay ingresos registrados en este período
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
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">IGV</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expenses.map((expense) => {
                    // Calcular Subtotal e IGV solo si includes_igv está activado
                    const hasIgv = expense.includes_igv;
                    const expenseSubtotal = hasIgv ? (expense.base_imponible || expense.amount / 1.18) : null;
                    const expenseIgv = hasIgv ? (expense.igv_gasto || expense.amount - (expense.amount / 1.18)) : null;
                    
                    return (
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
                        {/* Subtotal (Base Imponible) - solo si tiene IGV */}
                        <td className="px-4 py-3 text-right text-sm text-gray-600">
                          {hasIgv ? (
                            `S/ ${expenseSubtotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        {/* IGV (18%) - solo si tiene IGV */}
                        <td className="px-4 py-3 text-right text-sm">
                          {hasIgv ? (
                            <span className="text-green-600 font-medium">
                              S/ {expenseIgv.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
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
                    );
                  })}
                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
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
          <ReceivablesTab
            receivables={receivables}
            loadData={loadData}
            token={token}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
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

        {/* ========== PRODUCTOS / SERVICIOS TAB ========== */}
        {activeTab === 'products' && (
          <ProductsTab
            products={products}
            onAdd={() => {
              setEditingProduct(null);
              setShowProductModal(true);
            }}
            onEdit={handleEditProduct}
            onDelete={handleDeleteProduct}
            onToggleStatus={handleToggleProductStatus}
            formatCurrency={formatCurrency}
            loadData={loadData}
            token={token}
            companyId={selectedCompany?.id}
          />
        )}
      </div>

      {/* Modal Nuevo Ingreso */}
      {showIncomeModal && (
        <IncomeModal
          onClose={() => setShowIncomeModal(false)}
          onSave={handleCreateIncome}
          sources={incomeSources}
          projects={projects}
          products={products}
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

      {/* Modal Nuevo/Editar Producto */}
      {showProductModal && (
        <ProductModal
          onClose={() => {
            setShowProductModal(false);
            setEditingProduct(null);
          }}
          onSave={handleSaveProduct}
          product={editingProduct}
        />
      )}
    </div>
  );
};

// Modal de Ingreso con soporte para pagos parciales y productos
const IncomeModal = ({ onClose, onSave, sources, projects, products = [], token }) => {
  const [form, setForm] = useState({
    amount: '',          // Monto total del servicio/venta
    paid_amount: '',     // Pago recibido (a cuenta)
    source: 'ventas',
    description: '',
    date: getLocalDateString(),
    status: 'collected', // DEFAULT: Cobrado (caso más común)
    client_name: '',
    client_id: null,
    due_date: '',
    project_id: '',
    product_id: '',      // ID del producto seleccionado
  });
  
  const [selectedContact, setSelectedContact] = useState(null);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Filtrar productos activos que coincidan con la búsqueda
  const filteredProducts = products.filter(p => 
    p.status === 'activo' && 
    (p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
     (p.description && p.description.toLowerCase().includes(productSearch.toLowerCase())))
  );

  // Manejar selección de producto
  const handleProductSelect = (product) => {
    setForm(prev => ({
      ...prev,
      product_id: product.id,
      description: product.name + (product.description ? ` - ${product.description}` : ''),
      amount: product.base_price.toString(),
      source: product.type === 'servicio' ? 'servicios' : 'ventas',
    }));
    setProductSearch(product.name);
    setShowProductDropdown(false);
  };

  // Limpiar selección de producto
  const handleClearProduct = () => {
    setForm(prev => ({
      ...prev,
      product_id: '',
      description: '',
      amount: '',
    }));
    setProductSearch('');
  };

  // Calcular saldo pendiente en tiempo real (solo aplica cuando status es 'pending')
  const totalAmount = parseFloat(form.amount) || 0;
  const paidAmount = parseFloat(form.paid_amount) || 0;
  const pendingBalance = Math.max(0, totalAmount - paidAmount);

  const handleContactChange = (contact) => {
    setSelectedContact(contact);
    setForm(prev => ({
      ...prev,
      client_id: contact?.id || null,
      client_name: contact?.name || '',
    }));
  };

  // Manejar cambio de estado
  const handleStatusChange = (newStatus) => {
    setForm(prev => ({
      ...prev,
      status: newStatus,
      // Si cambia a "Cobrado", limpiar campos de pago parcial
      paid_amount: newStatus === 'collected' ? '' : prev.paid_amount,
      due_date: newStatus === 'collected' ? '' : prev.due_date,
    }));
  };

  // Validar que el pago no exceda el monto total
  const handlePaidAmountChange = (value) => {
    const paid = parseFloat(value) || 0;
    const total = parseFloat(form.amount) || 0;
    
    // No permitir pago mayor al monto total
    if (paid > total && total > 0) {
      setForm(prev => ({ ...prev, paid_amount: form.amount }));
    } else {
      setForm(prev => ({ ...prev, paid_amount: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const finalAmount = parseFloat(form.amount);
    
    // Si es "Cobrado", el pago = monto total, saldo = 0
    // Si es "Por cobrar", calcular según lo ingresado
    const finalPaidAmount = form.status === 'collected' 
      ? finalAmount 
      : (parseFloat(form.paid_amount) || 0);
    const finalPendingBalance = form.status === 'collected'
      ? 0
      : Math.max(0, finalAmount - finalPaidAmount);
    
    // Determinar estado final (si el pago completa el saldo, marcar como cobrado)
    let finalStatus = form.status;
    if (form.status === 'pending' && finalPendingBalance === 0 && finalAmount > 0) {
      finalStatus = 'collected';
    }
    
    onSave({
      ...form,
      amount: finalAmount,
      paid_amount: finalPaidAmount,
      pending_balance: finalPendingBalance,
      status: finalStatus,
      project_id: form.project_id || null,
      project_name: projects.find(p => p.id === form.project_id)?.name || null,
      due_date: form.status === 'pending' ? (form.due_date || null) : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white sticky top-0">
          <h2 className="text-lg font-semibold">Nuevo Ingreso</h2>
          <p className="text-sm text-emerald-100">Registra un nuevo ingreso</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* ========== SELECTOR DE PRODUCTO/SERVICIO ========== */}
          {products.length > 0 && (
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Package size={14} className="inline mr-1" />
                Producto / Servicio
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setShowProductDropdown(true);
                    if (!e.target.value) handleClearProduct();
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Buscar producto o servicio..."
                  data-testid="income-product-search"
                />
                {form.product_id && (
                  <button
                    type="button"
                    onClick={handleClearProduct}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              
              {/* Dropdown de productos */}
              {showProductDropdown && productSearch && filteredProducts.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredProducts.map(product => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleProductSelect(product)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-500">
                          {product.type === 'servicio' ? '🔧 Servicio' : '📦 Producto'}
                          {product.description && ` • ${product.description}`}
                        </p>
                      </div>
                      <span className="font-semibold text-emerald-600">
                        S/ {product.base_price.toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              
              {form.product_id && (
                <p className="text-xs text-emerald-600 mt-1">
                  ✓ Precio y descripción completados automáticamente
                </p>
              )}
            </div>
          )}

          {/* ========== ESTADO AL INICIO (CAMPO PRINCIPAL) ========== */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de ingreso *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleStatusChange('collected')}
                className={`px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 font-medium ${
                  form.status === 'collected'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <CheckCircle2 size={18} />
                Cobrado
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('pending')}
                className={`px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 font-medium ${
                  form.status === 'pending'
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <Clock size={18} />
                Por cobrar
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              {form.status === 'collected' 
                ? 'Dinero ya recibido - Ingreso efectivo' 
                : 'Venta a crédito o pago pendiente'}
            </p>
          </div>

          {/* ========== MONTO ========== */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {form.status === 'pending' ? 'Monto Total *' : 'Monto *'}
            </label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="0.00"
              required
              min="0.01"
              step="0.01"
              data-testid="income-amount-input"
            />
            {form.status === 'pending' && (
              <p className="text-xs text-gray-500 mt-1">Valor total del servicio o venta</p>
            )}
          </div>

          {/* ========== CAMPOS DE PAGO PARCIAL (SOLO SI "POR COBRAR") ========== */}
          {form.status === 'pending' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2 text-amber-700">
                <Wallet size={18} />
                <span className="text-sm font-medium">Detalle de pago parcial</span>
              </div>
              
              {/* Pago recibido (a cuenta) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pago recibido (a cuenta)
                </label>
                <input
                  type="number"
                  value={form.paid_amount}
                  onChange={(e) => handlePaidAmountChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  max={form.amount || undefined}
                  data-testid="income-paid-amount-input"
                />
                <p className="text-xs text-gray-500 mt-1">Monto que el cliente paga ahora (puede ser 0)</p>
              </div>
              
              {/* Saldo pendiente (calculado automáticamente) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Saldo pendiente
                </label>
                <div 
                  className={`w-full px-3 py-2 rounded-lg font-semibold ${
                    pendingBalance > 0 
                      ? 'bg-red-100 text-red-700 border border-red-200' 
                      : 'bg-green-100 text-green-700 border border-green-200'
                  }`}
                  data-testid="income-pending-balance"
                >
                  S/ {pendingBalance.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {pendingBalance === 0 && totalAmount > 0 
                    ? '✓ Pago completo - Se marcará como "Cobrado"' 
                    : 'Monto que queda por cobrar'}
                </p>
              </div>
            </div>
          )}

          {/* ========== FUENTE ========== */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fuente *</label>
            <select
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              data-testid="income-source-select"
            >
              {sources.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* ========== DESCRIPCIÓN ========== */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Ej: Pago de cliente ABC"
              data-testid="income-description-input"
            />
          </div>

          {/* ========== FECHA ========== */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
              data-testid="income-date-input"
            />
          </div>

          {/* ========== CLIENTE ========== */}
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

          {/* ========== FECHA DE VENCIMIENTO (SOLO SI "POR COBRAR") ========== */}
          {form.status === 'pending' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de vencimiento</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                data-testid="income-due-date-input"
              />
            </div>
          )}

          {/* ========== PROYECTO ASOCIADO ========== */}
          {projects.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proyecto asociado</label>
              <select
                value={form.project_id}
                onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                data-testid="income-project-select"
              >
                <option value="">Sin proyecto</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* ========== RESUMEN (SOLO SI "POR COBRAR") ========== */}
          {form.status === 'pending' && totalAmount > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="text-gray-600">
                <span className="font-medium">Resumen:</span> Registrando venta por{' '}
                <span className="font-semibold text-gray-900">S/ {totalAmount.toFixed(2)}</span>
                {paidAmount > 0 && (
                  <>, con pago a cuenta de <span className="font-semibold text-emerald-600">S/ {paidAmount.toFixed(2)}</span></>
                )}
                {pendingBalance > 0 && (
                  <>. Saldo pendiente: <span className="font-semibold text-red-600">S/ {pendingBalance.toFixed(2)}</span></>
                )}
              </p>
            </div>
          )}

          {/* ========== BOTONES ========== */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              data-testid="income-cancel-btn"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              data-testid="income-save-btn"
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
    date: getLocalDateString(), // Fecha local sin UTC
    status: 'paid', // Por defecto "Pagado" - cambio solicitado por usuario
    vendor_name: '',
    vendor_id: null,
    is_recurring: false,
    recurrence_period: '',
    priority: 'medium',
    due_date: '',
    project_id: '',
    includes_igv: false, // Por defecto no incluye IGV
  });

  // Estado para el contacto/proveedor seleccionado
  const [selectedVendor, setSelectedVendor] = useState(null);

  // Calcular IGV en tiempo real para mostrar al usuario
  const IGV_RATE = 0.18;
  const totalAmount = parseFloat(form.amount) || 0;
  const baseImponible = form.includes_igv ? totalAmount / (1 + IGV_RATE) : totalAmount;
  const igvGasto = form.includes_igv ? totalAmount - baseImponible : 0;

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
          {/* ========== ESTADO (AL INICIO, POR DEFECTO "PAGADO") ========== */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado *</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              data-testid="expense-status-select"
            >
              <option value="paid">Pagado</option>
              <option value="pending">Por pagar</option>
            </select>
          </div>

          {/* ========== MONTO CON VOZ ========== */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto Total *</label>
            <div className="relative">
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="0.00"
                required
                min="0.01"
                step="0.01"
                data-testid="expense-amount-input"
              />
              <VoiceMicButton 
                isNumeric={true}
                onResult={(value) => setForm(prev => ({ ...prev, amount: value }))}
              />
            </div>
          </div>

          {/* ========== TOGGLE IGV ========== */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-amber-700 font-medium text-sm">¿Este gasto incluye IGV?</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.includes_igv}
                  onChange={(e) => setForm({ ...form, includes_igv: e.target.checked })}
                  className="sr-only peer"
                  data-testid="expense-includes-igv-toggle"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            
            {/* Desglose de IGV (solo si está activado y hay monto) */}
            {form.includes_igv && totalAmount > 0 && (
              <div className="mt-3 pt-3 border-t border-amber-200 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Base imponible:</span>
                  <span className="font-medium text-gray-900">S/ {baseImponible.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">IGV (18%):</span>
                  <span className="font-medium text-amber-600">S/ {igvGasto.toFixed(2)}</span>
                </div>
                <p className="text-xs text-amber-600 mt-1">
                  💡 Este IGV será tu crédito fiscal (reduce tu IGV a pagar)
                </p>
              </div>
            )}
            
            {!form.includes_igv && (
              <p className="text-xs text-gray-500 mt-2">
                Actívalo si la factura o boleta incluye IGV desglosado
              </p>
            )}
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

          {/* ========== DESCRIPCIÓN CON VOZ ========== */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <div className="relative">
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Ej: Pago de servicios"
                data-testid="expense-description-input"
              />
              <VoiceMicButton 
                isNumeric={false}
                onResult={(value) => setForm(prev => ({ ...prev, description: value }))}
              />
            </div>
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
    date: getLocalDateString(), // Fecha local sin UTC
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

// ==========================================
// SECCIÓN POR COBRAR CON PAGOS PARCIALES
// ==========================================

const ReceivablesTab = ({ receivables, loadData, token, formatCurrency, formatDate }) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState(null);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Abrir modal de pago
  const handleAddPayment = (income) => {
    setSelectedIncome(income);
    setShowPaymentModal(true);
  };

  // Ver historial de pagos
  const handleViewHistory = async (income) => {
    setSelectedIncome(income);
    setLoadingHistory(true);
    setShowPaymentHistory(true);
    
    try {
      const response = await fetch(`/api/finanzas/partial-payments/${income.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPaymentHistory(data.payments || []);
      }
    } catch (err) {
      console.error('Error loading payment history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Guardar pago parcial
  const handleSavePayment = async (paymentData) => {
    try {
      const response = await fetch('/api/finanzas/partial-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(paymentData)
      });
      
      if (response.ok) {
        setShowPaymentModal(false);
        setSelectedIncome(null);
        loadData(); // Recargar datos
      } else {
        const error = await response.json();
        alert(error.detail || 'Error al registrar el pago');
      }
    } catch (err) {
      console.error('Error saving payment:', err);
      alert('Error al registrar el pago');
    }
  };

  // Eliminar pago parcial
  const handleDeletePayment = async (paymentId) => {
    if (!confirm('¿Estás seguro de eliminar este pago? Esta acción no se puede deshacer.')) return;
    
    try {
      const response = await fetch(`/api/finanzas/partial-payments/${paymentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        loadData();
        // Recargar historial
        if (selectedIncome) {
          handleViewHistory(selectedIncome);
        }
      }
    } catch (err) {
      console.error('Error deleting payment:', err);
    }
  };

  // Obtener estado visual
  const getStatusBadge = (item) => {
    const paidAmount = item.paid_amount || 0;
    const totalAmount = item.amount || 0;
    const pending = totalAmount - paidAmount;
    
    if (pending <= 0 || item.status === 'collected') {
      return { bg: 'bg-green-100', text: 'text-green-700', label: 'Cobrado' };
    } else if (paidAmount > 0 || item.status === 'partial') {
      return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Parcial' };
    } else {
      return { bg: 'bg-red-100', text: 'text-red-700', label: 'Por cobrar' };
    }
  };

  // Calcular totales
  const totalFacturado = receivables.total_facturado || receivables.receivables.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalAbonado = receivables.total_abonado || receivables.receivables.reduce((sum, r) => sum + (r.paid_amount || 0), 0);
  const totalPendiente = receivables.total || (totalFacturado - totalAbonado);

  return (
    <div className="space-y-4">
      {/* Header con totales */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Por Cobrar</h2>
          <p className="text-sm text-gray-500">{receivables.count} cuenta(s) pendiente(s)</p>
        </div>
      </div>

      {/* Dashboard de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Facturado */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Total Facturado</span>
            <DollarSign size={18} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalFacturado)}</p>
          <p className="text-xs text-gray-400">Valor total de ventas/servicios</p>
        </div>

        {/* Total Abonado */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Total Abonado</span>
            <CheckCircle2 size={18} className="text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalAbonado)}</p>
          <p className="text-xs text-gray-400">Dinero recibido en caja</p>
        </div>

        {/* Saldo Pendiente */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Saldo Pendiente</span>
            <Clock size={18} className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalPendiente)}</p>
          <p className="text-xs text-gray-400">Por cobrar a clientes</p>
        </div>
      </div>

      {/* Tabla de cuentas por cobrar */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto Total</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pagado</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {receivables.receivables.map((item) => {
              const paidAmount = item.paid_amount || 0;
              const totalAmount = item.amount || 0;
              const pendingAmount = totalAmount - paidAmount;
              const statusBadge = getStatusBadge(item);
              
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(item.date)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div>
                      {item.description || '-'}
                      {paidAmount > 0 && (
                        <button
                          onClick={() => handleViewHistory(item)}
                          className="ml-2 text-xs text-blue-600 hover:text-blue-700 underline"
                        >
                          Ver pagos
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.client_name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(item.due_date)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span className="font-medium text-green-600">{formatCurrency(paidAmount)}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span className={`font-semibold ${pendingAmount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      {formatCurrency(pendingAmount)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                      {statusBadge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {pendingAmount > 0 ? (
                      <button
                        onClick={() => handleAddPayment(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors text-xs font-medium"
                      >
                        <Plus size={14} />
                        Agregar pago
                      </button>
                    ) : (
                      <span className="text-xs text-green-600 font-medium">✓ Cobrado</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {receivables.receivables.length === 0 && (
              <tr>
                <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                  No hay ingresos pendientes de cobro
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de agregar pago */}
      {showPaymentModal && selectedIncome && (
        <AddPaymentModal
          income={selectedIncome}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedIncome(null);
          }}
          onSave={handleSavePayment}
          formatCurrency={formatCurrency}
        />
      )}

      {/* Modal de historial de pagos */}
      {showPaymentHistory && selectedIncome && (
        <PaymentHistoryModal
          income={selectedIncome}
          payments={paymentHistory}
          loading={loadingHistory}
          onClose={() => {
            setShowPaymentHistory(false);
            setSelectedIncome(null);
            setPaymentHistory([]);
          }}
          onDelete={handleDeletePayment}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
        />
      )}
    </div>
  );
};

// Modal para agregar pago parcial
const AddPaymentModal = ({ income, onClose, onSave, formatCurrency }) => {
  const pendingAmount = (income.amount || 0) - (income.paid_amount || 0);
  
  const [form, setForm] = useState({
    income_id: income.id,
    amount: '',
    date: getLocalDateString(),
    payment_method: 'efectivo',
    note: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const paymentAmount = parseFloat(form.amount);
    if (paymentAmount > pendingAmount) {
      alert(`El monto del pago no puede exceder el saldo pendiente (${formatCurrency(pendingAmount)})`);
      return;
    }
    
    onSave({
      ...form,
      amount: paymentAmount
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
          <h2 className="text-lg font-semibold">Agregar Pago</h2>
          <p className="text-sm text-emerald-100">{income.description || 'Sin descripción'}</p>
        </div>
        
        {/* Resumen del ingreso */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500">Monto Total</p>
              <p className="font-semibold text-gray-900">{formatCurrency(income.amount)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Pagado</p>
              <p className="font-semibold text-green-600">{formatCurrency(income.paid_amount || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Pendiente</p>
              <p className="font-semibold text-amber-600">{formatCurrency(pendingAmount)}</p>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto del pago *
            </label>
            <div className="relative">
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="0.00"
                required
                min="0.01"
                max={pendingAmount}
                step="0.01"
                data-testid="payment-amount-input"
              />
              <VoiceMicButton 
                isNumeric={true}
                onResult={(value) => setForm(prev => ({ ...prev, amount: value }))}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Máximo: {formatCurrency(pendingAmount)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del pago *</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
            <select
              value={form.payment_method}
              onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="yape">Yape</option>
              <option value="plin">Plin</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nota (opcional)</label>
            <div className="relative">
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Ej: Pago en efectivo, referencia bancaria..."
              />
              <VoiceMicButton 
                isNumeric={false}
                onResult={(value) => setForm(prev => ({ ...prev, note: value }))}
              />
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
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Registrar Pago
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal para ver historial de pagos
const PaymentHistoryModal = ({ income, payments, loading, onClose, onDelete, formatCurrency, formatDate }) => {
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden max-h-[80vh] flex flex-col">
        <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Historial de Pagos</h2>
            <p className="text-sm text-blue-100">{income.description || 'Sin descripción'}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full">
            <X size={20} />
          </button>
        </div>
        
        {/* Resumen */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total facturado:</span>
            <span className="font-medium">{formatCurrency(income.amount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total abonado ({payments.length} pagos):</span>
            <span className="font-medium text-green-600">{formatCurrency(totalPaid)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Saldo pendiente:</span>
            <span className="font-medium text-amber-600">{formatCurrency((income.amount || 0) - totalPaid)}</span>
          </div>
        </div>
        
        {/* Lista de pagos */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No hay pagos registrados</div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment, index) => (
                <div key={payment.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900">{formatCurrency(payment.amount)}</p>
                      <p className="text-xs text-gray-500">{formatDate(payment.date)}</p>
                      {payment.payment_method && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                          {payment.payment_method}
                        </span>
                      )}
                      {payment.note && (
                        <p className="text-xs text-gray-600 mt-1">{payment.note}</p>
                      )}
                    </div>
                    <button
                      onClick={() => onDelete(payment.id)}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// PRODUCTOS / SERVICIOS - COMPONENTES
// ==========================================

// Tab de Productos
const ProductsTab = ({ products, onAdd, onEdit, onDelete, onToggleStatus, formatCurrency, loadData, token, companyId }) => {
  const [filter, setFilter] = useState('all'); // 'all' | 'producto' | 'servicio'
  const [statusFilter, setStatusFilter] = useState('activo'); // 'activo' | 'inactivo' | 'all'
  const [searchTerm, setSearchTerm] = useState('');
  const [allProducts, setAllProducts] = useState([]);
  
  // Cargar todos los productos (activos e inactivos)
  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
        const response = await fetch(`/api/finanzas/products?company_id=${companyId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setAllProducts(data);
        }
      } catch (err) {
        console.error('Error loading all products:', err);
      }
    };
    
    if (companyId) {
      fetchAllProducts();
    }
  }, [companyId, token, products]);

  // Filtrar productos
  const filteredProducts = allProducts.filter(p => {
    const matchesType = filter === 'all' || p.type === filter;
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesSearch = !searchTerm || 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesType && matchesStatus && matchesSearch;
  });

  // Estadísticas
  const totalProducts = allProducts.filter(p => p.type === 'producto').length;
  const totalServices = allProducts.filter(p => p.type === 'servicio').length;
  const activeCount = allProducts.filter(p => p.status === 'activo').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Productos y Servicios</h2>
          <p className="text-sm text-gray-500">
            {totalProducts} producto(s) • {totalServices} servicio(s) • {activeCount} activo(s)
          </p>
        </div>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus size={18} />
          Nuevo Producto
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Búsqueda */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Buscar por nombre o descripción..."
          />
        </div>
        
        {/* Filtro por tipo */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              filter === 'all' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('producto')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              filter === 'producto' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📦 Productos
          </button>
          <button
            onClick={() => setFilter('servicio')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              filter === 'servicio' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🔧 Servicios
          </button>
        </div>
        
        {/* Filtro por estado */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
        >
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
          <option value="all">Todos</option>
        </select>
      </div>

      {/* Tabla de productos */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Precio Base</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">IGV</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredProducts.map((product) => (
              <tr key={product.id} className={`hover:bg-gray-50 ${product.status === 'inactivo' ? 'opacity-60' : ''}`}>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    {product.description && (
                      <p className="text-xs text-gray-500 truncate max-w-xs">{product.description}</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    product.type === 'servicio' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {product.type === 'servicio' ? '🔧 Servicio' : '📦 Producto'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{product.category || '-'}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">
                  {formatCurrency(product.base_price)}
                </td>
                <td className="px-4 py-3 text-center">
                  {product.includes_igv ? (
                    <span className="text-xs text-green-600">✓ Incluye</span>
                  ) : (
                    <span className="text-xs text-gray-400">No incluye</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => onToggleStatus(product)}
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                      product.status === 'activo'
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {product.status === 'activo' ? '● Activo' : '○ Inactivo'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(product)}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(product.id)}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                  {searchTerm ? 'No se encontraron productos con ese término' : 'No hay productos registrados'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Tip */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <p className="text-sm text-emerald-700">
          <strong>💡 Tip:</strong> Los productos y servicios activos aparecerán automáticamente en el formulario de "Nuevo Ingreso" para autocompletar precio y descripción.
        </p>
      </div>
    </div>
  );
};

// Modal de Producto
const ProductModal = ({ onClose, onSave, product }) => {
  const [form, setForm] = useState({
    name: product?.name || '',
    type: product?.type || 'servicio',
    base_price: product?.base_price?.toString() || '',
    includes_igv: product?.includes_igv ?? true,
    description: product?.description || '',
    category: product?.category || '',
    status: product?.status || 'activo',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      base_price: parseFloat(form.base_price),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
          <h2 className="text-lg font-semibold">{product ? 'Editar' : 'Nuevo'} Producto / Servicio</h2>
          <p className="text-sm text-purple-100">
            {product ? 'Actualiza la información' : 'Registra un nuevo producto o servicio'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <div className="relative">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Ej: Clases de piano, Diseño de logo..."
                required
                data-testid="product-name-input"
              />
              <VoiceMicButton 
                isNumeric={false}
                onResult={(value) => setForm(prev => ({ ...prev, name: value }))}
              />
            </div>
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'servicio' })}
                className={`px-4 py-2.5 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                  form.type === 'servicio'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                🔧 Servicio
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'producto' })}
                className={`px-4 py-2.5 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                  form.type === 'producto'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                📦 Producto
              </button>
            </div>
          </div>

          {/* Precio base */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio Base *</label>
            <div className="relative">
              <input
                type="number"
                value={form.base_price}
                onChange={(e) => setForm({ ...form, base_price: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="0.00"
                required
                min="0.01"
                step="0.01"
                data-testid="product-price-input"
              />
              <VoiceMicButton 
                isNumeric={true}
                onResult={(value) => setForm(prev => ({ ...prev, base_price: value }))}
              />
            </div>
          </div>

          {/* IGV */}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.includes_igv}
                onChange={(e) => setForm({ ...form, includes_igv: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              <span className="ml-3 text-sm font-medium text-gray-700">El precio incluye IGV (18%)</span>
            </label>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <div className="relative">
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                placeholder="Descripción detallada del producto o servicio..."
                rows={2}
              />
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <input
              type="text"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Ej: Educación, Diseño, Consultoría..."
            />
          </div>

          {/* Estado (solo en edición) */}
          {product && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          )}

          {/* Botones */}
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
              {product ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FinanzasModule;

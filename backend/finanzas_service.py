"""
Finanzas Service - Módulo de Contabilidad Gerencial para Mindora
Enfocado en claridad financiera para toma de decisiones empresariales.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
from enum import Enum
import uuid

# ==========================================
# ENUMS Y CONSTANTES
# ==========================================

class IncomeStatus(str, Enum):
    COLLECTED = "collected"  # Cobrado
    PENDING = "pending"      # Por cobrar

class ExpenseStatus(str, Enum):
    PAID = "paid"           # Pagado
    PENDING = "pending"     # Por pagar

class InvestmentStatus(str, Enum):
    ACTIVE = "active"       # Activa
    RECOVERED = "recovered" # Recuperada
    LOSS = "loss"          # Pérdida

class ExpensePriority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

# ==========================================
# PYDANTIC MODELS - EMPRESAS
# ==========================================

class CompanyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Nombre de la empresa")
    ruc: Optional[str] = Field(None, description="RUC o identificador fiscal")
    address: Optional[str] = Field(None, description="Dirección")
    phone: Optional[str] = Field(None, description="Teléfono")
    email: Optional[str] = Field(None, description="Email de contacto")
    currency: str = Field(default="PEN", description="Moneda principal")
    logo_url: Optional[str] = Field(None, description="URL del logo")

class CompanyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    ruc: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    currency: Optional[str] = None
    logo_url: Optional[str] = None

class CompanyResponse(BaseModel):
    id: str
    name: str
    ruc: Optional[str]
    address: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    currency: str
    logo_url: Optional[str]
    owner_username: str
    created_at: str
    updated_at: str

# Categorías de gastos predefinidas (editables por usuario)
DEFAULT_EXPENSE_CATEGORIES = [
    {"id": "nomina", "name": "Nómina", "color": "#3B82F6", "icon": "Users"},
    {"id": "marketing", "name": "Marketing", "color": "#8B5CF6", "icon": "Megaphone"},
    {"id": "herramientas", "name": "Herramientas", "color": "#F59E0B", "icon": "Wrench"},
    {"id": "infraestructura", "name": "Infraestructura", "color": "#10B981", "icon": "Building"},
    {"id": "servicios_externos", "name": "Servicios externos", "color": "#EC4899", "icon": "Briefcase"},
    {"id": "impuestos", "name": "Impuestos", "color": "#EF4444", "icon": "Receipt"},
    {"id": "otros", "name": "Otros", "color": "#6B7280", "icon": "MoreHorizontal"},
]

# Fuentes de ingreso predefinidas
DEFAULT_INCOME_SOURCES = [
    {"id": "ventas", "name": "Ventas", "color": "#10B981"},
    {"id": "servicios", "name": "Servicios", "color": "#3B82F6"},
    {"id": "proyectos", "name": "Proyectos", "color": "#8B5CF6"},
    {"id": "comisiones", "name": "Comisiones", "color": "#F59E0B"},
    {"id": "otros", "name": "Otros", "color": "#6B7280"},
]

# ==========================================
# PYDANTIC MODELS - INGRESOS
# ==========================================

class IncomeCreate(BaseModel):
    company_id: str = Field(..., description="ID de la empresa")
    amount: float = Field(..., gt=0, description="Monto del ingreso")
    source: str = Field(..., description="Fuente del ingreso")
    description: Optional[str] = Field(None, description="Descripción opcional")
    date: str = Field(..., description="Fecha del ingreso (ISO format)")
    status: IncomeStatus = Field(default=IncomeStatus.PENDING)
    project_id: Optional[str] = Field(None, description="Proyecto asociado")
    project_name: Optional[str] = Field(None, description="Nombre del proyecto")
    client_name: Optional[str] = Field(None, description="Cliente asociado")
    client_id: Optional[str] = Field(None, description="ID del contacto cliente")
    due_date: Optional[str] = Field(None, description="Fecha de vencimiento para cobrar")
    notes: Optional[str] = Field(None, description="Notas adicionales")

class IncomeUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    source: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    status: Optional[IncomeStatus] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    client_name: Optional[str] = None
    client_id: Optional[str] = None
    due_date: Optional[str] = None
    notes: Optional[str] = None

class IncomeResponse(BaseModel):
    id: str
    company_id: str
    workspace_id: str
    username: str
    amount: float
    source: str
    description: Optional[str]
    date: str
    status: IncomeStatus
    project_id: Optional[str]
    project_name: Optional[str]
    client_name: Optional[str]
    client_id: Optional[str]
    due_date: Optional[str]
    notes: Optional[str]
    created_at: str
    updated_at: str

# ==========================================
# PYDANTIC MODELS - GASTOS
# ==========================================

class ExpenseCreate(BaseModel):
    company_id: str = Field(..., description="ID de la empresa")
    amount: float = Field(..., gt=0, description="Monto del gasto")
    category: str = Field(..., description="Categoría del gasto")
    description: Optional[str] = Field(None, description="Descripción del gasto")
    date: str = Field(..., description="Fecha del gasto (ISO format)")
    status: ExpenseStatus = Field(default=ExpenseStatus.PENDING)
    project_id: Optional[str] = Field(None, description="Proyecto asociado")
    project_name: Optional[str] = Field(None, description="Nombre del proyecto")
    vendor_name: Optional[str] = Field(None, description="Proveedor")
    vendor_id: Optional[str] = Field(None, description="ID del contacto proveedor")
    is_recurring: bool = Field(default=False, description="¿Es gasto recurrente?")
    recurrence_period: Optional[str] = Field(None, description="Periodo de recurrencia: monthly, weekly, yearly")
    priority: ExpensePriority = Field(default=ExpensePriority.MEDIUM)
    due_date: Optional[str] = Field(None, description="Fecha de vencimiento para pagar")
    notes: Optional[str] = Field(None, description="Notas adicionales")

class ExpenseUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    category: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    status: Optional[ExpenseStatus] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    vendor_name: Optional[str] = None
    vendor_id: Optional[str] = None
    is_recurring: Optional[bool] = None
    recurrence_period: Optional[str] = None
    priority: Optional[ExpensePriority] = None
    due_date: Optional[str] = None
    notes: Optional[str] = None

class ExpenseResponse(BaseModel):
    id: str
    company_id: str
    workspace_id: str
    username: str
    amount: float
    category: str
    description: Optional[str]
    date: str
    status: ExpenseStatus
    project_id: Optional[str]
    project_name: Optional[str]
    vendor_name: Optional[str]
    vendor_id: Optional[str]
    is_recurring: bool
    recurrence_period: Optional[str]
    priority: ExpensePriority
    due_date: Optional[str]
    notes: Optional[str]
    created_at: str
    updated_at: str

# ==========================================
# PYDANTIC MODELS - INVERSIONES
# ==========================================

class InvestmentCreate(BaseModel):
    amount: float = Field(..., gt=0, description="Monto de la inversión")
    description: str = Field(..., description="Descripción de la inversión")
    date: str = Field(..., description="Fecha de la inversión (ISO format)")
    status: InvestmentStatus = Field(default=InvestmentStatus.ACTIVE)
    project_id: Optional[str] = Field(None, description="Proyecto asociado")
    project_name: Optional[str] = Field(None, description="Nombre del proyecto")
    objective: Optional[str] = Field(None, description="Objetivo de la inversión")
    expected_return: Optional[float] = Field(None, description="Retorno esperado")
    actual_return: Optional[float] = Field(None, description="Retorno real obtenido")
    notes: Optional[str] = Field(None, description="Notas adicionales")

class InvestmentUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    description: Optional[str] = None
    date: Optional[str] = None
    status: Optional[InvestmentStatus] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    objective: Optional[str] = None
    expected_return: Optional[float] = None
    actual_return: Optional[float] = None
    notes: Optional[str] = None

class InvestmentResponse(BaseModel):
    id: str
    workspace_id: str
    username: str
    amount: float
    description: str
    date: str
    status: InvestmentStatus
    project_id: Optional[str]
    project_name: Optional[str]
    objective: Optional[str]
    expected_return: Optional[float]
    actual_return: Optional[float]
    notes: Optional[str]
    created_at: str
    updated_at: str

# ==========================================
# PYDANTIC MODELS - CATEGORÍAS
# ==========================================

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    color: str = Field(default="#6B7280")
    icon: Optional[str] = Field(default="Tag")

class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    color: Optional[str] = None
    icon: Optional[str] = None

class CategoryResponse(BaseModel):
    id: str
    name: str
    color: str
    icon: Optional[str]
    is_default: bool

# ==========================================
# PYDANTIC MODELS - RESUMEN FINANCIERO
# ==========================================

class FinancialSummary(BaseModel):
    period: str  # "2026-01" (año-mes)
    total_income: float
    total_income_collected: float
    total_income_pending: float
    total_expenses: float
    total_expenses_paid: float
    total_expenses_pending: float
    total_investments: float
    net_result: float  # income_collected - expenses_paid
    estimated_cash: float
    health_status: str  # "good", "warning", "critical"
    income_count: int
    expense_count: int
    investment_count: int

class ProjectFinancialSummary(BaseModel):
    project_id: str
    project_name: str
    total_income: float
    total_expenses: float
    total_investments: float
    net_result: float
    roi: Optional[float]  # Return on Investment

# ==========================================
# HELPER FUNCTIONS
# ==========================================

def generate_id() -> str:
    """Genera un ID único para registros financieros"""
    return str(uuid.uuid4())

def get_current_timestamp() -> str:
    """Retorna timestamp actual en ISO format"""
    return datetime.now(timezone.utc).isoformat()

def calculate_health_status(income: float, expenses: float, pending_expenses: float) -> str:
    """
    Calcula el estado de salud financiera
    - Verde (good): Ingresos > Gastos * 1.2
    - Amarillo (warning): Ingresos > Gastos pero < Gastos * 1.2
    - Rojo (critical): Ingresos <= Gastos o muchos pendientes
    """
    if income <= 0:
        return "critical"
    
    ratio = income / max(expenses, 1)
    pending_ratio = pending_expenses / max(expenses, 1)
    
    if ratio >= 1.2 and pending_ratio < 0.3:
        return "good"
    elif ratio >= 1.0:
        return "warning"
    else:
        return "critical"

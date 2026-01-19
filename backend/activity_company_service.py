"""
Company Activity Service - Sistema de registro de actividad por empresa
Registra acciones operativas realizadas por colaboradores.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime, timezone
import uuid

# Tipos de actividad
ACTIVITY_TYPES = {
    # Contactos
    "contact_created": {"module": "contacts", "action": "creó", "icon": "UserPlus", "color": "emerald"},
    "contact_updated": {"module": "contacts", "action": "editó", "icon": "UserCog", "color": "blue"},
    "contact_deleted": {"module": "contacts", "action": "eliminó", "icon": "UserMinus", "color": "red"},
    
    # Finanzas - Ingresos
    "income_created": {"module": "finances", "action": "registró ingreso", "icon": "TrendingUp", "color": "emerald"},
    "income_updated": {"module": "finances", "action": "editó ingreso", "icon": "TrendingUp", "color": "blue"},
    "income_deleted": {"module": "finances", "action": "eliminó ingreso", "icon": "TrendingUp", "color": "red"},
    "income_collected": {"module": "finances", "action": "cobró", "icon": "CheckCircle", "color": "emerald"},
    
    # Finanzas - Gastos
    "expense_created": {"module": "finances", "action": "registró gasto", "icon": "TrendingDown", "color": "orange"},
    "expense_updated": {"module": "finances", "action": "editó gasto", "icon": "TrendingDown", "color": "blue"},
    "expense_deleted": {"module": "finances", "action": "eliminó gasto", "icon": "TrendingDown", "color": "red"},
    "expense_paid": {"module": "finances", "action": "pagó", "icon": "CheckCircle", "color": "emerald"},
    
    # Finanzas - Inversiones
    "investment_created": {"module": "finances", "action": "registró inversión", "icon": "PiggyBank", "color": "purple"},
    "investment_updated": {"module": "finances", "action": "editó inversión", "icon": "PiggyBank", "color": "blue"},
    "investment_deleted": {"module": "finances", "action": "eliminó inversión", "icon": "PiggyBank", "color": "red"},
    
    # Tableros
    "board_created": {"module": "boards", "action": "creó tablero", "icon": "LayoutGrid", "color": "indigo"},
    "board_updated": {"module": "boards", "action": "editó tablero", "icon": "LayoutGrid", "color": "blue"},
    "board_deleted": {"module": "boards", "action": "eliminó tablero", "icon": "LayoutGrid", "color": "red"},
    "card_created": {"module": "boards", "action": "creó tarjeta", "icon": "Plus", "color": "emerald"},
    "card_updated": {"module": "boards", "action": "editó tarjeta", "icon": "Edit", "color": "blue"},
    "card_moved": {"module": "boards", "action": "movió tarjeta", "icon": "ArrowRight", "color": "amber"},
    "card_deleted": {"module": "boards", "action": "eliminó tarjeta", "icon": "Trash", "color": "red"},
    
    # Colaboradores
    "collaborator_invited": {"module": "team", "action": "invitó a", "icon": "UserPlus", "color": "emerald"},
    "collaborator_joined": {"module": "team", "action": "se unió al equipo", "icon": "UserCheck", "color": "emerald"},
    "collaborator_role_changed": {"module": "team", "action": "cambió rol de", "icon": "Shield", "color": "purple"},
    "collaborator_removed": {"module": "team", "action": "removió a", "icon": "UserMinus", "color": "red"},
    "invitation_revoked": {"module": "team", "action": "revocó invitación de", "icon": "XCircle", "color": "orange"},
    
    # Empresa
    "company_updated": {"module": "company", "action": "actualizó configuración", "icon": "Settings", "color": "slate"},
}

MODULE_LABELS = {
    "contacts": "Contactos",
    "finances": "Finanzas",
    "boards": "Tableros",
    "team": "Equipo",
    "company": "Empresa"
}


class ActivityCreate(BaseModel):
    """Modelo para crear una actividad"""
    company_id: str
    activity_type: str
    actor_username: str
    target_name: Optional[str] = None  # Nombre del objeto afectado
    target_id: Optional[str] = None    # ID del objeto afectado
    details: Optional[dict] = None     # Detalles adicionales
    amount: Optional[float] = None     # Para transacciones financieras


class ActivityResponse(BaseModel):
    """Respuesta de actividad"""
    id: str
    company_id: str
    activity_type: str
    actor_username: str
    actor_name: str
    target_name: Optional[str]
    target_id: Optional[str]
    details: Optional[dict]
    amount: Optional[float]
    module: str
    action: str
    icon: str
    color: str
    created_at: str
    time_ago: str


def generate_activity_id() -> str:
    """Genera un ID único para actividad"""
    return f"act_{uuid.uuid4().hex[:12]}"


def get_current_timestamp() -> str:
    """Obtiene el timestamp actual en formato ISO"""
    return datetime.now(timezone.utc).isoformat()


def get_time_ago(timestamp_str: str) -> str:
    """Convierte un timestamp a tiempo relativo en español"""
    try:
        timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        diff = now - timestamp
        
        seconds = diff.total_seconds()
        
        if seconds < 60:
            return "hace un momento"
        elif seconds < 3600:
            minutes = int(seconds / 60)
            return f"hace {minutes} min"
        elif seconds < 86400:
            hours = int(seconds / 3600)
            return f"hace {hours}h"
        elif seconds < 604800:
            days = int(seconds / 86400)
            return f"hace {days}d"
        elif seconds < 2592000:
            weeks = int(seconds / 604800)
            return f"hace {weeks} sem"
        else:
            months = int(seconds / 2592000)
            return f"hace {months} mes{'es' if months > 1 else ''}"
    except:
        return "hace un momento"


def get_activity_meta(activity_type: str) -> dict:
    """Obtiene los metadatos de un tipo de actividad"""
    return ACTIVITY_TYPES.get(activity_type, {
        "module": "other",
        "action": activity_type,
        "icon": "Activity",
        "color": "gray"
    })


def format_activity(activity: dict, actor_name: str = None) -> dict:
    """Formatea una actividad para la respuesta"""
    meta = get_activity_meta(activity.get("activity_type", ""))
    
    return {
        "id": activity.get("id", ""),
        "company_id": activity.get("company_id", ""),
        "activity_type": activity.get("activity_type", ""),
        "actor_username": activity.get("actor_username", ""),
        "actor_name": actor_name or activity.get("actor_username", "Usuario"),
        "target_name": activity.get("target_name"),
        "target_id": activity.get("target_id"),
        "details": activity.get("details"),
        "amount": activity.get("amount"),
        "module": meta.get("module", "other"),
        "module_label": MODULE_LABELS.get(meta.get("module"), "Otro"),
        "action": meta.get("action", "realizó acción"),
        "icon": meta.get("icon", "Activity"),
        "color": meta.get("color", "gray"),
        "created_at": activity.get("created_at", ""),
        "time_ago": get_time_ago(activity.get("created_at", ""))
    }


def build_activity_message(activity: dict) -> str:
    """Construye el mensaje legible de la actividad"""
    meta = get_activity_meta(activity.get("activity_type", ""))
    action = meta.get("action", "realizó acción")
    target = activity.get("target_name", "")
    amount = activity.get("amount")
    
    message = action
    if target:
        message += f" {target}"
    if amount:
        message += f" (S/ {amount:,.2f})"
    
    return message

"""
Contacts Service for MindoraMap - CRM básico con campos personalizados
"""
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Literal
from datetime import datetime, timezone
from uuid import uuid4


# Tipos de campo válidos
VALID_FIELD_TYPES = ['text', 'number', 'textarea', 'date', 'time', 'select', 'multiselect']


# ==========================================
# MODELOS DE DATOS
# ==========================================

class CustomField(BaseModel):
    """Campo personalizado configurable por el usuario"""
    id: str = Field(default_factory=lambda: f"field_{uuid4().hex[:8]}")
    name: str
    field_type: str = 'text'  # 'text', 'number', 'textarea', 'select', 'multiselect'
    is_required: bool = False
    color: Optional[str] = None
    options: List[str] = []  # Para select y multiselect
    
    @field_validator('field_type')
    @classmethod
    def validate_field_type(cls, v):
        # Si el tipo no es válido, default a 'text' para compatibilidad
        if v not in VALID_FIELD_TYPES:
            return 'text'
        return v


class CustomFieldConfig(BaseModel):
    """Configuración de campos personalizados por tipo de contacto"""
    contact_type: str  # 'client', 'prospect', 'supplier'
    fields: List[CustomField] = []
    owner_username: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class Contact(BaseModel):
    """Modelo base de contacto"""
    id: str = Field(default_factory=lambda: f"contact_{uuid4().hex[:12]}")
    contact_type: str  # 'client', 'prospect', 'supplier'
    
    # Campos obligatorios
    nombre: str
    apellidos: str
    whatsapp: str
    
    # Campo opcional
    email: Optional[str] = ""
    
    # Empresa asociada (obligatorio para módulos operativos)
    company_id: Optional[str] = None
    
    # Campos personalizados (diccionario dinámico)
    custom_fields: dict = {}
    
    # Metadata
    owner_username: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ==========================================
# REQUEST MODELS
# ==========================================

class CreateContactRequest(BaseModel):
    contact_type: str
    nombre: str
    apellidos: str
    whatsapp: str
    email: Optional[str] = ""
    custom_fields: Optional[dict] = {}
    labels: Optional[List[str]] = []  # Lista de IDs de etiquetas
    workspace_id: Optional[str] = None  # ID del workspace (si es compartido)
    company_id: Optional[str] = None  # ID de la empresa (obligatorio para operaciones)


class UpdateContactRequest(BaseModel):
    nombre: Optional[str] = None
    apellidos: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    custom_fields: Optional[dict] = None
    labels: Optional[List[str]] = None  # Lista de IDs de etiquetas


class CreateCustomFieldRequest(BaseModel):
    name: str
    field_type: str = 'text'  # 'text', 'number', 'textarea', 'select', 'multiselect'
    is_required: bool = False
    color: Optional[str] = None
    options: Optional[List[str]] = []
    
    @field_validator('field_type')
    @classmethod
    def validate_field_type(cls, v):
        if v not in VALID_FIELD_TYPES:
            return 'text'
        return v


class UpdateCustomFieldRequest(BaseModel):
    name: Optional[str] = None
    field_type: Optional[str] = None
    is_required: Optional[bool] = None
    color: Optional[str] = None
    options: Optional[List[str]] = None
    
    @field_validator('field_type')
    @classmethod
    def validate_field_type(cls, v):
        if v is None:
            return v
        if v not in VALID_FIELD_TYPES:
            return 'text'
        return v

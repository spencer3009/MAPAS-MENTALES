"""
Board Service for MindoraMap - Tableros estilo Trello
Maneja la creación, edición y gestión de tableros, listas y tarjetas
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
from uuid import uuid4


# ==========================================
# MODELOS PYDANTIC
# ==========================================

class CardLabel(BaseModel):
    id: str = Field(default_factory=lambda: f"label_{uuid4().hex[:8]}")
    color: str = "blue"
    text: Optional[str] = None


# Etiqueta reutilizable a nivel de tablero (estilo Trello)
class BoardLabel(BaseModel):
    id: str = Field(default_factory=lambda: f"blabel_{uuid4().hex[:8]}")
    name: str  # Texto de la etiqueta (obligatorio)
    color: str = "#3B82F6"  # Color hex


class Card(BaseModel):
    id: str = Field(default_factory=lambda: f"card_{uuid4().hex[:12]}")
    title: str
    description: Optional[str] = ""
    labels: List[CardLabel] = []
    position: int = 0
    is_pinned: bool = False  # Para anclar tareas importantes arriba
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class BoardList(BaseModel):
    id: str = Field(default_factory=lambda: f"list_{uuid4().hex[:12]}")
    title: str
    cards: List[Card] = []
    position: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class Board(BaseModel):
    id: str = Field(default_factory=lambda: f"board_{uuid4().hex[:12]}")
    title: str
    description: Optional[str] = ""
    background_color: str = "#3B82F6"  # Azul por defecto
    background_image: Optional[str] = None
    owner_username: str
    lists: List[BoardList] = []
    collaborators: List[str] = []
    board_labels: List[dict] = []  # Etiquetas reutilizables del tablero
    is_archived: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ==========================================
# REQUEST MODELS
# ==========================================

class CreateBoardRequest(BaseModel):
    title: str
    description: Optional[str] = ""
    background_color: Optional[str] = "#3B82F6"


class UpdateBoardRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    background_color: Optional[str] = None
    background_image: Optional[str] = None
    board_labels: Optional[List[dict]] = None  # Etiquetas reutilizables


class CreateListRequest(BaseModel):
    title: str
    position: Optional[int] = None


class UpdateListRequest(BaseModel):
    title: Optional[str] = None
    position: Optional[int] = None


class CreateCardRequest(BaseModel):
    title: str
    description: Optional[str] = ""
    labels: Optional[list] = []  # Lista de IDs de etiquetas (strings)


class UpdateCardRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    labels: Optional[list] = None  # Lista de IDs de etiquetas (strings)
    position: Optional[int] = None
    due_date: Optional[str] = None
    due_time: Optional[str] = None
    due_date_activities: Optional[List[dict]] = None
    checklist: Optional[List[dict]] = None
    comments: Optional[List[dict]] = None
    priority: Optional[str] = None
    attachments: Optional[List[dict]] = None
    is_pinned: Optional[bool] = None  # Para anclar tareas


class MoveCardRequest(BaseModel):
    source_list_id: str
    destination_list_id: str
    card_id: str
    new_position: int


class ReorderListsRequest(BaseModel):
    list_ids: List[str]  # Lista de IDs en el nuevo orden


class ReorderCardsRequest(BaseModel):
    list_id: str
    card_ids: List[str]  # Lista de IDs de cards en el nuevo orden


# ==========================================
# COLORES DISPONIBLES PARA TABLEROS
# ==========================================

BOARD_COLORS = [
    {"id": "blue", "value": "#3B82F6", "name": "Azul"},
    {"id": "green", "value": "#10B981", "name": "Verde"},
    {"id": "purple", "value": "#8B5CF6", "name": "Morado"},
    {"id": "pink", "value": "#EC4899", "name": "Rosa"},
    {"id": "orange", "value": "#F59E0B", "name": "Naranja"},
    {"id": "red", "value": "#EF4444", "name": "Rojo"},
    {"id": "teal", "value": "#14B8A6", "name": "Teal"},
    {"id": "indigo", "value": "#6366F1", "name": "Índigo"},
    {"id": "gray", "value": "#6B7280", "name": "Gris"},
]

CARD_LABEL_COLORS = [
    {"id": "green", "value": "#22C55E", "name": "Verde"},
    {"id": "yellow", "value": "#EAB308", "name": "Amarillo"},
    {"id": "orange", "value": "#F97316", "name": "Naranja"},
    {"id": "red", "value": "#EF4444", "name": "Rojo"},
    {"id": "purple", "value": "#A855F7", "name": "Morado"},
    {"id": "blue", "value": "#3B82F6", "name": "Azul"},
    {"id": "sky", "value": "#0EA5E9", "name": "Celeste"},
    {"id": "pink", "value": "#EC4899", "name": "Rosa"},
]

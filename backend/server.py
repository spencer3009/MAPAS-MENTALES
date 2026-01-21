from fastapi import FastAPI, APIRouter, HTTPException, Depends, BackgroundTasks, Form, Request, UploadFile, File, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import httpx
import secrets
import json
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from jose import JWTError, jwt
from passlib.context import CryptContext
from PIL import Image
import io
import base64

# IMPORTANTE: Cargar variables de entorno ANTES de importar servicios de email
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Ahora sí importar los servicios que dependen de variables de entorno
import paypal_service
import email_service
import reminder_service
import reminder_scheduler
import reminder_email_service
import board_service
from board_service import (
    CreateBoardRequest, UpdateBoardRequest, 
    CreateListRequest, UpdateListRequest,
    CreateCardRequest, UpdateCardRequest,
    MoveCardRequest, ReorderListsRequest, ReorderCardsRequest,
    BOARD_COLORS, CARD_LABEL_COLORS
)
import contacts_service
from contacts_service import (
    CreateContactRequest, UpdateContactRequest,
    CreateCustomFieldRequest, UpdateCustomFieldRequest
)
import workspace_service
from workspace_service import (
    WORKSPACE_ROLES, RESOURCE_ROLES, RESOURCE_TYPES,
    create_personal_workspace, get_user_workspaces, get_workspace_members,
    ensure_user_has_workspace, check_resource_permission, grant_resource_permission,
    revoke_resource_permission, create_invite, accept_invite, get_pending_invites_for_email,
    create_share_link, get_share_link, toggle_share_link, get_resource_share_link,
    get_resource_collaborators, update_collaborator_role, remove_collaborator,
    get_resource_permissions, migrate_user_resources_to_workspace
)
import activity_service
from activity_service import (
    log_activity, get_activity_feed, get_resource_activity,
    mark_activities_as_read, get_unread_count,
    get_notification_preferences, update_notification_preferences,
    should_send_email, process_activity_notification,
    generate_activity_message, DEFAULT_NOTIFICATION_PREFERENCES,
    EMAIL_WORTHY_ACTIONS
)
import finanzas_service
from finanzas_service import (
    CompanyCreate, CompanyUpdate, CompanyResponse,
    IncomeCreate, IncomeUpdate, IncomeResponse, IncomeStatus,
    ExpenseCreate, ExpenseUpdate, ExpenseResponse, ExpenseStatus, ExpensePriority,
    InvestmentCreate, InvestmentUpdate, InvestmentResponse, InvestmentStatus,
    CategoryCreate, CategoryUpdate, CategoryResponse,
    PartialPaymentCreate, PartialPaymentResponse,
    ProductCreate, ProductUpdate, ProductResponse, ProductType, ProductStatus,
    FinancialSummary, ProjectFinancialSummary,
    DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_SOURCES,
    generate_id, get_current_timestamp, calculate_health_status
)
import collaborator_service
from collaborator_service import (
    CompanyRole, InvitationStatus, ROLE_PERMISSIONS,
    CollaboratorInvite, CollaboratorRoleUpdate, CollaboratorResponse, InvitationResponse,
    generate_invitation_id, generate_collaborator_id, get_invitation_expiry, is_invitation_expired,
    get_role_permissions, has_permission,
    get_invitation_email_html, get_invitation_accepted_email_html, get_invitation_rejected_email_html,
    get_role_changed_email_html, get_access_revoked_email_html
)
import activity_company_service
from activity_company_service import (
    ActivityCreate, ACTIVITY_TYPES, MODULE_LABELS,
    generate_activity_id, format_activity, build_activity_message
)


# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'mindoramap-secret-key-2024-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer()

# Twilio WhatsApp Sandbox Configuration
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN', '')
TWILIO_WHATSAPP_NUMBER = os.environ.get('TWILIO_WHATSAPP_NUMBER', '')  # Format: whatsapp:+14155238886

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ==========================================
# AUTH MODELS
# ==========================================

class LoginRequest(BaseModel):
    username: str
    password: str

class DemoMapNode(BaseModel):
    id: str
    text: str
    x: float
    y: float
    color: Optional[str] = "blue"
    parentId: Optional[str] = None
    width: Optional[float] = 160
    height: Optional[float] = 64
    nodeType: Optional[str] = "default"
    manualWidth: Optional[float] = None
    manualHeight: Optional[float] = None

class DemoMapData(BaseModel):
    id: str
    name: str
    layoutType: Optional[str] = "mindflow"
    nodes: List[DemoMapNode]
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

class RegisterRequest(BaseModel):
    nombre: str
    apellidos: Optional[str] = ""
    email: str
    username: str
    password: str
    demo_map: Optional[DemoMapData] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

# ==================== SISTEMA DE PLANES (SOURCE OF TRUTH) ====================
# Configuración completa de planes - Esta es la ÚNICA fuente de verdad
# Cualquier cambio aquí se refleja en landing, pop-ups y sistema

PLANS_CONFIG = {
    "free": {
        "id": "free",
        "name": "Free",
        "display_name": "Gratis",
        "price": 0,
        "price_display": "Gratis",
        "currency": "USD",
        "period": "para siempre",
        "period_months": 0,
        "description": "Perfecto para probar la plataforma",
        "users_min": 1,
        "users_max": 1,
        "limits": {
            "max_active_maps": 3,
            "max_total_maps_created": 5,
            "max_nodes_per_map": 50,
            "max_collaborators": 0,
            "can_collaborate": False,
            "can_export_pdf": False,
            "commercial_use": False,
            "priority_support": False
        },
        "features": [
            "Hasta 3 mapas activos",
            "Máximo 5 mapas en total",
            "40-50 nodos por mapa",
            "3 layouts disponibles",
            "Exportación PNG",
            "Guardado en la nube"
        ],
        "cta": "Comenzar gratis",
        "popular": False,
        "badge": None,
        "gradient": "from-gray-600 to-gray-700",
        "order": 1
    },
    "personal": {
        "id": "personal",
        "name": "Personal",
        "display_name": "Personal",
        "price": 3,
        "price_display": "$3",
        "currency": "USD",
        "period": "/mes",
        "period_months": 1,
        "description": "Para creadores y emprendedores",
        "badge": "🚀 Early Access",
        "users_min": 1,
        "users_max": 1,
        "limits": {
            "max_active_maps": -1,
            "max_total_maps_created": -1,
            "max_nodes_per_map": -1,
            "max_collaborators": 3,
            "can_collaborate": True,
            "can_export_pdf": True,
            "commercial_use": True,
            "priority_support": True
        },
        "features": [
            "Mapas ilimitados",
            "Nodos ilimitados",
            "Todos los layouts premium",
            "Exportación PDF + PNG",
            "Hasta 3 colaboradores por empresa",
            "Uso comercial incluido",
            "Soporte prioritario"
        ],
        "cta": "Actualizar ahora",
        "popular": True,
        "gradient": "from-blue-600 to-indigo-600",
        "order": 2
    },
    "team": {
        "id": "team",
        "name": "Team",
        "display_name": "Team",
        "price": 8,
        "price_display": "$8",
        "currency": "USD",
        "period": "/usuario/mes",
        "period_months": 1,
        "description": "Para equipos colaborativos",
        "badge": "🚀 Early Access",
        "users_min": 2,
        "users_max": 10,
        "limits": {
            "max_active_maps": -1,
            "max_total_maps_created": -1,
            "max_nodes_per_map": -1,
            "max_collaborators": 10,
            "can_collaborate": True,
            "can_export_pdf": True,
            "commercial_use": True,
            "priority_support": True
        },
        "features": [
            "Todo lo del Plan Personal",
            "2-10 usuarios",
            "Hasta 10 colaboradores por empresa",
            "Colaboración en tiempo real",
            "Mapas compartidos",
            "Roles básicos de equipo",
            "Uso comercial incluido"
        ],
        "cta": "Probar Team",
        "popular": False,
        "gradient": "from-purple-600 to-indigo-600",
        "order": 3
    },
    "business": {
        "id": "business",
        "name": "Business",
        "display_name": "Business",
        "price": 15,
        "price_display": "$15",
        "currency": "USD",
        "period": "/usuario/mes",
        "period_months": 1,
        "description": "Para empresas y organizaciones",
        "badge": "Próximamente",
        "users_min": 10,
        "users_max": -1,
        "limits": {
            "max_active_maps": -1,
            "max_total_maps_created": -1,
            "max_nodes_per_map": -1,
            "max_collaborators": -1,
            "can_collaborate": True,
            "can_export_pdf": True,
            "commercial_use": True,
            "priority_support": True
        },
        "features": [
            "Todo lo del Plan Team",
            "10+ usuarios",
            "Colaboradores ilimitados",
            "Roles avanzados",
            "Control de accesos",
            "Analytics avanzados",
            "Soporte preferente"
        ],
        "cta": "Contactar ventas",
        "popular": False,
        "coming_soon": True,
        "gradient": "from-amber-600 to-orange-600",
        "order": 4
    },
    # Plan interno para administradores
    "admin": {
        "id": "admin",
        "name": "Admin",
        "display_name": "Administrador",
        "price": 0,
        "internal": True,  # No mostrar en landing
        "limits": {
            "max_active_maps": -1,
            "max_total_maps_created": -1,
            "max_nodes_per_map": -1,
            "max_collaborators": -1,
            "can_collaborate": True,
            "can_export_pdf": True,
            "commercial_use": True,
            "priority_support": True
        },
        "order": 99
    }
}

# Plan recomendado para upgrade desde Free
UPGRADE_TARGET_PLAN = "personal"

# Límites por plan (formato simplificado para uso interno)
PLAN_LIMITS = {plan_id: config["limits"] for plan_id, config in PLANS_CONFIG.items()}

# Mapeo de nombres de plan antiguos a nuevos (para compatibilidad)
PLAN_ALIASES = {
    "pro": "personal",  # 'pro' ahora es 'personal'
}

def get_user_plan_limits(user: dict) -> dict:
    """Obtiene los límites del plan del usuario"""
    # Admins siempre tienen plan máximo
    if user.get("role") == "admin":
        return PLAN_LIMITS["admin"]
    plan = user.get("plan", "free")
    # Aplicar alias si existe
    plan = PLAN_ALIASES.get(plan, plan)
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])

class UserResponse(BaseModel):
    username: str
    full_name: str
    role: str = "user"
    plan: str = "free"
    is_pro: bool = False
    email_verified: bool = True
    email: str = ""

class UserProfile(BaseModel):
    """Modelo completo del perfil de usuario"""
    username: str
    nombre: str = ""
    apellidos: str = ""
    email: str = ""
    whatsapp: str = ""
    pais: str = ""
    timezone: str = ""
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class UserProfileUpdate(BaseModel):
    """Modelo para actualizar el perfil"""
    nombre: Optional[str] = None
    apellidos: Optional[str] = None
    email: Optional[str] = None
    whatsapp: Optional[str] = None
    pais: Optional[str] = None
    timezone: Optional[str] = None

class PasswordChange(BaseModel):
    """Modelo para cambio de contraseña"""
    current_password: str
    new_password: str
    confirm_password: str


# ==========================================
# AUTH FUNCTIONS
# ==========================================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

async def get_user(username: str) -> Optional[dict]:
    """Busca un usuario en la base de datos por username"""
    user = await db.users.find_one({"username": username}, {"_id": 0})
    return user

async def authenticate_user(username: str, password: str) -> Optional[dict]:
    user = await get_user(username)
    if not user:
        return None
    if not verify_password(password, user["hashed_password"]):
        return None
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    credentials_exception = HTTPException(
        status_code=401,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Primero intentamos obtener el username directamente del payload
        # (presente en tokens de impersonación)
        username = payload.get("username")
        if username is None:
            # Si no hay username, usamos sub (método tradicional)
            username = payload.get("sub")
        
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await get_user(username)
    if user is None:
        raise credentials_exception
    
    # Si es un token de impersonación, agregar esa información al usuario
    if payload.get("impersonated_by"):
        user["impersonated_by"] = payload.get("impersonated_by")
        user["impersonation_time"] = payload.get("impersonation_time")
    
    return user


# ==========================================
# AUTH ENDPOINTS
# ==========================================

@api_router.post("/auth/login", response_model=Token)
async def login(login_data: LoginRequest):
    user = await authenticate_user(login_data.username, login_data.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Usuario o contraseña incorrectos"
        )
    
    access_token = create_access_token(data={"sub": user["username"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "username": user["username"],
            "full_name": user["full_name"]
        }
    }

@api_router.post("/auth/register", response_model=Token)
async def register(register_data: RegisterRequest, background_tasks: BackgroundTasks):
    """Registrar un nuevo usuario"""
    # Verificar si el username ya existe en la base de datos
    existing_user = await db.users.find_one({"username": register_data.username})
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Este nombre de usuario ya está en uso"
        )
    
    # Verificar si el email ya existe
    existing_email = await db.users.find_one({"email": register_data.email})
    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Este correo electrónico ya está registrado"
        )
    
    # Crear el usuario en la base de datos
    hashed_password = pwd_context.hash(register_data.password)
    full_name = f"{register_data.nombre} {register_data.apellidos}".strip()
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    
    # Generar token de verificación
    verification_token = email_service.generate_verification_token()
    verification_expiry = email_service.get_token_expiry()
    
    new_user = {
        "user_id": user_id,
        "id": user_id,
        "username": register_data.username,
        "email": register_data.email,
        "hashed_password": hashed_password,
        "full_name": full_name,
        "auth_provider": "local",
        "disabled": False,
        # Campos de verificación de email
        "email_verified": False,
        "verification_token": verification_token,
        "verification_token_expiry": verification_expiry,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(new_user)
    
    # Crear perfil del usuario
    user_profile = {
        "username": register_data.username,
        "nombre": register_data.nombre,
        "apellidos": register_data.apellidos,
        "email": register_data.email,
        "whatsapp": "",
        "pais": "",
        "timezone": "America/Lima",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.user_profiles.insert_one(user_profile)
    
    # Si hay un mapa demo, convertirlo en el primer proyecto del usuario
    if register_data.demo_map:
        demo_map = register_data.demo_map
        now = datetime.now(timezone.utc).isoformat()
        
        # Crear el proyecto desde el mapa demo
        new_project = {
            "project_id": f"proj_{uuid.uuid4().hex[:12]}",
            "username": register_data.username,
            "name": demo_map.name or "Mi primer mapa",
            "description": "Mapa creado desde la demo",
            "layout_type": demo_map.layoutType or "mindflow",
            "nodes": [node.dict() for node in demo_map.nodes],
            "created_at": now,
            "updated_at": now,
            "from_demo": True  # Marcar que viene del modo demo
        }
        
        await db.projects.insert_one(new_project)
    
    # === CREAR TABLERO DE PRUEBA PARA ONBOARDING ===
    now = datetime.now(timezone.utc).isoformat()
    board_id = f"board_{uuid.uuid4().hex[:12]}"
    
    # Crear tareas de ejemplo para demostración
    example_tasks = [
        {
            "id": f"card_{uuid.uuid4().hex[:12]}",
            "title": "👋 ¡Bienvenido! Haz clic aquí para ver los detalles",
            "description": "Este es un ejemplo de tarea. Puedes editar el título, añadir descripción, checklists y más.",
            "labels": [{"id": "label_1", "color": "cyan"}],
            "checklist": [
                {"id": "check_1", "text": "Explorar el tablero", "completed": False},
                {"id": "check_2", "text": "Crear mi primera tarea", "completed": False},
                {"id": "check_3", "text": "Arrastrar una tarea a otra columna", "completed": False}
            ],
            "position": 0,
            "created_at": now
        },
        {
            "id": f"card_{uuid.uuid4().hex[:12]}",
            "title": "📝 Arrastra esta tarea a 'En Progreso'",
            "description": "Prueba el drag & drop arrastrando esta tarea a otra columna.",
            "labels": [{"id": "label_2", "color": "yellow"}],
            "position": 1,
            "created_at": now
        }
    ]
    
    example_tasks_progress = [
        {
            "id": f"card_{uuid.uuid4().hex[:12]}",
            "title": "🎯 Tarea en progreso de ejemplo",
            "description": "Las tareas en progreso aparecen aquí.",
            "labels": [{"id": "label_3", "color": "blue"}],
            "priority": "medium",
            "position": 0,
            "created_at": now
        }
    ]
    
    example_tasks_done = [
        {
            "id": f"card_{uuid.uuid4().hex[:12]}",
            "title": "✅ Tarea completada de ejemplo",
            "description": "¡Felicidades! Mueve tus tareas aquí cuando estén listas.",
            "labels": [{"id": "label_4", "color": "green"}],
            "position": 0,
            "created_at": now
        }
    ]
    
    # Crear las 3 listas por defecto con tareas de ejemplo
    default_lists = [
        {
            "id": f"list_{uuid.uuid4().hex[:12]}",
            "title": "Abiertas",
            "color": "#06B6D4",
            "position": 0,
            "cards": example_tasks,
            "created_at": now
        },
        {
            "id": f"list_{uuid.uuid4().hex[:12]}",
            "title": "En Progreso",
            "color": "#3B82F6",
            "position": 1,
            "cards": example_tasks_progress,
            "created_at": now
        },
        {
            "id": f"list_{uuid.uuid4().hex[:12]}",
            "title": "Listo",
            "color": "#8B5CF6",
            "position": 2,
            "cards": example_tasks_done,
            "created_at": now
        }
    ]
    
    onboarding_board = {
        "id": board_id,
        "title": "📋 Tablero de Ejemplo",
        "description": "Este es tu tablero de prueba. Explora las funcionalidades y elimínalo cuando quieras.",
        "background_color": "#06B6D4",
        "owner_username": register_data.username,
        "lists": default_lists,
        "collaborators": [],
        "is_archived": False,
        "is_deleted": False,
        "is_onboarding": True,  # Marcar como tablero de onboarding
        "created_at": now,
        "updated_at": now
    }
    
    await db.boards.insert_one(onboarding_board)
    logger.info(f"📋 Tablero de prueba creado para nuevo usuario: {register_data.username}")
    # === FIN TABLERO DE PRUEBA ===
    
    # === CREAR WORKSPACE PERSONAL ===
    try:
        workspace = await create_personal_workspace(
            db, 
            register_data.username, 
            register_data.email, 
            full_name
        )
        logger.info(f"🏠 Workspace personal creado para {register_data.username}: {workspace['id']}")
        
        # Migrar los recursos recién creados al workspace
        await migrate_user_resources_to_workspace(db, register_data.username, workspace['id'])
    except Exception as e:
        logger.error(f"⚠️ Error creando workspace para {register_data.username}: {e}")
        # No fallar el registro por error en workspace
    # === FIN WORKSPACE PERSONAL ===
    
    # Enviar email de verificación en background
    background_tasks.add_task(
        email_service.send_verification_email,
        register_data.email,
        full_name,
        verification_token
    )
    logger.info(f"📧 Email de verificación programado para {register_data.email}")
    
    # Crear token de acceso
    access_token = create_access_token(data={"sub": register_data.username})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "username": register_data.username,
            "full_name": full_name,
            "email_verified": False
        }
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    # Obtener datos completos del usuario desde la BD
    user = await db.users.find_one({"username": current_user["username"]}, {"_id": 0})
    
    # Determinar el plan (admin siempre tiene plan máximo)
    user_role = user.get("role", "user") if user else "user"
    user_plan = "admin" if user_role == "admin" else user.get("plan", "free") if user else "free"
    
    # Verificar estado de email (usuarios de Google OAuth siempre verificados)
    auth_provider = user.get("auth_provider", "local") if user else "local"
    email_verified = True if auth_provider == "google" else user.get("email_verified", False) if user else False
    
    return {
        "username": current_user["username"],
        "full_name": current_user.get("full_name", ""),
        "role": user_role,
        "plan": user_plan,
        "is_pro": user_plan in ["personal", "pro", "team", "admin"],
        "email_verified": email_verified,
        "email": user.get("email", "") if user else ""
    }

@api_router.post("/auth/logout")
async def logout(response: Response):
    # Limpiar la cookie de sesión de Google OAuth si existe
    response.delete_cookie(
        key="session_token",
        path="/",
        secure=True,
        samesite="none"
    )
    return {"message": "Sesión cerrada exitosamente"}


# ==========================================
# EMAIL VERIFICATION ENDPOINTS
# ==========================================

class VerifyEmailRequest(BaseModel):
    token: str

class ResendVerificationRequest(BaseModel):
    email: str

@api_router.post("/auth/verify-email")
async def verify_email(request: VerifyEmailRequest, background_tasks: BackgroundTasks):
    """
    Verificar el email de un usuario usando el token enviado por correo
    """
    token = request.token
    
    # Buscar usuario con este token
    user = await db.users.find_one({"verification_token": token})
    
    if not user:
        raise HTTPException(
            status_code=400,
            detail="Token de verificación inválido o ya utilizado"
        )
    
    # Verificar si el token ha expirado
    token_expiry = user.get("verification_token_expiry", "")
    if email_service.is_token_expired(token_expiry):
        raise HTTPException(
            status_code=400,
            detail="El token de verificación ha expirado. Solicita uno nuevo."
        )
    
    # Verificar si ya está verificado
    if user.get("email_verified", False):
        return {"success": True, "message": "Tu cuenta ya estaba verificada"}
    
    # Marcar como verificado y eliminar token
    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one(
        {"verification_token": token},
        {
            "$set": {
                "email_verified": True,
                "email_verified_at": now,
                "updated_at": now
            },
            "$unset": {
                "verification_token": "",
                "verification_token_expiry": ""
            }
        }
    )
    
    logger.info(f"✅ Email verificado para usuario: {user.get('username')}")
    
    # Enviar email de bienvenida en background
    background_tasks.add_task(
        email_service.send_welcome_email,
        user.get("email"),
        user.get("full_name", user.get("username"))
    )
    
    return {
        "success": True,
        "message": "¡Tu cuenta ha sido verificada exitosamente!",
        "username": user.get("username")
    }


@api_router.get("/auth/verify-email")
async def verify_email_get(token: str, background_tasks: BackgroundTasks):
    """
    Verificar email via GET (para links directos desde el correo)
    """
    # Buscar usuario con este token
    user = await db.users.find_one({"verification_token": token})
    
    if not user:
        raise HTTPException(
            status_code=400,
            detail="Token de verificación inválido o ya utilizado"
        )
    
    # Verificar si el token ha expirado
    token_expiry = user.get("verification_token_expiry", "")
    if email_service.is_token_expired(token_expiry):
        raise HTTPException(
            status_code=400,
            detail="El token de verificación ha expirado. Solicita uno nuevo."
        )
    
    # Verificar si ya está verificado
    if user.get("email_verified", False):
        return {"success": True, "message": "Tu cuenta ya estaba verificada"}
    
    # Marcar como verificado
    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one(
        {"verification_token": token},
        {
            "$set": {
                "email_verified": True,
                "email_verified_at": now,
                "updated_at": now
            },
            "$unset": {
                "verification_token": "",
                "verification_token_expiry": ""
            }
        }
    )
    
    logger.info(f"✅ Email verificado para usuario: {user.get('username')}")
    
    # Enviar email de bienvenida
    background_tasks.add_task(
        email_service.send_welcome_email,
        user.get("email"),
        user.get("full_name", user.get("username"))
    )
    
    return {
        "success": True,
        "message": "¡Tu cuenta ha sido verificada exitosamente!",
        "username": user.get("username")
    }


@api_router.post("/auth/resend-verification")
async def resend_verification(request: ResendVerificationRequest, background_tasks: BackgroundTasks):
    """
    Reenviar el correo de verificación con rate limiting:
    - Máximo 1 reenvío cada 5 minutos
    - Máximo 5 reenvíos por día
    """
    email = request.email.lower().strip()
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Buscar usuario por email en users collection
    user = await db.users.find_one({"email": email})
    
    # Si no se encuentra, buscar también en user_profiles (para usuarios antiguos)
    if not user:
        profile = await db.user_profiles.find_one({"email": email})
        if profile:
            user = await db.users.find_one({"username": profile.get("username")})
            # Sincronizar el email del perfil a la colección de usuarios
            if user and user.get("email") != email:
                await db.users.update_one(
                    {"username": user.get("username")},
                    {"$set": {"email": email}}
                )
                logger.info(f"📧 Email sincronizado desde perfil para {user.get('username')}: {email}")
    
    if not user:
        # No revelar si el email existe o no por seguridad
        return {
            "success": True,
            "message": "Si el correo existe en nuestro sistema, recibirás un nuevo enlace de verificación."
        }
    
    # Verificar si ya está verificado
    if user.get("email_verified", False):
        return {
            "success": True,
            "already_verified": True,
            "message": "Tu cuenta ya está verificada. Puedes iniciar sesión normalmente."
        }
    
    # ========== RATE LIMITING ==========
    last_sent = user.get("last_verification_sent")
    daily_count = user.get("verification_count_today", 0)
    daily_count_date = user.get("verification_count_date", "")
    
    # Resetear contador si es un nuevo día
    if daily_count_date:
        try:
            count_date = datetime.fromisoformat(daily_count_date.replace('Z', '+00:00'))
            if count_date.date() < now.date():
                daily_count = 0
        except:
            daily_count = 0
    
    # Verificar límite de 5 por día
    if daily_count >= 5:
        raise HTTPException(
            status_code=429,
            detail="Has alcanzado el límite de 5 reenvíos por día. Intenta nuevamente mañana."
        )
    
    # Verificar límite de 5 minutos entre reenvíos
    if last_sent:
        try:
            last_sent_dt = datetime.fromisoformat(last_sent.replace('Z', '+00:00'))
            time_diff = (now - last_sent_dt).total_seconds()
            if time_diff < 300:  # 5 minutos = 300 segundos
                wait_seconds = int(300 - time_diff)
                wait_minutes = wait_seconds // 60
                wait_secs = wait_seconds % 60
                raise HTTPException(
                    status_code=429,
                    detail=f"Debes esperar {wait_minutes}:{wait_secs:02d} minutos antes de solicitar otro reenvío."
                )
        except HTTPException:
            raise
        except:
            pass  # Si hay error parseando la fecha, permitir el reenvío
    
    # ========== GENERAR Y ENVIAR ==========
    new_token = email_service.generate_verification_token()
    new_expiry = email_service.get_token_expiry()
    
    # Actualizar token y contadores en la base de datos
    await db.users.update_one(
        {"username": user.get("username")},
        {
            "$set": {
                "email": email,
                "verification_token": new_token,
                "verification_token_expiry": new_expiry,
                "last_verification_sent": now.isoformat(),
                "verification_count_today": daily_count + 1,
                "verification_count_date": now.isoformat(),
                "updated_at": now.isoformat()
            }
        }
    )
    
    # Enviar email en background
    background_tasks.add_task(
        email_service.send_verification_email,
        email,
        user.get("full_name", user.get("username")),
        new_token
    )
    
    logger.info(f"📧 Reenvío de verificación #{daily_count + 1} programado para {email}")
    
    return {
        "success": True,
        "resends_remaining": 4 - daily_count,
        "message": "Hemos enviado un nuevo enlace de verificación a tu correo."
    }


class UpdateEmailRequest(BaseModel):
    new_email: str

@api_router.post("/auth/update-email")
async def update_email(request: UpdateEmailRequest, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """
    Actualizar el email del usuario y enviar verificación al nuevo email
    """
    new_email = request.new_email.lower().strip()
    
    # Validar formato de email básico
    if "@" not in new_email or "." not in new_email:
        raise HTTPException(status_code=400, detail="Formato de email inválido")
    
    # Verificar que el nuevo email no esté en uso por otro usuario
    existing = await db.users.find_one({"email": new_email, "username": {"$ne": current_user["username"]}})
    if existing:
        raise HTTPException(status_code=400, detail="Este correo ya está registrado por otro usuario")
    
    # Generar nuevo token de verificación
    new_token = email_service.generate_verification_token()
    new_expiry = email_service.get_token_expiry()
    now = datetime.now(timezone.utc).isoformat()
    
    # Actualizar email y token en users collection
    await db.users.update_one(
        {"username": current_user["username"]},
        {
            "$set": {
                "email": new_email,
                "email_verified": False,
                "verification_token": new_token,
                "verification_token_expiry": new_expiry,
                "updated_at": now
            }
        }
    )
    
    # También actualizar en user_profiles para mantener sincronizado
    await db.user_profiles.update_one(
        {"username": current_user["username"]},
        {"$set": {"email": new_email, "updated_at": now}}
    )
    
    # Enviar email de verificación al nuevo email
    background_tasks.add_task(
        email_service.send_verification_email,
        new_email,
        current_user.get("full_name", current_user["username"]),
        new_token
    )
    
    logger.info(f"📧 Email actualizado y verificación enviada para {current_user['username']}: {new_email}")
    
    return {
        "success": True,
        "message": f"Se ha enviado un enlace de verificación a {new_email}",
        "new_email": new_email
    }


@api_router.get("/auth/verification-status")
async def get_verification_status(current_user: dict = Depends(get_current_user)):
    """
    Obtener el estado de verificación del usuario actual
    """
    user = await db.users.find_one({"username": current_user["username"]}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return {
        "email_verified": user.get("email_verified", False),
        "email": user.get("email"),
        "verified_at": user.get("email_verified_at")
    }


# ==========================================
# GOOGLE OAUTH ENDPOINTS (Emergent Auth)
# ==========================================

# ==========================================
# ENDPOINTS DE PLANES (SOURCE OF TRUTH)
# ==========================================

@api_router.get("/plans")
async def get_plans():
    """
    Obtiene la configuración completa de planes.
    Este endpoint es la ÚNICA fuente de verdad para planes y precios.
    Usado por: Landing page, Pop-ups de upgrade, Sistema interno.
    """
    # Filtrar planes internos y ordenar
    public_plans = [
        {
            "id": config["id"],
            "name": config["name"],
            "display_name": config["display_name"],
            "price": config["price"],
            "price_display": config["price_display"],
            "currency": config.get("currency", "USD"),
            "period": config["period"],
            "description": config["description"],
            "badge": config.get("badge"),
            "users_min": config.get("users_min", 1),
            "users_max": config.get("users_max", 1),
            "features": config["features"],
            "cta": config["cta"],
            "popular": config.get("popular", False),
            "coming_soon": config.get("coming_soon", False),
            "gradient": config.get("gradient", "from-gray-600 to-gray-700"),
            "limits": {
                "max_active_maps": config["limits"]["max_active_maps"],
                "max_nodes_per_map": config["limits"]["max_nodes_per_map"],
                "can_collaborate": config["limits"]["can_collaborate"],
                "commercial_use": config["limits"].get("commercial_use", False)
            }
        }
        for plan_id, config in PLANS_CONFIG.items()
        if not config.get("internal", False)
    ]
    
    # Ordenar por el campo 'order'
    public_plans.sort(key=lambda x: PLANS_CONFIG[x["id"]].get("order", 99))
    
    return {
        "plans": public_plans,
        "upgrade_target": UPGRADE_TARGET_PLAN,
        "upgrade_plan": {
            "id": PLANS_CONFIG[UPGRADE_TARGET_PLAN]["id"],
            "name": PLANS_CONFIG[UPGRADE_TARGET_PLAN]["name"],
            "price": PLANS_CONFIG[UPGRADE_TARGET_PLAN]["price"],
            "price_display": PLANS_CONFIG[UPGRADE_TARGET_PLAN]["price_display"],
            "period": PLANS_CONFIG[UPGRADE_TARGET_PLAN]["period"],
            "features": PLANS_CONFIG[UPGRADE_TARGET_PLAN]["features"]
        }
    }

@api_router.get("/plans/{plan_id}")
async def get_plan_by_id(plan_id: str):
    """Obtiene la configuración de un plan específico"""
    # Aplicar alias si existe
    resolved_plan_id = PLAN_ALIASES.get(plan_id, plan_id)
    
    if resolved_plan_id not in PLANS_CONFIG:
        raise HTTPException(status_code=404, detail="Plan no encontrado")
    
    config = PLANS_CONFIG[resolved_plan_id]
    
    if config.get("internal", False):
        raise HTTPException(status_code=404, detail="Plan no encontrado")
    
    return {
        "id": config["id"],
        "name": config["name"],
        "display_name": config["display_name"],
        "price": config["price"],
        "price_display": config["price_display"],
        "currency": config.get("currency", "USD"),
        "period": config["period"],
        "description": config["description"],
        "badge": config.get("badge"),
        "features": config["features"],
        "limits": config["limits"]
    }

# Endpoint para obtener límites del plan
@api_router.get("/user/plan-limits")
async def get_plan_limits(current_user: dict = Depends(get_current_user)):
    """Obtiene los límites del plan del usuario actual"""
    user = await db.users.find_one({"username": current_user["username"]}, {"_id": 0})
    plan_limits = get_user_plan_limits(user or {})
    
    # Contar mapas activos del usuario (solo los no eliminados)
    active_maps = await db.projects.count_documents({
        "username": current_user["username"],
        "isDeleted": {"$ne": True}
    })
    
    # Obtener contador histórico de mapas creados
    total_maps_created = user.get("total_maps_created", 0) if user else 0
    
    # Determinar el plan
    user_role = user.get("role", "user") if user else "user"
    user_plan = "admin" if user_role == "admin" else user.get("plan", "free") if user else "free"
    
    # Calcular mapas restantes
    max_active = plan_limits["max_active_maps"]
    max_total = plan_limits["max_total_maps_created"]
    
    active_remaining = -1 if max_active == -1 else max(0, max_active - active_maps)
    total_remaining = -1 if max_total == -1 else max(0, max_total - total_maps_created)
    
    # El usuario puede crear si tiene espacio en ambos límites
    can_create = (active_remaining == -1 or active_remaining > 0) and (total_remaining == -1 or total_remaining > 0)
    
    return {
        "plan": user_plan,
        "limits": plan_limits,
        "usage": {
            "active_maps": active_maps,
            "active_remaining": active_remaining,
            "total_maps_created": total_maps_created,
            "total_remaining": total_remaining,
            "can_create_map": can_create
        }
    }

class GoogleSessionRequest(BaseModel):
    session_id: str

@api_router.post("/auth/google/session")
async def process_google_session(request: GoogleSessionRequest, response: Response):
    """
    Procesa el session_id de Emergent Auth y crea una sesión local.
    REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    """
    try:
        # Llamar al endpoint de Emergent Auth para obtener los datos del usuario
        async with httpx.AsyncClient() as client:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": request.session_id},
                timeout=10.0
            )
        
        if auth_response.status_code != 200:
            raise HTTPException(
                status_code=401,
                detail="Sesión de Google inválida o expirada"
            )
        
        google_data = auth_response.json()
        email = google_data.get("email")
        name = google_data.get("name", "")
        picture = google_data.get("picture", "")
        session_token = google_data.get("session_token")
        
        if not email or not session_token:
            raise HTTPException(
                status_code=400,
                detail="Datos de sesión incompletos"
            )
        
        # Buscar o crear usuario
        existing_user = await db.users.find_one({"email": email}, {"_id": 0})
        
        if existing_user:
            user_id = existing_user.get("user_id") or existing_user.get("id")
            username = existing_user.get("username")
            full_name = existing_user.get("full_name", name)
            # Actualizar datos si es necesario
            await db.users.update_one(
                {"email": email},
                {"$set": {
                    "full_name": name,
                    "picture": picture,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        else:
            # Crear nuevo usuario
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            username = email.split("@")[0]  # Usar parte del email como username
            
            # Verificar si el username ya existe
            existing_username = await db.users.find_one({"username": username})
            if existing_username:
                username = f"{username}_{uuid.uuid4().hex[:6]}"
            
            full_name = name
            new_user = {
                "user_id": user_id,
                "id": user_id,  # Para compatibilidad
                "username": username,
                "email": email,
                "full_name": name,
                "picture": picture,
                "auth_provider": "google",
                "disabled": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(new_user)
            
            # Crear perfil
            nombre_parts = name.split(" ", 1)
            user_profile = {
                "username": username,
                "nombre": nombre_parts[0] if nombre_parts else "",
                "apellidos": nombre_parts[1] if len(nombre_parts) > 1 else "",
                "email": email,
                "whatsapp": "",
                "pais": "",
                "timezone": "America/Lima",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.user_profiles.insert_one(user_profile)
        
        # Guardar sesión en la base de datos
        await db.user_sessions.delete_many({"user_id": user_id})  # Limpiar sesiones anteriores
        await db.user_sessions.insert_one({
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
            "created_at": datetime.now(timezone.utc)
        })
        
        # Establecer cookie httpOnly
        response.set_cookie(
            key="session_token",
            value=session_token,
            path="/",
            secure=True,
            httponly=True,
            samesite="none",
            max_age=7 * 24 * 60 * 60  # 7 días
        )
        
        # Crear token JWT para compatibilidad con el sistema existente
        access_token = create_access_token(data={"sub": username})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "username": username,
                "full_name": full_name,
                "email": email,
                "picture": picture
            }
        }
        
    except httpx.RequestError as e:
        logging.error(f"Error conectando con Emergent Auth: {e}")
        raise HTTPException(
            status_code=503,
            detail="Error conectando con el servicio de autenticación"
        )

@api_router.get("/auth/google/me")
async def get_google_user(request: Request):
    """
    Verifica la sesión de Google OAuth y devuelve los datos del usuario.
    """
    # Intentar obtener token de cookie primero, luego de header
    session_token = request.cookies.get("session_token")
    
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header[7:]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="No autenticado")
    
    # Buscar sesión en la base de datos
    session = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session:
        raise HTTPException(status_code=401, detail="Sesión no encontrada")
    
    # Verificar expiración
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        await db.user_sessions.delete_one({"session_token": session_token})
        raise HTTPException(status_code=401, detail="Sesión expirada")
    
    # Obtener usuario
    user = await db.users.find_one(
        {"user_id": session["user_id"]},
        {"_id": 0}
    )
    
    if not user:
        # Intentar buscar por id también
        user = await db.users.find_one(
            {"id": session["user_id"]},
            {"_id": 0}
        )
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return {
        "username": user.get("username"),
        "full_name": user.get("full_name"),
        "email": user.get("email"),
        "picture": user.get("picture")
    }


# ==========================================
# USER PROFILE ENDPOINTS
# ==========================================

@api_router.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Obtener perfil completo del usuario"""
    username = current_user["username"]
    
    # Buscar perfil en MongoDB
    profile = await db.user_profiles.find_one({"username": username}, {"_id": 0})
    
    if profile:
        return {
            "username": username,
            "nombre": profile.get("nombre", ""),
            "apellidos": profile.get("apellidos", ""),
            "email": profile.get("email", ""),
            "whatsapp": profile.get("whatsapp", ""),
            "pais": profile.get("pais", ""),
            "timezone": profile.get("timezone", "America/Lima"),
            "created_at": profile.get("created_at"),
            "updated_at": profile.get("updated_at")
        }
    
    # Si no existe perfil, buscar datos básicos del usuario en la BD
    user_data = await db.users.find_one({"username": username}, {"_id": 0})
    if user_data:
        full_name = user_data.get("full_name", "")
        nombre_parts = full_name.split(" ", 1) if full_name else ["", ""]
        
        return {
            "username": username,
            "nombre": nombre_parts[0] if len(nombre_parts) > 0 else "",
            "apellidos": nombre_parts[1] if len(nombre_parts) > 1 else "",
            "email": user_data.get("email", ""),
            "whatsapp": "",
            "pais": "",
            "timezone": "America/Lima",
            "created_at": user_data.get("created_at"),
            "updated_at": user_data.get("updated_at")
        }
    
    # Si no hay datos, devolver perfil vacío
    return {
        "username": username,
        "nombre": "",
        "apellidos": "",
        "email": "",
        "whatsapp": "",
        "pais": "",
        "timezone": "America/Lima",
        "created_at": None,
        "updated_at": None
    }

@api_router.put("/profile")
async def update_profile(
    profile_data: UserProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Actualizar perfil del usuario"""
    username = current_user["username"]
    now = datetime.now(timezone.utc).isoformat()
    
    # Preparar datos para actualizar
    update_data = {"updated_at": now}
    
    if profile_data.nombre is not None:
        update_data["nombre"] = profile_data.nombre.strip()
    if profile_data.apellidos is not None:
        update_data["apellidos"] = profile_data.apellidos.strip()
    if profile_data.email is not None:
        update_data["email"] = profile_data.email.strip().lower()
    if profile_data.whatsapp is not None:
        # Limpiar y validar formato de WhatsApp
        whatsapp = profile_data.whatsapp.strip().replace(" ", "")
        if whatsapp and not whatsapp.startswith("+"):
            whatsapp = "+" + whatsapp
        update_data["whatsapp"] = whatsapp
    if profile_data.pais is not None:
        update_data["pais"] = profile_data.pais.strip()
    if profile_data.timezone is not None:
        update_data["timezone"] = profile_data.timezone.strip()
    
    # Verificar si el perfil existe
    existing = await db.user_profiles.find_one({"username": username})
    
    if existing:
        await db.user_profiles.update_one(
            {"username": username},
            {"$set": update_data}
        )
    else:
        # Crear nuevo perfil
        update_data["username"] = username
        update_data["created_at"] = now
        await db.user_profiles.insert_one(update_data)
    
    logger.info(f"Perfil actualizado para {username}")
    
    # Devolver perfil actualizado
    updated_profile = await db.user_profiles.find_one({"username": username}, {"_id": 0})
    return {
        "message": "Perfil actualizado correctamente",
        "profile": updated_profile
    }

@api_router.put("/profile/password")
async def change_password(
    password_data: PasswordChange,
    current_user: dict = Depends(get_current_user)
):
    """Cambiar contraseña del usuario"""
    username = current_user["username"]
    
    # Validar que las contraseñas nuevas coincidan
    if password_data.new_password != password_data.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="Las contraseñas nuevas no coinciden"
        )
    
    # Validar longitud mínima
    if len(password_data.new_password) < 6:
        raise HTTPException(
            status_code=400,
            detail="La contraseña debe tener al menos 6 caracteres"
        )
    
    # Verificar contraseña actual desde la base de datos
    user = await db.users.find_one({"username": username}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if not verify_password(password_data.current_password, user["hashed_password"]):
        raise HTTPException(
            status_code=400,
            detail="La contraseña actual es incorrecta"
        )
    
    # Hashear nueva contraseña
    new_hashed = pwd_context.hash(password_data.new_password)
    
    # Actualizar en la base de datos
    await db.users.update_one(
        {"username": username},
        {
            "$set": {
                "hashed_password": new_hashed,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    logger.info(f"Contraseña cambiada para {username}")
    return {"message": "Contraseña actualizada correctamente"}

# Endpoints legacy para compatibilidad
@api_router.put("/auth/profile/whatsapp")
async def update_whatsapp_number_legacy(
    whatsapp_number: str,
    current_user: dict = Depends(get_current_user)
):
    """Legacy: Actualizar solo número de WhatsApp"""
    profile_update = UserProfileUpdate(whatsapp=whatsapp_number)
    return await update_profile(profile_update, current_user)

@api_router.get("/auth/profile/whatsapp")
async def get_whatsapp_number_legacy(current_user: dict = Depends(get_current_user)):
    """Legacy: Obtener solo número de WhatsApp"""
    profile = await get_profile(current_user)
    return {"whatsapp": profile.get("whatsapp", "")}


# ==========================================
# REMINDER MODELS
# ==========================================

class ReminderCreate(BaseModel):
    # Campos para recordatorios de nodos/proyectos (opcionales)
    type: Optional[str] = None  # 'node', 'project', or None for simple reminders
    node_id: Optional[str] = None
    node_text: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    scheduled_date: Optional[str] = None  # ISO format date (legacy)
    scheduled_time: Optional[str] = None  # HH:MM format (legacy)
    message: Optional[str] = None
    channel: str = "email"  # 'whatsapp' or 'email' - default changed to email
    
    # Campos para recordatorios de calendario/agenda
    title: Optional[str] = None
    description: Optional[str] = None
    reminder_date: Optional[str] = None  # ISO format datetime (new unified field)
    
    # Campos para notificación por email
    notify_by_email: bool = True  # Activar notificación por email
    use_account_email: bool = True  # Usar email de la cuenta o uno personalizado
    custom_email: Optional[str] = None  # Email personalizado para este recordatorio
    notify_before: str = "15min"  # 'now', '5min', '15min', '1hour'

class ReminderResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    type: Optional[str] = None
    node_id: Optional[str] = None
    node_text: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    scheduled_datetime: Optional[str] = None
    message: Optional[str] = None
    channel: Optional[str] = None
    status: str = "pending"  # 'pending', 'sent', 'failed', 'completed'
    created_at: str
    sent_at: Optional[str] = None
    seen: bool = False
    seen_at: Optional[str] = None
    username: str
    
    # Campos para recordatorios de calendario/agenda
    title: Optional[str] = None
    description: Optional[str] = None
    reminder_date: Optional[str] = None
    is_completed: bool = False
    
    # Campos para notificación por email
    notify_by_email: bool = True
    use_account_email: bool = True
    custom_email: Optional[str] = None
    notify_before: str = "15min"
    email_notification_time: Optional[str] = None
    email_sent: bool = False
    email_sent_at: Optional[str] = None
    
    # Estado de notificación: 'pending', 'triggered', 'read'
    notification_status: str = "pending"

class ReminderUpdate(BaseModel):
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    message: Optional[str] = None
    channel: Optional[str] = None
    # Campos adicionales para calendario
    title: Optional[str] = None
    description: Optional[str] = None
    reminder_date: Optional[str] = None
    is_completed: Optional[bool] = None
    # Campos para notificación por email
    notify_by_email: Optional[bool] = None
    use_account_email: Optional[bool] = None
    custom_email: Optional[str] = None
    notify_before: Optional[str] = None
    # Estado de notificación
    notification_status: Optional[str] = None  # 'pending', 'triggered', 'read'


# ==========================================
# TWILIO WHATSAPP FUNCTIONS
# ==========================================

def generate_twiml_response(message: str) -> str:
    """Generar respuesta TwiML XML para Twilio"""
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>{message}</Message>
</Response>'''


async def send_whatsapp_message(phone_number: str, message: str, content_sid: str = None, content_variables: dict = None) -> dict:
    """
    Enviar mensaje por Twilio WhatsApp API usando SIEMPRE una plantilla aprobada.
    
    IMPORTANTE: WhatsApp Business requiere plantillas aprobadas para mensajes
    fuera de la ventana de 24 horas. Esta función SIEMPRE usa ContentSid.
    
    Args:
        phone_number: Número de WhatsApp del destinatario
        message: Texto del mensaje (usado como variable {{1}} si no hay content_variables)
        content_sid: ID de la plantilla de Twilio Content Template (ej: HX...)
        content_variables: Variables para la plantilla (ej: {"1": "valor1", "2": "valor2"})
    """
    
    # Obtener el Template SID (OBLIGATORIO)
    twilio_content_sid = content_sid or os.environ.get("TWILIO_TEMPLATE_SID")
    
    # Si no hay configuración de Twilio, simular envío
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not TWILIO_WHATSAPP_NUMBER:
        logger.info("=" * 60)
        logger.info("📱 [SIMULACIÓN WHATSAPP - TWILIO] Notificación de recordatorio")
        logger.info(f"📞 Destinatario: {phone_number}")
        logger.info(f"📝 Mensaje: {message}")
        logger.info(f"📋 Template SID: {twilio_content_sid or 'N/A'}")
        logger.info("✅ Estado: ENVIADO (simulado - Twilio no configurado)")
        logger.info("=" * 60)
        return {
            "success": True,
            "simulated": True,
            "message": "Mensaje simulado (Twilio WhatsApp no configurado)"
        }
    
    # VALIDACIÓN: Template SID es OBLIGATORIO
    if not twilio_content_sid:
        error_msg = "TWILIO_TEMPLATE_SID no está configurado. WhatsApp Business requiere una plantilla aprobada."
        logger.error(f"❌ [WHATSAPP] {error_msg}")
        return {"success": False, "error": error_msg}
    
    try:
        # Twilio API URL
        url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
        
        # Formatear número para Twilio (whatsapp:+1234567890)
        to_number = phone_number if phone_number.startswith("whatsapp:") else f"whatsapp:{phone_number}"
        
        # Construir variables para la plantilla
        if content_variables:
            template_vars = content_variables
        else:
            # Variables por defecto: usar el mensaje como variable {{1}}
            template_vars = {"1": message[:1024]}
        
        # Payload para Twilio - SIEMPRE con ContentSid (NUNCA con Body)
        payload = {
            "From": TWILIO_WHATSAPP_NUMBER,
            "To": to_number,
            "ContentSid": twilio_content_sid,
            "ContentVariables": json.dumps(template_vars)
        }
        
        logger.info(f"📱 [WHATSAPP] Enviando con plantilla: {twilio_content_sid}")
        logger.info(f"📱 [WHATSAPP] Variables: {template_vars}")
        
        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(
                url,
                data=payload,
                auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            )
            
            if response.status_code in [200, 201]:
                result = response.json()
                logger.info(f"✅ WhatsApp enviado via Twilio. SID: {result.get('sid')}")
                return {"success": True, "response": result, "sid": result.get("sid")}
            else:
                error_detail = response.text
                logger.error(f"❌ Twilio API error: {response.status_code} - {error_detail}")
                return {"success": False, "error": error_detail, "status_code": response.status_code}
                
    except Exception as e:
        logger.error(f"Error sending WhatsApp via Twilio: {str(e)}")
        return {"success": False, "error": str(e)}


# ==========================================
# REMINDER SCHEDULER
# ==========================================

scheduler_running = False

async def check_and_send_reminders():
    """Verificar y enviar recordatorios pendientes (WhatsApp/Email)"""
    global scheduler_running
    scheduler_running = True
    logger.info("🚀 [SCHEDULER] Iniciando scheduler de recordatorios...")
    
    while scheduler_running:
        try:
            now = datetime.now(timezone.utc)
            now_iso = now.isoformat()
            
            # Buscar recordatorios pendientes que ya deberían enviarse
            pending_reminders = await db.reminders.find({
                "status": "pending",
                "scheduled_datetime": {"$lte": now_iso}
            }, {"_id": 0}).to_list(100)
            
            if pending_reminders:
                logger.info(f"📬 [SCHEDULER] Encontrados {len(pending_reminders)} recordatorio(s) pendiente(s) para procesar")
            
            for reminder in pending_reminders:
                try:
                    username = reminder["username"]
                    channel = reminder.get("channel", "email")  # Default: email
                    reminder_id = reminder.get("id", "unknown")[:8]
                    
                    logger.info(f"⏳ [SCHEDULER] Procesando recordatorio {reminder_id}... (canal: {channel}, usuario: {username})")
                    
                    # Datos para el mensaje
                    project_name = reminder.get('project_name', 'Sin nombre')
                    node_text = reminder.get('node_text', 'Sin nombre')
                    user_message = reminder.get('message', '')
                    reminder_type = reminder.get("type")
                    
                    # Construir mensaje base (para texto libre o fallback)
                    if reminder_type == "node":
                        message = "🔔 Recordatorio de MindoraMap\n\n"
                        message += f"📁 Proyecto: {project_name}\n"
                        message += f"📌 Nodo: {node_text}\n\n"
                        message += f"📝 {user_message}"
                    else:
                        message = "🔔 Recordatorio de MindoraMap\n\n"
                        message += f"📁 Proyecto: {project_name}\n\n"
                        message += f"📝 {user_message}"
                    
                    result = {"success": False, "error": "Canal no configurado"}
                    
                    if channel == "whatsapp":
                        # ENVÍO POR WHATSAPP
                        # Buscar número en MongoDB (user_profiles)
                        profile = await db.user_profiles.find_one({"username": username}, {"_id": 0})
                        phone_number = profile.get("whatsapp") if profile else None
                        
                        # Si no hay en perfil, buscar en la colección de usuarios
                        if not phone_number:
                            user = await db.users.find_one({"username": username}, {"_id": 0})
                            phone_number = user.get("whatsapp", "") if user else ""
                        
                        if not phone_number:
                            logger.warning(f"⚠️ [SCHEDULER] Usuario {username} no tiene WhatsApp configurado")
                            result = {"success": False, "error": "No hay número de WhatsApp configurado"}
                        else:
                            logger.info(f"📱 [SCHEDULER] Enviando WhatsApp a {phone_number}...")
                            
                            # Variables para la plantilla de Twilio
                            # La plantilla debe tener variables {{1}}, {{2}}, {{3}} para:
                            # 1 = Proyecto, 2 = Nodo/Tarea, 3 = Mensaje
                            content_variables = {
                                "1": project_name[:100],
                                "2": node_text[:100] if reminder_type == "node" else "Recordatorio",
                                "3": user_message[:500] if user_message else "Sin mensaje adicional"
                            }
                            
                            # Enviar mensaje por WhatsApp (con plantilla si está configurada)
                            result = await send_whatsapp_message(
                                phone_number, 
                                message,
                                content_variables=content_variables
                            )
                            
                    elif channel == "email":
                        # ENVÍO POR EMAIL (Pendiente de implementar con servicio de email)
                        # Por ahora, marcar como enviado simulado
                        logger.info(f"📧 [EMAIL REMINDER] Usuario: {username}, Mensaje: {message[:50]}...")
                        result = {"success": True, "simulated": True, "message": "Email reminder (simulado - usar WhatsApp para envío real)"}
                    
                    # Actualizar estado del recordatorio
                    new_status = "sent" if result.get("success") else "failed"
                    await db.reminders.update_one(
                        {"id": reminder["id"]},
                        {
                            "$set": {
                                "status": new_status,
                                "sent_at": datetime.now(timezone.utc).isoformat(),
                                "send_result": result,
                                "channel_used": channel
                            }
                        }
                    )
                    
                    logger.info(f"✅ [SCHEDULER] Recordatorio {reminder['id'][:8]}... [{channel}] → {new_status}")
                    
                except Exception as e:
                    logger.error(f"❌ [SCHEDULER] Error procesando recordatorio {reminder.get('id', 'unknown')[:8]}...: {str(e)}")
            
        except Exception as e:
            logger.error(f"❌ [SCHEDULER] Error general en scheduler: {str(e)}")
        
        # Esperar 30 segundos entre ciclos
        await asyncio.sleep(30)


email_reminder_scheduler_running = False

def parse_datetime_safe(date_str: str) -> Optional[datetime]:
    """Parsear fecha ISO de forma segura, manejando diferentes formatos"""
    if not date_str:
        return None
    try:
        # Reemplazar Z por +00:00 para compatibilidad
        date_str = date_str.replace('Z', '+00:00')
        dt = datetime.fromisoformat(date_str)
        # Si no tiene timezone, asumir UTC
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception as e:
        logger.warning(f"⚠️ Error parseando fecha '{date_str}': {e}")
        return None

async def check_and_send_email_reminders():
    """Verificar y enviar notificaciones de recordatorios por email"""
    global email_reminder_scheduler_running
    email_reminder_scheduler_running = True
    
    logger.info("🚀 [Email Scheduler] Iniciando scheduler de emails de recordatorios...")
    
    while email_reminder_scheduler_running:
        try:
            now = datetime.now(timezone.utc)
            
            # Buscar TODOS los recordatorios con notificación por email pendiente
            # La comparación de fechas la hacemos en Python para evitar problemas de formato
            all_pending = await db.reminders.find({
                "notify_by_email": True,
                "email_sent": {"$ne": True},
                "is_completed": {"$ne": True}
            }, {"_id": 0}).to_list(100)
            
            if all_pending:
                logger.info(f"📋 [Email Scheduler] Evaluando {len(all_pending)} recordatorios pendientes...")
            
            for reminder in all_pending:
                try:
                    reminder_id = reminder.get("id", "unknown")
                    title = reminder.get("title", "Sin título")
                    email_notification_time_str = reminder.get("email_notification_time")
                    
                    # Si no tiene tiempo de notificación, usar reminder_date
                    if not email_notification_time_str:
                        email_notification_time_str = reminder.get("reminder_date")
                    
                    if not email_notification_time_str:
                        logger.warning(f"⚠️ [Email Scheduler] Recordatorio {reminder_id} ({title}): Sin fecha de notificación configurada")
                        continue
                    
                    # Parsear la fecha de notificación
                    notification_dt = parse_datetime_safe(email_notification_time_str)
                    if not notification_dt:
                        logger.warning(f"⚠️ [Email Scheduler] Recordatorio {reminder_id} ({title}): Fecha inválida: {email_notification_time_str}")
                        continue
                    
                    # Comparar fechas como datetime objects
                    time_diff = (notification_dt - now).total_seconds()
                    
                    # Log de evaluación
                    if time_diff > 0:
                        mins_remaining = int(time_diff / 60)
                        logger.debug(f"⏳ [Email Scheduler] Recordatorio '{title}' - Faltan {mins_remaining} minutos para notificar")
                        continue
                    
                    # ¡Es hora de enviar!
                    logger.info(f"🔔 [Email Scheduler] Evaluando recordatorio '{title}' (ID: {reminder_id[:8]}...) — Hora notificación: {notification_dt.isoformat()}")
                    
                    username = reminder.get("username")
                    
                    # Determinar a qué email enviar
                    recipient_email = None
                    recipient_name = username
                    
                    if reminder.get("use_account_email", True):
                        # Buscar email del usuario
                        user = await db.users.find_one({"username": username}, {"_id": 0})
                        if user:
                            recipient_email = user.get("email")
                            recipient_name = user.get("full_name", username)
                            logger.info(f"📧 [Email Scheduler] Usando email de cuenta: {recipient_email}")
                    else:
                        # Usar email personalizado
                        recipient_email = reminder.get("custom_email")
                        logger.info(f"📧 [Email Scheduler] Usando email personalizado: {recipient_email}")
                    
                    if not recipient_email:
                        logger.warning(f"⚠️ [Email Scheduler] Recordatorio {reminder_id} ({title}): No se encontró email para usuario '{username}' — NO SE ENVIÓ")
                        # Marcar como enviado para evitar reintentos infinitos
                        await db.reminders.update_one(
                            {"id": reminder_id},
                            {"$set": {"email_sent": True, "email_sent_at": now.isoformat(), "email_send_error": "No email found"}}
                        )
                        continue
                    
                    # ¡ENVIAR EMAIL!
                    logger.info(f"📤 [Email Scheduler] Enviando email a {recipient_email} — Recordatorio: '{title}'")
                    
                    result = await reminder_email_service.send_reminder_email(
                        recipient_email=recipient_email,
                        recipient_name=recipient_name,
                        title=title,
                        description=reminder.get("description", ""),
                        reminder_date=reminder.get("reminder_date", "")
                    )
                    
                    # Actualizar estado del recordatorio
                    if result.get("success"):
                        await db.reminders.update_one(
                            {"id": reminder_id},
                            {
                                "$set": {
                                    "email_sent": True,
                                    "email_sent_at": now.isoformat(),
                                    "email_result": result
                                }
                            }
                        )
                        logger.info(f"✅ [Email Scheduler] Email enviado correctamente: '{title}' -> {recipient_email}")
                    else:
                        # Guardar error pero no marcar como enviado para reintentar
                        await db.reminders.update_one(
                            {"id": reminder_id},
                            {
                                "$set": {
                                    "email_send_error": result.get("error"),
                                    "email_last_attempt": now.isoformat()
                                }
                            }
                        )
                        logger.error(f"❌ [Email Scheduler] Error enviando email — Recordatorio: '{title}' — Error: {result.get('error')}")
                        
                except Exception as e:
                    logger.error(f"❌ [Email Scheduler] Error procesando recordatorio {reminder.get('id')}: {str(e)}")
            
        except Exception as e:
            logger.error(f"❌ [Email Scheduler] Error general en scheduler: {str(e)}")
        
        # Verificar cada 15 segundos (más frecuente para mejor precisión)
        await asyncio.sleep(15)


async def start_scheduler():
    """Iniciar el scheduler de recordatorios"""
    # Scheduler de recordatorios WhatsApp (existente)
    asyncio.create_task(check_and_send_reminders())
    logger.info("✅ Scheduler de recordatorios WhatsApp iniciado")
    
    # Scheduler de recordatorios de verificación de email
    reminder_scheduler.start_reminder_scheduler(db)
    logger.info("✅ Scheduler de recordatorios de verificación de email iniciado")
    
    # Scheduler de emails de recordatorios de calendario
    asyncio.create_task(check_and_send_email_reminders())
    logger.info("✅ Scheduler de emails de recordatorios de calendario iniciado")
    
    # Scheduler de expiración de planes
    asyncio.create_task(check_plan_expirations())
    logger.info("✅ Scheduler de expiración de planes iniciado")


# Flag para scheduler de expiración de planes
plan_expiration_scheduler_running = False

async def check_plan_expirations():
    """Verificar y procesar planes expirados cada hora"""
    global plan_expiration_scheduler_running
    plan_expiration_scheduler_running = True
    
    logger.info("🚀 [Plan Expiration] Iniciando scheduler de expiración de planes...")
    
    while plan_expiration_scheduler_running:
        try:
            now = datetime.now(timezone.utc)
            now_str = now.isoformat()
            
            # Buscar usuarios con planes que tienen fecha de expiración pasada
            # y que fueron asignados manualmente (plan_source = manual_admin)
            expired_users = await db.users.find({
                "plan_expires_at": {"$ne": None, "$lte": now_str},
                "plan": {"$ne": "free"},  # Solo procesar si no es ya free
                "plan_source": "manual_admin"
            }, {"_id": 0, "username": 1, "email": 1, "plan": 1, "plan_expires_at": 1}).to_list(100)
            
            if expired_users:
                logger.info(f"⏰ [Plan Expiration] Encontrados {len(expired_users)} planes expirados")
            
            for user in expired_users:
                username = user.get("username")
                previous_plan = user.get("plan")
                
                try:
                    # Revertir plan a free
                    await db.users.update_one(
                        {"username": username},
                        {
                            "$set": {
                                "plan": "free",
                                "plan_source": "system",
                                "plan_override": False,
                                "is_pro": False,
                                "plan_expires_at": None,
                                "plan_expired_at": now_str,
                                "updated_at": now_str
                            }
                        }
                    )
                    
                    # Crear registro de auditoría
                    audit_record = {
                        "id": f"audit_{uuid.uuid4().hex[:12]}",
                        "type": "plan_expiration",
                        "target_username": username,
                        "target_email": user.get("email"),
                        "admin_username": "system",
                        "previous_plan": previous_plan,
                        "new_plan": "free",
                        "previous_expires_at": user.get("plan_expires_at"),
                        "new_expires_at": None,
                        "reason": "Plan expired automatically",
                        "timestamp": now_str
                    }
                    await db.admin_audit_log.insert_one(audit_record)
                    
                    logger.info(f"✅ [Plan Expiration] Plan de {username} expirado: {previous_plan} → free")
                    
                except Exception as user_error:
                    logger.error(f"❌ [Plan Expiration] Error procesando {username}: {str(user_error)}")
            
        except Exception as e:
            logger.error(f"❌ [Plan Expiration] Error en scheduler: {str(e)}")
        
        # Verificar cada hora
        await asyncio.sleep(3600)


# ==========================================
# REMINDER ENDPOINTS
# ==========================================

@api_router.post("/reminders", response_model=ReminderResponse)
async def create_reminder(
    reminder_data: ReminderCreate,
    current_user: dict = Depends(get_current_user)
):
    """Crear un nuevo recordatorio (para nodos/proyectos o calendario simple)"""
    
    # Obtener zona horaria del usuario desde su perfil
    user_profile = await db.user_profiles.find_one({"username": current_user["username"]}, {"_id": 0})
    user_timezone_str = user_profile.get("timezone", "America/Lima") if user_profile else "America/Lima"
    
    # Determinar si es un recordatorio de proyecto/nodo o de calendario
    is_project_reminder = reminder_data.project_id is not None
    
    # Para recordatorios de proyecto, usar scheduled_date y scheduled_time
    if is_project_reminder:
        # Crear datetime en la zona horaria del usuario
        local_datetime_str = f"{reminder_data.scheduled_date}T{reminder_data.scheduled_time}:00"
        
        try:
            # Parsear como fecha/hora local del usuario
            user_tz = ZoneInfo(user_timezone_str)
            local_dt = datetime.fromisoformat(local_datetime_str)
            local_dt = local_dt.replace(tzinfo=user_tz)
            
            # Convertir a UTC para el scheduler
            utc_dt = local_dt.astimezone(timezone.utc)
            scheduled_datetime = utc_dt.isoformat()
            reminder_date = scheduled_datetime
            
            logger.info(f"📅 [TIMEZONE] Usuario: {user_timezone_str}")
            logger.info(f"📅 [TIMEZONE] Hora local: {local_datetime_str}")
            logger.info(f"📅 [TIMEZONE] Hora UTC: {scheduled_datetime}")
        except Exception as e:
            logger.error(f"Error convirtiendo timezone: {e}")
            # Fallback: asumir que ya está en UTC
            scheduled_datetime = f"{reminder_data.scheduled_date}T{reminder_data.scheduled_time}:00"
            reminder_date = scheduled_datetime
    else:
        # Para recordatorios de calendario, usar reminder_date directamente
        scheduled_datetime = reminder_data.reminder_date
        reminder_date = reminder_data.reminder_date
    
    # Calcular cuándo debe enviarse la notificación por email
    email_notification_time = None
    if reminder_data.notify_by_email and reminder_date:
        email_notification_time = reminder_email_service.calculate_notification_time(
            reminder_date, 
            reminder_data.notify_before
        ).isoformat()
    
    reminder = {
        "id": str(uuid.uuid4()),
        # Campos de proyecto/nodo
        "type": reminder_data.type or "calendar",
        "node_id": reminder_data.node_id,
        "node_text": reminder_data.node_text,
        "project_id": reminder_data.project_id,
        "project_name": reminder_data.project_name,
        "scheduled_date": reminder_data.scheduled_date,
        "scheduled_time": reminder_data.scheduled_time,
        "scheduled_datetime": scheduled_datetime,
        "message": reminder_data.message,
        "channel": reminder_data.channel if is_project_reminder else None,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "sent_at": None,
        "seen": False,
        "seen_at": None,
        "username": current_user["username"],
        # Campos de calendario
        "title": reminder_data.title or reminder_data.message,
        "description": reminder_data.description,
        "reminder_date": reminder_date,
        "is_completed": False,
        # Campos para notificación por email
        "notify_by_email": reminder_data.notify_by_email,
        "use_account_email": reminder_data.use_account_email,
        "custom_email": reminder_data.custom_email,
        "notify_before": reminder_data.notify_before,
        "email_notification_time": email_notification_time,  # Cuándo enviar el email
        "email_sent": False,
        "email_sent_at": None,
        # Estado de notificación (anti-spam)
        "notification_status": "pending"
    }
    
    await db.reminders.insert_one(reminder)
    
    logger.info(f"📅 [CREATE REMINDER] ============================================")
    logger.info(f"📅 [CREATE REMINDER] Título: {reminder['title']}")
    logger.info(f"📅 [CREATE REMINDER] reminder_date: {reminder_date}")
    logger.info(f"📅 [CREATE REMINDER] notify_by_email: {reminder_data.notify_by_email}")
    logger.info(f"📅 [CREATE REMINDER] notify_before: {reminder_data.notify_before}")
    logger.info(f"📅 [CREATE REMINDER] email_notification_time: {email_notification_time}")
    logger.info(f"📅 [CREATE REMINDER] use_account_email: {reminder_data.use_account_email}")
    logger.info(f"📅 [CREATE REMINDER] custom_email: {reminder_data.custom_email}")
    logger.info(f"📅 [CREATE REMINDER] ============================================")
    
    return reminder

@api_router.get("/reminders", response_model=List[ReminderResponse])
async def get_reminders(
    current_user: dict = Depends(get_current_user),
    node_id: Optional[str] = None,
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    seen: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100
):
    """Obtener recordatorios del usuario con paginación"""
    
    query = {"username": current_user["username"]}
    
    if node_id:
        query["node_id"] = node_id
    if project_id:
        query["project_id"] = project_id
    if status:
        query["status"] = status
    if seen is not None:
        query["seen"] = seen
    
    reminders = await db.reminders.find(
        query, 
        {"_id": 0}
    ).sort("sent_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Asegurar que todos los recordatorios tengan los campos necesarios
    for reminder in reminders:
        if "seen" not in reminder:
            reminder["seen"] = False
        if "seen_at" not in reminder:
            reminder["seen_at"] = None
        if "notification_status" not in reminder:
            reminder["notification_status"] = "pending"
        if "is_completed" not in reminder:
            reminder["is_completed"] = False
    
    return reminders

@api_router.get("/reminders/{reminder_id}", response_model=ReminderResponse)
async def get_reminder(
    reminder_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener un recordatorio específico"""
    
    reminder = await db.reminders.find_one(
        {"id": reminder_id, "username": current_user["username"]},
        {"_id": 0}
    )
    
    if not reminder:
        raise HTTPException(status_code=404, detail="Recordatorio no encontrado")
    
    return reminder

@api_router.put("/reminders/{reminder_id}", response_model=ReminderResponse)
async def update_reminder(
    reminder_id: str,
    update_data: ReminderUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Actualizar un recordatorio"""
    
    reminder = await db.reminders.find_one(
        {"id": reminder_id, "username": current_user["username"]},
        {"_id": 0}
    )
    
    if not reminder:
        raise HTTPException(status_code=404, detail="Recordatorio no encontrado")
    
    update_dict = {}
    
    # Campos de proyecto/nodo
    if update_data.scheduled_date:
        update_dict["scheduled_date"] = update_data.scheduled_date
    if update_data.scheduled_time:
        update_dict["scheduled_time"] = update_data.scheduled_time
    if update_data.message:
        update_dict["message"] = update_data.message
    if update_data.channel:
        update_dict["channel"] = update_data.channel
    
    # Campos de calendario
    if update_data.title is not None:
        update_dict["title"] = update_data.title
    if update_data.description is not None:
        update_dict["description"] = update_data.description
    if update_data.reminder_date is not None:
        update_dict["reminder_date"] = update_data.reminder_date
        update_dict["scheduled_datetime"] = update_data.reminder_date
    if update_data.is_completed is not None:
        update_dict["is_completed"] = update_data.is_completed
        if update_data.is_completed:
            update_dict["status"] = "completed"
    
    # Estado de notificación (anti-spam)
    if update_data.notification_status is not None:
        update_dict["notification_status"] = update_data.notification_status
    
    # Campos para notificación por email
    if update_data.notify_by_email is not None:
        update_dict["notify_by_email"] = update_data.notify_by_email
    if update_data.use_account_email is not None:
        update_dict["use_account_email"] = update_data.use_account_email
    if update_data.custom_email is not None:
        update_dict["custom_email"] = update_data.custom_email
    if update_data.notify_before is not None:
        update_dict["notify_before"] = update_data.notify_before
        
        # Recalcular email_notification_time si cambió notify_before
        if update_data.notify_by_email is not False:  # Solo si email está activado
            reminder_date = update_data.reminder_date or reminder.get("reminder_date")
            if reminder_date:
                try:
                    from datetime import datetime, timezone, timedelta
                    reminder_time = datetime.fromisoformat(reminder_date.replace('Z', '+00:00'))
                    
                    # Calcular tiempo de notificación basado en notify_before
                    if update_data.notify_before == "now":
                        notification_time = reminder_time
                    elif update_data.notify_before == "5min":
                        notification_time = reminder_time - timedelta(minutes=5)
                    elif update_data.notify_before == "15min":
                        notification_time = reminder_time - timedelta(minutes=15)
                    elif update_data.notify_before == "1hour":
                        notification_time = reminder_time - timedelta(hours=1)
                    else:
                        notification_time = reminder_time - timedelta(minutes=15)  # Default
                    
                    update_dict["email_notification_time"] = notification_time.isoformat()
                except Exception as e:
                    logger.warning(f"Error calculating email notification time: {e}")
    
    # Si se desactiva notify_by_email, limpiar campos relacionados
    if update_data.notify_by_email is False:
        update_dict["email_notification_time"] = None
    
    # Recalcular scheduled_datetime si cambió fecha u hora (para recordatorios de proyecto)
    if update_data.scheduled_date or update_data.scheduled_time:
        new_date = update_data.scheduled_date or reminder.get("scheduled_date")
        new_time = update_data.scheduled_time or reminder.get("scheduled_time")
        if new_date and new_time:
            update_dict["scheduled_datetime"] = f"{new_date}T{new_time}:00"
    
    if update_dict:
        await db.reminders.update_one(
            {"id": reminder_id},
            {"$set": update_dict}
        )
    
    # Obtener recordatorio actualizado
    updated = await db.reminders.find_one({"id": reminder_id}, {"_id": 0})
    
    # Asegurar campos por defecto
    if updated:
        if "notification_status" not in updated:
            updated["notification_status"] = "pending"
        if "is_completed" not in updated:
            updated["is_completed"] = False
    
    return updated

@api_router.delete("/reminders/{reminder_id}")
async def delete_reminder(
    reminder_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Eliminar un recordatorio"""
    
    result = await db.reminders.delete_one({
        "id": reminder_id,
        "username": current_user["username"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recordatorio no encontrado")
    
    return {"message": "Recordatorio eliminado"}

@api_router.post("/reminders/test-whatsapp")
async def test_whatsapp(
    message: str = "🔔 Mensaje de prueba desde MindoraMap",
    current_user: dict = Depends(get_current_user)
):
    """Enviar mensaje de prueba por WhatsApp"""
    
    phone_number = current_user.get("whatsapp", "")
    if not phone_number:
        raise HTTPException(status_code=400, detail="No tienes un número de WhatsApp configurado")
    
    result = await send_whatsapp_message(phone_number, message)
    return result


# ==========================================
# NOTIFICATION ENDPOINTS (SEEN/UNSEEN)
# ==========================================

class NotificationStats(BaseModel):
    """Estadísticas de notificaciones"""
    unseen_count: int
    total_completed: int

class MarkSeenRequest(BaseModel):
    """Request para marcar notificaciones como vistas"""
    reminder_ids: List[str]

@api_router.get("/notifications/stats", response_model=NotificationStats)
async def get_notification_stats(
    current_user: dict = Depends(get_current_user)
):
    """Obtener estadísticas de notificaciones (contador de no vistos)"""
    
    username = current_user["username"]
    
    # Contar recordatorios cumplidos (sent) no vistos
    unseen_count = await db.reminders.count_documents({
        "username": username,
        "status": "sent",
        "$or": [
            {"seen": False},
            {"seen": {"$exists": False}}
        ]
    })
    
    # Contar total de recordatorios cumplidos
    total_completed = await db.reminders.count_documents({
        "username": username,
        "status": "sent"
    })
    
    return {
        "unseen_count": unseen_count,
        "total_completed": total_completed
    }

@api_router.post("/notifications/mark-seen")
async def mark_notifications_seen(
    request: MarkSeenRequest,
    current_user: dict = Depends(get_current_user)
):
    """Marcar notificaciones específicas como vistas"""
    
    username = current_user["username"]
    now = datetime.now(timezone.utc).isoformat()
    
    # Actualizar solo los recordatorios del usuario
    result = await db.reminders.update_many(
        {
            "username": username,
            "id": {"$in": request.reminder_ids},
            "status": "sent"
        },
        {
            "$set": {
                "seen": True,
                "seen_at": now
            }
        }
    )
    
    logger.info(f"Marcados {result.modified_count} recordatorios como vistos para {username}")
    
    return {
        "marked_count": result.modified_count,
        "reminder_ids": request.reminder_ids
    }

@api_router.post("/notifications/mark-all-seen")
async def mark_all_notifications_seen(
    current_user: dict = Depends(get_current_user)
):
    """Marcar todas las notificaciones cumplidas como vistas"""
    
    username = current_user["username"]
    now = datetime.now(timezone.utc).isoformat()
    
    # Actualizar todos los recordatorios cumplidos no vistos
    result = await db.reminders.update_many(
        {
            "username": username,
            "status": "sent",
            "$or": [
                {"seen": False},
                {"seen": {"$exists": False}}
            ]
        },
        {
            "$set": {
                "seen": True,
                "seen_at": now
            }
        }
    )
    
    logger.info(f"Marcados {result.modified_count} recordatorios como vistos para {username}")
    
    return {
        "marked_count": result.modified_count
    }

@api_router.get("/notifications/completed")
async def get_completed_notifications(
    current_user: dict = Depends(get_current_user),
    skip: int = 0,
    limit: int = 20,
    unseen_only: bool = False
):
    """
    Obtener notificaciones completadas con paginación para scroll infinito.
    Devuelve recordatorios con status 'sent' ordenados por sent_at descendente.
    """
    
    username = current_user["username"]
    
    query = {
        "username": username,
        "status": "sent"
    }
    
    if unseen_only:
        query["$or"] = [
            {"seen": False},
            {"seen": {"$exists": False}}
        ]
    
    # Obtener recordatorios con paginación
    reminders = await db.reminders.find(
        query,
        {"_id": 0}
    ).sort("sent_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Asegurar campos seen
    for reminder in reminders:
        if "seen" not in reminder:
            reminder["seen"] = False
        if "seen_at" not in reminder:
            reminder["seen_at"] = None
    
    # Verificar si hay más resultados
    total = await db.reminders.count_documents(query)
    has_more = (skip + len(reminders)) < total
    
    return {
        "reminders": reminders,
        "total": total,
        "skip": skip,
        "limit": limit,
        "has_more": has_more
    }


# ==========================================
# TWILIO WHATSAPP WEBHOOK
# ==========================================

@api_router.post("/webhook/whatsapp")
async def twilio_whatsapp_webhook(
    Body: str = Form(""),
    From: str = Form(""),
    To: str = Form(""),
    MessageSid: str = Form("")
):
    """
    Webhook para recibir mensajes entrantes de Twilio WhatsApp
    Recibe payload application/x-www-form-urlencoded
    Responde con TwiML XML
    
    URL del webhook: /api/webhook/whatsapp
    """
    logger.info("=" * 60)
    logger.info("📱 [TWILIO WEBHOOK] Mensaje WhatsApp recibido")
    logger.info(f"📞 De: {From}")
    logger.info(f"📞 Para: {To}")
    logger.info(f"📝 Mensaje: {Body}")
    logger.info(f"🆔 MessageSid: {MessageSid}")
    logger.info("=" * 60)
    
    # Normalizar el mensaje (lowercase, sin espacios extra)
    user_message = Body.strip().lower()
    
    # Lógica de respuesta básica para pruebas
    if user_message == "hola":
        response_message = "Hola 👋 el sistema está funcionando correctamente."
    elif user_message == "test":
        response_message = "✅ Test exitoso. El webhook de Twilio está activo."
    elif user_message == "help" or user_message == "ayuda":
        response_message = "🤖 Comandos disponibles:\n- hola: Verificar sistema\n- test: Probar conexión\n- ayuda: Ver comandos"
    else:
        response_message = f"Recibí tu mensaje: '{Body}'\n\nEscribe 'hola' para verificar el sistema o 'ayuda' para ver comandos."
    
    # Generar respuesta TwiML XML
    twiml = generate_twiml_response(response_message)
    
    logger.info(f"📤 Respuesta TwiML: {response_message}")
    
    # Retornar respuesta XML con Content-Type correcto
    return Response(
        content=twiml,
        media_type="application/xml"
    )


# ==========================================
# PROJECT MODELS
# ==========================================

class NodeData(BaseModel):
    id: str
    text: str
    x: float
    y: float
    parentId: Optional[str] = None
    color: Optional[str] = "blue"
    bgColor: Optional[str] = None
    textColor: Optional[str] = None
    borderColor: Optional[str] = None
    borderWidth: Optional[int] = None
    borderStyle: Optional[str] = None
    lineColor: Optional[str] = None
    lineWidth: Optional[int] = None
    lineStyle: Optional[str] = None
    shape: Optional[str] = None
    width: Optional[float] = None
    height: Optional[float] = None
    comment: Optional[str] = None
    icon: Optional[dict] = None
    links: Optional[List[str]] = None  # Lista de URLs como strings
    nodeType: Optional[str] = "default"  # 'default' | 'dashed_text' - Tipo de nodo para persistencia (también acepta 'dashed' legacy)
    dashedLineWidth: Optional[int] = 3  # Grosor de la línea para nodos dashed_text (2-5px)
    hasReminder: Optional[bool] = False  # Indicador de recordatorio
    # Campos para MindHybrid/MindTree layouts
    childDirection: Optional[str] = None  # 'horizontal' | 'vertical' - Dirección del nodo hijo
    isCompleted: Optional[bool] = False  # Estado de completado (tachado + opacidad)
    textAlign: Optional[str] = None  # 'left' | 'center' | 'right' - Alineación del texto
    # Campos para nodos creados desde conectores horizontales en MindHybrid
    connectorParentId: Optional[str] = None  # ID del padre del conector horizontal
    connectorTargetId: Optional[str] = None  # ID del hijo horizontal del conector

class ProjectCreate(BaseModel):
    id: Optional[str] = None
    name: str
    nodes: List[NodeData]
    isPinned: Optional[bool] = False
    customOrder: Optional[int] = None
    layoutType: Optional[str] = "mindflow"  # 'mindflow', 'mindtree', or 'mindhybrid'

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    nodes: Optional[List[NodeData]] = None
    isPinned: Optional[bool] = None
    customOrder: Optional[int] = None
    layoutType: Optional[str] = None  # 'mindflow', 'mindtree', or 'mindhybrid'
    thumbnail: Optional[str] = None  # Base64 encoded image

class ProjectResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    name: str
    nodes: List[dict]
    username: str
    createdAt: str
    updatedAt: str
    lastActiveAt: Optional[str] = None
    isPinned: bool = False
    customOrder: Optional[int] = None
    layoutType: str = "mindflow"  # 'mindflow', 'mindtree', or 'mindhybrid'
    thumbnail: Optional[str] = None  # Base64 encoded image
    # Campos para papelera de reciclaje
    isDeleted: bool = False
    deletedAt: Optional[str] = None


# ==========================================
# PROJECT ENDPOINTS
# ==========================================

@api_router.get("/projects", response_model=List[ProjectResponse])
async def get_projects(current_user: dict = Depends(get_current_user)):
    """Obtener todos los proyectos del usuario (excluyendo eliminados)"""
    projects = await db.projects.find(
        {
            "username": current_user["username"],
            "$or": [
                {"isDeleted": {"$exists": False}},
                {"isDeleted": False}
            ]
        },
        {"_id": 0}
    ).to_list(100)
    
    # Asegurar que todos los proyectos tienen los campos nuevos
    for project in projects:
        if "isPinned" not in project:
            project["isPinned"] = False
        if "lastActiveAt" not in project:
            project["lastActiveAt"] = project.get("updatedAt")
        if "customOrder" not in project:
            project["customOrder"] = None
        if "layoutType" not in project:
            project["layoutType"] = "mindflow"  # Default for existing projects
    
    return projects


# ==========================================
# TRASH (PAPELERA) ENDPOINTS - ANTES de {project_id}
# ==========================================

class TrashProjectResponse(BaseModel):
    """Respuesta para proyectos en papelera"""
    model_config = ConfigDict(extra="ignore")
    
    id: str
    name: str
    username: str
    deletedAt: str
    nodeCount: int = 0
    layoutType: str = "mindflow"


@api_router.get("/trash/count")
async def get_trash_count(current_user: dict = Depends(get_current_user)):
    """Obtener conteo total de elementos en la papelera (mapas + tableros)"""
    username = current_user["username"]
    
    # Contar mapas eliminados
    maps_count = await db.projects.count_documents({
        "username": username,
        "isDeleted": True
    })
    
    # Contar tableros eliminados
    boards_count = await db.boards.count_documents({
        "owner_username": username,
        "is_deleted": True
    })
    
    total = maps_count + boards_count
    
    return {
        "total": total,
        "maps_count": maps_count,
        "boards_count": boards_count
    }


@api_router.get("/projects/trash", response_model=List[TrashProjectResponse])
async def get_trash_projects(current_user: dict = Depends(get_current_user)):
    """Obtener proyectos en la papelera"""
    username = current_user["username"]
    
    projects = await db.projects.find(
        {
            "username": username,
            "isDeleted": True
        },
        {"_id": 0}
    ).sort("deletedAt", -1).to_list(100)
    
    # Formatear respuesta
    trash_projects = []
    for project in projects:
        trash_projects.append({
            "id": project["id"],
            "name": project["name"],
            "username": project["username"],
            "deletedAt": project.get("deletedAt", ""),
            "nodeCount": len(project.get("nodes", [])),
            "layoutType": project.get("layoutType", "mindflow")
        })
    
    return trash_projects


# === ENDPOINTS PARA MANEJO DE DUPLICADOS (deben estar antes de /projects/{project_id}) ===

class MergeProjectsRequest(BaseModel):
    source_project_id: str  # Proyecto del que se tomarán los nodos
    target_project_id: str  # Proyecto destino donde se fusionarán
    delete_source: bool = True  # Si se debe eliminar el proyecto fuente después

@api_router.get("/projects/duplicates")
async def get_duplicate_projects(current_user: dict = Depends(get_current_user)):
    """Obtener lista de proyectos con nombres duplicados"""
    username = current_user["username"]
    
    # Encontrar nombres duplicados
    pipeline = [
        {"$match": {"username": username, "isDeleted": {"$ne": True}}},
        {"$group": {
            "_id": "$name",
            "count": {"$sum": 1},
            "projects": {"$push": {
                "id": "$id",
                "name": "$name",
                "createdAt": "$createdAt",
                "updatedAt": "$updatedAt",
                "nodeCount": {"$size": {"$ifNull": ["$nodes", []]}}
            }}
        }},
        {"$match": {"count": {"$gt": 1}}},
        {"$sort": {"count": -1}}
    ]
    
    duplicates = await db.projects.aggregate(pipeline).to_list(100)
    
    result = []
    for dup in duplicates:
        # Ordenar proyectos por fecha de creación
        projects = sorted(dup["projects"], key=lambda x: x.get("createdAt", ""))
        result.append({
            "name": dup["_id"],
            "count": dup["count"],
            "projects": projects
        })
    
    return {
        "has_duplicates": len(result) > 0,
        "duplicate_count": len(result),
        "duplicates": result
    }

@api_router.post("/projects/merge")
async def merge_projects(
    merge_data: MergeProjectsRequest,
    current_user: dict = Depends(get_current_user)
):
    """Fusionar dos proyectos, combinando todos los nodos únicos"""
    username = current_user["username"]
    
    # Obtener ambos proyectos
    source = await db.projects.find_one({
        "id": merge_data.source_project_id,
        "username": username,
        "isDeleted": {"$ne": True}
    })
    
    target = await db.projects.find_one({
        "id": merge_data.target_project_id,
        "username": username,
        "isDeleted": {"$ne": True}
    })
    
    if not source:
        raise HTTPException(status_code=404, detail="Proyecto fuente no encontrado")
    if not target:
        raise HTTPException(status_code=404, detail="Proyecto destino no encontrado")
    
    source_nodes = source.get("nodes", [])
    target_nodes = target.get("nodes", [])
    
    # Crear un set de IDs de nodos existentes en el destino
    existing_node_ids = {node.get("id") for node in target_nodes}
    
    # Agregar nodos del fuente que no existen en el destino
    nodes_added = 0
    for node in source_nodes:
        node_id = node.get("id")
        if node_id and node_id not in existing_node_ids:
            # Desplazar la posición para evitar superposición
            if "position" in node:
                node["position"]["x"] = node["position"].get("x", 0) + 300
                node["position"]["y"] = node["position"].get("y", 0) + 50
            target_nodes.append(node)
            existing_node_ids.add(node_id)
            nodes_added += 1
    
    # Actualizar el proyecto destino con los nodos combinados
    now = datetime.now(timezone.utc).isoformat()
    await db.projects.update_one(
        {"id": merge_data.target_project_id},
        {"$set": {
            "nodes": target_nodes,
            "updatedAt": now,
            "mergedFrom": merge_data.source_project_id,
            "mergedAt": now
        }}
    )
    
    # Eliminar o marcar como eliminado el proyecto fuente si se solicita
    source_status = "kept"
    if merge_data.delete_source:
        await db.projects.update_one(
            {"id": merge_data.source_project_id},
            {"$set": {
                "isDeleted": True,
                "deletedAt": now,
                "mergedInto": merge_data.target_project_id
            }}
        )
        source_status = "deleted"
    
    logger.info(f"Proyectos fusionados: {merge_data.source_project_id} -> {merge_data.target_project_id} por {username}")
    
    return {
        "message": "Proyectos fusionados correctamente",
        "target_project_id": merge_data.target_project_id,
        "source_project_id": merge_data.source_project_id,
        "nodes_added": nodes_added,
        "total_nodes": len(target_nodes),
        "source_status": source_status
    }


@api_router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener un proyecto específico"""
    project = await db.projects.find_one(
        {"id": project_id, "username": current_user["username"]},
        {"_id": 0}
    )
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    # Asegurar campos por defecto
    if "layoutType" not in project:
        project["layoutType"] = "mindflow"
    return project

@api_router.post("/projects", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate,
    current_user: dict = Depends(get_current_user)
):
    """Crear un nuevo proyecto"""
    username = current_user["username"]
    
    # === PREVENCIÓN DE DUPLICADOS ===
    # Verificar si ya existe un proyecto con el mismo nombre (no eliminado)
    existing_by_name = await db.projects.find_one({
        "username": username,
        "name": project_data.name,
        "isDeleted": {"$ne": True}
    })
    
    if existing_by_name:
        # Si ya existe un proyecto con ese nombre, retornar error con info del existente
        raise HTTPException(
            status_code=409,  # Conflict
            detail={
                "message": f"Ya existe un proyecto con el nombre '{project_data.name}'",
                "existing_project_id": existing_by_name.get("id"),
                "existing_project_name": existing_by_name.get("name"),
                "suggestion": "Usa un nombre diferente o abre el proyecto existente"
            }
        )
    
    # Verificar si el ID ya existe (para evitar duplicados por ID también)
    if project_data.id:
        existing_by_id = await db.projects.find_one({
            "id": project_data.id,
            "username": username
        })
        if existing_by_id:
            # El proyecto ya existe, actualizar en lugar de crear
            logger.info(f"Proyecto {project_data.id} ya existe, actualizando en lugar de crear")
            now = datetime.now(timezone.utc).isoformat()
            await db.projects.update_one(
                {"id": project_data.id},
                {"$set": {
                    "name": project_data.name,
                    "nodes": [node.model_dump() for node in project_data.nodes],
                    "updatedAt": now,
                    "lastActiveAt": now,
                    "layoutType": project_data.layoutType or existing_by_id.get("layoutType", "mindflow")
                }}
            )
            updated = await db.projects.find_one({"id": project_data.id}, {"_id": 0})
            return updated
    
    # Obtener usuario y sus límites de plan
    user = await db.users.find_one({"username": username}, {"_id": 0})
    plan_limits = get_user_plan_limits(user or {})
    
    # Contar mapas activos (no eliminados)
    active_maps_count = await db.projects.count_documents({
        "username": username,
        "isDeleted": {"$ne": True}
    })
    
    # Obtener histórico de mapas creados
    total_maps_created = user.get("total_maps_created", 0) if user else 0
    
    # Verificar límite de mapas ACTIVOS
    max_active = plan_limits["max_active_maps"]
    if max_active != -1 and active_maps_count >= max_active:
        raise HTTPException(
            status_code=403, 
            detail=f"Has alcanzado el límite de {max_active} mapas activos de tu plan. Elimina algún mapa o actualiza a Pro para mapas ilimitados."
        )
    
    # Verificar límite de mapas TOTALES (histórico)
    max_total = plan_limits["max_total_maps_created"]
    if max_total != -1 and total_maps_created >= max_total:
        raise HTTPException(
            status_code=403, 
            detail=f"Has alcanzado el límite de {max_total} mapas creados del plan gratuito. Tu cuenta Free permite probar la plataforma, pero has llegado al máximo. ¡Actualiza a Pro para crear mapas sin límites!"
        )
    
    # Verificar límite de nodos
    if plan_limits["max_nodes_per_map"] != -1:
        if len(project_data.nodes) > plan_limits["max_nodes_per_map"]:
            raise HTTPException(
                status_code=403, 
                detail=f"Has alcanzado el límite de {plan_limits['max_nodes_per_map']} nodos por mapa de tu plan."
            )
    
    now = datetime.now(timezone.utc).isoformat()
    
    project = {
        "id": project_data.id or str(uuid.uuid4()),
        "name": project_data.name,
        "nodes": [node.model_dump() for node in project_data.nodes],
        "username": username,
        "createdAt": now,
        "updatedAt": now,
        "lastActiveAt": now,
        "isPinned": project_data.isPinned or False,
        "customOrder": project_data.customOrder,
        "layoutType": project_data.layoutType or "mindflow"
    }
    
    await db.projects.insert_one(project)
    
    # Incrementar contador histórico de mapas creados
    await db.users.update_one(
        {"username": username},
        {"$inc": {"total_maps_created": 1}}
    )
    
    logger.info(f"Nuevo proyecto creado: {project['name']} (ID: {project['id']}) por {username}")
    
    # Return without _id
    project.pop("_id", None)
    return project

@api_router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    update_data: ProjectUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Actualizar un proyecto existente"""
    project = await db.projects.find_one(
        {"id": project_id, "username": current_user["username"]},
        {"_id": 0}
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    # Verificar límite de nodos si se están actualizando
    if update_data.nodes is not None:
        user = await db.users.find_one({"username": current_user["username"]}, {"_id": 0})
        plan_limits = get_user_plan_limits(user or {})
        
        if plan_limits["max_nodes_per_map"] != -1:
            if len(update_data.nodes) > plan_limits["max_nodes_per_map"]:
                raise HTTPException(
                    status_code=403, 
                    detail=f"Has alcanzado el límite de {plan_limits['max_nodes_per_map']} nodos por mapa de tu plan. Actualiza a Pro para nodos ilimitados."
                )
    
    update_dict = {"updatedAt": datetime.now(timezone.utc).isoformat()}
    
    if update_data.name is not None:
        update_dict["name"] = update_data.name
    
    if update_data.nodes is not None:
        update_dict["nodes"] = [node.model_dump() for node in update_data.nodes]
    
    if update_data.isPinned is not None:
        update_dict["isPinned"] = update_data.isPinned
    
    if update_data.customOrder is not None:
        update_dict["customOrder"] = update_data.customOrder
    
    if update_data.layoutType is not None:
        update_dict["layoutType"] = update_data.layoutType
    
    if update_data.thumbnail is not None:
        update_dict["thumbnail"] = update_data.thumbnail
    
    await db.projects.update_one(
        {"id": project_id},
        {"$set": update_dict}
    )
    
    # Return updated project
    updated = await db.projects.find_one({"id": project_id}, {"_id": 0})
    # Asegurar campos por defecto
    if "isPinned" not in updated:
        updated["isPinned"] = False
    if "lastActiveAt" not in updated:
        updated["lastActiveAt"] = updated.get("updatedAt")
    if "customOrder" not in updated:
        updated["customOrder"] = None
    if "layoutType" not in updated:
        updated["layoutType"] = "mindflow"
    return updated

@api_router.delete("/projects/{project_id}")
async def delete_project(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Soft delete - Mover proyecto a la papelera"""
    username = current_user["username"]
    
    # Verificar que el proyecto existe y no está ya eliminado
    project = await db.projects.find_one({
        "id": project_id,
        "username": username,
        "$or": [
            {"isDeleted": {"$exists": False}},
            {"isDeleted": False}
        ]
    })
    
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    # Soft delete: marcar como eliminado
    now = datetime.now(timezone.utc).isoformat()
    await db.projects.update_one(
        {"id": project_id},
        {
            "$set": {
                "isDeleted": True,
                "deletedAt": now,
                "isPinned": False  # Desanclar al enviar a papelera
            }
        }
    )
    
    logger.info(f"Proyecto {project_id} enviado a papelera por {username}")
    
    return {"message": "Proyecto enviado a la papelera", "deletedAt": now}


@api_router.post("/projects/{project_id}/restore")
async def restore_project(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Restaurar un proyecto desde la papelera"""
    username = current_user["username"]
    
    # Verificar que el proyecto existe y está en la papelera
    project = await db.projects.find_one({
        "id": project_id,
        "username": username,
        "isDeleted": True
    })
    
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado en la papelera")
    
    # Restaurar proyecto
    now = datetime.now(timezone.utc).isoformat()
    await db.projects.update_one(
        {"id": project_id},
        {
            "$set": {
                "isDeleted": False,
                "deletedAt": None,
                "updatedAt": now,
                "lastActiveAt": now
            }
        }
    )
    
    logger.info(f"Proyecto {project_id} restaurado por {username}")
    
    return {"message": "Proyecto restaurado exitosamente", "id": project_id}


@api_router.delete("/projects/{project_id}/permanent")
async def permanent_delete_project(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Eliminar permanentemente un proyecto de la papelera"""
    username = current_user["username"]
    
    # Verificar que el proyecto existe y está en la papelera
    project = await db.projects.find_one({
        "id": project_id,
        "username": username,
        "isDeleted": True
    })
    
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado en la papelera")
    
    # Eliminar permanentemente
    await db.projects.delete_one({"id": project_id})
    
    # También eliminar recordatorios asociados
    await db.reminders.delete_many({
        "project_id": project_id,
        "username": username
    })
    
    logger.info(f"Proyecto {project_id} eliminado permanentemente por {username}")
    
    return {"message": "Proyecto eliminado permanentemente"}


@api_router.delete("/projects/trash/empty")
async def empty_trash(
    current_user: dict = Depends(get_current_user)
):
    """Vaciar la papelera - eliminar todos los proyectos permanentemente"""
    username = current_user["username"]
    
    # Obtener todos los proyectos en papelera del usuario
    trash_projects = await db.projects.find({
        "username": username,
        "isDeleted": True
    }).to_list(1000)
    
    if not trash_projects:
        return {"message": "La papelera ya está vacía", "deleted_count": 0}
    
    # Eliminar todos los proyectos de la papelera
    result = await db.projects.delete_many({
        "username": username,
        "isDeleted": True
    })
    
    logger.info(f"Papelera vaciada: {result.deleted_count} proyectos eliminados permanentemente por {username}")
    
    return {
        "message": f"Se eliminaron {result.deleted_count} proyecto(s) permanentemente",
        "deleted_count": result.deleted_count
    }


# ==========================================
# PROJECT MANAGEMENT ENDPOINTS
# ==========================================

class PinProjectRequest(BaseModel):
    isPinned: bool

class ReorderProjectsRequest(BaseModel):
    projectOrders: List[dict]  # [{id: "...", customOrder: 0}, ...]

@api_router.put("/projects/{project_id}/pin")
async def pin_project(
    project_id: str,
    request: PinProjectRequest,
    current_user: dict = Depends(get_current_user)
):
    """Anclar o desanclar un proyecto"""
    username = current_user["username"]
    
    # Verificar que el proyecto existe
    project = await db.projects.find_one(
        {"id": project_id, "username": username}
    )
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    # Si se quiere anclar, verificar que no hay más de 2 anclados
    if request.isPinned:
        pinned_count = await db.projects.count_documents({
            "username": username,
            "isPinned": True
        })
        # Si ya hay 2 anclados y este proyecto no está anclado, rechazar
        if pinned_count >= 2 and not project.get("isPinned", False):
            raise HTTPException(
                status_code=400, 
                detail="No puedes anclar más de 2 proyectos"
            )
    
    # Actualizar estado de anclado
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {"isPinned": request.isPinned}}
    )
    
    logger.info(f"Proyecto {project_id} {'anclado' if request.isPinned else 'desanclado'} por {username}")
    
    return {"id": project_id, "isPinned": request.isPinned}

@api_router.put("/projects/{project_id}/activate")
async def activate_project(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Marcar un proyecto como activo (actualizar lastActiveAt)"""
    username = current_user["username"]
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.projects.update_one(
        {"id": project_id, "username": username},
        {"$set": {"lastActiveAt": now}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    return {"id": project_id, "lastActiveAt": now}

@api_router.put("/projects/reorder")
async def reorder_projects(
    request: ReorderProjectsRequest,
    current_user: dict = Depends(get_current_user)
):
    """Reordenar proyectos (orden personalizado)"""
    username = current_user["username"]
    
    for order_item in request.projectOrders:
        await db.projects.update_one(
            {"id": order_item["id"], "username": username},
            {"$set": {"customOrder": order_item["customOrder"]}}
        )
    
    logger.info(f"Proyectos reordenados para {username}")
    
    return {"reordered": len(request.projectOrders)}

@api_router.post("/projects/sync")
async def sync_projects(
    projects: List[ProjectCreate],
    current_user: dict = Depends(get_current_user)
):
    """Sincronizar proyectos desde localStorage al servidor"""
    username = current_user["username"]
    synced = []
    
    for project_data in projects:
        now = datetime.now(timezone.utc).isoformat()
        
        # Check if project exists
        existing = await db.projects.find_one(
            {"id": project_data.id, "username": username}
        )
        
        project_dict = {
            "id": project_data.id or str(uuid.uuid4()),
            "name": project_data.name,
            "nodes": [node.model_dump() for node in project_data.nodes],
            "username": username,
            "updatedAt": now
        }
        
        if existing:
            # Update existing
            await db.projects.update_one(
                {"id": project_data.id},
                {"$set": project_dict}
            )
        else:
            # Create new
            project_dict["createdAt"] = now
            await db.projects.insert_one(project_dict)
        
        synced.append(project_dict["id"])
    
    return {"synced": len(synced), "project_ids": synced}


# ==========================================
# EXISTING MODELS
# ==========================================

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str


# ==========================================
# EXISTING ENDPOINTS
# ==========================================

@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks


# ==========================================
# ADMIN ENDPOINTS
# ==========================================

# Models for Admin
class UserListItem(BaseModel):
    username: str
    email: str
    full_name: str
    role: str
    plan: str = "free"
    auth_provider: Optional[str] = "local"
    created_at: Optional[str] = None
    is_pro: bool = False
    disabled: bool = False
    # Nuevos campos para control de planes
    plan_expires_at: Optional[str] = None
    plan_override: bool = False
    plan_source: str = "system"
    plan_assigned_by: Optional[str] = None
    plan_assigned_at: Optional[str] = None

class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    plan: Optional[str] = None
    is_pro: Optional[bool] = None
    disabled: Optional[bool] = None

# Modelo para cambio de plan administrativo
class AdminPlanChange(BaseModel):
    plan: str  # free, pro, team, business, admin
    expires_at: Optional[str] = None  # ISO date string, null = permanente
    unlimited_access: bool = False  # Salta todos los límites del plan

# Modelo para respuesta paginada de usuarios
class PaginatedUsersResponse(BaseModel):
    users: List[UserListItem]
    total: int
    page: int
    per_page: int
    total_pages: int
    has_next: bool
    has_prev: bool

# Modelo para eliminación masiva
class BulkDeleteRequest(BaseModel):
    usernames: List[str]

# Modelo para impersonación de usuario
class ImpersonateResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    impersonated_user: str
    admin_user: str
    return_token: str  # Token para volver al admin

class LandingContentSection(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    cta_primary: Optional[str] = None
    cta_secondary: Optional[str] = None
    button_text: Optional[str] = None

class LandingContentUpdate(BaseModel):
    hero: Optional[LandingContentSection] = None
    platform: Optional[LandingContentSection] = None
    benefits: Optional[LandingContentSection] = None
    how_it_works: Optional[LandingContentSection] = None
    pricing: Optional[LandingContentSection] = None
    faq: Optional[LandingContentSection] = None
    final_cta: Optional[LandingContentSection] = None

class AdminMetrics(BaseModel):
    total_users: int
    new_users_7_days: int
    new_users_30_days: int
    pro_users: int
    total_projects: int

# Modelo para analytics avanzados
class UserGrowthPoint(BaseModel):
    date: str
    count: int
    cumulative: int

class PlanDistribution(BaseModel):
    plan: str
    count: int
    percentage: float

class ActivityMetric(BaseModel):
    date: str
    active_users: int
    new_registrations: int
    projects_created: int

class RetentionData(BaseModel):
    period: str
    cohort_size: int
    retained: int
    retention_rate: float

class AnalyticsDashboard(BaseModel):
    # Overview
    total_users: int
    total_projects: int
    total_contacts: int
    total_boards: int
    
    # Growth metrics
    users_today: int
    users_this_week: int
    users_this_month: int
    growth_rate_weekly: float
    growth_rate_monthly: float
    
    # User growth over time (last 30 days)
    user_growth: List[UserGrowthPoint]
    
    # Plan distribution
    plan_distribution: List[PlanDistribution]
    
    # Activity metrics (last 14 days)
    activity_metrics: List[ActivityMetric]
    
    # Retention (weekly cohorts)
    retention_data: List[RetentionData]
    
    # Top stats
    active_users_24h: int
    conversion_rate: float  # Free to Pro
    avg_projects_per_user: float

# Admin middleware - verify user is admin
async def require_admin(current_user: dict = Depends(get_current_user)):
    """Verificar que el usuario actual es administrador"""
    user = await db.users.find_one({"username": current_user["username"]}, {"_id": 0})
    if not user or user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Acceso denegado. Se requieren permisos de administrador."
        )
    return current_user

@api_router.get("/admin/metrics", response_model=AdminMetrics)
async def get_admin_metrics(current_user: dict = Depends(require_admin)):
    """Obtener métricas del dashboard de administración"""
    now = datetime.now(timezone.utc)
    seven_days_ago = (now - timedelta(days=7)).isoformat()
    thirty_days_ago = (now - timedelta(days=30)).isoformat()
    
    # Total usuarios
    total_users = await db.users.count_documents({})
    
    # Usuarios nuevos últimos 7 días
    new_users_7 = await db.users.count_documents({
        "created_at": {"$gte": seven_days_ago}
    })
    
    # Usuarios nuevos últimos 30 días
    new_users_30 = await db.users.count_documents({
        "created_at": {"$gte": thirty_days_ago}
    })
    
    # Usuarios Pro (membresía pagada)
    pro_users = await db.users.count_documents({"is_pro": True})
    
    # Total de proyectos
    total_projects = await db.projects.count_documents({"isDeleted": {"$ne": True}})
    
    return {
        "total_users": total_users,
        "new_users_7_days": new_users_7,
        "new_users_30_days": new_users_30,
        "pro_users": pro_users,
        "total_projects": total_projects
    }

@api_router.get("/admin/analytics", response_model=AnalyticsDashboard)
async def get_admin_analytics(current_user: dict = Depends(require_admin)):
    """Obtener analytics avanzados para el dashboard de administración"""
    now = datetime.now(timezone.utc)
    
    # ==================== OVERVIEW ====================
    total_users = await db.users.count_documents({})
    total_projects = await db.projects.count_documents({"isDeleted": {"$ne": True}})
    total_contacts = await db.contacts.count_documents({})
    total_boards = await db.boards.count_documents({"isDeleted": {"$ne": True}})
    
    # ==================== GROWTH METRICS ====================
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)
    
    users_today = await db.users.count_documents({"created_at": {"$gte": today_start.isoformat()}})
    users_this_week = await db.users.count_documents({"created_at": {"$gte": week_start.isoformat()}})
    users_this_month = await db.users.count_documents({"created_at": {"$gte": month_start.isoformat()}})
    
    # Growth rates
    last_week_start = week_start - timedelta(days=7)
    last_month_start = (month_start - timedelta(days=1)).replace(day=1)
    
    users_last_week = await db.users.count_documents({
        "created_at": {"$gte": last_week_start.isoformat(), "$lt": week_start.isoformat()}
    })
    users_last_month = await db.users.count_documents({
        "created_at": {"$gte": last_month_start.isoformat(), "$lt": month_start.isoformat()}
    })
    
    growth_rate_weekly = ((users_this_week - users_last_week) / users_last_week * 100) if users_last_week > 0 else 0
    growth_rate_monthly = ((users_this_month - users_last_month) / users_last_month * 100) if users_last_month > 0 else 0
    
    # ==================== USER GROWTH (Last 30 days) ====================
    user_growth = []
    cumulative = 0
    
    # Get base count (users before 30 days ago)
    thirty_days_ago = today_start - timedelta(days=30)
    base_users = await db.users.count_documents({"created_at": {"$lt": thirty_days_ago.isoformat()}})
    cumulative = base_users
    
    for i in range(30, -1, -1):
        day = today_start - timedelta(days=i)
        day_end = day + timedelta(days=1)
        
        count = await db.users.count_documents({
            "created_at": {"$gte": day.isoformat(), "$lt": day_end.isoformat()}
        })
        cumulative += count
        
        user_growth.append({
            "date": day.strftime("%Y-%m-%d"),
            "count": count,
            "cumulative": cumulative
        })
    
    # ==================== PLAN DISTRIBUTION ====================
    plan_counts = {}
    plans = ["free", "pro", "team", "business", "admin"]
    
    for plan in plans:
        if plan == "free":
            count = await db.users.count_documents({
                "$or": [{"plan": "free"}, {"plan": {"$exists": False}}, {"plan": None}]
            })
        else:
            count = await db.users.count_documents({"plan": plan})
        if count > 0:
            plan_counts[plan] = count
    
    plan_distribution = []
    for plan, count in plan_counts.items():
        plan_distribution.append({
            "plan": plan.capitalize(),
            "count": count,
            "percentage": round((count / total_users * 100) if total_users > 0 else 0, 1)
        })
    
    # Sort by count descending
    plan_distribution.sort(key=lambda x: x["count"], reverse=True)
    
    # ==================== ACTIVITY METRICS (Last 14 days) ====================
    activity_metrics = []
    
    for i in range(13, -1, -1):
        day = today_start - timedelta(days=i)
        day_end = day + timedelta(days=1)
        
        # New registrations
        new_regs = await db.users.count_documents({
            "created_at": {"$gte": day.isoformat(), "$lt": day_end.isoformat()}
        })
        
        # Projects created
        projects_created = await db.projects.count_documents({
            "created_at": {"$gte": day.isoformat(), "$lt": day_end.isoformat()},
            "isDeleted": {"$ne": True}
        })
        
        # Active users (simplified - users who logged in or created something)
        # For now, estimate based on registrations + some percentage of existing users
        active_estimate = new_regs + max(1, int(total_users * 0.05))  # 5% daily active estimate
        
        activity_metrics.append({
            "date": day.strftime("%Y-%m-%d"),
            "active_users": min(active_estimate, total_users),
            "new_registrations": new_regs,
            "projects_created": projects_created
        })
    
    # ==================== RETENTION DATA (Weekly cohorts) ====================
    retention_data = []
    
    for week in range(4):  # Last 4 weeks
        cohort_start = week_start - timedelta(weeks=week+1)
        cohort_end = cohort_start + timedelta(days=7)
        
        # Users who registered in this cohort week
        cohort_users = await db.users.find({
            "created_at": {"$gte": cohort_start.isoformat(), "$lt": cohort_end.isoformat()}
        }, {"_id": 0, "username": 1}).to_list(1000)
        
        cohort_size = len(cohort_users)
        
        if cohort_size > 0:
            # Check how many are still "active" (have projects or didn't get disabled)
            cohort_usernames = [u["username"] for u in cohort_users]
            retained = await db.users.count_documents({
                "username": {"$in": cohort_usernames},
                "disabled": {"$ne": True}
            })
            
            retention_rate = round((retained / cohort_size * 100), 1)
        else:
            retained = 0
            retention_rate = 0
        
        retention_data.append({
            "period": f"Semana -{week+1}",
            "cohort_size": cohort_size,
            "retained": retained,
            "retention_rate": retention_rate
        })
    
    # ==================== TOP STATS ====================
    # Active users in last 24h (estimate based on recent activity)
    yesterday = now - timedelta(hours=24)
    recent_projects = await db.projects.count_documents({
        "updated_at": {"$gte": yesterday.isoformat()}
    })
    active_users_24h = min(recent_projects + users_today, total_users)
    
    # Conversion rate (Free to Pro)
    pro_users = await db.users.count_documents({"is_pro": True})
    free_users = total_users - pro_users
    conversion_rate = round((pro_users / total_users * 100) if total_users > 0 else 0, 2)
    
    # Average projects per user
    avg_projects_per_user = round(total_projects / total_users, 1) if total_users > 0 else 0
    
    return {
        "total_users": total_users,
        "total_projects": total_projects,
        "total_contacts": total_contacts,
        "total_boards": total_boards,
        "users_today": users_today,
        "users_this_week": users_this_week,
        "users_this_month": users_this_month,
        "growth_rate_weekly": round(growth_rate_weekly, 1),
        "growth_rate_monthly": round(growth_rate_monthly, 1),
        "user_growth": user_growth,
        "plan_distribution": plan_distribution,
        "activity_metrics": activity_metrics,
        "retention_data": retention_data,
        "active_users_24h": active_users_24h,
        "conversion_rate": conversion_rate,
        "avg_projects_per_user": avg_projects_per_user
    }

@api_router.get("/admin/users", response_model=PaginatedUsersResponse)
async def get_all_users(
    current_user: dict = Depends(require_admin),
    page: int = 1,
    per_page: int = 20,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    filter_type: Optional[str] = None,  # day, week, month
    search: Optional[str] = None,
    plan_filter: Optional[str] = None,
    status_filter: Optional[str] = None  # active, blocked
):
    """Obtener lista paginada de usuarios con filtros avanzados"""
    
    # Construir query de filtros
    query = {}
    
    # Filtro de búsqueda (username, email, full_name)
    if search:
        query["$or"] = [
            {"username": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"full_name": {"$regex": search, "$options": "i"}}
        ]
    
    # Filtro por plan
    if plan_filter and plan_filter != "all":
        query["plan"] = plan_filter
    
    # Filtro por estado
    if status_filter == "active":
        query["disabled"] = {"$ne": True}
    elif status_filter == "blocked":
        query["disabled"] = True
    
    # Filtros de fecha
    now = datetime.now(timezone.utc)
    date_query = {}
    
    if filter_type == "day":
        # Hoy
        start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        date_query["$gte"] = start_of_day.isoformat()
        date_query["$lt"] = (start_of_day + timedelta(days=1)).isoformat()
    elif filter_type == "week":
        # Esta semana (lunes a domingo)
        start_of_week = now - timedelta(days=now.weekday())
        start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
        date_query["$gte"] = start_of_week.isoformat()
        date_query["$lt"] = (start_of_week + timedelta(days=7)).isoformat()
    elif filter_type == "month":
        # Este mes
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if now.month == 12:
            end_of_month = start_of_month.replace(year=now.year + 1, month=1)
        else:
            end_of_month = start_of_month.replace(month=now.month + 1)
        date_query["$gte"] = start_of_month.isoformat()
        date_query["$lt"] = end_of_month.isoformat()
    elif date_from or date_to:
        # Rango personalizado
        if date_from:
            date_query["$gte"] = date_from
        if date_to:
            # Incluir todo el día final
            date_query["$lte"] = date_to + "T23:59:59.999Z"
    
    if date_query:
        query["created_at"] = date_query
    
    # Contar total antes de paginar
    total = await db.users.count_documents(query)
    
    # Calcular paginación
    total_pages = (total + per_page - 1) // per_page if total > 0 else 1
    page = max(1, min(page, total_pages))
    skip = (page - 1) * per_page
    
    # Ordenamiento
    sort_direction = -1 if sort_order == "desc" else 1
    valid_sort_fields = ["created_at", "username", "email", "plan"]
    if sort_by not in valid_sort_fields:
        sort_by = "created_at"
    
    # Obtener usuarios paginados
    cursor = db.users.find(query, {"_id": 0, "hashed_password": 0})
    cursor = cursor.sort(sort_by, sort_direction).skip(skip).limit(per_page)
    users = await cursor.to_list(per_page)
    
    result = []
    for user in users:
        user_role = user.get("role", "user")
        user_plan = "admin" if user_role == "admin" else user.get("plan", "free")
        
        # Convertir fechas a string si son datetime
        created_at = user.get("created_at")
        if hasattr(created_at, 'isoformat'):
            created_at = created_at.isoformat()
        
        plan_expires_at = user.get("plan_expires_at")
        if hasattr(plan_expires_at, 'isoformat'):
            plan_expires_at = plan_expires_at.isoformat()
            
        plan_assigned_at = user.get("plan_assigned_at")
        if hasattr(plan_assigned_at, 'isoformat'):
            plan_assigned_at = plan_assigned_at.isoformat()
        
        result.append({
            "username": user.get("username", ""),
            "email": user.get("email", ""),
            "full_name": user.get("full_name", ""),
            "role": user_role,
            "plan": user_plan,
            "auth_provider": user.get("auth_provider", "local"),
            "created_at": created_at,
            "is_pro": user_plan in ["pro", "team", "business", "admin"],
            "disabled": user.get("disabled", False),
            "plan_expires_at": plan_expires_at,
            "plan_override": user.get("plan_override", False),
            "plan_source": user.get("plan_source", "system"),
            "plan_assigned_by": user.get("plan_assigned_by"),
            "plan_assigned_at": plan_assigned_at
        })
    
    return {
        "users": result,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1
    }

@api_router.get("/admin/users/{username}")
async def get_user_details(username: str, current_user: dict = Depends(require_admin)):
    """Obtener detalles de un usuario específico"""
    user = await db.users.find_one({"username": username}, {"_id": 0, "hashed_password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Obtener perfil adicional
    profile = await db.user_profiles.find_one({"username": username}, {"_id": 0})
    
    # Contar proyectos del usuario
    projects_count = await db.projects.count_documents({
        "username": username,
        "isDeleted": {"$ne": True}
    })
    
    return {
        **user,
        "profile": profile,
        "projects_count": projects_count
    }

@api_router.put("/admin/users/{username}")
async def update_user(
    username: str, 
    user_data: UserUpdate, 
    current_user: dict = Depends(require_admin)
):
    """Actualizar datos de un usuario"""
    existing_user = await db.users.find_one({"username": username})
    if not existing_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Preparar datos a actualizar
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if user_data.email is not None:
        # Verificar que el email no esté en uso por otro usuario
        email_exists = await db.users.find_one({
            "email": user_data.email,
            "username": {"$ne": username}
        })
        if email_exists:
            raise HTTPException(status_code=400, detail="Este email ya está en uso")
        update_data["email"] = user_data.email
    
    if user_data.full_name is not None:
        update_data["full_name"] = user_data.full_name
    
    if user_data.role is not None:
        # Solo el admin puede cambiar roles
        if user_data.role not in ["user", "admin"]:
            raise HTTPException(status_code=400, detail="Rol inválido")
        update_data["role"] = user_data.role
    
    if user_data.plan is not None:
        # Validar que el plan sea válido
        if user_data.plan not in ["free", "pro", "team"]:
            raise HTTPException(status_code=400, detail="Plan inválido. Opciones: free, pro, team")
        update_data["plan"] = user_data.plan
        # Actualizar is_pro basado en el plan
        update_data["is_pro"] = user_data.plan in ["pro", "team"]
    
    if user_data.is_pro is not None:
        update_data["is_pro"] = user_data.is_pro
    
    if user_data.disabled is not None:
        update_data["disabled"] = user_data.disabled
    
    await db.users.update_one({"username": username}, {"$set": update_data})
    
    # También actualizar el perfil si existe
    if user_data.email is not None:
        await db.user_profiles.update_one(
            {"username": username},
            {"$set": {"email": user_data.email, "updated_at": update_data["updated_at"]}}
        )
    
    logger.info(f"Admin {current_user['username']} actualizó usuario {username}")
    
    return {"message": "Usuario actualizado correctamente"}

@api_router.delete("/admin/users/{username}")
async def delete_user(username: str, current_user: dict = Depends(require_admin)):
    """Eliminar un usuario permanentemente"""
    # No permitir eliminar al propio admin
    if username == current_user["username"]:
        raise HTTPException(
            status_code=400,
            detail="No puedes eliminarte a ti mismo"
        )
    
    # Verificar que el usuario existe
    existing_user = await db.users.find_one({"username": username})
    if not existing_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # No permitir eliminar otros admins (solo el superadmin podría)
    if existing_user.get("role") == "admin" and username != current_user["username"]:
        raise HTTPException(
            status_code=403,
            detail="No puedes eliminar a otro administrador"
        )
    
    # Eliminar usuario
    await db.users.delete_one({"username": username})
    
    # Eliminar perfil del usuario
    await db.user_profiles.delete_one({"username": username})
    
    # Eliminar sesiones del usuario
    await db.user_sessions.delete_many({"user_id": existing_user.get("user_id")})
    
    # Opcionalmente, eliminar los proyectos del usuario (o marcarlos como huérfanos)
    # Por ahora solo los marcamos como eliminados
    await db.projects.update_many(
        {"username": username},
        {"$set": {"isDeleted": True, "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    logger.info(f"Admin {current_user['username']} eliminó usuario {username}")
    
    return {"message": f"Usuario {username} eliminado correctamente"}

@api_router.post("/admin/users/bulk-delete")
async def bulk_delete_users(
    request: BulkDeleteRequest,
    current_user: dict = Depends(require_admin)
):
    """Eliminar múltiples usuarios de forma masiva"""
    usernames = request.usernames
    
    if not usernames:
        raise HTTPException(status_code=400, detail="No se proporcionaron usuarios para eliminar")
    
    # Filtrar: no permitir eliminar al admin actual ni a otros admins
    admin_username = current_user["username"]
    
    # Obtener usuarios a eliminar y verificar permisos
    users_to_delete = await db.users.find({"username": {"$in": usernames}}, {"_id": 0}).to_list(len(usernames))
    
    deleted = []
    skipped = []
    errors = []
    
    for user in users_to_delete:
        username = user.get("username")
        
        # No eliminar al propio admin
        if username == admin_username:
            skipped.append({"username": username, "reason": "No puedes eliminarte a ti mismo"})
            continue
        
        # No eliminar otros admins
        if user.get("role") == "admin":
            skipped.append({"username": username, "reason": "No puedes eliminar a otro administrador"})
            continue
        
        try:
            # Eliminar usuario
            await db.users.delete_one({"username": username})
            await db.user_profiles.delete_one({"username": username})
            await db.user_sessions.delete_many({"user_id": user.get("user_id")})
            
            # Marcar proyectos como eliminados
            await db.projects.update_many(
                {"username": username},
                {"$set": {"isDeleted": True, "deleted_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            deleted.append(username)
        except Exception as e:
            errors.append({"username": username, "error": str(e)})
    
    # Registrar auditoría
    audit_record = {
        "id": f"audit_{uuid.uuid4().hex[:12]}",
        "type": "bulk_delete",
        "admin_username": admin_username,
        "deleted_users": deleted,
        "skipped_users": skipped,
        "total_requested": len(usernames),
        "total_deleted": len(deleted),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.admin_audit_log.insert_one(audit_record)
    
    logger.info(f"Admin {admin_username} eliminó masivamente {len(deleted)} usuarios")
    
    return {
        "message": f"Se eliminaron {len(deleted)} de {len(usernames)} usuarios",
        "deleted": deleted,
        "skipped": skipped,
        "errors": errors
    }

@api_router.post("/admin/users/{username}/impersonate")
async def impersonate_user(
    username: str,
    current_user: dict = Depends(require_admin)
):
    """Acceder como otro usuario (Login as User) - Solo para admins"""
    # Verificar que el usuario existe
    target_user = await db.users.find_one({"username": username})
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # No permitir impersonar a otros admins (seguridad)
    if target_user.get("role") == "admin" and username != current_user["username"]:
        raise HTTPException(
            status_code=403,
            detail="No puedes impersonar a otro administrador"
        )
    
    admin_username = current_user["username"]
    now = datetime.now(timezone.utc)
    
    # Crear token para el usuario impersonado
    # Incluimos información de impersonación en el token
    impersonate_token_data = {
        "sub": target_user.get("user_id") or target_user.get("username"),
        "username": username,
        "role": target_user.get("role", "user"),
        "plan": target_user.get("plan", "free"),
        "impersonated_by": admin_username,
        "impersonation_time": now.isoformat(),
        "exp": now + timedelta(hours=2)  # Token más corto para impersonación
    }
    impersonate_token = jwt.encode(impersonate_token_data, SECRET_KEY, algorithm=ALGORITHM)
    
    # Crear token de retorno para volver al admin
    return_token_data = {
        "sub": current_user.get("user_id") or current_user.get("username"),
        "username": admin_username,
        "role": "admin",
        "plan": "admin",
        "return_from_impersonation": True,
        "exp": now + timedelta(hours=24)
    }
    return_token = jwt.encode(return_token_data, SECRET_KEY, algorithm=ALGORITHM)
    
    # Registrar en auditoría
    audit_record = {
        "id": f"audit_{uuid.uuid4().hex[:12]}",
        "type": "user_impersonation",
        "admin_username": admin_username,
        "target_username": username,
        "target_email": target_user.get("email"),
        "timestamp": now.isoformat(),
        "ip_address": None
    }
    await db.admin_audit_log.insert_one(audit_record)
    
    logger.info(f"Admin {admin_username} inició impersonación como {username}")
    
    return {
        "access_token": impersonate_token,
        "token_type": "bearer",
        "impersonated_user": username,
        "impersonated_email": target_user.get("email"),
        "impersonated_full_name": target_user.get("full_name", ""),
        "admin_user": admin_username,
        "return_token": return_token
    }

@api_router.post("/admin/users/{username}/block")
async def block_user(username: str, current_user: dict = Depends(require_admin)):
    """Bloquear acceso a un usuario"""
    # No permitir bloquearse a sí mismo
    if username == current_user["username"]:
        raise HTTPException(
            status_code=400,
            detail="No puedes bloquearte a ti mismo"
        )
    
    # Verificar que el usuario existe
    existing_user = await db.users.find_one({"username": username})
    if not existing_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # No permitir bloquear otros admins
    if existing_user.get("role") == "admin":
        raise HTTPException(
            status_code=403,
            detail="No puedes bloquear a un administrador"
        )
    
    # Bloquear usuario
    await db.users.update_one(
        {"username": username},
        {"$set": {
            "disabled": True,
            "blocked_at": datetime.now(timezone.utc).isoformat(),
            "blocked_by": current_user["username"]
        }}
    )
    
    # Eliminar todas las sesiones activas del usuario
    await db.user_sessions.delete_many({"user_id": existing_user.get("user_id")})
    
    logger.info(f"Admin {current_user['username']} bloqueó usuario {username}")
    
    return {"message": f"Usuario {username} bloqueado correctamente"}

@api_router.post("/admin/users/{username}/unblock")
async def unblock_user(username: str, current_user: dict = Depends(require_admin)):
    """Desbloquear acceso a un usuario"""
    # Verificar que el usuario existe
    existing_user = await db.users.find_one({"username": username})
    if not existing_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Desbloquear usuario
    await db.users.update_one(
        {"username": username},
        {
            "$set": {
                "disabled": False,
                "unblocked_at": datetime.now(timezone.utc).isoformat(),
                "unblocked_by": current_user["username"]
            },
            "$unset": {
                "blocked_at": "",
                "blocked_by": ""
            }
        }
    )
    
    logger.info(f"Admin {current_user['username']} desbloqueó usuario {username}")
    
    return {"message": f"Usuario {username} desbloqueado correctamente"}

@api_router.post("/admin/users/{username}/change-plan")
async def admin_change_plan(
    username: str,
    plan_data: AdminPlanChange,
    current_user: dict = Depends(require_admin)
):
    """Cambiar plan de un usuario manualmente (sin pasarela de pago)"""
    # Verificar que el usuario existe
    existing_user = await db.users.find_one({"username": username})
    if not existing_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Validar plan
    valid_plans = ["free", "pro", "team", "business", "admin"]
    if plan_data.plan not in valid_plans:
        raise HTTPException(
            status_code=400, 
            detail=f"Plan inválido. Opciones: {', '.join(valid_plans)}"
        )
    
    # Guardar plan anterior para auditoría
    previous_plan = existing_user.get("plan", "free")
    previous_expires = existing_user.get("plan_expires_at")
    previous_override = existing_user.get("plan_override", False)
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Preparar actualización del usuario
    update_data = {
        "plan": plan_data.plan,
        "plan_source": "manual_admin",
        "plan_assigned_by": current_user["username"],
        "plan_assigned_at": now,
        "plan_override": plan_data.unlimited_access,
        "is_pro": plan_data.plan in ["pro", "team", "business", "admin"],
        "updated_at": now
    }
    
    # Manejar fecha de expiración
    if plan_data.expires_at:
        update_data["plan_expires_at"] = plan_data.expires_at
    else:
        # Si no hay fecha, el plan es permanente - eliminar expiración
        update_data["plan_expires_at"] = None
    
    # Actualizar usuario
    await db.users.update_one({"username": username}, {"$set": update_data})
    
    # Crear registro de auditoría
    audit_record = {
        "id": f"audit_{uuid.uuid4().hex[:12]}",
        "type": "plan_change",
        "target_username": username,
        "target_email": existing_user.get("email"),
        "admin_username": current_user["username"],
        "previous_plan": previous_plan,
        "new_plan": plan_data.plan,
        "previous_expires_at": previous_expires,
        "new_expires_at": plan_data.expires_at,
        "previous_override": previous_override,
        "new_override": plan_data.unlimited_access,
        "plan_source": "manual_admin",
        "timestamp": now,
        "ip_address": None  # Podría agregarse si es necesario
    }
    await db.admin_audit_log.insert_one(audit_record)
    
    logger.info(f"Admin {current_user['username']} cambió plan de {username}: {previous_plan} → {plan_data.plan}")
    
    return {
        "message": f"Plan de {username} actualizado a {plan_data.plan}",
        "previous_plan": previous_plan,
        "new_plan": plan_data.plan,
        "expires_at": plan_data.expires_at,
        "unlimited_access": plan_data.unlimited_access
    }

@api_router.get("/admin/audit-log")
async def get_audit_log(
    type: Optional[str] = None,
    username: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(require_admin)
):
    """Obtener historial de auditoría de cambios administrativos"""
    query = {}
    
    if type:
        query["type"] = type
    if username:
        query["$or"] = [
            {"target_username": username},
            {"admin_username": username}
        ]
    
    audit_logs = await db.admin_audit_log.find(
        query,
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    return audit_logs

@api_router.get("/admin/landing-content")
async def get_landing_content(current_user: dict = Depends(require_admin)):
    """Obtener todo el contenido editable de la landing page"""
    content = await db.landing_content.find_one({"id": "main"}, {"_id": 0})
    return content or {}

@api_router.put("/admin/landing-content")
async def update_landing_content(
    request: Request,
    current_user: dict = Depends(require_admin)
):
    """Actualizar cualquier sección del contenido de la landing page"""
    content_data = await request.json()
    
    update_data = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": current_user["username"]
    }
    
    # Actualizar cada campo enviado
    for key, value in content_data.items():
        if key not in ["id", "_id", "updated_at", "updated_by"]:
            update_data[key] = value
    
    await db.landing_content.update_one(
        {"id": "main"},
        {"$set": update_data},
        upsert=True
    )
    
    logger.info(f"Admin {current_user['username']} actualizó contenido de landing page")
    
    return {"message": "Contenido actualizado correctamente"}

@api_router.put("/admin/landing-content/{section}")
async def update_landing_section(
    section: str,
    request: Request,
    current_user: dict = Depends(require_admin)
):
    """Actualizar una sección específica del contenido de la landing"""
    section_data = await request.json()
    
    update_data = {
        section: section_data,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": current_user["username"]
    }
    
    await db.landing_content.update_one(
        {"id": "main"},
        {"$set": update_data},
        upsert=True
    )
    
    logger.info(f"Admin {current_user['username']} actualizó sección {section}")
    
    return {"message": f"Sección {section} actualizada correctamente"}


# ==========================================
# ADMIN - VERIFICATION REMINDERS
# ==========================================

@api_router.post("/admin/run-verification-reminders")
async def run_verification_reminders(current_user: dict = Depends(require_admin)):
    """
    Ejecutar manualmente el proceso de recordatorios de verificación.
    Solo disponible para administradores.
    """
    try:
        result = await reminder_scheduler.run_reminders_now(db)
        logger.info(f"Admin {current_user['username']} ejecutó recordatorios de verificación manualmente")
        return {
            "success": True,
            "message": "Proceso de recordatorios ejecutado",
            "stats": result
        }
    except Exception as e:
        logger.error(f"Error ejecutando recordatorios: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/admin/unverified-users")
async def get_unverified_users(current_user: dict = Depends(require_admin)):
    """
    Obtener lista de usuarios no verificados con estado de recordatorios.
    Solo disponible para administradores.
    """
    try:
        users = await db.users.find(
            {"email_verified": False, "auth_provider": {"$ne": "google"}},
            {
                "_id": 0,
                "username": 1,
                "email": 1,
                "full_name": 1,
                "created_at": 1,
                "reminder_24h_sent": 1,
                "reminder_72h_sent": 1,
                "reminder_7d_sent": 1,
                "reminder_24h_sent_at": 1,
                "reminder_72h_sent_at": 1,
                "reminder_7d_sent_at": 1
            }
        ).to_list(500)
        
        return {
            "total": len(users),
            "users": users
        }
    except Exception as e:
        logger.error(f"Error obteniendo usuarios no verificados: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/admin/email-diagnostics")
async def get_email_diagnostics(current_user: dict = Depends(require_admin)):
    """
    Diagnóstico del sistema de emails.
    Solo disponible para administradores.
    """
    import resend as resend_module
    
    # Verificar configuración
    api_key = os.environ.get("RESEND_API_KEY", "")
    sender_email = os.environ.get("SENDER_EMAIL", "")
    app_url = os.environ.get("APP_URL", "")
    
    diagnostics = {
        "config": {
            "api_key_configured": bool(api_key) and len(api_key) > 10,
            "api_key_preview": api_key[:15] + "..." if api_key else "NOT SET",
            "sender_email": sender_email or "NOT SET",
            "app_url": app_url or "NOT SET (will use localhost)",
            "resend_api_key_loaded": bool(resend_module.api_key)
        },
        "status": "unknown",
        "message": "",
        "recommendations": []
    }
    
    if not api_key:
        diagnostics["status"] = "error"
        diagnostics["message"] = "API Key de Resend no configurada"
        diagnostics["recommendations"].append("Configura RESEND_API_KEY en /app/backend/.env")
    elif not sender_email:
        diagnostics["status"] = "warning"
        diagnostics["message"] = "Email del remitente no configurado"
        diagnostics["recommendations"].append("Configura SENDER_EMAIL en /app/backend/.env")
    else:
        # Intentar obtener info de la cuenta (esto verifica si la key es válida)
        try:
            # No hay un endpoint directo para verificar, pero podemos intentar
            diagnostics["status"] = "configured"
            diagnostics["message"] = "Configuración de email detectada"
            
            if sender_email == "onboarding@resend.dev":
                diagnostics["recommendations"].append(
                    "⚠️ Estás usando el email de prueba de Resend. Solo puedes enviar emails a tu propia dirección."
                )
                diagnostics["recommendations"].append(
                    "Para enviar a otros destinatarios, verifica un dominio en resend.com/domains"
                )
        except Exception as e:
            diagnostics["status"] = "error"
            diagnostics["message"] = f"Error verificando configuración: {str(e)}"
    
    # Obtener últimos intentos de envío desde logs (si están disponibles)
    recent_emails = await db.email_logs.find(
        {},
        {"_id": 0}
    ).sort("timestamp", -1).limit(20).to_list(20)
    
    diagnostics["recent_attempts"] = recent_emails if recent_emails else []
    
    return diagnostics


@api_router.post("/admin/test-email")
async def test_email_send(current_user: dict = Depends(require_admin)):
    """
    Envía un email de prueba al admin.
    Solo disponible para administradores.
    """
    admin_email = current_user.get("email")
    if not admin_email:
        raise HTTPException(status_code=400, detail="El usuario admin no tiene email configurado")
    
    try:
        result = await email_service.send_verification_email(
            admin_email,
            current_user.get("full_name", "Admin"),
            "test-token-123"
        )
        
        # Guardar log del intento
        await db.email_logs.insert_one({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "type": "test",
            "recipient": admin_email,
            "success": result.get("success", False),
            "error": result.get("error"),
            "triggered_by": current_user["username"]
        })
        
        return {
            "success": result.get("success", False),
            "message": result.get("message", ""),
            "error": result.get("error"),
            "sent_to": admin_email
        }
    except Exception as e:
        logger.error(f"Error en test de email: {e}")
        return {
            "success": False,
            "error": str(e),
            "sent_to": admin_email
        }

# Endpoint público para obtener contenido de landing (sin autenticación)
@api_router.get("/landing-content")
async def get_public_landing_content():
    """Obtener contenido de la landing page (público)"""
    content = await db.landing_content.find_one({"id": "main"}, {"_id": 0})
    return content or {}


# ==========================================
# TABLEROS (BOARDS) - ESTILO TRELLO
# ==========================================

@api_router.get("/boards")
async def get_boards(
    company_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtener tableros del usuario.
    Si se especifica company_id, solo retorna tableros de esa empresa.
    """
    username = current_user["username"]
    
    query = {
        "$or": [
            {"owner_username": username},
            {"collaborators": username}
        ],
        "is_archived": False,
        "is_deleted": {"$ne": True}
    }
    
    if company_id:
        # Verificar acceso a la empresa
        company = await db.finanzas_companies.find_one({
            "id": company_id,
            "owner_username": username
        })
        if not company:
            raise HTTPException(status_code=403, detail="No tienes acceso a esta empresa")
        query["company_id"] = company_id
    
    boards = await db.boards.find(query, {"_id": 0}).to_list(100)
    
    return {"boards": boards}


@api_router.post("/boards")
async def create_board(request: CreateBoardRequest, current_user: dict = Depends(get_current_user)):
    """Crear un nuevo tablero con 3 columnas por defecto"""
    username = current_user["username"]
    now = datetime.now(timezone.utc).isoformat()
    board_id = f"board_{uuid.uuid4().hex[:12]}"
    
    # Verificar acceso a empresa si se especifica
    if request.company_id:
        company = await db.finanzas_companies.find_one({
            "id": request.company_id,
            "owner_username": username
        })
        if not company:
            raise HTTPException(status_code=403, detail="No tienes acceso a esta empresa")
    
    # Crear las 3 listas por defecto con colores distintivos
    default_lists = [
        {
            "id": f"list_{uuid.uuid4().hex[:12]}",
            "title": "Abiertas",
            "color": "#06B6D4",  # Cyan/Teal
            "position": 0,
            "cards": [],
            "created_at": now
        },
        {
            "id": f"list_{uuid.uuid4().hex[:12]}",
            "title": "En Progreso",
            "color": "#3B82F6",  # Azul
            "position": 1,
            "cards": [],
            "created_at": now
        },
        {
            "id": f"list_{uuid.uuid4().hex[:12]}",
            "title": "Listo",
            "color": "#8B5CF6",  # Morado/Violeta
            "position": 2,
            "cards": [],
            "created_at": now
        }
    ]
    
    board = {
        "id": board_id,
        "title": request.title,
        "description": request.description or "",
        "background_color": request.background_color or "#3B82F6",
        "background_image": None,
        "owner_username": username,
        "company_id": request.company_id,  # Empresa asociada
        "lists": default_lists,
        "collaborators": [],
        "is_archived": False,
        "created_at": now,
        "updated_at": now
    }
    
    await db.boards.insert_one(board)
    
    # Retornar sin _id
    board.pop("_id", None)
    return {"board": board, "message": "Tablero creado exitosamente"}


# ==========================================
# PAPELERA DE TABLEROS (DEBE IR ANTES DE {board_id})
# ==========================================

@api_router.get("/boards/trash")
async def get_trash_boards(current_user: dict = Depends(get_current_user)):
    """Obtener tableros en la papelera"""
    cursor = db.boards.find(
        {"owner_username": current_user["username"], "is_deleted": True},
        {"_id": 0}
    )
    
    trash_boards = []
    async for board in cursor:
        trash_boards.append({
            "id": board.get("id"),
            "title": board.get("title"),
            "background_color": board.get("background_color"),
            "deleted_at": board.get("deleted_at"),
            "created_at": board.get("created_at"),
            "lists_count": len(board.get("lists", [])),
            "is_onboarding": board.get("is_onboarding", False)
        })
    
    return trash_boards


@api_router.delete("/boards/trash/empty")
async def empty_boards_trash(current_user: dict = Depends(get_current_user)):
    """Vaciar la papelera de tableros"""
    result = await db.boards.delete_many(
        {"owner_username": current_user["username"], "is_deleted": True}
    )
    
    logger.info(f"🗑️ Papelera de tableros vaciada por {current_user['username']}: {result.deleted_count} tableros eliminados")
    return {"message": f"{result.deleted_count} tableros eliminados permanentemente"}


@api_router.get("/boards/{board_id}")
async def get_board(board_id: str, current_user: dict = Depends(get_current_user)):
    """Obtener un tablero específico con sus listas y tarjetas"""
    board = await db.boards.find_one(
        {
            "id": board_id,
            "$or": [
                {"owner_username": current_user["username"]},
                {"collaborators": current_user["username"]}
            ]
        },
        {"_id": 0}
    )
    
    if not board:
        raise HTTPException(status_code=404, detail="Tablero no encontrado")
    
    return {"board": board}


@api_router.put("/boards/{board_id}")
async def update_board(board_id: str, request: UpdateBoardRequest, current_user: dict = Depends(get_current_user)):
    """Actualizar un tablero"""
    board = await db.boards.find_one({"id": board_id, "owner_username": current_user["username"]})
    
    if not board:
        raise HTTPException(status_code=404, detail="Tablero no encontrado o sin permisos")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if request.title is not None:
        update_data["title"] = request.title
    if request.description is not None:
        update_data["description"] = request.description
    if request.background_color is not None:
        update_data["background_color"] = request.background_color
    if request.background_image is not None:
        update_data["background_image"] = request.background_image
    if request.board_labels is not None:
        update_data["board_labels"] = request.board_labels
    
    await db.boards.update_one({"id": board_id}, {"$set": update_data})
    
    updated_board = await db.boards.find_one({"id": board_id}, {"_id": 0})
    return {"board": updated_board, "message": "Tablero actualizado"}


@api_router.post("/boards/{board_id}/duplicate")
async def duplicate_board(board_id: str, current_user: dict = Depends(get_current_user)):
    """Duplicar un tablero con todo su contenido"""
    # Buscar el tablero original
    original_board = await db.boards.find_one({
        "id": board_id, 
        "owner_username": current_user["username"],
        "is_deleted": {"$ne": True}
    })
    
    if not original_board:
        raise HTTPException(status_code=404, detail="Tablero no encontrado o sin permisos")
    
    # Crear nuevo ID para el tablero duplicado
    new_board_id = f"board_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    # Duplicar listas con nuevos IDs para cada lista y tarea
    new_lists = []
    for lst in original_board.get("lists", []):
        new_list_id = f"list_{uuid.uuid4().hex[:8]}"
        new_tasks = []
        for task in lst.get("tasks", []):
            new_task_id = f"task_{uuid.uuid4().hex[:8]}"
            new_task = {**task, "id": new_task_id, "created_at": now}
            new_tasks.append(new_task)
        new_list = {**lst, "id": new_list_id, "tasks": new_tasks}
        new_lists.append(new_list)
    
    # Crear el tablero duplicado
    new_board = {
        "id": new_board_id,
        "title": f"{original_board.get('title', 'Sin título')} (Copia)",
        "description": original_board.get("description", ""),
        "background_color": original_board.get("background_color", "#3B82F6"),
        "background_image": original_board.get("background_image"),
        "owner_username": current_user["username"],
        "lists": new_lists,
        "collaborators": [],
        "is_archived": False,
        "is_deleted": False,
        "created_at": now,
        "updated_at": now
    }
    
    await db.boards.insert_one(new_board)
    new_board.pop("_id", None)
    
    logger.info(f"📋 Tablero {board_id} duplicado como {new_board_id} por {current_user['username']}")
    return {"board": new_board, "message": "Tablero duplicado exitosamente"}


@api_router.delete("/boards/{board_id}")
async def delete_board(board_id: str, current_user: dict = Depends(get_current_user)):
    """Soft delete - Mover tablero a la papelera"""
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.boards.update_one(
        {"id": board_id, "owner_username": current_user["username"], "is_deleted": {"$ne": True}},
        {
            "$set": {
                "is_deleted": True,
                "deleted_at": now,
                "updated_at": now
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Tablero no encontrado o sin permisos")
    
    logger.info(f"📋 Tablero {board_id} enviado a papelera por {current_user['username']}")
    return {"message": "Tablero enviado a la papelera", "deleted_at": now}


@api_router.post("/boards/{board_id}/restore")
async def restore_board(board_id: str, current_user: dict = Depends(get_current_user)):
    """Restaurar un tablero desde la papelera"""
    result = await db.boards.update_one(
        {"id": board_id, "owner_username": current_user["username"], "is_deleted": True},
        {
            "$set": {"is_deleted": False, "updated_at": datetime.now(timezone.utc).isoformat()},
            "$unset": {"deleted_at": ""}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Tablero no encontrado en la papelera")
    
    logger.info(f"📋 Tablero {board_id} restaurado por {current_user['username']}")
    return {"message": "Tablero restaurado exitosamente"}


@api_router.delete("/boards/{board_id}/permanent")
async def delete_board_permanent(board_id: str, current_user: dict = Depends(get_current_user)):
    """Eliminar permanentemente un tablero de la papelera"""
    result = await db.boards.delete_one(
        {"id": board_id, "owner_username": current_user["username"], "is_deleted": True}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tablero no encontrado en la papelera")
    
    logger.info(f"🗑️ Tablero {board_id} eliminado permanentemente por {current_user['username']}")
    return {"message": "Tablero eliminado permanentemente"}


# ==========================================
# LISTAS (COLUMNS)
# ==========================================

@api_router.post("/boards/{board_id}/lists")
async def create_list(board_id: str, request: CreateListRequest, current_user: dict = Depends(get_current_user)):
    """Crear una nueva lista en el tablero"""
    board = await db.boards.find_one(
        {"id": board_id, "owner_username": current_user["username"]},
        {"_id": 0}
    )
    
    if not board:
        raise HTTPException(status_code=404, detail="Tablero no encontrado")
    
    # Calcular posición
    existing_lists = board.get("lists", [])
    position = request.position if request.position is not None else len(existing_lists)
    
    new_list = {
        "id": f"list_{uuid.uuid4().hex[:12]}",
        "title": request.title,
        "cards": [],
        "position": position,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.boards.update_one(
        {"id": board_id},
        {
            "$push": {"lists": new_list},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {"list": new_list, "message": "Lista creada"}


@api_router.put("/boards/{board_id}/lists/reorder")
async def reorder_lists(board_id: str, request: ReorderListsRequest, current_user: dict = Depends(get_current_user)):
    """Reordenar las listas del tablero"""
    board = await db.boards.find_one(
        {"id": board_id, "owner_username": current_user["username"]},
        {"_id": 0}
    )
    
    if not board:
        raise HTTPException(status_code=404, detail="Tablero no encontrado")
    
    # Crear un diccionario de listas por ID
    lists_dict = {lst["id"]: lst for lst in board.get("lists", [])}
    
    # Reordenar según el nuevo orden
    reordered_lists = []
    for i, list_id in enumerate(request.list_ids):
        if list_id in lists_dict:
            lst = lists_dict[list_id]
            lst["position"] = i
            reordered_lists.append(lst)
    
    await db.boards.update_one(
        {"id": board_id},
        {
            "$set": {
                "lists": reordered_lists,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": "Listas reordenadas", "lists": reordered_lists}


@api_router.put("/boards/{board_id}/lists/{list_id}")
async def update_list(board_id: str, list_id: str, request: UpdateListRequest, current_user: dict = Depends(get_current_user)):
    """Actualizar una lista"""
    update_fields = {}
    
    if request.title is not None:
        update_fields["lists.$.title"] = request.title
    if request.position is not None:
        update_fields["lists.$.position"] = request.position
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No hay campos para actualizar")
    
    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.boards.update_one(
        {"id": board_id, "owner_username": current_user["username"], "lists.id": list_id},
        {"$set": update_fields}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Lista no encontrada")
    
    return {"message": "Lista actualizada"}


@api_router.delete("/boards/{board_id}/lists/{list_id}")
async def delete_list(board_id: str, list_id: str, current_user: dict = Depends(get_current_user)):
    """Eliminar una lista"""
    result = await db.boards.update_one(
        {"id": board_id, "owner_username": current_user["username"]},
        {
            "$pull": {"lists": {"id": list_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Lista no encontrada")
    
    return {"message": "Lista eliminada"}


# ==========================================
# TARJETAS (CARDS)
# ==========================================

@api_router.post("/boards/{board_id}/lists/{list_id}/cards")
async def create_card(board_id: str, list_id: str, request: CreateCardRequest, current_user: dict = Depends(get_current_user)):
    """Crear una nueva tarjeta en una lista"""
    board = await db.boards.find_one(
        {"id": board_id, "owner_username": current_user["username"]},
        {"_id": 0}
    )
    
    if not board:
        raise HTTPException(status_code=404, detail="Tablero no encontrado")
    
    # Encontrar la lista
    target_list = None
    for lst in board.get("lists", []):
        if lst["id"] == list_id:
            target_list = lst
            break
    
    if not target_list:
        raise HTTPException(status_code=404, detail="Lista no encontrada")
    
    now = datetime.now(timezone.utc).isoformat()
    new_card = {
        "id": f"card_{uuid.uuid4().hex[:12]}",
        "title": request.title,
        "description": request.description or "",
        "labels": request.labels or [],
        "position": len(target_list.get("cards", [])),
        "created_at": now,
        "updated_at": now
    }
    
    await db.boards.update_one(
        {"id": board_id, "lists.id": list_id},
        {
            "$push": {"lists.$.cards": new_card},
            "$set": {"updated_at": now}
        }
    )
    
    return {"card": new_card, "message": "Tarjeta creada"}


@api_router.put("/boards/{board_id}/lists/{list_id}/cards/{card_id}")
async def update_card(board_id: str, list_id: str, card_id: str, request: UpdateCardRequest, current_user: dict = Depends(get_current_user)):
    """Actualizar una tarjeta"""
    board = await db.boards.find_one(
        {"id": board_id, "owner_username": current_user["username"]},
        {"_id": 0}
    )
    
    if not board:
        raise HTTPException(status_code=404, detail="Tablero no encontrado")
    
    # Actualizar la tarjeta dentro de la lista
    now = datetime.now(timezone.utc).isoformat()
    updated = False
    
    for lst in board.get("lists", []):
        if lst["id"] == list_id:
            for card in lst.get("cards", []):
                if card["id"] == card_id:
                    if request.title is not None:
                        card["title"] = request.title
                    if request.description is not None:
                        card["description"] = request.description
                    if request.labels is not None:
                        card["labels"] = request.labels
                    if request.position is not None:
                        card["position"] = request.position
                    if request.due_date is not None:
                        card["due_date"] = request.due_date
                    if request.due_time is not None:
                        card["due_time"] = request.due_time
                    if request.due_date_activities is not None:
                        card["due_date_activities"] = request.due_date_activities
                    if request.checklist is not None:
                        card["checklist"] = request.checklist
                    if request.comments is not None:
                        card["comments"] = request.comments
                    if request.priority is not None:
                        card["priority"] = request.priority
                    if request.attachments is not None:
                        card["attachments"] = request.attachments
                    if request.is_pinned is not None:
                        card["is_pinned"] = request.is_pinned
                    card["updated_at"] = now
                    updated = True
                    break
            break
    
    if not updated:
        raise HTTPException(status_code=404, detail="Tarjeta no encontrada")
    
    await db.boards.update_one(
        {"id": board_id},
        {"$set": {"lists": board["lists"], "updated_at": now}}
    )
    
    return {"message": "Tarjeta actualizada"}


@api_router.delete("/boards/{board_id}/lists/{list_id}/cards/{card_id}")
async def delete_card(board_id: str, list_id: str, card_id: str, current_user: dict = Depends(get_current_user)):
    """Eliminar una tarjeta"""
    result = await db.boards.update_one(
        {"id": board_id, "owner_username": current_user["username"], "lists.id": list_id},
        {
            "$pull": {"lists.$.cards": {"id": card_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Tarjeta no encontrada")
    
    return {"message": "Tarjeta eliminada"}


# ==========================================
# UPLOAD DE IMÁGENES PARA TARJETAS
# ==========================================

# Configuración de tamaños de imagen
LARGE_IMAGE_MAX_WIDTH = 500   # Ancho máximo para vista ampliada
PREVIEW_IMAGE_MAX_WIDTH = 280  # Ancho máximo para preview en tarjetas
WEBP_QUALITY_LARGE = 85       # Calidad para imagen grande
WEBP_QUALITY_PREVIEW = 75     # Calidad para preview (más ligero)

def process_image_to_webp(img, max_width, quality):
    """Procesa una imagen: redimensiona manteniendo proporción y convierte a WebP"""
    original_width, original_height = img.size
    
    # Solo redimensionar si es más ancha que el máximo
    if original_width > max_width:
        ratio = max_width / original_width
        new_width = max_width
        new_height = int(original_height * ratio)
        img_resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
    else:
        img_resized = img.copy()
    
    # Convertir a WebP
    buffer = io.BytesIO()
    img_resized.save(buffer, format='WEBP', quality=quality, optimize=True)
    webp_data = buffer.getvalue()
    
    return {
        "data": base64.b64encode(webp_data).decode('utf-8'),
        "width": img_resized.size[0],
        "height": img_resized.size[1],
        "size_kb": round(len(webp_data) / 1024, 2)
    }

@api_router.post("/boards/{board_id}/lists/{list_id}/cards/{card_id}/attachments")
async def upload_card_attachment(
    board_id: str, 
    list_id: str, 
    card_id: str, 
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Subir imagen adjunta a una tarjeta - genera versión grande (500px) y preview"""
    
    # Verificar que es una imagen
    allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg']
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Solo se permiten imágenes (jpg, png, gif, webp)")
    
    # Verificar que el tablero existe y pertenece al usuario
    board = await db.boards.find_one(
        {"id": board_id, "owner_username": current_user["username"]},
        {"_id": 0}
    )
    
    if not board:
        raise HTTPException(status_code=404, detail="Tablero no encontrado")
    
    try:
        # Leer la imagen
        image_data = await file.read()
        img = Image.open(io.BytesIO(image_data))
        
        # Convertir a RGB si es necesario (para PNG con transparencia)
        if img.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Generar versión GRANDE (500px ancho máximo) para vista ampliada
        large_image = process_image_to_webp(img, LARGE_IMAGE_MAX_WIDTH, WEBP_QUALITY_LARGE)
        
        # Generar versión PREVIEW (280px ancho máximo) para tarjetas y modal
        preview_image = process_image_to_webp(img, PREVIEW_IMAGE_MAX_WIDTH, WEBP_QUALITY_PREVIEW)
        
        # Crear registro de adjunto con ambas versiones
        attachment_id = f"attach_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()
        
        attachment = {
            "id": attachment_id,
            "filename": file.filename,
            "content_type": "image/webp",
            # Versión preview (para tarjetas y modal)
            "data": preview_image["data"],
            "width": preview_image["width"],
            "height": preview_image["height"],
            "size_kb": preview_image["size_kb"],
            # Versión grande (para vista ampliada)
            "data_large": large_image["data"],
            "width_large": large_image["width"],
            "height_large": large_image["height"],
            "size_kb_large": large_image["size_kb"],
            # Metadata
            "original_width": img.size[0],
            "original_height": img.size[1],
            "uploaded_at": now,
            "uploaded_by": current_user["username"]
        }
        
        # Actualizar la tarjeta con el nuevo adjunto
        updated = False
        for lst in board.get("lists", []):
            if lst["id"] == list_id:
                for card in lst.get("cards", []):
                    if card["id"] == card_id:
                        if "attachments" not in card:
                            card["attachments"] = []
                        card["attachments"].append(attachment)
                        card["updated_at"] = now
                        updated = True
                        break
                break
        
        if not updated:
            raise HTTPException(status_code=404, detail="Tarjeta no encontrada")
        
        await db.boards.update_one(
            {"id": board_id},
            {"$set": {"lists": board["lists"], "updated_at": now}}
        )
        
        # Retornar adjunto con ambas versiones
        attachment_response = {
            "id": attachment_id,
            "filename": file.filename,
            "content_type": "image/webp",
            # Preview
            "width": preview_image["width"],
            "height": preview_image["height"],
            "size_kb": preview_image["size_kb"],
            "data_url": f"data:image/webp;base64,{preview_image['data']}",
            # Large
            "width_large": large_image["width"],
            "height_large": large_image["height"],
            "size_kb_large": large_image["size_kb"],
            "data_url_large": f"data:image/webp;base64,{large_image['data']}",
            "uploaded_at": now
        }
        
        total_kb = preview_image["size_kb"] + large_image["size_kb"]
        logger.info(f"📎 Imagen adjuntada: {file.filename} → Preview:{preview_image['width']}x{preview_image['height']} ({preview_image['size_kb']}KB) + Large:{large_image['width']}x{large_image['height']} ({large_image['size_kb']}KB) = {total_kb}KB total")
        return {"attachment": attachment_response, "message": "Imagen adjuntada exitosamente"}
        
    except Exception as e:
        logger.error(f"Error procesando imagen: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error procesando la imagen: {str(e)}")


@api_router.delete("/boards/{board_id}/lists/{list_id}/cards/{card_id}/attachments/{attachment_id}")
async def delete_card_attachment(
    board_id: str, 
    list_id: str, 
    card_id: str,
    attachment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Eliminar un adjunto de una tarjeta"""
    board = await db.boards.find_one(
        {"id": board_id, "owner_username": current_user["username"]},
        {"_id": 0}
    )
    
    if not board:
        raise HTTPException(status_code=404, detail="Tablero no encontrado")
    
    now = datetime.now(timezone.utc).isoformat()
    deleted = False
    
    for lst in board.get("lists", []):
        if lst["id"] == list_id:
            for card in lst.get("cards", []):
                if card["id"] == card_id:
                    original_count = len(card.get("attachments", []))
                    card["attachments"] = [a for a in card.get("attachments", []) if a["id"] != attachment_id]
                    if len(card.get("attachments", [])) < original_count:
                        deleted = True
                        card["updated_at"] = now
                    break
            break
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Adjunto no encontrado")
    
    await db.boards.update_one(
        {"id": board_id},
        {"$set": {"lists": board["lists"], "updated_at": now}}
    )
    
    return {"message": "Adjunto eliminado"}


@api_router.post("/boards/{board_id}/cards/move")
async def move_card(board_id: str, request: MoveCardRequest, current_user: dict = Depends(get_current_user)):
    """Mover una tarjeta entre listas o reordenar dentro de la misma lista"""
    board = await db.boards.find_one(
        {"id": board_id, "owner_username": current_user["username"]},
        {"_id": 0}
    )
    
    if not board:
        raise HTTPException(status_code=404, detail="Tablero no encontrado")
    
    lists = board.get("lists", [])
    source_list = None
    dest_list = None
    card_to_move = None
    
    # Encontrar las listas y la tarjeta
    for lst in lists:
        if lst["id"] == request.source_list_id:
            source_list = lst
            for card in lst.get("cards", []):
                if card["id"] == request.card_id:
                    card_to_move = card
                    break
        if lst["id"] == request.destination_list_id:
            dest_list = lst
    
    if not source_list or not dest_list or not card_to_move:
        raise HTTPException(status_code=404, detail="Lista o tarjeta no encontrada")
    
    # Remover de la lista origen
    source_list["cards"] = [c for c in source_list["cards"] if c["id"] != request.card_id]
    
    # Actualizar posiciones en lista origen
    for i, card in enumerate(source_list["cards"]):
        card["position"] = i
    
    # Insertar en la lista destino
    card_to_move["position"] = request.new_position
    card_to_move["updated_at"] = datetime.now(timezone.utc).isoformat()
    dest_list["cards"].insert(request.new_position, card_to_move)
    
    # Actualizar posiciones en lista destino
    for i, card in enumerate(dest_list["cards"]):
        card["position"] = i
    
    await db.boards.update_one(
        {"id": board_id},
        {"$set": {"lists": lists, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Tarjeta movida", "lists": lists}


@api_router.get("/boards/colors")
async def get_board_colors():
    """Obtener colores disponibles para tableros"""
    return {"colors": BOARD_COLORS, "label_colors": CARD_LABEL_COLORS}


# ==========================================
# PAYPAL SUBSCRIPTION ENDPOINTS
# ==========================================

class CreateSubscriptionRequest(BaseModel):
    plan_id: str  # "personal", "team", "enterprise"

class ExecuteSubscriptionRequest(BaseModel):
    token: str

class CancelSubscriptionRequest(BaseModel):
    reason: Optional[str] = "Usuario canceló la suscripción"

@api_router.get("/paypal/client-id")
async def get_paypal_client_id():
    """Obtener el Client ID de PayPal para el frontend"""
    client_id = os.environ.get("PAYPAL_CLIENT_ID", "")
    if not client_id:
        raise HTTPException(status_code=500, detail="PayPal no está configurado")
    return {"client_id": client_id}

@api_router.post("/paypal/create-subscription")
async def create_paypal_subscription(
    request: CreateSubscriptionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Crear una suscripción de PayPal para el usuario"""
    
    # Verificar que el plan es válido
    valid_plans = ["personal", "team", "enterprise"]
    if request.plan_id not in valid_plans:
        raise HTTPException(status_code=400, detail=f"Plan inválido. Opciones: {', '.join(valid_plans)}")
    
    # Verificar que el usuario no tenga ya una suscripción activa
    user = await db.users.find_one({"username": current_user["username"]})
    if user and user.get("paypal_subscription_id") and user.get("subscription_status") == "ACTIVE":
        raise HTTPException(
            status_code=400, 
            detail="Ya tienes una suscripción activa. Cancélala primero para cambiar de plan."
        )
    
    # URLs de retorno - usar la URL externa del frontend
    frontend_url = os.environ.get("FRONTEND_URL", "")
    if not frontend_url:
        # Intentar obtener de CORS_ORIGINS o usar un fallback
        cors_origins = os.environ.get("CORS_ORIGINS", "")
        if cors_origins and cors_origins != "*":
            frontend_url = cors_origins.split(",")[0].strip()
        else:
            frontend_url = "http://localhost:3000"
    
    return_url = f"{frontend_url}/#subscription-success"
    cancel_url = f"{frontend_url}/#subscription-cancel"
    
    logger.info(f"Creating PayPal subscription for plan: {request.plan_id}")
    logger.info(f"Return URL: {return_url}")
    
    # Buscar o crear plan en PayPal
    plan_mapping = await db.paypal_plans.find_one({"mindora_plan_id": request.plan_id})
    
    if not plan_mapping:
        # Crear producto y plan en PayPal
        logger.info(f"Creating new PayPal product for plan: {request.plan_id}")
        product_id = await paypal_service.create_paypal_product(request.plan_id)
        if not product_id:
            raise HTTPException(status_code=500, detail="Error creando producto en PayPal. Verifica las credenciales.")
        
        logger.info(f"Product created: {product_id}, now creating billing plan...")
        plan_result = await paypal_service.create_paypal_plan(
            request.plan_id, 
            product_id
        )
        
        if not plan_result:
            raise HTTPException(status_code=500, detail="Error creando plan de suscripción en PayPal")
        
        # Guardar mapeo de plan
        plan_mapping = {
            "mindora_plan_id": request.plan_id,
            "paypal_plan_id": plan_result["id"],
            "paypal_product_id": product_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.paypal_plans.insert_one(plan_mapping)
        logger.info(f"Plan mapping saved: {plan_mapping}")
    
    # Crear suscripción
    logger.info(f"Creating subscription with PayPal plan: {plan_mapping['paypal_plan_id']}")
    subscription_result = await paypal_service.create_subscription(
        plan_mapping["paypal_plan_id"],
        return_url,
        cancel_url
    )
    
    if not subscription_result:
        raise HTTPException(status_code=500, detail="Error creando suscripción en PayPal")
    
    # Guardar intento de suscripción pendiente
    await db.subscription_attempts.insert_one({
        "username": current_user["username"],
        "plan_id": request.plan_id,
        "paypal_subscription_id": subscription_result.get("subscription_id"),
        "status": "PENDING",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    logger.info(f"Subscription created successfully, approval URL: {subscription_result.get('approval_url')}")
    
    return {
        "approval_url": subscription_result["approval_url"],
        "token": subscription_result.get("token")
    }

@api_router.post("/paypal/execute-subscription")
async def execute_paypal_subscription(
    request: ExecuteSubscriptionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Ejecutar/confirmar una suscripción después de la aprobación del usuario"""
    
    # Buscar el intento de suscripción
    attempt = await db.subscription_attempts.find_one({
        "username": current_user["username"],
        "paypal_token": request.token,
        "status": "PENDING"
    })
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Suscripción no encontrada o ya procesada")
    
    # Ejecutar la suscripción en PayPal
    result = await paypal_service.execute_subscription(request.token)
    
    if not result:
        # Marcar como fallido
        await db.subscription_attempts.update_one(
            {"_id": attempt["_id"]},
            {"$set": {"status": "FAILED", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        raise HTTPException(status_code=500, detail="Error ejecutando suscripción en PayPal")
    
    # Actualizar el usuario con la suscripción
    plan_id = attempt["plan_id"]
    now = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one(
        {"username": current_user["username"]},
        {
            "$set": {
                "plan": plan_id,
                "is_pro": plan_id in ["personal", "team", "enterprise"],
                "paypal_subscription_id": result["agreement_id"],
                "subscription_status": result.get("state", "ACTIVE"),
                "subscription_start_date": result.get("start_date"),
                "subscription_updated_at": now,
                "updated_at": now
            }
        }
    )
    
    # Actualizar intento como completado
    await db.subscription_attempts.update_one(
        {"_id": attempt["_id"]},
        {
            "$set": {
                "status": "COMPLETED",
                "paypal_agreement_id": result["agreement_id"],
                "updated_at": now
            }
        }
    )
    
    logger.info(f"Usuario {current_user['username']} suscrito al plan {plan_id}")
    
    return {
        "success": True,
        "plan_id": plan_id,
        "subscription_id": result["agreement_id"],
        "status": result.get("state", "ACTIVE")
    }

class ConfirmSubscriptionRequest(BaseModel):
    subscription_id: Optional[str] = None

@api_router.post("/paypal/confirm-subscription")
async def confirm_paypal_subscription(
    request: ConfirmSubscriptionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Confirmar una suscripción cuando el usuario regresa de PayPal"""
    
    logger.info(f"Confirming subscription for user: {current_user['username']}")
    
    # Buscar el intento de suscripción pendiente más reciente del usuario
    attempt = await db.subscription_attempts.find_one(
        {
            "username": current_user["username"],
            "status": "PENDING"
        },
        sort=[("created_at", -1)]  # El más reciente
    )
    
    if not attempt:
        # Verificar si ya tiene una suscripción activa
        user = await db.users.find_one({"username": current_user["username"]})
        if user and user.get("subscription_status") == "ACTIVE":
            plan_name = PLANS_CONFIG.get(user.get("plan", ""), {}).get("display_name", user.get("plan", "Premium"))
            return {
                "success": True,
                "plan_id": user.get("plan"),
                "plan_name": plan_name,
                "subscription_id": user.get("paypal_subscription_id"),
                "status": "ACTIVE",
                "message": "Ya tienes una suscripción activa"
            }
        raise HTTPException(status_code=404, detail="No se encontró suscripción pendiente")
    
    # Obtener detalles de la suscripción de PayPal
    subscription_id = request.subscription_id or attempt.get("paypal_subscription_id")
    
    if subscription_id:
        # Verificar estado en PayPal
        subscription_details = await paypal_service.get_subscription_details(subscription_id)
        logger.info(f"PayPal subscription details: {subscription_details}")
        
        if subscription_details:
            paypal_status = subscription_details.get("status", "")
            
            # Si la suscripción está activa o aprobada en PayPal
            if paypal_status in ["ACTIVE", "APPROVED"]:
                plan_id = attempt["plan_id"]
                now = datetime.now(timezone.utc).isoformat()
                plan_name = PLANS_CONFIG.get(plan_id, {}).get("display_name", plan_id.capitalize())
                
                # Actualizar el usuario
                await db.users.update_one(
                    {"username": current_user["username"]},
                    {
                        "$set": {
                            "plan": plan_id,
                            "is_pro": plan_id in ["personal", "team", "enterprise"],
                            "paypal_subscription_id": subscription_id,
                            "subscription_status": "ACTIVE",
                            "subscription_start_date": subscription_details.get("start_time"),
                            "subscription_updated_at": now,
                            "updated_at": now
                        }
                    }
                )
                
                # Marcar el intento como completado
                await db.subscription_attempts.update_one(
                    {"_id": attempt["_id"]},
                    {
                        "$set": {
                            "status": "COMPLETED",
                            "paypal_subscription_id": subscription_id,
                            "updated_at": now
                        }
                    }
                )
                
                logger.info(f"Subscription confirmed for {current_user['username']}, plan: {plan_id}")
                
                return {
                    "success": True,
                    "plan_id": plan_id,
                    "plan_name": plan_name,
                    "subscription_id": subscription_id,
                    "status": "ACTIVE"
                }
    
    # Si no pudimos confirmar con PayPal, verificar si el usuario simplemente regresó
    # y la suscripción puede estar pendiente de aprobación
    plan_id = attempt["plan_id"]
    plan_name = PLANS_CONFIG.get(plan_id, {}).get("display_name", plan_id.capitalize())
    
    # Asumir que si el usuario regresó con success, la suscripción está activa
    # PayPal enviará webhook para confirmar
    now = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one(
        {"username": current_user["username"]},
        {
            "$set": {
                "plan": plan_id,
                "is_pro": plan_id in ["personal", "team", "enterprise"],
                "paypal_subscription_id": attempt.get("paypal_subscription_id"),
                "subscription_status": "APPROVAL_PENDING",
                "subscription_updated_at": now,
                "updated_at": now
            }
        }
    )
    
    await db.subscription_attempts.update_one(
        {"_id": attempt["_id"]},
        {"$set": {"status": "APPROVAL_PENDING", "updated_at": now}}
    )
    
    return {
        "success": True,
        "plan_id": plan_id,
        "plan_name": plan_name,
        "subscription_id": attempt.get("paypal_subscription_id"),
        "status": "APPROVAL_PENDING",
        "message": "Suscripción pendiente de confirmación. Se activará en breve."
    }

@api_router.post("/paypal/cancel-subscription")
async def cancel_paypal_subscription(
    request: CancelSubscriptionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Cancelar la suscripción activa del usuario"""
    
    user = await db.users.find_one({"username": current_user["username"]})
    
    if not user or not user.get("paypal_subscription_id"):
        raise HTTPException(status_code=404, detail="No tienes una suscripción activa")
    
    # Cancelar en PayPal
    success = await paypal_service.cancel_subscription(
        user["paypal_subscription_id"],
        request.reason
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Error cancelando suscripción en PayPal")
    
    # Actualizar usuario
    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one(
        {"username": current_user["username"]},
        {
            "$set": {
                "plan": "free",
                "is_pro": False,
                "subscription_status": "CANCELLED",
                "subscription_cancelled_at": now,
                "subscription_updated_at": now,
                "updated_at": now
            }
        }
    )
    
    logger.info(f"Usuario {current_user['username']} canceló su suscripción")
    
    return {"success": True, "message": "Suscripción cancelada correctamente"}

@api_router.get("/paypal/subscription-status")
async def get_subscription_status(current_user: dict = Depends(get_current_user)):
    """Obtener el estado de la suscripción del usuario"""
    
    user = await db.users.find_one({"username": current_user["username"]}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return {
        "plan": user.get("plan", "free"),
        "is_pro": user.get("is_pro", False),
        "subscription_id": user.get("paypal_subscription_id"),
        "subscription_status": user.get("subscription_status"),
        "subscription_start_date": user.get("subscription_start_date"),
        "subscription_cancelled_at": user.get("subscription_cancelled_at")
    }

@api_router.post("/paypal/webhook")
async def paypal_webhook(request: Request):
    """
    Endpoint para recibir webhooks de PayPal
    Eventos manejados:
    - BILLING.SUBSCRIPTION.ACTIVATED
    - BILLING.SUBSCRIPTION.CANCELLED
    - BILLING.SUBSCRIPTION.SUSPENDED
    - PAYMENT.SALE.COMPLETED
    - PAYMENT.SALE.DENIED
    """
    
    try:
        body = await request.json()
        event_type = body.get("event_type", "")
        event_id = body.get("id", "")
        resource = body.get("resource", {})
        
        logger.info(f"📨 PayPal Webhook recibido - Evento: {event_type}, ID: {event_id}")
        logger.info(f"📋 Resource data: {resource}")
        
        # Registrar TODOS los eventos en la colección paypal_events para auditoría
        await db.paypal_events.insert_one({
            "event_id": event_id,
            "event_type": event_type,
            "resource": resource,
            "raw_body": body,
            "received_at": datetime.now(timezone.utc).isoformat(),
            "processed": False
        })
        
        # Obtener el ID de la suscripción según el tipo de evento
        subscription_id = resource.get("id") or resource.get("billing_agreement_id")
        
        # Manejar diferentes tipos de eventos
        if event_type == "BILLING.SUBSCRIPTION.ACTIVATED":
            # Suscripción activada exitosamente
            logger.info(f"✅ Suscripción ACTIVADA: {subscription_id}")
            
            if subscription_id:
                result = await db.users.update_one(
                    {"paypal_subscription_id": subscription_id},
                    {"$set": {
                        "subscription_status": "ACTIVE",
                        "subscription_updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                logger.info(f"📝 Usuario actualizado: {result.modified_count} documento(s)")
                
                # Marcar evento como procesado
                await db.paypal_events.update_one(
                    {"event_id": event_id},
                    {"$set": {"processed": True, "processed_at": datetime.now(timezone.utc).isoformat()}}
                )
        
        elif event_type == "BILLING.SUBSCRIPTION.CANCELLED":
            # Suscripción cancelada por usuario o PayPal
            logger.info(f"❌ Suscripción CANCELADA: {subscription_id}")
            
            if subscription_id:
                result = await db.users.update_one(
                    {"paypal_subscription_id": subscription_id},
                    {"$set": {
                        "plan": "free",
                        "is_pro": False,
                        "subscription_status": "CANCELLED",
                        "subscription_cancelled_at": datetime.now(timezone.utc).isoformat(),
                        "subscription_updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                logger.info(f"📝 Usuario degradado a plan free: {result.modified_count} documento(s)")
                
                await db.paypal_events.update_one(
                    {"event_id": event_id},
                    {"$set": {"processed": True, "processed_at": datetime.now(timezone.utc).isoformat()}}
                )
        
        elif event_type == "BILLING.SUBSCRIPTION.SUSPENDED":
            # Suscripción suspendida (fallo de pago recurrente)
            logger.info(f"⚠️ Suscripción SUSPENDIDA: {subscription_id}")
            
            if subscription_id:
                result = await db.users.update_one(
                    {"paypal_subscription_id": subscription_id},
                    {"$set": {
                        "subscription_status": "SUSPENDED",
                        "subscription_suspended_at": datetime.now(timezone.utc).isoformat(),
                        "subscription_updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                logger.info(f"📝 Suscripción suspendida: {result.modified_count} documento(s)")
                
                await db.paypal_events.update_one(
                    {"event_id": event_id},
                    {"$set": {"processed": True, "processed_at": datetime.now(timezone.utc).isoformat()}}
                )
        
        elif event_type == "PAYMENT.SALE.COMPLETED":
            # Pago mensual completado exitosamente
            payment_id = resource.get("id")
            billing_agreement_id = resource.get("billing_agreement_id")
            amount = resource.get("amount", {})
            
            logger.info(f"💰 Pago COMPLETADO: {payment_id}, Monto: {amount.get('total')} {amount.get('currency')}")
            
            if billing_agreement_id:
                # Registrar el pago en colección de pagos
                await db.payments.insert_one({
                    "id": str(uuid.uuid4()),
                    "paypal_subscription_id": billing_agreement_id,
                    "paypal_payment_id": payment_id,
                    "amount": amount.get("total"),
                    "currency": amount.get("currency"),
                    "status": "COMPLETED",
                    "payer_email": resource.get("payer", {}).get("email_address"),
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
                
                # Asegurar que el usuario sigue activo
                await db.users.update_one(
                    {"paypal_subscription_id": billing_agreement_id},
                    {"$set": {
                        "subscription_status": "ACTIVE",
                        "last_payment_at": datetime.now(timezone.utc).isoformat(),
                        "subscription_updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                await db.paypal_events.update_one(
                    {"event_id": event_id},
                    {"$set": {"processed": True, "processed_at": datetime.now(timezone.utc).isoformat()}}
                )
        
        elif event_type == "PAYMENT.SALE.DENIED":
            # Pago rechazado
            payment_id = resource.get("id")
            billing_agreement_id = resource.get("billing_agreement_id")
            
            logger.warning(f"🚫 Pago DENEGADO: {payment_id}")
            
            if billing_agreement_id:
                # Registrar el pago fallido
                await db.payments.insert_one({
                    "id": str(uuid.uuid4()),
                    "paypal_subscription_id": billing_agreement_id,
                    "paypal_payment_id": payment_id,
                    "amount": resource.get("amount", {}).get("total"),
                    "currency": resource.get("amount", {}).get("currency"),
                    "status": "DENIED",
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
                
                # Actualizar estado del usuario
                await db.users.update_one(
                    {"paypal_subscription_id": billing_agreement_id},
                    {"$set": {
                        "subscription_status": "PAYMENT_FAILED",
                        "last_payment_failed_at": datetime.now(timezone.utc).isoformat(),
                        "subscription_updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                await db.paypal_events.update_one(
                    {"event_id": event_id},
                    {"$set": {"processed": True, "processed_at": datetime.now(timezone.utc).isoformat()}}
                )
        
        else:
            logger.info(f"ℹ️ Evento no manejado: {event_type}")
        
        return {"status": "received", "event_type": event_type}
    
    except Exception as e:
        logger.error(f"❌ Error procesando webhook de PayPal: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return {"status": "error", "message": str(e)}


# ==========================================
# TIME TRACKING - REGISTRO DE TIEMPO
# ==========================================

class StartTimeTrackingRequest(BaseModel):
    task_id: str
    board_id: str
    list_id: str
    task_title: Optional[str] = None

class StopTimeTrackingRequest(BaseModel):
    task_id: str

class TimeEntryResponse(BaseModel):
    id: str
    user_id: str
    username: str
    task_id: str
    board_id: str
    start_time: str
    end_time: Optional[str] = None
    duration: Optional[int] = None  # Duración en segundos
    date: str
    created_at: str


@api_router.post("/time-tracking/start")
async def start_time_tracking(request: StartTimeTrackingRequest, current_user: dict = Depends(get_current_user)):
    """Iniciar registro de tiempo para una tarea"""
    username = current_user["username"]
    
    # Verificar si ya tiene un registro activo
    active_entry = await db.time_entries.find_one({
        "username": username,
        "end_time": None
    })
    
    if active_entry:
        # Si hay uno activo, detenerlo primero
        now = datetime.now(timezone.utc)
        start = datetime.fromisoformat(active_entry["start_time"].replace("Z", "+00:00"))
        duration = int((now - start).total_seconds())
        
        await db.time_entries.update_one(
            {"id": active_entry["id"]},
            {"$set": {
                "end_time": now.isoformat(),
                "duration": duration
            }}
        )
    
    # Crear nuevo registro
    now = datetime.now(timezone.utc)
    entry_id = f"time_{uuid.uuid4().hex[:12]}"
    
    new_entry = {
        "id": entry_id,
        "user_id": current_user.get("id", username),
        "username": username,
        "task_id": request.task_id,
        "task_title": request.task_title,
        "board_id": request.board_id,
        "list_id": request.list_id,
        "start_time": now.isoformat(),
        "end_time": None,
        "duration": None,
        "date": now.strftime("%Y-%m-%d"),
        "created_at": now.isoformat()
    }
    
    await db.time_entries.insert_one(new_entry)
    new_entry.pop("_id", None)
    
    logger.info(f"⏱️ Tiempo iniciado: {username} en tarea {request.task_id}")
    return {"entry": new_entry, "message": "Registro de tiempo iniciado"}


@api_router.post("/time-tracking/stop")
async def stop_time_tracking(request: StopTimeTrackingRequest, current_user: dict = Depends(get_current_user)):
    """Detener registro de tiempo activo"""
    username = current_user["username"]
    
    # Buscar registro activo para esta tarea
    active_entry = await db.time_entries.find_one({
        "username": username,
        "task_id": request.task_id,
        "end_time": None
    })
    
    if not active_entry:
        raise HTTPException(status_code=404, detail="No hay registro activo para esta tarea")
    
    now = datetime.now(timezone.utc)
    start = datetime.fromisoformat(active_entry["start_time"].replace("Z", "+00:00"))
    duration = int((now - start).total_seconds())
    
    await db.time_entries.update_one(
        {"id": active_entry["id"]},
        {"$set": {
            "end_time": now.isoformat(),
            "duration": duration
        }}
    )
    
    logger.info(f"⏱️ Tiempo detenido: {username} en tarea {request.task_id} - {duration}s")
    
    return {
        "entry_id": active_entry["id"],
        "duration": duration,
        "message": "Registro de tiempo detenido"
    }


@api_router.get("/time-tracking/active")
async def get_active_time_entry(current_user: dict = Depends(get_current_user)):
    """Obtener registro de tiempo activo del usuario"""
    username = current_user["username"]
    
    active_entry = await db.time_entries.find_one(
        {"username": username, "end_time": None},
        {"_id": 0}
    )
    
    if active_entry:
        # Calcular tiempo transcurrido
        start = datetime.fromisoformat(active_entry["start_time"].replace("Z", "+00:00"))
        elapsed = int((datetime.now(timezone.utc) - start).total_seconds())
        active_entry["elapsed_seconds"] = elapsed
    
    return {"active_entry": active_entry}


@api_router.get("/time-tracking/task/{task_id}")
async def get_task_time_entries(task_id: str, current_user: dict = Depends(get_current_user)):
    """Obtener todos los registros de tiempo de una tarea"""
    
    # Obtener todas las entradas de esta tarea
    cursor = db.time_entries.find(
        {"task_id": task_id},
        {"_id": 0}
    ).sort("created_at", -1)
    
    entries = await cursor.to_list(100)
    
    # Calcular tiempo total
    total_seconds = sum(e.get("duration", 0) or 0 for e in entries if e.get("end_time"))
    
    # Verificar si hay entrada activa del usuario actual
    active_entry = None
    for entry in entries:
        if entry.get("username") == current_user["username"] and not entry.get("end_time"):
            start = datetime.fromisoformat(entry["start_time"].replace("Z", "+00:00"))
            elapsed = int((datetime.now(timezone.utc) - start).total_seconds())
            entry["elapsed_seconds"] = elapsed
            active_entry = entry
            break
    
    # Agrupar por usuario
    user_totals = {}
    for entry in entries:
        user = entry.get("username", "Desconocido")
        duration = entry.get("duration", 0) or 0
        if user not in user_totals:
            user_totals[user] = {"username": user, "total_seconds": 0, "entries_count": 0}
        user_totals[user]["total_seconds"] += duration
        user_totals[user]["entries_count"] += 1
    
    return {
        "entries": entries,
        "total_seconds": total_seconds,
        "active_entry": active_entry,
        "user_totals": list(user_totals.values())
    }


@api_router.get("/time-tracking/task/{task_id}/weekly")
async def get_task_weekly_stats(task_id: str, current_user: dict = Depends(get_current_user)):
    """Obtener estadísticas semanales de tiempo para una tarea"""
    
    # Calcular fechas de la semana actual (domingo a sábado)
    today = datetime.now(timezone.utc).date()
    start_of_week = today - timedelta(days=today.weekday() + 1)  # Domingo
    if start_of_week > today:
        start_of_week = start_of_week - timedelta(days=7)
    
    # Generar lista de días de la semana
    week_days = []
    for i in range(7):
        day = start_of_week + timedelta(days=i)
        week_days.append(day.strftime("%Y-%m-%d"))
    
    # Obtener entradas de esta semana
    cursor = db.time_entries.find({
        "task_id": task_id,
        "date": {"$gte": week_days[0], "$lte": week_days[6]},
        "duration": {"$ne": None}
    }, {"_id": 0})
    
    entries = await cursor.to_list(500)
    
    # Agrupar por día y usuario
    current_username = current_user["username"]
    daily_data = {day: {"my_time": 0, "others_time": 0} for day in week_days}
    
    for entry in entries:
        day = entry.get("date")
        duration = entry.get("duration", 0) or 0
        if day in daily_data:
            if entry.get("username") == current_username:
                daily_data[day]["my_time"] += duration
            else:
                daily_data[day]["others_time"] += duration
    
    # Formatear para gráfica
    chart_data = []
    day_labels = ["DO", "LU", "MA", "MI", "JU", "VI", "SA"]
    for i, day in enumerate(week_days):
        chart_data.append({
            "day": day_labels[i],
            "date": day,
            "my_time": daily_data[day]["my_time"],
            "others_time": daily_data[day]["others_time"]
        })
    
    return {
        "chart_data": chart_data,
        "week_start": week_days[0],
        "week_end": week_days[6]
    }


@api_router.delete("/time-tracking/{entry_id}")
async def delete_time_entry(entry_id: str, current_user: dict = Depends(get_current_user)):
    """Eliminar un registro de tiempo (solo el propietario)"""
    
    result = await db.time_entries.delete_one({
        "id": entry_id,
        "username": current_user["username"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Registro no encontrado o sin permisos")
    
    return {"message": "Registro eliminado"}


# ==========================================
# CONTACTS ENDPOINTS - CRM Básico
# ==========================================

@api_router.get("/contacts")
async def get_contacts(
    contact_type: Optional[str] = None, 
    workspace_id: Optional[str] = None,
    company_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtener contactos según el contexto:
    - Con company_id: Retorna contactos de esa empresa
    - Sin company_id + workspace_id: Retorna contactos del workspace
    - Sin company_id ni workspace_id: Retorna contactos personales
    """
    username = current_user["username"]
    
    if company_id:
        # Verificar acceso a la empresa
        company = await db.finanzas_companies.find_one({
            "id": company_id,
            "owner_username": username
        })
        if not company:
            raise HTTPException(status_code=403, detail="No tienes acceso a esta empresa")
        
        query = {"company_id": company_id}
    elif workspace_id:
        # Verificar que el usuario tiene acceso al workspace
        membership = await db.workspace_members.find_one({
            "workspace_id": workspace_id,
            "username": username
        })
        if not membership:
            raise HTTPException(status_code=403, detail="No tienes acceso a este workspace")
        
        # Obtener contactos del workspace
        query = {"workspace_id": workspace_id}
    else:
        # Obtener contactos personales (sin workspace_id ni company_id asignado)
        query = {
            "owner_username": username,
            "$or": [
                {"workspace_id": {"$exists": False}},
                {"workspace_id": None}
            ],
            "$and": [
                {"$or": [
                    {"company_id": {"$exists": False}},
                    {"company_id": None}
                ]}
            ]
        }
    
    if contact_type:
        query["contact_type"] = contact_type
    
    contacts = await db.contacts.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return {"contacts": contacts}


@api_router.get("/contacts/search")
async def search_contacts(
    q: str = "",
    limit: int = 10,
    workspace_id: Optional[str] = None,
    company_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Búsqueda de contactos para autocomplete.
    Busca por nombre, apellidos, email o teléfono.
    Si se especifica company_id, busca solo en esa empresa.
    """
    username = current_user["username"]
    
    # Construir query base según contexto
    if company_id:
        # Verificar acceso a empresa
        company = await db.finanzas_companies.find_one({
            "id": company_id,
            "owner_username": username
        })
        if not company:
            raise HTTPException(status_code=403, detail="No tienes acceso a esta empresa")
        base_query = {"company_id": company_id}
    elif workspace_id:
        membership = await db.workspace_members.find_one({
            "workspace_id": workspace_id,
            "username": username
        })
        if not membership:
            raise HTTPException(status_code=403, detail="No tienes acceso a este workspace")
        base_query = {"workspace_id": workspace_id}
    else:
        # Contactos personales del usuario (sin company_id ni workspace_id)
        base_query = {
            "owner_username": username,
            "$or": [
                {"workspace_id": {"$exists": False}},
                {"workspace_id": None}
            ]
        }
    
    # Si hay texto de búsqueda, agregar filtro
    if q and q.strip():
        search_regex = {"$regex": q.strip(), "$options": "i"}
        search_conditions = [
            {"nombre": search_regex},
            {"apellidos": search_regex},
            {"name": search_regex},  # Por compatibilidad
            {"email": search_regex},
            {"phone": search_regex},
            {"whatsapp": search_regex},
            {"company": search_regex}
        ]
        # Combinar con la query base
        final_query = {
            "$and": [
                base_query,
                {"$or": search_conditions}
            ]
        }
    else:
        final_query = base_query
    
    contacts_cursor = await db.contacts.find(
        final_query, 
        {"_id": 0}
    ).sort("nombre", 1).limit(limit).to_list(limit)
    
    # Formatear respuesta con nombre completo
    contacts = []
    for c in contacts_cursor:
        nombre = c.get("nombre", "") or c.get("name", "")
        apellidos = c.get("apellidos", "")
        full_name = f"{nombre} {apellidos}".strip() if apellidos else nombre
        
        contacts.append({
            "id": c.get("id"),
            "name": full_name,
            "email": c.get("email"),
            "phone": c.get("phone") or c.get("whatsapp"),
            "company": c.get("company"),
            "contact_type": c.get("contact_type")
        })
    
    return {"contacts": contacts}



@api_router.post("/contacts")
async def create_contact(request: CreateContactRequest, current_user: dict = Depends(get_current_user)):
    """
    Crear un nuevo contacto.
    - Si company_id está presente, el contacto pertenece a esa empresa
    - Si workspace_id está presente, el contacto pertenece al workspace (compartido)
    """
    username = current_user["username"]
    now = datetime.now(timezone.utc).isoformat()
    
    # Verificar acceso a empresa si se especifica
    if request.company_id:
        company = await db.finanzas_companies.find_one({
            "id": request.company_id,
            "owner_username": username
        })
        if not company:
            raise HTTPException(status_code=403, detail="No tienes acceso a esta empresa")
    
    # Si se especifica workspace_id, verificar acceso y permisos
    if request.workspace_id:
        membership = await db.workspace_members.find_one({
            "workspace_id": request.workspace_id,
            "username": username
        })
        if not membership:
            raise HTTPException(status_code=403, detail="No tienes acceso a este workspace")
        
        # Verificar que puede editar (owner, admin, member)
        if membership.get("role") == "viewer":
            raise HTTPException(status_code=403, detail="No tienes permisos para crear contactos en este workspace")
    
    contact = {
        "id": f"contact_{uuid.uuid4().hex[:12]}",
        "contact_type": request.contact_type,
        "nombre": request.nombre,
        "apellidos": request.apellidos,
        "whatsapp": request.whatsapp,
        "email": request.email or "",
        "custom_fields": request.custom_fields or {},
        "labels": request.labels or [],
        "owner_username": username,
        "workspace_id": request.workspace_id,  # None para contactos personales
        "company_id": request.company_id,  # ID de la empresa
        "created_at": now,
        "updated_at": now
    }
    
    await db.contacts.insert_one(contact)
    
    # Retornar sin _id
    if "_id" in contact:
        del contact["_id"]
    return {"contact": contact, "message": "Contacto creado"}


@api_router.get("/contacts/{contact_id}")
async def get_contact(contact_id: str, current_user: dict = Depends(get_current_user)):
    """Obtener un contacto específico (personal o de workspace con acceso)"""
    username = current_user["username"]
    
    # Buscar el contacto primero
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    
    if not contact:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
    
    # Verificar acceso
    has_access = False
    
    # Si es contacto personal del usuario
    if contact.get("owner_username") == username and not contact.get("workspace_id"):
        has_access = True
    
    # Si es contacto de workspace, verificar membresía
    if contact.get("workspace_id"):
        membership = await db.workspace_members.find_one({
            "workspace_id": contact["workspace_id"],
            "username": username
        })
        if membership:
            has_access = True
    
    if not has_access:
        raise HTTPException(status_code=403, detail="No tienes acceso a este contacto")
    
    return {"contact": contact}


@api_router.put("/contacts/{contact_id}")
async def update_contact(contact_id: str, request: UpdateContactRequest, current_user: dict = Depends(get_current_user)):
    """Actualizar un contacto (personal o de workspace con permisos de edición)"""
    username = current_user["username"]
    
    # Buscar el contacto
    contact = await db.contacts.find_one({"id": contact_id})
    
    if not contact:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
    
    # Verificar permisos de edición
    can_edit = False
    
    # Si es contacto personal del usuario
    if contact.get("owner_username") == username and not contact.get("workspace_id"):
        can_edit = True
    
    # Si es contacto de workspace, verificar rol
    if contact.get("workspace_id"):
        membership = await db.workspace_members.find_one({
            "workspace_id": contact["workspace_id"],
            "username": username
        })
        if membership and membership.get("role") in ["owner", "admin", "member"]:
            can_edit = True
    
    if not can_edit:
        raise HTTPException(status_code=403, detail="No tienes permisos para editar este contacto")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if request.nombre is not None:
        update_data["nombre"] = request.nombre
    if request.apellidos is not None:
        update_data["apellidos"] = request.apellidos
    if request.whatsapp is not None:
        update_data["whatsapp"] = request.whatsapp
    if request.email is not None:
        update_data["email"] = request.email
    if request.custom_fields is not None:
        update_data["custom_fields"] = request.custom_fields
    if request.labels is not None:
        update_data["labels"] = request.labels
    
    await db.contacts.update_one({"id": contact_id}, {"$set": update_data})
    
    updated_contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    return {"contact": updated_contact, "message": "Contacto actualizado"}


@api_router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str, current_user: dict = Depends(get_current_user)):
    """Eliminar un contacto (personal o de workspace con permisos)"""
    username = current_user["username"]
    
    # Buscar el contacto
    contact = await db.contacts.find_one({"id": contact_id})
    
    if not contact:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
    
    # Verificar permisos de eliminación
    can_delete = False
    
    # Si es contacto personal del usuario
    if contact.get("owner_username") == username and not contact.get("workspace_id"):
        can_delete = True
    
    # Si es contacto de workspace, verificar rol (solo owner y admin pueden eliminar)
    if contact.get("workspace_id"):
        membership = await db.workspace_members.find_one({
            "workspace_id": contact["workspace_id"],
            "username": username
        })
        if membership and membership.get("role") in ["owner", "admin"]:
            can_delete = True
    
    if not can_delete:
        raise HTTPException(status_code=403, detail="No tienes permisos para eliminar este contacto")
    
    await db.contacts.delete_one({"id": contact_id})
    return {"message": "Contacto eliminado"}


# ==========================================
# CUSTOM FIELDS ENDPOINTS
# ==========================================

@api_router.get("/contacts/config/fields/{contact_type}")
async def get_custom_fields(contact_type: str, current_user: dict = Depends(get_current_user)):
    """Obtener configuración de campos personalizados para un tipo de contacto"""
    config = await db.contact_field_configs.find_one(
        {"contact_type": contact_type, "owner_username": current_user["username"]},
        {"_id": 0}
    )
    
    if not config:
        # Retornar configuración vacía si no existe
        return {"config": {"contact_type": contact_type, "fields": []}}
    
    return {"config": config}


@api_router.post("/contacts/config/fields/{contact_type}")
async def create_custom_field(contact_type: str, request: CreateCustomFieldRequest, current_user: dict = Depends(get_current_user)):
    """Crear un nuevo campo personalizado"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Buscar configuración existente
    config = await db.contact_field_configs.find_one({
        "contact_type": contact_type,
        "owner_username": current_user["username"]
    })
    
    new_field = {
        "id": f"field_{uuid.uuid4().hex[:8]}",
        "name": request.name,
        "field_type": request.field_type,
        "is_required": request.is_required,
        "color": request.color,
        "options": request.options or []
    }
    
    if config:
        # Agregar campo a configuración existente
        await db.contact_field_configs.update_one(
            {"contact_type": contact_type, "owner_username": current_user["username"]},
            {
                "$push": {"fields": new_field},
                "$set": {"updated_at": now}
            }
        )
    else:
        # Crear nueva configuración
        config = {
            "contact_type": contact_type,
            "owner_username": current_user["username"],
            "fields": [new_field],
            "created_at": now,
            "updated_at": now
        }
        await db.contact_field_configs.insert_one(config)
    
    return {"field": new_field, "message": "Campo creado"}


@api_router.put("/contacts/config/fields/{contact_type}/{field_id}")
async def update_custom_field(contact_type: str, field_id: str, request: UpdateCustomFieldRequest, current_user: dict = Depends(get_current_user)):
    """Actualizar un campo personalizado"""
    config = await db.contact_field_configs.find_one({
        "contact_type": contact_type,
        "owner_username": current_user["username"]
    })
    
    if not config:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")
    
    # Buscar y actualizar el campo
    fields = config.get("fields", [])
    field_found = False
    
    for field in fields:
        if field["id"] == field_id:
            if request.name is not None:
                field["name"] = request.name
            if request.field_type is not None:
                field["field_type"] = request.field_type
            if request.is_required is not None:
                field["is_required"] = request.is_required
            if request.color is not None:
                field["color"] = request.color
            if request.options is not None:
                field["options"] = request.options
            field_found = True
            break
    
    if not field_found:
        raise HTTPException(status_code=404, detail="Campo no encontrado")
    
    await db.contact_field_configs.update_one(
        {"contact_type": contact_type, "owner_username": current_user["username"]},
        {"$set": {"fields": fields, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Campo actualizado"}


@api_router.delete("/contacts/config/fields/{contact_type}/{field_id}")
async def delete_custom_field(contact_type: str, field_id: str, current_user: dict = Depends(get_current_user)):
    """Eliminar un campo personalizado"""
    config = await db.contact_field_configs.find_one({
        "contact_type": contact_type,
        "owner_username": current_user["username"]
    })
    
    if not config:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")
    
    # Filtrar el campo a eliminar
    fields = [f for f in config.get("fields", []) if f["id"] != field_id]
    
    await db.contact_field_configs.update_one(
        {"contact_type": contact_type, "owner_username": current_user["username"]},
        {"$set": {"fields": fields, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Campo eliminado"}


# ==========================================
# CONTACT LABELS/TAGS ENDPOINTS
# ==========================================

@api_router.get("/contacts/labels/{contact_type}")
async def get_contact_labels(contact_type: str, current_user: dict = Depends(get_current_user)):
    """Obtener todas las etiquetas de un tipo de contacto"""
    config = await db.contact_label_configs.find_one({
        "contact_type": contact_type,
        "owner_username": current_user["username"]
    })
    
    if not config:
        return {"labels": []}
    
    return {"labels": config.get("labels", [])}


@api_router.post("/contacts/labels/{contact_type}")
async def create_contact_label(contact_type: str, label_data: dict, current_user: dict = Depends(get_current_user)):
    """Crear una nueva etiqueta"""
    from uuid import uuid4
    
    name = label_data.get("name", "").strip()
    color = label_data.get("color", "#3B82F6")
    
    if not name:
        raise HTTPException(status_code=400, detail="El nombre es obligatorio")
    
    # Buscar o crear configuración
    config = await db.contact_label_configs.find_one({
        "contact_type": contact_type,
        "owner_username": current_user["username"]
    })
    
    labels = config.get("labels", []) if config else []
    
    # Verificar duplicados
    if any(l["name"].lower() == name.lower() for l in labels):
        raise HTTPException(status_code=400, detail="Ya existe una etiqueta con ese nombre")
    
    new_label = {
        "id": f"label_{uuid4().hex[:8]}",
        "name": name,
        "color": color,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    labels.append(new_label)
    
    if config:
        await db.contact_label_configs.update_one(
            {"contact_type": contact_type, "owner_username": current_user["username"]},
            {"$set": {"labels": labels, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    else:
        await db.contact_label_configs.insert_one({
            "contact_type": contact_type,
            "owner_username": current_user["username"],
            "labels": labels,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {"label": new_label, "message": "Etiqueta creada"}


@api_router.put("/contacts/labels/{contact_type}/{label_id}")
async def update_contact_label(contact_type: str, label_id: str, label_data: dict, current_user: dict = Depends(get_current_user)):
    """Actualizar una etiqueta existente"""
    config = await db.contact_label_configs.find_one({
        "contact_type": contact_type,
        "owner_username": current_user["username"]
    })
    
    if not config:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")
    
    labels = config.get("labels", [])
    label_idx = next((i for i, l in enumerate(labels) if l["id"] == label_id), None)
    
    if label_idx is None:
        raise HTTPException(status_code=404, detail="Etiqueta no encontrada")
    
    name = label_data.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="El nombre es obligatorio")
    
    # Verificar duplicados (excepto la misma etiqueta)
    if any(l["name"].lower() == name.lower() and l["id"] != label_id for l in labels):
        raise HTTPException(status_code=400, detail="Ya existe una etiqueta con ese nombre")
    
    labels[label_idx]["name"] = name
    labels[label_idx]["color"] = label_data.get("color", labels[label_idx].get("color", "#3B82F6"))
    labels[label_idx]["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.contact_label_configs.update_one(
        {"contact_type": contact_type, "owner_username": current_user["username"]},
        {"$set": {"labels": labels, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"label": labels[label_idx], "message": "Etiqueta actualizada"}


@api_router.delete("/contacts/labels/{contact_type}/{label_id}")
async def delete_contact_label(contact_type: str, label_id: str, current_user: dict = Depends(get_current_user)):
    """Eliminar una etiqueta (no borra los contactos, solo quita la asociación)"""
    config = await db.contact_label_configs.find_one({
        "contact_type": contact_type,
        "owner_username": current_user["username"]
    })
    
    if not config:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")
    
    labels = [l for l in config.get("labels", []) if l["id"] != label_id]
    
    await db.contact_label_configs.update_one(
        {"contact_type": contact_type, "owner_username": current_user["username"]},
        {"$set": {"labels": labels, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Quitar la etiqueta de todos los contactos que la tengan
    await db.contacts.update_many(
        {
            "contact_type": contact_type,
            "owner_username": current_user["username"],
            "labels": label_id
        },
        {"$pull": {"labels": label_id}}
    )
    
    return {"message": "Etiqueta eliminada"}


# ==========================================
# SHARING & COLLABORATION ENDPOINTS
# ==========================================

# --- Pydantic Models for Sharing ---
class CreateInviteRequest(BaseModel):
    email: str
    resource_type: str  # 'mindmap', 'board', 'contacts', 'reminders'
    resource_id: str
    role: str = "viewer"  # 'viewer', 'commenter', 'editor', 'admin'

class UpdateCollaboratorRoleRequest(BaseModel):
    role: str

class CreateShareLinkRequest(BaseModel):
    resource_type: str
    resource_id: str
    role: str = "viewer"
    expires_in_days: Optional[int] = None

class ToggleShareLinkRequest(BaseModel):
    is_active: bool


# --- Workspace Endpoints ---

@api_router.get("/workspaces")
async def get_my_workspaces(current_user: dict = Depends(get_current_user)):
    """Obtener todos los workspaces del usuario"""
    workspaces = await get_user_workspaces(db, current_user["username"])
    return {"workspaces": workspaces}

@api_router.get("/workspaces/{workspace_id}")
async def get_workspace_by_id(workspace_id: str, current_user: dict = Depends(get_current_user)):
    """Obtener un workspace específico"""
    # Verificar que el usuario es miembro
    membership = await db.workspace_members.find_one({
        "workspace_id": workspace_id,
        "username": current_user["username"]
    }, {"_id": 0})
    
    if not membership:
        raise HTTPException(status_code=403, detail="No tienes acceso a este workspace")
    
    workspace = await db.workspaces.find_one({"id": workspace_id}, {"_id": 0})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace no encontrado")
    
    workspace["user_role"] = membership["role"]
    return workspace

@api_router.get("/workspaces/{workspace_id}/members")
async def get_workspace_members_endpoint(workspace_id: str, current_user: dict = Depends(get_current_user)):
    """Obtener miembros de un workspace"""
    # Verificar acceso
    membership = await db.workspace_members.find_one({
        "workspace_id": workspace_id,
        "username": current_user["username"]
    })
    
    if not membership:
        raise HTTPException(status_code=403, detail="No tienes acceso a este workspace")
    
    members = await get_workspace_members(db, workspace_id)
    
    # Enriquecer con datos de usuario
    enriched_members = []
    for member in members:
        user = await db.users.find_one(
            {"username": member["username"]},
            {"_id": 0, "username": 1, "email": 1, "full_name": 1, "picture": 1}
        )
        if user:
            enriched_members.append({
                **member,
                "full_name": user.get("full_name", member["username"]),
                "picture": user.get("picture"),
                "email": user.get("email")
            })
        else:
            enriched_members.append(member)
    
    return {"members": enriched_members}


# --- Pydantic Models for Team Workspaces ---
class CreateTeamWorkspaceRequest(BaseModel):
    name: str
    description: Optional[str] = ""

class InviteToWorkspaceRequest(BaseModel):
    email: str
    role: str = "member"  # owner, admin, member, viewer

class UpdateWorkspaceMemberRoleRequest(BaseModel):
    role: str

class MoveContactsToWorkspaceRequest(BaseModel):
    contact_ids: List[str]
    workspace_id: str


# --- Team Workspace Endpoints ---

@api_router.post("/workspaces/team")
async def create_team_workspace(
    request: CreateTeamWorkspaceRequest,
    current_user: dict = Depends(get_current_user)
):
    """Crear un nuevo Team Workspace"""
    username = current_user["username"]
    now = datetime.now(timezone.utc).isoformat()
    workspace_id = f"ws_{uuid.uuid4().hex[:12]}"
    
    workspace = {
        "id": workspace_id,
        "name": request.name,
        "description": request.description or f"Workspace de equipo: {request.name}",
        "type": "team",
        "owner_username": username,
        "created_at": now,
        "updated_at": now,
        "settings": {
            "default_sharing": "workspace",
            "allow_public_links": True
        }
    }
    
    await db.workspaces.insert_one(workspace)
    workspace.pop("_id", None)
    
    # Agregar al creador como owner
    member = {
        "id": f"wm_{uuid.uuid4().hex[:12]}",
        "workspace_id": workspace_id,
        "username": username,
        "email": current_user.get("email", ""),
        "role": "owner",
        "joined_at": now,
        "invited_by": None
    }
    await db.workspace_members.insert_one(member)
    
    workspace["user_role"] = "owner"
    return {"workspace": workspace, "message": "Workspace de equipo creado"}


@api_router.post("/workspaces/{workspace_id}/invite")
async def invite_to_workspace(
    workspace_id: str,
    request: InviteToWorkspaceRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Invitar a un usuario a un workspace"""
    username = current_user["username"]
    
    # Verificar que el usuario tiene permisos para invitar
    membership = await db.workspace_members.find_one({
        "workspace_id": workspace_id,
        "username": username
    })
    
    if not membership:
        raise HTTPException(status_code=403, detail="No tienes acceso a este workspace")
    
    if membership.get("role") not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Solo owners y admins pueden invitar miembros")
    
    # Verificar que no está ya invitado o es miembro
    existing_member = await db.workspace_members.find_one({
        "workspace_id": workspace_id,
        "email": request.email.lower().strip()
    })
    if existing_member:
        raise HTTPException(status_code=400, detail="Este usuario ya es miembro del workspace")
    
    # Crear invitación
    now = datetime.now(timezone.utc)
    invite_id = f"inv_{uuid.uuid4().hex[:12]}"
    token = secrets.token_urlsafe(32)
    
    invite = {
        "id": invite_id,
        "email": request.email.lower().strip(),
        "resource_type": "workspace",
        "resource_id": workspace_id,
        "workspace_id": workspace_id,
        "role": request.role,
        "token": token,
        "status": "pending",
        "invited_by": username,
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(days=7)).isoformat()
    }
    
    await db.invites.insert_one(invite)
    invite.pop("_id", None)
    
    # Obtener info del workspace para el email
    workspace = await db.workspaces.find_one({"id": workspace_id}, {"_id": 0, "name": 1})
    workspace_name = workspace.get("name", "Workspace") if workspace else "Workspace"
    
    # Enviar email de invitación
    background_tasks.add_task(
        send_collaboration_invite_email,
        recipient_email=request.email,
        inviter_name=current_user.get("full_name", username),
        resource_name=workspace_name,
        resource_type="workspace",
        role=request.role,
        invite_token=token
    )
    
    return {"invite": invite, "message": f"Invitación enviada a {request.email}"}


@api_router.put("/workspaces/{workspace_id}/members/{member_username}/role")
async def update_workspace_member_role(
    workspace_id: str,
    member_username: str,
    request: UpdateWorkspaceMemberRoleRequest,
    current_user: dict = Depends(get_current_user)
):
    """Actualizar el rol de un miembro del workspace"""
    username = current_user["username"]
    
    # Verificar permisos
    membership = await db.workspace_members.find_one({
        "workspace_id": workspace_id,
        "username": username
    })
    
    if not membership or membership.get("role") not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="No tienes permisos para cambiar roles")
    
    # No se puede cambiar el rol del owner
    target_member = await db.workspace_members.find_one({
        "workspace_id": workspace_id,
        "username": member_username
    })
    
    if not target_member:
        raise HTTPException(status_code=404, detail="Miembro no encontrado")
    
    if target_member.get("role") == "owner":
        raise HTTPException(status_code=400, detail="No se puede cambiar el rol del propietario")
    
    # Actualizar rol
    await db.workspace_members.update_one(
        {"workspace_id": workspace_id, "username": member_username},
        {"$set": {"role": request.role, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": f"Rol actualizado a {request.role}"}


@api_router.delete("/workspaces/{workspace_id}/members/{member_username}")
async def remove_workspace_member(
    workspace_id: str,
    member_username: str,
    current_user: dict = Depends(get_current_user)
):
    """Remover un miembro del workspace"""
    username = current_user["username"]
    
    # Verificar permisos
    membership = await db.workspace_members.find_one({
        "workspace_id": workspace_id,
        "username": username
    })
    
    if not membership or membership.get("role") not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="No tienes permisos para remover miembros")
    
    # No se puede remover al owner
    target_member = await db.workspace_members.find_one({
        "workspace_id": workspace_id,
        "username": member_username
    })
    
    if not target_member:
        raise HTTPException(status_code=404, detail="Miembro no encontrado")
    
    if target_member.get("role") == "owner":
        raise HTTPException(status_code=400, detail="No se puede remover al propietario del workspace")
    
    await db.workspace_members.delete_one({
        "workspace_id": workspace_id,
        "username": member_username
    })
    
    return {"message": "Miembro removido del workspace"}


@api_router.post("/contacts/move-to-workspace")
async def move_contacts_to_workspace(
    request: MoveContactsToWorkspaceRequest,
    current_user: dict = Depends(get_current_user)
):
    """Mover contactos personales a un workspace compartido"""
    username = current_user["username"]
    
    # Verificar acceso al workspace
    membership = await db.workspace_members.find_one({
        "workspace_id": request.workspace_id,
        "username": username
    })
    
    if not membership:
        raise HTTPException(status_code=403, detail="No tienes acceso a este workspace")
    
    if membership.get("role") not in ["owner", "admin", "member"]:
        raise HTTPException(status_code=403, detail="No tienes permisos para agregar contactos")
    
    # Mover solo los contactos que pertenecen al usuario
    result = await db.contacts.update_many(
        {
            "id": {"$in": request.contact_ids},
            "owner_username": username,
            "$or": [
                {"workspace_id": {"$exists": False}},
                {"workspace_id": None}
            ]
        },
        {
            "$set": {
                "workspace_id": request.workspace_id,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {
        "message": f"{result.modified_count} contactos movidos al workspace",
        "moved_count": result.modified_count
    }


# --- Invitation Endpoints ---

@api_router.post("/invites")
async def create_invitation(
    request: CreateInviteRequest, 
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Crear una invitación para compartir un recurso"""
    # Validar tipo de recurso
    if request.resource_type not in RESOURCE_TYPES:
        raise HTTPException(
            status_code=400, 
            detail=f"Tipo de recurso inválido. Debe ser uno de: {', '.join(RESOURCE_TYPES)}"
        )
    
    # Validar rol
    if request.role not in RESOURCE_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Rol inválido. Debe ser uno de: {', '.join(RESOURCE_ROLES.keys())}"
        )
    
    # Verificar que el usuario tiene permiso para compartir
    can_share = await check_resource_permission(
        db, current_user["username"], request.resource_type, request.resource_id, "share"
    )
    
    # Si no tiene permiso de "share", verificar si es el dueño
    if not can_share:
        is_owner = False
        if request.resource_type == "mindmap":
            resource = await db.projects.find_one({"id": request.resource_id}, {"_id": 0})
            if not resource:
                resource = await db.projects.find_one({"project_id": request.resource_id}, {"_id": 0})
            is_owner = resource and resource.get("username") == current_user["username"]
        elif request.resource_type == "board":
            resource = await db.boards.find_one({"id": request.resource_id}, {"_id": 0})
            is_owner = resource and resource.get("owner_username") == current_user["username"]
        
        if not is_owner:
            raise HTTPException(status_code=403, detail="No tienes permiso para compartir este recurso")
    
    # Verificar que no se esté invitando a sí mismo
    invitee_email = request.email.lower().strip()
    inviter = await db.users.find_one({"username": current_user["username"]}, {"_id": 0})
    if inviter and inviter.get("email", "").lower() == invitee_email:
        raise HTTPException(status_code=400, detail="No puedes invitarte a ti mismo")
    
    # Verificar si el usuario ya tiene acceso
    existing_user = await db.users.find_one({"email": invitee_email}, {"_id": 0})
    if existing_user:
        existing_permission = await db.resource_permissions.find_one({
            "resource_type": request.resource_type,
            "resource_id": request.resource_id,
            "principal_type": "user",
            "principal_id": existing_user["username"]
        })
        if existing_permission:
            raise HTTPException(status_code=400, detail="Este usuario ya tiene acceso al recurso")
    
    # Verificar si ya hay una invitación pendiente
    existing_invite = await db.invites.find_one({
        "email": invitee_email,
        "resource_type": request.resource_type,
        "resource_id": request.resource_id,
        "status": "pending"
    })
    if existing_invite:
        raise HTTPException(status_code=400, detail="Ya existe una invitación pendiente para este email")
    
    # Crear invitación
    invite = await create_invite(
        db,
        invitee_email,
        request.resource_type,
        request.resource_id,
        request.role,
        current_user["username"]
    )
    
    # Obtener nombre del recurso para el email
    resource_name = "Recurso"
    if request.resource_type == "mindmap":
        resource = await db.projects.find_one({"id": request.resource_id}, {"_id": 0})
        if not resource:
            resource = await db.projects.find_one({"project_id": request.resource_id}, {"_id": 0})
        resource_name = resource.get("name", "Mapa mental") if resource else "Mapa mental"
    elif request.resource_type == "board":
        resource = await db.boards.find_one({"id": request.resource_id}, {"_id": 0})
        resource_name = resource.get("title", "Tablero") if resource else "Tablero"
    
    # Enviar email de invitación en background
    inviter_name = inviter.get("full_name", current_user["username"]) if inviter else current_user["username"]
    background_tasks.add_task(
        send_collaboration_invite_email,
        invitee_email,
        inviter_name,
        resource_name,
        request.resource_type,
        request.role,
        invite["token"]
    )
    
    logger.info(f"📧 Invitación creada: {invitee_email} -> {request.resource_type}/{request.resource_id}")
    
    return {
        "success": True,
        "invite_id": invite["id"],
        "message": f"Invitación enviada a {invitee_email}"
    }

@api_router.get("/invites/accept/{token}")
async def accept_invitation_get(token: str, current_user: dict = Depends(get_current_user)):
    """Aceptar una invitación (GET para links desde email)"""
    result = await accept_invite(db, token, current_user["username"])
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    # Obtener nombre del recurso para el activity log
    resource_name = "Recurso"
    if result["resource_type"] == "mindmap":
        resource = await db.projects.find_one(
            {"$or": [{"id": result["resource_id"]}, {"project_id": result["resource_id"]}]},
            {"_id": 0}
        )
        resource_name = resource.get("name", "Mapa mental") if resource else "Mapa mental"
    elif result["resource_type"] == "board":
        resource = await db.boards.find_one({"id": result["resource_id"]}, {"_id": 0})
        resource_name = resource.get("title", "Tablero") if resource else "Tablero"
    
    # Registrar actividad
    activity = await log_activity(
        db,
        user_id=current_user["username"],
        action="invite_accepted",
        resource_type=result["resource_type"],
        resource_id=result["resource_id"],
        resource_name=resource_name,
        metadata={"role": result["role"], "invited_by": result.get("invited_by")}
    )
    
    # Procesar notificación al invitador
    await process_activity_notification(db, activity, send_activity_notification_email)
    
    return {
        "success": True,
        "resource_type": result["resource_type"],
        "resource_id": result["resource_id"],
        "role": result["role"],
        "message": "¡Invitación aceptada! Ahora tienes acceso al recurso."
    }

@api_router.post("/invites/accept/{token}")
async def accept_invitation_post(token: str, current_user: dict = Depends(get_current_user)):
    """Aceptar una invitación (POST)"""
    return await accept_invitation_get(token, current_user)

@api_router.get("/invites/pending")
async def get_my_pending_invites(current_user: dict = Depends(get_current_user)):
    """Obtener invitaciones pendientes para el usuario actual"""
    user = await db.users.find_one({"username": current_user["username"]}, {"_id": 0})
    if not user or not user.get("email"):
        return {"invites": []}
    
    invites = await get_pending_invites_for_email(db, user["email"])
    
    # Enriquecer con información del recurso
    enriched_invites = []
    for invite in invites:
        resource_name = "Recurso"
        if invite["resource_type"] == "mindmap":
            resource = await db.projects.find_one({"id": invite["resource_id"]}, {"_id": 0})
            if not resource:
                resource = await db.projects.find_one({"project_id": invite["resource_id"]}, {"_id": 0})
            resource_name = resource.get("name", "Mapa mental") if resource else "Mapa mental"
        elif invite["resource_type"] == "board":
            resource = await db.boards.find_one({"id": invite["resource_id"]}, {"_id": 0})
            resource_name = resource.get("title", "Tablero") if resource else "Tablero"
        
        # Obtener nombre del invitador
        inviter = await db.users.find_one({"username": invite["invited_by"]}, {"_id": 0})
        inviter_name = inviter.get("full_name", invite["invited_by"]) if inviter else invite["invited_by"]
        
        enriched_invites.append({
            **invite,
            "resource_name": resource_name,
            "inviter_name": inviter_name
        })
    
    return {"invites": enriched_invites}

@api_router.delete("/invites/{invite_id}")
async def cancel_invitation(invite_id: str, current_user: dict = Depends(get_current_user)):
    """Cancelar una invitación pendiente"""
    invite = await db.invites.find_one({"id": invite_id}, {"_id": 0})
    
    if not invite:
        raise HTTPException(status_code=404, detail="Invitación no encontrada")
    
    # Solo el que invitó puede cancelar
    if invite["invited_by"] != current_user["username"]:
        raise HTTPException(status_code=403, detail="No tienes permiso para cancelar esta invitación")
    
    await db.invites.update_one(
        {"id": invite_id},
        {"$set": {"status": "cancelled"}}
    )
    
    return {"success": True, "message": "Invitación cancelada"}


# --- Collaborators Endpoints ---

@api_router.get("/{resource_type}/{resource_id}/collaborators")
async def get_collaborators(
    resource_type: str, 
    resource_id: str, 
    current_user: dict = Depends(get_current_user)
):
    """Obtener colaboradores de un recurso"""
    if resource_type not in RESOURCE_TYPES:
        raise HTTPException(status_code=400, detail="Tipo de recurso inválido")
    
    # Verificar acceso al recurso
    has_access = await check_resource_permission(
        db, current_user["username"], resource_type, resource_id, "view"
    )
    
    # También verificar si es el dueño
    is_owner = False
    owner_info = None
    if resource_type == "mindmap":
        # Try both 'id' and 'project_id' for backwards compatibility
        resource = await db.projects.find_one({"id": resource_id}, {"_id": 0})
        if not resource:
            resource = await db.projects.find_one({"project_id": resource_id}, {"_id": 0})
        if resource:
            is_owner = resource.get("username") == current_user["username"]
            owner_username = resource.get("username")
    elif resource_type == "board":
        resource = await db.boards.find_one({"id": resource_id}, {"_id": 0})
        if resource:
            is_owner = resource.get("owner_username") == current_user["username"]
            owner_username = resource.get("owner_username")
    
    if not has_access and not is_owner:
        raise HTTPException(status_code=403, detail="No tienes acceso a este recurso")
    
    collaborators = await get_resource_collaborators(db, resource_type, resource_id)
    
    # Agregar información del owner
    if owner_username:
        owner = await db.users.find_one(
            {"username": owner_username},
            {"_id": 0, "username": 1, "email": 1, "full_name": 1, "picture": 1}
        )
        if owner:
            owner_info = {
                "username": owner.get("username"),
                "email": owner.get("email"),
                "full_name": owner.get("full_name", owner.get("username")),
                "picture": owner.get("picture"),
                "role": "owner",
                "is_owner": True
            }
    
    # Obtener link compartido si existe
    share_link = await get_resource_share_link(db, resource_type, resource_id)
    
    return {
        "owner": owner_info,
        "collaborators": collaborators,
        "share_link": share_link,
        "current_user_is_owner": is_owner
    }

@api_router.put("/{resource_type}/{resource_id}/collaborators/{username}")
async def update_collaborator(
    resource_type: str,
    resource_id: str,
    username: str,
    request: UpdateCollaboratorRoleRequest,
    current_user: dict = Depends(get_current_user)
):
    """Actualizar rol de un colaborador"""
    if resource_type not in RESOURCE_TYPES:
        raise HTTPException(status_code=400, detail="Tipo de recurso inválido")
    
    if request.role not in RESOURCE_ROLES:
        raise HTTPException(status_code=400, detail="Rol inválido")
    
    # Verificar que el usuario tiene permiso para gestionar colaboradores
    can_share = await check_resource_permission(
        db, current_user["username"], resource_type, resource_id, "share"
    )
    
    # También verificar si es el dueño
    is_owner = False
    if resource_type == "mindmap":
        resource = await db.projects.find_one({"id": resource_id}, {"_id": 0})
        if not resource:
            resource = await db.projects.find_one({"project_id": resource_id}, {"_id": 0})
        is_owner = resource and resource.get("username") == current_user["username"]
    elif resource_type == "board":
        resource = await db.boards.find_one({"id": resource_id}, {"_id": 0})
        is_owner = resource and resource.get("owner_username") == current_user["username"]
    
    if not can_share and not is_owner:
        raise HTTPException(status_code=403, detail="No tienes permiso para gestionar colaboradores")
    
    # No permitir cambiar el rol del dueño
    if resource_type == "mindmap":
        if resource and resource.get("username") == username:
            raise HTTPException(status_code=400, detail="No puedes cambiar el rol del propietario")
    elif resource_type == "board":
        if resource and resource.get("owner_username") == username:
            raise HTTPException(status_code=400, detail="No puedes cambiar el rol del propietario")
    
    success = await update_collaborator_role(
        db, resource_type, resource_id, username, request.role, current_user["username"]
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Colaborador no encontrado")
    
    return {"success": True, "message": "Rol actualizado"}

@api_router.delete("/{resource_type}/{resource_id}/collaborators/{username}")
async def remove_collaborator_endpoint(
    resource_type: str,
    resource_id: str,
    username: str,
    current_user: dict = Depends(get_current_user)
):
    """Remover un colaborador de un recurso"""
    if resource_type not in RESOURCE_TYPES:
        raise HTTPException(status_code=400, detail="Tipo de recurso inválido")
    
    # Verificar que el usuario tiene permiso para gestionar colaboradores
    can_share = await check_resource_permission(
        db, current_user["username"], resource_type, resource_id, "share"
    )
    
    # También verificar si es el dueño
    is_owner = False
    if resource_type == "mindmap":
        resource = await db.projects.find_one({"id": resource_id}, {"_id": 0})
        if not resource:
            resource = await db.projects.find_one({"project_id": resource_id}, {"_id": 0})
        is_owner = resource and resource.get("username") == current_user["username"]
    elif resource_type == "board":
        resource = await db.boards.find_one({"id": resource_id}, {"_id": 0})
        is_owner = resource and resource.get("owner_username") == current_user["username"]
    
    # Permitir que un usuario se remueva a sí mismo
    is_self = username == current_user["username"]
    
    if not can_share and not is_owner and not is_self:
        raise HTTPException(status_code=403, detail="No tienes permiso para remover colaboradores")
    
    # No permitir remover al dueño
    if resource_type == "mindmap":
        if resource and resource.get("username") == username:
            raise HTTPException(status_code=400, detail="No puedes remover al propietario")
    elif resource_type == "board":
        if resource and resource.get("owner_username") == username:
            raise HTTPException(status_code=400, detail="No puedes remover al propietario")
    
    success = await remove_collaborator(db, resource_type, resource_id, username)
    
    if not success:
        raise HTTPException(status_code=404, detail="Colaborador no encontrado")
    
    return {"success": True, "message": "Colaborador removido"}


# --- Share Link Endpoints ---

@api_router.post("/{resource_type}/{resource_id}/share-link")
async def create_or_get_share_link(
    resource_type: str,
    resource_id: str,
    request: CreateShareLinkRequest,
    current_user: dict = Depends(get_current_user)
):
    """Crear o obtener link de compartir"""
    if resource_type not in RESOURCE_TYPES:
        raise HTTPException(status_code=400, detail="Tipo de recurso inválido")
    
    # Verificar que es el dueño o tiene permiso de share
    can_share = await check_resource_permission(
        db, current_user["username"], resource_type, resource_id, "share"
    )
    
    is_owner = False
    if resource_type == "mindmap":
        resource = await db.projects.find_one({"id": resource_id}, {"_id": 0})
        if not resource:
            resource = await db.projects.find_one({"project_id": resource_id}, {"_id": 0})
        is_owner = resource and resource.get("username") == current_user["username"]
    elif resource_type == "board":
        resource = await db.boards.find_one({"id": resource_id}, {"_id": 0})
        is_owner = resource and resource.get("owner_username") == current_user["username"]
    
    if not can_share and not is_owner:
        raise HTTPException(status_code=403, detail="No tienes permiso para crear links de compartir")
    
    # Verificar si ya existe un link
    existing_link = await get_resource_share_link(db, resource_type, resource_id)
    
    if existing_link:
        # Actualizar el link existente
        await db.share_links.update_one(
            {"id": existing_link["id"]},
            {"$set": {"role": request.role, "is_active": True}}
        )
        existing_link["role"] = request.role
        existing_link["is_active"] = True
        return {"share_link": existing_link}
    
    # Crear nuevo link
    share_link = await create_share_link(
        db,
        resource_type,
        resource_id,
        request.role,
        current_user["username"],
        request.expires_in_days
    )
    
    return {"share_link": share_link}

@api_router.put("/{resource_type}/{resource_id}/share-link")
async def toggle_share_link_endpoint(
    resource_type: str,
    resource_id: str,
    request: ToggleShareLinkRequest,
    current_user: dict = Depends(get_current_user)
):
    """Activar/desactivar link de compartir"""
    if resource_type not in RESOURCE_TYPES:
        raise HTTPException(status_code=400, detail="Tipo de recurso inválido")
    
    # Verificar permisos
    is_owner = False
    if resource_type == "mindmap":
        resource = await db.projects.find_one({"id": resource_id}, {"_id": 0})
        if not resource:
            resource = await db.projects.find_one({"project_id": resource_id}, {"_id": 0})
        is_owner = resource and resource.get("username") == current_user["username"]
    elif resource_type == "board":
        resource = await db.boards.find_one({"id": resource_id}, {"_id": 0})
        is_owner = resource and resource.get("owner_username") == current_user["username"]
    
    if not is_owner:
        raise HTTPException(status_code=403, detail="Solo el propietario puede gestionar links de compartir")
    
    await toggle_share_link(db, resource_type, resource_id, request.is_active)
    
    return {"success": True, "is_active": request.is_active}

@api_router.get("/shared/{token}")
async def access_shared_resource(token: str):
    """Acceder a un recurso compartido via link (público, no requiere auth)"""
    share_link = await get_share_link(db, token)
    
    if not share_link:
        raise HTTPException(status_code=404, detail="Link no válido o expirado")
    
    # Obtener información del recurso
    resource_info = None
    if share_link["resource_type"] == "mindmap":
        resource = await db.projects.find_one(
            {"id": share_link["resource_id"]},
            {"_id": 0}
        )
        if not resource:
            resource = await db.projects.find_one(
                {"project_id": share_link["resource_id"]},
                {"_id": 0}
            )
        if resource:
            resource_info = {
                "id": resource.get("id") or resource.get("project_id"),
                "name": resource.get("name"),
                "type": "mindmap"
            }
    elif share_link["resource_type"] == "board":
        resource = await db.boards.find_one(
            {"id": share_link["resource_id"]},
            {"_id": 0}
        )
        if resource:
            resource_info = {
                "id": resource.get("id"),
                "name": resource.get("title"),
                "type": "board"
            }
    
    if not resource_info:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")
    
    return {
        "resource": resource_info,
        "role": share_link["role"],
        "access_type": "public_link"
    }


# --- Resources Shared With Me ---

@api_router.get("/shared-with-me")
async def get_shared_with_me(current_user: dict = Depends(get_current_user)):
    """Obtener todos los recursos compartidos con el usuario actual"""
    username = current_user["username"]
    
    # Buscar permisos directos
    permissions = await db.resource_permissions.find(
        {"principal_type": "user", "principal_id": username},
        {"_id": 0}
    ).to_list(100)
    
    shared_resources = {
        "mindmaps": [],
        "boards": [],
        "contacts": [],
        "reminders": []
    }
    
    for perm in permissions:
        resource_type = perm["resource_type"]
        resource_id = perm["resource_id"]
        
        if resource_type == "mindmap":
            resource = await db.projects.find_one(
                {"id": resource_id, "isDeleted": {"$ne": True}},
                {"_id": 0}
            )
            if not resource:
                resource = await db.projects.find_one(
                    {"project_id": resource_id, "isDeleted": {"$ne": True}},
                    {"_id": 0}
                )
            if resource:
                # Obtener info del owner
                owner = await db.users.find_one(
                    {"username": resource.get("username")},
                    {"_id": 0, "full_name": 1, "picture": 1}
                )
                shared_resources["mindmaps"].append({
                    "id": resource.get("id") or resource.get("project_id"),
                    "name": resource.get("name"),
                    "role": perm.get("role"),
                    "shared_at": perm.get("created_at"),
                    "owner": {
                        "username": resource.get("username"),
                        "full_name": owner.get("full_name") if owner else resource.get("username"),
                        "picture": owner.get("picture") if owner else None
                    }
                })
        
        elif resource_type == "board":
            resource = await db.boards.find_one(
                {"id": resource_id, "is_deleted": {"$ne": True}},
                {"_id": 0}
            )
            if resource:
                owner = await db.users.find_one(
                    {"username": resource.get("owner_username")},
                    {"_id": 0, "full_name": 1, "picture": 1}
                )
                shared_resources["boards"].append({
                    "id": resource.get("id"),
                    "name": resource.get("title"),
                    "role": perm.get("role"),
                    "shared_at": perm.get("created_at"),
                    "owner": {
                        "username": resource.get("owner_username"),
                        "full_name": owner.get("full_name") if owner else resource.get("owner_username"),
                        "picture": owner.get("picture") if owner else None
                    }
                })
    
    return shared_resources


# --- Email helper for invitations ---

async def send_collaboration_invite_email(
    recipient_email: str,
    inviter_name: str,
    resource_name: str,
    resource_type: str,
    role: str,
    invite_token: str
):
    """Enviar email de invitación a colaborar"""
    import resend
    
    app_url = email_service.get_app_url()
    invite_link = f"{app_url}/invite?token={invite_token}"
    
    resource_type_names = {
        "mindmap": "mapa mental",
        "board": "tablero",
        "contacts": "contactos",
        "reminders": "recordatorios"
    }
    
    role_names = {
        "viewer": "Visualizador",
        "commenter": "Comentador", 
        "editor": "Editor",
        "admin": "Administrador"
    }
    
    resource_type_display = resource_type_names.get(resource_type, resource_type)
    role_display = role_names.get(role, role)
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%); padding: 40px 40px 30px; text-align: center;">
                                <img src="{email_service.LOGO_URL}" alt="Mindora" style="height: 50px; width: auto;" />
                            </td>
                        </tr>
                        
                        <!-- Body -->
                        <tr>
                            <td style="padding: 40px;">
                                <h1 style="color: #1f2937; font-size: 24px; margin: 0 0 20px; text-align: center;">
                                    ¡Te han invitado a colaborar!
                                </h1>
                                
                                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                    <strong>{inviter_name}</strong> te ha invitado a colaborar en el {resource_type_display}:
                                </p>
                                
                                <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
                                    <p style="color: #0369a1; font-size: 20px; font-weight: 600; margin: 0;">
                                        📋 {resource_name}
                                    </p>
                                    <p style="color: #0284c7; font-size: 14px; margin: 10px 0 0;">
                                        Rol asignado: <strong>{role_display}</strong>
                                    </p>
                                </div>
                                
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="{invite_link}" style="display: inline-block; background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                                        Aceptar invitación
                                    </a>
                                </div>
                                
                                <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 20px 0 0;">
                                    Esta invitación expira en 7 días.
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                                    © 2025 Mindora. Todos los derechos reservados.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    try:
        params = {
            "from": email_service.get_sender(),
            "to": [recipient_email],
            "subject": f"📋 {inviter_name} te invita a colaborar en Mindora",
            "html": html_content
        }
        
        response = resend.Emails.send(params)
        logger.info(f"✅ Email de invitación enviado a {recipient_email}")
        return {"success": True, "response": response}
    except Exception as e:
        logger.error(f"❌ Error enviando email de invitación: {e}")
        return {"success": False, "error": str(e)}


# ==========================================
# ACTIVITY FEED & NOTIFICATIONS ENDPOINTS
# ==========================================

# --- Pydantic Models for Activity ---
class UpdateNotificationPrefsRequest(BaseModel):
    email_enabled: Optional[bool] = None
    email_digest: Optional[str] = None  # instant, daily, weekly, none
    notify_on: Optional[dict] = None
    quiet_hours: Optional[dict] = None

class MarkActivitiesReadRequest(BaseModel):
    activity_ids: Optional[List[str]] = None


# --- Activity Feed Endpoints ---

@api_router.get("/activity/feed")
async def get_my_activity_feed(
    workspace_id: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    include_own: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtener feed de actividad del usuario.
    Muestra actividad de sus workspaces y recursos compartidos.
    """
    activities = await get_activity_feed(
        db,
        username=current_user["username"],
        workspace_id=workspace_id,
        resource_type=resource_type,
        resource_id=resource_id,
        limit=limit,
        offset=offset,
        include_own_actions=include_own
    )
    
    # Generar mensajes legibles
    for activity in activities:
        activity["message"] = generate_activity_message(activity)
    
    return {
        "activities": activities,
        "total": len(activities),
        "has_more": len(activities) == limit
    }

@api_router.get("/activity/resource/{resource_type}/{resource_id}")
async def get_activity_for_resource(
    resource_type: str,
    resource_id: str,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtener historial de actividad de un recurso específico.
    """
    # Verificar acceso al recurso
    has_access = await check_resource_permission(
        db, current_user["username"], resource_type, resource_id, "view"
    )
    
    # También verificar si es owner
    is_owner = False
    if resource_type == "mindmap":
        resource = await db.projects.find_one(
            {"$or": [{"id": resource_id}, {"project_id": resource_id}]},
            {"_id": 0}
        )
        is_owner = resource and resource.get("username") == current_user["username"]
    elif resource_type == "board":
        resource = await db.boards.find_one({"id": resource_id}, {"_id": 0})
        is_owner = resource and resource.get("owner_username") == current_user["username"]
    
    if not has_access and not is_owner:
        raise HTTPException(status_code=403, detail="No tienes acceso a este recurso")
    
    activities = await get_resource_activity(db, resource_type, resource_id, limit)
    
    for activity in activities:
        activity["message"] = generate_activity_message(activity)
    
    return {"activities": activities}

@api_router.get("/activity/unread-count")
async def get_my_unread_count(current_user: dict = Depends(get_current_user)):
    """
    Obtener cantidad de actividades no leídas.
    """
    count = await get_unread_count(db, current_user["username"])
    return {"unread_count": count}

@api_router.post("/activity/mark-read")
async def mark_my_activities_as_read(
    request: MarkActivitiesReadRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Marcar actividades como leídas.
    """
    count = await mark_activities_as_read(
        db,
        current_user["username"],
        request.activity_ids
    )
    return {"marked_count": count}


# --- Notification Preferences Endpoints ---

@api_router.get("/user/notification-preferences")
async def get_my_notification_preferences(current_user: dict = Depends(get_current_user)):
    """
    Obtener preferencias de notificación del usuario.
    """
    prefs = await get_notification_preferences(db, current_user["username"])
    return prefs

@api_router.put("/user/notification-preferences")
async def update_my_notification_preferences(
    request: UpdateNotificationPrefsRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Actualizar preferencias de notificación.
    """
    prefs_dict = {}
    
    if request.email_enabled is not None:
        prefs_dict["email_enabled"] = request.email_enabled
    if request.email_digest is not None:
        prefs_dict["email_digest"] = request.email_digest
    if request.notify_on is not None:
        prefs_dict["notify_on"] = request.notify_on
    if request.quiet_hours is not None:
        prefs_dict["quiet_hours"] = request.quiet_hours
    
    updated = await update_notification_preferences(
        db,
        current_user["username"],
        prefs_dict
    )
    
    return {"success": True, "preferences": updated}


# --- Activity Email Notification Helper ---

async def send_activity_notification_email(
    recipient_email: str,
    subject: str,
    template: str,
    context: dict
):
    """
    Enviar email de notificación de actividad.
    """
    import resend
    
    app_url = email_service.get_app_url()
    
    # Templates de email
    templates = {
        "invite_accepted": f"""
            <p><strong>{context.get('actor_name')}</strong> aceptó tu invitación para colaborar en el {context.get('resource_type')} <strong>{context.get('resource_name')}</strong>.</p>
            <p>Ahora pueden trabajar juntos en este recurso.</p>
        """,
        "new_comment": f"""
            <p><strong>{context.get('actor_name')}</strong> dejó un comentario en el {context.get('resource_type')} <strong>{context.get('resource_name')}</strong>:</p>
            <div style="background: #f4f4f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 0; color: #374151;">{context.get('metadata', {}).get('comment_preview', 'Ver comentario...')}</p>
            </div>
        """,
        "mention": f"""
            <p><strong>{context.get('actor_name')}</strong> te mencionó en el {context.get('resource_type')} <strong>{context.get('resource_name')}</strong>.</p>
        """,
        "collaborator_added": f"""
            <p><strong>{context.get('actor_name')}</strong> te agregó como colaborador en el {context.get('resource_type')} <strong>{context.get('resource_name')}</strong>.</p>
            <p>Rol asignado: <strong>{context.get('metadata', {}).get('role', 'Visualizador')}</strong></p>
        """,
        "role_changed": f"""
            <p>Tu rol en el {context.get('resource_type')} <strong>{context.get('resource_name')}</strong> ha cambiado.</p>
            <p>Nuevo rol: <strong>{context.get('metadata', {}).get('new_role', '')}</strong></p>
        """,
        "task_completed": f"""
            <p><strong>{context.get('actor_name')}</strong> completó una tarea en el tablero <strong>{context.get('resource_name')}</strong>:</p>
            <p style="color: #16a34a;">✅ {context.get('metadata', {}).get('task_title', 'Tarea completada')}</p>
        """,
        "resource_deleted": f"""
            <p><strong>{context.get('actor_name')}</strong> eliminó el {context.get('resource_type')} <strong>{context.get('resource_name')}</strong>.</p>
        """
    }
    
    body_content = templates.get(template, f"<p>Nueva actividad en {context.get('resource_name')}</p>")
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%); padding: 30px 40px; text-align: center;">
                                <img src="{email_service.LOGO_URL}" alt="Mindora" style="height: 40px; width: auto;" />
                            </td>
                        </tr>
                        
                        <!-- Body -->
                        <tr>
                            <td style="padding: 40px;">
                                <div style="color: #374151; font-size: 16px; line-height: 1.6;">
                                    {body_content}
                                </div>
                                
                                <div style="text-align: center; margin-top: 30px;">
                                    <a href="{app_url}" style="display: inline-block; background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">
                                        Ver en Mindora
                                    </a>
                                </div>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9fafb; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                                <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px;">
                                    Puedes <a href="{app_url}/settings/notifications" style="color: #3B82F6;">ajustar tus preferencias de notificación</a>.
                                </p>
                                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                                    © 2025 Mindora. Todos los derechos reservados.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    try:
        params = {
            "from": email_service.get_sender(),
            "to": [recipient_email],
            "subject": subject,
            "html": html_content
        }
        
        response = resend.Emails.send(params)
        logger.info(f"✅ Email de notificación enviado a {recipient_email}: {template}")
        return {"success": True}
    except Exception as e:
        logger.error(f"❌ Error enviando email de notificación: {e}")
        return {"success": False, "error": str(e)}


# --- WhatsApp Bridge API ---
# These endpoints proxy requests to the WhatsApp Bridge service

WHATSAPP_BRIDGE_URL = os.environ.get('WHATSAPP_BRIDGE_URL', 'http://localhost:3001')


class SendWhatsAppMessageRequest(BaseModel):
    phone: str
    text: str


async def get_or_create_workspace(username: str, user_full_name: str = None) -> str:
    """Get user's workspace or create one if it doesn't exist"""
    workspace = await db.workspaces.find_one({"owner_username": username})
    
    if workspace:
        return workspace.get("id")
    
    # Create a new personal workspace for the user
    now = datetime.now(timezone.utc).isoformat()
    workspace_id = f"ws_{uuid.uuid4().hex[:12]}"
    
    new_workspace = {
        "id": workspace_id,
        "name": f"Espacio de {user_full_name or username}",
        "description": "Workspace personal",
        "type": "personal",
        "owner_username": username,
        "created_at": now,
        "updated_at": now,
        "settings": {
            "default_sharing": "private",
            "allow_public_links": True
        }
    }
    
    await db.workspaces.insert_one(new_workspace)
    
    # Add owner as member
    member = {
        "id": f"wm_{uuid.uuid4().hex[:12]}",
        "workspace_id": workspace_id,
        "username": username,
        "role": "owner",
        "joined_at": now
    }
    await db.workspace_members.insert_one(member)
    
    return workspace_id


@api_router.post("/whatsapp/connect")
async def whatsapp_connect(current_user: dict = Depends(get_current_user)):
    """Start WhatsApp connection for user's workspace"""
    username = current_user["username"]
    full_name = current_user.get("full_name", current_user.get("nombre", username))
    
    # Get or create workspace
    workspace_id = await get_or_create_workspace(username, full_name)
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{WHATSAPP_BRIDGE_URL}/bridge/instances/{workspace_id}/start")
            return response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"WhatsApp Bridge unavailable: {str(e)}")


@api_router.get("/whatsapp/qr")
async def whatsapp_get_qr(current_user: dict = Depends(get_current_user)):
    """Get QR code for WhatsApp connection"""
    username = current_user["username"]
    full_name = current_user.get("full_name", current_user.get("nombre", username))
    
    # Get or create workspace
    workspace_id = await get_or_create_workspace(username, full_name)
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{WHATSAPP_BRIDGE_URL}/bridge/instances/{workspace_id}/qr")
            return response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"WhatsApp Bridge unavailable: {str(e)}")


@api_router.get("/whatsapp/status")
async def whatsapp_get_status(current_user: dict = Depends(get_current_user)):
    """Get WhatsApp connection status"""
    username = current_user["username"]
    full_name = current_user.get("full_name", current_user.get("nombre", username))
    
    # Get or create workspace
    workspace_id = await get_or_create_workspace(username, full_name)
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{WHATSAPP_BRIDGE_URL}/bridge/instances/{workspace_id}/status")
            return response.json()
    except httpx.RequestError as e:
        # Return disconnected status if bridge is unavailable
        return {"status": "disconnected", "phone": None, "lastSeen": None}


@api_router.post("/whatsapp/disconnect")
async def whatsapp_disconnect(current_user: dict = Depends(get_current_user)):
    """Disconnect WhatsApp"""
    username = current_user["username"]
    full_name = current_user.get("full_name", current_user.get("nombre", username))
    
    # Get or create workspace
    workspace_id = await get_or_create_workspace(username, full_name)
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{WHATSAPP_BRIDGE_URL}/bridge/instances/{workspace_id}/disconnect")
            return response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"WhatsApp Bridge unavailable: {str(e)}")


@api_router.post("/whatsapp/send")
async def whatsapp_send_message(
    request: SendWhatsAppMessageRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send a WhatsApp message"""
    username = current_user["username"]
    full_name = current_user.get("full_name", current_user.get("nombre", username))
    
    # Get or create workspace
    workspace_id = await get_or_create_workspace(username, full_name)
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{WHATSAPP_BRIDGE_URL}/bridge/instances/{workspace_id}/send",
                json={"phone": request.phone, "text": request.text}
            )
            return response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"WhatsApp Bridge unavailable: {str(e)}")


@api_router.get("/whatsapp/messages")
async def whatsapp_get_messages(
    contact_phone: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get WhatsApp messages"""
    username = current_user["username"]
    full_name = current_user.get("full_name", current_user.get("nombre", username))
    
    # Get or create workspace
    workspace_id = await get_or_create_workspace(username, full_name)
    
    query = {"workspace_id": workspace_id, "channel": "whatsapp"}
    if contact_phone:
        query["contact_phone"] = contact_phone.replace("+", "").replace(" ", "")
    
    messages = await db.whatsapp_messages.find(
        query,
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    return {"messages": messages}


@api_router.get("/whatsapp/conversations")
async def whatsapp_get_conversations(current_user: dict = Depends(get_current_user)):
    """Get list of WhatsApp conversations with last message"""
    username = current_user["username"]
    full_name = current_user.get("full_name", current_user.get("nombre", username))
    
    # Get or create workspace
    workspace_id = await get_or_create_workspace(username, full_name)
    
    # Aggregate to get unique contacts with their last message
    pipeline = [
        {"$match": {"workspace_id": workspace_id, "channel": "whatsapp"}},
        {"$sort": {"timestamp": -1}},
        {"$group": {
            "_id": "$contact_phone",
            "last_message": {"$first": "$content.text"},
            "last_timestamp": {"$first": "$timestamp"},
            "direction": {"$first": "$direction"},
            "unread_count": {
                "$sum": {
                    "$cond": [
                        {"$and": [
                            {"$eq": ["$direction", "inbound"]},
                            {"$ne": ["$status", "read"]}
                        ]},
                        1, 0
                    ]
                }
            },
            "push_name": {"$first": "$meta.push_name"}
        }},
        {"$sort": {"last_timestamp": -1}},
        {"$project": {
            "_id": 0,
            "phone": "$_id",
            "name": {"$ifNull": ["$push_name", "$_id"]},
            "last_message": 1,
            "last_timestamp": 1,
            "unread_count": 1
        }}
    ]
    
    conversations = await db.whatsapp_messages.aggregate(pipeline).to_list(100)
    
    return {"conversations": conversations}


# ==========================================
# MÓDULO FINANZAS - APIs
# ==========================================

# Helper para obtener o crear workspace del usuario
async def get_user_workspace_id(username: str) -> str:
    """Obtiene el workspace_id del usuario, creándolo si no existe"""
    workspace = await db.workspaces.find_one({"owner_username": username}, {"_id": 0})
    if workspace:
        return workspace.get("id")
    
    # Crear workspace personal si no existe
    workspace_id = str(uuid.uuid4())
    new_workspace = {
        "id": workspace_id,
        "name": f"Empresa de {username}",
        "owner_username": username,
        "created_at": get_current_timestamp(),
        "type": "personal"
    }
    await db.workspaces.insert_one(new_workspace)
    return workspace_id

# ==========================================
# EMPRESAS (Companies)
# ==========================================

@api_router.get("/finanzas/companies")
async def get_companies(current_user: dict = Depends(get_current_user)):
    """Obtener lista de empresas del usuario (propias + donde es colaborador)"""
    username = current_user["username"]
    user = await db.users.find_one({"username": username})
    user_email = user.get("email", "").lower() if user else None
    
    # Usar la función helper que incluye empresas propias y colaboraciones
    companies = await get_companies_for_user(username, user_email)
    
    return companies

@api_router.post("/finanzas/companies", response_model=CompanyResponse)
async def create_company(
    company_data: CompanyCreate,
    current_user: dict = Depends(get_current_user)
):
    """Crear una nueva empresa"""
    username = current_user["username"]
    now = get_current_timestamp()
    
    company = {
        "id": generate_id(),
        "owner_username": username,
        **company_data.model_dump(),
        "created_at": now,
        "updated_at": now
    }
    
    await db.finanzas_companies.insert_one(company)
    company.pop("_id", None)
    return company

@api_router.get("/finanzas/companies/{company_id}", response_model=CompanyResponse)
async def get_company(
    company_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener una empresa específica"""
    username = current_user["username"]
    company = await db.finanzas_companies.find_one(
        {"id": company_id, "owner_username": username},
        {"_id": 0}
    )
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    return company

@api_router.put("/finanzas/companies/{company_id}", response_model=CompanyResponse)
async def update_company(
    company_id: str,
    company_data: CompanyUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Actualizar una empresa"""
    username = current_user["username"]
    company = await db.finanzas_companies.find_one(
        {"id": company_id, "owner_username": username}
    )
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    update_data = {k: v for k, v in company_data.model_dump().items() if v is not None}
    update_data["updated_at"] = get_current_timestamp()
    
    await db.finanzas_companies.update_one(
        {"id": company_id},
        {"$set": update_data}
    )
    
    updated = await db.finanzas_companies.find_one({"id": company_id}, {"_id": 0})
    return updated

@api_router.delete("/finanzas/companies/{company_id}")
async def delete_company(
    company_id: str,
    confirmation: str = "",  # Debe ser el nombre de la empresa o "ELIMINAR"
    current_user: dict = Depends(get_current_user)
):
    """
    Eliminar una empresa y TODOS sus datos operativos asociados.
    
    Esta acción es IRREVERSIBLE y eliminará:
    - Todos los datos financieros (ingresos, gastos, inversiones)
    - Todos los contactos de la empresa
    - Todos los tableros de la empresa
    - Todos los recordatorios operativos de la empresa
    
    Requiere confirmación: escribir el nombre exacto de la empresa o "ELIMINAR"
    """
    username = current_user["username"]
    
    # Verificar que la empresa existe y el usuario es propietario
    company = await db.finanzas_companies.find_one(
        {"id": company_id, "owner_username": username}
    )
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada o no tienes permisos para eliminarla")
    
    # Verificar confirmación
    company_name = company.get("name", "")
    if confirmation != company_name and confirmation != "ELIMINAR":
        raise HTTPException(
            status_code=400, 
            detail=f"Confirmación incorrecta. Debes escribir el nombre exacto de la empresa ('{company_name}') o 'ELIMINAR'"
        )
    
    # Contar datos que serán eliminados (para el resumen)
    stats = {
        "incomes": await db.finanzas_incomes.count_documents({"company_id": company_id}),
        "expenses": await db.finanzas_expenses.count_documents({"company_id": company_id}),
        "investments": await db.finanzas_investments.count_documents({"company_id": company_id}),
        "contacts": await db.contacts.count_documents({"company_id": company_id}),
        "boards": await db.boards.count_documents({"company_id": company_id}),
        "reminders": await db.reminders.count_documents({"company_id": company_id}) if await db.list_collection_names() else 0
    }
    
    # Eliminar TODOS los datos operativos de la empresa
    # 1. Finanzas
    await db.finanzas_incomes.delete_many({"company_id": company_id})
    await db.finanzas_expenses.delete_many({"company_id": company_id})
    await db.finanzas_investments.delete_many({"company_id": company_id})
    
    # 2. Contactos
    await db.contacts.delete_many({"company_id": company_id})
    
    # 3. Tableros (y sus tarjetas están dentro del documento)
    await db.boards.delete_many({"company_id": company_id})
    
    # 4. Recordatorios operativos (solo los que tienen company_id)
    await db.reminders.delete_many({"company_id": company_id})
    
    # 5. Finalmente, eliminar la empresa
    await db.finanzas_companies.delete_one({"id": company_id})
    
    return {
        "message": f"Empresa '{company_name}' eliminada permanentemente",
        "deleted_data": stats
    }

# Helper para verificar acceso a empresa
async def verify_company_access(company_id: str, username: str) -> dict:
    """Verifica que el usuario tenga acceso a la empresa (como propietario o colaborador)"""
    # Primero buscar como propietario
    company = await db.finanzas_companies.find_one(
        {"id": company_id},
        {"_id": 0}
    )
    
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    # Verificar si es propietario
    if company.get("owner_username") == username:
        company["user_role"] = "owner"
        return company
    
    # Verificar si es colaborador
    collaborator = await db.company_collaborators.find_one({
        "company_id": company_id,
        "username": username
    })
    
    if collaborator:
        company["user_role"] = collaborator.get("role", "collaborator")
        return company
    
    raise HTTPException(status_code=403, detail="No tienes acceso a esta empresa")

# ==========================================
# INGRESOS (Incomes)
# ==========================================

@api_router.get("/finanzas/incomes", response_model=List[IncomeResponse])
async def get_incomes(
    company_id: str,
    status: Optional[str] = None,
    project_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Obtener lista de ingresos con filtros opcionales"""
    username = current_user["username"]
    await verify_company_access(company_id, username)
    workspace_id = await get_user_workspace_id(username)
    
    query = {"company_id": company_id, "workspace_id": workspace_id}
    
    if status:
        query["status"] = status
    if project_id:
        query["project_id"] = project_id
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    
    incomes = await db.finanzas_incomes.find(query, {"_id": 0}).sort("date", -1).to_list(500)
    return incomes

@api_router.post("/finanzas/incomes", response_model=IncomeResponse)
async def create_income(
    income_data: IncomeCreate,
    current_user: dict = Depends(get_current_user)
):
    """Crear un nuevo ingreso con soporte para pagos parciales"""
    username = current_user["username"]
    await verify_company_access(income_data.company_id, username)
    workspace_id = await get_user_workspace_id(username)
    now = get_current_timestamp()
    
    # Calcular paid_amount y pending_balance
    amount = income_data.amount
    paid_amount = income_data.paid_amount or 0
    
    # Si el estado es "collected", el pago es completo
    if income_data.status == IncomeStatus.COLLECTED:
        paid_amount = amount
    
    # Calcular saldo pendiente
    pending_balance = max(0, amount - paid_amount)
    
    # Si el saldo es 0 y hay monto, marcar como cobrado
    final_status = income_data.status
    if pending_balance == 0 and amount > 0 and income_data.status == IncomeStatus.PENDING:
        final_status = IncomeStatus.COLLECTED
    
    income = {
        "id": generate_id(),
        "workspace_id": workspace_id,
        "username": username,
        **income_data.model_dump(),
        "paid_amount": paid_amount,
        "pending_balance": pending_balance,
        "status": final_status,
        "created_at": now,
        "updated_at": now
    }
    
    await db.finanzas_incomes.insert_one(income)
    income.pop("_id", None)
    
    # Registrar actividad
    await log_company_activity(
        company_id=income_data.company_id,
        activity_type="income_created",
        actor_username=username,
        target_name=income_data.source or "Ingreso",
        target_id=income["id"],
        amount=income_data.amount
    )
    
    return income

@api_router.get("/finanzas/incomes/{income_id}", response_model=IncomeResponse)
async def get_income(
    income_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener un ingreso específico"""
    workspace_id = await get_user_workspace_id(current_user["username"])
    
    income = await db.finanzas_incomes.find_one(
        {"id": income_id, "workspace_id": workspace_id},
        {"_id": 0}
    )
    
    if not income:
        raise HTTPException(status_code=404, detail="Ingreso no encontrado")
    
    return income

@api_router.put("/finanzas/incomes/{income_id}", response_model=IncomeResponse)
async def update_income(
    income_id: str,
    income_data: IncomeUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Actualizar un ingreso"""
    workspace_id = await get_user_workspace_id(current_user["username"])
    
    update_dict = {k: v for k, v in income_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = get_current_timestamp()
    
    result = await db.finanzas_incomes.find_one_and_update(
        {"id": income_id, "workspace_id": workspace_id},
        {"$set": update_dict},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Ingreso no encontrado")
    
    result.pop("_id", None)
    return result

@api_router.delete("/finanzas/incomes/{income_id}")
async def delete_income(
    income_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Eliminar un ingreso"""
    workspace_id = await get_user_workspace_id(current_user["username"])
    
    result = await db.finanzas_incomes.delete_one(
        {"id": income_id, "workspace_id": workspace_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ingreso no encontrado")
    
    return {"message": "Ingreso eliminado correctamente"}

# ==========================================
# GASTOS (Expenses)
# ==========================================

@api_router.get("/finanzas/expenses", response_model=List[ExpenseResponse])
async def get_expenses(
    company_id: str,
    status: Optional[str] = None,
    category: Optional[str] = None,
    project_id: Optional[str] = None,
    priority: Optional[str] = None,
    is_recurring: Optional[bool] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Obtener lista de gastos con filtros opcionales"""
    username = current_user["username"]
    await verify_company_access(company_id, username)
    workspace_id = await get_user_workspace_id(username)
    
    query = {"company_id": company_id, "workspace_id": workspace_id}
    
    if status:
        query["status"] = status
    if category:
        query["category"] = category
    if project_id:
        query["project_id"] = project_id
    if priority:
        query["priority"] = priority
    if is_recurring is not None:
        query["is_recurring"] = is_recurring
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    
    expenses = await db.finanzas_expenses.find(query, {"_id": 0}).sort("date", -1).to_list(500)
    return expenses

@api_router.post("/finanzas/expenses", response_model=ExpenseResponse)
async def create_expense(
    expense_data: ExpenseCreate,
    current_user: dict = Depends(get_current_user)
):
    """Crear un nuevo gasto"""
    username = current_user["username"]
    await verify_company_access(expense_data.company_id, username)
    workspace_id = await get_user_workspace_id(username)
    now = get_current_timestamp()
    
    # Calcular IGV si el gasto lo incluye
    # El monto ingresado es el total (con IGV incluido)
    IGV_RATE = 0.18
    includes_igv = expense_data.includes_igv
    amount = expense_data.amount
    
    if includes_igv:
        # El monto incluye IGV, calcular base e IGV
        base_imponible = amount / (1 + IGV_RATE)
        igv_gasto = amount - base_imponible
    else:
        # El gasto no tiene IGV (ej: compras informales, servicios exentos)
        base_imponible = amount
        igv_gasto = 0.0
    
    expense = {
        "id": generate_id(),
        "workspace_id": workspace_id,
        "username": username,
        **expense_data.model_dump(),
        "base_imponible": round(base_imponible, 2),
        "igv_gasto": round(igv_gasto, 2),
        "created_at": now,
        "updated_at": now
    }
    
    await db.finanzas_expenses.insert_one(expense)
    expense.pop("_id", None)
    
    # Registrar actividad
    await log_company_activity(
        company_id=expense_data.company_id,
        activity_type="expense_created",
        actor_username=username,
        target_name=expense_data.description or "Gasto",
        target_id=expense["id"],
        amount=expense_data.amount
    )
    
    return expense

@api_router.get("/finanzas/expenses/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    expense_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener un gasto específico"""
    workspace_id = await get_user_workspace_id(current_user["username"])
    
    expense = await db.finanzas_expenses.find_one(
        {"id": expense_id, "workspace_id": workspace_id},
        {"_id": 0}
    )
    
    if not expense:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    
    return expense

@api_router.put("/finanzas/expenses/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: str,
    expense_data: ExpenseUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Actualizar un gasto"""
    workspace_id = await get_user_workspace_id(current_user["username"])
    
    update_dict = {k: v for k, v in expense_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = get_current_timestamp()
    
    result = await db.finanzas_expenses.find_one_and_update(
        {"id": expense_id, "workspace_id": workspace_id},
        {"$set": update_dict},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    
    result.pop("_id", None)
    return result

@api_router.delete("/finanzas/expenses/{expense_id}")
async def delete_expense(
    expense_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Eliminar un gasto"""
    workspace_id = await get_user_workspace_id(current_user["username"])
    
    result = await db.finanzas_expenses.delete_one(
        {"id": expense_id, "workspace_id": workspace_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    
    return {"message": "Gasto eliminado correctamente"}

@api_router.post("/finanzas/expenses/{expense_id}/duplicate", response_model=ExpenseResponse)
async def duplicate_expense(
    expense_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Duplicar un gasto (útil para gastos recurrentes)"""
    workspace_id = await get_user_workspace_id(current_user["username"])
    
    original = await db.finanzas_expenses.find_one(
        {"id": expense_id, "workspace_id": workspace_id},
        {"_id": 0}
    )
    
    if not original:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    
    now = get_current_timestamp()
    new_expense = {
        **original,
        "id": generate_id(),
        "date": now[:10],  # Fecha de hoy
        "status": "pending",  # Reset a pendiente
        "created_at": now,
        "updated_at": now
    }
    
    await db.finanzas_expenses.insert_one(new_expense)
    new_expense.pop("_id", None)
    return new_expense

# ==========================================
# INVERSIONES (Investments)
# ==========================================

@api_router.get("/finanzas/investments", response_model=List[InvestmentResponse])
async def get_investments(
    company_id: str,
    status: Optional[str] = None,
    project_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Obtener lista de inversiones con filtros opcionales"""
    username = current_user["username"]
    await verify_company_access(company_id, username)
    workspace_id = await get_user_workspace_id(username)
    
    query = {"company_id": company_id, "workspace_id": workspace_id}
    
    if status:
        query["status"] = status
    if project_id:
        query["project_id"] = project_id
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    
    investments = await db.finanzas_investments.find(query, {"_id": 0}).sort("date", -1).to_list(500)
    return investments

@api_router.post("/finanzas/investments", response_model=InvestmentResponse)
async def create_investment(
    investment_data: InvestmentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Crear una nueva inversión"""
    username = current_user["username"]
    await verify_company_access(investment_data.company_id, username)
    workspace_id = await get_user_workspace_id(username)
    now = get_current_timestamp()
    
    investment = {
        "id": generate_id(),
        "workspace_id": workspace_id,
        "username": username,
        **investment_data.model_dump(),
        "created_at": now,
        "updated_at": now
    }
    
    await db.finanzas_investments.insert_one(investment)
    investment.pop("_id", None)
    return investment

@api_router.get("/finanzas/investments/{investment_id}", response_model=InvestmentResponse)
async def get_investment(
    investment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener una inversión específica"""
    workspace_id = await get_user_workspace_id(current_user["username"])
    
    investment = await db.finanzas_investments.find_one(
        {"id": investment_id, "workspace_id": workspace_id},
        {"_id": 0}
    )
    
    if not investment:
        raise HTTPException(status_code=404, detail="Inversión no encontrada")
    
    return investment

@api_router.put("/finanzas/investments/{investment_id}", response_model=InvestmentResponse)
async def update_investment(
    investment_id: str,
    investment_data: InvestmentUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Actualizar una inversión"""
    workspace_id = await get_user_workspace_id(current_user["username"])
    
    update_dict = {k: v for k, v in investment_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = get_current_timestamp()
    
    result = await db.finanzas_investments.find_one_and_update(
        {"id": investment_id, "workspace_id": workspace_id},
        {"$set": update_dict},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Inversión no encontrada")
    
    result.pop("_id", None)
    return result

@api_router.delete("/finanzas/investments/{investment_id}")
async def delete_investment(
    investment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Eliminar una inversión"""
    workspace_id = await get_user_workspace_id(current_user["username"])
    
    result = await db.finanzas_investments.delete_one(
        {"id": investment_id, "workspace_id": workspace_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Inversión no encontrada")
    
    return {"message": "Inversión eliminada correctamente"}

# ==========================================
# CATEGORÍAS
# ==========================================

@api_router.get("/finanzas/categories")
async def get_expense_categories(
    current_user: dict = Depends(get_current_user)
):
    """Obtener categorías de gastos (predefinidas + personalizadas)"""
    workspace_id = await get_user_workspace_id(current_user["username"])
    
    # Buscar categorías personalizadas del usuario
    custom_categories = await db.finanzas_categories.find(
        {"workspace_id": workspace_id, "type": "expense"},
        {"_id": 0}
    ).to_list(100)
    
    # Combinar con categorías predefinidas
    default_cats = [
        {**cat, "is_default": True, "type": "expense"} 
        for cat in DEFAULT_EXPENSE_CATEGORIES
    ]
    custom_cats = [
        {**cat, "is_default": False} 
        for cat in custom_categories
    ]
    
    return {"categories": default_cats + custom_cats}

@api_router.post("/finanzas/categories")
async def create_category(
    category_data: CategoryCreate,
    current_user: dict = Depends(get_current_user)
):
    """Crear una categoría personalizada"""
    workspace_id = await get_user_workspace_id(current_user["username"])
    
    category = {
        "id": generate_id(),
        "workspace_id": workspace_id,
        "type": "expense",
        **category_data.model_dump(),
        "is_default": False,
        "created_at": get_current_timestamp()
    }
    
    await db.finanzas_categories.insert_one(category)
    category.pop("_id", None)
    return category

@api_router.get("/finanzas/income-sources")
async def get_income_sources(
    current_user: dict = Depends(get_current_user)
):
    """Obtener fuentes de ingreso"""
    workspace_id = await get_user_workspace_id(current_user["username"])
    
    # Buscar fuentes personalizadas
    custom_sources = await db.finanzas_categories.find(
        {"workspace_id": workspace_id, "type": "income"},
        {"_id": 0}
    ).to_list(100)
    
    default_sources = [
        {**src, "is_default": True, "type": "income"} 
        for src in DEFAULT_INCOME_SOURCES
    ]
    custom_src = [
        {**src, "is_default": False} 
        for src in custom_sources
    ]
    
    return {"sources": default_sources + custom_src}

# ==========================================
# RESUMEN FINANCIERO
# ==========================================

@api_router.get("/finanzas/summary")
async def get_financial_summary(
    company_id: str,
    period: Optional[str] = None,  # "2026-01" formato año-mes
    current_user: dict = Depends(get_current_user)
):
    """
    Obtener resumen financiero del mes para una empresa.
    Si no se especifica periodo, usa el mes actual.
    """
    username = current_user["username"]
    await verify_company_access(company_id, username)
    workspace_id = await get_user_workspace_id(username)
    
    # Determinar periodo
    if not period:
        now = datetime.now(timezone.utc)
        period = now.strftime("%Y-%m")
    
    # Construir rango de fechas
    start_date = f"{period}-01"
    year, month = int(period[:4]), int(period[5:])
    if month == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{month + 1:02d}-01"
    
    date_filter = {"$gte": start_date, "$lt": end_date}
    
    # Obtener ingresos del periodo
    incomes = await db.finanzas_incomes.find(
        {"company_id": company_id, "workspace_id": workspace_id, "date": date_filter},
        {"_id": 0}
    ).to_list(1000)
    
    total_income = sum(i["amount"] for i in incomes)
    income_collected = sum(i["amount"] for i in incomes if i.get("status") == "collected")
    income_pending = sum(i["amount"] for i in incomes if i.get("status") == "pending")
    
    # Obtener gastos del periodo
    expenses = await db.finanzas_expenses.find(
        {"company_id": company_id, "workspace_id": workspace_id, "date": date_filter},
        {"_id": 0}
    ).to_list(1000)
    
    total_expenses = sum(e["amount"] for e in expenses)
    expenses_paid = sum(e["amount"] for e in expenses if e.get("status") == "paid")
    expenses_pending = sum(e["amount"] for e in expenses if e.get("status") == "pending")
    
    # Obtener inversiones del periodo
    investments = await db.finanzas_investments.find(
        {"company_id": company_id, "workspace_id": workspace_id, "date": date_filter},
        {"_id": 0}
    ).to_list(1000)
    
    total_investments = sum(inv["amount"] for inv in investments)
    
    # Calcular resultado neto y caja estimada
    net_result = income_collected - expenses_paid
    estimated_cash = income_collected - expenses_paid - total_investments
    
    # Determinar estado de salud financiera
    health_status = calculate_health_status(income_collected, expenses_paid, expenses_pending)
    
    return {
        "period": period,
        "company_id": company_id,
        "total_income": total_income,
        "total_income_collected": income_collected,
        "total_income_pending": income_pending,
        "total_expenses": total_expenses,
        "total_expenses_paid": expenses_paid,
        "total_expenses_pending": expenses_pending,
        "total_investments": total_investments,
        "net_result": net_result,
        "estimated_cash": estimated_cash,
        "health_status": health_status,
        "income_count": len(incomes),
        "expense_count": len(expenses),
        "investment_count": len(investments)
    }

@api_router.get("/finanzas/summary/by-project")
async def get_project_financial_summaries(
    current_user: dict = Depends(get_current_user)
):
    """Obtener resumen financiero agrupado por proyecto"""
    workspace_id = await get_user_workspace_id(current_user["username"])
    
    # Agregación de ingresos por proyecto
    income_pipeline = [
        {"$match": {"workspace_id": workspace_id, "project_id": {"$ne": None}}},
        {"$group": {
            "_id": "$project_id",
            "project_name": {"$first": "$project_name"},
            "total_income": {"$sum": "$amount"}
        }}
    ]
    income_by_project = {
        doc["_id"]: {"project_name": doc["project_name"], "total_income": doc["total_income"]}
        for doc in await db.finanzas_incomes.aggregate(income_pipeline).to_list(100)
    }
    
    # Agregación de gastos por proyecto
    expense_pipeline = [
        {"$match": {"workspace_id": workspace_id, "project_id": {"$ne": None}}},
        {"$group": {
            "_id": "$project_id",
            "project_name": {"$first": "$project_name"},
            "total_expenses": {"$sum": "$amount"}
        }}
    ]
    expense_by_project = {
        doc["_id"]: {"project_name": doc["project_name"], "total_expenses": doc["total_expenses"]}
        for doc in await db.finanzas_expenses.aggregate(expense_pipeline).to_list(100)
    }
    
    # Agregación de inversiones por proyecto
    investment_pipeline = [
        {"$match": {"workspace_id": workspace_id, "project_id": {"$ne": None}}},
        {"$group": {
            "_id": "$project_id",
            "project_name": {"$first": "$project_name"},
            "total_investments": {"$sum": "$amount"}
        }}
    ]
    investment_by_project = {
        doc["_id"]: {"project_name": doc["project_name"], "total_investments": doc["total_investments"]}
        for doc in await db.finanzas_investments.aggregate(investment_pipeline).to_list(100)
    }
    
    # Combinar resultados
    all_project_ids = set(income_by_project.keys()) | set(expense_by_project.keys()) | set(investment_by_project.keys())
    
    summaries = []
    for project_id in all_project_ids:
        income_data = income_by_project.get(project_id, {"project_name": "Desconocido", "total_income": 0})
        expense_data = expense_by_project.get(project_id, {"total_expenses": 0})
        investment_data = investment_by_project.get(project_id, {"total_investments": 0})
        
        total_income = income_data["total_income"]
        total_expenses = expense_data["total_expenses"]
        total_investments = investment_data["total_investments"]
        net_result = total_income - total_expenses
        
        # Calcular ROI si hay inversión
        roi = None
        if total_investments > 0:
            roi = ((net_result) / total_investments) * 100
        
        summaries.append({
            "project_id": project_id,
            "project_name": income_data["project_name"],
            "total_income": total_income,
            "total_expenses": total_expenses,
            "total_investments": total_investments,
            "net_result": net_result,
            "roi": round(roi, 2) if roi is not None else None
        })
    
    # Ordenar por resultado neto descendente
    summaries.sort(key=lambda x: x["net_result"], reverse=True)
    
    return {"projects": summaries}

@api_router.get("/finanzas/receivables")
async def get_receivables(
    company_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener ingresos por cobrar ordenados por fecha de vencimiento"""
    username = current_user["username"]
    await verify_company_access(company_id, username)
    workspace_id = await get_user_workspace_id(username)
    
    # Obtener ingresos con estado pending o partial
    receivables = await db.finanzas_incomes.find(
        {
            "company_id": company_id, 
            "workspace_id": workspace_id, 
            "status": {"$in": ["pending", "partial"]}
        },
        {"_id": 0}
    ).sort("due_date", 1).to_list(500)
    
    # Calcular totales correctamente basado en saldo pendiente
    total_facturado = sum(r.get("amount", 0) for r in receivables)
    total_abonado = sum(r.get("paid_amount", 0) for r in receivables)
    total_pendiente = sum(r.get("amount", 0) - r.get("paid_amount", 0) for r in receivables)
    
    return {
        "receivables": receivables,
        "total": total_pendiente,  # Solo saldo pendiente
        "total_facturado": total_facturado,
        "total_abonado": total_abonado,
        "count": len(receivables)
    }

# ==========================================
# PAGOS PARCIALES - CUENTAS POR COBRAR
# ==========================================

@api_router.post("/finanzas/partial-payments")
async def create_partial_payment(
    payment: PartialPaymentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Registrar un pago parcial para un ingreso pendiente"""
    username = current_user["username"]
    workspace_id = await get_user_workspace_id(username)
    
    # Obtener el ingreso
    income = await db.finanzas_incomes.find_one(
        {"id": payment.income_id, "workspace_id": workspace_id}
    )
    
    if not income:
        raise HTTPException(status_code=404, detail="Ingreso no encontrado")
    
    # Verificar acceso a la empresa
    await verify_company_access(income["company_id"], username)
    
    # Verificar que el ingreso no está completamente cobrado
    if income.get("status") == "collected":
        raise HTTPException(status_code=400, detail="Este ingreso ya está completamente cobrado")
    
    # Calcular saldo pendiente actual
    current_paid = income.get("paid_amount", 0) or 0
    total_amount = income.get("amount", 0)
    current_pending = total_amount - current_paid
    
    # Verificar que el pago no exceda el saldo pendiente
    if payment.amount > current_pending:
        raise HTTPException(
            status_code=400, 
            detail=f"El monto del pago (S/ {payment.amount:.2f}) excede el saldo pendiente (S/ {current_pending:.2f})"
        )
    
    # Crear el registro del pago parcial
    payment_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    payment_record = {
        "id": payment_id,
        "income_id": payment.income_id,
        "company_id": income["company_id"],
        "workspace_id": workspace_id,
        "username": username,
        "amount": payment.amount,
        "date": payment.date,
        "payment_method": payment.payment_method,
        "note": payment.note,
        "created_at": now
    }
    
    await db.finanzas_partial_payments.insert_one(payment_record)
    
    # Actualizar el ingreso
    new_paid_amount = current_paid + payment.amount
    new_pending_balance = total_amount - new_paid_amount
    
    # Determinar nuevo estado
    if new_pending_balance <= 0:
        new_status = "collected"
    elif new_paid_amount > 0:
        new_status = "partial"
    else:
        new_status = "pending"
    
    await db.finanzas_incomes.update_one(
        {"id": payment.income_id},
        {
            "$set": {
                "paid_amount": new_paid_amount,
                "pending_balance": new_pending_balance,
                "status": new_status,
                "updated_at": now
            }
        }
    )
    
    # Devolver el pago creado junto con el estado actualizado del ingreso
    return {
        "payment": {**payment_record, "_id": None},
        "income_updated": {
            "id": payment.income_id,
            "paid_amount": new_paid_amount,
            "pending_balance": new_pending_balance,
            "status": new_status
        }
    }

@api_router.get("/finanzas/partial-payments/{income_id}")
async def get_partial_payments(
    income_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener historial de pagos parciales de un ingreso"""
    username = current_user["username"]
    workspace_id = await get_user_workspace_id(username)
    
    # Verificar que el ingreso existe y pertenece al usuario
    income = await db.finanzas_incomes.find_one(
        {"id": income_id, "workspace_id": workspace_id}
    )
    
    if not income:
        raise HTTPException(status_code=404, detail="Ingreso no encontrado")
    
    # Obtener pagos parciales ordenados por fecha
    payments = await db.finanzas_partial_payments.find(
        {"income_id": income_id, "workspace_id": workspace_id},
        {"_id": 0}
    ).sort("date", -1).to_list(100)
    
    return {
        "payments": payments,
        "total_paid": sum(p.get("amount", 0) for p in payments),
        "count": len(payments)
    }

@api_router.delete("/finanzas/partial-payments/{payment_id}")
async def delete_partial_payment(
    payment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Eliminar un pago parcial (requiere confirmación del frontend)"""
    username = current_user["username"]
    workspace_id = await get_user_workspace_id(username)
    
    # Obtener el pago
    payment = await db.finanzas_partial_payments.find_one(
        {"id": payment_id, "workspace_id": workspace_id}
    )
    
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    
    # Obtener el ingreso asociado
    income = await db.finanzas_incomes.find_one({"id": payment["income_id"]})
    
    if not income:
        raise HTTPException(status_code=404, detail="Ingreso asociado no encontrado")
    
    # Eliminar el pago
    await db.finanzas_partial_payments.delete_one({"id": payment_id})
    
    # Recalcular el monto pagado del ingreso
    remaining_payments = await db.finanzas_partial_payments.find(
        {"income_id": payment["income_id"]}
    ).to_list(100)
    
    new_paid_amount = sum(p.get("amount", 0) for p in remaining_payments)
    new_pending_balance = income.get("amount", 0) - new_paid_amount
    
    # Determinar nuevo estado
    if new_pending_balance <= 0:
        new_status = "collected"
    elif new_paid_amount > 0:
        new_status = "partial"
    else:
        new_status = "pending"
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.finanzas_incomes.update_one(
        {"id": payment["income_id"]},
        {
            "$set": {
                "paid_amount": new_paid_amount,
                "pending_balance": new_pending_balance,
                "status": new_status,
                "updated_at": now
            }
        }
    )
    
    return {
        "message": "Pago eliminado correctamente",
        "income_updated": {
            "id": payment["income_id"],
            "paid_amount": new_paid_amount,
            "pending_balance": new_pending_balance,
            "status": new_status
        }
    }

# ==========================================
# PRODUCTOS / SERVICIOS - CRUD
# ==========================================

@api_router.get("/finanzas/products")
async def get_products(
    company_id: str,
    status: Optional[str] = None,
    type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Obtener lista de productos/servicios de una empresa"""
    username = current_user["username"]
    await verify_company_access(company_id, username)
    workspace_id = await get_user_workspace_id(username)
    
    # Construir filtro
    filter_query = {"company_id": company_id, "workspace_id": workspace_id}
    if status:
        filter_query["status"] = status
    if type:
        filter_query["type"] = type
    
    products = await db.finanzas_products.find(
        filter_query,
        {"_id": 0}
    ).sort("name", 1).to_list(500)
    
    return products

@api_router.post("/finanzas/products")
async def create_product(
    product: ProductCreate,
    company_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Crear un nuevo producto/servicio"""
    username = current_user["username"]
    await verify_company_access(company_id, username)
    workspace_id = await get_user_workspace_id(username)
    
    now = datetime.now(timezone.utc).isoformat()
    product_id = str(uuid.uuid4())
    
    product_doc = {
        "id": product_id,
        "company_id": company_id,
        "workspace_id": workspace_id,
        "username": username,
        "name": product.name,
        "type": product.type.value,
        "base_price": product.base_price,
        "includes_igv": product.includes_igv,
        "description": product.description,
        "category": product.category,
        "status": product.status.value,
        "created_at": now,
        "updated_at": now
    }
    
    await db.finanzas_products.insert_one(product_doc)
    
    return {**product_doc, "_id": None}

@api_router.get("/finanzas/products/{product_id}")
async def get_product(
    product_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener un producto/servicio por ID"""
    username = current_user["username"]
    workspace_id = await get_user_workspace_id(username)
    
    product = await db.finanzas_products.find_one(
        {"id": product_id, "workspace_id": workspace_id},
        {"_id": 0}
    )
    
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    return product

@api_router.put("/finanzas/products/{product_id}")
async def update_product(
    product_id: str,
    product: ProductUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Actualizar un producto/servicio"""
    username = current_user["username"]
    workspace_id = await get_user_workspace_id(username)
    
    existing = await db.finanzas_products.find_one(
        {"id": product_id, "workspace_id": workspace_id}
    )
    
    if not existing:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    # Verificar acceso a la empresa
    await verify_company_access(existing["company_id"], username)
    
    # Construir actualización
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if product.name is not None:
        update_data["name"] = product.name
    if product.type is not None:
        update_data["type"] = product.type.value
    if product.base_price is not None:
        update_data["base_price"] = product.base_price
    if product.includes_igv is not None:
        update_data["includes_igv"] = product.includes_igv
    if product.description is not None:
        update_data["description"] = product.description
    if product.category is not None:
        update_data["category"] = product.category
    if product.status is not None:
        update_data["status"] = product.status.value
    
    await db.finanzas_products.update_one(
        {"id": product_id},
        {"$set": update_data}
    )
    
    updated = await db.finanzas_products.find_one(
        {"id": product_id},
        {"_id": 0}
    )
    
    return updated

@api_router.delete("/finanzas/products/{product_id}")
async def delete_product(
    product_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Eliminar un producto/servicio"""
    username = current_user["username"]
    workspace_id = await get_user_workspace_id(username)
    
    existing = await db.finanzas_products.find_one(
        {"id": product_id, "workspace_id": workspace_id}
    )
    
    if not existing:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    await verify_company_access(existing["company_id"], username)
    
    await db.finanzas_products.delete_one({"id": product_id})
    
    return {"message": "Producto eliminado correctamente"}

@api_router.get("/finanzas/payables")
async def get_payables(
    company_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener gastos por pagar ordenados por prioridad y fecha"""
    username = current_user["username"]
    await verify_company_access(company_id, username)
    workspace_id = await get_user_workspace_id(username)
    
    # Ordenar por prioridad (high > medium > low) y luego por fecha
    payables = await db.finanzas_expenses.find(
        {"company_id": company_id, "workspace_id": workspace_id, "status": "pending"},
        {"_id": 0}
    ).to_list(500)
    
    # Ordenar: prioridad alta primero, luego por fecha de vencimiento
    priority_order = {"high": 0, "medium": 1, "low": 2}
    payables.sort(key=lambda x: (priority_order.get(x.get("priority", "medium"), 1), x.get("due_date", "9999")))
    
    total = sum(p["amount"] for p in payables)
    
    return {
        "payables": payables,
        "total": total,
        "count": len(payables)
    }


# ==========================================
# MIGRACIÓN DE DATOS A EMPRESA
# ==========================================

@api_router.post("/migration/create-default-company")
async def create_default_company_and_migrate(
    current_user: dict = Depends(get_current_user)
):
    """
    Crear empresa por defecto y migrar contactos/tableros existentes.
    Solo se ejecuta si el usuario no tiene empresas.
    """
    username = current_user["username"]
    now = get_current_timestamp()
    
    # Verificar si ya tiene empresas
    existing_companies = await db.finanzas_companies.find(
        {"owner_username": username}
    ).to_list(1)
    
    if existing_companies:
        return {
            "migrated": False,
            "message": "Ya tienes empresas creadas",
            "company_id": existing_companies[0]["id"]
        }
    
    # Crear empresa por defecto
    default_company = {
        "id": generate_id(),
        "name": "Mi empresa – migración inicial",
        "ruc": None,
        "address": None,
        "phone": None,
        "email": None,
        "currency": "PEN",
        "logo_url": None,
        "owner_username": username,
        "created_at": now,
        "updated_at": now
    }
    
    await db.finanzas_companies.insert_one(default_company)
    company_id = default_company["id"]
    
    # Migrar contactos sin company_id
    contacts_result = await db.contacts.update_many(
        {
            "owner_username": username,
            "$or": [
                {"company_id": {"$exists": False}},
                {"company_id": None}
            ]
        },
        {"$set": {"company_id": company_id}}
    )
    
    # Migrar tableros sin company_id
    boards_result = await db.boards.update_many(
        {
            "owner_username": username,
            "$or": [
                {"company_id": {"$exists": False}},
                {"company_id": None}
            ]
        },
        {"$set": {"company_id": company_id}}
    )
    
    # Migrar ingresos/gastos/inversiones sin company_id
    incomes_result = await db.finanzas_incomes.update_many(
        {
            "username": username,
            "$or": [
                {"company_id": {"$exists": False}},
                {"company_id": None}
            ]
        },
        {"$set": {"company_id": company_id}}
    )
    
    expenses_result = await db.finanzas_expenses.update_many(
        {
            "username": username,
            "$or": [
                {"company_id": {"$exists": False}},
                {"company_id": None}
            ]
        },
        {"$set": {"company_id": company_id}}
    )
    
    investments_result = await db.finanzas_investments.update_many(
        {
            "username": username,
            "$or": [
                {"company_id": {"$exists": False}},
                {"company_id": None}
            ]
        },
        {"$set": {"company_id": company_id}}
    )
    
    default_company.pop("_id", None)
    
    return {
        "migrated": True,
        "company": default_company,
        "stats": {
            "contacts_migrated": contacts_result.modified_count,
            "boards_migrated": boards_result.modified_count,
            "incomes_migrated": incomes_result.modified_count,
            "expenses_migrated": expenses_result.modified_count,
            "investments_migrated": investments_result.modified_count
        }
    }


# ==========================================
# SISTEMA DE COLABORADORES DE EMPRESA
# ==========================================

async def get_user_company_role(username: str, company_id: str) -> Optional[str]:
    """Obtener el rol del usuario en una empresa (owner, admin, collaborator o None)"""
    # Verificar si es propietario
    company = await db.finanzas_companies.find_one({"id": company_id})
    if not company:
        return None
    if company.get("owner_username") == username:
        return "owner"
    
    # Verificar si es colaborador
    collaborator = await db.company_collaborators.find_one({
        "company_id": company_id,
        "username": username
    })
    if collaborator:
        return collaborator.get("role", "collaborator")
    
    return None

async def verify_company_permission(username: str, company_id: str, permission: str):
    """Verificar que el usuario tenga un permiso específico en la empresa"""
    role = await get_user_company_role(username, company_id)
    if not role:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta empresa")
    
    if not has_permission(role, permission):
        raise HTTPException(status_code=403, detail=f"No tienes permiso para: {permission}")
    
    return role

async def get_companies_for_user(username: str, user_email: str = None) -> List[dict]:
    """Obtener todas las empresas a las que un usuario tiene acceso (como dueño o colaborador)"""
    companies = []
    
    # Empresas propias
    owned = await db.finanzas_companies.find(
        {"owner_username": username},
        {"_id": 0}
    ).to_list(100)
    
    for company in owned:
        company["user_role"] = "owner"
        company["is_owner"] = True
        companies.append(company)
    
    # Empresas donde es colaborador
    collaborations = await db.company_collaborators.find(
        {"username": username}
    ).to_list(100)
    
    for collab in collaborations:
        company = await db.finanzas_companies.find_one(
            {"id": collab["company_id"]},
            {"_id": 0}
        )
        if company:
            company["user_role"] = collab.get("role", "collaborator")
            company["is_owner"] = False
            companies.append(company)
    
    return companies


# ==========================================
# SISTEMA DE ACTIVIDAD POR EMPRESA
# ==========================================

async def log_company_activity(
    company_id: str,
    activity_type: str,
    actor_username: str,
    target_name: str = None,
    target_id: str = None,
    details: dict = None,
    amount: float = None
):
    """Registra una actividad en la empresa (helper interno)"""
    try:
        activity = {
            "id": generate_activity_id(),
            "company_id": company_id,
            "activity_type": activity_type,
            "actor_username": actor_username,
            "target_name": target_name,
            "target_id": target_id,
            "details": details,
            "amount": amount,
            "created_at": get_current_timestamp()
        }
        await db.company_activities.insert_one(activity)
    except Exception as e:
        # Log silencioso - no queremos que falle la operación principal
        print(f"Error logging activity: {e}")


@api_router.get("/finanzas/companies/{company_id}/activity")
async def get_company_activity(
    company_id: str,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    module: Optional[str] = Query(default=None, description="Filtrar por módulo: contacts, finances, boards, team"),
    current_user: dict = Depends(get_current_user)
):
    """Obtener actividad reciente de una empresa (solo admin/owner)"""
    username = current_user["username"]
    
    # Verificar permiso (solo admin/owner pueden ver actividad)
    role = await get_user_company_role(username, company_id)
    if role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Solo administradores pueden ver la actividad")
    
    # Construir query
    query = {"company_id": company_id}
    
    # Filtrar por módulo si se especifica
    if module:
        activity_types = [k for k, v in ACTIVITY_TYPES.items() if v.get("module") == module]
        if activity_types:
            query["activity_type"] = {"$in": activity_types}
    
    # Obtener actividades
    activities = await db.company_activities.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    
    # Obtener nombres de usuarios
    usernames = list(set(a.get("actor_username") for a in activities if a.get("actor_username")))
    user_names = {}
    for uname in usernames:
        profile = await db.user_profiles.find_one({"username": uname})
        if profile:
            user_names[uname] = profile.get("full_name", uname)
        else:
            user_names[uname] = uname
    
    # Formatear actividades
    formatted = []
    for activity in activities:
        actor_name = user_names.get(activity.get("actor_username"), activity.get("actor_username"))
        formatted.append(format_activity(activity, actor_name))
    
    # Contar total
    total = await db.company_activities.count_documents(query)
    
    return {
        "activities": formatted,
        "total": total,
        "limit": limit,
        "offset": offset
    }


@api_router.get("/finanzas/companies/{company_id}/collaborators")
async def get_company_collaborators(
    company_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Listar todos los colaboradores de una empresa"""
    username = current_user["username"]
    
    # Verificar acceso y permiso
    await verify_company_permission(username, company_id, "view_collaborators")
    
    # Obtener empresa
    company = await db.finanzas_companies.find_one({"id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    # Agregar propietario a la lista
    owner = await db.users.find_one({"username": company["owner_username"]})
    collaborators = []
    
    if owner:
        profile = await db.user_profiles.find_one({"username": company["owner_username"]})
        collaborators.append({
            "id": f"owner_{company['owner_username']}",
            "user_id": str(owner.get("_id", "")),
            "username": company["owner_username"],
            "email": owner.get("email", ""),
            "full_name": profile.get("full_name", owner.get("username", "")) if profile else owner.get("username", ""),
            "role": "owner",
            "is_owner": True,
            "joined_at": company.get("created_at", ""),
            "invited_by": None
        })
    
    # Obtener colaboradores
    collabs = await db.company_collaborators.find(
        {"company_id": company_id},
        {"_id": 0}
    ).to_list(100)
    
    for collab in collabs:
        user = await db.users.find_one({"username": collab["username"]})
        profile = await db.user_profiles.find_one({"username": collab["username"]})
        
        if user:
            collaborators.append({
                "id": collab.get("id", ""),
                "user_id": str(user.get("_id", "")),
                "username": collab["username"],
                "email": user.get("email", ""),
                "full_name": profile.get("full_name", collab["username"]) if profile else collab["username"],
                "role": collab.get("role", "collaborator"),
                "is_owner": False,
                "joined_at": collab.get("joined_at", ""),
                "invited_by": collab.get("invited_by", "")
            })
    
    return {
        "company_id": company_id,
        "company_name": company.get("name", ""),
        "collaborators": collaborators,
        "total": len(collaborators)
    }


@api_router.post("/finanzas/companies/{company_id}/collaborators/invite")
async def invite_collaborator(
    company_id: str,
    invitation: CollaboratorInvite,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Invitar a un colaborador a la empresa"""
    username = current_user["username"]
    
    # Verificar permiso de gestionar colaboradores
    await verify_company_permission(username, company_id, "manage_collaborators")
    
    # Obtener empresa
    company = await db.finanzas_companies.find_one({"id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    # Verificar límite de colaboradores según plan del propietario
    owner_profile = await db.user_profiles.find_one({"username": company["owner_username"]})
    owner_plan = owner_profile.get("plan", "free") if owner_profile else "free"
    
    plan_config = PLANS_CONFIG.get(owner_plan, PLANS_CONFIG["free"])
    max_collaborators = plan_config.get("limits", {}).get("max_collaborators", 0)
    
    current_collab_count = await db.company_collaborators.count_documents({"company_id": company_id})
    
    if max_collaborators != -1 and current_collab_count >= max_collaborators:
        raise HTTPException(
            status_code=403, 
            detail=f"Has alcanzado el límite de {max_collaborators} colaboradores para tu plan {plan_config.get('display_name', owner_plan)}. Actualiza tu plan para agregar más."
        )
    
    # Verificar si el email es del propietario
    owner = await db.users.find_one({"username": company["owner_username"]})
    if owner and owner.get("email", "").lower() == invitation.email.lower():
        raise HTTPException(status_code=400, detail="No puedes invitarte a ti mismo")
    
    # Verificar si ya existe invitación pendiente
    existing_invitation = await db.company_invitations.find_one({
        "company_id": company_id,
        "email": invitation.email.lower(),
        "status": "pending"
    })
    if existing_invitation:
        raise HTTPException(status_code=400, detail="Ya existe una invitación pendiente para este email")
    
    # Verificar si ya es colaborador
    invited_user = await db.users.find_one({"email": invitation.email.lower()})
    if invited_user:
        existing_collab = await db.company_collaborators.find_one({
            "company_id": company_id,
            "username": invited_user["username"]
        })
        if existing_collab:
            raise HTTPException(status_code=400, detail="Este usuario ya es colaborador de la empresa")
    
    # Crear invitación
    now = get_current_timestamp()
    inviter_profile = await db.user_profiles.find_one({"username": username})
    inviter_name = inviter_profile.get("full_name", username) if inviter_profile else username
    
    new_invitation = {
        "id": generate_invitation_id(),
        "company_id": company_id,
        "company_name": company.get("name", ""),
        "email": invitation.email.lower(),
        "role": invitation.role,
        "message": invitation.message,
        "status": "pending",
        "invited_by_username": username,
        "invited_by_name": inviter_name,
        "created_at": now,
        "expires_at": get_invitation_expiry(7)  # 7 días
    }
    
    await db.company_invitations.insert_one(new_invitation)
    
    # Crear notificación in-app si el usuario existe
    if invited_user:
        notification = {
            "id": generate_id(),
            "username": invited_user["username"],
            "type": "company_invitation",
            "title": "Nueva invitación de colaboración",
            "message": f"{inviter_name} te ha invitado a colaborar en {company.get('name', '')}",
            "data": {
                "invitation_id": new_invitation["id"],
                "company_id": company_id,
                "company_name": company.get("name", ""),
                "role": invitation.role
            },
            "read": False,
            "created_at": now
        }
        await db.notifications.insert_one(notification)
    
    # Enviar email de invitación
    app_url = os.environ.get("FRONTEND_URL", "https://mindoramap.com")
    email_html = get_invitation_email_html(
        inviter_name=inviter_name,
        company_name=company.get("name", ""),
        role=invitation.role,
        message=invitation.message,
        app_url=app_url
    )
    
    background_tasks.add_task(
        email_service.send_email,
        to_email=invitation.email,
        subject=f"🤝 {inviter_name} te invita a colaborar en {company.get('name', '')}",
        html_content=email_html
    )
    
    # Registrar actividad
    await log_company_activity(
        company_id=company_id,
        activity_type="collaborator_invited",
        actor_username=username,
        target_name=invitation.email,
        details={"role": invitation.role}
    )
    
    new_invitation.pop("_id", None)
    
    return {
        "message": "Invitación enviada exitosamente",
        "invitation": new_invitation
    }


@api_router.get("/invitations/pending")
async def get_pending_invitations(
    current_user: dict = Depends(get_current_user)
):
    """Obtener invitaciones pendientes del usuario actual"""
    user = await db.users.find_one({"username": current_user["username"]})
    if not user or not user.get("email"):
        return {"invitations": []}
    
    user_email = user["email"].lower()
    now = datetime.now(timezone.utc).isoformat()
    
    # Obtener invitaciones pendientes no expiradas
    invitations = await db.company_invitations.find({
        "email": user_email,
        "status": "pending",
        "expires_at": {"$gt": now}
    }, {"_id": 0}).to_list(50)
    
    # Marcar como expiradas las que ya pasaron
    await db.company_invitations.update_many(
        {
            "email": user_email,
            "status": "pending",
            "expires_at": {"$lte": now}
        },
        {"$set": {"status": "expired"}}
    )
    
    return {"invitations": invitations}


@api_router.post("/invitations/{invitation_id}/accept")
async def accept_invitation(
    invitation_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Aceptar una invitación de colaboración"""
    username = current_user["username"]
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    user_email = user.get("email", "").lower()
    
    # Buscar invitación
    invitation = await db.company_invitations.find_one({
        "id": invitation_id,
        "email": user_email,
        "status": "pending"
    })
    
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitación no encontrada o ya procesada")
    
    # Verificar expiración
    if is_invitation_expired(invitation.get("expires_at", "")):
        await db.company_invitations.update_one(
            {"id": invitation_id},
            {"$set": {"status": "expired"}}
        )
        raise HTTPException(status_code=400, detail="La invitación ha expirado")
    
    # Verificar que la empresa existe
    company = await db.finanzas_companies.find_one({"id": invitation["company_id"]})
    if not company:
        raise HTTPException(status_code=404, detail="La empresa ya no existe")
    
    now = get_current_timestamp()
    
    # Crear registro de colaborador
    collaborator = {
        "id": generate_collaborator_id(),
        "company_id": invitation["company_id"],
        "username": username,
        "user_email": user_email,
        "role": invitation.get("role", "collaborator"),
        "invited_by": invitation.get("invited_by_username", ""),
        "joined_at": now
    }
    
    await db.company_collaborators.insert_one(collaborator)
    
    # Actualizar estado de invitación
    await db.company_invitations.update_one(
        {"id": invitation_id},
        {"$set": {"status": "accepted", "accepted_at": now}}
    )
    
    # Crear notificación para el que invitó
    profile = await db.user_profiles.find_one({"username": username})
    collaborator_name = profile.get("full_name", username) if profile else username
    
    notification = {
        "id": generate_id(),
        "username": invitation.get("invited_by_username", ""),
        "type": "invitation_accepted",
        "title": "Invitación aceptada",
        "message": f"{collaborator_name} ha aceptado tu invitación para {company.get('name', '')}",
        "data": {
            "company_id": invitation["company_id"],
            "company_name": company.get("name", ""),
            "collaborator_username": username
        },
        "read": False,
        "created_at": now
    }
    await db.notifications.insert_one(notification)
    
    # Enviar email al que invitó
    inviter = await db.users.find_one({"username": invitation.get("invited_by_username", "")})
    if inviter and inviter.get("email"):
        app_url = os.environ.get("FRONTEND_URL", "https://mindoramap.com")
        email_html = get_invitation_accepted_email_html(
            collaborator_name=collaborator_name,
            company_name=company.get("name", ""),
            role=invitation.get("role", "collaborator"),
            app_url=app_url
        )
        background_tasks.add_task(
            email_service.send_email,
            to_email=inviter["email"],
            subject=f"✅ {collaborator_name} aceptó tu invitación",
            html_content=email_html
        )
    
    # Registrar actividad
    await log_company_activity(
        company_id=invitation["company_id"],
        activity_type="collaborator_joined",
        actor_username=username,
        target_name=collaborator_name,
        details={"role": invitation.get("role", "collaborator")}
    )
    
    collaborator.pop("_id", None)
    
    return {
        "message": "Invitación aceptada",
        "company_id": invitation["company_id"],
        "company_name": company.get("name", ""),
        "role": invitation.get("role", "collaborator")
    }


@api_router.post("/invitations/{invitation_id}/reject")
async def reject_invitation(
    invitation_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Rechazar una invitación de colaboración"""
    username = current_user["username"]
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    user_email = user.get("email", "").lower()
    
    # Buscar invitación
    invitation = await db.company_invitations.find_one({
        "id": invitation_id,
        "email": user_email,
        "status": "pending"
    })
    
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitación no encontrada o ya procesada")
    
    now = get_current_timestamp()
    
    # Actualizar estado
    await db.company_invitations.update_one(
        {"id": invitation_id},
        {"$set": {"status": "rejected", "rejected_at": now}}
    )
    
    # Notificar al que invitó
    profile = await db.user_profiles.find_one({"username": username})
    collaborator_name = profile.get("full_name", username) if profile else username
    
    company = await db.finanzas_companies.find_one({"id": invitation["company_id"]})
    company_name = company.get("name", "") if company else ""
    
    notification = {
        "id": generate_id(),
        "username": invitation.get("invited_by_username", ""),
        "type": "invitation_rejected",
        "title": "Invitación rechazada",
        "message": f"{collaborator_name} ha rechazado la invitación para {company_name}",
        "data": {
            "company_id": invitation["company_id"],
            "company_name": company_name
        },
        "read": False,
        "created_at": now
    }
    await db.notifications.insert_one(notification)
    
    # Enviar email
    inviter = await db.users.find_one({"username": invitation.get("invited_by_username", "")})
    if inviter and inviter.get("email"):
        email_html = get_invitation_rejected_email_html(
            collaborator_name=collaborator_name,
            company_name=company_name
        )
        background_tasks.add_task(
            email_service.send_email,
            to_email=inviter["email"],
            subject=f"❌ {collaborator_name} rechazó la invitación",
            html_content=email_html
        )
    
    return {"message": "Invitación rechazada"}


@api_router.put("/finanzas/companies/{company_id}/collaborators/{collaborator_username}/role")
async def update_collaborator_role_endpoint(
    company_id: str,
    collaborator_username: str,
    role_update: CollaboratorRoleUpdate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Cambiar el rol de un colaborador"""
    username = current_user["username"]
    
    # Verificar permiso
    await verify_company_permission(username, company_id, "manage_collaborators")
    
    # No se puede cambiar el rol del propietario
    company = await db.finanzas_companies.find_one({"id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    if company.get("owner_username") == collaborator_username:
        raise HTTPException(status_code=400, detail="No se puede cambiar el rol del propietario")
    
    # Buscar colaborador
    collaborator = await db.company_collaborators.find_one({
        "company_id": company_id,
        "username": collaborator_username
    })
    
    if not collaborator:
        raise HTTPException(status_code=404, detail="Colaborador no encontrado")
    
    old_role = collaborator.get("role", "collaborator")
    new_role = role_update.role
    
    if old_role == new_role:
        return {"message": "El rol no ha cambiado", "role": new_role}
    
    # Actualizar rol
    await db.company_collaborators.update_one(
        {"company_id": company_id, "username": collaborator_username},
        {"$set": {"role": new_role, "updated_at": get_current_timestamp()}}
    )
    
    # Notificar al colaborador
    changer_profile = await db.user_profiles.find_one({"username": username})
    changer_name = changer_profile.get("full_name", username) if changer_profile else username
    
    notification = {
        "id": generate_id(),
        "username": collaborator_username,
        "type": "role_changed",
        "title": "Tu rol ha cambiado",
        "message": f"{changer_name} cambió tu rol en {company.get('name', '')} de {old_role} a {new_role}",
        "data": {
            "company_id": company_id,
            "company_name": company.get("name", ""),
            "old_role": old_role,
            "new_role": new_role
        },
        "read": False,
        "created_at": get_current_timestamp()
    }
    await db.notifications.insert_one(notification)
    
    # Enviar email
    collab_user = await db.users.find_one({"username": collaborator_username})
    if collab_user and collab_user.get("email"):
        app_url = os.environ.get("FRONTEND_URL", "https://mindoramap.com")
        email_html = get_role_changed_email_html(
            company_name=company.get("name", ""),
            old_role=old_role,
            new_role=new_role,
            changed_by=changer_name,
            app_url=app_url
        )
        background_tasks.add_task(
            email_service.send_email,
            to_email=collab_user["email"],
            subject=f"🔄 Tu rol en {company.get('name', '')} ha cambiado",
            html_content=email_html
        )
    
    return {
        "message": f"Rol actualizado de {old_role} a {new_role}",
        "collaborator_username": collaborator_username,
        "old_role": old_role,
        "new_role": new_role
    }


@api_router.delete("/finanzas/companies/{company_id}/collaborators/{collaborator_username}")
async def remove_company_collaborator(
    company_id: str,
    collaborator_username: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Revocar acceso de un colaborador"""
    username = current_user["username"]
    
    # Verificar permiso (o que sea el mismo colaborador saliendo)
    user_role = await get_user_company_role(username, company_id)
    is_self_removal = username == collaborator_username
    
    if not is_self_removal and not has_permission(user_role or "", "manage_collaborators"):
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar colaboradores")
    
    # No se puede eliminar al propietario
    company = await db.finanzas_companies.find_one({"id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    if company.get("owner_username") == collaborator_username:
        raise HTTPException(status_code=400, detail="No se puede eliminar al propietario de la empresa")
    
    # Eliminar colaborador
    result = await db.company_collaborators.delete_one({
        "company_id": company_id,
        "username": collaborator_username
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Colaborador no encontrado")
    
    # Notificar al colaborador (si no es auto-eliminación)
    if not is_self_removal:
        remover_profile = await db.user_profiles.find_one({"username": username})
        remover_name = remover_profile.get("full_name", username) if remover_profile else username
        
        notification = {
            "id": generate_id(),
            "username": collaborator_username,
            "type": "access_revoked",
            "title": "Acceso revocado",
            "message": f"{remover_name} ha revocado tu acceso a {company.get('name', '')}",
            "data": {
                "company_id": company_id,
                "company_name": company.get("name", "")
            },
            "read": False,
            "created_at": get_current_timestamp()
        }
        await db.notifications.insert_one(notification)
        
        # Enviar email
        collab_user = await db.users.find_one({"username": collaborator_username})
        if collab_user and collab_user.get("email"):
            email_html = get_access_revoked_email_html(
                company_name=company.get("name", ""),
                revoked_by=remover_name
            )
            background_tasks.add_task(
                email_service.send_email,
                to_email=collab_user["email"],
                subject=f"🚫 Tu acceso a {company.get('name', '')} ha sido revocado",
                html_content=email_html
            )
    
    return {"message": "Colaborador eliminado exitosamente"}


@api_router.get("/finanzas/companies/{company_id}/invitations")
async def get_company_invitations(
    company_id: str,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Listar invitaciones de una empresa"""
    username = current_user["username"]
    
    # Verificar permiso
    await verify_company_permission(username, company_id, "view_collaborators")
    
    # Construir query
    query = {"company_id": company_id}
    if status:
        query["status"] = status
    
    invitations = await db.company_invitations.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"invitations": invitations}


@api_router.delete("/finanzas/companies/{company_id}/invitations/{invitation_id}")
async def revoke_invitation(
    company_id: str,
    invitation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Revocar una invitación pendiente"""
    username = current_user["username"]
    
    # Verificar permiso
    await verify_company_permission(username, company_id, "manage_collaborators")
    
    # Buscar invitación pendiente
    invitation = await db.company_invitations.find_one({
        "id": invitation_id,
        "company_id": company_id,
        "status": "pending"
    })
    
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitación no encontrada o ya procesada")
    
    # Actualizar estado
    await db.company_invitations.update_one(
        {"id": invitation_id},
        {"$set": {"status": "revoked", "revoked_at": get_current_timestamp()}}
    )
    
    return {"message": "Invitación revocada"}


@api_router.get("/finanzas/companies/{company_id}/my-role")
async def get_my_company_role(
    company_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener mi rol y permisos en una empresa"""
    username = current_user["username"]
    
    role = await get_user_company_role(username, company_id)
    if not role:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta empresa")
    
    company = await db.finanzas_companies.find_one({"id": company_id}, {"_id": 0})
    
    return {
        "company_id": company_id,
        "company_name": company.get("name", "") if company else "",
        "role": role,
        "is_owner": role == "owner",
        "permissions": get_role_permissions(role)
    }


@api_router.get("/my-companies")
async def get_my_companies(
    current_user: dict = Depends(get_current_user)
):
    """Obtener todas las empresas a las que tengo acceso"""
    username = current_user["username"]
    user = await db.users.find_one({"username": username})
    user_email = user.get("email", "").lower() if user else None
    
    companies = await get_companies_for_user(username, user_email)
    
    return {"companies": companies}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    """Iniciar scheduler al arrancar la aplicación"""
    await start_scheduler()
    logger.info("Aplicación iniciada con scheduler de recordatorios")

@app.on_event("shutdown")
async def shutdown_db_client():
    global scheduler_running
    scheduler_running = False
    client.close()
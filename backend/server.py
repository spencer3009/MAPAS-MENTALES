from fastapi import FastAPI, APIRouter, HTTPException, Depends, BackgroundTasks, Form, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

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

class RegisterRequest(BaseModel):
    nombre: str
    apellidos: Optional[str] = ""
    email: str
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

# ==================== SISTEMA DE PLANES ====================
# Límites por plan
PLAN_LIMITS = {
    "free": {
        "max_active_maps": 3,        # Mapas activos al mismo tiempo
        "max_total_maps_created": 5, # Mapas creados en total (histórico)
        "max_nodes_per_map": 50,
        "can_collaborate": False,
        "can_export_pdf": False,
        "priority_support": False
    },
    "pro": {
        "max_active_maps": -1,       # -1 = ilimitado
        "max_total_maps_created": -1,
        "max_nodes_per_map": -1,
        "can_collaborate": False,
        "can_export_pdf": True,
        "priority_support": True
    },
    "team": {
        "max_active_maps": -1,
        "max_total_maps_created": -1,
        "max_nodes_per_map": -1,
        "can_collaborate": True,
        "can_export_pdf": True,
        "priority_support": True
    },
    "admin": {
        "max_active_maps": -1,
        "max_total_maps_created": -1,
        "max_nodes_per_map": -1,
        "can_collaborate": True,
        "can_export_pdf": True,
        "priority_support": True
    }
}

def get_user_plan_limits(user: dict) -> dict:
    """Obtiene los límites del plan del usuario"""
    # Admins siempre tienen plan máximo
    if user.get("role") == "admin":
        return PLAN_LIMITS["admin"]
    plan = user.get("plan", "free")
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])

class UserResponse(BaseModel):
    username: str
    full_name: str
    role: str = "user"
    plan: str = "free"
    is_pro: bool = False

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
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await get_user(username)
    if user is None:
        raise credentials_exception
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
async def register(register_data: RegisterRequest):
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
    
    new_user = {
        "user_id": user_id,
        "id": user_id,
        "username": register_data.username,
        "email": register_data.email,
        "hashed_password": hashed_password,
        "full_name": full_name,
        "auth_provider": "local",
        "disabled": False,
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
    
    # Crear token de acceso
    access_token = create_access_token(data={"sub": register_data.username})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "username": register_data.username,
            "full_name": full_name
        }
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    # Obtener datos completos del usuario desde la BD
    user = await db.users.find_one({"username": current_user["username"]}, {"_id": 0})
    
    # Determinar el plan (admin siempre tiene plan máximo)
    user_role = user.get("role", "user") if user else "user"
    user_plan = "admin" if user_role == "admin" else user.get("plan", "free") if user else "free"
    
    return {
        "username": current_user["username"],
        "full_name": current_user.get("full_name", ""),
        "role": user_role,
        "plan": user_plan,
        "is_pro": user_plan in ["pro", "team", "admin"]
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
# GOOGLE OAUTH ENDPOINTS (Emergent Auth)
# ==========================================

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
    type: str  # 'node' or 'project'
    node_id: Optional[str] = None
    node_text: Optional[str] = None
    project_id: str
    project_name: str
    scheduled_date: str  # ISO format date
    scheduled_time: str  # HH:MM format
    message: str
    channel: str = "whatsapp"  # 'whatsapp' or 'email'

class ReminderResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    type: str
    node_id: Optional[str] = None
    node_text: Optional[str] = None
    project_id: str
    project_name: str
    scheduled_date: str
    scheduled_time: str
    scheduled_datetime: str
    message: str
    channel: str
    status: str  # 'pending', 'sent', 'failed'
    created_at: str
    sent_at: Optional[str] = None
    seen: bool = False  # Si el usuario ha visto la notificación
    seen_at: Optional[str] = None
    username: str

class ReminderUpdate(BaseModel):
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    message: Optional[str] = None
    channel: Optional[str] = None


# ==========================================
# TWILIO WHATSAPP FUNCTIONS
# ==========================================

def generate_twiml_response(message: str) -> str:
    """Generar respuesta TwiML XML para Twilio"""
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>{message}</Message>
</Response>'''


async def send_whatsapp_message(phone_number: str, message: str) -> dict:
    """Enviar mensaje por Twilio WhatsApp API"""
    
    # Si no hay configuración de Twilio, simular envío
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not TWILIO_WHATSAPP_NUMBER:
        logger.info("=" * 60)
        logger.info("📱 [SIMULACIÓN WHATSAPP - TWILIO] Notificación de recordatorio")
        logger.info(f"📞 Destinatario: {phone_number}")
        logger.info(f"📝 Mensaje: {message}")
        logger.info("✅ Estado: ENVIADO (simulado - Twilio no configurado)")
        logger.info("=" * 60)
        return {
            "success": True,
            "simulated": True,
            "message": "Mensaje simulado (Twilio WhatsApp no configurado)"
        }
    
    try:
        # Twilio API URL
        url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
        
        # Formatear número para Twilio (whatsapp:+1234567890)
        to_number = phone_number if phone_number.startswith("whatsapp:") else f"whatsapp:{phone_number}"
        
        # Payload para Twilio
        payload = {
            "From": TWILIO_WHATSAPP_NUMBER,
            "To": to_number,
            "Body": message
        }
        
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
                logger.error(f"Twilio API error: {response.status_code} - {response.text}")
                return {"success": False, "error": response.text, "status_code": response.status_code}
                
    except Exception as e:
        logger.error(f"Error sending WhatsApp via Twilio: {str(e)}")
        return {"success": False, "error": str(e)}


# ==========================================
# REMINDER SCHEDULER
# ==========================================

scheduler_running = False

async def check_and_send_reminders():
    """Verificar y enviar recordatorios pendientes"""
    global scheduler_running
    scheduler_running = True
    
    while scheduler_running:
        try:
            now = datetime.now(timezone.utc)
            
            # Buscar recordatorios pendientes que ya deberían enviarse
            pending_reminders = await db.reminders.find({
                "status": "pending",
                "scheduled_datetime": {"$lte": now.isoformat()}
            }, {"_id": 0}).to_list(100)
            
            for reminder in pending_reminders:
                try:
                    username = reminder["username"]
                    
                    # Buscar número en MongoDB (user_profiles)
                    profile = await db.user_profiles.find_one({"username": username}, {"_id": 0})
                    phone_number = profile.get("whatsapp") if profile else None
                    
                    # Si no hay en perfil, buscar en la colección de usuarios
                    if not phone_number:
                        user = await db.users.find_one({"username": username}, {"_id": 0})
                        phone_number = user.get("whatsapp", "") if user else ""
                    
                    if not phone_number:
                        logger.warning(f"Usuario {username} no tiene WhatsApp configurado")
                        continue
                    
                    # Construir mensaje
                    if reminder["type"] == "node":
                        message = "🔔 Recordatorio de MindoraMap\n\n"
                        message += f"📁 Proyecto: {reminder['project_name']}\n"
                        message += f"📌 Nodo: {reminder.get('node_text', 'Sin nombre')}\n\n"
                        message += f"📝 {reminder['message']}"
                    else:
                        message = "🔔 Recordatorio de MindoraMap\n\n"
                        message += f"📁 Proyecto: {reminder['project_name']}\n\n"
                        message += f"📝 {reminder['message']}"
                    
                    # Enviar mensaje
                    result = await send_whatsapp_message(phone_number, message)
                    
                    # Actualizar estado del recordatorio
                    new_status = "sent" if result.get("success") else "failed"
                    await db.reminders.update_one(
                        {"id": reminder["id"]},
                        {
                            "$set": {
                                "status": new_status,
                                "sent_at": datetime.now(timezone.utc).isoformat(),
                                "send_result": result
                            }
                        }
                    )
                    
                    logger.info(f"Recordatorio {reminder['id']} enviado: {new_status}")
                    
                except Exception as e:
                    logger.error(f"Error procesando recordatorio {reminder['id']}: {str(e)}")
            
        except Exception as e:
            logger.error(f"Error en scheduler: {str(e)}")
        
        # Esperar 30 segundos para prueba (cambiar a 300 en producción)
        await asyncio.sleep(30)

async def start_scheduler():
    """Iniciar el scheduler de recordatorios"""
    asyncio.create_task(check_and_send_reminders())
    logger.info("Scheduler de recordatorios iniciado")


# ==========================================
# REMINDER ENDPOINTS
# ==========================================

@api_router.post("/reminders", response_model=ReminderResponse)
async def create_reminder(
    reminder_data: ReminderCreate,
    current_user: dict = Depends(get_current_user)
):
    """Crear un nuevo recordatorio"""
    
    # Combinar fecha y hora
    scheduled_datetime = f"{reminder_data.scheduled_date}T{reminder_data.scheduled_time}:00"
    
    reminder = {
        "id": str(uuid.uuid4()),
        "type": reminder_data.type,
        "node_id": reminder_data.node_id,
        "node_text": reminder_data.node_text,
        "project_id": reminder_data.project_id,
        "project_name": reminder_data.project_name,
        "scheduled_date": reminder_data.scheduled_date,
        "scheduled_time": reminder_data.scheduled_time,
        "scheduled_datetime": scheduled_datetime,
        "message": reminder_data.message,
        "channel": reminder_data.channel,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "sent_at": None,
        "seen": False,
        "seen_at": None,
        "username": current_user["username"]
    }
    
    await db.reminders.insert_one(reminder)
    
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
    
    # Asegurar que todos los recordatorios tengan el campo seen
    for reminder in reminders:
        if "seen" not in reminder:
            reminder["seen"] = False
        if "seen_at" not in reminder:
            reminder["seen_at"] = None
    
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
    if update_data.scheduled_date:
        update_dict["scheduled_date"] = update_data.scheduled_date
    if update_data.scheduled_time:
        update_dict["scheduled_time"] = update_data.scheduled_time
    if update_data.message:
        update_dict["message"] = update_data.message
    if update_data.channel:
        update_dict["channel"] = update_data.channel
    
    # Recalcular scheduled_datetime si cambió fecha u hora
    if update_data.scheduled_date or update_data.scheduled_time:
        new_date = update_data.scheduled_date or reminder["scheduled_date"]
        new_time = update_data.scheduled_time or reminder["scheduled_time"]
        update_dict["scheduled_datetime"] = f"{new_date}T{new_time}:00"
    
    if update_dict:
        await db.reminders.update_one(
            {"id": reminder_id},
            {"$set": update_dict}
        )
    
    # Obtener recordatorio actualizado
    updated = await db.reminders.find_one({"id": reminder_id}, {"_id": 0})
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
    # Obtener usuario y sus límites de plan
    user = await db.users.find_one({"username": current_user["username"]}, {"_id": 0})
    plan_limits = get_user_plan_limits(user or {})
    
    # Contar mapas activos (no eliminados)
    active_maps_count = await db.projects.count_documents({
        "username": current_user["username"],
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
        "username": current_user["username"],
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
        {"username": current_user["username"]},
        {"$inc": {"total_maps_created": 1}}
    )
    
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

class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    plan: Optional[str] = None
    is_pro: Optional[bool] = None
    disabled: Optional[bool] = None

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

@api_router.get("/admin/users", response_model=List[UserListItem])
async def get_all_users(current_user: dict = Depends(require_admin)):
    """Obtener lista de todos los usuarios"""
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    
    result = []
    for user in users:
        # Admin siempre tiene plan máximo
        user_role = user.get("role", "user")
        user_plan = "admin" if user_role == "admin" else user.get("plan", "free")
        
        result.append({
            "username": user.get("username", ""),
            "email": user.get("email", ""),
            "full_name": user.get("full_name", ""),
            "role": user_role,
            "plan": user_plan,
            "auth_provider": user.get("auth_provider", "local"),
            "created_at": user.get("created_at"),
            "is_pro": user_plan in ["pro", "team", "admin"],
            "disabled": user.get("disabled", False)
        })
    
    return result

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

# Endpoint público para obtener contenido de landing (sin autenticación)
@api_router.get("/landing-content")
async def get_public_landing_content():
    """Obtener contenido de la landing page (público)"""
    content = await db.landing_content.find_one({"id": "main"}, {"_id": 0})
    return content or {}

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
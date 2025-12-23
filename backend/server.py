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

# Usuarios hardcodeados (temporales - se migrarán a BD)
HARDCODED_USERS = {
    "spencer3009": {
        "username": "spencer3009",
        "hashed_password": pwd_context.hash("Socios3009"),
        "full_name": "Spencer",
        "disabled": False,
        "whatsapp": "+1234567890"  # Número de WhatsApp para recordatorios
    },
    "teresa3009": {
        "username": "teresa3009",
        "hashed_password": pwd_context.hash("Socios3009"),
        "full_name": "Teresa",
        "disabled": False,
        "whatsapp": "+1234567890"
    }
}

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

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class UserResponse(BaseModel):
    username: str
    full_name: str

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

def get_user(username: str) -> Optional[dict]:
    if username in HARDCODED_USERS:
        return HARDCODED_USERS[username]
    return None

def authenticate_user(username: str, password: str) -> Optional[dict]:
    user = get_user(username)
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
    
    user = get_user(username)
    if user is None:
        raise credentials_exception
    return user


# ==========================================
# AUTH ENDPOINTS
# ==========================================

@api_router.post("/auth/login", response_model=Token)
async def login(login_data: LoginRequest):
    user = authenticate_user(login_data.username, login_data.password)
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

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "username": current_user["username"],
        "full_name": current_user["full_name"]
    }

@api_router.post("/auth/logout")
async def logout():
    # Con JWT stateless, el logout se maneja en el frontend
    return {"message": "Sesión cerrada exitosamente"}


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
    
    # Si no existe perfil, devolver datos básicos de HARDCODED_USERS
    hardcoded = HARDCODED_USERS.get(username, {})
    full_name = hardcoded.get("full_name", "")
    nombre_parts = full_name.split(" ", 1) if full_name else ["", ""]
    
    return {
        "username": username,
        "nombre": nombre_parts[0] if len(nombre_parts) > 0 else "",
        "apellidos": nombre_parts[1] if len(nombre_parts) > 1 else "",
        "email": hardcoded.get("email", ""),
        "whatsapp": hardcoded.get("whatsapp", ""),
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
    
    # Verificar contraseña actual
    user = HARDCODED_USERS.get(username)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if not verify_password(password_data.current_password, user["hashed_password"]):
        raise HTTPException(
            status_code=400,
            detail="La contraseña actual es incorrecta"
        )
    
    # Hashear nueva contraseña
    new_hashed = pwd_context.hash(password_data.new_password)
    
    # Guardar en MongoDB (para persistencia futura)
    await db.user_passwords.update_one(
        {"username": username},
        {
            "$set": {
                "hashed_password": new_hashed,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    # Actualizar en memoria (para sesión actual)
    HARDCODED_USERS[username]["hashed_password"] = new_hashed
    
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
                    
                    # Primero buscar número en MongoDB (user_profiles)
                    profile = await db.user_profiles.find_one({"username": username}, {"_id": 0})
                    phone_number = profile.get("whatsapp") if profile else None
                    
                    # Fallback a usuarios hardcodeados
                    if not phone_number:
                        user = HARDCODED_USERS.get(username)
                        phone_number = user.get("whatsapp", "") if user else ""
                    
                    if not phone_number:
                        logger.warning(f"Usuario {username} no tiene WhatsApp configurado")
                        continue
                    
                    # Construir mensaje
                    if reminder["type"] == "node":
                        message = f"🔔 Recordatorio de MindoraMap\n\n"
                        message += f"📁 Proyecto: {reminder['project_name']}\n"
                        message += f"📌 Nodo: {reminder.get('node_text', 'Sin nombre')}\n\n"
                        message += f"📝 {reminder['message']}"
                    else:
                        message = f"🔔 Recordatorio de MindoraMap\n\n"
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
    links: Optional[List[dict]] = None

class ProjectCreate(BaseModel):
    id: Optional[str] = None
    name: str
    nodes: List[NodeData]

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    nodes: Optional[List[NodeData]] = None

class ProjectResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    name: str
    nodes: List[dict]
    username: str
    createdAt: str
    updatedAt: str


# ==========================================
# PROJECT ENDPOINTS
# ==========================================

@api_router.get("/projects", response_model=List[ProjectResponse])
async def get_projects(current_user: dict = Depends(get_current_user)):
    """Obtener todos los proyectos del usuario"""
    projects = await db.projects.find(
        {"username": current_user["username"]},
        {"_id": 0}
    ).to_list(100)
    return projects

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
    return project

@api_router.post("/projects", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate,
    current_user: dict = Depends(get_current_user)
):
    """Crear un nuevo proyecto"""
    now = datetime.now(timezone.utc).isoformat()
    
    project = {
        "id": project_data.id or str(uuid.uuid4()),
        "name": project_data.name,
        "nodes": [node.model_dump() for node in project_data.nodes],
        "username": current_user["username"],
        "createdAt": now,
        "updatedAt": now
    }
    
    await db.projects.insert_one(project)
    
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
    
    update_dict = {"updatedAt": datetime.now(timezone.utc).isoformat()}
    
    if update_data.name is not None:
        update_dict["name"] = update_data.name
    
    if update_data.nodes is not None:
        update_dict["nodes"] = [node.model_dump() for node in update_data.nodes]
    
    await db.projects.update_one(
        {"id": project_id},
        {"$set": update_dict}
    )
    
    # Return updated project
    updated = await db.projects.find_one({"id": project_id}, {"_id": 0})
    return updated

@api_router.delete("/projects/{project_id}")
async def delete_project(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Eliminar un proyecto"""
    result = await db.projects.delete_one({
        "id": project_id,
        "username": current_user["username"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    # También eliminar recordatorios asociados al proyecto
    await db.reminders.delete_many({
        "project_id": project_id,
        "username": current_user["username"]
    })
    
    return {"message": "Proyecto eliminado"}

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
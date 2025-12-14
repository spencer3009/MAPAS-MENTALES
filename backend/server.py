from fastapi import FastAPI, APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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

# WhatsApp Business API Configuration (Meta oficial)
WHATSAPP_API_URL = os.environ.get('WHATSAPP_API_URL', '')
WHATSAPP_ACCESS_TOKEN = os.environ.get('WHATSAPP_ACCESS_TOKEN', '')
WHATSAPP_PHONE_NUMBER_ID = os.environ.get('WHATSAPP_PHONE_NUMBER_ID', '')

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

@api_router.put("/auth/profile/whatsapp")
async def update_whatsapp_number(
    whatsapp_number: str,
    current_user: dict = Depends(get_current_user)
):
    """Actualizar número de WhatsApp del usuario"""
    username = current_user["username"]
    if username in HARDCODED_USERS:
        HARDCODED_USERS[username]["whatsapp"] = whatsapp_number
    return {"message": "Número de WhatsApp actualizado", "whatsapp": whatsapp_number}

@api_router.get("/auth/profile/whatsapp")
async def get_whatsapp_number(current_user: dict = Depends(get_current_user)):
    """Obtener número de WhatsApp del usuario"""
    return {"whatsapp": current_user.get("whatsapp", "")}


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
    username: str

class ReminderUpdate(BaseModel):
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    message: Optional[str] = None
    channel: Optional[str] = None


# ==========================================
# WHATSAPP FUNCTIONS
# ==========================================

async def send_whatsapp_message(phone_number: str, message: str) -> dict:
    """Enviar mensaje por WhatsApp Business API"""
    
    # Si no hay configuración de WhatsApp, simular envío
    if not WHATSAPP_ACCESS_TOKEN or not WHATSAPP_PHONE_NUMBER_ID:
        logger.info(f"[SIMULADO] WhatsApp a {phone_number}: {message}")
        return {
            "success": True,
            "simulated": True,
            "message": "Mensaje simulado (WhatsApp no configurado)"
        }
    
    try:
        url = f"{WHATSAPP_API_URL}/{WHATSAPP_PHONE_NUMBER_ID}/messages"
        
        headers = {
            "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
            "Content-Type": "application/json"
        }
        
        # Formato para WhatsApp Business API de Meta
        payload = {
            "messaging_product": "whatsapp",
            "to": phone_number.replace("+", ""),
            "type": "text",
            "text": {
                "body": message
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers)
            
            if response.status_code == 200:
                return {"success": True, "response": response.json()}
            else:
                logger.error(f"WhatsApp API error: {response.text}")
                return {"success": False, "error": response.text}
                
    except Exception as e:
        logger.error(f"Error sending WhatsApp: {str(e)}")
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
                    # Obtener número de WhatsApp del usuario
                    user = HARDCODED_USERS.get(reminder["username"])
                    if not user:
                        continue
                    
                    phone_number = user.get("whatsapp", "")
                    if not phone_number:
                        logger.warning(f"Usuario {reminder['username']} no tiene WhatsApp configurado")
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
        
        # Esperar 30 segundos antes de la siguiente verificación
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
        "username": current_user["username"]
    }
    
    await db.reminders.insert_one(reminder)
    
    return reminder

@api_router.get("/reminders", response_model=List[ReminderResponse])
async def get_reminders(
    current_user: dict = Depends(get_current_user),
    node_id: Optional[str] = None,
    project_id: Optional[str] = None,
    status: Optional[str] = None
):
    """Obtener recordatorios del usuario"""
    
    query = {"username": current_user["username"]}
    
    if node_id:
        query["node_id"] = node_id
    if project_id:
        query["project_id"] = project_id
    if status:
        query["status"] = status
    
    reminders = await db.reminders.find(query, {"_id": 0}).to_list(1000)
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
# EXISTING MODELS
# ==========================================


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
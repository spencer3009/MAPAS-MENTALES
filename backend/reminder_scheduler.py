"""
Verification Reminder Scheduler for Mindora
Runs periodic jobs to send reminder emails to unverified users
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
import reminder_service
import email_service

logger = logging.getLogger(__name__)

# Scheduler instance
scheduler = AsyncIOScheduler()

# Time thresholds for reminders
REMINDER_24H = timedelta(hours=24)
REMINDER_72H = timedelta(hours=72)
REMINDER_7D = timedelta(days=7)


async def process_verification_reminders(db):
    """
    Procesa y envía recordatorios de verificación a usuarios no verificados
    Se ejecuta cada hora
    """
    logger.info("🔄 Iniciando proceso de recordatorios de verificación...")
    
    now = datetime.now(timezone.utc)
    
    try:
        # Buscar usuarios no verificados que necesitan recordatorio
        unverified_users = await db.users.find({
            "email_verified": False,
            "email": {"$exists": True, "$ne": None, "$ne": ""},
            "auth_provider": {"$ne": "google"}  # Excluir Google OAuth
        }).to_list(length=1000)
        
        logger.info(f"📋 Encontrados {len(unverified_users)} usuarios no verificados")
        
        reminders_sent = {
            "24h": 0,
            "72h": 0,
            "7d": 0,
            "skipped": 0,
            "errors": 0
        }
        
        for user in unverified_users:
            try:
                # Obtener fecha de registro
                created_at_str = user.get("created_at")
                if not created_at_str:
                    continue
                
                try:
                    created_at = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
                except:
                    continue
                
                time_since_registration = now - created_at
                
                # Datos del usuario
                email = user.get("email")
                name = user.get("full_name") or user.get("username", "Usuario")
                username = user.get("username")
                
                # Verificar token existente o generar uno nuevo
                verification_token = user.get("verification_token")
                token_expiry_str = user.get("verification_token_expiry")
                
                # Si no hay token o expiró, generar uno nuevo
                if not verification_token or (token_expiry_str and email_service.is_token_expired(token_expiry_str)):
                    verification_token = email_service.generate_verification_token()
                    new_expiry = email_service.get_token_expiry()
                    
                    await db.users.update_one(
                        {"username": username},
                        {"$set": {
                            "verification_token": verification_token,
                            "verification_token_expiry": new_expiry
                        }}
                    )
                    logger.info(f"🔑 Token regenerado para {email}")
                
                # Determinar qué recordatorio enviar
                reminder_24h_sent = user.get("reminder_24h_sent", False)
                reminder_72h_sent = user.get("reminder_72h_sent", False)
                reminder_7d_sent = user.get("reminder_7d_sent", False)
                
                email_sent = False
                
                # Recordatorio de 7 días (prioridad más alta)
                if time_since_registration >= REMINDER_7D and not reminder_7d_sent:
                    result = await reminder_service.send_reminder_7d(email, name, verification_token)
                    if result.get("success"):
                        await db.users.update_one(
                            {"username": username},
                            {"$set": {
                                "reminder_7d_sent": True,
                                "reminder_7d_sent_at": now.isoformat()
                            }}
                        )
                        reminders_sent["7d"] += 1
                        email_sent = True
                        logger.info(f"✅ Recordatorio 7d enviado a {email}")
                    else:
                        reminders_sent["errors"] += 1
                
                # Recordatorio de 72 horas
                elif time_since_registration >= REMINDER_72H and not reminder_72h_sent:
                    result = await reminder_service.send_reminder_72h(email, name, verification_token)
                    if result.get("success"):
                        await db.users.update_one(
                            {"username": username},
                            {"$set": {
                                "reminder_72h_sent": True,
                                "reminder_72h_sent_at": now.isoformat()
                            }}
                        )
                        reminders_sent["72h"] += 1
                        email_sent = True
                        logger.info(f"✅ Recordatorio 72h enviado a {email}")
                    else:
                        reminders_sent["errors"] += 1
                
                # Recordatorio de 24 horas
                elif time_since_registration >= REMINDER_24H and not reminder_24h_sent:
                    result = await reminder_service.send_reminder_24h(email, name, verification_token)
                    if result.get("success"):
                        await db.users.update_one(
                            {"username": username},
                            {"$set": {
                                "reminder_24h_sent": True,
                                "reminder_24h_sent_at": now.isoformat()
                            }}
                        )
                        reminders_sent["24h"] += 1
                        email_sent = True
                        logger.info(f"✅ Recordatorio 24h enviado a {email}")
                    else:
                        reminders_sent["errors"] += 1
                
                if not email_sent:
                    reminders_sent["skipped"] += 1
                    
            except Exception as e:
                logger.error(f"❌ Error procesando usuario {user.get('username')}: {e}")
                reminders_sent["errors"] += 1
        
        logger.info(f"📊 Resumen de recordatorios: 24h={reminders_sent['24h']}, 72h={reminders_sent['72h']}, 7d={reminders_sent['7d']}, skipped={reminders_sent['skipped']}, errors={reminders_sent['errors']}")
        
        return reminders_sent
        
    except Exception as e:
        logger.error(f"❌ Error en proceso de recordatorios: {e}")
        return {"error": str(e)}


def start_reminder_scheduler(db):
    """
    Inicia el scheduler para enviar recordatorios automáticos
    Se ejecuta cada hora
    """
    try:
        # Crear una función wrapper que ejecute la coroutine
        async def job_wrapper():
            await process_verification_reminders(db)
        
        # Agregar el job que corre cada hora
        scheduler.add_job(
            job_wrapper,
            IntervalTrigger(hours=1),
            id="verification_reminders",
            name="Send verification reminder emails",
            replace_existing=True,
            max_instances=1
        )
        
        # Iniciar el scheduler
        scheduler.start()
        logger.info("⏰ Scheduler de recordatorios iniciado (cada 1 hora)")
        
    except Exception as e:
        logger.error(f"❌ Error iniciando scheduler: {e}")


def stop_reminder_scheduler():
    """Detiene el scheduler"""
    try:
        scheduler.shutdown(wait=False)
        logger.info("⏹️ Scheduler de recordatorios detenido")
    except Exception as e:
        logger.error(f"❌ Error deteniendo scheduler: {e}")


async def run_reminders_now(db):
    """
    Ejecuta el proceso de recordatorios inmediatamente (para testing/admin)
    """
    return await process_verification_reminders(db)

"""
Reminder Email Service for Mindora
Handles sending scheduled reminder emails
"""

import os
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
import resend

logger = logging.getLogger(__name__)

# Configuración
resend.api_key = os.environ.get("RESEND_API_KEY", "")

# IMPORTANTE: Usar siempre noreply@mindora.pe ya que es el dominio verificado en Resend
# No usar onboarding@resend.dev porque solo permite enviar al owner de la cuenta
_env_sender = os.environ.get("SENDER_EMAIL", "")
if _env_sender and "resend.dev" not in _env_sender:
    SENDER_EMAIL = _env_sender
else:
    SENDER_EMAIL = "noreply@mindora.pe"  # Dominio verificado

logger.info(f"📧 [reminder_email_service] SENDER_EMAIL configurado: {SENDER_EMAIL}")

SENDER_NAME = "Mindora"
LOGO_URL = "https://customer-assets.emergentagent.com/job_c7c9b123-4484-446c-b0cd-4986bb2bb2189/artifacts/hk2d8hgn_MINDORA%20TRANSPARENTE.png"


def get_app_url():
    return os.environ.get("APP_URL", "http://localhost:3000")


def get_sender():
    return f"{SENDER_NAME} <{SENDER_EMAIL}>"


def format_date_spanish(date_str: str) -> str:
    """Formatea una fecha ISO a formato español legible"""
    try:
        dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        # Nombres de días y meses en español
        days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
        months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
        
        day_name = days[dt.weekday()]
        day_num = dt.day
        month_name = months[dt.month - 1]
        year = dt.year
        
        return f"{day_name}, {day_num} de {month_name} de {year}"
    except:
        return date_str


def format_time_spanish(date_str: str) -> str:
    """Extrae y formatea la hora de una fecha ISO"""
    try:
        dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        hour = dt.hour
        minute = dt.minute
        
        # Formato 12 horas con AM/PM
        period = "AM" if hour < 12 else "PM"
        hour_12 = hour if hour <= 12 else hour - 12
        if hour_12 == 0:
            hour_12 = 12
        
        return f"{hour_12}:{minute:02d} {period}"
    except:
        return ""


def get_reminder_email_template(
    recipient_name: str,
    title: str,
    description: str,
    date: str,
    time: str
) -> str:
    """Template de email para recordatorios programados"""
    
    app_url = get_app_url()
    
    # Escapar descripción para HTML
    description_html = description.replace('\n', '<br>') if description else '<em style="color: #9CA3AF;">Sin descripción adicional</em>'
    
    return f"""
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
                                <img src="{LOGO_URL}" alt="Mindora" style="height: 40px; width: auto; margin-bottom: 15px;" />
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                                    ⏰ Recordatorio Programado
                                </h1>
                            </td>
                        </tr>
                        
                        <!-- Body -->
                        <tr>
                            <td style="padding: 40px;">
                                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
                                    Hola <strong>{recipient_name}</strong>,
                                </p>
                                
                                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
                                    Tienes un recordatorio pendiente:
                                </p>
                                
                                <!-- Reminder Card -->
                                <div style="background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%); border-radius: 12px; padding: 25px; margin-bottom: 25px; border-left: 4px solid #6366F1;">
                                    <h2 style="color: #1f2937; margin: 0 0 15px; font-size: 20px; font-weight: 600;">
                                        📌 {title}
                                    </h2>
                                    
                                    <div style="color: #4b5563; font-size: 15px; line-height: 1.7;">
                                        <p style="margin: 0 0 10px;">
                                            <strong>📅 Fecha:</strong> {date}
                                        </p>
                                        <p style="margin: 0 0 10px;">
                                            <strong>🕐 Hora:</strong> {time}
                                        </p>
                                        <p style="margin: 0;">
                                            <strong>📝 Descripción:</strong><br>
                                            <span style="color: #6b7280;">{description_html}</span>
                                        </p>
                                    </div>
                                </div>
                                
                                <!-- CTA Button -->
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center">
                                            <a href="{app_url}/reminders" 
                                               style="display: inline-block; background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%); 
                                                      color: #ffffff; text-decoration: none; padding: 14px 35px; 
                                                      border-radius: 10px; font-size: 15px; font-weight: 600;
                                                      box-shadow: 0 4px 14px rgba(59, 130, 246, 0.3);">
                                                📋 Ver mis recordatorios
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9fafb; padding: 25px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                                <p style="color: #9ca3af; font-size: 13px; margin: 0 0 8px;">
                                    Este mensaje fue enviado automáticamente por Mindora.
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


async def send_reminder_email(
    recipient_email: str,
    recipient_name: str,
    title: str,
    description: str,
    reminder_date: str
) -> dict:
    """
    Envía un email de recordatorio programado
    """
    
    # Formatear fecha y hora
    formatted_date = format_date_spanish(reminder_date)
    formatted_time = format_time_spanish(reminder_date)
    
    html_content = get_reminder_email_template(
        recipient_name=recipient_name,
        title=title,
        description=description or "",
        date=formatted_date,
        time=formatted_time
    )
    
    params = {
        "from": get_sender(),
        "to": [recipient_email],
        "subject": f"⏰ Recordatorio: {title} — Mindora",
        "html": html_content
    }
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"📧 Email de recordatorio enviado a {recipient_email}: {title}")
        return {
            "success": True,
            "email_id": email.get("id"),
            "recipient": recipient_email,
            "title": title
        }
    except Exception as e:
        logger.error(f"❌ Error enviando email de recordatorio a {recipient_email}: {e}")
        return {
            "success": False,
            "error": str(e),
            "recipient": recipient_email,
            "title": title
        }


def calculate_notification_time(reminder_date: str, notify_before: str) -> datetime:
    """
    Calcula cuándo debe enviarse la notificación basado en el tiempo de anticipación
    
    notify_before puede ser: 'now', '5min', '15min', '1hour'
    """
    try:
        # Normalizar el formato de fecha
        reminder_date = reminder_date.replace('Z', '+00:00')
        reminder_dt = datetime.fromisoformat(reminder_date)
        
        # Asegurar que tenga timezone
        if reminder_dt.tzinfo is None:
            reminder_dt = reminder_dt.replace(tzinfo=timezone.utc)
        
        logger.info(f"📆 [calculate_notification_time] reminder_date original: {reminder_date}")
        logger.info(f"📆 [calculate_notification_time] reminder_dt parseado: {reminder_dt.isoformat()}")
        logger.info(f"📆 [calculate_notification_time] notify_before: {notify_before}")
        
        if notify_before == 'now':
            notification_time = reminder_dt
        elif notify_before == '5min':
            notification_time = reminder_dt - timedelta(minutes=5)
        elif notify_before == '15min':
            notification_time = reminder_dt - timedelta(minutes=15)
        elif notify_before == '1hour':
            notification_time = reminder_dt - timedelta(hours=1)
        else:
            # Default: 15 minutos antes
            notification_time = reminder_dt - timedelta(minutes=15)
        
        logger.info(f"📆 [calculate_notification_time] notification_time calculado: {notification_time.isoformat()}")
        return notification_time
        
    except Exception as e:
        logger.error(f"❌ [calculate_notification_time] Error calculando tiempo de notificación: {e}")
        return datetime.now(timezone.utc)

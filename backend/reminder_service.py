"""
Email Reminder Service for Mindora
Sends automated reminder emails to users who haven't verified their accounts
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

SENDER_NAME = "Mindora"
LOGO_URL = "https://customer-assets.emergentagent.com/job_c7c9b123-4484-446c-b0cd-4986bb2bb2189/artifacts/hk2d8hgn_MINDORA%20TRANSPARENTE.png"


def get_app_url():
    return os.environ.get("APP_URL", "http://localhost:3000")


def get_sender():
    return f"{SENDER_NAME} <{SENDER_EMAIL}>"


# ============================================================
# EMAIL TEMPLATES
# ============================================================

def get_reminder_24h_template(recipient_name: str, verification_link: str) -> str:
    """Template para recordatorio de 24 horas"""
    app_url = get_app_url()
    
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
                            <td style="background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%); padding: 35px 40px; text-align: center;">
                                <img src="{LOGO_URL}" alt="Mindora" style="height: 45px; width: auto;" />
                            </td>
                        </tr>
                        
                        <!-- Body -->
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 24px; font-weight: 600;">
                                    ¡Hola {recipient_name}! 👋
                                </h2>
                                
                                <p style="color: #4b5563; font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
                                    Notamos que creaste tu cuenta en Mindora hace un día, pero aún no has verificado tu correo.
                                </p>
                                
                                <p style="color: #4b5563; font-size: 16px; line-height: 1.7; margin: 0 0 25px;">
                                    <strong>Sin verificar, no podrás:</strong>
                                </p>
                                
                                <ul style="color: #4b5563; font-size: 15px; line-height: 1.8; margin: 0 0 25px; padding-left: 20px;">
                                    <li>Crear y guardar mapas mentales</li>
                                    <li>Gestionar tus contactos</li>
                                    <li>Crear tableros de trabajo</li>
                                </ul>
                                
                                <p style="color: #4b5563; font-size: 16px; line-height: 1.7; margin: 0 0 30px;">
                                    ¡Solo toma un clic! 🚀
                                </p>
                                
                                <!-- CTA Button -->
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center">
                                            <a href="{verification_link}" 
                                               style="display: inline-block; background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%); 
                                                      color: #ffffff; text-decoration: none; padding: 16px 40px; 
                                                      border-radius: 10px; font-size: 16px; font-weight: 600;
                                                      box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
                                                ✓ Verificar mi cuenta ahora
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Alternative Link -->
                                <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-top: 30px;">
                                    <p style="color: #6b7280; font-size: 13px; margin: 0 0 10px;">
                                        ¿El botón no funciona? Copia y pega este enlace:
                                    </p>
                                    <p style="color: #3B82F6; font-size: 12px; word-break: break-all; margin: 0;">
                                        {verification_link}
                                    </p>
                                </div>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9fafb; padding: 25px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                                <p style="color: #9ca3af; font-size: 13px; margin: 0 0 10px;">
                                    ¿No creaste esta cuenta? Ignora este mensaje.
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


def get_reminder_72h_template(recipient_name: str, verification_link: str) -> str:
    """Template para recordatorio de 72 horas"""
    app_url = get_app_url()
    
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
                            <td style="background: linear-gradient(135deg, #F59E0B 0%, #EF4444 100%); padding: 35px 40px; text-align: center;">
                                <img src="{LOGO_URL}" alt="Mindora" style="height: 45px; width: auto;" />
                            </td>
                        </tr>
                        
                        <!-- Body -->
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 24px; font-weight: 600;">
                                    {recipient_name}, ¡tu cuenta te espera! ⏳
                                </h2>
                                
                                <p style="color: #4b5563; font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
                                    Han pasado 3 días desde que te registraste en Mindora y tu cuenta sigue sin activarse.
                                </p>
                                
                                <div style="background-color: #fef3c7; border-left: 4px solid #F59E0B; padding: 15px 20px; margin: 0 0 25px; border-radius: 0 8px 8px 0;">
                                    <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 500;">
                                        💡 Dato: El 80% de los usuarios que verifican su cuenta en las primeras 72 horas aprovechan al máximo la plataforma.
                                    </p>
                                </div>
                                
                                <p style="color: #4b5563; font-size: 16px; line-height: 1.7; margin: 0 0 30px;">
                                    No te pierdas la oportunidad de organizar tus ideas y proyectos de forma visual. 
                                    <strong>Solo necesitas verificar tu correo</strong> para desbloquear todas las funciones.
                                </p>
                                
                                <!-- CTA Button -->
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center">
                                            <a href="{verification_link}" 
                                               style="display: inline-block; background: linear-gradient(135deg, #F59E0B 0%, #EF4444 100%); 
                                                      color: #ffffff; text-decoration: none; padding: 16px 40px; 
                                                      border-radius: 10px; font-size: 16px; font-weight: 600;
                                                      box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">
                                                🔓 Activar mi cuenta
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Alternative Link -->
                                <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-top: 30px;">
                                    <p style="color: #6b7280; font-size: 13px; margin: 0 0 10px;">
                                        Enlace directo:
                                    </p>
                                    <p style="color: #3B82F6; font-size: 12px; word-break: break-all; margin: 0;">
                                        {verification_link}
                                    </p>
                                </div>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9fafb; padding: 25px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
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


def get_reminder_7d_template(recipient_name: str, verification_link: str) -> str:
    """Template para recordatorio de 7 días (último aviso)"""
    app_url = get_app_url()
    
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
                            <td style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 35px 40px; text-align: center;">
                                <img src="{LOGO_URL}" alt="Mindora" style="height: 45px; width: auto;" />
                            </td>
                        </tr>
                        
                        <!-- Body -->
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 24px; font-weight: 600;">
                                    ⚠️ Última oportunidad, {recipient_name}
                                </h2>
                                
                                <p style="color: #4b5563; font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
                                    Ha pasado una semana y tu cuenta de Mindora sigue inactiva.
                                </p>
                                
                                <div style="background-color: #fee2e2; border-left: 4px solid #EF4444; padding: 15px 20px; margin: 0 0 25px; border-radius: 0 8px 8px 0;">
                                    <p style="color: #991b1b; font-size: 14px; margin: 0; font-weight: 500;">
                                        🔒 Este es nuestro último recordatorio antes de que tu cuenta quede limitada permanentemente.
                                    </p>
                                </div>
                                
                                <p style="color: #4b5563; font-size: 16px; line-height: 1.7; margin: 0 0 15px;">
                                    <strong>Lo que te estás perdiendo:</strong>
                                </p>
                                
                                <ul style="color: #4b5563; font-size: 15px; line-height: 1.8; margin: 0 0 25px; padding-left: 20px;">
                                    <li>✨ Mapas mentales ilimitados</li>
                                    <li>📊 Gestión completa de contactos</li>
                                    <li>📋 Tableros de trabajo colaborativos</li>
                                    <li>🎨 Personalización total de tus proyectos</li>
                                </ul>
                                
                                <p style="color: #4b5563; font-size: 16px; line-height: 1.7; margin: 0 0 30px;">
                                    <strong>Un clic es todo lo que necesitas.</strong> No dejes pasar esta oportunidad.
                                </p>
                                
                                <!-- CTA Button -->
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center">
                                            <a href="{verification_link}" 
                                               style="display: inline-block; background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); 
                                                      color: #ffffff; text-decoration: none; padding: 18px 50px; 
                                                      border-radius: 10px; font-size: 17px; font-weight: 700;
                                                      box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);
                                                      text-transform: uppercase; letter-spacing: 0.5px;">
                                                🚀 Activar ahora
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Alternative Link -->
                                <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-top: 30px;">
                                    <p style="color: #6b7280; font-size: 13px; margin: 0 0 10px;">
                                        Enlace de verificación:
                                    </p>
                                    <p style="color: #3B82F6; font-size: 12px; word-break: break-all; margin: 0;">
                                        {verification_link}
                                    </p>
                                </div>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9fafb; padding: 25px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                                <p style="color: #9ca3af; font-size: 13px; margin: 0 0 10px;">
                                    ¿Tienes problemas? Responde a este correo y te ayudamos.
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


# ============================================================
# EMAIL SENDING FUNCTIONS
# ============================================================

async def send_reminder_24h(recipient_email: str, recipient_name: str, verification_token: str) -> dict:
    """Envía recordatorio de 24 horas"""
    app_url = get_app_url()
    verification_link = f"{app_url}/verify?token={verification_token}"
    
    html_content = get_reminder_24h_template(recipient_name, verification_link)
    
    params = {
        "from": get_sender(),
        "to": [recipient_email],
        "subject": "👋 ¿Olvidaste verificar tu cuenta de Mindora?",
        "html": html_content
    }
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"📧 Recordatorio 24h enviado a {recipient_email}")
        return {"success": True, "email_id": email.get("id"), "type": "reminder_24h"}
    except Exception as e:
        logger.error(f"❌ Error enviando recordatorio 24h a {recipient_email}: {e}")
        return {"success": False, "error": str(e)}


async def send_reminder_72h(recipient_email: str, recipient_name: str, verification_token: str) -> dict:
    """Envía recordatorio de 72 horas"""
    app_url = get_app_url()
    verification_link = f"{app_url}/verify?token={verification_token}"
    
    html_content = get_reminder_72h_template(recipient_name, verification_link)
    
    params = {
        "from": get_sender(),
        "to": [recipient_email],
        "subject": "⏳ Tu cuenta de Mindora sigue sin activarse",
        "html": html_content
    }
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"📧 Recordatorio 72h enviado a {recipient_email}")
        return {"success": True, "email_id": email.get("id"), "type": "reminder_72h"}
    except Exception as e:
        logger.error(f"❌ Error enviando recordatorio 72h a {recipient_email}: {e}")
        return {"success": False, "error": str(e)}


async def send_reminder_7d(recipient_email: str, recipient_name: str, verification_token: str) -> dict:
    """Envía recordatorio de 7 días (último aviso)"""
    app_url = get_app_url()
    verification_link = f"{app_url}/verify?token={verification_token}"
    
    html_content = get_reminder_7d_template(recipient_name, verification_link)
    
    params = {
        "from": get_sender(),
        "to": [recipient_email],
        "subject": "⚠️ Última oportunidad para activar tu cuenta de Mindora",
        "html": html_content
    }
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"📧 Recordatorio 7d (último) enviado a {recipient_email}")
        return {"success": True, "email_id": email.get("id"), "type": "reminder_7d"}
    except Exception as e:
        logger.error(f"❌ Error enviando recordatorio 7d a {recipient_email}: {e}")
        return {"success": False, "error": str(e)}

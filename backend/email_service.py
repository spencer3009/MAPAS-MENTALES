"""
Email Service for Mindora
Handles email verification and transactional emails using Resend
"""

import os
import asyncio
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional
import resend

logger = logging.getLogger(__name__)

# Configurar Resend
resend.api_key = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
SENDER_NAME = "Mindora"  # Nombre visible del remitente
APP_URL = os.environ.get("APP_URL", "")

# Logo de Mindora (URL pública)
LOGO_URL = "https://customer-assets.emergentagent.com/job_c7c9b123-4484-446c-b0cd-4986b2bb2189/artifacts/hk2d8hgn_MINDORA%20TRANSPARENTE.png"

def get_app_url():
    """Obtiene la URL de la aplicación"""
    return os.environ.get("APP_URL", "http://localhost:3000")


def get_sender():
    """Retorna el remitente con nombre visible"""
    return f"{SENDER_NAME} <{SENDER_EMAIL}>"


def generate_verification_token() -> str:
    """Genera un token único para verificación de email"""
    return secrets.token_urlsafe(32)


def get_token_expiry() -> str:
    """Retorna la fecha de expiración del token (24 horas)"""
    expiry = datetime.now(timezone.utc) + timedelta(hours=24)
    return expiry.isoformat()


def is_token_expired(expiry_date: str) -> bool:
    """Verifica si el token ha expirado"""
    try:
        expiry = datetime.fromisoformat(expiry_date.replace('Z', '+00:00'))
        return datetime.now(timezone.utc) > expiry
    except:
        return True


async def send_verification_email(
    recipient_email: str,
    recipient_name: str,
    verification_token: str
) -> dict:
    """
    Envía el correo de verificación de cuenta
    """
    app_url = get_app_url()
    verification_link = f"{app_url}/verify?token={verification_token}"
    
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
                        <!-- Header con Logo -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%); padding: 40px 40px 30px; text-align: center;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center">
                                            <img src="{LOGO_URL}" alt="Mindora" style="height: 50px; width: auto;" />
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                        <!-- Body -->
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 24px; font-weight: 600;">
                                    ¡Bienvenido/a, {recipient_name}! 👋
                                </h2>
                                
                                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
                                    Gracias por registrarte en <strong>Mindora</strong>. Para comenzar a organizar tus ideas 
                                    y potenciar tu creatividad, necesitamos verificar tu dirección de correo electrónico.
                                </p>
                                
                                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                                    Haz clic en el botón de abajo para confirmar tu cuenta:
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
                                                ✓ Verificar mi cuenta
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0; text-align: center;">
                                    Este enlace expira en <strong>24 horas</strong>.
                                </p>
                                
                                <!-- Alternative Link -->
                                <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-top: 30px;">
                                    <p style="color: #6b7280; font-size: 13px; margin: 0 0 10px;">
                                        Si el botón no funciona, copia y pega este enlace en tu navegador:
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
                                    Si no creaste esta cuenta, puedes ignorar este correo.
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
    
    params = {
        "from": get_sender(),
        "to": [recipient_email],
        "subject": "✓ Verifica tu cuenta de Mindora",
        "html": html_content
    }
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"📧 Email de verificación enviado a {recipient_email}")
        return {
            "success": True,
            "email_id": email.get("id"),
            "message": f"Email enviado a {recipient_email}"
        }
    except Exception as e:
        logger.error(f"❌ Error enviando email de verificación: {e}")
        return {
            "success": False,
            "error": str(e),
            "message": "Error enviando email"
        }


async def send_password_reset_email(
    recipient_email: str,
    recipient_name: str,
    reset_token: str
) -> dict:
    """
    Envía el correo de restablecimiento de contraseña
    """
    app_url = get_app_url()
    reset_link = f"{app_url}/reset-password?token={reset_token}"
    
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
                        <!-- Header con Logo -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%); padding: 40px 40px 30px; text-align: center;">
                                <img src="{LOGO_URL}" alt="Mindora" style="height: 50px; width: auto;" />
                            </td>
                        </tr>
                        
                        <!-- Body -->
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 24px;">
                                    Restablecer contraseña 🔐
                                </h2>
                                
                                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
                                    Hola <strong>{recipient_name}</strong>, recibimos una solicitud para restablecer 
                                    la contraseña de tu cuenta en Mindora.
                                </p>
                                
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center">
                                            <a href="{reset_link}" 
                                               style="display: inline-block; background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%); 
                                                      color: #ffffff; text-decoration: none; padding: 16px 40px; 
                                                      border-radius: 10px; font-size: 16px; font-weight: 600;
                                                      box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
                                                🔑 Restablecer contraseña
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style="color: #6b7280; font-size: 14px; margin: 30px 0 0; text-align: center;">
                                    Este enlace expira en <strong>1 hora</strong>.
                                </p>
                                
                                <div style="background-color: #fef3c7; border-radius: 8px; padding: 15px; margin-top: 25px;">
                                    <p style="color: #92400e; font-size: 13px; margin: 0;">
                                        ⚠️ Si no solicitaste este cambio, ignora este correo. Tu contraseña seguirá siendo la misma.
                                    </p>
                                </div>
                                
                                <!-- Alternative Link -->
                                <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-top: 25px;">
                                    <p style="color: #6b7280; font-size: 13px; margin: 0 0 10px;">
                                        Si el botón no funciona, copia y pega este enlace:
                                    </p>
                                    <p style="color: #3B82F6; font-size: 12px; word-break: break-all; margin: 0;">
                                        {reset_link}
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
    
    params = {
        "from": get_sender(),
        "to": [recipient_email],
        "subject": "🔐 Restablecer contraseña - Mindora",
        "html": html_content
    }
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"📧 Email de reset enviado a {recipient_email}")
        return {"success": True, "email_id": email.get("id")}
    except Exception as e:
        logger.error(f"❌ Error enviando email de reset: {e}")
        return {"success": False, "error": str(e)}


async def send_welcome_email(
    recipient_email: str,
    recipient_name: str
) -> dict:
    """
    Envía email de bienvenida después de verificar la cuenta
    """
    app_url = get_app_url()
    
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
                        <!-- Header con Logo -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #10B981 0%, #3B82F6 100%); padding: 40px; text-align: center;">
                                <img src="{LOGO_URL}" alt="Mindora" style="height: 50px; width: auto; margin-bottom: 20px;" />
                                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">🎉 ¡Cuenta verificada!</h1>
                            </td>
                        </tr>
                        
                        <!-- Body -->
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 24px;">
                                    ¡Bienvenido/a a Mindora, {recipient_name}!
                                </h2>
                                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
                                    Tu cuenta ha sido verificada exitosamente. Ahora puedes disfrutar de todas 
                                    las funcionalidades de Mindora para organizar tus ideas y potenciar tu creatividad.
                                </p>
                                
                                <!-- Features -->
                                <div style="background-color: #f0f9ff; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
                                    <p style="color: #0369a1; font-size: 14px; font-weight: 600; margin: 0 0 15px;">
                                        🚀 ¿Qué puedes hacer en Mindora?
                                    </p>
                                    <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                                        <li>Crear mapas mentales intuitivos</li>
                                        <li>Organizar tus proyectos con tableros</li>
                                        <li>Gestionar tus contactos y clientes</li>
                                        <li>Colaborar en tiempo real</li>
                                    </ul>
                                </div>
                                
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center">
                                            <a href="{app_url}" 
                                               style="display: inline-block; background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%); 
                                                      color: #ffffff; text-decoration: none; padding: 16px 40px; 
                                                      border-radius: 10px; font-size: 16px; font-weight: 600;
                                                      box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
                                                🚀 Comenzar a crear
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9fafb; padding: 25px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                                <p style="color: #9ca3af; font-size: 13px; margin: 0 0 10px;">
                                    ¿Tienes preguntas? Responde a este correo y te ayudaremos.
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
    
    params = {
        "from": get_sender(),
        "to": [recipient_email],
        "subject": "🎉 ¡Bienvenido/a a Mindora!",
        "html": html_content
    }
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"📧 Email de bienvenida enviado a {recipient_email}")
        return {"success": True, "email_id": email.get("id")}
    except Exception as e:
        logger.error(f"❌ Error enviando welcome email: {e}")
        return {"success": False, "error": str(e)}

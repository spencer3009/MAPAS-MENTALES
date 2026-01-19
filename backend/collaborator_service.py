"""
Collaborator Service - Sistema de Colaboradores por Empresa
Gestiona invitaciones, roles y permisos de colaboradores en empresas.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, timezone
from enum import Enum
import uuid


# ==========================================
# ENUMS Y CONSTANTES
# ==========================================

class CompanyRole(str, Enum):
    """Roles disponibles para colaboradores de empresa"""
    OWNER = "owner"                    # Propietario - acceso total
    ADMIN = "admin"                    # Administrador - casi todo excepto eliminar empresa
    COLLABORATOR = "collaborator"      # Colaborador operativo - acceso limitado

class InvitationStatus(str, Enum):
    """Estados de invitación"""
    PENDING = "pending"      # Esperando respuesta
    ACCEPTED = "accepted"    # Aceptada
    REJECTED = "rejected"    # Rechazada
    EXPIRED = "expired"      # Expirada
    REVOKED = "revoked"      # Revocada por el propietario


# Permisos por rol
ROLE_PERMISSIONS = {
    CompanyRole.OWNER: {
        "view_finances": True,
        "edit_finances": True,
        "view_contacts": True,
        "edit_contacts": True,
        "view_boards": True,
        "edit_boards": True,
        "view_collaborators": True,
        "manage_collaborators": True,  # Invitar, cambiar roles, revocar
        "edit_company": True,
        "delete_company": True,
    },
    CompanyRole.ADMIN: {
        "view_finances": True,
        "edit_finances": True,
        "view_contacts": True,
        "edit_contacts": True,
        "view_boards": True,
        "edit_boards": True,
        "view_collaborators": True,
        "manage_collaborators": True,
        "edit_company": True,
        "delete_company": False,  # No puede eliminar empresa
    },
    CompanyRole.COLLABORATOR: {
        "view_finances": True,
        "edit_finances": True,
        "view_contacts": True,
        "edit_contacts": True,
        "view_boards": True,
        "edit_boards": True,
        "view_collaborators": True,
        "manage_collaborators": False,  # No puede gestionar colaboradores
        "edit_company": False,
        "delete_company": False,
    },
}

# Límite de colaboradores por plan
PLAN_COLLABORATOR_LIMITS = {
    "free": 0,           # Sin colaboradores
    "personal": 3,       # Hasta 3 colaboradores
    "team": 10,          # Hasta 10 colaboradores
    "business": -1,      # Sin límite
    "admin": -1,         # Sin límite
}


# ==========================================
# PYDANTIC MODELS - COLABORADORES
# ==========================================

class CollaboratorInvite(BaseModel):
    """Modelo para invitar a un colaborador"""
    email: str = Field(..., description="Email del colaborador a invitar")
    role: Literal["admin", "collaborator"] = Field(
        default="collaborator", 
        description="Rol a asignar al colaborador"
    )
    message: Optional[str] = Field(
        None, 
        max_length=500,
        description="Mensaje personalizado para la invitación"
    )

class CollaboratorRoleUpdate(BaseModel):
    """Modelo para actualizar el rol de un colaborador"""
    role: Literal["admin", "collaborator"] = Field(
        ..., 
        description="Nuevo rol para el colaborador"
    )

class CollaboratorResponse(BaseModel):
    """Respuesta con datos del colaborador"""
    id: str
    user_id: str
    username: str
    email: str
    full_name: str
    role: str
    joined_at: str
    invited_by: str

class InvitationResponse(BaseModel):
    """Respuesta con datos de invitación"""
    id: str
    company_id: str
    company_name: str
    email: str
    role: str
    status: str
    invited_by_username: str
    invited_by_name: str
    message: Optional[str]
    created_at: str
    expires_at: str

class CompanyAccessInfo(BaseModel):
    """Información de acceso del usuario a una empresa"""
    company_id: str
    company_name: str
    role: str
    permissions: dict
    is_owner: bool


# ==========================================
# HELPER FUNCTIONS
# ==========================================

def generate_invitation_id() -> str:
    """Genera un ID único para invitaciones"""
    return f"inv_{uuid.uuid4().hex[:16]}"

def generate_collaborator_id() -> str:
    """Genera un ID único para colaboradores"""
    return f"collab_{uuid.uuid4().hex[:12]}"

def get_current_timestamp() -> str:
    """Obtiene el timestamp actual en formato ISO"""
    return datetime.now(timezone.utc).isoformat()

def get_invitation_expiry(days: int = 7) -> str:
    """Obtiene la fecha de expiración de una invitación"""
    from datetime import timedelta
    expiry = datetime.now(timezone.utc) + timedelta(days=days)
    return expiry.isoformat()

def is_invitation_expired(expires_at: str) -> bool:
    """Verifica si una invitación ha expirado"""
    try:
        expiry = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        return datetime.now(timezone.utc) > expiry
    except:
        return True

def get_role_permissions(role: str) -> dict:
    """Obtiene los permisos para un rol"""
    try:
        role_enum = CompanyRole(role)
        return ROLE_PERMISSIONS.get(role_enum, ROLE_PERMISSIONS[CompanyRole.COLLABORATOR])
    except ValueError:
        return ROLE_PERMISSIONS[CompanyRole.COLLABORATOR]

def has_permission(role: str, permission: str) -> bool:
    """Verifica si un rol tiene un permiso específico"""
    permissions = get_role_permissions(role)
    return permissions.get(permission, False)

def get_collaborator_limit(plan: str) -> int:
    """Obtiene el límite de colaboradores para un plan"""
    return PLAN_COLLABORATOR_LIMITS.get(plan, 0)

def can_add_collaborator(plan: str, current_count: int) -> bool:
    """Verifica si se puede agregar un colaborador según el plan"""
    limit = get_collaborator_limit(plan)
    if limit == -1:  # Sin límite
        return True
    return current_count < limit


# ==========================================
# EMAIL TEMPLATES
# ==========================================

def get_invitation_email_html(
    inviter_name: str,
    company_name: str,
    role: str,
    message: Optional[str],
    app_url: str
) -> str:
    """Genera el HTML del email de invitación"""
    role_display = "Administrador" if role == "admin" else "Colaborador Operativo"
    message_html = f'<p style="color: #4B5563; font-style: italic; background: #F3F4F6; padding: 12px; border-radius: 8px;">"{message}"</p>' if message else ""
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F9FAFB;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #10B981, #059669); border-radius: 12px;">
                        <span style="color: white; font-size: 24px; font-weight: bold;">🤝 Invitación</span>
                    </div>
                </div>
                
                <!-- Content -->
                <h1 style="color: #111827; font-size: 24px; margin-bottom: 16px; text-align: center;">
                    ¡Te han invitado a colaborar!
                </h1>
                
                <p style="color: #4B5563; font-size: 16px; line-height: 1.6; text-align: center;">
                    <strong>{inviter_name}</strong> te ha invitado a unirte a la empresa 
                    <strong style="color: #059669;">{company_name}</strong> en MindoraMap.
                </p>
                
                <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
                    <p style="color: #065F46; margin: 0; font-size: 14px;">Tu rol será:</p>
                    <p style="color: #059669; margin: 8px 0 0 0; font-size: 20px; font-weight: bold;">{role_display}</p>
                </div>
                
                {message_html}
                
                <p style="color: #6B7280; font-size: 14px; text-align: center; margin-top: 24px;">
                    Inicia sesión en MindoraMap para aceptar o rechazar esta invitación.
                </p>
                
                <div style="text-align: center; margin-top: 32px;">
                    <a href="{app_url}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #10B981, #059669); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        Ir a MindoraMap
                    </a>
                </div>
                
                <!-- Footer -->
                <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #E5E7EB; text-align: center;">
                    <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
                        Esta invitación expira en 7 días.<br>
                        Si no esperabas este correo, puedes ignorarlo.
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

def get_invitation_accepted_email_html(
    collaborator_name: str,
    company_name: str,
    role: str,
    app_url: str
) -> str:
    """Genera el HTML del email cuando se acepta una invitación"""
    role_display = "Administrador" if role == "admin" else "Colaborador Operativo"
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F9FAFB;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <div style="text-align: center; margin-bottom: 24px;">
                    <span style="font-size: 48px;">✅</span>
                </div>
                
                <h1 style="color: #111827; font-size: 24px; margin-bottom: 16px; text-align: center;">
                    Invitación Aceptada
                </h1>
                
                <p style="color: #4B5563; font-size: 16px; line-height: 1.6; text-align: center;">
                    <strong>{collaborator_name}</strong> ha aceptado tu invitación para unirse a 
                    <strong style="color: #059669;">{company_name}</strong> como <strong>{role_display}</strong>.
                </p>
                
                <div style="text-align: center; margin-top: 32px;">
                    <a href="{app_url}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #10B981, #059669); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                        Ver Colaboradores
                    </a>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

def get_invitation_rejected_email_html(
    collaborator_name: str,
    company_name: str
) -> str:
    """Genera el HTML del email cuando se rechaza una invitación"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F9FAFB;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <div style="text-align: center; margin-bottom: 24px;">
                    <span style="font-size: 48px;">❌</span>
                </div>
                
                <h1 style="color: #111827; font-size: 24px; margin-bottom: 16px; text-align: center;">
                    Invitación Rechazada
                </h1>
                
                <p style="color: #4B5563; font-size: 16px; line-height: 1.6; text-align: center;">
                    <strong>{collaborator_name}</strong> ha rechazado la invitación para unirse a 
                    <strong>{company_name}</strong>.
                </p>
                
                <p style="color: #6B7280; font-size: 14px; text-align: center; margin-top: 16px;">
                    Puedes enviar una nueva invitación en cualquier momento.
                </p>
            </div>
        </div>
    </body>
    </html>
    """

def get_role_changed_email_html(
    company_name: str,
    old_role: str,
    new_role: str,
    changed_by: str,
    app_url: str
) -> str:
    """Genera el HTML del email cuando cambia el rol"""
    old_role_display = "Administrador" if old_role == "admin" else "Colaborador Operativo"
    new_role_display = "Administrador" if new_role == "admin" else "Colaborador Operativo"
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F9FAFB;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <div style="text-align: center; margin-bottom: 24px;">
                    <span style="font-size: 48px;">🔄</span>
                </div>
                
                <h1 style="color: #111827; font-size: 24px; margin-bottom: 16px; text-align: center;">
                    Tu rol ha cambiado
                </h1>
                
                <p style="color: #4B5563; font-size: 16px; line-height: 1.6; text-align: center;">
                    <strong>{changed_by}</strong> ha cambiado tu rol en <strong style="color: #059669;">{company_name}</strong>.
                </p>
                
                <div style="display: flex; justify-content: center; align-items: center; gap: 16px; margin: 24px 0;">
                    <div style="background: #FEE2E2; padding: 12px 20px; border-radius: 8px;">
                        <span style="color: #991B1B; font-size: 14px;">{old_role_display}</span>
                    </div>
                    <span style="font-size: 24px;">→</span>
                    <div style="background: #D1FAE5; padding: 12px 20px; border-radius: 8px;">
                        <span style="color: #065F46; font-size: 14px; font-weight: bold;">{new_role_display}</span>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 32px;">
                    <a href="{app_url}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #10B981, #059669); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                        Ir a MindoraMap
                    </a>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

def get_access_revoked_email_html(
    company_name: str,
    revoked_by: str
) -> str:
    """Genera el HTML del email cuando se revoca acceso"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F9FAFB;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <div style="text-align: center; margin-bottom: 24px;">
                    <span style="font-size: 48px;">🚫</span>
                </div>
                
                <h1 style="color: #111827; font-size: 24px; margin-bottom: 16px; text-align: center;">
                    Acceso Revocado
                </h1>
                
                <p style="color: #4B5563; font-size: 16px; line-height: 1.6; text-align: center;">
                    <strong>{revoked_by}</strong> ha revocado tu acceso a la empresa 
                    <strong>{company_name}</strong>.
                </p>
                
                <p style="color: #6B7280; font-size: 14px; text-align: center; margin-top: 16px;">
                    Ya no podrás acceder a los datos de esta empresa.
                </p>
            </div>
        </div>
    </body>
    </html>
    """

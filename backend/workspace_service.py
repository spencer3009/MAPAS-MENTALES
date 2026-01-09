"""
Workspace & Sharing Service
Sistema de colaboración multi-usuario para Mindora
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
import uuid
import secrets

# ==========================================
# MODELOS DE DATOS
# ==========================================

# Roles de workspace
WORKSPACE_ROLES = {
    "owner": {
        "level": 100,
        "can_delete_workspace": True,
        "can_manage_billing": True,
        "can_invite": True,
        "can_remove_members": True,
        "can_change_roles": True,
        "can_edit": True,
        "can_view": True
    },
    "admin": {
        "level": 75,
        "can_delete_workspace": False,
        "can_manage_billing": False,
        "can_invite": True,
        "can_remove_members": True,
        "can_change_roles": True,
        "can_edit": True,
        "can_view": True
    },
    "member": {
        "level": 50,
        "can_delete_workspace": False,
        "can_manage_billing": False,
        "can_invite": False,
        "can_remove_members": False,
        "can_change_roles": False,
        "can_edit": True,
        "can_view": True
    },
    "viewer": {
        "level": 25,
        "can_delete_workspace": False,
        "can_manage_billing": False,
        "can_invite": False,
        "can_remove_members": False,
        "can_change_roles": False,
        "can_edit": False,
        "can_view": True
    }
}

# Roles de recurso (para compartir individual)
RESOURCE_ROLES = {
    "admin": {
        "level": 75,
        "can_share": True,
        "can_edit": True,
        "can_comment": True,
        "can_view": True
    },
    "editor": {
        "level": 50,
        "can_share": False,
        "can_edit": True,
        "can_comment": True,
        "can_view": True
    },
    "commenter": {
        "level": 25,
        "can_share": False,
        "can_edit": False,
        "can_comment": True,
        "can_view": True
    },
    "viewer": {
        "level": 10,
        "can_share": False,
        "can_edit": False,
        "can_comment": False,
        "can_view": True
    }
}

# Tipos de recursos compartibles
RESOURCE_TYPES = ["mindmap", "board", "contacts", "reminders"]

# ==========================================
# FUNCIONES DE WORKSPACE
# ==========================================

def generate_workspace_id() -> str:
    """Generar ID único para workspace"""
    return f"ws_{uuid.uuid4().hex[:12]}"

def generate_invite_token() -> str:
    """Generar token seguro para invitación"""
    return secrets.token_urlsafe(32)

def generate_share_token() -> str:
    """Generar token para link compartido"""
    return secrets.token_urlsafe(24)

async def create_personal_workspace(db, username: str, user_email: str, user_full_name: str) -> dict:
    """
    Crear workspace personal automático para un usuario nuevo
    """
    workspace_id = generate_workspace_id()
    now = datetime.now(timezone.utc).isoformat()
    
    workspace = {
        "id": workspace_id,
        "name": f"Espacio de {user_full_name or username}",
        "description": "Tu espacio personal de trabajo",
        "type": "personal",  # personal | team | business
        "owner_username": username,
        "created_at": now,
        "updated_at": now,
        "settings": {
            "default_sharing": "private",  # private | workspace | public
            "allow_public_links": True
        }
    }
    
    # Insertar workspace
    await db.workspaces.insert_one(workspace)
    workspace.pop("_id", None)
    
    # Agregar al usuario como owner
    member = {
        "id": f"wm_{uuid.uuid4().hex[:12]}",
        "workspace_id": workspace_id,
        "username": username,
        "email": user_email,
        "role": "owner",
        "joined_at": now,
        "invited_by": None
    }
    await db.workspace_members.insert_one(member)
    
    return workspace

async def get_user_workspaces(db, username: str) -> List[dict]:
    """
    Obtener todos los workspaces de un usuario
    """
    # Buscar membresías del usuario
    memberships = await db.workspace_members.find(
        {"username": username},
        {"_id": 0}
    ).to_list(100)
    
    workspace_ids = [m["workspace_id"] for m in memberships]
    
    # Obtener workspaces
    workspaces = await db.workspaces.find(
        {"id": {"$in": workspace_ids}},
        {"_id": 0}
    ).to_list(100)
    
    # Agregar rol del usuario a cada workspace
    membership_map = {m["workspace_id"]: m["role"] for m in memberships}
    for ws in workspaces:
        ws["user_role"] = membership_map.get(ws["id"], "viewer")
    
    return workspaces

async def get_workspace_members(db, workspace_id: str) -> List[dict]:
    """
    Obtener miembros de un workspace
    """
    members = await db.workspace_members.find(
        {"workspace_id": workspace_id},
        {"_id": 0}
    ).to_list(100)
    
    return members

async def ensure_user_has_workspace(db, username: str, user_email: str, user_full_name: str) -> dict:
    """
    Asegurar que el usuario tenga un workspace personal
    Si no lo tiene, crearlo
    """
    # Buscar workspace personal existente
    membership = await db.workspace_members.find_one(
        {"username": username, "role": "owner"},
        {"_id": 0}
    )
    
    if membership:
        workspace = await db.workspaces.find_one(
            {"id": membership["workspace_id"], "type": "personal"},
            {"_id": 0}
        )
        if workspace:
            return workspace
    
    # Crear workspace personal
    return await create_personal_workspace(db, username, user_email, user_full_name)

# ==========================================
# FUNCIONES DE PERMISOS
# ==========================================

async def get_resource_permissions(db, resource_type: str, resource_id: str) -> List[dict]:
    """
    Obtener todos los permisos de un recurso
    """
    permissions = await db.resource_permissions.find(
        {"resource_type": resource_type, "resource_id": resource_id},
        {"_id": 0}
    ).to_list(100)
    
    return permissions

async def check_resource_permission(
    db, 
    username: str, 
    resource_type: str, 
    resource_id: str, 
    action: str  # 'view', 'edit', 'comment', 'share', 'delete'
) -> bool:
    """
    Verificar si un usuario tiene permiso para una acción en un recurso
    
    Orden de verificación:
    1. Si es el owner del recurso → tiene todos los permisos
    2. Si tiene permiso directo sobre el recurso → verificar rol
    3. Si el recurso pertenece a un workspace donde el usuario es miembro → verificar rol
    """
    # 1. Verificar si es owner del recurso
    resource = None
    if resource_type == "mindmap":
        resource = await db.projects.find_one({"project_id": resource_id}, {"_id": 0})
        if resource and resource.get("username") == username:
            return True
    elif resource_type == "board":
        resource = await db.boards.find_one({"id": resource_id}, {"_id": 0})
        if resource and resource.get("owner_username") == username:
            return True
    elif resource_type == "contacts":
        # Los contactos pertenecen al usuario
        resource = await db.contacts.find_one({"id": resource_id}, {"_id": 0})
        if resource and resource.get("username") == username:
            return True
    
    # 2. Verificar permiso directo
    permission = await db.resource_permissions.find_one(
        {
            "resource_type": resource_type,
            "resource_id": resource_id,
            "principal_type": "user",
            "principal_id": username
        },
        {"_id": 0}
    )
    
    if permission:
        role = permission.get("role", "viewer")
        role_permissions = RESOURCE_ROLES.get(role, RESOURCE_ROLES["viewer"])
        
        action_map = {
            "view": "can_view",
            "edit": "can_edit",
            "comment": "can_comment",
            "share": "can_share",
            "delete": "can_edit"  # Solo editores pueden eliminar
        }
        
        return role_permissions.get(action_map.get(action, "can_view"), False)
    
    # 3. Verificar a través de workspace
    if resource:
        workspace_id = resource.get("workspace_id")
        if workspace_id:
            membership = await db.workspace_members.find_one(
                {"workspace_id": workspace_id, "username": username},
                {"_id": 0}
            )
            
            if membership:
                ws_role = membership.get("role", "viewer")
                ws_permissions = WORKSPACE_ROLES.get(ws_role, WORKSPACE_ROLES["viewer"])
                
                if action in ["view"]:
                    return ws_permissions.get("can_view", False)
                elif action in ["edit", "delete"]:
                    return ws_permissions.get("can_edit", False)
    
    return False

async def grant_resource_permission(
    db,
    resource_type: str,
    resource_id: str,
    principal_type: str,  # 'user', 'invite', 'link'
    principal_id: str,  # username, invite_id, or link_token
    role: str,  # 'viewer', 'commenter', 'editor', 'admin'
    granted_by: str
) -> dict:
    """
    Otorgar permiso a un recurso
    """
    now = datetime.now(timezone.utc).isoformat()
    
    permission_id = f"perm_{uuid.uuid4().hex[:12]}"
    
    permission = {
        "id": permission_id,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "principal_type": principal_type,
        "principal_id": principal_id,
        "role": role,
        "granted_by": granted_by,
        "created_at": now,
        "updated_at": now
    }
    
    # Upsert - actualizar si ya existe
    await db.resource_permissions.update_one(
        {
            "resource_type": resource_type,
            "resource_id": resource_id,
            "principal_type": principal_type,
            "principal_id": principal_id
        },
        {"$set": permission},
        upsert=True
    )
    
    return permission

async def revoke_resource_permission(
    db,
    resource_type: str,
    resource_id: str,
    principal_type: str,
    principal_id: str
) -> bool:
    """
    Revocar permiso de un recurso
    """
    result = await db.resource_permissions.delete_one({
        "resource_type": resource_type,
        "resource_id": resource_id,
        "principal_type": principal_type,
        "principal_id": principal_id
    })
    
    return result.deleted_count > 0

# ==========================================
# FUNCIONES DE INVITACIÓN
# ==========================================

async def create_invite(
    db,
    email: str,
    resource_type: str,
    resource_id: str,
    role: str,
    invited_by: str,
    workspace_id: Optional[str] = None
) -> dict:
    """
    Crear invitación por email
    """
    now = datetime.now(timezone.utc)
    invite_id = f"inv_{uuid.uuid4().hex[:12]}"
    token = generate_invite_token()
    
    invite = {
        "id": invite_id,
        "email": email.lower().strip(),
        "resource_type": resource_type,
        "resource_id": resource_id,
        "workspace_id": workspace_id,
        "role": role,
        "token": token,
        "status": "pending",  # pending, accepted, expired, cancelled
        "invited_by": invited_by,
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(days=7)).isoformat()
    }
    
    await db.invites.insert_one(invite)
    
    # Retornar sin _id
    invite.pop("_id", None)
    return invite

async def accept_invite(db, token: str, username: str) -> dict:
    """
    Aceptar una invitación
    """
    now = datetime.now(timezone.utc)
    
    # Buscar invitación
    invite = await db.invites.find_one({"token": token}, {"_id": 0})
    
    if not invite:
        return {"success": False, "error": "Invitación no encontrada"}
    
    if invite["status"] != "pending":
        return {"success": False, "error": "Esta invitación ya fue utilizada"}
    
    # Verificar expiración
    expires_at = datetime.fromisoformat(invite["expires_at"].replace("Z", "+00:00"))
    if expires_at < now:
        await db.invites.update_one(
            {"id": invite["id"]},
            {"$set": {"status": "expired"}}
        )
        return {"success": False, "error": "La invitación ha expirado"}
    
    # Crear permiso
    await grant_resource_permission(
        db,
        invite["resource_type"],
        invite["resource_id"],
        "user",
        username,
        invite["role"],
        invite["invited_by"]
    )
    
    # Marcar invitación como aceptada
    await db.invites.update_one(
        {"id": invite["id"]},
        {
            "$set": {
                "status": "accepted",
                "accepted_by": username,
                "accepted_at": now.isoformat()
            }
        }
    )
    
    return {
        "success": True,
        "resource_type": invite["resource_type"],
        "resource_id": invite["resource_id"],
        "role": invite["role"]
    }

async def get_pending_invites_for_email(db, email: str) -> List[dict]:
    """
    Obtener invitaciones pendientes para un email
    """
    invites = await db.invites.find(
        {
            "email": email.lower().strip(),
            "status": "pending"
        },
        {"_id": 0}
    ).to_list(100)
    
    return invites

# ==========================================
# FUNCIONES DE LINK COMPARTIDO
# ==========================================

async def create_share_link(
    db,
    resource_type: str,
    resource_id: str,
    role: str,  # 'viewer', 'commenter', 'editor'
    created_by: str,
    expires_in_days: Optional[int] = None
) -> dict:
    """
    Crear link de acceso público
    """
    now = datetime.now(timezone.utc)
    link_id = f"link_{uuid.uuid4().hex[:12]}"
    token = generate_share_token()
    
    share_link = {
        "id": link_id,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "token": token,
        "role": role,
        "is_active": True,
        "created_by": created_by,
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(days=expires_in_days)).isoformat() if expires_in_days else None,
        "access_count": 0
    }
    
    await db.share_links.insert_one(share_link)
    
    # Retornar sin _id
    share_link.pop("_id", None)
    return share_link

async def get_share_link(db, token: str) -> Optional[dict]:
    """
    Obtener información de un link compartido
    """
    link = await db.share_links.find_one({"token": token}, {"_id": 0})
    
    if not link or not link.get("is_active"):
        return None
    
    # Verificar expiración
    if link.get("expires_at"):
        expires_at = datetime.fromisoformat(link["expires_at"].replace("Z", "+00:00"))
        if expires_at < datetime.now(timezone.utc):
            return None
    
    # Incrementar contador
    await db.share_links.update_one(
        {"id": link["id"]},
        {"$inc": {"access_count": 1}}
    )
    
    return link

async def toggle_share_link(db, resource_type: str, resource_id: str, is_active: bool) -> bool:
    """
    Activar/desactivar link compartido
    """
    result = await db.share_links.update_one(
        {"resource_type": resource_type, "resource_id": resource_id},
        {"$set": {"is_active": is_active}}
    )
    
    return result.modified_count > 0

async def get_resource_share_link(db, resource_type: str, resource_id: str) -> Optional[dict]:
    """
    Obtener el link compartido de un recurso (si existe)
    """
    link = await db.share_links.find_one(
        {"resource_type": resource_type, "resource_id": resource_id},
        {"_id": 0}
    )
    
    return link

# ==========================================
# FUNCIONES DE COLABORADORES
# ==========================================

async def get_resource_collaborators(db, resource_type: str, resource_id: str) -> List[dict]:
    """
    Obtener lista de colaboradores de un recurso
    """
    permissions = await db.resource_permissions.find(
        {
            "resource_type": resource_type,
            "resource_id": resource_id,
            "principal_type": "user"
        },
        {"_id": 0}
    ).to_list(100)
    
    # Enriquecer con datos del usuario
    collaborators = []
    for perm in permissions:
        user = await db.users.find_one(
            {"username": perm["principal_id"]},
            {"_id": 0, "username": 1, "email": 1, "full_name": 1, "picture": 1}
        )
        
        if user:
            collaborators.append({
                "username": user.get("username"),
                "email": user.get("email"),
                "full_name": user.get("full_name", user.get("username")),
                "picture": user.get("picture"),
                "role": perm.get("role"),
                "granted_at": perm.get("created_at"),
                "granted_by": perm.get("granted_by")
            })
    
    # También incluir invitaciones pendientes
    pending_invites = await db.invites.find(
        {
            "resource_type": resource_type,
            "resource_id": resource_id,
            "status": "pending"
        },
        {"_id": 0}
    ).to_list(100)
    
    for invite in pending_invites:
        collaborators.append({
            "email": invite.get("email"),
            "role": invite.get("role"),
            "status": "pending",
            "invited_at": invite.get("created_at"),
            "invited_by": invite.get("invited_by")
        })
    
    return collaborators

async def update_collaborator_role(
    db,
    resource_type: str,
    resource_id: str,
    username: str,
    new_role: str,
    updated_by: str
) -> bool:
    """
    Actualizar rol de un colaborador
    """
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.resource_permissions.update_one(
        {
            "resource_type": resource_type,
            "resource_id": resource_id,
            "principal_type": "user",
            "principal_id": username
        },
        {
            "$set": {
                "role": new_role,
                "updated_at": now,
                "updated_by": updated_by
            }
        }
    )
    
    return result.modified_count > 0

async def remove_collaborator(
    db,
    resource_type: str,
    resource_id: str,
    username: str
) -> bool:
    """
    Remover colaborador de un recurso
    """
    result = await db.resource_permissions.delete_one({
        "resource_type": resource_type,
        "resource_id": resource_id,
        "principal_type": "user",
        "principal_id": username
    })
    
    return result.deleted_count > 0

# ==========================================
# MIGRACIÓN: ASIGNAR RECURSOS EXISTENTES
# ==========================================

async def migrate_user_resources_to_workspace(db, username: str, workspace_id: str):
    """
    Migrar recursos existentes de un usuario a su workspace personal
    """
    now = datetime.now(timezone.utc).isoformat()
    
    # Migrar mapas mentales
    await db.projects.update_many(
        {"username": username, "workspace_id": {"$exists": False}},
        {"$set": {"workspace_id": workspace_id, "updated_at": now}}
    )
    
    # Migrar tableros
    await db.boards.update_many(
        {"owner_username": username, "workspace_id": {"$exists": False}},
        {"$set": {"workspace_id": workspace_id, "updated_at": now}}
    )
    
    # Migrar contactos
    await db.contacts.update_many(
        {"username": username, "workspace_id": {"$exists": False}},
        {"$set": {"workspace_id": workspace_id, "updated_at": now}}
    )
    
    # Migrar recordatorios
    await db.reminders.update_many(
        {"username": username, "workspace_id": {"$exists": False}},
        {"$set": {"workspace_id": workspace_id, "updated_at": now}}
    )

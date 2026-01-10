"""
Activity & Notification Service for Mindora
Sistema de registro de actividad y notificaciones por email
"""

import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from enum import Enum

# ==========================================
# CONSTANTES Y ENUMS
# ==========================================

class ActivityAction(str, Enum):
    # Recursos
    CREATED = "created"
    EDITED = "edited"
    DELETED = "deleted"
    RESTORED = "restored"
    DUPLICATED = "duplicated"
    MOVED = "moved"
    
    # Colaboración
    SHARED = "shared"
    UNSHARED = "unshared"
    INVITED = "invited"
    INVITE_ACCEPTED = "invite_accepted"
    INVITE_DECLINED = "invite_declined"
    COLLABORATOR_ADDED = "collaborator_added"
    COLLABORATOR_REMOVED = "collaborator_removed"
    ROLE_CHANGED = "role_changed"
    
    # Comentarios
    COMMENTED = "commented"
    COMMENT_EDITED = "comment_edited"
    COMMENT_DELETED = "comment_deleted"
    MENTIONED = "mentioned"
    
    # Workspace
    WORKSPACE_CREATED = "workspace_created"
    WORKSPACE_JOINED = "workspace_joined"
    WORKSPACE_LEFT = "workspace_left"
    
    # Mind Maps específicos
    NODE_ADDED = "node_added"
    NODE_EDITED = "node_edited"
    NODE_DELETED = "node_deleted"
    
    # Boards específicos
    TASK_CREATED = "task_created"
    TASK_COMPLETED = "task_completed"
    TASK_MOVED = "task_moved"


# Acciones que generan notificaciones por email
EMAIL_WORTHY_ACTIONS = {
    ActivityAction.INVITE_ACCEPTED: {
        "notify_owner": True,
        "subject": "📬 {actor_name} aceptó tu invitación",
        "template": "invite_accepted"
    },
    ActivityAction.COMMENTED: {
        "notify_owner": True,
        "notify_collaborators": True,
        "subject": "💬 {actor_name} comentó en {resource_name}",
        "template": "new_comment"
    },
    ActivityAction.MENTIONED: {
        "notify_mentioned": True,
        "subject": "📢 {actor_name} te mencionó en {resource_name}",
        "template": "mention"
    },
    ActivityAction.COLLABORATOR_ADDED: {
        "notify_added_user": True,
        "subject": "🤝 Te agregaron como colaborador en {resource_name}",
        "template": "collaborator_added"
    },
    ActivityAction.ROLE_CHANGED: {
        "notify_affected_user": True,
        "subject": "🔄 Tu rol cambió en {resource_name}",
        "template": "role_changed"
    },
    ActivityAction.TASK_COMPLETED: {
        "notify_owner": True,
        "subject": "✅ {actor_name} completó una tarea en {resource_name}",
        "template": "task_completed"
    },
    ActivityAction.DELETED: {
        "notify_collaborators": True,
        "subject": "🗑️ {actor_name} eliminó {resource_name}",
        "template": "resource_deleted"
    }
}

# Configuración de preferencias por defecto
DEFAULT_NOTIFICATION_PREFERENCES = {
    "email_enabled": True,
    "email_digest": "instant",  # instant, daily, weekly, none
    "notify_on": {
        "comments": True,
        "mentions": True,
        "invitations": True,
        "permission_changes": True,
        "task_updates": True,
        "resource_changes": False,  # Ediciones menores - off por defecto
        "collaborator_activity": False  # Actividad de otros - off por defecto
    },
    "quiet_hours": {
        "enabled": False,
        "start": "22:00",
        "end": "08:00",
        "timezone": "America/Lima"
    }
}

# Nombres legibles de recursos
RESOURCE_TYPE_NAMES = {
    "mindmap": "mapa mental",
    "board": "tablero",
    "contact": "contacto",
    "reminder": "recordatorio",
    "workspace": "workspace"
}

# Íconos para el feed
ACTION_ICONS = {
    "created": "✨",
    "edited": "✏️",
    "deleted": "🗑️",
    "shared": "🔗",
    "invited": "📧",
    "invite_accepted": "🤝",
    "commented": "💬",
    "mentioned": "📢",
    "collaborator_added": "👥",
    "collaborator_removed": "👤",
    "role_changed": "🔄",
    "task_completed": "✅",
    "task_created": "📝",
    "node_added": "➕",
    "node_edited": "✏️",
    "restored": "♻️"
}


# ==========================================
# FUNCIONES DE LOGGING DE ACTIVIDAD
# ==========================================

async def log_activity(
    db,
    user_id: str,
    action: str,
    resource_type: str,
    resource_id: str,
    resource_name: str,
    workspace_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    target_user_id: Optional[str] = None
) -> dict:
    """
    Registrar una actividad en el sistema.
    Esta es la función principal que debe llamarse desde otros endpoints.
    """
    now = datetime.now(timezone.utc)
    activity_id = f"act_{uuid.uuid4().hex[:12]}"
    
    activity = {
        "id": activity_id,
        "user_id": user_id,  # Quien realizó la acción
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "resource_name": resource_name,
        "workspace_id": workspace_id,
        "target_user_id": target_user_id,  # Usuario afectado (si aplica)
        "metadata": metadata or {},
        "created_at": now.isoformat(),
        "is_read": False
    }
    
    await db.activity_logs.insert_one(activity)
    activity.pop("_id", None)
    
    return activity


async def get_activity_feed(
    db,
    username: str,
    workspace_id: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    include_own_actions: bool = True
) -> List[dict]:
    """
    Obtener feed de actividad para un usuario o workspace.
    """
    # Construir query
    query = {}
    
    if workspace_id:
        query["workspace_id"] = workspace_id
    
    if resource_type:
        query["resource_type"] = resource_type
    
    if resource_id:
        query["resource_id"] = resource_id
    
    if not include_own_actions:
        query["user_id"] = {"$ne": username}
    
    # Si no hay filtros específicos, mostrar actividad relevante al usuario
    if not workspace_id and not resource_id:
        # Obtener workspaces del usuario
        memberships = await db.workspace_members.find(
            {"username": username},
            {"_id": 0, "workspace_id": 1}
        ).to_list(100)
        
        workspace_ids = [m["workspace_id"] for m in memberships]
        
        # Obtener recursos donde el usuario es colaborador
        permissions = await db.resource_permissions.find(
            {"principal_type": "user", "principal_id": username},
            {"_id": 0, "resource_type": 1, "resource_id": 1}
        ).to_list(100)
        
        # Query compuesto: actividad en sus workspaces O en recursos compartidos
        or_conditions = []
        
        if workspace_ids:
            or_conditions.append({"workspace_id": {"$in": workspace_ids}})
        
        for perm in permissions:
            or_conditions.append({
                "resource_type": perm["resource_type"],
                "resource_id": perm["resource_id"]
            })
        
        # También incluir actividad donde el usuario es target
        or_conditions.append({"target_user_id": username})
        
        if or_conditions:
            query["$or"] = or_conditions
    
    # Ejecutar query
    activities = await db.activity_logs.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    
    # Enriquecer con información del usuario
    enriched = []
    user_cache = {}
    
    for activity in activities:
        user_id = activity.get("user_id")
        
        if user_id not in user_cache:
            user = await db.users.find_one(
                {"username": user_id},
                {"_id": 0, "username": 1, "full_name": 1, "picture": 1}
            )
            user_cache[user_id] = user
        
        actor = user_cache.get(user_id)
        
        enriched.append({
            **activity,
            "actor": {
                "username": user_id,
                "full_name": actor.get("full_name", user_id) if actor else user_id,
                "picture": actor.get("picture") if actor else None
            },
            "icon": ACTION_ICONS.get(activity.get("action"), "📌"),
            "human_time": get_human_time(activity.get("created_at"))
        })
    
    return enriched


async def get_resource_activity(
    db,
    resource_type: str,
    resource_id: str,
    limit: int = 20
) -> List[dict]:
    """
    Obtener historial de actividad de un recurso específico.
    """
    return await get_activity_feed(
        db,
        username="",  # No filtrar por usuario
        resource_type=resource_type,
        resource_id=resource_id,
        limit=limit,
        include_own_actions=True
    )


async def mark_activities_as_read(
    db,
    username: str,
    activity_ids: Optional[List[str]] = None
) -> int:
    """
    Marcar actividades como leídas.
    Si no se especifican IDs, marca todas las del usuario.
    """
    query = {"target_user_id": username, "is_read": False}
    
    if activity_ids:
        query["id"] = {"$in": activity_ids}
    
    result = await db.activity_logs.update_many(
        query,
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return result.modified_count


async def get_unread_count(db, username: str) -> int:
    """
    Obtener cantidad de actividades no leídas para un usuario.
    """
    return await db.activity_logs.count_documents({
        "target_user_id": username,
        "is_read": False
    })


# ==========================================
# FUNCIONES DE PREFERENCIAS DE NOTIFICACIÓN
# ==========================================

async def get_notification_preferences(db, username: str) -> dict:
    """
    Obtener preferencias de notificación del usuario.
    """
    prefs = await db.notification_preferences.find_one(
        {"username": username},
        {"_id": 0}
    )
    
    if not prefs:
        # Retornar defaults
        return {
            "username": username,
            **DEFAULT_NOTIFICATION_PREFERENCES
        }
    
    return prefs


async def update_notification_preferences(
    db,
    username: str,
    preferences: dict
) -> dict:
    """
    Actualizar preferencias de notificación del usuario.
    """
    now = datetime.now(timezone.utc).isoformat()
    
    # Merge con defaults para asegurar estructura completa
    current = await get_notification_preferences(db, username)
    
    # Actualizar solo los campos proporcionados
    if "email_enabled" in preferences:
        current["email_enabled"] = preferences["email_enabled"]
    
    if "email_digest" in preferences:
        current["email_digest"] = preferences["email_digest"]
    
    if "notify_on" in preferences:
        current["notify_on"] = {**current.get("notify_on", {}), **preferences["notify_on"]}
    
    if "quiet_hours" in preferences:
        current["quiet_hours"] = {**current.get("quiet_hours", {}), **preferences["quiet_hours"]}
    
    current["updated_at"] = now
    
    await db.notification_preferences.update_one(
        {"username": username},
        {"$set": current},
        upsert=True
    )
    
    return current


async def should_send_email(
    db,
    username: str,
    action: str
) -> bool:
    """
    Determinar si se debe enviar email basado en preferencias del usuario.
    """
    prefs = await get_notification_preferences(db, username)
    
    # Si emails deshabilitados globalmente
    if not prefs.get("email_enabled", True):
        return False
    
    # Si está en digest mode (no instant)
    if prefs.get("email_digest") != "instant":
        return False
    
    # Verificar quiet hours
    quiet = prefs.get("quiet_hours", {})
    if quiet.get("enabled"):
        # TODO: Implementar lógica de quiet hours con timezone
        pass
    
    # Mapear acción a categoría de preferencia
    action_to_pref = {
        "commented": "comments",
        "comment_edited": "comments",
        "mentioned": "mentions",
        "invited": "invitations",
        "invite_accepted": "invitations",
        "collaborator_added": "permission_changes",
        "collaborator_removed": "permission_changes",
        "role_changed": "permission_changes",
        "task_created": "task_updates",
        "task_completed": "task_updates",
        "task_moved": "task_updates",
        "edited": "resource_changes",
        "created": "resource_changes",
        "deleted": "resource_changes"
    }
    
    pref_key = action_to_pref.get(action, "resource_changes")
    notify_on = prefs.get("notify_on", {})
    
    return notify_on.get(pref_key, False)


# ==========================================
# FUNCIONES DE ENVÍO DE NOTIFICACIONES
# ==========================================

async def process_activity_notification(
    db,
    activity: dict,
    send_email_func
) -> None:
    """
    Procesar una actividad y enviar notificaciones si corresponde.
    """
    action = activity.get("action")
    
    # Verificar si esta acción genera emails
    if action not in EMAIL_WORTHY_ACTIONS:
        return
    
    config = EMAIL_WORTHY_ACTIONS[action]
    actor_id = activity.get("user_id")
    resource_name = activity.get("resource_name", "recurso")
    resource_type = activity.get("resource_type")
    resource_id = activity.get("resource_id")
    
    # Obtener info del actor
    actor = await db.users.find_one(
        {"username": actor_id},
        {"_id": 0, "full_name": 1}
    )
    actor_name = actor.get("full_name", actor_id) if actor else actor_id
    
    recipients = set()
    
    # Determinar destinatarios según configuración
    if config.get("notify_owner"):
        owner = await get_resource_owner(db, resource_type, resource_id)
        if owner and owner != actor_id:
            recipients.add(owner)
    
    if config.get("notify_collaborators"):
        collabs = await get_resource_collaborators_usernames(db, resource_type, resource_id)
        for c in collabs:
            if c != actor_id:
                recipients.add(c)
    
    if config.get("notify_added_user") or config.get("notify_affected_user"):
        target = activity.get("target_user_id")
        if target:
            recipients.add(target)
    
    if config.get("notify_mentioned"):
        mentioned = activity.get("metadata", {}).get("mentioned_users", [])
        recipients.update(mentioned)
    
    # Enviar emails a cada destinatario que tenga habilitada la notificación
    for recipient in recipients:
        should_send = await should_send_email(db, recipient, action)
        
        if should_send:
            user = await db.users.find_one(
                {"username": recipient},
                {"_id": 0, "email": 1}
            )
            
            if user and user.get("email"):
                subject = config["subject"].format(
                    actor_name=actor_name,
                    resource_name=resource_name
                )
                
                await send_email_func(
                    recipient_email=user["email"],
                    subject=subject,
                    template=config["template"],
                    context={
                        "actor_name": actor_name,
                        "resource_name": resource_name,
                        "resource_type": RESOURCE_TYPE_NAMES.get(resource_type, resource_type),
                        "action": action,
                        "metadata": activity.get("metadata", {}),
                        "timestamp": activity.get("created_at")
                    }
                )


async def get_resource_owner(db, resource_type: str, resource_id: str) -> Optional[str]:
    """
    Obtener el owner de un recurso.
    """
    if resource_type == "mindmap":
        resource = await db.projects.find_one(
            {"$or": [{"id": resource_id}, {"project_id": resource_id}]},
            {"_id": 0, "username": 1}
        )
        return resource.get("username") if resource else None
    
    elif resource_type == "board":
        resource = await db.boards.find_one(
            {"id": resource_id},
            {"_id": 0, "owner_username": 1}
        )
        return resource.get("owner_username") if resource else None
    
    return None


async def get_resource_collaborators_usernames(
    db,
    resource_type: str,
    resource_id: str
) -> List[str]:
    """
    Obtener usernames de todos los colaboradores de un recurso.
    """
    permissions = await db.resource_permissions.find(
        {
            "resource_type": resource_type,
            "resource_id": resource_id,
            "principal_type": "user"
        },
        {"_id": 0, "principal_id": 1}
    ).to_list(100)
    
    return [p["principal_id"] for p in permissions]


# ==========================================
# HELPERS
# ==========================================

def get_human_time(iso_timestamp: str) -> str:
    """
    Convertir timestamp ISO a texto legible (hace X minutos/horas/días).
    """
    if not iso_timestamp:
        return ""
    
    try:
        dt = datetime.fromisoformat(iso_timestamp.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        diff = now - dt
        
        seconds = diff.total_seconds()
        
        if seconds < 60:
            return "ahora mismo"
        elif seconds < 3600:
            mins = int(seconds / 60)
            return f"hace {mins} min"
        elif seconds < 86400:
            hours = int(seconds / 3600)
            return f"hace {hours} h"
        elif seconds < 604800:
            days = int(seconds / 86400)
            return f"hace {days} día{'s' if days > 1 else ''}"
        else:
            return dt.strftime("%d %b %Y")
    except:
        return ""


def generate_activity_message(activity: dict) -> str:
    """
    Generar mensaje legible para una actividad.
    """
    action = activity.get("action", "")
    resource_type = activity.get("resource_type", "")
    resource_name = activity.get("resource_name", "")
    metadata = activity.get("metadata", {})
    
    resource_type_name = RESOURCE_TYPE_NAMES.get(resource_type, resource_type)
    
    messages = {
        "created": f"creó el {resource_type_name} «{resource_name}»",
        "edited": f"editó el {resource_type_name} «{resource_name}»",
        "deleted": f"eliminó el {resource_type_name} «{resource_name}»",
        "restored": f"restauró el {resource_type_name} «{resource_name}»",
        "shared": f"compartió el {resource_type_name} «{resource_name}»",
        "invited": f"invitó a {metadata.get('invited_email', 'alguien')} a «{resource_name}»",
        "invite_accepted": f"aceptó la invitación a «{resource_name}»",
        "commented": f"comentó en «{resource_name}»",
        "mentioned": f"te mencionó en «{resource_name}»",
        "collaborator_added": f"agregó a {metadata.get('collaborator_name', 'alguien')} a «{resource_name}»",
        "collaborator_removed": f"removió a {metadata.get('collaborator_name', 'alguien')} de «{resource_name}»",
        "role_changed": f"cambió el rol en «{resource_name}» a {metadata.get('new_role', '')}",
        "node_added": f"agregó un nodo en «{resource_name}»",
        "node_edited": f"editó un nodo en «{resource_name}»",
        "task_created": f"creó una tarea en «{resource_name}»",
        "task_completed": f"completó una tarea en «{resource_name}»"
    }
    
    return messages.get(action, f"realizó una acción en «{resource_name}»")

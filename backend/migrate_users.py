"""
Script de migración de usuarios hardcodeados a MongoDB
Ejecutar una sola vez para migrar los usuarios existentes
"""
import asyncio
import os
from datetime import datetime, timezone
from passlib.context import CryptContext
from motor.motor_asyncio import AsyncIOMotorClient
from uuid import uuid4

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Usuarios a migrar
USERS_TO_MIGRATE = [
    {
        "username": "spencer3009",
        "password": "Socios3009",
        "full_name": "Spencer",
        "email": "spencer@mindoramap.com",
        "nombre": "Spencer",
        "apellidos": "",
        "whatsapp": "+1234567890"
    },
    {
        "username": "teresa3009",
        "password": "Socios3009",
        "full_name": "Teresa",
        "email": "teresa@mindoramap.com",
        "nombre": "Teresa",
        "apellidos": "",
        "whatsapp": "+1234567890"
    }
]

async def migrate_users():
    """Migra los usuarios hardcodeados a MongoDB"""
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME', 'mindmap_db')
    
    if not mongo_url:
        print("ERROR: MONGO_URL no está configurado")
        return
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("=" * 50)
    print("MIGRACIÓN DE USUARIOS A MONGODB")
    print("=" * 50)
    
    migrated = 0
    skipped = 0
    
    for user_data in USERS_TO_MIGRATE:
        username = user_data["username"]
        
        # Verificar si el usuario ya existe
        existing = await db.users.find_one({"username": username})
        
        if existing:
            print(f"⏭️  Usuario '{username}' ya existe en la BD - SALTANDO")
            skipped += 1
            continue
        
        # Crear el usuario
        user_id = f"user_{uuid4().hex[:12]}"
        hashed_password = pwd_context.hash(user_data["password"])
        now = datetime.now(timezone.utc).isoformat()
        
        new_user = {
            "user_id": user_id,
            "id": user_id,
            "username": username,
            "email": user_data["email"],
            "hashed_password": hashed_password,
            "full_name": user_data["full_name"],
            "disabled": False,
            "auth_provider": "local",
            "created_at": now,
            "updated_at": now
        }
        
        await db.users.insert_one(new_user)
        print(f"✅ Usuario '{username}' migrado exitosamente (ID: {user_id})")
        
        # Crear perfil del usuario
        user_profile = {
            "username": username,
            "nombre": user_data["nombre"],
            "apellidos": user_data["apellidos"],
            "email": user_data["email"],
            "whatsapp": user_data["whatsapp"],
            "pais": "",
            "timezone": "America/Lima",
            "created_at": now,
            "updated_at": now
        }
        
        # Verificar si ya existe el perfil
        existing_profile = await db.user_profiles.find_one({"username": username})
        if not existing_profile:
            await db.user_profiles.insert_one(user_profile)
            print(f"   ↳ Perfil creado para '{username}'")
        
        migrated += 1
    
    print("=" * 50)
    print(f"MIGRACIÓN COMPLETADA")
    print(f"  - Usuarios migrados: {migrated}")
    print(f"  - Usuarios saltados (ya existían): {skipped}")
    print("=" * 50)
    
    # Verificar usuarios en la BD
    total_users = await db.users.count_documents({})
    print(f"\nTotal de usuarios en la BD: {total_users}")
    
    # Listar usuarios
    print("\nUsuarios en la base de datos:")
    async for user in db.users.find({}, {"_id": 0, "username": 1, "email": 1, "full_name": 1}):
        print(f"  - {user['username']} ({user.get('email', 'N/A')}) - {user.get('full_name', 'N/A')}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate_users())

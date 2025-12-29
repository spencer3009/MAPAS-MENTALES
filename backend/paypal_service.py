"""
PayPal Subscription Service for MindoraMap
Handles recurring subscription payments via PayPal REST API v2
"""

import os
import httpx
import base64
from datetime import datetime, timezone, timedelta
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# PayPal API endpoints
PAYPAL_SANDBOX_API = "https://api-m.sandbox.paypal.com"
PAYPAL_LIVE_API = "https://api-m.paypal.com"

def get_paypal_api_base():
    """Obtiene la URL base de la API según el modo"""
    mode = os.environ.get("PAYPAL_MODE", "sandbox")
    return PAYPAL_SANDBOX_API if mode == "sandbox" else PAYPAL_LIVE_API

def get_auth_header():
    """Genera el header de autenticación Basic para obtener access token"""
    client_id = os.environ.get("PAYPAL_CLIENT_ID", "")
    client_secret = os.environ.get("PAYPAL_SECRET", "")
    credentials = f"{client_id}:{client_secret}"
    encoded = base64.b64encode(credentials.encode()).decode()
    return f"Basic {encoded}"

async def get_access_token() -> Optional[str]:
    """Obtiene un access token de PayPal"""
    api_base = get_paypal_api_base()
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{api_base}/v1/oauth2/token",
                headers={
                    "Authorization": get_auth_header(),
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                data={"grant_type": "client_credentials"}
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get("access_token")
            else:
                logger.error(f"Error obteniendo token PayPal: {response.status_code} - {response.text}")
                return None
    except Exception as e:
        logger.error(f"Excepción obteniendo token PayPal: {e}")
        return None


# Configuración de planes de MindoraMap para PayPal
PAYPAL_PLANS = {
    "personal": {
        "name": "MindoraMap Personal",
        "description": "Plan Personal - Mapas mentales ilimitados para creadores",
        "amount": "3.00",
        "currency": "USD"
    },
    "team": {
        "name": "MindoraMap Team",
        "description": "Plan Team - Colaboración en equipo de hasta 5 personas",
        "amount": "8.00",
        "currency": "USD"
    },
    "enterprise": {
        "name": "MindoraMap Enterprise",
        "description": "Plan Enterprise - Para equipos grandes con todas las funciones",
        "amount": "24.00",
        "currency": "USD"
    }
}


async def create_paypal_product(plan_id: str) -> Optional[str]:
    """Crea un producto en PayPal para un plan específico"""
    if plan_id not in PAYPAL_PLANS:
        logger.error(f"Plan {plan_id} no existe en PAYPAL_PLANS")
        return None
    
    plan_config = PAYPAL_PLANS[plan_id]
    access_token = await get_access_token()
    
    if not access_token:
        logger.error("No se pudo obtener access token")
        return None
    
    api_base = get_paypal_api_base()
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{api_base}/v1/catalogs/products",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json={
                    "name": plan_config["name"],
                    "description": plan_config["description"],
                    "type": "SERVICE",
                    "category": "SOFTWARE"
                }
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                product_id = data.get("id")
                logger.info(f"Producto PayPal creado: {product_id}")
                return product_id
            else:
                logger.error(f"Error creando producto PayPal: {response.status_code} - {response.text}")
                return None
    except Exception as e:
        logger.error(f"Excepción creando producto PayPal: {e}")
        return None


async def create_paypal_plan(plan_id: str, product_id: str) -> Optional[dict]:
    """Crea un plan de suscripción en PayPal"""
    if plan_id not in PAYPAL_PLANS:
        logger.error(f"Plan {plan_id} no existe")
        return None
    
    plan_config = PAYPAL_PLANS[plan_id]
    access_token = await get_access_token()
    
    if not access_token:
        return None
    
    api_base = get_paypal_api_base()
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{api_base}/v1/billing/plans",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json={
                    "product_id": product_id,
                    "name": plan_config["name"],
                    "description": plan_config["description"],
                    "status": "ACTIVE",
                    "billing_cycles": [
                        {
                            "frequency": {
                                "interval_unit": "MONTH",
                                "interval_count": 1
                            },
                            "tenure_type": "REGULAR",
                            "sequence": 1,
                            "total_cycles": 0,  # Infinito
                            "pricing_scheme": {
                                "fixed_price": {
                                    "value": plan_config["amount"],
                                    "currency_code": plan_config["currency"]
                                }
                            }
                        }
                    ],
                    "payment_preferences": {
                        "auto_bill_outstanding": True,
                        "setup_fee_failure_action": "CONTINUE",
                        "payment_failure_threshold": 3
                    }
                }
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                logger.info(f"Plan PayPal creado: {data.get('id')}")
                return {
                    "id": data.get("id"),
                    "name": plan_config["name"],
                    "status": data.get("status")
                }
            else:
                logger.error(f"Error creando plan PayPal: {response.status_code} - {response.text}")
                return None
    except Exception as e:
        logger.error(f"Excepción creando plan PayPal: {e}")
        return None


async def create_subscription(
    paypal_plan_id: str,
    return_url: str,
    cancel_url: str
) -> Optional[dict]:
    """Crea una suscripción para un usuario"""
    access_token = await get_access_token()
    
    if not access_token:
        return None
    
    api_base = get_paypal_api_base()
    
    # La suscripción debe comenzar en el futuro (al menos 1 minuto)
    start_time = (datetime.now(timezone.utc) + timedelta(minutes=5)).strftime("%Y-%m-%dT%H:%M:%SZ")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{api_base}/v1/billing/subscriptions",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json={
                    "plan_id": paypal_plan_id,
                    "start_time": start_time,
                    "application_context": {
                        "brand_name": "MindoraMap",
                        "locale": "es-ES",
                        "shipping_preference": "NO_SHIPPING",
                        "user_action": "SUBSCRIBE_NOW",
                        "return_url": return_url,
                        "cancel_url": cancel_url
                    }
                }
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                
                # Encontrar el link de aprobación
                approval_url = None
                for link in data.get("links", []):
                    if link.get("rel") == "approve":
                        approval_url = link.get("href")
                        break
                
                if approval_url:
                    logger.info(f"Suscripción creada, ID: {data.get('id')}")
                    return {
                        "subscription_id": data.get("id"),
                        "approval_url": approval_url,
                        "status": data.get("status")
                    }
                else:
                    logger.error("No se encontró URL de aprobación")
                    return None
            else:
                logger.error(f"Error creando suscripción: {response.status_code} - {response.text}")
                return None
    except Exception as e:
        logger.error(f"Excepción creando suscripción: {e}")
        return None


async def get_subscription_details(subscription_id: str) -> Optional[dict]:
    """Obtiene los detalles de una suscripción"""
    access_token = await get_access_token()
    
    if not access_token:
        return None
    
    api_base = get_paypal_api_base()
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{api_base}/v1/billing/subscriptions/{subscription_id}",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "subscription_id": data.get("id"),
                    "status": data.get("status"),
                    "plan_id": data.get("plan_id"),
                    "start_time": data.get("start_time"),
                    "subscriber": data.get("subscriber", {})
                }
            else:
                logger.error(f"Error obteniendo suscripción: {response.status_code}")
                return None
    except Exception as e:
        logger.error(f"Excepción obteniendo suscripción: {e}")
        return None


async def activate_subscription(subscription_id: str) -> bool:
    """Activa una suscripción (después de la aprobación del usuario)"""
    access_token = await get_access_token()
    
    if not access_token:
        return False
    
    api_base = get_paypal_api_base()
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{api_base}/v1/billing/subscriptions/{subscription_id}/activate",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json={"reason": "Reactivating subscription"}
            )
            
            return response.status_code in [200, 204]
    except Exception as e:
        logger.error(f"Excepción activando suscripción: {e}")
        return False


async def cancel_subscription(subscription_id: str, reason: str = "Usuario canceló la suscripción") -> bool:
    """Cancela una suscripción activa"""
    access_token = await get_access_token()
    
    if not access_token:
        return False
    
    api_base = get_paypal_api_base()
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{api_base}/v1/billing/subscriptions/{subscription_id}/cancel",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json={"reason": reason}
            )
            
            if response.status_code in [200, 204]:
                logger.info(f"Suscripción cancelada: {subscription_id}")
                return True
            else:
                logger.error(f"Error cancelando suscripción: {response.status_code}")
                return False
    except Exception as e:
        logger.error(f"Excepción cancelando suscripción: {e}")
        return False


async def verify_webhook_signature(
    transmission_id: str,
    timestamp: str,
    webhook_id: str,
    event_body: str,
    cert_url: str,
    actual_signature: str,
    auth_algo: str
) -> bool:
    """Verifica la firma de un webhook de PayPal"""
    access_token = await get_access_token()
    
    if not access_token:
        return False
    
    api_base = get_paypal_api_base()
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{api_base}/v1/notifications/verify-webhook-signature",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json={
                    "transmission_id": transmission_id,
                    "transmission_time": timestamp,
                    "cert_url": cert_url,
                    "auth_algo": auth_algo,
                    "transmission_sig": actual_signature,
                    "webhook_id": webhook_id,
                    "webhook_event": event_body
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get("verification_status") == "SUCCESS"
            return False
    except Exception as e:
        logger.error(f"Error verificando webhook: {e}")
        return False

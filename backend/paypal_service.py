"""
PayPal Subscription Service for MindoraMap
Handles recurring subscription payments via PayPal
"""

import os
import paypalrestsdk
from datetime import datetime, timezone
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Configuración de PayPal
def configure_paypal():
    """Configura el SDK de PayPal con las credenciales del entorno"""
    paypalrestsdk.configure({
        "mode": os.environ.get("PAYPAL_MODE", "sandbox"),  # "sandbox" o "live"
        "client_id": os.environ.get("PAYPAL_CLIENT_ID", ""),
        "client_secret": os.environ.get("PAYPAL_SECRET", "")
    })

# Configuración de planes de MindoraMap para PayPal
PAYPAL_PLANS = {
    "personal": {
        "name": "MindoraMap Personal",
        "description": "Plan Personal - Mapas mentales ilimitados para creadores",
        "amount": "3.00",
        "currency": "USD",
        "interval": "MONTH",
        "interval_count": 1
    },
    "team": {
        "name": "MindoraMap Team",
        "description": "Plan Team - Colaboración en equipo de hasta 5 personas",
        "amount": "8.00",
        "currency": "USD",
        "interval": "MONTH",
        "interval_count": 1
    },
    "enterprise": {
        "name": "MindoraMap Enterprise",
        "description": "Plan Enterprise - Para equipos grandes con todas las funciones",
        "amount": "24.00",
        "currency": "USD",
        "interval": "MONTH",
        "interval_count": 1
    }
}


async def create_paypal_product(plan_id: str) -> Optional[str]:
    """Crea un producto en PayPal para un plan específico"""
    configure_paypal()
    
    if plan_id not in PAYPAL_PLANS:
        logger.error(f"Plan {plan_id} no existe en PAYPAL_PLANS")
        return None
    
    plan_config = PAYPAL_PLANS[plan_id]
    
    product = paypalrestsdk.Product({
        "name": plan_config["name"],
        "description": plan_config["description"],
        "type": "SERVICE",
        "category": "SOFTWARE"
    })
    
    if product.create():
        logger.info(f"Producto PayPal creado: {product.id}")
        return product.id
    else:
        logger.error(f"Error creando producto PayPal: {product.error}")
        return None


async def create_paypal_plan(plan_id: str, product_id: str, return_url: str, cancel_url: str) -> Optional[dict]:
    """Crea un plan de suscripción en PayPal"""
    configure_paypal()
    
    if plan_id not in PAYPAL_PLANS:
        logger.error(f"Plan {plan_id} no existe")
        return None
    
    plan_config = PAYPAL_PLANS[plan_id]
    
    billing_plan = paypalrestsdk.BillingPlan({
        "name": plan_config["name"],
        "description": plan_config["description"],
        "type": "INFINITE",
        "payment_definitions": [{
            "name": f"Pago mensual {plan_config['name']}",
            "type": "REGULAR",
            "frequency": plan_config["interval"],
            "frequency_interval": str(plan_config["interval_count"]),
            "amount": {
                "value": plan_config["amount"],
                "currency": plan_config["currency"]
            },
            "cycles": "0"  # Infinito
        }],
        "merchant_preferences": {
            "setup_fee": {
                "value": "0",
                "currency": plan_config["currency"]
            },
            "return_url": return_url,
            "cancel_url": cancel_url,
            "auto_bill_amount": "YES",
            "initial_fail_amount_action": "CONTINUE",
            "max_fail_attempts": "3"
        }
    })
    
    if billing_plan.create():
        # Activar el plan
        if billing_plan.activate():
            logger.info(f"Plan PayPal creado y activado: {billing_plan.id}")
            return {
                "id": billing_plan.id,
                "name": plan_config["name"],
                "state": billing_plan.state
            }
        else:
            logger.error(f"Error activando plan: {billing_plan.error}")
            return None
    else:
        logger.error(f"Error creando plan PayPal: {billing_plan.error}")
        return None


async def create_subscription(
    paypal_plan_id: str,
    user_email: str,
    return_url: str,
    cancel_url: str
) -> Optional[dict]:
    """Crea una suscripción para un usuario"""
    configure_paypal()
    
    billing_agreement = paypalrestsdk.BillingAgreement({
        "name": "Suscripción MindoraMap",
        "description": "Suscripción mensual a MindoraMap",
        "start_date": (datetime.now(timezone.utc).replace(microsecond=0) + 
                      __import__('datetime').timedelta(minutes=5)).isoformat() + "Z",
        "plan": {
            "id": paypal_plan_id
        },
        "payer": {
            "payment_method": "paypal",
            "payer_info": {
                "email": user_email
            }
        }
    })
    
    if billing_agreement.create():
        # Encontrar el link de aprobación
        for link in billing_agreement.links:
            if link.rel == "approval_url":
                logger.info(f"Suscripción creada, URL de aprobación: {link.href}")
                return {
                    "agreement_id": billing_agreement.id,
                    "approval_url": link.href,
                    "token": link.href.split("token=")[-1] if "token=" in link.href else None
                }
        return None
    else:
        logger.error(f"Error creando suscripción: {billing_agreement.error}")
        return None


async def execute_subscription(payment_token: str) -> Optional[dict]:
    """Ejecuta/confirma una suscripción después de la aprobación del usuario"""
    configure_paypal()
    
    billing_agreement = paypalrestsdk.BillingAgreement.execute(payment_token)
    
    if billing_agreement:
        logger.info(f"Suscripción ejecutada: {billing_agreement.id}")
        return {
            "agreement_id": billing_agreement.id,
            "state": billing_agreement.state,
            "payer_email": billing_agreement.payer.payer_info.email if hasattr(billing_agreement, 'payer') else None,
            "start_date": billing_agreement.start_date if hasattr(billing_agreement, 'start_date') else None
        }
    else:
        logger.error("Error ejecutando suscripción")
        return None


async def cancel_subscription(agreement_id: str, reason: str = "Usuario canceló la suscripción") -> bool:
    """Cancela una suscripción activa"""
    configure_paypal()
    
    try:
        billing_agreement = paypalrestsdk.BillingAgreement.find(agreement_id)
        
        if billing_agreement.cancel({"note": reason}):
            logger.info(f"Suscripción cancelada: {agreement_id}")
            return True
        else:
            logger.error(f"Error cancelando suscripción: {billing_agreement.error}")
            return False
    except Exception as e:
        logger.error(f"Excepción cancelando suscripción: {e}")
        return False


async def get_subscription_details(agreement_id: str) -> Optional[dict]:
    """Obtiene los detalles de una suscripción"""
    configure_paypal()
    
    try:
        billing_agreement = paypalrestsdk.BillingAgreement.find(agreement_id)
        
        return {
            "agreement_id": billing_agreement.id,
            "state": billing_agreement.state,
            "name": billing_agreement.name,
            "description": billing_agreement.description,
            "start_date": billing_agreement.start_date,
            "payer_email": billing_agreement.payer.payer_info.email if hasattr(billing_agreement, 'payer') else None
        }
    except Exception as e:
        logger.error(f"Error obteniendo detalles de suscripción: {e}")
        return None


def verify_webhook_signature(
    transmission_id: str,
    timestamp: str,
    webhook_id: str,
    event_body: str,
    cert_url: str,
    actual_signature: str,
    auth_algo: str
) -> bool:
    """Verifica la firma de un webhook de PayPal"""
    configure_paypal()
    
    try:
        response = paypalrestsdk.WebhookEvent.verify(
            transmission_id=transmission_id,
            timestamp=timestamp,
            webhook_id=webhook_id,
            event_body=event_body,
            cert_url=cert_url,
            actual_sig=actual_signature,
            auth_algo=auth_algo
        )
        return response.get("verification_status") == "SUCCESS"
    except Exception as e:
        logger.error(f"Error verificando webhook: {e}")
        return False

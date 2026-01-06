import { useCallback, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook para verificar si el usuario puede realizar acciones
 * Retorna una función que verifica si el email está verificado
 * y muestra el modal de restricción si no lo está
 */
export function useVerificationCheck() {
  const { user } = useAuth();
  const [showRestrictionModal, setShowRestrictionModal] = useState(false);

  const checkVerification = useCallback((actionName = '') => {
    // Si el usuario no está autenticado o ya está verificado, permitir
    if (!user) return true;
    
    // Usuarios de Google OAuth siempre están verificados
    if (user.auth_provider === 'google') return true;
    
    // Verificar si el email está verificado
    if (user.email_verified) return true;
    
    // Si no está verificado, mostrar modal
    console.log(`[Verificación] Acción bloqueada: ${actionName}. Usuario no verificado.`);
    setShowRestrictionModal(true);
    return false;
  }, [user]);

  const closeRestrictionModal = useCallback(() => {
    setShowRestrictionModal(false);
  }, []);

  return {
    checkVerification,
    showRestrictionModal,
    closeRestrictionModal,
    isVerified: user?.email_verified ?? true,
    userEmail: user?.email || ''
  };
}

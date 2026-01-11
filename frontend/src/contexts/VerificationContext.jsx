import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// Use relative URLs to work in any environment
const API_URL = '';

const VerificationContext = createContext(null);

export function VerificationProvider({ children }) {
  const [isVerified, setIsVerified] = useState(true); // Default true to avoid flash
  const [userEmail, setUserEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRestrictionModal, setShowRestrictionModal] = useState(false);
  const [resendsRemaining, setResendsRemaining] = useState(5);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Countdown timer for cooldown
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => setCooldownSeconds(cooldownSeconds - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  // Check verification status
  const checkVerificationStatus = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/auth/verification-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsVerified(data.email_verified);
        setUserEmail(data.email || '');
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
    }
  }, []);

  // Resend verification email
  const resendVerification = useCallback(async () => {
    if (cooldownSeconds > 0 || !userEmail) return { success: false };
    
    setIsLoading(true);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: userEmail })
      });

      const data = await response.json();

      if (response.status === 429) {
        // Rate limited - extract wait time from message
        const match = data.detail?.match(/(\d+):(\d+)/);
        if (match) {
          const minutes = parseInt(match[1]);
          const seconds = parseInt(match[2]);
          setCooldownSeconds(minutes * 60 + seconds);
        } else if (data.detail?.includes('límite de 5')) {
          setCooldownSeconds(86400); // 24 hours
        }
        return { success: false, error: data.detail };
      }

      if (response.ok) {
        setCooldownSeconds(300); // 5 minutes cooldown after successful send
        if (data.resends_remaining !== undefined) {
          setResendsRemaining(data.resends_remaining);
        }
        return { success: true, message: data.message };
      }

      return { success: false, error: data.detail || 'Error al enviar' };
    } catch (error) {
      console.error('Error resending verification:', error);
      return { success: false, error: 'Error de conexión' };
    } finally {
      setIsLoading(false);
    }
  }, [userEmail, cooldownSeconds]);

  // Update email
  const updateEmail = useCallback(async (newEmail) => {
    setIsLoading(true);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${API_URL}/api/auth/update-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ new_email: newEmail })
      });

      const data = await response.json();

      if (response.ok) {
        setUserEmail(newEmail);
        setIsVerified(false);
        setCooldownSeconds(300);
        return { success: true, message: data.message };
      }

      return { success: false, error: data.detail || 'Error al actualizar' };
    } catch (error) {
      console.error('Error updating email:', error);
      return { success: false, error: 'Error de conexión' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check if action is allowed (for restricted actions)
  const checkActionAllowed = useCallback((actionName = '') => {
    if (isVerified) return true;
    
    setShowRestrictionModal(true);
    return false;
  }, [isVerified]);

  // Format cooldown time
  const formatCooldown = useCallback(() => {
    if (cooldownSeconds <= 0) return '';
    const minutes = Math.floor(cooldownSeconds / 60);
    const seconds = cooldownSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [cooldownSeconds]);

  // Mark as verified (called after successful verification)
  const markAsVerified = useCallback(() => {
    setIsVerified(true);
  }, []);

  const value = {
    isVerified,
    userEmail,
    isLoading,
    showRestrictionModal,
    setShowRestrictionModal,
    resendsRemaining,
    cooldownSeconds,
    formatCooldown,
    checkVerificationStatus,
    resendVerification,
    updateEmail,
    checkActionAllowed,
    markAsVerified,
    setUserEmail,
    setIsVerified
  };

  return (
    <VerificationContext.Provider value={value}>
      {children}
    </VerificationContext.Provider>
  );
}

export function useVerification() {
  const context = useContext(VerificationContext);
  if (!context) {
    throw new Error('useVerification must be used within a VerificationProvider');
  }
  return context;
}

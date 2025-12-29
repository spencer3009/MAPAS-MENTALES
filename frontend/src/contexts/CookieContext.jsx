import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CookieContext = createContext(null);

const COOKIE_CONSENT_KEY = 'mindora_cookie_consent';

// Configuración por defecto de cookies
const defaultConsent = {
  necessary: true, // Siempre activa
  analytics: false,
  functional: false,
  marketing: false,
  consentGiven: false,
  consentDate: null
};

export const CookieProvider = ({ children }) => {
  const [consent, setConsent] = useState(defaultConsent);
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Cargar preferencias al iniciar
  useEffect(() => {
    const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (savedConsent) {
      try {
        const parsed = JSON.parse(savedConsent);
        setConsent({ ...parsed, necessary: true }); // Necesarias siempre activas
        setShowBanner(false);
      } catch (e) {
        setShowBanner(true);
      }
    } else {
      setShowBanner(true);
    }
  }, []);

  // Guardar preferencias
  const saveConsent = useCallback((newConsent) => {
    const consentToSave = {
      ...newConsent,
      necessary: true,
      consentGiven: true,
      consentDate: new Date().toISOString()
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consentToSave));
    setConsent(consentToSave);
    setShowBanner(false);
    setShowSettings(false);
  }, []);

  // Aceptar todas las cookies
  const acceptAll = useCallback(() => {
    saveConsent({
      necessary: true,
      analytics: true,
      functional: true,
      marketing: true
    });
  }, [saveConsent]);

  // Solo necesarias
  const acceptNecessaryOnly = useCallback(() => {
    saveConsent({
      necessary: true,
      analytics: false,
      functional: false,
      marketing: false
    });
  }, [saveConsent]);

  // Guardar configuración personalizada
  const saveCustomSettings = useCallback((settings) => {
    saveConsent(settings);
  }, [saveConsent]);

  // Abrir panel de configuración
  const openSettings = useCallback(() => {
    setShowSettings(true);
  }, []);

  // Cerrar panel de configuración
  const closeSettings = useCallback(() => {
    setShowSettings(false);
  }, []);

  // Resetear consentimiento (para "Gestionar cookies" en footer)
  const resetConsent = useCallback(() => {
    setShowSettings(true);
  }, []);

  const value = {
    consent,
    showBanner,
    showSettings,
    acceptAll,
    acceptNecessaryOnly,
    saveCustomSettings,
    openSettings,
    closeSettings,
    resetConsent,
    hasConsent: consent.consentGiven
  };

  return (
    <CookieContext.Provider value={value}>
      {children}
    </CookieContext.Provider>
  );
};

export const useCookies = () => {
  const context = useContext(CookieContext);
  if (!context) {
    throw new Error('useCookies debe usarse dentro de CookieProvider');
  }
  return context;
};

export default CookieContext;

import "./App.css";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CookieProvider, useCookies } from "./contexts/CookieContext";
import { MindMapApp } from "./components/mindmap";
import { LoginPage, RegisterPage, AuthCallback } from "./components/auth";
import { LandingPage } from "./components/landing";
import { AdminPanel } from "./components/admin";
import { DemoMindMapApp } from "./components/demo";
import { CookieBanner, CookieSettingsPanel } from "./components/cookies";
import { TermsPage, PrivacyPage, CookiesPage } from "./components/legal";
import { PayPalCallback } from "./components/payment";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

// Componente de carga
const LoadingScreen = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      <p className="text-gray-500 font-medium">Cargando...</p>
    </div>
  </div>
);

// Componente principal con lógica de autenticación
const AppContent = () => {
  const { isAuthenticated, isAdmin, loading, refreshUser } = useAuth();
  const [authView, setAuthView] = useState(null); // null = landing, 'login', 'register', 'callback', 'admin', 'demo', 'terms', 'privacy', 'cookies'
  const [authError, setAuthError] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState(null); // Plan seleccionado desde la landing
  const [paypalCallback, setPaypalCallback] = useState(null); // 'success' o 'cancel'

  // Detectar session_id en la URL (Google OAuth callback)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('session_id=')) {
      setAuthView('callback');
    }
    // Detectar callback de PayPal
    if (hash && hash.includes('subscription-success')) {
      setPaypalCallback('success');
    } else if (hash && hash.includes('subscription-cancel')) {
      setPaypalCallback('cancel');
    }
  }, []);

  // También verificar en cada render
  if (window.location.hash?.includes('session_id=') && authView !== 'callback') {
    setAuthView('callback');
  }

  if (loading && authView !== 'callback' && authView !== 'demo') {
    return <LoadingScreen />;
  }

  // Si está autenticado
  if (isAuthenticated) {
    // Mostrar callback de PayPal si corresponde
    if (paypalCallback) {
      return (
        <>
          <MindMapApp 
            onAdminClick={isAdmin ? () => setAuthView('admin') : null}
            pendingPlanId={null}
            onClearPendingPlan={() => {}}
          />
          <PayPalCallback 
            type={paypalCallback}
            onSuccess={(data) => {
              console.log('Subscription success:', data);
              // Refrescar datos del usuario si es necesario
              if (refreshUser) refreshUser();
            }}
            onError={(error) => {
              console.error('Subscription error:', error);
            }}
            onClose={() => {
              setPaypalCallback(null);
              window.history.replaceState({}, document.title, window.location.pathname);
              // Refrescar datos del usuario
              if (refreshUser) refreshUser();
            }}
          />
        </>
      );
    }
    
    // Si está en el panel de admin
    if (authView === 'admin' && isAdmin) {
      return <AdminPanel onBack={() => setAuthView(null)} />;
    }
    // Mostrar la app principal - pasar el plan seleccionado si existe
    return (
      <MindMapApp 
        onAdminClick={isAdmin ? () => setAuthView('admin') : null}
        pendingPlanId={selectedPlanId}
        onClearPendingPlan={() => setSelectedPlanId(null)}
      />
    );
  }

  // Si estamos procesando el callback de Google OAuth
  if (authView === 'callback') {
    return (
      <AuthCallback 
        onSuccess={() => setAuthView(null)}
        onError={(error) => {
          setAuthError(error);
          setAuthView('login');
        }}
      />
    );
  }

  // Si el usuario eligió el modo demo
  if (authView === 'demo') {
    return (
      <DemoMindMapApp
        onRegister={() => setAuthView('register')}
        onLogin={() => setAuthView('login')}
        onBackToLanding={() => setAuthView(null)}
      />
    );
  }

  // Páginas legales
  if (authView === 'terms') {
    return <TermsPage onBack={() => setAuthView(null)} />;
  }

  if (authView === 'privacy') {
    return <PrivacyPage onBack={() => setAuthView(null)} />;
  }

  if (authView === 'cookies') {
    return <CookiesPage onBack={() => setAuthView(null)} />;
  }

  // Si el usuario eligió ir al login
  if (authView === 'login') {
    return (
      <LoginPage 
        onBackToLanding={() => { setAuthView(null); setAuthError(null); }} 
        onSwitchToRegister={() => { setAuthView('register'); setAuthError(null); }}
        externalError={authError}
      />
    );
  }

  // Si el usuario eligió ir al registro
  if (authView === 'register') {
    return (
      <RegisterPage 
        onBackToLanding={() => { setAuthView(null); setAuthError(null); setSelectedPlanId(null); }} 
        onSwitchToLogin={() => { setAuthView('login'); setAuthError(null); }}
        selectedPlan={selectedPlanId}
      />
    );
  }

  // Por defecto, mostrar la landing page
  return (
    <LandingPage 
      onLogin={() => setAuthView('login')} 
      onRegister={() => setAuthView('register')}
      onDemo={() => setAuthView('demo')}
      onTerms={() => setAuthView('terms')}
      onPrivacy={() => setAuthView('privacy')}
      onCookies={() => setAuthView('cookies')}
      onSelectPlan={(planId) => {
        setSelectedPlanId(planId);
        setAuthView('register');
      }}
    />
  );
};

// Componente wrapper que incluye cookies
const AppWithCookies = () => {
  return (
    <>
      <AppContent />
      <CookieBanner />
      <CookieSettingsPanel />
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <CookieProvider>
        <AppWithCookies />
      </CookieProvider>
    </AuthProvider>
  );
}

export default App;

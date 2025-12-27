import "./App.css";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { MindMapApp } from "./components/mindmap";
import { LoginPage, RegisterPage, AuthCallback } from "./components/auth";
import { LandingPage } from "./components/landing";
import { AdminPanel } from "./components/admin";
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
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const [authView, setAuthView] = useState(null); // null = landing, 'login', 'register', 'callback', 'admin'
  const [authError, setAuthError] = useState(null);

  // Detectar session_id en la URL (Google OAuth callback)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('session_id=')) {
      setAuthView('callback');
    }
  }, []);

  // También verificar en cada render
  if (window.location.hash?.includes('session_id=') && authView !== 'callback') {
    setAuthView('callback');
  }

  if (loading && authView !== 'callback') {
    return <LoadingScreen />;
  }

  // Si está autenticado
  if (isAuthenticated) {
    // Si está en el panel de admin
    if (authView === 'admin' && isAdmin) {
      return <AdminPanel onBack={() => setAuthView(null)} onEditLanding={() => setAuthView('landing-editor')} />;
    }
    // Si está editando la landing page (modo CMS inline)
    if (authView === 'landing-editor' && isAdmin) {
      return (
        <LandingPage 
          onLogin={() => setAuthView(null)} 
          onRegister={() => setAuthView(null)}
          onBackToApp={() => setAuthView(null)}
          isEditMode={true}
        />
      );
    }
    // Mostrar la app principal
    return <MindMapApp onAdminClick={isAdmin ? () => setAuthView('admin') : null} />;
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
        onBackToLanding={() => { setAuthView(null); setAuthError(null); }} 
        onSwitchToLogin={() => { setAuthView('login'); setAuthError(null); }}
      />
    );
  }

  // Por defecto, mostrar la landing page
  return (
    <LandingPage 
      onLogin={() => setAuthView('login')} 
      onRegister={() => setAuthView('register')} 
    />
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

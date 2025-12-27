import "./App.css";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { MindMapApp } from "./components/mindmap";
import { LoginPage } from "./components/auth";
import { LandingPage } from "./components/landing";
import { Loader2 } from "lucide-react";
import { useState } from "react";

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
  const { isAuthenticated, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  if (loading) {
    return <LoadingScreen />;
  }

  // Si está autenticado, mostrar la app
  if (isAuthenticated) {
    return <MindMapApp />;
  }

  // Si el usuario eligió ir al login, mostrar LoginPage
  if (showLogin) {
    return <LoginPage onBackToLanding={() => setShowLogin(false)} />;
  }

  // Por defecto, mostrar la landing page
  return (
    <LandingPage 
      onLogin={() => setShowLogin(true)} 
      onRegister={() => setShowLogin(true)} 
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

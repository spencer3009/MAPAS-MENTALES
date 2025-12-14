import "./App.css";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { MindMapApp } from "./components/mindmap";
import { LoginPage } from "./components/auth";
import { Loader2 } from "lucide-react";

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

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <MindMapApp />;
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar sesión del localStorage al iniciar
  useEffect(() => {
    const storedToken = localStorage.getItem('mm_auth_token');
    const storedUser = localStorage.getItem('mm_auth_user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      // Verificar que el token sigue siendo válido
      verifyToken(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  // Verificar token con el backend
  const verifyToken = async (tokenToVerify) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${tokenToVerify}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        // Actualizar usuario con datos completos incluyendo rol
        const updatedUser = {
          ...userData,
          role: userData.role || 'user',
          is_pro: userData.is_pro || false
        };
        setUser(updatedUser);
        setToken(tokenToVerify);
        localStorage.setItem('mm_auth_user', JSON.stringify(updatedUser));
      } else {
        // Token inválido, limpiar sesión
        logout();
      }
    } catch (err) {
      console.error('Error verificando token:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  // Login
  const login = useCallback(async (username, password) => {
    setError(null);
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setToken(data.access_token);
        // Guardar usuario y luego obtener datos completos con rol
        const userWithRole = { ...data.user };
        setUser(userWithRole);
        localStorage.setItem('mm_auth_token', data.access_token);
        localStorage.setItem('mm_auth_user', JSON.stringify(userWithRole));
        
        // Obtener datos completos (incluyendo rol) después del login
        try {
          const meResponse = await fetch(`${API_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${data.access_token}` }
          });
          if (meResponse.ok) {
            const fullUserData = await meResponse.json();
            setUser(fullUserData);
            localStorage.setItem('mm_auth_user', JSON.stringify(fullUserData));
          }
        } catch (e) {
          console.error('Error getting user role:', e);
        }
        
        return { success: true };
      } else {
        setError(data.detail || 'Error al iniciar sesión');
        return { success: false, error: data.detail };
      }
    } catch (err) {
      const errorMsg = 'Error de conexión. Intenta de nuevo.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Register
  const register = useCallback(async (userData) => {
    setError(null);
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setToken(data.access_token);
        setUser(data.user);
        localStorage.setItem('mm_auth_token', data.access_token);
        localStorage.setItem('mm_auth_user', JSON.stringify(data.user));
        return { success: true };
      } else {
        setError(data.detail || 'Error al crear la cuenta');
        return { success: false, error: data.detail };
      }
    } catch (err) {
      const errorMsg = 'Error de conexión. Intenta de nuevo.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Google Login - Redirect to Emergent Auth
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const loginWithGoogle = useCallback(() => {
    const redirectUrl = window.location.origin + '/auth/callback';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  }, []);

  // Process Google Session
  const processGoogleSession = useCallback(async (sessionId) => {
    setError(null);
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/auth/google/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ session_id: sessionId })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setToken(data.access_token);
        setUser(data.user);
        localStorage.setItem('mm_auth_token', data.access_token);
        localStorage.setItem('mm_auth_user', JSON.stringify(data.user));
        return { success: true, user: data.user };
      } else {
        setError(data.detail || 'Error al procesar la sesión de Google');
        return { success: false, error: data.detail };
      }
    } catch (err) {
      const errorMsg = 'Error de conexión. Intenta de nuevo.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      // Llamar al backend para limpiar la cookie
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.error('Error en logout:', err);
    }
    
    setUser(null);
    setToken(null);
    setError(null);
    localStorage.removeItem('mm_auth_token');
    localStorage.removeItem('mm_auth_user');
  }, []);

  // Valor del contexto
  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated: !!user && !!token,
    login,
    register,
    loginWithGoogle,
    processGoogleSession,
    logout,
    clearError: () => setError(null)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook para usar el contexto de autenticación
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};

export default AuthContext;

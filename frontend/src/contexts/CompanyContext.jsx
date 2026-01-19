import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CompanyContext = createContext(null);

const API_URL = '';

export const CompanyProvider = ({ children, token }) => {
  const [companies, setCompanies] = useState([]);
  const [activeCompany, setActiveCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estado global para abrir el modal de configuración con pestaña específica
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configModalTab, setConfigModalTab] = useState('general');
  
  // Función para abrir el modal de colaboradores directamente
  const openCollaboratorsModal = useCallback(() => {
    if (activeCompany) {
      setConfigModalTab('collaborators');
      setShowConfigModal(true);
    }
  }, [activeCompany]);
  
  // Función para abrir el modal de configuración general
  const openConfigModal = useCallback((tab = 'general') => {
    if (activeCompany) {
      setConfigModalTab(tab);
      setShowConfigModal(true);
    }
  }, [activeCompany]);
  
  // Función para cerrar el modal
  const closeConfigModal = useCallback(() => {
    setShowConfigModal(false);
  }, []);

  // Cargar empresas del usuario
  const loadCompanies = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/finanzas/companies`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCompanies(data);

        // Recuperar empresa activa de localStorage
        const savedCompanyId = localStorage.getItem('activeCompanyId');
        if (savedCompanyId && data.length > 0) {
          const savedCompany = data.find(c => c.id === savedCompanyId);
          if (savedCompany) {
            setActiveCompany(savedCompany);
          } else {
            // Si la empresa guardada ya no existe, usar la primera
            setActiveCompany(data[0]);
            localStorage.setItem('activeCompanyId', data[0].id);
          }
        } else if (data.length > 0) {
          // Si no hay empresa guardada pero hay empresas, usar la primera
          setActiveCompany(data[0]);
          localStorage.setItem('activeCompanyId', data[0].id);
        }
      } else {
        setError('Error al cargar empresas');
      }
    } catch (err) {
      console.error('Error loading companies:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Cargar empresas al montar
  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  // Cambiar empresa activa
  const selectCompany = useCallback((company) => {
    setActiveCompany(company);
    if (company) {
      localStorage.setItem('activeCompanyId', company.id);
    } else {
      localStorage.removeItem('activeCompanyId');
    }
  }, []);

  // Crear nueva empresa
  const createCompany = useCallback(async (companyData) => {
    try {
      const response = await fetch(`${API_URL}/api/finanzas/companies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(companyData),
      });

      if (response.ok) {
        const newCompany = await response.json();
        setCompanies(prev => [newCompany, ...prev]);
        setActiveCompany(newCompany);
        localStorage.setItem('activeCompanyId', newCompany.id);
        return { success: true, company: newCompany };
      } else {
        const error = await response.json();
        return { success: false, error: error.detail || 'Error al crear empresa' };
      }
    } catch (err) {
      return { success: false, error: 'Error de conexión' };
    }
  }, [token]);

  // Actualizar empresa
  const updateCompany = useCallback(async (companyId, companyData) => {
    try {
      const response = await fetch(`${API_URL}/api/finanzas/companies/${companyId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(companyData),
      });

      if (response.ok) {
        const updatedCompany = await response.json();
        setCompanies(prev => prev.map(c => c.id === companyId ? updatedCompany : c));
        if (activeCompany?.id === companyId) {
          setActiveCompany(updatedCompany);
        }
        return { success: true, company: updatedCompany };
      } else {
        const error = await response.json();
        return { success: false, error: error.detail || 'Error al actualizar empresa' };
      }
    } catch (err) {
      return { success: false, error: 'Error de conexión' };
    }
  }, [token, activeCompany]);

  // Eliminar empresa (con confirmación)
  const deleteCompany = useCallback(async (companyId, confirmation) => {
    try {
      const response = await fetch(`${API_URL}/api/finanzas/companies/${companyId}?confirmation=${encodeURIComponent(confirmation)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const remaining = companies.filter(c => c.id !== companyId);
        setCompanies(remaining);
        
        if (activeCompany?.id === companyId) {
          if (remaining.length > 0) {
            selectCompany(remaining[0]);
          } else {
            selectCompany(null);
          }
        }
        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.detail || 'Error al eliminar empresa' };
      }
    } catch (err) {
      return { success: false, error: 'Error de conexión' };
    }
  }, [token, activeCompany, companies, selectCompany]);

  const value = {
    companies,
    activeCompany,
    loading,
    error,
    selectCompany,
    createCompany,
    updateCompany,
    deleteCompany,
    refreshCompanies: loadCompanies,
    hasCompanies: companies.length > 0,
    // Funciones para modal de configuración
    showConfigModal,
    configModalTab,
    openConfigModal,
    openCollaboratorsModal,
    closeConfigModal,
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

export default CompanyContext;

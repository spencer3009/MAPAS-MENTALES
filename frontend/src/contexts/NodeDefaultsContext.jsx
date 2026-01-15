import React, { createContext, useContext, useState, useEffect } from 'react';

// Contexto de configuración de nodos
const NodeDefaultsContext = createContext();

// Valores por defecto
const DEFAULT_SETTINGS = {
  showIconByDefault: true,          // Mostrar ícono de check por defecto
  defaultIcon: { name: 'CircleCheck', color: '#10b981' }, // Verde esmeralda
  textAlignLeft: true,              // Alineación a la izquierda por defecto
};

// Key para localStorage
const STORAGE_KEY = 'mindora_node_defaults';

export const NodeDefaultsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    // Intentar cargar desde localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Error loading node defaults:', e);
    }
    return DEFAULT_SETTINGS;
  });

  // Guardar en localStorage cuando cambian las configuraciones
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Error saving node defaults:', e);
    }
  }, [settings]);

  // Función para actualizar configuraciones
  const updateSettings = (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  // Función para resetear a valores por defecto
  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  // Función para obtener las propiedades por defecto de un nodo nuevo
  const getDefaultNodeProps = () => {
    const props = {};
    
    if (settings.showIconByDefault && settings.defaultIcon) {
      props.icon = settings.defaultIcon;
    }
    
    if (settings.textAlignLeft) {
      props.textAlign = 'left';
    }
    
    return props;
  };

  return (
    <NodeDefaultsContext.Provider value={{
      settings,
      updateSettings,
      resetSettings,
      getDefaultNodeProps,
      DEFAULT_SETTINGS
    }}>
      {children}
    </NodeDefaultsContext.Provider>
  );
};

// Hook para usar el contexto
export const useNodeDefaults = () => {
  const context = useContext(NodeDefaultsContext);
  if (!context) {
    throw new Error('useNodeDefaults must be used within a NodeDefaultsProvider');
  }
  return context;
};

export default NodeDefaultsContext;

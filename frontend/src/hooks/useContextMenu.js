import { useState, useCallback, useEffect } from 'react';

export const useContextMenu = () => {
  const [contextMenu, setContextMenu] = useState(null);

  const openContextMenu = useCallback((x, y, nodeId) => {
    setContextMenu({ x, y, nodeId });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu) {
        closeContextMenu();
      }
    };

    // Usar setTimeout para evitar cerrar inmediatamente al abrir
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu, closeContextMenu]);

  return {
    contextMenu,
    openContextMenu,
    closeContextMenu
  };
};

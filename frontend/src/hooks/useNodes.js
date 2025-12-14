import { useState, useEffect, useCallback, useRef } from 'react';

const PROJECTS_KEY = 'mm_projects';
const ACTIVE_PROJECT_KEY = 'mm_activeProjectId';
const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Template por defecto para nuevos proyectos
const createDefaultProject = () => ({
  id: crypto.randomUUID(),
  name: 'Nuevo Mapa',
  nodes: [{ 
    id: crypto.randomUUID(), 
    text: 'Idea Central', 
    x: 300, 
    y: 300, 
    color: 'blue', 
    parentId: null 
  }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

// Cargar proyectos desde localStorage (fallback)
const loadProjectsFromStorage = () => {
  try {
    const saved = localStorage.getItem(PROJECTS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading projects from localStorage:', e);
  }
  return null; // Retornar null para indicar que no hay proyectos locales
};

// Cargar ID del proyecto activo desde localStorage
const loadActiveProjectIdFromStorage = (projects) => {
  try {
    const saved = localStorage.getItem(ACTIVE_PROJECT_KEY);
    if (saved && projects.some(p => p.id === saved)) {
      return saved;
    }
  } catch (e) {
    console.error('Error loading active project ID from localStorage:', e);
  }
  return projects.length > 0 ? projects[0].id : null;
};

// Obtener token del localStorage
const getAuthToken = () => {
  try {
    return localStorage.getItem('mm_auth_token');
  } catch (e) {
    console.error('Error getting auth token:', e);
  }
  return null;
};

export const useNodes = () => {
  // Estado inicial vacío hasta que cargue del servidor
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Estado para undo/redo usando useRef para historial mutable
  const historyRef = useRef({});
  const [historyVersion, setHistoryVersion] = useState(0);
  const isUndoRedoAction = useRef(false);
  
  // Ref para debounce de guardado
  const saveTimeoutRef = useRef(null);
  const pendingSaveRef = useRef(null);

  // ==========================================
  // SINCRONIZACIÓN CON SERVIDOR
  // ==========================================

  // Cargar proyectos del servidor
  const loadFromServer = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      console.log('No auth token, using local storage');
      return null;
    }

    try {
      const response = await fetch(`${API_URL}/api/projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const serverProjects = await response.json();
        console.log('Proyectos cargados del servidor:', serverProjects.length);
        return serverProjects;
      }
    } catch (error) {
      console.error('Error cargando proyectos del servidor:', error);
    }
    return null;
  }, []);

  // Guardar proyecto en servidor
  const saveProjectToServer = useCallback(async (project) => {
    const token = getAuthToken();
    if (!token) return false;

    try {
      // Verificar si existe
      const checkResponse = await fetch(`${API_URL}/api/projects/${project.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const method = checkResponse.ok ? 'PUT' : 'POST';
      const url = checkResponse.ok 
        ? `${API_URL}/api/projects/${project.id}`
        : `${API_URL}/api/projects`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: project.id,
          name: project.name,
          nodes: project.nodes
        })
      });

      if (response.ok) {
        console.log(`Proyecto ${method === 'PUT' ? 'actualizado' : 'creado'} en servidor:`, project.name);
        return true;
      }
    } catch (error) {
      console.error('Error guardando proyecto en servidor:', error);
    }
    return false;
  }, []);

  // Eliminar proyecto del servidor
  const deleteProjectFromServer = useCallback(async (projectId) => {
    const token = getAuthToken();
    if (!token) return false;

    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        console.log('Proyecto eliminado del servidor:', projectId);
        return true;
      }
    } catch (error) {
      console.error('Error eliminando proyecto del servidor:', error);
    }
    return false;
  }, []);

  // Sincronizar proyectos locales al servidor
  const syncLocalToServer = useCallback(async (localProjects) => {
    const token = getAuthToken();
    if (!token || !localProjects || localProjects.length === 0) return;

    setIsSyncing(true);
    try {
      const response = await fetch(`${API_URL}/api/projects/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(localProjects.map(p => ({
          id: p.id,
          name: p.name,
          nodes: p.nodes
        })))
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Proyectos sincronizados:', result.synced);
        // Limpiar localStorage después de sincronizar
        localStorage.removeItem(PROJECTS_KEY);
      }
    } catch (error) {
      console.error('Error sincronizando proyectos:', error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Guardar con debounce para evitar muchas peticiones
  const debouncedSaveToServer = useCallback((project) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    pendingSaveRef.current = project;
    
    saveTimeoutRef.current = setTimeout(async () => {
      if (pendingSaveRef.current) {
        await saveProjectToServer(pendingSaveRef.current);
        pendingSaveRef.current = null;
      }
    }, 1000); // 1 segundo de debounce
  }, [saveProjectToServer]);

  // Función para recargar proyectos (útil después del login)
  const reloadProjects = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    
    console.log('Recargando proyectos del servidor...');
    setIsLoading(true);
    
    const serverProjects = await loadFromServer();
    
    if (serverProjects && serverProjects.length > 0) {
      setProjects(serverProjects);
      
      const histories = {};
      serverProjects.forEach(p => {
        histories[p.id] = {
          states: [JSON.stringify(p.nodes)],
          pointer: 0
        };
      });
      historyRef.current = histories;
      
      const activeId = loadActiveProjectIdFromStorage(serverProjects);
      setActiveProjectId(activeId);
    }
    
    setIsLoading(false);
  }, [loadFromServer]);

  // Escuchar cambios en el token (para recargar después del login)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'mm_auth_token' && e.newValue) {
        console.log('Token changed, reloading projects...');
        setTimeout(reloadProjects, 100);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [reloadProjects]);

  // También verificar periódicamente si hay token y recargar
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (!hasInitialized.current) {
      const token = getAuthToken();
      if (token && projects.length === 0) {
        reloadProjects();
      }
      hasInitialized.current = true;
    }
  }, [projects.length, reloadProjects]);

  // Cargar proyectos al iniciar
  useEffect(() => {
    const initializeProjects = async () => {
      setIsLoading(true);
      
      // Intentar cargar del servidor primero
      const serverProjects = await loadFromServer();
      
      if (serverProjects && serverProjects.length > 0) {
        // Usar proyectos del servidor
        setProjects(serverProjects);
        
        // Inicializar historial
        const histories = {};
        serverProjects.forEach(p => {
          histories[p.id] = {
            states: [JSON.stringify(p.nodes)],
            pointer: 0
          };
        });
        historyRef.current = histories;
        
        // Establecer proyecto activo
        const activeId = loadActiveProjectIdFromStorage(serverProjects);
        setActiveProjectId(activeId);
        
        // Si hay proyectos locales, sincronizarlos
        const localProjects = loadProjectsFromStorage();
        if (localProjects && localProjects.length > 0) {
          // Sincronizar proyectos locales que no estén en servidor
          const serverIds = new Set(serverProjects.map(p => p.id));
          const newLocalProjects = localProjects.filter(p => !serverIds.has(p.id));
          if (newLocalProjects.length > 0) {
            await syncLocalToServer(newLocalProjects);
            // Recargar del servidor para tener los proyectos sincronizados
            const updatedProjects = await loadFromServer();
            if (updatedProjects) {
              setProjects(updatedProjects);
            }
          }
        }
      } else {
        // Usar localStorage como fallback
        const localProjects = loadProjectsFromStorage();
        
        if (localProjects && localProjects.length > 0) {
          setProjects(localProjects);
          
          // Inicializar historial
          const histories = {};
          localProjects.forEach(p => {
            histories[p.id] = {
              states: [JSON.stringify(p.nodes)],
              pointer: 0
            };
          });
          historyRef.current = histories;
          
          setActiveProjectId(loadActiveProjectIdFromStorage(localProjects));
          
          // Intentar sincronizar al servidor
          await syncLocalToServer(localProjects);
          
          // Recargar del servidor
          const syncedProjects = await loadFromServer();
          if (syncedProjects && syncedProjects.length > 0) {
            setProjects(syncedProjects);
          }
        } else {
          // Crear proyecto por defecto
          const defaultProject = createDefaultProject();
          defaultProject.name = 'Mi Primer Mapa';
          setProjects([defaultProject]);
          setActiveProjectId(defaultProject.id);
          
          historyRef.current[defaultProject.id] = {
            states: [JSON.stringify(defaultProject.nodes)],
            pointer: 0
          };
          
          // Guardar en servidor
          await saveProjectToServer(defaultProject);
        }
      }
      
      setIsLoading(false);
    };

    initializeProjects();
  }, [loadFromServer, syncLocalToServer, saveProjectToServer]);

  // Obtener proyecto activo
  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];
  const nodes = activeProject?.nodes || [];
  const projectName = activeProject?.name || 'Sin nombre';

  // Si activeProjectId no coincide con ningún proyecto, actualizar
  useEffect(() => {
    if (activeProjectId && !projects.find(p => p.id === activeProjectId) && projects.length > 0) {
      console.log('Fixing activeProjectId mismatch');
      setActiveProjectId(projects[0].id);
    }
  }, [activeProjectId, projects]);

  // Estado de selección
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  // ==========================================
  // PERSISTENCIA - Guardar en servidor con cada cambio
  // ==========================================
  
  // Guardar proyecto activo cuando cambie
  useEffect(() => {
    if (activeProject && !isLoading) {
      // Guardar en servidor con debounce
      debouncedSaveToServer(activeProject);
    }
  }, [activeProject, isLoading, debouncedSaveToServer]);

  // Guardar ID activo en localStorage (solo este dato local)
  useEffect(() => {
    try {
      if (activeProjectId) {
        localStorage.setItem(ACTIVE_PROJECT_KEY, activeProjectId);
      }
    } catch (e) {
      console.error('Error saving active project ID to localStorage:', e);
    }
  }, [activeProjectId]);

  // ==========================================
  // FUNCIONES DE HISTORIAL (UNDO/REDO)
  // ==========================================

  const pushToHistory = useCallback((projectId, nodesToSave) => {
    if (isUndoRedoAction.current) return;
    
    const newState = JSON.stringify(nodesToSave);
    const history = historyRef.current[projectId] || { states: [], pointer: -1 };
    const { states, pointer } = history;
    
    // Truncar estados futuros
    const truncatedStates = states.slice(0, pointer + 1);
    
    // No duplicar si es igual al estado actual
    if (truncatedStates.length > 0 && truncatedStates[truncatedStates.length - 1] === newState) {
      return;
    }
    
    // Agregar nuevo estado
    const newStates = [...truncatedStates, newState];
    while (newStates.length > 50) newStates.shift();
    
    historyRef.current[projectId] = {
      states: newStates,
      pointer: newStates.length - 1
    };
    
    console.log(`History for ${projectId}: ${newStates.length} states, pointer: ${newStates.length - 1}`);
    setHistoryVersion(v => v + 1);
  }, []);

  // Calcular canUndo y canRedo
  const getHistoryState = useCallback((projectId) => {
    return historyRef.current[projectId] || { states: [], pointer: 0 };
  }, []);
  
  const currentHistory = getHistoryState(activeProjectId);
  const canUndo = currentHistory.states.length > 1 && currentHistory.pointer > 0;
  const canRedo = currentHistory.pointer < currentHistory.states.length - 1;

  const undo = useCallback(() => {
    const history = historyRef.current[activeProjectId];
    
    if (history && history.pointer > 0) {
      isUndoRedoAction.current = true;
      const newPointer = history.pointer - 1;
      const prevState = JSON.parse(history.states[newPointer]);
      
      history.pointer = newPointer;
      console.log(`Undo: pointer now ${newPointer}`);
      
      setProjects(prev => prev.map(p => 
        p.id === activeProjectId 
          ? { ...p, nodes: prevState, updatedAt: new Date().toISOString() }
          : p
      ));
      
      setHistoryVersion(v => v + 1);
      setTimeout(() => { isUndoRedoAction.current = false; }, 0);
    }
  }, [activeProjectId]);

  const redo = useCallback(() => {
    const history = historyRef.current[activeProjectId];
    
    if (history && history.pointer < history.states.length - 1) {
      isUndoRedoAction.current = true;
      const newPointer = history.pointer + 1;
      const nextState = JSON.parse(history.states[newPointer]);
      
      history.pointer = newPointer;
      console.log(`Redo: pointer now ${newPointer}`);
      
      setProjects(prev => prev.map(p => 
        p.id === activeProjectId 
          ? { ...p, nodes: nextState, updatedAt: new Date().toISOString() }
          : p
      ));
      
      setHistoryVersion(v => v + 1);
      setTimeout(() => { isUndoRedoAction.current = false; }, 0);
    }
  }, [activeProjectId]);
  
  // Alias para compatibilidad
  const saveToHistory = pushToHistory;

  // ==========================================
  // FUNCIONES DE NODOS
  // ==========================================

  const updateProjectNodes = useCallback((newNodes, saveHistory = true) => {
    if (saveHistory) saveToHistory(activeProjectId, newNodes);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
  }, [activeProjectId, saveToHistory]);

  const addNode = useCallback((parentId = null, position = null) => {
    const newId = crypto.randomUUID();
    
    setProjects(prev => {
      const project = prev.find(p => p.id === activeProjectId);
      if (!project) {
        console.error('No active project found');
        return prev;
      }
      
      const currentNodes = project.nodes;
      
      let newX = 400;
      let newY = 300;
      
      if (parentId) {
        const parent = currentNodes.find(n => n.id === parentId);
        if (parent) {
          const siblings = currentNodes.filter(n => n.parentId === parentId);
          newX = parent.x + 280;
          newY = parent.y + (siblings.length * 100) - 50;
        }
      } else if (position) {
        newX = position.x;
        newY = position.y;
      }

      const newNode = {
        id: newId,
        text: 'Nuevo Nodo',
        x: newX,
        y: newY,
        color: 'blue',
        parentId,
        width: 160,
        height: 64
      };

      console.log('Creating new node:', newNode);
      
      // Guardar el NUEVO estado en el historial (después del cambio)
      const newNodes = [...currentNodes, newNode];
      pushToHistory(activeProjectId, newNodes);

      return prev.map(p => 
        p.id === activeProjectId 
          ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
          : p
      );
    });

    setSelectedNodeId(newId);
    return newId;
  }, [activeProjectId, pushToHistory]);

  // Guardar posición al FINALIZAR el drag (no durante)
  const saveNodePositionToHistory = useCallback(() => {
    saveToHistory(activeProjectId, nodes);
  }, [activeProjectId, nodes, saveToHistory]);

  const updateNodePosition = useCallback((id, x, y) => {
    // No guardar en historial durante el drag (muy frecuente)
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: p.nodes.map(n => n.id === id ? { ...n, x, y } : n), updatedAt: new Date().toISOString() }
        : p
    ));
  }, [activeProjectId]);

  const updateNodeText = useCallback((id, text) => {
    saveToHistory(activeProjectId, nodes);
    const newNodes = nodes.map(n => n.id === id ? { ...n, text } : n);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
  }, [nodes, activeProjectId, saveToHistory]);

  const updateNodeColor = useCallback((id, color) => {
    saveToHistory(activeProjectId, nodes);
    const newNodes = nodes.map(n => n.id === id ? { ...n, color } : n);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
  }, [nodes, activeProjectId, saveToHistory]);

  // Actualizar comentario del nodo
  const updateNodeComment = useCallback((id, comment) => {
    const newNodes = nodes.map(n => n.id === id ? { ...n, comment } : n);
    pushToHistory(activeProjectId, newNodes);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
  }, [nodes, activeProjectId, pushToHistory]);

  // Actualizar estilos del nodo (forma, colores, borde, línea)
  const updateNodeStyle = useCallback((id, styleUpdates) => {
    const newNodes = nodes.map(n => {
      if (n.id === id) {
        return { ...n, ...styleUpdates };
      }
      return n;
    });
    pushToHistory(activeProjectId, newNodes);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
  }, [nodes, activeProjectId, pushToHistory]);

  // Actualizar tamaño del nodo
  const updateNodeSize = useCallback((id, width, height, saveHistory = false) => {
    const newNodes = nodes.map(n => n.id === id ? { ...n, width, height } : n);
    if (saveHistory) {
      pushToHistory(activeProjectId, newNodes);
    }
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
  }, [activeProjectId, nodes, pushToHistory]);

  // Actualizar icono del nodo
  const updateNodeIcon = useCallback((id, icon) => {
    const newNodes = nodes.map(n => {
      if (n.id === id) {
        // icon puede ser null para eliminar, o {name, color} para establecer
        if (icon === null) {
          const { icon: _, ...rest } = n;
          return rest;
        }
        return { ...n, icon };
      }
      return n;
    });
    pushToHistory(activeProjectId, newNodes);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
  }, [nodes, activeProjectId, pushToHistory]);

  // Agregar enlace al nodo
  const addNodeLink = useCallback((id, url) => {
    const newNodes = nodes.map(n => {
      if (n.id === id) {
        const currentLinks = n.links || [];
        return { ...n, links: [...currentLinks, url] };
      }
      return n;
    });
    pushToHistory(activeProjectId, newNodes);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
  }, [nodes, activeProjectId, pushToHistory]);

  // Eliminar enlace del nodo
  const removeNodeLink = useCallback((id, linkIndex) => {
    const newNodes = nodes.map(n => {
      if (n.id === id) {
        const currentLinks = n.links || [];
        const updatedLinks = currentLinks.filter((_, idx) => idx !== linkIndex);
        return { ...n, links: updatedLinks };
      }
      return n;
    });
    pushToHistory(activeProjectId, newNodes);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
  }, [nodes, activeProjectId, pushToHistory]);

  // Actualizar enlace del nodo
  const updateNodeLink = useCallback((id, linkIndex, newUrl) => {
    const newNodes = nodes.map(n => {
      if (n.id === id) {
        const currentLinks = n.links || [];
        const updatedLinks = currentLinks.map((link, idx) => 
          idx === linkIndex ? newUrl : link
        );
        return { ...n, links: updatedLinks };
      }
      return n;
    });
    pushToHistory(activeProjectId, newNodes);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
  }, [nodes, activeProjectId, pushToHistory]);

  const deleteNode = useCallback((id) => {
    const findDescendants = (nodeId, allNodes) => {
      const children = allNodes.filter(n => n.parentId === nodeId);
      let descendants = [nodeId];
      children.forEach(child => {
        descendants = [...descendants, ...findDescendants(child.id, allNodes)];
      });
      return descendants;
    };

    const nodesToDelete = new Set(findDescendants(id, nodes));
    const newNodes = nodes.filter(n => !nodesToDelete.has(n.id));
    pushToHistory(activeProjectId, newNodes);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
    setSelectedNodeId(null);
  }, [nodes, activeProjectId, pushToHistory]);

  const duplicateNode = useCallback((id) => {
    const original = nodes.find(n => n.id === id);
    if (!original) return;
    
    const newId = crypto.randomUUID();
    const duplicate = {
      ...original,
      id: newId,
      x: original.x + 30,
      y: original.y + 30
    };
    
    const newNodes = [...nodes, duplicate];
    pushToHistory(activeProjectId, newNodes);

    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
    setSelectedNodeId(newId);
  }, [nodes, activeProjectId, pushToHistory]);

  // ==========================================
  // GESTIÓN DE PROYECTOS
  // ==========================================

  // Crear proyecto en blanco (AGREGA, no reemplaza)
  const createBlankMap = useCallback(async (name = 'Nuevo Mapa') => {
    try {
      console.log('Creando nuevo proyecto en blanco...');
      
      const initialNodes = [{ 
        id: crypto.randomUUID(), 
        text: 'Idea Central', 
        x: 300, 
        y: 300, 
        color: 'blue', 
        parentId: null,
        width: 160,
        height: 64
      }];
      
      const newProject = {
        id: crypto.randomUUID(),
        name: name,
        nodes: initialNodes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Inicializar historial para el nuevo proyecto
      historyRef.current[newProject.id] = {
        states: [JSON.stringify(initialNodes)],
        pointer: 0
      };

      setProjects(prev => [newProject, ...prev]);
      setActiveProjectId(newProject.id);
      setSelectedNodeId(null);
      setHistoryVersion(v => v + 1);
      
      // Guardar en servidor inmediatamente
      await saveProjectToServer(newProject);
      
      console.log('Nuevo proyecto creado:', newProject.name);
      return true;
    } catch (error) {
      console.error('Error al crear proyecto en blanco:', error);
      return false;
    }
  }, [saveProjectToServer]);

  // Cargar desde template (AGREGA, no reemplaza)
  const loadFromTemplate = useCallback(async (templateNodes, templateName = 'Template') => {
    try {
      console.log('Creando proyecto desde template:', templateName);
      
      // Generar nuevos IDs para evitar conflictos
      const idMap = {};
      const newNodes = templateNodes.map(node => {
        const newId = crypto.randomUUID();
        idMap[node.id] = newId;
        return { ...node, id: newId };
      });
      
      // Actualizar parentIds con los nuevos IDs
      const mappedNodes = newNodes.map(node => ({
        ...node,
        parentId: node.parentId ? idMap[node.parentId] : null
      }));

      const newProject = {
        id: crypto.randomUUID(),
        name: templateName,
        nodes: mappedNodes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Inicializar historial para el nuevo proyecto
      historyRef.current[newProject.id] = {
        states: [JSON.stringify(mappedNodes)],
        pointer: 0
      };

      setProjects(prev => [newProject, ...prev]);
      setActiveProjectId(newProject.id);
      setSelectedNodeId(null);
      setHistoryVersion(v => v + 1);
      
      // Guardar en servidor inmediatamente
      await saveProjectToServer(newProject);
      
      console.log('Proyecto desde template creado:', newProject.name);
      return true;
    } catch (error) {
      console.error('Error al cargar template:', error);
      return false;
    }
  }, [saveProjectToServer]);

  // Eliminar proyecto (solo el activo)
  const deleteProject = useCallback(async (projectIdToDelete = activeProjectId) => {
    try {
      console.log('Eliminando proyecto:', projectIdToDelete);
      
      // Eliminar del servidor primero
      await deleteProjectFromServer(projectIdToDelete);
      
      const remainingProjects = projects.filter(p => p.id !== projectIdToDelete);
      
      if (remainingProjects.length === 0) {
        // Si no quedan proyectos, crear uno nuevo
        const newProject = createDefaultProject();
        newProject.name = 'Nuevo Mapa';
        setProjects([newProject]);
        setActiveProjectId(newProject.id);
        
        // Guardar el nuevo proyecto en servidor
        await saveProjectToServer(newProject);
        
        console.log('Último proyecto eliminado, creado uno nuevo');
      } else {
        setProjects(remainingProjects);
        // Si eliminamos el proyecto activo, activar el más reciente
        if (projectIdToDelete === activeProjectId) {
          const sorted = [...remainingProjects].sort(
            (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
          );
          setActiveProjectId(sorted[0].id);
        }
        console.log('Proyecto eliminado, quedan:', remainingProjects.length);
      }
      
      setSelectedNodeId(null);
      return true;
    } catch (error) {
      console.error('Error al eliminar proyecto:', error);
      return false;
    }
  }, [activeProjectId, projects, deleteProjectFromServer, saveProjectToServer]);

  // Cambiar proyecto activo
  const switchProject = useCallback((projectId) => {
    try {
      if (projects.some(p => p.id === projectId)) {
        console.log('Cambiando a proyecto:', projectId);
        setActiveProjectId(projectId);
        setSelectedNodeId(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error al cambiar proyecto:', error);
      return false;
    }
  }, [projects]);

  // Renombrar proyecto
  const renameProject = useCallback(async (projectId, newName) => {
    try {
      setProjects(prev => prev.map(p => 
        p.id === projectId 
          ? { ...p, name: newName, updatedAt: new Date().toISOString() }
          : p
      ));
      
      // Guardar en servidor
      const project = projects.find(p => p.id === projectId);
      if (project) {
        await saveProjectToServer({ ...project, name: newName });
      }
      
      console.log('Proyecto renombrado:', newName);
      return true;
    } catch (error) {
      console.error('Error al renombrar proyecto:', error);
      return false;
    }
  }, [projects, saveProjectToServer]);

  // Funciones de compatibilidad
  const setProjectName = useCallback((name) => {
    renameProject(activeProjectId, name);
  }, [activeProjectId, renameProject]);

  const resetToDefault = useCallback(() => {
    // Crear un proyecto con los nodos por defecto
    const defaultNodes = [
      { id: crypto.randomUUID(), text: 'Idea Principal', x: 200, y: 280, color: 'blue', parentId: null },
    ];
    const rootId = defaultNodes[0].id;
    defaultNodes.push(
      { id: crypto.randomUUID(), text: 'Concepto 1', x: 480, y: 120, color: 'pink', parentId: rootId },
      { id: crypto.randomUUID(), text: 'Concepto 2', x: 480, y: 280, color: 'green', parentId: rootId },
      { id: crypto.randomUUID(), text: 'Concepto 3', x: 480, y: 440, color: 'yellow', parentId: rootId }
    );
    
    return loadFromTemplate(defaultNodes, 'Mi Mapa Mental');
  }, [loadFromTemplate]);

  const clearAll = useCallback(() => {
    return createBlankMap();
  }, [createBlankMap]);

  return {
    // Estado de nodos del proyecto activo
    nodes,
    selectedNodeId,
    setSelectedNodeId,
    
    // Información del proyecto activo
    projectName,
    activeProjectId,
    activeProject,
    
    // Lista de todos los proyectos
    projects,
    
    // Estados de sincronización
    isLoading,
    isSyncing,
    reloadProjects,
    
    // Funciones de nodos
    addNode,
    updateNode: updateProjectNodes,
    updateNodePosition,
    updateNodeText,
    updateNodeColor,
    updateNodeComment,
    updateNodeStyle,
    updateNodeSize,
    updateNodeIcon,
    addNodeLink,
    removeNodeLink,
    updateNodeLink,
    saveNodePositionToHistory,
    deleteNode,
    duplicateNode,
    
    // Funciones de historial
    undo,
    redo,
    canUndo,
    canRedo,
    
    // Gestión de proyectos
    createBlankMap,
    loadFromTemplate,
    deleteProject,
    switchProject,
    renameProject,
    setProjectName,
    
    // Compatibilidad
    resetToDefault,
    clearAll,
    setNodes: updateProjectNodes
  };
};

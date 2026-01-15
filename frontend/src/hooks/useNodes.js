import { useState, useEffect, useCallback, useRef } from 'react';

const PROJECTS_KEY = 'mm_projects';
const ACTIVE_PROJECT_KEY = 'mm_activeProjectId';
// Use relative URLs to work in any environment
const API_URL = '';

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
        // Asignar layoutType 'mindflow' a proyectos existentes que no lo tengan
        const projectsWithLayout = serverProjects.map(p => ({
          ...p,
          layoutType: p.layoutType || 'mindflow'
        }));
        console.log('Proyectos cargados del servidor:', projectsWithLayout.length);
        return projectsWithLayout;
      }
    } catch (error) {
      console.error('Error cargando proyectos del servidor:', error);
    }
    return null;
  }, []);

  // Guardar proyecto en servidor
  const saveProjectToServer = useCallback(async (project, thumbnail = null) => {
    const token = getAuthToken();
    if (!token) return { success: false, error: 'No autenticado' };

    try {
      // Verificar si existe
      const checkResponse = await fetch(`${API_URL}/api/projects/${project.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const method = checkResponse.ok ? 'PUT' : 'POST';
      const url = checkResponse.ok 
        ? `${API_URL}/api/projects/${project.id}`
        : `${API_URL}/api/projects`;

      const body = {
        id: project.id,
        name: project.name,
        layoutType: project.layoutType || 'mindflow',
        nodes: project.nodes
      };
      
      // Agregar thumbnail si se proporciona
      if (thumbnail) {
        body.thumbnail = thumbnail;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        console.log(`Proyecto ${method === 'PUT' ? 'actualizado' : 'creado'} en servidor:`, project.name);
        return { success: true };
      } else if (response.status === 409) {
        // Conflicto - ya existe un proyecto con ese nombre
        const errorData = await response.json().catch(() => ({}));
        console.warn('Conflicto de proyecto:', errorData);
        return { 
          success: false, 
          error: errorData.detail?.message || 'Ya existe un proyecto con ese nombre',
          conflict: true,
          existingProjectId: errorData.detail?.existing_project_id,
          status: 409
        };
      } else {
        // Capturar el mensaje de error del servidor
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || 'Error al guardar el proyecto';
        console.error('Error del servidor:', errorMessage);
        return { success: false, error: errorMessage, status: response.status };
      }
    } catch (error) {
      console.error('Error guardando proyecto en servidor:', error);
      return { success: false, error: error.message };
    }
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
          // No hay proyectos - dejar cuenta vacía
          console.log('No hay proyectos, cuenta vacía');
          setProjects([]);
          setActiveProjectId(null);
        }
      }
      
      setIsLoading(false);
    };

    initializeProjects();
  }, [loadFromServer, syncLocalToServer]);

  // Obtener proyecto activo
  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0] || null;
  const nodes = activeProject?.nodes || [];
  const projectName = activeProject?.name || '';

  // Si activeProjectId no coincide con ningún proyecto, actualizar
  useEffect(() => {
    if (activeProjectId && !projects.find(p => p.id === activeProjectId) && projects.length > 0) {
      console.log('Fixing activeProjectId mismatch');
      setActiveProjectId(projects[0].id);
    }
  }, [activeProjectId, projects]);

  // Estado de selección
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  
  // Estado de selección múltiple
  const [selectedNodeIds, setSelectedNodeIds] = useState(new Set());

  // ==========================================
  // FUNCIONES DE SELECCIÓN MÚLTIPLE
  // ==========================================

  // Agregar nodo a la selección múltiple (CTRL/CMD + clic)
  const addToSelection = useCallback((nodeId) => {
    setSelectedNodeIds(prev => {
      const newSet = new Set(prev);
      
      // Si hay un nodo seleccionado individualmente, agregarlo al Set primero
      // Esto permite que CTRL+click funcione desde una selección individual
      if (selectedNodeId && !newSet.has(selectedNodeId)) {
        newSet.add(selectedNodeId);
      }
      
      // Alternar el nodo clickeado
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
    // Limpiar selección individual
    setSelectedNodeId(null);
  }, [selectedNodeId]);

  // Seleccionar un solo nodo (limpiar selección múltiple)
  const selectSingleNode = useCallback((nodeId) => {
    setSelectedNodeId(nodeId);
    setSelectedNodeIds(new Set());
  }, []);

  // Seleccionar todos los nodos
  const selectAllNodes = useCallback(() => {
    const allIds = new Set(nodes.map(n => n.id));
    setSelectedNodeIds(allIds);
    setSelectedNodeId(null);
  }, [nodes]);

  // Limpiar toda la selección
  const clearSelection = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedNodeIds(new Set());
  }, []);

  // Seleccionar nodos dentro de un área
  const selectNodesInArea = useCallback((startPoint, endPoint, additive = false) => {
    const minX = Math.min(startPoint.x, endPoint.x);
    const maxX = Math.max(startPoint.x, endPoint.x);
    const minY = Math.min(startPoint.y, endPoint.y);
    const maxY = Math.max(startPoint.y, endPoint.y);

    const nodesInArea = nodes.filter(node => {
      const nodeRight = node.x + (node.width || 160);
      const nodeBottom = node.y + (node.height || 64);
      
      // Verificar si el nodo está dentro del área
      return node.x < maxX && nodeRight > minX && node.y < maxY && nodeBottom > minY;
    });

    if (additive) {
      setSelectedNodeIds(prev => {
        const newSet = new Set(prev);
        nodesInArea.forEach(n => newSet.add(n.id));
        return newSet;
      });
    } else {
      setSelectedNodeIds(new Set(nodesInArea.map(n => n.id)));
    }
    setSelectedNodeId(null);
  }, [nodes]);

  // Verificar si un nodo está seleccionado (individual o múltiple)
  const isNodeSelected = useCallback((nodeId) => {
    return selectedNodeId === nodeId || selectedNodeIds.has(nodeId);
  }, [selectedNodeId, selectedNodeIds]);

  // Obtener todos los nodos seleccionados
  const getSelectedNodes = useCallback(() => {
    if (selectedNodeIds.size > 0) {
      return nodes.filter(n => selectedNodeIds.has(n.id));
    }
    if (selectedNodeId) {
      const node = nodes.find(n => n.id === selectedNodeId);
      return node ? [node] : [];
    }
    return [];
  }, [nodes, selectedNodeId, selectedNodeIds]);

  // NOTA: Las acciones en grupo (deleteSelectedNodes, alignNodes, etc.) 
  // se definen después de pushToHistory para evitar errores de inicialización

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

  // ==========================================
  // ACCIONES EN GRUPO (después de pushToHistory)
  // ==========================================

  // Eliminar nodos seleccionados
  const deleteSelectedNodes = useCallback(() => {
    const idsToDelete = selectedNodeIds.size > 0 
      ? Array.from(selectedNodeIds) 
      : (selectedNodeId ? [selectedNodeId] : []);
    
    if (idsToDelete.length === 0) return;

    const newNodes = nodes.filter(n => !idsToDelete.includes(n.id));
    pushToHistory(activeProjectId, newNodes);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
    clearSelection();
  }, [nodes, selectedNodeId, selectedNodeIds, activeProjectId, pushToHistory, clearSelection]);

  // Duplicar nodos seleccionados
  // Nota: La alineación automática se aplicará mediante el callback setProjectsWithAutoAlign si está habilitada
  const duplicateSelectedNodes = useCallback(() => {
    const nodesToDuplicate = getSelectedNodes();
    if (nodesToDuplicate.length === 0) return;

    const currentProject = projects.find(p => p.id === activeProjectId);
    const layoutType = currentProject?.layoutType || 'mindflow';

    // Para cada nodo a duplicar, calcular su posición correcta basada en hermanos
    const newDuplicatedNodes = nodesToDuplicate.map(node => {
      let newX = node.x + 50;
      let newY = node.y + 50;
      
      if (node.parentId) {
        const parent = nodes.find(n => n.id === node.parentId);
        if (parent) {
          // Obtener hermanos actuales
          const existingSiblings = nodes.filter(n => n.parentId === node.parentId);
          
          if (layoutType === 'mindtree') {
            // MindTree: distribuidos horizontalmente
            const rightmostSibling = existingSiblings.reduce((max, s) => 
              (s.x + (s.width || 160)) > (max.x + (max.width || 160)) ? s : max, existingSiblings[0]);
            newX = rightmostSibling.x + (rightmostSibling.width || 160) + 40;
            newY = rightmostSibling.y;
          } else {
            // MindFlow/MindHybrid: distribuidos verticalmente
            const bottommostSibling = existingSiblings.reduce((max, s) => 
              (s.y + (s.height || 64)) > (max.y + (max.height || 64)) ? s : max, existingSiblings[0]);
            newX = bottommostSibling.x;
            newY = bottommostSibling.y + (bottommostSibling.height || 64) + 30;
          }
        }
      }
      
      return {
        ...node,
        id: crypto.randomUUID(),
        x: newX,
        y: newY,
      };
    });

    const updatedNodes = [...nodes, ...newDuplicatedNodes];
    
    pushToHistory(activeProjectId, updatedNodes);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: updatedNodes, updatedAt: new Date().toISOString() }
        : p
    ));

    // Seleccionar los nuevos nodos
    setSelectedNodeIds(new Set(newDuplicatedNodes.map(n => n.id)));
    setSelectedNodeId(null);
  }, [nodes, projects, activeProjectId, pushToHistory, getSelectedNodes]);

  // Alinear nodos a la izquierda
  const alignNodesLeft = useCallback(() => {
    const selectedNodes = getSelectedNodes();
    if (selectedNodes.length < 2) return;

    const minX = Math.min(...selectedNodes.map(n => n.x));
    const newNodes = nodes.map(n => {
      if (selectedNodeIds.has(n.id)) {
        return { ...n, x: minX };
      }
      return n;
    });

    pushToHistory(activeProjectId, newNodes);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
  }, [nodes, selectedNodeIds, activeProjectId, pushToHistory, getSelectedNodes]);

  // Alinear nodos al centro horizontal
  const alignNodesCenter = useCallback(() => {
    const selectedNodes = getSelectedNodes();
    if (selectedNodes.length < 2) return;

    const centerX = selectedNodes.reduce((sum, n) => sum + n.x + (n.width || 160) / 2, 0) / selectedNodes.length;
    const newNodes = nodes.map(n => {
      if (selectedNodeIds.has(n.id)) {
        return { ...n, x: centerX - (n.width || 160) / 2 };
      }
      return n;
    });

    pushToHistory(activeProjectId, newNodes);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
  }, [nodes, selectedNodeIds, activeProjectId, pushToHistory, getSelectedNodes]);

  // Alinear nodos a la derecha
  const alignNodesRight = useCallback(() => {
    const selectedNodes = getSelectedNodes();
    if (selectedNodes.length < 2) return;

    const maxRight = Math.max(...selectedNodes.map(n => n.x + (n.width || 160)));
    const newNodes = nodes.map(n => {
      if (selectedNodeIds.has(n.id)) {
        return { ...n, x: maxRight - (n.width || 160) };
      }
      return n;
    });

    pushToHistory(activeProjectId, newNodes);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
  }, [nodes, selectedNodeIds, activeProjectId, pushToHistory, getSelectedNodes]);

  // Alinear nodos arriba
  const alignNodesTop = useCallback(() => {
    const selectedNodes = getSelectedNodes();
    if (selectedNodes.length < 2) return;

    const minY = Math.min(...selectedNodes.map(n => n.y));
    const newNodes = nodes.map(n => {
      if (selectedNodeIds.has(n.id)) {
        return { ...n, y: minY };
      }
      return n;
    });

    pushToHistory(activeProjectId, newNodes);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
  }, [nodes, selectedNodeIds, activeProjectId, pushToHistory, getSelectedNodes]);

  // Alinear nodos al centro vertical Y distribuir uniformemente
  // Este botón hace ambas cosas: centra verticalmente y distribuye el espacio
  const alignNodesMiddle = useCallback(() => {
    const selectedNodes = getSelectedNodes();
    if (selectedNodes.length < 2) return;

    console.log('[alignNodesMiddle] Alineando y distribuyendo', selectedNodes.length, 'nodos verticalmente');

    // Función para obtener la altura del nodo
    const getNodeHeight = (node) => {
      if (node.height && node.height > 0) return node.height;
      const baseHeight = 64;
      const text = node.text || '';
      const nodeWidth = node.width || 160;
      const charsPerLine = Math.floor(nodeWidth / 9);
      const estimatedLines = Math.max(1, Math.ceil(text.length / charsPerLine));
      return Math.max(baseHeight, 30 + (estimatedLines * 22));
    };

    // 1. Ordenar nodos por posición Y actual (de arriba hacia abajo)
    const sortedNodes = [...selectedNodes].sort((a, b) => a.y - b.y);
    
    // 2. Calcular el centro vertical del área ocupada
    const topY = sortedNodes[0].y;
    const lastNode = sortedNodes[sortedNodes.length - 1];
    const bottomY = lastNode.y + getNodeHeight(lastNode);
    const centerY = (topY + bottomY) / 2;
    
    // 3. Calcular la altura total de todos los nodos
    const totalHeights = sortedNodes.reduce((sum, n) => sum + getNodeHeight(n), 0);
    
    // 4. Calcular el espacio uniforme entre nodos
    const N = sortedNodes.length;
    const totalArea = bottomY - topY;
    const espacio = (totalArea - totalHeights) / (N - 1);
    
    console.log('[alignNodesMiddle] Centro Y:', centerY, 'Espacio uniforme:', espacio);

    // 5. Reposicionar cada nodo con distribución uniforme
    const newPositions = new Map();
    let currentY = topY;
    
    sortedNodes.forEach((node) => {
      newPositions.set(node.id, currentY);
      currentY += getNodeHeight(node) + espacio;
    });

    // 6. Aplicar las nuevas posiciones
    const newNodes = nodes.map(n => {
      if (newPositions.has(n.id)) {
        return { ...n, y: newPositions.get(n.id) };
      }
      return n;
    });

    pushToHistory(activeProjectId, newNodes);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
    
    console.log('[alignNodesMiddle] Distribución completada');
  }, [nodes, selectedNodeIds, activeProjectId, pushToHistory, getSelectedNodes]);

  // ==========================================
  // ALINEACIÓN JERÁRQUICA AUTOMÁTICA
  // (Para relación padre-hijo)
  // ==========================================

  // Función auxiliar para obtener la altura de un nodo
  // Prioridad: manualHeight > height > altura calculada
  const getNodeHeight = useCallback((node) => {
    // Si tiene altura manual definida por el usuario, usarla siempre
    if (node.manualHeight && node.manualHeight > 0) return node.manualHeight;
    // Si tiene altura definida, usarla
    if (node.height && node.height > 0) return node.height;
    // Calcular altura basada en el contenido
    const baseHeight = 64;
    const text = node.text || '';
    const nodeWidth = node.manualWidth || node.width || 160;
    const charsPerLine = Math.floor(nodeWidth / 9);
    const estimatedLines = Math.max(1, Math.ceil(text.length / charsPerLine));
    return Math.max(baseHeight, 30 + (estimatedLines * 22));
  }, []);

  // Función auxiliar para obtener el ancho de un nodo
  // Prioridad: manualWidth > width > ancho por defecto
  const getNodeWidth = useCallback((node) => {
    if (node.manualWidth && node.manualWidth > 0) return node.manualWidth;
    if (node.width && node.width > 0) return node.width;
    return 160; // Ancho por defecto
  }, []);

  // ==========================================
  // ALGORITMO DE ALINEACIÓN POR BLOQUES
  // Evita superposición entre subárboles
  // ==========================================

  // Constantes de layout para MindFlow (horizontal)
  const BLOCK_MARGIN = 30; // Margen vertical entre bloques
  const CHILD_SPACING = 20; // Espacio entre nodos hijos
  const HORIZONTAL_OFFSET = 280; // Distancia horizontal padre-hijos

  // Constantes de layout para MindTree (vertical)
  const MINDTREE_VERTICAL_OFFSET = 120; // Distancia vertical padre-hijos
  const MINDTREE_HORIZONTAL_SPACING = 40; // Espacio horizontal entre hermanos
  const MINDTREE_BLOCK_MARGIN = 50; // Margen entre bloques en MindTree

  // Calcular la altura total de un bloque (nodo + todos sus descendientes)
  const calculateBlockHeight = useCallback((nodeId, allNodes) => {
    const children = allNodes.filter(n => n.parentId === nodeId);
    
    if (children.length === 0) {
      // Nodo hoja: solo su propia altura
      const node = allNodes.find(n => n.id === nodeId);
      return getNodeHeight(node);
    }

    // Calcular altura de cada hijo (recursivamente)
    let totalHeight = 0;
    children.forEach((child, index) => {
      const childBlockHeight = calculateBlockHeight(child.id, allNodes);
      totalHeight += childBlockHeight;
      if (index < children.length - 1) {
        totalHeight += BLOCK_MARGIN; // Margen entre bloques hermanos
      }
    });

    return totalHeight;
  }, [getNodeHeight, BLOCK_MARGIN]);

  // Alinear un subárbol completo (nodo + todos sus descendientes)
  // Retorna los nodos actualizados y la altura del bloque
  const alignSubtree = useCallback((nodeId, startY, allNodes) => {
    const node = allNodes.find(n => n.id === nodeId);
    if (!node) return { nodes: allNodes, blockHeight: 0 };

    const children = allNodes.filter(n => n.parentId === nodeId);
    let updatedNodes = [...allNodes];

    if (children.length === 0) {
      // Nodo hoja: solo posicionar el nodo
      const nodeHeight = getNodeHeight(node);
      updatedNodes = updatedNodes.map(n => 
        n.id === nodeId ? { ...n, y: startY } : n
      );
      return { nodes: updatedNodes, blockHeight: nodeHeight };
    }

    // Ordenar hijos por su posición Y actual (mantener orden visual)
    const sortedChildren = [...children].sort((a, b) => a.y - b.y);

    // Calcular la altura total del bloque de hijos
    const childrenBlockHeights = sortedChildren.map(child => 
      calculateBlockHeight(child.id, updatedNodes)
    );
    
    const totalChildrenHeight = childrenBlockHeights.reduce((sum, h, i) => {
      return sum + h + (i < childrenBlockHeights.length - 1 ? BLOCK_MARGIN : 0);
    }, 0);

    // Calcular X de los hijos basado en el ancho REAL del nodo padre
    // Si el nodo tiene manualWidth, usar ese ancho
    const nodeWidth = node.manualWidth || node.width || 160;
    const GAP_BETWEEN_PARENT_CHILD = 120;
    const childrenX = node.x + nodeWidth + GAP_BETWEEN_PARENT_CHILD;
    let currentY = startY;

    for (let i = 0; i < sortedChildren.length; i++) {
      const child = sortedChildren[i];
      
      // Actualizar posición X del hijo basada en el ancho real del padre
      updatedNodes = updatedNodes.map(n => 
        n.id === child.id ? { ...n, x: childrenX } : n
      );

      // Alinear el subárbol del hijo
      const result = alignSubtree(child.id, currentY, updatedNodes);
      updatedNodes = result.nodes;

      // Avanzar Y para el siguiente bloque
      currentY += childrenBlockHeights[i];
      if (i < sortedChildren.length - 1) {
        currentY += BLOCK_MARGIN;
      }
    }

    // Calcular el centro vertical del bloque de hijos
    const blockTop = startY;
    const blockBottom = startY + totalChildrenHeight;
    const blockCenterY = (blockTop + blockBottom) / 2;

    // Posicionar el padre centrado verticalmente respecto a sus hijos
    const parentHeight = getNodeHeight(node);
    const newParentY = blockCenterY - parentHeight / 2;

    // Solo actualizar posición Y, NO el tamaño (respetar tamaño manual)
    updatedNodes = updatedNodes.map(n => 
      n.id === nodeId ? { ...n, y: newParentY } : n
    );

    return { nodes: updatedNodes, blockHeight: totalChildrenHeight };
  }, [getNodeHeight, calculateBlockHeight, BLOCK_MARGIN]);

  // Función principal: alinear toda la jerarquía desde un nodo raíz
  const autoAlignHierarchy = useCallback((rootId, currentNodes) => {
    if (!rootId) return currentNodes;

    const root = currentNodes.find(n => n.id === rootId);
    if (!root) return currentNodes;

    const children = currentNodes.filter(n => n.parentId === rootId);
    if (children.length === 0) return currentNodes;

    console.log('[AutoAlignHierarchy] Alineando subárbol de:', root.text?.substring(0, 20));

    // Ordenar hijos por posición Y actual
    const sortedChildren = [...children].sort((a, b) => a.y - b.y);

    // Calcular la altura de cada bloque hijo
    const childBlockHeights = sortedChildren.map(child => 
      calculateBlockHeight(child.id, currentNodes)
    );

    // Calcular altura total de todos los bloques hijos
    const totalBlocksHeight = childBlockHeights.reduce((sum, h, i) => {
      return sum + h + (i < childBlockHeights.length - 1 ? BLOCK_MARGIN : 0);
    }, 0);

    // Posicionar el primer bloque para que el conjunto quede centrado respecto al padre
    const rootHeight = getNodeHeight(root);
    const rootCenterY = root.y + rootHeight / 2;
    let startY = rootCenterY - totalBlocksHeight / 2;

    // Asegurar que no se posicione muy arriba (mínimo Y = 50)
    startY = Math.max(50, startY);

    let updatedNodes = [...currentNodes];

    // Calcular X de los hijos basado en el ancho REAL del padre
    // Si el padre tiene manualWidth, usar ese ancho; sino usar el ancho actual o el default
    const rootWidth = root.manualWidth || root.width || 160;
    const GAP_BETWEEN_PARENT_CHILD = 120; // Espacio entre el borde derecho del padre y el borde izquierdo de los hijos
    const childrenX = root.x + rootWidth + GAP_BETWEEN_PARENT_CHILD;

    for (let i = 0; i < sortedChildren.length; i++) {
      const child = sortedChildren[i];

      // Actualizar posición X del hijo basada en el ancho real del padre
      updatedNodes = updatedNodes.map(n => 
        n.id === child.id ? { ...n, x: childrenX } : n
      );

      // Alinear el subárbol completo del hijo
      const result = alignSubtree(child.id, startY, updatedNodes);
      updatedNodes = result.nodes;

      // Avanzar al siguiente bloque
      startY += childBlockHeights[i] + BLOCK_MARGIN;
    }

    // Recalcular la posición del nodo raíz para que quede centrado
    const firstChildBlock = sortedChildren[0];
    const lastChildBlock = sortedChildren[sortedChildren.length - 1];
    
    const firstChild = updatedNodes.find(n => n.id === firstChildBlock.id);
    const lastChild = updatedNodes.find(n => n.id === lastChildBlock.id);
    
    if (firstChild && lastChild) {
      // Encontrar el top del primer bloque y el bottom del último
      const allDescendantsYs = [];
      const collectDescendantYs = (nodeId) => {
        const node = updatedNodes.find(n => n.id === nodeId);
        if (node) {
          allDescendantsYs.push(node.y);
          allDescendantsYs.push(node.y + getNodeHeight(node));
        }
        const nodeChildren = updatedNodes.filter(n => n.parentId === nodeId);
        nodeChildren.forEach(c => collectDescendantYs(c.id));
      };
      
      sortedChildren.forEach(c => collectDescendantYs(c.id));
      
      if (allDescendantsYs.length > 0) {
        const blockTop = Math.min(...allDescendantsYs);
        const blockBottom = Math.max(...allDescendantsYs);
        const blockCenterY = (blockTop + blockBottom) / 2;
        const newRootY = blockCenterY - rootHeight / 2;
        
        // Solo actualizar la posición Y del root, NO el tamaño
        // Si el root tiene tamaño manual, respetarlo
        updatedNodes = updatedNodes.map(n => 
          n.id === rootId ? { ...n, y: newRootY } : n
        );
      }
    }

    return updatedNodes;
  }, [getNodeHeight, calculateBlockHeight, alignSubtree, BLOCK_MARGIN]);

  // Aplicar alineación automática a toda la jerarquía desde la raíz
  const applyFullAutoAlignment = useCallback(() => {
    console.log('[AutoAlign] Aplicando alineación jerárquica completa');

    // Encontrar todos los nodos raíz (sin padre)
    const rootNodes = nodes.filter(n => !n.parentId);
    
    let updatedNodes = [...nodes];

    // Para cada nodo raíz, alinear su jerarquía
    rootNodes.forEach(root => {
      const children = updatedNodes.filter(n => n.parentId === root.id);
      if (children.length > 0) {
        updatedNodes = autoAlignHierarchy(root.id, updatedNodes);
      }
    });

    // Actualizar el estado
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: updatedNodes, updatedAt: new Date().toISOString() }
        : p
    ));

    console.log('[AutoAlign] Alineación jerárquica completada');
  }, [nodes, activeProjectId, autoAlignHierarchy]);

  // ==========================================
  // ALGORITMO DE ALINEACIÓN MINDTREE (ORGANIGRAMA)
  // Layout tipo organigrama jerárquico:
  // - Padre arriba, hijos distribuidos HORIZONTALMENTE debajo
  // - Flujo vertical de arriba hacia abajo
  // Patrón visual:
  //         CEO
  //          |
  //    ______|______
  //    |     |     |
  //  Ger1  Ger2  Ger3
  // ==========================================

  // Constantes para MindTree organigrama
  const MINDTREE_VERTICAL_GAP = 100; // Espacio vertical entre niveles
  const MINDTREE_HORIZONTAL_GAP = 40; // Espacio horizontal entre hermanos

  // Calcular el ancho total de un subárbol (para centrar correctamente)
  const calculateSubtreeWidth = useCallback((nodeId, allNodes) => {
    const node = allNodes.find(n => n.id === nodeId);
    if (!node) return 0;

    const children = allNodes.filter(n => n.parentId === nodeId);
    const nodeW = node.width || 160;
    
    if (children.length === 0) {
      return nodeW;
    }

    // Calcular ancho total de todos los hijos (recursivamente)
    let totalChildrenWidth = 0;
    children.forEach((child, index) => {
      totalChildrenWidth += calculateSubtreeWidth(child.id, allNodes);
      if (index < children.length - 1) {
        totalChildrenWidth += MINDTREE_HORIZONTAL_GAP;
      }
    });

    // El ancho del subárbol es el máximo entre el nodo y sus hijos
    return Math.max(nodeW, totalChildrenWidth);
  }, [MINDTREE_HORIZONTAL_GAP]);

  // Alinear subárbol en formato organigrama
  // Hijos distribuidos HORIZONTALMENTE debajo del padre
  const alignSubtreeOrgChart = useCallback((nodeId, centerX, startY, allNodes) => {
    const node = allNodes.find(n => n.id === nodeId);
    if (!node) return { nodes: allNodes, width: 0 };

    const children = allNodes.filter(n => n.parentId === nodeId);
    let updatedNodes = [...allNodes];
    const nodeW = node.width || 160;
    const nodeH = node.height || 64;

    if (children.length === 0) {
      // Nodo hoja: posicionarlo centrado en centerX
      const nodeX = centerX - nodeW / 2;
      updatedNodes = updatedNodes.map(n => 
        n.id === nodeId ? { ...n, x: nodeX, y: startY } : n
      );
      return { nodes: updatedNodes, width: nodeW };
    }

    // Ordenar hijos por posición X actual
    const sortedChildren = [...children].sort((a, b) => a.x - b.x);

    // Calcular anchos de cada subárbol hijo
    const childWidths = sortedChildren.map(child => 
      calculateSubtreeWidth(child.id, updatedNodes)
    );

    // Calcular ancho total de todos los hijos con espaciado
    const totalChildrenWidth = childWidths.reduce((sum, w, i) => {
      return sum + w + (i < childWidths.length - 1 ? MINDTREE_HORIZONTAL_GAP : 0);
    }, 0);

    // Posición Y de los hijos (debajo del padre)
    const childrenY = startY + nodeH + MINDTREE_VERTICAL_GAP;

    // Posición X inicial de los hijos (centrados respecto al padre)
    let currentX = centerX - totalChildrenWidth / 2;

    // Posicionar cada hijo y su subárbol
    for (let i = 0; i < sortedChildren.length; i++) {
      const child = sortedChildren[i];
      const childWidth = childWidths[i];

      // Centro del subárbol hijo
      const childCenterX = currentX + childWidth / 2;

      // Alinear recursivamente el subárbol del hijo
      const result = alignSubtreeOrgChart(child.id, childCenterX, childrenY, updatedNodes);
      updatedNodes = result.nodes;

      // Avanzar X para el siguiente hijo
      currentX += childWidth + MINDTREE_HORIZONTAL_GAP;
    }

    // Posicionar el nodo padre centrado sobre sus hijos
    const parentX = centerX - nodeW / 2;
    updatedNodes = updatedNodes.map(n => 
      n.id === nodeId ? { ...n, x: parentX, y: startY } : n
    );

    return { nodes: updatedNodes, width: Math.max(nodeW, totalChildrenWidth) };
  }, [getNodeHeight, calculateSubtreeWidth, MINDTREE_VERTICAL_GAP, MINDTREE_HORIZONTAL_GAP]);

  // Función principal: alinear toda la jerarquía MindTree (Organigrama)
  const autoAlignMindTree = useCallback((rootId, currentNodes) => {
    if (!rootId) return currentNodes;

    const root = currentNodes.find(n => n.id === rootId);
    if (!root) return currentNodes;

    console.log('[MindTree Organigrama] Alineando desde:', root.text?.substring(0, 20));

    // Calcular el ancho total del árbol para centrar
    const treeWidth = calculateSubtreeWidth(rootId, currentNodes);
    
    // Centrar el árbol en X = 400 (o usar la posición actual del root)
    const centerX = Math.max(400, root.x + (root.width || 160) / 2);
    
    const result = alignSubtreeOrgChart(rootId, centerX, root.y, currentNodes);
    
    return result.nodes;
  }, [calculateSubtreeWidth, alignSubtreeOrgChart]);

  // Aplicar alineación automática MindTree completa
  const applyFullMindTreeAlignment = useCallback(() => {
    console.log('[MindTree] Aplicando alineación de organigrama');

    const rootNodes = nodes.filter(n => !n.parentId);
    
    if (rootNodes.length === 0) {
      console.log('[MindTree] No hay nodos raíz');
      return;
    }

    let updatedNodes = [...nodes];
    let currentY = 100;

    // Para cada nodo raíz, alinear su jerarquía
    rootNodes.forEach((root) => {
      // Calcular ancho del árbol para centrar
      const treeWidth = calculateSubtreeWidth(root.id, updatedNodes);
      const centerX = Math.max(400, treeWidth / 2 + 100);

      const result = alignSubtreeOrgChart(root.id, centerX, currentY, updatedNodes);
      updatedNodes = result.nodes;

      // Calcular altura del árbol para el siguiente root
      const getTreeDepth = (nodeId, depth = 0) => {
        const children = updatedNodes.filter(n => n.parentId === nodeId);
        if (children.length === 0) return depth;
        return Math.max(...children.map(c => getTreeDepth(c.id, depth + 1)));
      };
      const treeDepth = getTreeDepth(root.id);
      currentY += (treeDepth + 1) * (64 + MINDTREE_VERTICAL_GAP) + 50;
    });

    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: updatedNodes, updatedAt: new Date().toISOString() }
        : p
    ));

    console.log('[MindTree] Alineación completada');
  }, [nodes, activeProjectId, calculateSubtreeWidth, alignSubtreeOrgChart, MINDTREE_VERTICAL_GAP]);

  // ==========================================
  // MINDAXIS LAYOUT - EJE CENTRAL BALANCEADO
  // ==========================================
  
  // Constantes para MindAxis
  const MINDAXIS_H_GAP = 120; // Espacio horizontal entre nodo central y ramas
  const MINDAXIS_V_GAP = 70;  // Espacio vertical entre nodos del mismo lado
  const MINDAXIS_LEVEL_GAP = 200; // Espacio horizontal entre niveles
  
  // Función de alineación automática para MindAxis
  const autoAlignMindAxis = useCallback((rootId, currentNodes) => {
    const root = currentNodes.find(n => n.id === rootId);
    if (!root) return currentNodes;
    
    console.log('[MindAxis] Alineando desde nodo central:', root.text?.substring(0, 20));
    
    let updatedNodes = [...currentNodes];
    
    // Obtener hijos directos del nodo central
    const directChildren = updatedNodes.filter(n => n.parentId === rootId);
    
    // Separar por lado
    const leftChildren = directChildren.filter(n => n.axisSide === 'left');
    const rightChildren = directChildren.filter(n => n.axisSide === 'right');
    
    // Función recursiva para calcular altura total de un subárbol
    const calculateSubtreeHeight = (nodeId) => {
      const node = updatedNodes.find(n => n.id === nodeId);
      if (!node) return 0;
      
      const children = updatedNodes.filter(n => n.parentId === nodeId);
      if (children.length === 0) return node.height || 64;
      
      const childrenHeight = children.reduce((sum, child) => 
        sum + calculateSubtreeHeight(child.id) + MINDAXIS_V_GAP, 0) - MINDAXIS_V_GAP;
      
      return Math.max(node.height || 64, childrenHeight);
    };
    
    // Función recursiva para posicionar subárbol
    const positionSubtree = (nodeId, startX, startY, side) => {
      const node = updatedNodes.find(n => n.id === nodeId);
      if (!node) return startY;
      
      const children = updatedNodes.filter(n => n.parentId === nodeId);
      
      // Calcular altura del subárbol para centrar el nodo
      const subtreeHeight = calculateSubtreeHeight(nodeId);
      const nodeHeight = node.height || 64;
      
      // Posicionar el nodo actual
      const nodeIdx = updatedNodes.findIndex(n => n.id === nodeId);
      if (nodeIdx !== -1) {
        updatedNodes[nodeIdx] = {
          ...updatedNodes[nodeIdx],
          x: startX,
          y: children.length > 0 ? startY + (subtreeHeight - nodeHeight) / 2 : startY,
          axisSide: side
        };
      }
      
      if (children.length === 0) return startY + nodeHeight;
      
      // Posicionar hijos
      let currentY = startY;
      const childX = side === 'left' 
        ? startX - MINDAXIS_LEVEL_GAP 
        : startX + (node.width || 160) + MINDAXIS_H_GAP;
      
      children.forEach(child => {
        const childHeight = calculateSubtreeHeight(child.id);
        positionSubtree(child.id, childX, currentY, side);
        currentY += childHeight + MINDAXIS_V_GAP;
      });
      
      return startY + subtreeHeight;
    };
    
    // Calcular altura total de cada lado
    const leftTotalHeight = leftChildren.reduce((sum, child) => 
      sum + calculateSubtreeHeight(child.id) + MINDAXIS_V_GAP, 0) - (leftChildren.length > 0 ? MINDAXIS_V_GAP : 0);
    const rightTotalHeight = rightChildren.reduce((sum, child) => 
      sum + calculateSubtreeHeight(child.id) + MINDAXIS_V_GAP, 0) - (rightChildren.length > 0 ? MINDAXIS_V_GAP : 0);
    
    // Posición Y del nodo central (centrado entre ambos lados)
    const maxHeight = Math.max(leftTotalHeight, rightTotalHeight, root.height || 64);
    const rootY = root.y; // Mantener Y del root o usar la existente
    
    // Posicionar lado izquierdo
    let leftStartY = rootY - (leftTotalHeight / 2) + ((root.height || 64) / 2);
    leftChildren.forEach(child => {
      const childHeight = calculateSubtreeHeight(child.id);
      positionSubtree(
        child.id, 
        root.x - MINDAXIS_H_GAP - (child.width || 160), 
        leftStartY, 
        'left'
      );
      leftStartY += childHeight + MINDAXIS_V_GAP;
    });
    
    // Posicionar lado derecho
    let rightStartY = rootY - (rightTotalHeight / 2) + ((root.height || 64) / 2);
    rightChildren.forEach(child => {
      const childHeight = calculateSubtreeHeight(child.id);
      positionSubtree(
        child.id, 
        root.x + (root.width || 160) + MINDAXIS_H_GAP, 
        rightStartY, 
        'right'
      );
      rightStartY += childHeight + MINDAXIS_V_GAP;
    });
    
    return updatedNodes;
  }, []);
  
  // Aplicar alineación completa MindAxis
  const applyFullMindAxisAlignment = useCallback(() => {
    console.log('[MindAxis] Aplicando alineación de eje central');
    const rootNodes = nodes.filter(n => !n.parentId);
    
    if (rootNodes.length === 0) {
      console.log('[MindAxis] No hay nodos raíz');
      return;
    }
    
    let updatedNodes = [...nodes];
    rootNodes.forEach(root => {
      updatedNodes = autoAlignMindAxis(root.id, updatedNodes);
    });
    
    pushToHistory(activeProjectId, updatedNodes);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: updatedNodes, updatedAt: new Date().toISOString() }
        : p
    ));
    
    console.log('[MindAxis] Alineación completada');
  }, [nodes, activeProjectId, autoAlignMindAxis, pushToHistory]);

  // ==========================================
  // MINDORBIT LAYOUT - DISTRIBUCIÓN RADIAL
  // ==========================================
  
  // Función de alineación automática para MindOrbit (nodos circulares en órbita)
  const autoAlignMindOrbit = useCallback((rootId, currentNodes) => {
    const root = currentNodes.find(n => n.id === rootId);
    if (!root) return currentNodes;
    
    console.log('[MindOrbit] Alineando desde nodo central:', root.text?.substring(0, 20));
    
    let updatedNodes = [...currentNodes];
    
    // Tamaño base para nodos circulares
    const CIRCLE_SIZE = 100;
    
    // Función recursiva para alinear subárbol radial
    const alignRadialSubtree = (nodeId, centerX, centerY, radius, startAngle = 0) => {
      const children = updatedNodes.filter(n => n.parentId === nodeId);
      if (children.length === 0) return;
      
      // Distribuir uniformemente en 360°
      const angleStep = (2 * Math.PI) / children.length;
      // Offset para empezar desde arriba (-PI/2)
      const angleOffset = -Math.PI / 2;
      
      children.forEach((child, index) => {
        const angle = angleOffset + startAngle + (index * angleStep);
        const childX = centerX + Math.cos(angle) * radius - CIRCLE_SIZE / 2;
        const childY = centerY + Math.sin(angle) * radius - CIRCLE_SIZE / 2;
        
        // Actualizar posición del hijo
        const childIndex = updatedNodes.findIndex(n => n.id === child.id);
        if (childIndex !== -1) {
          updatedNodes[childIndex] = {
            ...updatedNodes[childIndex],
            x: childX,
            y: childY,
            width: CIRCLE_SIZE,
            height: CIRCLE_SIZE
          };
        }
        
        // Alinear recursivamente los hijos del hijo con radio menor
        const subRadius = radius * 0.7; // Radio reducido para subniveles
        const childCenterX = childX + CIRCLE_SIZE / 2;
        const childCenterY = childY + CIRCLE_SIZE / 2;
        alignRadialSubtree(child.id, childCenterX, childCenterY, subRadius, angle);
      });
    };
    
    // Obtener hijos directos del nodo central
    const directChildren = updatedNodes.filter(n => n.parentId === rootId);
    
    if (directChildren.length > 0) {
      // Actualizar tamaño del nodo raíz (más grande)
      const rootIndex = updatedNodes.findIndex(n => n.id === rootId);
      const ROOT_SIZE = CIRCLE_SIZE * 1.3;
      if (rootIndex !== -1) {
        updatedNodes[rootIndex] = {
          ...updatedNodes[rootIndex],
          width: ROOT_SIZE,
          height: ROOT_SIZE
        };
      }
      
      const rootCenterX = root.x + ROOT_SIZE / 2;
      const rootCenterY = root.y + ROOT_SIZE / 2;
      const orbitRadius = 150; // Radio compacto de la órbita
      
      alignRadialSubtree(rootId, rootCenterX, rootCenterY, orbitRadius);
    }
    
    return updatedNodes;
  }, []);
  
  // Aplicar alineación completa MindOrbit
  const applyFullMindOrbitAlignment = useCallback(() => {
    console.log('[MindOrbit] Aplicando alineación radial');
    const rootNodes = nodes.filter(n => !n.parentId);
    
    if (rootNodes.length === 0) {
      console.log('[MindOrbit] No hay nodos raíz');
      return;
    }
    
    let updatedNodes = [...nodes];
    rootNodes.forEach(root => {
      updatedNodes = autoAlignMindOrbit(root.id, updatedNodes);
    });
    
    pushToHistory(activeProjectId, updatedNodes);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: updatedNodes, updatedAt: new Date().toISOString() }
        : p
    ));
    
    console.log('[MindOrbit] Alineación completada');
  }, [nodes, activeProjectId, autoAlignMindOrbit, pushToHistory]);

  // Alinear nodos abajo
  const alignNodesBottom = useCallback(() => {
    const selectedNodes = getSelectedNodes();
    if (selectedNodes.length < 2) return;

    const maxBottom = Math.max(...selectedNodes.map(n => n.y + (n.height || 64)));
    const newNodes = nodes.map(n => {
      if (selectedNodeIds.has(n.id)) {
        return { ...n, y: maxBottom - (n.height || 64) };
      }
      return n;
    });

    pushToHistory(activeProjectId, newNodes);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
  }, [nodes, selectedNodeIds, activeProjectId, pushToHistory, getSelectedNodes]);

  // Distribuir nodos verticalmente (espaciado uniforme)
  // El espacio entre el bottom de un nodo y el top del siguiente será siempre el mismo
  const distributeNodesVertically = useCallback(() => {
    const selectedNodes = getSelectedNodes();
    
    if (selectedNodes.length < 2) {
      console.log('[distributeNodesVertically] Se necesitan al menos 2 nodos para distribuir verticalmente');
      return;
    }

    console.log('[distributeNodesVertically] Distribuyendo', selectedNodes.length, 'nodos verticalmente');

    // Función para obtener la altura del nodo
    // Usa la altura almacenada o estima basándose en el contenido
    const getNodeHeight = (node) => {
      // Si el nodo tiene altura almacenada (actualizada por el render), usarla
      if (node.height && node.height > 0) {
        return node.height;
      }
      
      // Fallback: estimar altura basada en el contenido del texto
      const baseHeight = 64;
      const text = node.text || '';
      const nodeWidth = node.width || 160;
      const charsPerLine = Math.floor(nodeWidth / 9);
      const estimatedLines = Math.max(1, Math.ceil(text.length / charsPerLine));
      return Math.max(baseHeight, 30 + (estimatedLines * 22));
    };

    // 1. Ordenar nodos por posición Y (de arriba hacia abajo)
    const sortedNodes = [...selectedNodes].sort((a, b) => a.y - b.y);
    
    // 2. Obtener las referencias del primer y último nodo
    const firstNode = sortedNodes[0];
    const lastNode = sortedNodes[sortedNodes.length - 1];
    
    // 3. Calcular topY y bottomY
    const topY = firstNode.y;
    const lastNodeHeight = getNodeHeight(lastNode);
    const bottomY = lastNode.y + lastNodeHeight;
    
    // 4. Calcular la suma de las alturas de todos los nodos
    const totalHeights = sortedNodes.reduce((sum, n) => sum + getNodeHeight(n), 0);
    
    // 5. Calcular el espacio uniforme entre nodos
    const N = sortedNodes.length;
    const espacio = (bottomY - topY - totalHeights) / (N - 1);
    
    console.log('[distributeNodesVertically] topY:', topY, 'bottomY:', bottomY);
    console.log('[distributeNodesVertically] totalHeights:', totalHeights, 'N:', N);
    console.log('[distributeNodesVertically] Espacio uniforme calculado:', espacio);

    // 6. Reposicionar cada nodo
    const newPositions = new Map();
    let currentY = topY;
    
    sortedNodes.forEach((node) => {
      newPositions.set(node.id, currentY);
      currentY += getNodeHeight(node) + espacio;
    });

    // 7. Aplicar las nuevas posiciones (solo Y, X no cambia)
    const newNodes = nodes.map(n => {
      if (newPositions.has(n.id)) {
        return { ...n, y: newPositions.get(n.id) };
      }
      return n;
    });

    pushToHistory(activeProjectId, newNodes);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
    
    console.log('[distributeNodesVertically] Distribución completada');
  }, [nodes, selectedNodeIds, activeProjectId, pushToHistory, getSelectedNodes]);

  // Distribuir nodos horizontalmente (espaciado uniforme) - Preparado para futuro uso
  const distributeNodesHorizontally = useCallback(() => {
    const selectedNodes = getSelectedNodes();
    
    if (selectedNodes.length < 2) {
      console.log('[distributeNodesHorizontally] Se necesitan al menos 2 nodos para distribuir horizontalmente');
      return;
    }

    console.log('[distributeNodesHorizontally] Distribuyendo', selectedNodes.length, 'nodos horizontalmente');

    // Ordenar nodos por posición X (de izquierda a derecha)
    const sortedNodes = [...selectedNodes].sort((a, b) => a.x - b.x);
    
    // Obtener el nodo más a la izquierda y el más a la derecha
    const leftNode = sortedNodes[0];
    const rightNode = sortedNodes[sortedNodes.length - 1];
    
    // Calcular el ancho total del área de distribución
    const leftX = leftNode.x;
    const rightX = rightNode.x + (rightNode.width || 160);
    const totalWidth = rightX - leftX;
    
    // Calcular la suma de los anchos de todos los nodos
    const totalNodesWidth = sortedNodes.reduce((sum, n) => sum + (n.width || 160), 0);
    
    // Calcular el espacio disponible para distribuir
    const availableSpace = totalWidth - totalNodesWidth;
    
    // Calcular el espaciado uniforme entre nodos
    const spacing = availableSpace / (sortedNodes.length - 1);

    // Crear mapa de nuevas posiciones X
    const newPositions = new Map();
    let currentX = leftX;
    
    sortedNodes.forEach((node, index) => {
      if (index === 0) {
        newPositions.set(node.id, leftX);
      } else {
        newPositions.set(node.id, currentX);
      }
      currentX += (node.width || 160) + spacing;
    });

    // Aplicar las nuevas posiciones (solo X, Y no cambia)
    const newNodes = nodes.map(n => {
      if (newPositions.has(n.id)) {
        return { ...n, x: newPositions.get(n.id) };
      }
      return n;
    });

    pushToHistory(activeProjectId, newNodes);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
    
    console.log('[distributeNodesHorizontally] Distribución completada');
  }, [nodes, selectedNodeIds, activeProjectId, pushToHistory, getSelectedNodes]);

  // Mover nodos seleccionados en grupo
  const moveSelectedNodes = useCallback((deltaX, deltaY) => {
    const idsToMove = selectedNodeIds.size > 0 
      ? Array.from(selectedNodeIds) 
      : (selectedNodeId ? [selectedNodeId] : []);
    
    if (idsToMove.length === 0) return;

    // Actualización rápida sin modificar updatedAt durante el drag
    setProjects(prev => prev.map(p => {
      if (p.id !== activeProjectId) return p;
      return {
        ...p,
        nodes: p.nodes.map(n => 
          idsToMove.includes(n.id) 
            ? { ...n, x: n.x + deltaX, y: n.y + deltaY }
            : n
        )
      };
    }));
  }, [selectedNodeId, selectedNodeIds, activeProjectId]);

  // ==========================================
  // FUNCIONES DE ALINEACIÓN DE TEXTO
  // (Cambian la propiedad textAlign dentro del nodo, NO mueven el nodo)
  // ==========================================

  // Alinear texto a la izquierda
  const alignTextLeft = useCallback(() => {
    const selectedNodes = getSelectedNodes();
    if (selectedNodes.length < 1) return;

    console.log('[alignTextLeft] Alineando texto de', selectedNodes.length, 'nodos a la izquierda');

    const newNodes = nodes.map(n => {
      if (selectedNodeIds.has(n.id)) {
        return { ...n, textAlign: 'left' };
      }
      return n;
    });

    pushToHistory(activeProjectId, newNodes);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
  }, [nodes, selectedNodeIds, activeProjectId, pushToHistory, getSelectedNodes]);

  // Alinear texto al centro
  const alignTextCenter = useCallback(() => {
    const selectedNodes = getSelectedNodes();
    if (selectedNodes.length < 1) return;

    console.log('[alignTextCenter] Alineando texto de', selectedNodes.length, 'nodos al centro');

    const newNodes = nodes.map(n => {
      if (selectedNodeIds.has(n.id)) {
        return { ...n, textAlign: 'center' };
      }
      return n;
    });

    pushToHistory(activeProjectId, newNodes);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
  }, [nodes, selectedNodeIds, activeProjectId, pushToHistory, getSelectedNodes]);

  // Alinear texto a la derecha
  const alignTextRight = useCallback(() => {
    const selectedNodes = getSelectedNodes();
    if (selectedNodes.length < 1) return;

    console.log('[alignTextRight] Alineando texto de', selectedNodes.length, 'nodos a la derecha');

    const newNodes = nodes.map(n => {
      if (selectedNodeIds.has(n.id)) {
        return { ...n, textAlign: 'right' };
      }
      return n;
    });

    pushToHistory(activeProjectId, newNodes);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
  }, [nodes, selectedNodeIds, activeProjectId, pushToHistory, getSelectedNodes]);

  // ==========================================
  // FUNCIONES DE ALINEACIÓN DE TEXTO PARA NODO INDIVIDUAL
  // (Para uso desde el NodeToolbar cuando hay un solo nodo seleccionado)
  // ==========================================

  const alignSingleNodeTextLeft = useCallback((nodeId) => {
    if (!nodeId) return;
    console.log('[alignSingleNodeTextLeft] Alineando texto del nodo', nodeId, 'a la izquierda');

    const newNodes = nodes.map(n => 
      n.id === nodeId ? { ...n, textAlign: 'left' } : n
    );

    pushToHistory(activeProjectId, newNodes);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
  }, [nodes, activeProjectId, pushToHistory]);

  const alignSingleNodeTextCenter = useCallback((nodeId) => {
    if (!nodeId) return;
    console.log('[alignSingleNodeTextCenter] Alineando texto del nodo', nodeId, 'al centro');

    const newNodes = nodes.map(n => 
      n.id === nodeId ? { ...n, textAlign: 'center' } : n
    );

    pushToHistory(activeProjectId, newNodes);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
  }, [nodes, activeProjectId, pushToHistory]);

  const alignSingleNodeTextRight = useCallback((nodeId) => {
    if (!nodeId) return;
    console.log('[alignSingleNodeTextRight] Alineando texto del nodo', nodeId, 'a la derecha');

    const newNodes = nodes.map(n => 
      n.id === nodeId ? { ...n, textAlign: 'right' } : n
    );

    pushToHistory(activeProjectId, newNodes);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
  }, [nodes, activeProjectId, pushToHistory]);

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

  const addNode = useCallback((parentId = null, position = null, options = {}) => {
    const newId = crypto.randomUUID();
    const autoAlignAfter = options?.autoAlign || false;
    
    setProjects(prev => {
      const project = prev.find(p => p.id === activeProjectId);
      if (!project) {
        console.error('No active project found');
        return prev;
      }
      
      const currentNodes = project.nodes;
      const layoutType = project.layoutType || 'mindflow';
      
      let newX = 400;
      let newY = layoutType === 'mindtree' ? 100 : 300;
      
      // Para MindAxis: propiedades adicionales
      let axisSide = null;
      
      if (parentId) {
        const parent = currentNodes.find(n => n.id === parentId);
        if (parent) {
          const siblings = currentNodes.filter(n => n.parentId === parentId);
          
          if (layoutType === 'mindaxis') {
            // MindAxis: distribución balanceada izquierda/derecha
            const isRoot = !parent.parentId;
            
            if (isRoot) {
              // Nodos de primer nivel: alternar entre izquierda y derecha
              const leftSiblings = siblings.filter(s => s.axisSide === 'left');
              const rightSiblings = siblings.filter(s => s.axisSide === 'right');
              
              // Alternar lado para balance
              if (leftSiblings.length <= rightSiblings.length) {
                axisSide = 'left';
                newX = parent.x - 280;
                newY = parent.y + (leftSiblings.length * 90) - ((leftSiblings.length - 1) * 45);
              } else {
                axisSide = 'right';
                newX = parent.x + (parent.width || 160) + 120;
                newY = parent.y + (rightSiblings.length * 90) - ((rightSiblings.length - 1) * 45);
              }
            } else {
              // Subnodos: heredan el lado del padre y se extienden
              axisSide = parent.axisSide || 'right';
              const verticalGap = 70;
              
              if (axisSide === 'left') {
                newX = parent.x - 200;
                if (siblings.length === 0) {
                  newY = parent.y;
                } else {
                  const bottommostSibling = siblings.reduce((max, s) => 
                    (s.y + (s.height || 64)) > (max.y + (max.height || 64)) ? s : max, siblings[0]);
                  newY = bottommostSibling.y + (bottommostSibling.height || 64) + verticalGap;
                }
              } else {
                newX = parent.x + (parent.width || 160) + 120;
                if (siblings.length === 0) {
                  newY = parent.y;
                } else {
                  const bottommostSibling = siblings.reduce((max, s) => 
                    (s.y + (s.height || 64)) > (max.y + (max.height || 64)) ? s : max, siblings[0]);
                  newY = bottommostSibling.y + (bottommostSibling.height || 64) + verticalGap;
                }
              }
            }
          } else if (layoutType === 'mindorbit') {
            // MindOrbit: distribución radial alrededor del nodo central
            const isRoot = !parent.parentId;
            
            if (isRoot) {
              // Nodos de primer nivel: distribución radial alrededor del centro
              const radius = 200; // Radio de la órbita
              const centerX = parent.x + (parent.width || 160) / 2;
              const centerY = parent.y + (parent.height || 64) / 2;
              
              // Calcular ángulo para el nuevo nodo
              const angleStep = (2 * Math.PI) / Math.max(6, siblings.length + 1); // Mínimo 6 posiciones
              const angle = siblings.length * angleStep;
              
              newX = centerX + Math.cos(angle) * radius - (160 / 2); // Centrar el nodo
              newY = centerY + Math.sin(angle) * radius - (64 / 2);
            } else {
              // Subnodos: se extienden radialmente desde su padre
              const subRadius = 120;
              const parentCenterX = parent.x + (parent.width || 160) / 2;
              const parentCenterY = parent.y + (parent.height || 64) / 2;
              
              // Para subnodos, usar un radio menor y distribuir alrededor del padre
              const angleStep = (2 * Math.PI) / Math.max(4, siblings.length + 1);
              const angle = siblings.length * angleStep;
              
              newX = parentCenterX + Math.cos(angle) * subRadius - (160 / 2);
              newY = parentCenterY + Math.sin(angle) * subRadius - (64 / 2);
            }
          } else if (layoutType === 'mindtree') {
            // MindTree (Organigrama): hijos distribuidos HORIZONTALMENTE debajo del padre
            // Nuevo hijo se coloca a la derecha de los hermanos existentes
            const parentHeight = parent.height || 64;
            const horizontalGap = 40;
            
            if (siblings.length === 0) {
              // Primer hijo: centrado debajo del padre
              newX = parent.x;
              newY = parent.y + parentHeight + 100;
            } else {
              // Encontrar el hermano más a la derecha
              const rightmostSibling = siblings.reduce((max, s) => 
                (s.x + (s.width || 160)) > (max.x + (max.width || 160)) ? s : max, siblings[0]);
              newX = rightmostSibling.x + (rightmostSibling.width || 160) + horizontalGap;
              newY = rightmostSibling.y; // Misma altura que los hermanos
            }
          } else {
            // MindFlow: hijos a la derecha del padre, distribuidos verticalmente
            newX = parent.x + 280;
            newY = parent.y + (siblings.length * 100) - 50;
          }
        }
      } else if (position) {
        newX = position.x;
        newY = position.y;
      }

      // Obtener valores por defecto de configuración
      const getNodeDefaults = () => {
        try {
          const saved = localStorage.getItem('mindora_node_defaults');
          if (saved) {
            const settings = JSON.parse(saved);
            const defaults = {};
            if (settings.showIconByDefault && settings.defaultIcon) {
              defaults.icon = settings.defaultIcon;
            }
            if (settings.textAlignLeft) {
              defaults.textAlign = 'left';
            }
            return defaults;
          }
        } catch (e) {
          console.warn('Error loading node defaults:', e);
        }
        // Valores por defecto si no hay configuración guardada
        return {
          icon: { name: 'CircleCheck', color: '#64748b' },
          textAlign: 'left'
        };
      };

      const nodeDefaults = getNodeDefaults();

      const newNode = {
        id: newId,
        text: (options?.nodeType === 'dashed' || options?.nodeType === 'dashed_text') ? '' : 'Nuevo Nodo', // Texto vacío para dashed (mostrará placeholder)
        x: newX,
        y: newY,
        color: 'blue',
        parentId,
        width: (options?.nodeType === 'dashed' || options?.nodeType === 'dashed_text') ? 260 : 160,
        height: (options?.nodeType === 'dashed' || options?.nodeType === 'dashed_text') ? 40 : 64,
        // Normalizar 'dashed' a 'dashed_text' para nuevos nodos
        nodeType: options?.nodeType === 'dashed' ? 'dashed_text' : (options?.nodeType || 'default'), // 'default' | 'dashed_text'
        // MindAxis: guardar el lado del eje
        ...(axisSide && { axisSide }),
        // Aplicar valores por defecto (ícono y alineación)
        ...nodeDefaults
      };

      console.log('Creating new node:', newNode, 'Layout:', layoutType);
      
      // Agregar el nuevo nodo
      let newNodes = [...currentNodes, newNode];
      
      // Si autoAlign está activo, aplicar alineación según el tipo de layout
      if (autoAlignAfter && parentId) {
        console.log('[addNode] Aplicando alineación después de crear nodo. Layout:', layoutType);
        // Encontrar el nodo raíz de esta jerarquía
        let currentParentId = parentId;
        let rootId = parentId;
        while (currentParentId) {
          const parent = newNodes.find(n => n.id === currentParentId);
          if (parent && parent.parentId) {
            currentParentId = parent.parentId;
            rootId = parent.parentId;
          } else {
            break;
          }
        }
        // Aplicar alineación según el tipo de layout
        if (layoutType === 'mindtree') {
          newNodes = autoAlignMindTree(rootId, newNodes);
        } else if (layoutType === 'mindaxis') {
          newNodes = autoAlignMindAxis(rootId, newNodes);
        } else if (layoutType === 'mindorbit') {
          newNodes = autoAlignMindOrbit(rootId, newNodes);
        } else {
          newNodes = autoAlignHierarchy(rootId, newNodes);
        }
      }
      
      // Guardar el NUEVO estado en el historial (después del cambio)
      pushToHistory(activeProjectId, newNodes);

      return prev.map(p => 
        p.id === activeProjectId 
          ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
          : p
      );
    });

    setSelectedNodeId(newId);
    return newId;
  }, [activeProjectId, pushToHistory, autoAlignHierarchy, autoAlignMindTree]);

  // ==========================================
  // FUNCIONES ESPECÍFICAS PARA MINDHYBRID
  // ==========================================

  // Agregar nodo hijo en dirección HORIZONTAL (a la derecha)
  const addNodeHorizontal = useCallback((parentId, options = {}) => {
    if (!parentId) return null;
    
    const newId = crypto.randomUUID();
    
    setProjects(prev => {
      const project = prev.find(p => p.id === activeProjectId);
      if (!project) return prev;
      
      const currentNodes = project.nodes;
      const parent = currentNodes.find(n => n.id === parentId);
      if (!parent) return prev;
      
      // Filtrar hermanos horizontales
      const horizontalSiblings = currentNodes.filter(n => 
        n.parentId === parentId && n.childDirection === 'horizontal'
      );
      
      const parentWidth = parent.width || 160;
      const parentHeight = parent.height || 64;
      const newNodeHeight = 64;
      const horizontalGap = 280; // Distancia horizontal del padre
      const verticalSpacing = 80; // Espacio vertical entre hermanos horizontales
      
      // Posición X: a la derecha del padre
      const newX = parent.x + parentWidth + horizontalGap - parentWidth;
      
      // Posición Y: El PRIMER nodo se centra verticalmente con el padre
      // Los siguientes se apilan hacia abajo
      // El centro del padre está en parent.y + parentHeight/2
      // El centro del nuevo nodo debe estar en esa misma Y
      // Entonces: newNode.y + newNodeHeight/2 = parent.y + parentHeight/2
      // newNode.y = parent.y + parentHeight/2 - newNodeHeight/2
      const parentCenterY = parent.y + parentHeight / 2;
      const baseY = parentCenterY - newNodeHeight / 2; // Y donde el centro del nodo se alinea con el centro del padre
      const newY = baseY + (horizontalSiblings.length * verticalSpacing);
      
      // Obtener valores por defecto de configuración
      const getNodeDefaults = () => {
        try {
          const saved = localStorage.getItem('mindora_node_defaults');
          if (saved) {
            const settings = JSON.parse(saved);
            const defaults = {};
            if (settings.showIconByDefault && settings.defaultIcon) {
              defaults.icon = settings.defaultIcon;
            }
            if (settings.textAlignLeft) {
              defaults.textAlign = 'left';
            }
            return defaults;
          }
        } catch (e) { /* ignore */ }
        return { icon: { name: 'CircleCheck', color: '#64748b' }, textAlign: 'left' };
      };
      const nodeDefaults = getNodeDefaults();

      const newNode = {
        id: newId,
        text: 'Nuevo Nodo',
        x: newX,
        y: newY,
        color: 'blue',
        parentId,
        width: 160,
        height: newNodeHeight,
        nodeType: options?.nodeType || 'default',
        childDirection: 'horizontal', // Marca la dirección
        ...nodeDefaults
      };
      
      console.log('[MindHybrid] Creando nodo HORIZONTAL:', newNode);
      
      let newNodes = [...currentNodes, newNode];
      
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

  // Agregar nodo hijo en dirección VERTICAL (abajo)
  const addNodeVertical = useCallback((parentId, options = {}) => {
    if (!parentId) return null;
    
    const newId = crypto.randomUUID();
    
    setProjects(prev => {
      const project = prev.find(p => p.id === activeProjectId);
      if (!project) return prev;
      
      let currentNodes = [...project.nodes];
      const parent = currentNodes.find(n => n.id === parentId);
      if (!parent) return prev;
      
      const parentWidth = parent.width || 160;
      const parentHeight = parent.height || 64;
      const nodeWidth = 160;
      const nodeHeight = 64;
      const verticalGap = 100;
      const minSpacing = 180;
      const margin = 60;
      
      // Función para calcular ancho total de subárbol
      const getSubtreeWidth = (nodeId, nodes) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return nodeWidth;
        
        const vertKids = nodes.filter(n => 
          n.parentId === nodeId && n.childDirection === 'vertical' && !n.connectorParentId
        );
        const horizKids = nodes.filter(n => 
          n.parentId === nodeId && n.childDirection === 'horizontal' && !n.connectorParentId
        );
        
        let vertWidth = nodeWidth;
        if (vertKids.length > 0) {
          const kidWidths = vertKids.map(k => getSubtreeWidth(k.id, nodes));
          vertWidth = kidWidths.reduce((s, w) => s + w, 0) + (vertKids.length - 1) * minSpacing;
        }
        
        let horizMaxWidth = 0;
        horizKids.forEach(child => {
          horizMaxWidth = Math.max(horizMaxWidth, getSubtreeWidth(child.id, nodes));
        });
        
        return Math.max(nodeWidth, vertWidth, horizMaxWidth);
      };
      
      // Crear el nuevo nodo con posición temporal
      const newY = parent.y + parentHeight + verticalGap;
      
      // Obtener valores por defecto de configuración
      const getNodeDefaults = () => {
        try {
          const saved = localStorage.getItem('mindora_node_defaults');
          if (saved) {
            const settings = JSON.parse(saved);
            const defaults = {};
            if (settings.showIconByDefault && settings.defaultIcon) {
              defaults.icon = settings.defaultIcon;
            }
            if (settings.textAlignLeft) {
              defaults.textAlign = 'left';
            }
            return defaults;
          }
        } catch (e) { /* ignore */ }
        return { icon: { name: 'CircleCheck', color: '#64748b' }, textAlign: 'left' };
      };
      const nodeDefaults = getNodeDefaults();

      const newNode = {
        id: newId,
        text: 'Nuevo Nodo',
        x: parent.x + parentWidth / 2 - nodeWidth / 2,
        y: newY,
        color: 'blue',
        parentId,
        width: nodeWidth,
        height: nodeHeight,
        nodeType: options?.nodeType || 'default',
        childDirection: 'vertical',
        ...nodeDefaults
      };
      
      // Agregar el nuevo nodo
      let newNodes = [...currentNodes, newNode];
      
      // =====================================================
      // REALINEAR COMPLETAMENTE DESDE LA RAÍZ
      // =====================================================
      
      // Encontrar la raíz
      const findRoot = (nodeId, nodes) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node || !node.parentId) return nodeId;
        return findRoot(node.parentId, nodes);
      };
      
      const rootId = findRoot(parentId, newNodes);
      
      // Función recursiva para alinear todo el árbol
      const alignFromRoot = (nodeId, nodes) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return nodes;
        
        let aligned = [...nodes];
        
        const pWidth = node.width || 160;
        const pHeight = node.height || 64;
        const cWidth = 160;
        const vGap = 100;
        const hGap = 200;
        
        const nodeCenterX = node.x + pWidth / 2;
        const nodeCenterY = node.y + pHeight / 2;
        
        // === HIJOS HORIZONTALES ===
        // NOTA: Incluimos TODOS los hijos horizontales, incluyendo los creados desde conectores
        // porque sus propios hijos también necesitan ser alineados
        const hChildren = aligned.filter(n => 
          n.parentId === nodeId && n.childDirection === 'horizontal'
        ).sort((a, b) => a.y - b.y);
        
        if (hChildren.length > 0) {
          // Calcular anchos de subárboles horizontales
          const hSubtreeData = hChildren.map(c => ({
            id: c.id,
            width: getSubtreeWidth(c.id, aligned)
          }));
          
          // Posicionar con espacio Y suficiente
          let currentY = nodeCenterY - 32;
          hSubtreeData.forEach((data, idx) => {
            if (idx > 0) {
              const prevData = hSubtreeData[idx - 1];
              const spacing = Math.max(100, (prevData.width / 2) + margin + (data.width / 2));
              currentY += spacing;
            }
            
            // Solo reposicionar si NO es un nodo de conector (esos mantienen su posición especial)
            const childNode = aligned.find(n => n.id === data.id);
            if (childNode && !childNode.connectorParentId) {
              aligned = aligned.map(n => 
                n.id === data.id ? { ...n, x: node.x + pWidth + hGap, y: currentY } : n
              );
            }
          });
          
          // Recursivamente alinear subárboles de TODOS los hijos horizontales
          hChildren.forEach(child => {
            aligned = alignFromRoot(child.id, aligned);
          });
        }
        
        // === HIJOS VERTICALES ===
        // Incluir TODOS los hijos verticales para procesarlos recursivamente
        const vChildren = aligned.filter(n => 
          n.parentId === nodeId && n.childDirection === 'vertical'
        ).sort((a, b) => a.x - b.x);
        
        // Separar en dos grupos: normales y de conectores
        const normalVChildren = vChildren.filter(n => !n.connectorParentId);
        const connectorVChildren = vChildren.filter(n => n.connectorParentId);
        
        // Procesar hijos verticales NORMALES (centrar bajo el padre)
        if (normalVChildren.length > 0) {
          const childY = node.y + pHeight + vGap;
          
          // Calcular ancho de cada subárbol
          const subtreeData = normalVChildren.map(c => ({
            id: c.id,
            width: getSubtreeWidth(c.id, aligned)
          }));
          
          // Calcular posiciones relativas
          const positions = [];
          subtreeData.forEach((data, idx) => {
            if (idx === 0) {
              positions.push({ id: data.id, relX: 0, width: data.width });
            } else {
              const prev = subtreeData[idx - 1];
              const spacing = (prev.width / 2) + margin + (data.width / 2);
              positions.push({ 
                id: data.id, 
                relX: positions[idx - 1].relX + spacing,
                width: data.width
              });
            }
          });
          
          // Centrar bajo el padre
          const totalWidth = positions.length > 0 ? positions[positions.length - 1].relX : 0;
          const startX = nodeCenterX - (totalWidth / 2) - (cWidth / 2);
          
          // Aplicar posiciones SOLO a hijos normales
          positions.forEach(p => {
            aligned = aligned.map(n => 
              n.id === p.id ? { ...n, x: startX + p.relX, y: childY } : n
            );
          });
        }
        
        // Los nodos de conectores mantienen su posición pero SÍ procesamos sus hijos
        // No movemos los nodos de conectores, solo procesamos recursivamente
        
        // Recursivamente alinear subárboles de TODOS los hijos verticales
        // (tanto normales como de conectores)
        vChildren.forEach(child => {
          aligned = alignFromRoot(child.id, aligned);
        });
        
        return aligned;
      };
      
      // Aplicar alineación desde la raíz
      newNodes = alignFromRoot(rootId, newNodes);
      
      console.log('[MindHybrid] Nodo vertical creado y árbol realineado desde raíz');
      
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

  // Agregar nodo desde una línea horizontal compartida (entre hermanos verticales)
  // Este nodo se agrega como un nuevo hijo vertical del padre
  const addNodeFromLine = useCallback((parentId, childIdsOrTargetChildId, options = {}) => {
    if (!parentId) return null;
    
    const newId = crypto.randomUUID();
    
    setProjects(prev => {
      const project = prev.find(p => p.id === activeProjectId);
      if (!project) return prev;
      
      const currentNodes = project.nodes;
      const parent = currentNodes.find(n => n.id === parentId);
      if (!parent) return prev;
      
      // Si es un string (targetChildId), es un botón de conector horizontal individual
      // Si es un array (childIds), es un botón de línea horizontal/vertical entre hermanos
      const isHorizontalConnectorButton = typeof childIdsOrTargetChildId === 'string';
      
      if (isHorizontalConnectorButton) {
        // CASO: Botón "+" en el conector horizontal entre padre e hijo
        // Crear un nodo vertical que cuelgue del punto medio del conector
        const targetChild = currentNodes.find(n => n.id === childIdsOrTargetChildId);
        if (!targetChild) return prev;
        
        // Calcular el punto medio del conector horizontal
        const parentRight = parent.x + (parent.width || 160);
        const parentCenterY = parent.y + (parent.height || 64) / 2;
        const childLeft = targetChild.x;
        const childCenterY = targetChild.y + (targetChild.height || 64) / 2;
        
        const connectorCenterX = (parentRight + childLeft) / 2;
        const connectorCenterY = (parentCenterY + childCenterY) / 2;
        
        // Encontrar hijos existentes que cuelgan de este conector
        const existingConnectorChildren = currentNodes.filter(n => 
          n.connectorParentId === parentId && n.connectorTargetId === childIdsOrTargetChildId
        );
        
        // Posicionar el nuevo nodo debajo del punto medio del conector
        const verticalGap = 100;
        const horizontalSpacing = 180;
        const nodeWidth = 160;
        
        // El PRIMER nodo siempre debe quedar CENTRADO debajo del "+"
        // Los siguientes se redistribuyen horizontalmente
        let newX;
        if (existingConnectorChildren.length === 0) {
          // Primer nodo: centrado exactamente debajo del botón "+"
          newX = connectorCenterX - (nodeWidth / 2);
        } else {
          // Nodos adicionales: calcular posición considerando redistribución
          const totalChildren = existingConnectorChildren.length + 1;
          const totalWidth = (totalChildren - 1) * horizontalSpacing;
          const startX = connectorCenterX - totalWidth / 2 - (nodeWidth / 2);
          newX = startX + (existingConnectorChildren.length * horizontalSpacing);
        }
        
        const newNode = {
          id: newId,
          text: 'Nuevo Nodo',
          x: newX,
          y: connectorCenterY + verticalGap,
          color: 'default',
          parentId: parentId,
          width: nodeWidth,
          height: 64,
          nodeType: options?.nodeType || 'default',
          childDirection: 'vertical',
          // Marcadores especiales para identificar este tipo de nodo
          connectorParentId: parentId,
          connectorTargetId: childIdsOrTargetChildId
        };
        
        console.log('[AddNodeFromLine] Creando nodo desde conector horizontal:', newNode);
        
        let newNodes = [...currentNodes, newNode];
        
        // Solo redistribuir si hay más de un hijo
        if (existingConnectorChildren.length > 0) {
          // Redistribuir todos los hijos del conector
          const allConnectorChildren = [...existingConnectorChildren, newNode];
          const totalChildren = allConnectorChildren.length;
          const totalWidth = (totalChildren - 1) * horizontalSpacing;
          const startX = connectorCenterX - totalWidth / 2 - (nodeWidth / 2);
          
          allConnectorChildren.forEach((child, idx) => {
            const childNewX = startX + (idx * horizontalSpacing);
            newNodes = newNodes.map(n => 
              n.id === child.id ? { ...n, x: childNewX } : n
            );
          });
        }
        
        pushToHistory(activeProjectId, newNodes);
        
        return prev.map(p => 
          p.id === activeProjectId 
            ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
            : p
        );
      }
      
      // CASO: Botón en línea horizontal/vertical entre hermanos
      const childIds = childIdsOrTargetChildId;
      
      // Obtener los hijos verticales existentes (los que forman la línea horizontal)
      const existingVerticalChildren = currentNodes.filter(n => 
        childIds.includes(n.id) || 
        (n.parentId === parentId && (n.childDirection === 'vertical' || (!n.childDirection && project.layoutType === 'mindtree')))
      );
      
      if (existingVerticalChildren.length < 2) {
        console.log('[AddNodeFromLine] Se necesitan al menos 2 hijos verticales');
        return prev;
      }
      
      // Ordenar por X para encontrar la posición
      const sortedByX = [...existingVerticalChildren].sort((a, b) => a.x - b.x);
      const leftChild = sortedByX[0];
      const rightChild = sortedByX[sortedByX.length - 1];
      
      // Calcular posición del nuevo nodo
      // X: en el centro de los hijos existentes
      const leftX = leftChild.x + (leftChild.width || 160) / 2;
      const rightX = rightChild.x + (rightChild.width || 160) / 2;
      const centerX = (leftX + rightX) / 2;
      
      // Y: al mismo nivel que los hijos existentes
      const newY = leftChild.y;
      
      // Determinar la dirección del hijo según el layout
      const childDirection = project.layoutType === 'mindtree' ? undefined : 'vertical';
      
      const newNode = {
        id: newId,
        text: 'Nuevo Nodo',
        x: centerX - 80, // Centrar el nodo (width/2)
        y: newY,
        color: 'default',
        parentId,
        width: 160,
        height: 64,
        nodeType: options?.nodeType || 'default',
        childDirection: childDirection
      };
      
      console.log('[AddNodeFromLine] Creando nodo desde línea:', newNode);
      
      let newNodes = [...currentNodes, newNode];
      
      // Aplicar auto-alineación para redistribuir todos los hijos
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

  // Algoritmo de alineación para MindHybrid
  // Organiza hijos horizontales a la derecha y verticales abajo
  // =====================================================
  // ALGORITMO MINDHYBRID V3 - EXPANSIÓN COMPLETA
  // =====================================================
  // 
  // ESTRATEGIA:
  // 1. Calcular el ancho TOTAL de cada subárbol (incluyendo TODOS los descendientes)
  // 2. Posicionar hijos HORIZONTALES con espacio suficiente para sus subárboles verticales
  // 3. Los padres se EXPANDEN para dar espacio a sus hijos
  // =====================================================

  // Función auxiliar: Calcular el ancho TOTAL requerido por un subárbol completo
  // Esto incluye TODOS los descendientes, tanto horizontales como verticales
  const calculateTotalSubtreeWidth = useCallback((nodeId, allNodes, nodeWidth = 160, minSpacing = 180) => {
    const node = allNodes.find(n => n.id === nodeId);
    if (!node) return nodeWidth;
    
    // Buscar TODOS los hijos directos
    const verticalChildren = allNodes.filter(n => 
      n.parentId === nodeId && 
      n.childDirection === 'vertical' && 
      !n.connectorParentId
    );
    
    const horizontalChildren = allNodes.filter(n => 
      n.parentId === nodeId && 
      n.childDirection === 'horizontal' && 
      !n.connectorParentId
    );
    
    // Calcular ancho de hijos verticales (se expanden horizontalmente)
    let verticalWidth = nodeWidth;
    if (verticalChildren.length > 0) {
      const childWidths = verticalChildren.map(child => 
        calculateTotalSubtreeWidth(child.id, allNodes, nodeWidth, minSpacing)
      );
      const totalChildrenWidth = childWidths.reduce((sum, w) => sum + w, 0);
      const totalSpacing = (verticalChildren.length - 1) * minSpacing;
      verticalWidth = totalChildrenWidth + totalSpacing;
    }
    
    // Calcular ancho de hijos horizontales (cada uno tiene su propio subárbol)
    let horizontalMaxWidth = 0;
    horizontalChildren.forEach(child => {
      const childSubtreeWidth = calculateTotalSubtreeWidth(child.id, allNodes, nodeWidth, minSpacing);
      horizontalMaxWidth = Math.max(horizontalMaxWidth, childSubtreeWidth);
    });
    
    // El ancho total es el máximo entre los hijos verticales y horizontales
    return Math.max(nodeWidth, verticalWidth, horizontalMaxWidth);
  }, []);

  const autoAlignMindHybrid = useCallback((parentId, currentNodes, isInitialCall = true) => {
    if (!parentId) return currentNodes;
    
    const parent = currentNodes.find(n => n.id === parentId);
    if (!parent) return currentNodes;
    
    let updatedNodes = [...currentNodes];
    
    const parentWidth = parent.width || 160;
    const parentHeight = parent.height || 64;
    const childWidth = 160;
    const childHeight = 64;
    
    // Constantes de espaciado
    const horizontalGap = 200;  // Distancia horizontal del padre
    const verticalGap = 100;    // Distancia vertical del padre
    const siblingSpacingH = 100; // Espaciado entre hermanos horizontales (aumentado)
    const minSpacing = 180;     // Espaciado MÍNIMO entre hermanos verticales
    const margin = 60;          // Margen entre subárboles
    
    const parentCenterX = parent.x + (parentWidth / 2);
    const parentCenterY = parent.y + (parentHeight / 2);
    
    // Separar hijos por dirección - INCLUIR TODOS para procesamiento recursivo
    const allHorizontalChildren = updatedNodes.filter(n => 
      n.parentId === parentId && n.childDirection === 'horizontal'
    ).sort((a, b) => a.y - b.y);
    
    const allVerticalChildren = updatedNodes.filter(n => 
      n.parentId === parentId && n.childDirection === 'vertical'
    ).sort((a, b) => a.x - b.x);
    
    // Separar en normales y de conectores
    const horizontalChildren = allHorizontalChildren.filter(n => !n.connectorParentId);
    const verticalChildren = allVerticalChildren.filter(n => !n.connectorParentId);
    const connectorChildren = allVerticalChildren.filter(n => n.connectorParentId);
    
    // =====================================================
    // HIJOS HORIZONTALES - CON ESPACIO PARA SUS SUBÁRBOLES
    // =====================================================
    if (horizontalChildren.length > 0) {
      // PRIMERO: Calcular el ancho que necesita cada subárbol horizontal
      const horizontalSubtreeData = horizontalChildren.map(child => ({
        id: child.id,
        node: child,
        subtreeWidth: calculateTotalSubtreeWidth(child.id, updatedNodes, childWidth, minSpacing)
      }));
      
      // SEGUNDO: Posicionar cada hijo horizontal con espacio Y suficiente
      // El espaciado vertical entre hermanos horizontales debe considerar sus subárboles
      let currentY = parentCenterY - (childHeight / 2);
      
      horizontalSubtreeData.forEach((data, index) => {
        const newX = parent.x + parentWidth + horizontalGap;
        
        // Calcular Y considerando el espacio del subárbol anterior
        if (index > 0) {
          const prevData = horizontalSubtreeData[index - 1];
          // El espaciado debe ser suficiente para que los subárboles no colisionen
          const requiredSpacing = Math.max(
            siblingSpacingH,
            (prevData.subtreeWidth / 2) + margin + (data.subtreeWidth / 2)
          );
          currentY += requiredSpacing;
        }
        
        updatedNodes = updatedNodes.map(n => 
          n.id === data.id ? { ...n, x: newX, y: currentY } : n
        );
      });
    }
    
    // Recursivamente alinear TODOS los subárboles horizontales (incluyendo de conectores)
    allHorizontalChildren.forEach((child) => {
      updatedNodes = autoAlignMindHybrid(child.id, updatedNodes, false);
    });
    
    // =====================================================
    // HIJOS VERTICALES - CON EXPANSIÓN BASADA EN SUBÁRBOLES
    // =====================================================
    if (verticalChildren.length > 0) {
      const childY = parent.y + parentHeight + verticalGap;
      
      // PASO 1: Calcular el ancho requerido por cada subárbol vertical
      const subtreeData = verticalChildren.map(child => ({
        id: child.id,
        node: child,
        requiredWidth: calculateTotalSubtreeWidth(child.id, updatedNodes, childWidth, minSpacing)
      }));
      
      // PASO 2: Calcular posiciones con espaciado basado en subárboles
      const childPositions = [];
      let currentRelX = 0;
      
      subtreeData.forEach((data, index) => {
        if (index === 0) {
          childPositions.push({
            ...data,
            relativeX: 0
          });
          currentRelX = data.requiredWidth / 2;
        } else {
          const prevData = subtreeData[index - 1];
          // Espaciado = mitad del subárbol anterior + margen + mitad del subárbol actual
          const spacing = (prevData.requiredWidth / 2) + margin + (data.requiredWidth / 2);
          const newRelX = childPositions[index - 1].relativeX + spacing;
          
          childPositions.push({
            ...data,
            relativeX: newRelX
          });
          currentRelX = newRelX + data.requiredWidth / 2;
        }
      });
      
      // PASO 3: Calcular el ancho total y centrar bajo el padre
      const totalGroupWidth = childPositions.length > 0 
        ? childPositions[childPositions.length - 1].relativeX 
        : 0;
      
      const groupStartX = parentCenterX - (totalGroupWidth / 2) - (childWidth / 2);
      
      // PASO 4: Aplicar las posiciones calculadas (solo a hijos normales)
      childPositions.forEach((data) => {
        const newX = groupStartX + data.relativeX;
        
        updatedNodes = updatedNodes.map(n => 
          n.id === data.id ? { ...n, x: newX, y: childY } : n
        );
      });
    }
    
    // PASO 5: Recursivamente alinear TODOS los subárboles verticales
    // Esto incluye tanto los normales como los de conectores
    allVerticalChildren.forEach((child) => {
      updatedNodes = autoAlignMindHybrid(child.id, updatedNodes, false);
    });
    
    return updatedNodes;
  }, [calculateTotalSubtreeWidth]);

  // Aplicar alineación completa MindHybrid
  const applyFullMindHybridAlignment = useCallback(() => {
    console.log('[MindHybrid] Aplicando alineación completa');
    
    const rootNodes = nodes.filter(n => !n.parentId);
    let updatedNodes = [...nodes];
    
    rootNodes.forEach(root => {
      updatedNodes = autoAlignMindHybrid(root.id, updatedNodes);
    });
    
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: updatedNodes, updatedAt: new Date().toISOString() }
        : p
    ));
  }, [nodes, activeProjectId, autoAlignMindHybrid]);

  // Guardar posición al FINALIZAR el drag (no durante)
  const saveNodePositionToHistory = useCallback(() => {
    saveToHistory(activeProjectId, nodes);
  }, [activeProjectId, nodes, saveToHistory]);

  const updateNodePosition = useCallback((id, x, y) => {
    // Actualización rápida sin modificar updatedAt (se actualiza al soltar)
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: p.nodes.map(n => n.id === id ? { ...n, x, y } : n) }
        : p
    ));
  }, [activeProjectId]);

  // Centrar todos los nodos en el canvas
  // Calcula el bounding box de todos los nodos y los mueve para que estén centrados
  // La nueva posición se guarda permanentemente
  const centerAllNodes = useCallback((canvasWidth = 1920, canvasHeight = 800) => {
    if (nodes.length === 0) return;

    // Calcular el bounding box de todos los nodos
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    nodes.forEach(node => {
      const nodeWidth = node.manualWidth || node.width || 160;
      const nodeHeight = node.manualHeight || node.height || 64;
      
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + nodeWidth);
      maxY = Math.max(maxY, node.y + nodeHeight);
    });

    // Calcular el centro actual del grupo de nodos
    const groupCenterX = (minX + maxX) / 2;
    const groupCenterY = (minY + maxY) / 2;

    // Calcular el centro deseado del canvas (con un margen)
    const targetCenterX = canvasWidth / 2;
    const targetCenterY = canvasHeight / 2;

    // Calcular el desplazamiento necesario
    const deltaX = targetCenterX - groupCenterX;
    const deltaY = targetCenterY - groupCenterY;

    // Mover todos los nodos
    const centeredNodes = nodes.map(node => ({
      ...node,
      x: Math.round(node.x + deltaX),
      y: Math.round(node.y + deltaY)
    }));

    // Guardar en historial y actualizar
    pushToHistory(activeProjectId, centeredNodes);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: centeredNodes, updatedAt: new Date().toISOString() }
        : p
    ));

    console.log('[CenterAllNodes] Nodos centrados. Delta:', { deltaX, deltaY });
    
    return { deltaX, deltaY };
  }, [nodes, activeProjectId, pushToHistory]);

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

  // Toggle estado de tarea completada (texto tachado)
  const toggleNodeCompleted = useCallback((id) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    
    const newIsCompleted = !node.isCompleted;
    console.log('[toggleNodeCompleted] Nodo:', id, 'isCompleted:', newIsCompleted);
    
    const newNodes = nodes.map(n => 
      n.id === id ? { ...n, isCompleted: newIsCompleted } : n
    );
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

  // Cambiar tipo de nodo (default <-> dashed_text)
  const updateNodeType = useCallback((id, newNodeType) => {
    const newNodes = nodes.map(n => {
      if (n.id === id) {
        if (newNodeType === 'default') {
          // Convertir a nodo con fondo - restaurar dimensiones estándar
          return { 
            ...n, 
            nodeType: 'default',
            width: 160,
            height: 64,
            // Mantener el texto pero asegurarse de que tenga texto
            text: n.text || 'Nuevo Nodo'
          };
        } else {
          // Convertir a nodo dashed_text
          return { 
            ...n, 
            nodeType: 'dashed_text',
            width: 260,
            height: 40,
            dashedLineWidth: n.dashedLineWidth || 3
          };
        }
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

  // Cambiar grosor de línea para nodos dashed_text
  const updateDashedLineWidth = useCallback((id, lineWidth) => {
    const newNodes = nodes.map(n => {
      if (n.id === id) {
        return { ...n, dashedLineWidth: lineWidth };
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
  // Cuando el usuario redimensiona manualmente, guardamos manualWidth/manualHeight
  // para que el sistema no sobrescriba el tamaño definido por el usuario
  const updateNodeSize = useCallback((id, width, height, saveHistory = false, position = null) => {
    const newNodes = nodes.map(n => {
      if (n.id !== id) return n;
      // Actualizar dimensiones y marcar como tamaño manual
      const updates = { 
        width, 
        height,
        // Marcar que este tamaño fue definido manualmente por el usuario
        manualWidth: width,
        manualHeight: height
      };
      if (position) {
        updates.x = position.x;
        updates.y = position.y;
      }
      return { ...n, ...updates };
    });
    if (saveHistory) {
      pushToHistory(activeProjectId, newNodes);
    }
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
  }, [activeProjectId, nodes, pushToHistory]);

  // Actualizar solo dimensiones específicas del nodo (sin guardar en historial)
  const updateNodeDimensions = useCallback((id, dimensions) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== activeProjectId) return p;
      
      const newNodes = p.nodes.map(n => {
        if (n.id !== id) return n;
        return { 
          ...n, 
          ...(dimensions.width !== undefined && { width: dimensions.width }),
          ...(dimensions.height !== undefined && { height: dimensions.height })
        };
      });
      
      return { ...p, nodes: newNodes };
    }));
  }, [activeProjectId]);

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

  const deleteNode = useCallback((id, autoAlignAfter = false) => {
    const findDescendants = (nodeId, allNodes) => {
      const children = allNodes.filter(n => n.parentId === nodeId);
      let descendants = [nodeId];
      children.forEach(child => {
        descendants = [...descendants, ...findDescendants(child.id, allNodes)];
      });
      return descendants;
    };

    // Obtener el proyecto activo para saber el layoutType
    const project = projects.find(p => p.id === activeProjectId);
    const layoutType = project?.layoutType || 'mindflow';
    
    // Encontrar el padre del nodo que se va a eliminar ANTES de eliminarlo
    const nodeToDelete = nodes.find(n => n.id === id);
    const parentOfDeleted = nodeToDelete?.parentId;

    const nodesToDelete = new Set(findDescendants(id, nodes));
    let newNodes = nodes.filter(n => !nodesToDelete.has(n.id));
    
    // Si autoAlign está activo, aplicar alineación según el tipo de layout
    if (autoAlignAfter) {
      console.log('[deleteNode] Aplicando alineación después de eliminar. Layout:', layoutType);
      
      if (layoutType === 'mindhybrid') {
        // Para MindHybrid: Redistribuir los hermanos del nodo eliminado
        if (parentOfDeleted) {
          const parent = newNodes.find(n => n.id === parentOfDeleted);
          if (parent) {
            const parentWidth = parent.width || 160;
            const parentHeight = parent.height || 64;
            const childWidth = 160;
            const verticalGap = 100;
            const minSiblingSpacingV = 180;
            
            const parentCenterX = parent.x + (parentWidth / 2);
            const childY = parent.y + parentHeight + verticalGap;
            
            // Obtener los hermanos verticales restantes
            const verticalSiblings = newNodes.filter(n => 
              n.parentId === parentOfDeleted && 
              n.childDirection === 'vertical' && 
              !n.connectorParentId
            ).sort((a, b) => a.x - b.x);
            
            // Redistribuir los hermanos verticales centrados bajo el padre
            if (verticalSiblings.length > 0) {
              const totalGroupWidth = (verticalSiblings.length - 1) * minSiblingSpacingV;
              const firstChildX = parentCenterX - (childWidth / 2) - (totalGroupWidth / 2);
              
              verticalSiblings.forEach((sibling, index) => {
                const newX = firstChildX + (index * minSiblingSpacingV);
                newNodes = newNodes.map(n => 
                  n.id === sibling.id ? { ...n, x: newX, y: childY } : n
                );
              });
            }
          }
        }
      } else {
        // Para otros layouts
        const rootNodes = newNodes.filter(n => !n.parentId);
        rootNodes.forEach(root => {
          const children = newNodes.filter(n => n.parentId === root.id);
          if (children.length > 0) {
            if (layoutType === 'mindtree') {
              newNodes = autoAlignMindTree(root.id, newNodes);
            } else {
              newNodes = autoAlignHierarchy(root.id, newNodes);
            }
          }
        });
      }
    }
    
    pushToHistory(activeProjectId, newNodes);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
    setSelectedNodeId(null);
  }, [nodes, projects, activeProjectId, pushToHistory, autoAlignHierarchy, autoAlignMindTree]);

  // Desconectar un nodo de su padre (eliminar solo la conexión, no el nodo)
  const disconnectNode = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !node.parentId) {
      console.log('[disconnectNode] Nodo no tiene padre para desconectar:', nodeId);
      return false;
    }

    console.log('[disconnectNode] Desconectando nodo:', nodeId, 'de padre:', node.parentId);
    
    const newNodes = nodes.map(n => {
      if (n.id === nodeId) {
        // Remover parentId y propiedades relacionadas con la conexión
        const { parentId, childDirection, connectorParentId, connectorTargetId, ...rest } = n;
        return rest;
      }
      return n;
    });

    pushToHistory(activeProjectId, newNodes);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));

    console.log('[disconnectNode] Nodo desconectado exitosamente');
    return true;
  }, [nodes, activeProjectId, pushToHistory]);

  // Conectar un nodo a un nuevo padre
  const connectNodes = useCallback((childNodeId, newParentId, options = {}) => {
    const childNode = nodes.find(n => n.id === childNodeId);
    const parentNode = nodes.find(n => n.id === newParentId);
    
    if (!childNode || !parentNode) {
      console.error('[connectNodes] Nodo hijo o padre no encontrado');
      return false;
    }

    // Evitar auto-conexión
    if (childNodeId === newParentId) {
      console.error('[connectNodes] No se puede conectar un nodo a sí mismo');
      return false;
    }

    // Evitar ciclos: verificar que el nuevo padre no sea descendiente del hijo
    const isDescendant = (potentialChild, ancestorId) => {
      if (!potentialChild.parentId) return false;
      if (potentialChild.parentId === ancestorId) return true;
      const parent = nodes.find(n => n.id === potentialChild.parentId);
      return parent ? isDescendant(parent, ancestorId) : false;
    };

    if (isDescendant(parentNode, childNodeId)) {
      console.error('[connectNodes] No se puede crear ciclo: el padre es descendiente del hijo');
      return false;
    }

    console.log('[connectNodes] Conectando nodo:', childNodeId, 'a nuevo padre:', newParentId);

    const currentProject = projects.find(p => p.id === activeProjectId);
    const layoutType = currentProject?.layoutType || 'mindflow';

    // Determinar la dirección del hijo según el layout y la posición
    let childDirection = options.childDirection;
    if (!childDirection && layoutType === 'mindhybrid') {
      // Inferir dirección basada en posición relativa
      const relY = childNode.y - parentNode.y;
      const relX = childNode.x - (parentNode.x + (parentNode.width || 160));
      childDirection = (relY > 50 && Math.abs(relX) < 100) ? 'vertical' : 'horizontal';
    }

    const newNodes = nodes.map(n => {
      if (n.id === childNodeId) {
        return {
          ...n,
          parentId: newParentId,
          childDirection: childDirection,
          // Limpiar propiedades de conectores especiales
          connectorParentId: undefined,
          connectorTargetId: undefined
        };
      }
      return n;
    });

    pushToHistory(activeProjectId, newNodes);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));

    console.log('[connectNodes] Nodos conectados exitosamente');
    return true;
  }, [nodes, projects, activeProjectId, pushToHistory]);

  const duplicateNode = useCallback((id, autoAlignAfter = false) => {
    const original = nodes.find(n => n.id === id);
    if (!original) return;
    
    const newId = crypto.randomUUID();
    const currentProject = projects.find(p => p.id === activeProjectId);
    const layoutType = currentProject?.layoutType || 'mindflow';
    
    // Calcular posición correcta basada en los hermanos (si tiene padre)
    let newX = original.x + 30;
    let newY = original.y + 30;
    
    if (original.parentId) {
      const parent = nodes.find(n => n.id === original.parentId);
      if (parent) {
        // Obtener hermanos (incluyendo el nodo original)
        const siblings = nodes.filter(n => n.parentId === original.parentId);
        
        if (layoutType === 'mindtree') {
          // MindTree: hijos distribuidos HORIZONTALMENTE
          // Nuevo nodo se coloca a la derecha de los hermanos existentes
          const rightmostSibling = siblings.reduce((max, s) => 
            (s.x + (s.width || 160)) > (max.x + (max.width || 160)) ? s : max, siblings[0]);
          const horizontalGap = 40;
          newX = rightmostSibling.x + (rightmostSibling.width || 160) + horizontalGap;
          newY = rightmostSibling.y; // Misma altura que los hermanos
        } else if (layoutType === 'mindhybrid') {
          // MindHybrid: determinar si los hijos son horizontales o verticales
          // Basado en la posición relativa de los hijos existentes
          if (siblings.length >= 2) {
            const yVariance = Math.abs(siblings[0].y - siblings[1].y);
            const xVariance = Math.abs(siblings[0].x - siblings[1].x);
            
            if (xVariance > yVariance) {
              // Hijos distribuidos horizontalmente
              const rightmostSibling = siblings.reduce((max, s) => 
                (s.x + (s.width || 160)) > (max.x + (max.width || 160)) ? s : max, siblings[0]);
              newX = rightmostSibling.x + (rightmostSibling.width || 160) + 40;
              newY = rightmostSibling.y;
            } else {
              // Hijos distribuidos verticalmente
              const bottommostSibling = siblings.reduce((max, s) => 
                (s.y + (s.height || 64)) > (max.y + (max.height || 64)) ? s : max, siblings[0]);
              newX = bottommostSibling.x;
              newY = bottommostSibling.y + (bottommostSibling.height || 64) + 30;
            }
          } else {
            // Solo un hermano, colocar debajo
            const sibling = siblings[0];
            newX = sibling.x;
            newY = sibling.y + (sibling.height || 64) + 30;
          }
        } else {
          // MindFlow: hijos distribuidos VERTICALMENTE a la derecha del padre
          const bottommostSibling = siblings.reduce((max, s) => 
            (s.y + (s.height || 64)) > (max.y + (max.height || 64)) ? s : max, siblings[0]);
          newX = bottommostSibling.x;
          newY = bottommostSibling.y + (bottommostSibling.height || 64) + 30;
        }
      }
    }
    
    const duplicate = {
      ...original,
      id: newId,
      x: newX,
      y: newY
    };
    
    let newNodes = [...nodes, duplicate];
    
    // Si autoAlign está activo y el nodo tiene padre, aplicar alineación
    if (autoAlignAfter && original.parentId) {
      // Encontrar el nodo raíz de esta jerarquía
      let currentParentId = original.parentId;
      let rootId = original.parentId;
      while (currentParentId) {
        const parent = newNodes.find(n => n.id === currentParentId);
        if (parent && parent.parentId) {
          currentParentId = parent.parentId;
          rootId = parent.parentId;
        } else {
          break;
        }
      }
      
      // Aplicar alineación según el tipo de layout
      if (layoutType === 'mindtree') {
        newNodes = autoAlignMindTree(rootId, newNodes);
      } else if (layoutType === 'mindhybrid') {
        newNodes = autoAlignMindHybrid(rootId, newNodes);
      } else {
        newNodes = autoAlignHierarchy(rootId, newNodes);
      }
    }
    
    pushToHistory(activeProjectId, newNodes);

    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
    setSelectedNodeId(newId);
  }, [nodes, projects, activeProjectId, pushToHistory, autoAlignHierarchy, autoAlignMindTree, autoAlignMindHybrid]);

  // ==========================================
  // GESTIÓN DE PROYECTOS
  // ==========================================

  // Crear proyecto en blanco (AGREGA, no reemplaza)
  // layoutType: 'mindflow' (horizontal) o 'mindtree' (vertical)
  const createBlankMap = useCallback(async (name = 'Nuevo Mapa', layoutType = 'mindflow') => {
    try {
      console.log('Creando nuevo proyecto en blanco con layout:', layoutType);
      
      const initialNodes = [{ 
        id: crypto.randomUUID(), 
        text: 'Idea Central', 
        x: 400, 
        y: layoutType === 'mindtree' ? 100 : 300, 
        color: 'blue', 
        parentId: null,
        width: 160,
        height: 64
      }];
      
      const newProject = {
        id: crypto.randomUUID(),
        name: name,
        layoutType: layoutType,
        nodes: initialNodes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Intentar guardar en servidor PRIMERO antes de actualizar el estado local
      const result = await saveProjectToServer(newProject);
      
      if (!result.success) {
        // Distinguir entre conflicto de nombre (409) y límite de plan (403)
        console.error('Servidor rechazó la creación:', result.error, 'Status:', result.status);
        
        // Si es conflicto de nombre (409), retornar info del conflicto
        if (result.status === 409 || result.conflict) {
          return { 
            success: false, 
            error: result.error,
            isNameConflict: true,
            existingProjectId: result.existingProjectId,
            conflictingName: name
          };
        }
        
        // Si es límite de plan (403), retornar info del límite
        return { 
          success: false, 
          error: result.error,
          isPlanLimit: true,
          limitType: result.error?.includes('total') || result.error?.includes('5 mapas') ? 'total' : 'active'
        };
      }

      // Solo si el servidor aceptó, actualizar estado local
      historyRef.current[newProject.id] = {
        states: [JSON.stringify(initialNodes)],
        pointer: 0
      };

      setProjects(prev => [newProject, ...prev]);
      setActiveProjectId(newProject.id);
      setSelectedNodeId(null);
      setHistoryVersion(v => v + 1);
      
      console.log('Nuevo proyecto creado:', newProject.name);
      return { success: true };
    } catch (error) {
      console.error('Error al crear proyecto en blanco:', error);
      return { success: false, error: 'Error al crear el proyecto. Intenta de nuevo.' };
    }
  }, [saveProjectToServer]);

  // Cargar desde template (AGREGA, no reemplaza)
  // Los templates usan MindFlow por defecto
  const loadFromTemplate = useCallback(async (templateNodes, templateName = 'Template', layoutType = 'mindflow') => {
    try {
      console.log('Creando proyecto desde template:', templateName, 'con layout:', layoutType);
      
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
        layoutType: layoutType, // 'mindflow' por defecto para templates
        nodes: mappedNodes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Intentar guardar en servidor PRIMERO
      const result = await saveProjectToServer(newProject);
      
      if (!result.success) {
        console.error('Servidor rechazó la creación desde template:', result.error, 'Status:', result.status);
        
        // Si es conflicto de nombre (409), retornar info del conflicto
        if (result.status === 409 || result.conflict) {
          return { 
            success: false, 
            error: result.error,
            isNameConflict: true,
            existingProjectId: result.existingProjectId,
            conflictingName: templateName
          };
        }
        
        // Si es límite de plan (403), retornar info del límite
        return { 
          success: false, 
          error: result.error,
          isPlanLimit: true,
          limitType: result.error?.includes('total') || result.error?.includes('5 mapas') ? 'total' : 'active'
        };
      }

      // Solo si el servidor aceptó, actualizar estado local
      historyRef.current[newProject.id] = {
        states: [JSON.stringify(mappedNodes)],
        pointer: 0
      };

      setProjects(prev => [newProject, ...prev]);
      setActiveProjectId(newProject.id);
      setSelectedNodeId(null);
      setHistoryVersion(v => v + 1);
      
      console.log('Proyecto desde template creado:', newProject.name);
      return { success: true };
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
        // Si no quedan proyectos, simplemente limpiar el estado
        // NO crear uno nuevo automáticamente
        setProjects([]);
        setActiveProjectId(null);
        // Los nodos se limpian automáticamente al no haber proyecto activo
        console.log('Último proyecto eliminado, cuenta en cero mapas');
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
  }, [activeProjectId, projects, deleteProjectFromServer]);

  // Generar nombre único para proyecto duplicado
  const generateUniqueCopyName = useCallback((originalName) => {
    const baseCopyName = `${originalName} - copia`;
    
    // Verificar si ya existe un proyecto con ese nombre
    const existingNames = projects.map(p => p.name.toLowerCase());
    
    if (!existingNames.includes(baseCopyName.toLowerCase())) {
      return baseCopyName;
    }
    
    // Buscar el siguiente número disponible
    let copyNumber = 2;
    while (existingNames.includes(`${baseCopyName} ${copyNumber}`.toLowerCase())) {
      copyNumber++;
    }
    
    return `${baseCopyName} ${copyNumber}`;
  }, [projects]);

  // Duplicar proyecto completo (con nombre personalizado opcional)
  const duplicateProject = useCallback(async (projectId, customName = null) => {
    try {
      const sourceProject = projects.find(p => p.id === projectId);
      if (!sourceProject) {
        console.error('Proyecto no encontrado para duplicar:', projectId);
        return { success: false, error: 'Proyecto no encontrado' };
      }

      console.log('Duplicando proyecto:', sourceProject.name);
      
      // Usar nombre personalizado o generar uno único
      const newName = customName || generateUniqueCopyName(sourceProject.name);
      
      // Generar nuevos IDs para todos los nodos
      const idMap = {};
      const newNodes = sourceProject.nodes.map(node => {
        const newId = crypto.randomUUID();
        idMap[node.id] = newId;
        return { ...node, id: newId };
      });
      
      // Actualizar parentIds y connectorIds con los nuevos IDs
      const mappedNodes = newNodes.map(node => ({
        ...node,
        parentId: node.parentId ? idMap[node.parentId] : null,
        connectorParentId: node.connectorParentId ? idMap[node.connectorParentId] : null,
        connectorTargetId: node.connectorTargetId ? idMap[node.connectorTargetId] : null
      }));

      const newProject = {
        id: crypto.randomUUID(),
        name: newName,
        layoutType: sourceProject.layoutType || 'mindflow',
        nodes: mappedNodes,
        isPinned: false, // No copiar el estado de anclado
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Intentar guardar en servidor
      const result = await saveProjectToServer(newProject);
      
      if (!result.success) {
        console.error('Servidor rechazó la duplicación:', result.error);
        
        // Si es conflicto de nombre, retornar error (el usuario debe elegir otro nombre)
        if (result.status === 409 || result.conflict) {
          return { 
            success: false, 
            error: 'Ya existe un mapa con este nombre',
            isNameConflict: true
          };
        }
        
        return { 
          success: false, 
          error: result.error,
          isPlanLimit: result.status === 403,
          limitType: result.error?.includes('total') ? 'total' : 'active'
        };
      }

      // Agregar al estado local (al inicio para que aparezca primero)
      historyRef.current[newProject.id] = {
        states: [JSON.stringify(mappedNodes)],
        pointer: 0
      };

      // Agregar el proyecto y establecerlo como activo inmediatamente
      setProjects(prev => [newProject, ...prev]);
      setActiveProjectId(newProject.id);
      setSelectedNodeId(null);
      
      console.log('Proyecto duplicado exitosamente:', newProject.name);
      return { success: true, newProjectId: newProject.id, newName: newProject.name };
    } catch (error) {
      console.error('Error al duplicar proyecto:', error);
      return { success: false, error: 'Error al duplicar el proyecto. Intenta de nuevo.' };
    }
  }, [projects, generateUniqueCopyName, saveProjectToServer]);

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

  // Anclar/Desanclar proyecto
  const pinProject = useCallback(async (projectId, shouldPin) => {
    const token = getAuthToken();
    if (!token) return false;

    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/pin`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isPinned: shouldPin })
      });

      if (response.ok) {
        setProjects(prev => prev.map(p => 
          p.id === projectId 
            ? { ...p, isPinned: shouldPin }
            : p
        ));
        console.log(`Proyecto ${projectId} ${shouldPin ? 'anclado' : 'desanclado'}`);
        return true;
      } else {
        const error = await response.json();
        console.error('Error al anclar proyecto:', error.detail);
        return false;
      }
    } catch (error) {
      console.error('Error al anclar proyecto:', error);
      return false;
    }
  }, []);

  // Activar proyecto (actualizar lastActiveAt)
  const activateProject = useCallback(async (projectId) => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/activate`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(prev => prev.map(p => 
          p.id === projectId 
            ? { ...p, lastActiveAt: data.lastActiveAt }
            : p
        ));
      }
    } catch (error) {
      console.error('Error al activar proyecto:', error);
    }
  }, []);

  // Reordenar proyectos
  const reorderProjects = useCallback(async (projectOrders) => {
    const token = getAuthToken();
    if (!token) return false;

    try {
      const response = await fetch(`${API_URL}/api/projects/reorder`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ projectOrders })
      });

      if (response.ok) {
        // Actualizar estado local con el nuevo orden
        setProjects(prev => {
          const orderMap = new Map(projectOrders.map(o => [o.id, o.customOrder]));
          return prev.map(p => ({
            ...p,
            customOrder: orderMap.has(p.id) ? orderMap.get(p.id) : p.customOrder
          }));
        });
        console.log('Proyectos reordenados');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error al reordenar proyectos:', error);
      return false;
    }
  }, []);

  // Cambiar proyecto activo (actualizado para activar)
  const switchProject = useCallback((projectId) => {
    try {
      if (projects.some(p => p.id === projectId)) {
        console.log('Cambiando a proyecto:', projectId);
        setActiveProjectId(projectId);
        setSelectedNodeId(null);
        // Activar el proyecto en el servidor
        activateProject(projectId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error al cambiar proyecto:', error);
      return false;
    }
  }, [projects, activateProject]);


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

  // Guardar thumbnail del proyecto
  const saveThumbnail = useCallback(async (projectId, thumbnailBase64) => {
    const token = getAuthToken();
    if (!token) return false;

    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ thumbnail: thumbnailBase64 })
      });

      if (response.ok) {
        // Actualizar el proyecto local con el thumbnail
        setProjects(prev => prev.map(p => 
          p.id === projectId ? { ...p, thumbnail: thumbnailBase64 } : p
        ));
        console.log('Thumbnail guardado para proyecto:', projectId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error guardando thumbnail:', error);
      return false;
    }
  }, []);

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
    addNodeHorizontal,
    addNodeVertical,
    addNodeFromLine,
    updateNode: updateProjectNodes,
    updateNodePosition,
    updateNodeText,
    updateNodeColor,
    updateNodeComment,
    toggleNodeCompleted,
    updateNodeStyle,
    updateNodeSize,
    updateNodeDimensions,
    updateNodeIcon,
    updateNodeType,
    updateDashedLineWidth,
    addNodeLink,
    removeNodeLink,
    updateNodeLink,
    saveNodePositionToHistory,
    deleteNode,
    duplicateNode,
    centerAllNodes,
    
    // Funciones de historial
    undo,
    redo,
    canUndo,
    canRedo,
    
    // Gestión de proyectos
    createBlankMap,
    loadFromTemplate,
    deleteProject,
    duplicateProject,
    switchProject,
    renameProject,
    setProjectName,
    pinProject,
    reorderProjects,
    saveThumbnail,
    
    // Selección múltiple
    selectedNodeIds,
    setSelectedNodeIds,
    addToSelection,
    selectSingleNode,
    selectAllNodes,
    clearSelection,
    selectNodesInArea,
    isNodeSelected,
    getSelectedNodes,
    
    // Acciones en grupo
    deleteSelectedNodes,
    duplicateSelectedNodes,
    // Alineación de NODOS (posición en canvas)
    alignNodesLeft,
    alignNodesCenter,
    alignNodesRight,
    alignNodesTop,
    alignNodesMiddle,
    alignNodesBottom,
    // Alineación de TEXTO (dentro del nodo)
    alignTextLeft,
    alignTextCenter,
    alignTextRight,
    // Alineación de TEXTO para nodo individual (toolbar)
    alignSingleNodeTextLeft,
    alignSingleNodeTextCenter,
    alignSingleNodeTextRight,
    // Distribución
    distributeNodesVertically,
    distributeNodesHorizontally,
    moveSelectedNodes,
    
    // Alineación jerárquica automática (MindFlow - horizontal)
    autoAlignHierarchy,
    applyFullAutoAlignment,
    
    // Alineación MindTree (vertical)
    autoAlignMindTree,
    applyFullMindTreeAlignment,
    
    // Alineación MindHybrid (mixta)
    autoAlignMindHybrid,
    applyFullMindHybridAlignment,
    
    // Alineación MindAxis (eje central)
    autoAlignMindAxis,
    applyFullMindAxisAlignment,
    
    // Alineación MindOrbit (radial)
    autoAlignMindOrbit,
    applyFullMindOrbitAlignment,
    
    // Compatibilidad
    resetToDefault,
    clearAll,
    setNodes: updateProjectNodes
  };
};

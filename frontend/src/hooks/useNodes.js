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
          layoutType: project.layoutType || 'mindflow', // Por defecto mindflow
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
  const duplicateSelectedNodes = useCallback(() => {
    const nodesToDuplicate = getSelectedNodes();
    if (nodesToDuplicate.length === 0) return;

    const offset = 50;
    const newDuplicatedNodes = nodesToDuplicate.map(node => ({
      ...node,
      id: crypto.randomUUID(),
      x: node.x + offset,
      y: node.y + offset,
    }));

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
  }, [nodes, activeProjectId, pushToHistory, getSelectedNodes]);

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
  const getNodeHeight = useCallback((node) => {
    if (node.height && node.height > 0) return node.height;
    const baseHeight = 64;
    const text = node.text || '';
    const nodeWidth = node.width || 160;
    const charsPerLine = Math.floor(nodeWidth / 9);
    const estimatedLines = Math.max(1, Math.ceil(text.length / charsPerLine));
    return Math.max(baseHeight, 30 + (estimatedLines * 22));
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

    // Posicionar cada hijo y su subárbol
    const childrenX = node.x + HORIZONTAL_OFFSET;
    let currentY = startY;

    for (let i = 0; i < sortedChildren.length; i++) {
      const child = sortedChildren[i];
      
      // Actualizar posición X del hijo
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

    updatedNodes = updatedNodes.map(n => 
      n.id === nodeId ? { ...n, y: newParentY } : n
    );

    return { nodes: updatedNodes, blockHeight: totalChildrenHeight };
  }, [getNodeHeight, calculateBlockHeight, BLOCK_MARGIN, HORIZONTAL_OFFSET]);

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

    // Posicionar cada hijo y su subárbol
    const childrenX = root.x + HORIZONTAL_OFFSET;

    for (let i = 0; i < sortedChildren.length; i++) {
      const child = sortedChildren[i];

      // Actualizar posición X del hijo
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
        
        updatedNodes = updatedNodes.map(n => 
          n.id === rootId ? { ...n, y: newRootY } : n
        );
      }
    }

    return updatedNodes;
  }, [getNodeHeight, calculateBlockHeight, alignSubtree, BLOCK_MARGIN, HORIZONTAL_OFFSET]);

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

    const newNodes = nodes.map(n => {
      if (idsToMove.includes(n.id)) {
        return { ...n, x: n.x + deltaX, y: n.y + deltaY };
      }
      return n;
    });

    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
  }, [nodes, selectedNodeId, selectedNodeIds, activeProjectId]);

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
      
      if (parentId) {
        const parent = currentNodes.find(n => n.id === parentId);
        if (parent) {
          const siblings = currentNodes.filter(n => n.parentId === parentId);
          
          if (layoutType === 'mindtree') {
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
        nodeType: options?.nodeType === 'dashed' ? 'dashed_text' : (options?.nodeType || 'default') // 'default' | 'dashed_text'
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
      const horizontalGap = 280; // Distancia horizontal del padre
      const verticalSpacing = 80; // Espacio vertical entre hermanos horizontales
      
      // Posición: a la derecha del padre, apilados verticalmente
      const newX = parent.x + parentWidth + horizontalGap - parentWidth;
      const newY = parent.y + (horizontalSiblings.length * verticalSpacing);
      
      const newNode = {
        id: newId,
        text: 'Nuevo Nodo',
        x: newX,
        y: newY,
        color: 'blue',
        parentId,
        width: 160,
        height: 64,
        nodeType: options?.nodeType || 'default',
        childDirection: 'horizontal' // Marca la dirección
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
      
      const currentNodes = project.nodes;
      const parent = currentNodes.find(n => n.id === parentId);
      if (!parent) return prev;
      
      // Filtrar hermanos verticales
      const verticalSiblings = currentNodes.filter(n => 
        n.parentId === parentId && n.childDirection === 'vertical'
      );
      
      const parentHeight = parent.height || 64;
      const verticalGap = 100; // Distancia vertical del padre
      const horizontalSpacing = 180; // Espacio horizontal entre hermanos verticales
      
      // Posición: debajo del padre, distribuidos horizontalmente
      const newX = parent.x + (verticalSiblings.length * horizontalSpacing);
      const newY = parent.y + parentHeight + verticalGap;
      
      const newNode = {
        id: newId,
        text: 'Nuevo Nodo',
        x: newX,
        y: newY,
        color: 'blue',
        parentId,
        width: 160,
        height: 64,
        nodeType: options?.nodeType || 'default',
        childDirection: 'vertical' // Marca la dirección
      };
      
      console.log('[MindHybrid] Creando nodo VERTICAL:', newNode);
      
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

  // Algoritmo de alineación para MindHybrid
  // Organiza hijos horizontales a la derecha y verticales abajo
  const autoAlignMindHybrid = useCallback((parentId, currentNodes) => {
    if (!parentId) return currentNodes;
    
    const parent = currentNodes.find(n => n.id === parentId);
    if (!parent) return currentNodes;
    
    let updatedNodes = [...currentNodes];
    
    const parentWidth = parent.width || 160;
    const parentHeight = parent.height || 64;
    
    // Separar hijos por dirección
    const horizontalChildren = updatedNodes.filter(n => 
      n.parentId === parentId && n.childDirection === 'horizontal'
    ).sort((a, b) => a.y - b.y); // Ordenar por Y
    
    const verticalChildren = updatedNodes.filter(n => 
      n.parentId === parentId && n.childDirection === 'vertical'
    ).sort((a, b) => a.x - b.x); // Ordenar por X
    
    // Constantes de espaciado
    const horizontalGap = 200; // Distancia horizontal desde el padre
    const verticalGap = 100; // Distancia vertical desde el padre
    const siblingSpacingH = 80; // Espacio entre hermanos horizontales
    const siblingSpacingV = 180; // Espacio entre hermanos verticales
    
    // Posicionar hijos horizontales (a la derecha, apilados verticalmente)
    horizontalChildren.forEach((child, index) => {
      const newX = parent.x + parentWidth + horizontalGap;
      const newY = parent.y + (index * siblingSpacingH) - ((horizontalChildren.length - 1) * siblingSpacingH / 2);
      
      updatedNodes = updatedNodes.map(n => 
        n.id === child.id ? { ...n, x: newX, y: newY } : n
      );
      
      // Recursivamente alinear subárboles
      updatedNodes = autoAlignMindHybrid(child.id, updatedNodes);
    });
    
    // Posicionar hijos verticales (abajo, distribuidos horizontalmente)
    const totalVerticalWidth = verticalChildren.length * siblingSpacingV - siblingSpacingV;
    const verticalStartX = parent.x + (parentWidth / 2) - (totalVerticalWidth / 2);
    
    verticalChildren.forEach((child, index) => {
      const newX = verticalStartX + (index * siblingSpacingV);
      const newY = parent.y + parentHeight + verticalGap;
      
      updatedNodes = updatedNodes.map(n => 
        n.id === child.id ? { ...n, x: newX, y: newY } : n
      );
      
      // Recursivamente alinear subárboles
      updatedNodes = autoAlignMindHybrid(child.id, updatedNodes);
    });
    
    return updatedNodes;
  }, []);

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

    const nodesToDelete = new Set(findDescendants(id, nodes));
    let newNodes = nodes.filter(n => !nodesToDelete.has(n.id));
    
    // Si autoAlign está activo, aplicar alineación según el tipo de layout
    if (autoAlignAfter) {
      console.log('[deleteNode] Aplicando alineación después de eliminar. Layout:', layoutType);
      // Encontrar todos los nodos raíz
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
    
    pushToHistory(activeProjectId, newNodes);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
    setSelectedNodeId(null);
  }, [nodes, projects, activeProjectId, pushToHistory, autoAlignHierarchy, autoAlignMindTree]);

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
        layoutType: layoutType, // 'mindflow' o 'mindtree'
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
    pinProject,
    reorderProjects,
    
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
    
    // Compatibilidad
    resetToDefault,
    clearAll,
    setNodes: updateProjectNodes
  };
};

import { useState, useEffect, useCallback, useRef } from 'react';

const PROJECTS_KEY = 'mm_projects';
const ACTIVE_PROJECT_KEY = 'mm_activeProjectId';

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

// Cargar proyectos desde localStorage
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
  // Si no hay proyectos, crear uno por defecto
  const defaultProject = createDefaultProject();
  defaultProject.name = 'Mi Primer Mapa';
  return [defaultProject];
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
  // Por defecto, usar el primer proyecto
  return projects.length > 0 ? projects[0].id : null;
};

export const useNodes = () => {
  // Cargar proyectos una sola vez para mantener consistencia
  const [initialData] = useState(() => {
    const loadedProjects = loadProjectsFromStorage();
    const activeId = loadActiveProjectIdFromStorage(loadedProjects);
    return { projects: loadedProjects, activeId };
  });

  // Estado de proyectos
  const [projects, setProjects] = useState(initialData.projects);
  const [activeProjectId, setActiveProjectId] = useState(initialData.activeId);
  
  // Estado para undo/redo usando useRef para historial mutable
  const historyRef = useRef(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const isUndoRedoAction = useRef(false);
  
  // Inicializar historyRef en el primer render
  if (historyRef.current === null) {
    const histories = {};
    initialData.projects.forEach(p => {
      histories[p.id] = {
        states: [JSON.stringify(p.nodes)],
        pointer: 0
      };
    });
    historyRef.current = histories;
    console.log('History initialized:', Object.keys(histories));
  }

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
  // PERSISTENCIA EN LOCALSTORAGE
  // ==========================================
  
  useEffect(() => {
    try {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
      console.log('Proyectos guardados:', projects.length);
    } catch (e) {
      console.error('Error saving projects to localStorage:', e);
    }
  }, [projects]);

  useEffect(() => {
    try {
      if (activeProjectId) {
        localStorage.setItem(ACTIVE_PROJECT_KEY, activeProjectId);
        console.log('Proyecto activo guardado:', activeProjectId);
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
  const createBlankMap = useCallback((name = 'Nuevo Mapa') => {
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
      
      console.log('Nuevo proyecto creado:', newProject.name);
      return true;
    } catch (error) {
      console.error('Error al crear proyecto en blanco:', error);
      return false;
    }
  }, []);

  // Cargar desde template (AGREGA, no reemplaza)
  const loadFromTemplate = useCallback((templateNodes, templateName = 'Template') => {
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
      
      console.log('Proyecto desde template creado:', newProject.name);
      return true;
    } catch (error) {
      console.error('Error al cargar template:', error);
      return false;
    }
  }, []);

  // Eliminar proyecto (solo el activo)
  const deleteProject = useCallback((projectIdToDelete = activeProjectId) => {
    try {
      console.log('Eliminando proyecto:', projectIdToDelete);
      
      const remainingProjects = projects.filter(p => p.id !== projectIdToDelete);
      
      if (remainingProjects.length === 0) {
        // Si no quedan proyectos, crear uno nuevo
        const newProject = createDefaultProject();
        newProject.name = 'Nuevo Mapa';
        setProjects([newProject]);
        setActiveProjectId(newProject.id);
        console.log('Último proyecto eliminado, creado uno nuevo');
      } else {
        setProjects(remainingProjects);
        // Si eliminamos el proyecto activo, activar el más reciente
        if (projectIdToDelete === activeProjectId) {
          // Ordenar por fecha de actualización, más reciente primero
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
  }, [activeProjectId, projects]);

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
  const renameProject = useCallback((projectId, newName) => {
    try {
      setProjects(prev => prev.map(p => 
        p.id === projectId 
          ? { ...p, name: newName, updatedAt: new Date().toISOString() }
          : p
      ));
      console.log('Proyecto renombrado:', newName);
      return true;
    } catch (error) {
      console.error('Error al renombrar proyecto:', error);
      return false;
    }
  }, []);

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
    
    // Funciones de nodos
    addNode,
    updateNode: updateProjectNodes,
    updateNodePosition,
    updateNodeText,
    updateNodeColor,
    updateNodeComment,
    updateNodeStyle,
    updateNodeSize,
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

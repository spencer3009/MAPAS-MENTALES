import { useState, useEffect, useCallback } from 'react';

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
  
  // Estado para undo/redo (por proyecto)
  const [history, setHistory] = useState({});
  const [historyIndex, setHistoryIndex] = useState({});

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

  const saveToHistory = useCallback((projectId, newNodes) => {
    setHistory(prev => {
      const projectHistory = prev[projectId] || [];
      const currentIndex = historyIndex[projectId] ?? -1;
      const newHistory = projectHistory.slice(0, currentIndex + 1);
      newHistory.push(JSON.stringify(newNodes));
      if (newHistory.length > 50) newHistory.shift();
      return { ...prev, [projectId]: newHistory };
    });
    setHistoryIndex(prev => ({
      ...prev,
      [projectId]: Math.min((prev[projectId] ?? -1) + 1, 49)
    }));
  }, [historyIndex]);

  const canUndo = (history[activeProjectId]?.length || 0) > 0 && (historyIndex[activeProjectId] ?? -1) > 0;
  const canRedo = (historyIndex[activeProjectId] ?? -1) < (history[activeProjectId]?.length || 0) - 1;

  const undo = useCallback(() => {
    const projectHistory = history[activeProjectId];
    const currentIndex = historyIndex[activeProjectId] ?? -1;
    
    if (projectHistory && currentIndex > 0) {
      const prevState = JSON.parse(projectHistory[currentIndex - 1]);
      setHistoryIndex(prev => ({ ...prev, [activeProjectId]: currentIndex - 1 }));
      setProjects(prev => prev.map(p => 
        p.id === activeProjectId 
          ? { ...p, nodes: prevState, updatedAt: new Date().toISOString() }
          : p
      ));
    }
  }, [activeProjectId, history, historyIndex]);

  const redo = useCallback(() => {
    const projectHistory = history[activeProjectId];
    const currentIndex = historyIndex[activeProjectId] ?? -1;
    
    if (projectHistory && currentIndex < projectHistory.length - 1) {
      const nextState = JSON.parse(projectHistory[currentIndex + 1]);
      setHistoryIndex(prev => ({ ...prev, [activeProjectId]: currentIndex + 1 }));
      setProjects(prev => prev.map(p => 
        p.id === activeProjectId 
          ? { ...p, nodes: nextState, updatedAt: new Date().toISOString() }
          : p
      ));
    }
  }, [activeProjectId, history, historyIndex]);

  // ==========================================
  // FUNCIONES DE NODOS
  // ==========================================

  const updateProjectNodes = useCallback((newNodes, save = true) => {
    if (save) saveToHistory(activeProjectId, nodes);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
  }, [activeProjectId, nodes, saveToHistory]);

  const addNode = useCallback((parentId = null, position = null) => {
    const newId = crypto.randomUUID();

    setProjects(prev => {
      const currentProject = prev.find(p => p.id === activeProjectId);
      if (!currentProject) {
        console.error('No active project found');
        return prev;
      }
      
      const currentNodes = currentProject.nodes;
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
        parentId
      };

      console.log('Creating new node:', newNode);

      const updatedProjects = prev.map(p => 
        p.id === activeProjectId 
          ? { ...p, nodes: [...currentNodes, newNode], updatedAt: new Date().toISOString() }
          : p
      );
      
      console.log('Updated projects, new node count:', updatedProjects.find(p => p.id === activeProjectId)?.nodes.length);
      
      return updatedProjects;
    });

    setSelectedNodeId(newId);
    return newId;
  }, [activeProjectId]);

  const updateNodePosition = useCallback((id, x, y) => {
    const newNodes = nodes.map(n => n.id === id ? { ...n, x, y } : n);
    // No guardar en historial para posiciones (muy frecuente)
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
  }, [nodes, activeProjectId]);

  const updateNodeText = useCallback((id, text) => {
    const newNodes = nodes.map(n => n.id === id ? { ...n, text } : n);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
  }, [nodes, activeProjectId]);

  const updateNodeColor = useCallback((id, color) => {
    updateProjectNodes(nodes.map(n => n.id === id ? { ...n, color } : n));
  }, [nodes, updateProjectNodes]);

  // Actualizar comentario del nodo
  const updateNodeComment = useCallback((id, comment) => {
    const newNodes = nodes.map(n => n.id === id ? { ...n, comment } : n);
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
  }, [nodes, activeProjectId]);

  // Actualizar estilos del nodo (forma, colores, borde, línea)
  const updateNodeStyle = useCallback((id, styleUpdates) => {
    const newNodes = nodes.map(n => {
      if (n.id === id) {
        return { ...n, ...styleUpdates };
      }
      return n;
    });
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, nodes: newNodes, updatedAt: new Date().toISOString() }
        : p
    ));
  }, [nodes, activeProjectId]);

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
    updateProjectNodes(nodes.filter(n => !nodesToDelete.has(n.id)));
    setSelectedNodeId(null);
  }, [nodes, updateProjectNodes]);

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

    updateProjectNodes([...nodes, duplicate]);
    setSelectedNodeId(newId);
  }, [nodes, updateProjectNodes]);

  // ==========================================
  // GESTIÓN DE PROYECTOS
  // ==========================================

  // Crear proyecto en blanco (AGREGA, no reemplaza)
  const createBlankMap = useCallback((name = 'Nuevo Mapa') => {
    try {
      console.log('Creando nuevo proyecto en blanco...');
      
      const newProject = {
        id: crypto.randomUUID(),
        name: name,
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
      };

      setProjects(prev => [newProject, ...prev]);
      setActiveProjectId(newProject.id);
      setSelectedNodeId(null);
      
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

      setProjects(prev => [newProject, ...prev]);
      setActiveProjectId(newProject.id);
      setSelectedNodeId(null);
      
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

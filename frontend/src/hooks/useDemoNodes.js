import { useState, useCallback, useRef } from 'react';

// Mapa de demo por defecto
const createDemoMap = () => ({
  id: 'demo-project',
  name: 'Mi mapa de demo',
  layoutType: 'mindflow',
  nodes: [
    {
      id: 'demo-root',
      text: 'Mi Idea Principal',
      x: 300,
      y: 300,
      color: 'blue',
      parentId: null,
      width: 180,
      height: 64
    },
    {
      id: 'demo-child-1',
      text: 'Primer concepto',
      x: 580,
      y: 180,
      color: 'emerald',
      parentId: 'demo-root',
      width: 160,
      height: 64
    },
    {
      id: 'demo-child-2',
      text: 'Segundo concepto',
      x: 580,
      y: 300,
      color: 'amber',
      parentId: 'demo-root',
      width: 160,
      height: 64
    },
    {
      id: 'demo-child-3',
      text: 'Tercer concepto',
      x: 580,
      y: 420,
      color: 'rose',
      parentId: 'demo-root',
      width: 160,
      height: 64
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

const DEMO_STORAGE_KEY = 'mindora_demo_map';

// Cargar mapa demo desde localStorage o crear uno nuevo
const loadDemoFromStorage = () => {
  try {
    const saved = localStorage.getItem(DEMO_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading demo from storage:', e);
  }
  return createDemoMap();
};

// Guardar mapa demo en localStorage
const saveDemoToStorage = (project) => {
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(project));
  } catch (e) {
    console.error('Error saving demo to storage:', e);
  }
};

// Obtener mapa demo para transferir al registrarse
export const getDemoMapForTransfer = () => {
  const demoMap = loadDemoFromStorage();
  // Limpiar localStorage del demo
  localStorage.removeItem(DEMO_STORAGE_KEY);
  return demoMap;
};

// Verificar si hay un mapa demo guardado
export const hasDemoMap = () => {
  return localStorage.getItem(DEMO_STORAGE_KEY) !== null;
};

export const useDemoNodes = () => {
  const [project, setProject] = useState(loadDemoFromStorage);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState(new Set());
  
  // Estado para undo/redo
  const historyRef = useRef({
    states: [JSON.stringify(project.nodes)],
    pointer: 0
  });
  const [historyVersion, setHistoryVersion] = useState(0);
  const isUndoRedoAction = useRef(false);

  const nodes = project.nodes;
  const projectName = project.name;
  const activeProjectId = project.id;
  const activeProject = project;

  // Guardar en localStorage automáticamente
  const saveProject = useCallback((updatedProject) => {
    setProject(updatedProject);
    saveDemoToStorage(updatedProject);
  }, []);

  // Push to history
  const pushToHistory = useCallback((nodesToSave) => {
    if (isUndoRedoAction.current) return;
    
    const newState = JSON.stringify(nodesToSave);
    const history = historyRef.current;
    const { states, pointer } = history;
    
    const truncatedStates = states.slice(0, pointer + 1);
    
    if (truncatedStates.length > 0 && truncatedStates[truncatedStates.length - 1] === newState) {
      return;
    }
    
    const newStates = [...truncatedStates, newState];
    while (newStates.length > 50) newStates.shift();
    
    historyRef.current = {
      states: newStates,
      pointer: newStates.length - 1
    };
    
    setHistoryVersion(v => v + 1);
  }, []);

  // Undo/Redo
  const canUndo = historyRef.current.states.length > 1 && historyRef.current.pointer > 0;
  const canRedo = historyRef.current.pointer < historyRef.current.states.length - 1;

  const undo = useCallback(() => {
    const history = historyRef.current;
    if (history.pointer > 0) {
      isUndoRedoAction.current = true;
      const newPointer = history.pointer - 1;
      const prevState = JSON.parse(history.states[newPointer]);
      history.pointer = newPointer;
      saveProject({ ...project, nodes: prevState, updatedAt: new Date().toISOString() });
      setHistoryVersion(v => v + 1);
      setTimeout(() => { isUndoRedoAction.current = false; }, 0);
    }
  }, [project, saveProject]);

  const redo = useCallback(() => {
    const history = historyRef.current;
    if (history.pointer < history.states.length - 1) {
      isUndoRedoAction.current = true;
      const newPointer = history.pointer + 1;
      const nextState = JSON.parse(history.states[newPointer]);
      history.pointer = newPointer;
      saveProject({ ...project, nodes: nextState, updatedAt: new Date().toISOString() });
      setHistoryVersion(v => v + 1);
      setTimeout(() => { isUndoRedoAction.current = false; }, 0);
    }
  }, [project, saveProject]);

  // Actualizar nodos
  const updateNodes = useCallback((newNodes, saveHistory = true) => {
    if (saveHistory) pushToHistory(newNodes);
    saveProject({ ...project, nodes: newNodes, updatedAt: new Date().toISOString() });
  }, [project, pushToHistory, saveProject]);

  // Añadir nodo
  const addNode = useCallback((parentId = null, position = null, options = {}) => {
    const newId = crypto.randomUUID();
    const currentNodes = project.nodes;
    
    let newX = 400;
    let newY = 300;
    
    if (parentId) {
      const parent = currentNodes.find(n => n.id === parentId);
      if (parent) {
        const siblings = currentNodes.filter(n => n.parentId === parentId);
        newX = parent.x + (parent.width || 160) + 120;
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
      height: 64,
      nodeType: options?.nodeType || 'default'
    };

    const newNodes = [...currentNodes, newNode];
    updateNodes(newNodes);
    setSelectedNodeId(newId);
    return newId;
  }, [project, updateNodes]);

  // Actualizar posición de nodo
  const updateNodePosition = useCallback((nodeId, x, y) => {
    const newNodes = project.nodes.map(n =>
      n.id === nodeId ? { ...n, x, y } : n
    );
    updateNodes(newNodes, false);
  }, [project, updateNodes]);

  // Guardar posición en historial
  const saveNodePositionToHistory = useCallback((nodeId) => {
    pushToHistory(project.nodes);
  }, [project, pushToHistory]);

  // Actualizar texto de nodo
  const updateNodeText = useCallback((nodeId, text) => {
    const newNodes = project.nodes.map(n =>
      n.id === nodeId ? { ...n, text } : n
    );
    updateNodes(newNodes);
  }, [project, updateNodes]);

  // Actualizar color de nodo
  const updateNodeColor = useCallback((nodeId, color) => {
    const newNodes = project.nodes.map(n =>
      n.id === nodeId ? { ...n, color } : n
    );
    updateNodes(newNodes);
  }, [project, updateNodes]);

  // Actualizar estilo de nodo
  const updateNodeStyle = useCallback((nodeId, style) => {
    const newNodes = project.nodes.map(n =>
      n.id === nodeId ? { ...n, ...style } : n
    );
    updateNodes(newNodes);
  }, [project, updateNodes]);

  // Actualizar tamaño de nodo
  const updateNodeSize = useCallback((nodeId, width, height) => {
    const newNodes = project.nodes.map(n =>
      n.id === nodeId ? { ...n, width, height, manualWidth: width, manualHeight: height } : n
    );
    updateNodes(newNodes);
  }, [project, updateNodes]);

  // Actualizar icono de nodo
  const updateNodeIcon = useCallback((nodeId, icon) => {
    const newNodes = project.nodes.map(n =>
      n.id === nodeId ? { ...n, icon } : n
    );
    updateNodes(newNodes);
  }, [project, updateNodes]);

  // Eliminar nodo
  const deleteNode = useCallback((nodeId) => {
    const getAllDescendants = (id, allNodes) => {
      const descendants = [];
      const children = allNodes.filter(n => n.parentId === id);
      children.forEach(child => {
        descendants.push(child.id);
        descendants.push(...getAllDescendants(child.id, allNodes));
      });
      return descendants;
    };

    const descendants = getAllDescendants(nodeId, project.nodes);
    const idsToDelete = [nodeId, ...descendants];
    const newNodes = project.nodes.filter(n => !idsToDelete.includes(n.id));
    updateNodes(newNodes);
    setSelectedNodeId(null);
  }, [project, updateNodes]);

  // Duplicar nodo
  const duplicateNode = useCallback((nodeId) => {
    const node = project.nodes.find(n => n.id === nodeId);
    if (!node) return null;

    const newId = crypto.randomUUID();
    const newNode = {
      ...node,
      id: newId,
      x: node.x + 50,
      y: node.y + 50
    };

    const newNodes = [...project.nodes, newNode];
    updateNodes(newNodes);
    setSelectedNodeId(newId);
    return newId;
  }, [project, updateNodes]);

  // Selección múltiple
  const addToSelection = useCallback((nodeId) => {
    setSelectedNodeIds(prev => {
      const newSet = new Set(prev);
      if (selectedNodeId && !newSet.has(selectedNodeId)) {
        newSet.add(selectedNodeId);
      }
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
    setSelectedNodeId(null);
  }, [selectedNodeId]);

  const selectSingleNode = useCallback((nodeId) => {
    setSelectedNodeId(nodeId);
    setSelectedNodeIds(new Set());
  }, []);

  const selectAllNodes = useCallback(() => {
    setSelectedNodeIds(new Set(project.nodes.map(n => n.id)));
    setSelectedNodeId(null);
  }, [project]);

  const clearSelection = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedNodeIds(new Set());
  }, []);

  const selectNodesInArea = useCallback((startPoint, endPoint) => {
    const minX = Math.min(startPoint.x, endPoint.x);
    const maxX = Math.max(startPoint.x, endPoint.x);
    const minY = Math.min(startPoint.y, endPoint.y);
    const maxY = Math.max(startPoint.y, endPoint.y);

    const nodesInArea = project.nodes.filter(node => {
      const nodeRight = node.x + (node.width || 160);
      const nodeBottom = node.y + (node.height || 64);
      return node.x < maxX && nodeRight > minX && node.y < maxY && nodeBottom > minY;
    });

    setSelectedNodeIds(new Set(nodesInArea.map(n => n.id)));
    setSelectedNodeId(null);
  }, [project]);

  const isNodeSelected = useCallback((nodeId) => {
    return selectedNodeId === nodeId || selectedNodeIds.has(nodeId);
  }, [selectedNodeId, selectedNodeIds]);

  const getSelectedNodes = useCallback(() => {
    if (selectedNodeIds.size > 0) {
      return project.nodes.filter(n => selectedNodeIds.has(n.id));
    }
    if (selectedNodeId) {
      const node = project.nodes.find(n => n.id === selectedNodeId);
      return node ? [node] : [];
    }
    return [];
  }, [project, selectedNodeId, selectedNodeIds]);

  // Eliminar nodos seleccionados
  const deleteSelectedNodes = useCallback(() => {
    const idsToDelete = selectedNodeIds.size > 0 
      ? Array.from(selectedNodeIds) 
      : (selectedNodeId ? [selectedNodeId] : []);
    
    if (idsToDelete.length === 0) return;

    const newNodes = project.nodes.filter(n => !idsToDelete.includes(n.id));
    updateNodes(newNodes);
    clearSelection();
  }, [project, selectedNodeId, selectedNodeIds, updateNodes, clearSelection]);

  // Mover nodos seleccionados
  const moveSelectedNodes = useCallback((deltaX, deltaY) => {
    const idsToMove = selectedNodeIds.size > 0 
      ? Array.from(selectedNodeIds) 
      : (selectedNodeId ? [selectedNodeId] : []);
    
    if (idsToMove.length === 0) return;

    const newNodes = project.nodes.map(n => 
      idsToMove.includes(n.id) 
        ? { ...n, x: n.x + deltaX, y: n.y + deltaY }
        : n
    );
    updateNodes(newNodes, false);
  }, [project, selectedNodeId, selectedNodeIds, updateNodes]);

  // Centrar todos los nodos
  const centerAllNodes = useCallback((canvasWidth, canvasHeight) => {
    const currentNodes = project.nodes;
    if (currentNodes.length === 0) return;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    currentNodes.forEach(node => {
      const nodeW = node.width || 160;
      const nodeH = node.height || 64;
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x + nodeW);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y + nodeH);
    });

    const groupWidth = maxX - minX;
    const groupHeight = maxY - minY;
    const targetCenterX = canvasWidth / 2;
    const targetCenterY = canvasHeight / 2;
    const currentCenterX = minX + groupWidth / 2;
    const currentCenterY = minY + groupHeight / 2;
    const deltaX = targetCenterX - currentCenterX;
    const deltaY = targetCenterY - currentCenterY;

    const newNodes = currentNodes.map(node => ({
      ...node,
      x: node.x + deltaX,
      y: node.y + deltaY
    }));

    updateNodes(newNodes);
  }, [project, updateNodes]);

  // Funciones placeholder para compatibilidad
  const updateNodeComment = useCallback(() => {}, []);
  const toggleNodeCompleted = useCallback(() => {}, []);
  const updateNodeType = useCallback(() => {}, []);
  const updateDashedLineWidth = useCallback(() => {}, []);
  const addNodeLink = useCallback(() => {}, []);
  const removeNodeLink = useCallback(() => {}, []);
  const updateNodeLink = useCallback(() => {}, []);
  const addNodeHorizontal = useCallback(() => {}, []);
  const addNodeVertical = useCallback(() => {}, []);
  const addNodeFromLine = useCallback(() => {}, []);

  // Alineaciones placeholder
  const alignNodesLeft = useCallback(() => {}, []);
  const alignNodesCenter = useCallback(() => {}, []);
  const alignNodesRight = useCallback(() => {}, []);
  const alignNodesTop = useCallback(() => {}, []);
  const alignNodesMiddle = useCallback(() => {}, []);
  const alignNodesBottom = useCallback(() => {}, []);
  const alignTextLeft = useCallback(() => {}, []);
  const alignTextCenter = useCallback(() => {}, []);
  const alignTextRight = useCallback(() => {}, []);
  const alignSingleNodeTextLeft = useCallback(() => {}, []);
  const alignSingleNodeTextCenter = useCallback(() => {}, []);
  const alignSingleNodeTextRight = useCallback(() => {}, []);
  const distributeNodesVertically = useCallback(() => {}, []);
  const distributeNodesHorizontally = useCallback(() => {}, []);
  const applyFullAutoAlignment = useCallback(() => {}, []);
  const applyFullMindTreeAlignment = useCallback(() => {}, []);
  const applyFullMindHybridAlignment = useCallback(() => {}, []);
  const duplicateSelectedNodes = useCallback(() => {}, []);

  return {
    nodes,
    projectName,
    activeProjectId,
    activeProject,
    projects: [project],
    selectedNodeId,
    setSelectedNodeId,
    addNode,
    addNodeHorizontal,
    addNodeVertical,
    addNodeFromLine,
    updateNodePosition,
    updateNodeText,
    updateNodeColor,
    updateNodeComment,
    toggleNodeCompleted,
    updateNodeStyle,
    updateNodeSize,
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
    undo,
    redo,
    canUndo,
    canRedo,
    // Selección múltiple
    selectedNodeIds,
    addToSelection,
    selectSingleNode,
    selectAllNodes,
    clearSelection,
    selectNodesInArea,
    isNodeSelected,
    getSelectedNodes,
    deleteSelectedNodes,
    duplicateSelectedNodes,
    moveSelectedNodes,
    // Alineaciones
    alignNodesLeft,
    alignNodesCenter,
    alignNodesRight,
    alignNodesTop,
    alignNodesMiddle,
    alignNodesBottom,
    alignTextLeft,
    alignTextCenter,
    alignTextRight,
    alignSingleNodeTextLeft,
    alignSingleNodeTextCenter,
    alignSingleNodeTextRight,
    distributeNodesVertically,
    distributeNodesHorizontally,
    applyFullAutoAlignment,
    applyFullMindTreeAlignment,
    applyFullMindHybridAlignment
  };
};

export default useDemoNodes;

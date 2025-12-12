import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'mindmap_nodes';

const DEFAULT_NODES = [
  { id: 'root', text: 'Idea Principal', x: 200, y: 280, color: 'blue', parentId: null },
  { id: '2', text: 'Concepto 1', x: 480, y: 120, color: 'pink', parentId: 'root' },
  { id: '3', text: 'Concepto 2', x: 480, y: 280, color: 'green', parentId: 'root' },
  { id: '4', text: 'Concepto 3', x: 480, y: 440, color: 'yellow', parentId: 'root' },
];

export const useNodes = () => {
  const [nodes, setNodes] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading nodes from localStorage:', e);
    }
    return DEFAULT_NODES;
  });

  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Guardar en localStorage cuando cambian los nodos
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes));
    } catch (e) {
      console.error('Error saving nodes to localStorage:', e);
    }
  }, [nodes]);

  // Guardar estado en historial para undo/redo
  const saveToHistory = useCallback((newNodes) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.stringify(newNodes));
      // Limitar historial a 50 estados
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const generateId = () => crypto.randomUUID();

  const addNode = useCallback((parentId = null, position = null) => {
    const newId = generateId();
    let newX, newY;

    if (parentId) {
      const parent = nodes.find(n => n.id === parentId);
      if (parent) {
        const siblings = nodes.filter(n => n.parentId === parentId);
        newX = parent.x + 280;
        newY = parent.y + (siblings.length * 100) - 50;
      } else {
        newX = 400;
        newY = 300;
      }
    } else if (position) {
      newX = position.x;
      newY = position.y;
    } else {
      newX = 400;
      newY = 300;
    }

    const newNode = {
      id: newId,
      text: 'Nuevo Nodo',
      x: newX,
      y: newY,
      color: 'blue',
      parentId
    };

    const newNodes = [...nodes, newNode];
    saveToHistory(newNodes);
    setNodes(newNodes);
    setSelectedNodeId(newId);
    return newId;
  }, [nodes, saveToHistory]);

  const updateNode = useCallback((id, updates) => {
    setNodes(prev => prev.map(n => 
      n.id === id ? { ...n, ...updates } : n
    ));
  }, []);

  const updateNodePosition = useCallback((id, x, y) => {
    setNodes(prev => prev.map(n => 
      n.id === id ? { ...n, x, y } : n
    ));
  }, []);

  const updateNodeText = useCallback((id, text) => {
    setNodes(prev => prev.map(n => 
      n.id === id ? { ...n, text } : n
    ));
  }, []);

  const updateNodeColor = useCallback((id, color) => {
    const newNodes = nodes.map(n => 
      n.id === id ? { ...n, color } : n
    );
    saveToHistory(newNodes);
    setNodes(newNodes);
  }, [nodes, saveToHistory]);

  const deleteNode = useCallback((id) => {
    // Encontrar todos los nodos hijos recursivamente
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
    
    saveToHistory(newNodes);
    setNodes(newNodes);
    setSelectedNodeId(null);
  }, [nodes, saveToHistory]);

  const duplicateNode = useCallback((id) => {
    const original = nodes.find(n => n.id === id);
    if (!original) return;

    const newId = generateId();
    const duplicate = {
      ...original,
      id: newId,
      x: original.x + 30,
      y: original.y + 30
    };

    const newNodes = [...nodes, duplicate];
    saveToHistory(newNodes);
    setNodes(newNodes);
    setSelectedNodeId(newId);
  }, [nodes, saveToHistory]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = JSON.parse(history[historyIndex - 1]);
      setHistoryIndex(prev => prev - 1);
      setNodes(prevState);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = JSON.parse(history[historyIndex + 1]);
      setHistoryIndex(prev => prev + 1);
      setNodes(nextState);
    }
  }, [history, historyIndex]);

  const resetToDefault = useCallback(() => {
    saveToHistory(DEFAULT_NODES);
    setNodes(DEFAULT_NODES);
    setSelectedNodeId(null);
  }, [saveToHistory]);

  const clearAll = useCallback(() => {
    const rootNode = [{ id: 'root', text: 'Idea Principal', x: 300, y: 300, color: 'blue', parentId: null }];
    saveToHistory(rootNode);
    setNodes(rootNode);
    setSelectedNodeId(null);
  }, [saveToHistory]);

  return {
    nodes,
    setNodes,
    selectedNodeId,
    setSelectedNodeId,
    addNode,
    updateNode,
    updateNodePosition,
    updateNodeText,
    updateNodeColor,
    deleteNode,
    duplicateNode,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    resetToDefault,
    clearAll
  };
};

import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { Link2 } from 'lucide-react';
import NodeItem, { NODE_WIDTH, NODE_HEIGHT } from './NodeItem';
import ConnectionsLayer from './ConnectionsLayer';
import ContextMenu from './ContextMenu';
import NodeToolbar from './NodeToolbar';
import CommentPopover from './CommentPopover';
import LinkPopover from './LinkPopover';
import NodeTypeSelector from './NodeTypeSelector';
import LinkedProjectModal from './LinkedProjectModal';
import SelectionBox from './SelectionBox';
import CanvasModePanel from './CanvasModePanel';
import CanvasGrid from './CanvasGrid';
import CanvasRulers, { RULER_SIZE } from './CanvasRulers';
import NavigationModeButton from './NavigationModeButton';
import NodeTaskModal from './NodeTaskModal';
import { useTouchGestures } from '../../hooks/useTouchGestures';
import { getSmartAnchorToPosition, getSmartAnchorPoints, generatePreviewPath, generateSmartPath } from '../../utils/curve';

const Canvas = ({
  nodes,
  selectedNodeId,
  selectedNodeIds = new Set(),
  pan,
  zoom,
  setPan,
  setZoom,
  isPanning,
  interactionMode = 'hand',
  onSetInteractionMode,
  contextMenu,
  isSidebarExpanded = false,
  isMobileOverlayOpen = false,
  onSelectNode,
  onAddToSelection,
  onSelectNodesInArea,
  onClearSelection,
  isNodeSelected,
  onStartPanning,
  onUpdatePanning,
  onStopPanning,
  onUpdateNodePosition,
  onUpdateNodeText,
  onUpdateNodeComment,
  onUpdateNodeStyle,
  onUpdateNodeSize,
  onUpdateNodeIcon,
  onAddNodeLink,
  onRemoveNodeLink,
  onUpdateNodeLink,
  onSaveNodePositionToHistory,
  onOpenContextMenu,
  onCloseContextMenu,
  onAddChildNode,
  onAddNodeHorizontal,
  onAddNodeVertical,
  onAddNodeFromLine,
  onDuplicateNode,
  onDeleteNode,
  onDisconnectNode,
  onConnectNodes,
  onChangeNodeColor,
  onChangeNodeType,
  onChangeLineWidth,
  onMoveSelectedNodes,
  onWheel,
  onToggleStyleSidebar,
  onOpenIconPanel,
  onOpenReminderPanel,
  styleSidebarOpen,
  sidebarTab,
  // Alineación automática
  autoAlignEnabled,
  onAutoAlign,
  // Alineación de texto
  onAlignTextLeft,
  onAlignTextCenter,
  onAlignTextRight,
  // Toggle completado
  onToggleNodeCompleted,
  // Tipo de layout del proyecto
  layoutType = 'mindflow',
  // Pantalla completa y visualización
  isFullscreen = false,
  onEnterFullscreen,
  showGrid = true,
  showRulers = true,
  onToggleGrid,
  onToggleRulers,
  // Zoom limits para gestos táctiles
  minZoom = 0.3,
  maxZoom = 2,
  // Props para nodos tipo proyecto
  projects = [],
  currentProjectId = null,
  onNavigateToProject,
  onCreateProject
}) => {
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [newNodeId, setNewNodeId] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const [commentPopover, setCommentPopover] = useState({ isOpen: false, nodeId: null });
  const [linkPopover, setLinkPopover] = useState({ isOpen: false, nodeId: null });
  const [nodeTypeSelector, setNodeTypeSelector] = useState({ isOpen: false, position: null, parentId: null });
  const [linkedProjectModal, setLinkedProjectModal] = useState({ isOpen: false, parentId: null });
  const [canvasBounds, setCanvasBounds] = useState(null);
  
  // Estado para selección por área (drag selection)
  const [selectionBox, setSelectionBox] = useState(null);
  const [isSelectingArea, setIsSelectingArea] = useState(false);

  // Estado para modo navegación (móvil/tablet)
  // Cuando está activo, los nodos no se pueden mover, solo hacer pan/zoom
  const [isNavigationMode, setIsNavigationMode] = useState(false);

  // Estado para modo de conexión manual
  const [connectionMode, setConnectionMode] = useState({
    isActive: false,
    sourceNodeId: null,
    mousePosition: { x: 0, y: 0 },
    snapTargetId: null,  // ID del nodo al que se está haciendo "snap"
    snapAnchor: null     // Coordenadas del anchor del nodo snap { x, y, point }
  });
  
  // Ref para mantener el estado de conexión actualizado (evita stale closures)
  const connectionModeRef = useRef(connectionMode);
  useEffect(() => {
    connectionModeRef.current = connectionMode;
  }, [connectionMode]);

  // Constante para la distancia de snap (en píxeles del canvas)
  const SNAP_DISTANCE = 60;

  // Actualizar los límites del canvas cuando cambie el tamaño o las reglas
  useEffect(() => {
    const updateCanvasBounds = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasBounds({
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom
        });
      }
    };
    
    updateCanvasBounds();
    
    // Actualizar en resize
    window.addEventListener('resize', updateCanvasBounds);
    
    // Observer para cambios de layout
    const resizeObserver = new ResizeObserver(updateCanvasBounds);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      window.removeEventListener('resize', updateCanvasBounds);
      resizeObserver.disconnect();
    };
  }, [showRulers]);

  // Handler para tap en el canvas (touch)
  const handleTouchTap = useCallback((e) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const adjustedPanX = pan.x + (showRulers ? RULER_SIZE : 0);
    const adjustedPanY = pan.y + (showRulers ? RULER_SIZE : 0);
    
    // Convertir coordenadas de pantalla a coordenadas del canvas
    const canvasX = (e.clientX - rect.left - adjustedPanX) / zoom;
    const canvasY = (e.clientY - rect.top - adjustedPanY) / zoom;
    
    // Verificar si se tocó un nodo
    const touchedNode = nodes.find(node => {
      const nodeW = node.width || NODE_WIDTH;
      const nodeH = node.height || NODE_HEIGHT;
      return (
        canvasX >= node.x &&
        canvasX <= node.x + nodeW &&
        canvasY >= node.y &&
        canvasY <= node.y + nodeH
      );
    });
    
    if (touchedNode) {
      onSelectNode(touchedNode.id);
    } else {
      // Tap en el canvas vacío - deseleccionar
      if (onClearSelection) onClearSelection();
      onSelectNode(null);
    }
  }, [nodes, pan, zoom, showRulers, onSelectNode, onClearSelection]);

  // Gestos táctiles para pan y zoom (se desactiva cuando hay nodo arrastrándose)
  const { touchHandlers: baseTouchHandlers, isTouching, isPinching } = useTouchGestures({
    zoom,
    setZoom,
    pan,
    setPan,
    minZoom,
    maxZoom,
    onTap: handleTouchTap,
    enabled: !dragging
  });

  // Handlers táctiles combinados (para mover nodos con touch)
  // En modo navegación, solo permite pan/zoom, no arrastrar nodos
  const touchHandlers = useMemo(() => ({
    onTouchStart: (e) => {
      // Si hay un nodo siendo arrastrado por mouse, continuar con ese
      // PERO en modo navegación, ignorar el arrastre de nodos
      if (dragging && !isNavigationMode) return;
      
      // Llamar al handler base para pan/zoom/tap
      baseTouchHandlers.onTouchStart(e);
    },
    onTouchMove: (e) => {
      // Si hay un nodo siendo arrastrado Y NO estamos en modo navegación, mover el nodo
      if (dragging && !isNavigationMode && e.touches.length === 1) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        const adjustedPanX = pan.x + (showRulers ? RULER_SIZE : 0);
        const adjustedPanY = pan.y + (showRulers ? RULER_SIZE : 0);
        
        const newX = (touch.clientX - rect.left - adjustedPanX) / zoom - dragging.offsetX;
        const newY = (touch.clientY - rect.top - adjustedPanY) / zoom - dragging.offsetY;
        
        // Mover el nodo
        if (selectedNodeIds.size > 1 && selectedNodeIds.has(dragging.nodeId)) {
          const node = nodes.find(n => n.id === dragging.nodeId);
          if (node && onMoveSelectedNodes) {
            const deltaX = newX - node.x;
            const deltaY = newY - node.y;
            onMoveSelectedNodes(deltaX, deltaY);
          }
        } else {
          onUpdateNodePosition(dragging.nodeId, newX, newY);
        }
        return;
      }
      
      // En modo navegación O si no hay nodo arrastrándose, usar pan/zoom
      baseTouchHandlers.onTouchMove(e);
    },
    onTouchEnd: (e) => {
      // Si había un nodo arrastrándose Y NO estamos en modo navegación, terminar
      if (dragging && !isNavigationMode) {
        setShowControls(true);
        if (onSaveNodePositionToHistory) {
          onSaveNodePositionToHistory();
        }
        setDragging(null);
        return;
      }
      
      baseTouchHandlers.onTouchEnd(e);
    },
    onTouchCancel: (e) => {
      if (dragging && !isNavigationMode) {
        setDragging(null);
        return;
      }
      baseTouchHandlers.onTouchCancel(e);
    }
  }), [baseTouchHandlers, dragging, isNavigationMode, pan, zoom, showRulers, nodes, selectedNodeIds, onUpdateNodePosition, onMoveSelectedNodes, onSaveNodePositionToHistory]);

  // Offset para las reglas (0 si están ocultas)
  const rulerOffset = showRulers ? RULER_SIZE : 0;

  // Obtener nodo seleccionado (para toolbar individual)
  const selectedNode = selectedNodeIds.size === 0 ? nodes.find(n => n.id === selectedNodeId) : null;

  // Calcular posiciones transformadas para los controles
  const controlPositions = useMemo(() => {
    if (!selectedNode) return { addButton: null, addButtonRight: null, addButtonBottom: null, toolbar: null };
    
    // Usar tamaño del nodo si está disponible, sino usar valores por defecto
    const nodeW = selectedNode.width || NODE_WIDTH;
    const nodeH = selectedNode.height || NODE_HEIGHT;
    
    // Ajustar por el offset de las reglas
    const adjustedPanX = pan.x + rulerOffset;
    const adjustedPanY = pan.y + rulerOffset;
    
    let addButtonX, addButtonY;
    let addButtonRightX, addButtonRightY;
    let addButtonBottomX, addButtonBottomY;
    let addButtonLeftX, addButtonLeftY;
    
    if (layoutType === 'mindhybrid') {
      // MindHybrid: DOS botones - derecha (horizontal) e inferior (vertical)
      // Botón derecho (crear hijo horizontal)
      addButtonRightX = (selectedNode.x + nodeW + 15) * zoom + adjustedPanX;
      addButtonRightY = (selectedNode.y + nodeH / 2) * zoom + adjustedPanY;
      // Botón inferior (crear hijo vertical)
      addButtonBottomX = (selectedNode.x + nodeW / 2) * zoom + adjustedPanX;
      addButtonBottomY = (selectedNode.y + nodeH + 20) * zoom + adjustedPanY;
      // No mostrar botón único
      addButtonX = null;
      addButtonY = null;
    } else if (layoutType === 'mindaxis') {
      // MindAxis: DOS botones - izquierda y derecha para nodo central
      const isRoot = !selectedNode.parentId;
      if (isRoot) {
        // Nodo central: botones a ambos lados
        addButtonLeftX = (selectedNode.x - 40) * zoom + adjustedPanX;
        addButtonLeftY = (selectedNode.y + nodeH / 2) * zoom + adjustedPanY;
        addButtonRightX = (selectedNode.x + nodeW + 15) * zoom + adjustedPanX;
        addButtonRightY = (selectedNode.y + nodeH / 2) * zoom + adjustedPanY;
        addButtonX = null;
        addButtonY = null;
      } else {
        // Nodos hijos: botón en el lado correspondiente
        const side = selectedNode.axisSide || 'right';
        if (side === 'left') {
          addButtonX = (selectedNode.x - 40) * zoom + adjustedPanX;
          addButtonY = (selectedNode.y + nodeH / 2) * zoom + adjustedPanY;
        } else {
          addButtonX = (selectedNode.x + nodeW + 15) * zoom + adjustedPanX;
          addButtonY = (selectedNode.y + nodeH / 2 - 14) * zoom + adjustedPanY;
        }
      }
    } else if (layoutType === 'mindorbit') {
      // MindOrbit: botón radial alrededor del nodo
      // Para el nodo central, mostrar botón circular arriba
      // Para otros nodos, mostrar botón alejándose del centro
      const isRoot = !selectedNode.parentId;
      if (isRoot) {
        // Nodo central: botón arriba (dirección de primera órbita)
        addButtonX = (selectedNode.x + nodeW / 2) * zoom + adjustedPanX;
        addButtonY = (selectedNode.y - 35) * zoom + adjustedPanY;
      } else {
        // Nodos orbitales: botón en dirección radial hacia afuera
        addButtonX = (selectedNode.x + nodeW + 15) * zoom + adjustedPanX;
        addButtonY = (selectedNode.y + nodeH / 2 - 14) * zoom + adjustedPanY;
      }
    } else if (layoutType === 'mindtree') {
      // MindTree (Organigrama): botón "+" DEBAJO del nodo
      addButtonX = (selectedNode.x + nodeW / 2) * zoom + adjustedPanX;
      addButtonY = (selectedNode.y + nodeH + 20) * zoom + adjustedPanY;
    } else {
      // MindFlow: botón "+" al LADO derecho del nodo
      addButtonX = (selectedNode.x + nodeW + 15) * zoom + adjustedPanX;
      addButtonY = (selectedNode.y + nodeH / 2 - 14) * zoom + adjustedPanY;
    }
    
    const toolbarX = (selectedNode.x + nodeW / 2) * zoom + adjustedPanX;
    const toolbarY = (selectedNode.y - 60) * zoom + adjustedPanY;
    
    return {
      addButton: addButtonX !== null ? { x: addButtonX, y: addButtonY } : null,
      addButtonRight: addButtonRightX ? { x: addButtonRightX, y: addButtonRightY } : null,
      addButtonBottom: addButtonBottomX ? { x: addButtonBottomX, y: addButtonBottomY } : null,
      addButtonLeft: addButtonLeftX ? { x: addButtonLeftX, y: addButtonLeftY } : null,
      toolbar: { x: toolbarX, y: toolbarY }
    };
  }, [selectedNode, zoom, pan, layoutType]);

  // Calcular posición del popover de comentario
  const getCommentPopoverPosition = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    
    // Ajustar por el offset de las reglas
    const adjustedPanX = pan.x + rulerOffset;
    const adjustedPanY = pan.y + rulerOffset;
    
    const x = (node.x + NODE_WIDTH / 2) * zoom + adjustedPanX;
    const y = (node.y + NODE_HEIGHT + 10) * zoom + adjustedPanY;
    
    return { x, y };
  }, [nodes, zoom, pan]);

  // Handler para agregar nodo hijo desde el botón "+"
  const handleAddChildFromButton = useCallback(() => {
    if (selectedNodeId && controlPositions.addButton) {
      // Mostrar selector de tipo de nodo
      setNodeTypeSelector({
        isOpen: true,
        position: {
          x: controlPositions.addButton.x,
          y: controlPositions.addButton.y + 30
        },
        parentId: selectedNodeId
      });
      setShowControls(false);
    }
  }, [selectedNodeId, controlPositions.addButton]);

  // Handler para agregar nodo HORIZONTAL (MindHybrid) - botón derecho
  const handleAddChildHorizontal = useCallback(() => {
    if (selectedNodeId && onAddNodeHorizontal) {
      onAddNodeHorizontal(selectedNodeId, { autoAlign: autoAlignEnabled });
    }
  }, [selectedNodeId, onAddNodeHorizontal, autoAlignEnabled]);

  // Handler para agregar nodo VERTICAL (MindHybrid) - botón inferior
  const handleAddChildVertical = useCallback(() => {
    if (selectedNodeId && onAddNodeVertical) {
      onAddNodeVertical(selectedNodeId, { autoAlign: autoAlignEnabled });
    }
  }, [selectedNodeId, onAddNodeVertical, autoAlignEnabled]);

  // Handler para agregar nodo a la IZQUIERDA (MindAxis)
  const handleAddChildLeft = useCallback(() => {
    if (selectedNodeId && onAddChildNode) {
      const selectedNode = nodes.find(n => n.id === selectedNodeId);
      if (selectedNode) {
        // Forzar lado izquierdo
        onAddChildNode(selectedNodeId, null, { 
          autoAlign: autoAlignEnabled,
          axisSide: 'left'
        });
      }
    }
  }, [selectedNodeId, onAddChildNode, autoAlignEnabled, nodes]);

  // Handler para agregar nodo a la DERECHA (MindAxis)
  const handleAddChildRight = useCallback(() => {
    if (selectedNodeId && onAddChildNode) {
      const selectedNode = nodes.find(n => n.id === selectedNodeId);
      if (selectedNode) {
        // Forzar lado derecho
        onAddChildNode(selectedNodeId, null, { 
          autoAlign: autoAlignEnabled,
          axisSide: 'right'
        });
      }
    }
  }, [selectedNodeId, onAddChildNode, autoAlignEnabled, nodes]);

  // Handler para cuando se selecciona un tipo de nodo
  const handleNodeTypeSelect = useCallback((nodeType) => {
    if (nodeTypeSelector.parentId) {
      // Pasar el flag de autoAlign en las opciones
      const newId = onAddChildNode(nodeTypeSelector.parentId, null, { 
        nodeType, 
        autoAlign: autoAlignEnabled 
      });
      setNewNodeId(newId);
      setNodeTypeSelector({ isOpen: false, position: null, parentId: null });
      setTimeout(() => setShowControls(true), 500);
    }
  }, [nodeTypeSelector.parentId, onAddChildNode, autoAlignEnabled]);

  // Handler para cuando se selecciona tipo "Proyecto" - abre modal de selección
  const handleSelectProjectType = useCallback(() => {
    const parentId = nodeTypeSelector.parentId;
    setNodeTypeSelector({ isOpen: false, position: null, parentId: null });
    setLinkedProjectModal({ isOpen: true, parentId });
  }, [nodeTypeSelector.parentId]);

  // Handler para seleccionar un proyecto existente para vincular
  const handleSelectLinkedProject = useCallback((project) => {
    if (linkedProjectModal.parentId && project) {
      const newId = onAddChildNode(linkedProjectModal.parentId, project.name, { 
        nodeType: 'project',
        linkedProjectId: project.id,
        autoAlign: autoAlignEnabled 
      });
      setNewNodeId(newId);
      setLinkedProjectModal({ isOpen: false, parentId: null });
      setTimeout(() => setShowControls(true), 500);
    }
  }, [linkedProjectModal.parentId, onAddChildNode, autoAlignEnabled]);

  // Handler para crear un nuevo proyecto y vincularlo
  const handleCreateAndLinkProject = useCallback(async (projectName) => {
    if (linkedProjectModal.parentId && onCreateProject) {
      const newProject = await onCreateProject(projectName);
      if (newProject) {
        const newId = onAddChildNode(linkedProjectModal.parentId, projectName, { 
          nodeType: 'project',
          linkedProjectId: newProject.id,
          autoAlign: autoAlignEnabled 
        });
        setNewNodeId(newId);
        setLinkedProjectModal({ isOpen: false, parentId: null });
        setTimeout(() => setShowControls(true), 500);
      }
    }
  }, [linkedProjectModal.parentId, onAddChildNode, onCreateProject, autoAlignEnabled]);

  // Handler para cerrar modal de proyecto vinculado
  const handleCloseLinkedProjectModal = useCallback(() => {
    setLinkedProjectModal({ isOpen: false, parentId: null });
    setShowControls(true);
  }, []);

  // Handler para abrir modal de vinculación desde el menú contextual
  const handleLinkToProjectFromContext = useCallback((nodeId) => {
    setLinkedProjectModal({ isOpen: true, parentId: null, nodeIdToLink: nodeId });
  }, []);

  // Handler para vincular un nodo existente a un proyecto
  const handleLinkExistingNodeToProject = useCallback((project) => {
    const nodeId = linkedProjectModal.nodeIdToLink;
    if (nodeId && project && onChangeNodeType) {
      // Cambiar el tipo del nodo a 'project' y agregar linkedProjectId
      onChangeNodeType(nodeId, 'project', { linkedProjectId: project.id, text: project.name });
    }
    setLinkedProjectModal({ isOpen: false, parentId: null, nodeIdToLink: null });
  }, [linkedProjectModal.nodeIdToLink, onChangeNodeType]);

  // Handler para desvincular un nodo de un proyecto
  const handleUnlinkProject = useCallback((nodeId) => {
    if (nodeId && onChangeNodeType) {
      onChangeNodeType(nodeId, 'default', { linkedProjectId: null });
    }
  }, [onChangeNodeType]);

  // Handler para convertir un nodo en tarea
  const handleConvertToTask = useCallback((nodeId) => {
    if (nodeId && onChangeNodeType) {
      // Convertir el nodo a tipo tarea
      onChangeNodeType(nodeId, 'task', { 
        taskStatus: 'pending',
        taskData: { 
          checklist: [], 
          dueDate: null, 
          priority: null,
          progress: 0,
          notes: '',
          timerSeconds: 0,
          timerRunning: false
        }
      });
      
      // Abrir automáticamente el panel de tarea
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        // Crear un nodo actualizado con los nuevos valores para el modal
        const updatedNode = {
          ...node,
          nodeType: 'task',
          taskStatus: 'pending',
          taskData: { 
            checklist: [], 
            dueDate: null, 
            priority: null,
            progress: 0,
            notes: '',
            timerSeconds: 0,
            timerRunning: false
          }
        };
        setTaskNodeModal({ isOpen: true, node: updatedNode });
      }
    }
  }, [onChangeNodeType, nodes]);

  // Handler para quitar el estado de tarea
  const handleRemoveTaskStatus = useCallback((nodeId) => {
    if (nodeId && onChangeNodeType) {
      onChangeNodeType(nodeId, 'default', { 
        taskStatus: null,
        taskData: null
      });
    }
  }, [onChangeNodeType]);

  // Handler para reabrir una tarea completada
  const handleReopenTask = useCallback((nodeId) => {
    if (nodeId && onChangeNodeType) {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        onChangeNodeType(nodeId, 'task', { 
          taskStatus: 'pending',
          taskData: { ...node.taskData, progress: 0 }
        });
      }
    }
  }, [onChangeNodeType, nodes]);

  // Estado para el modal de tarea del nodo
  const [taskNodeModal, setTaskNodeModal] = useState({ isOpen: false, node: null });

  // Handler para abrir el modal de tarea
  const handleOpenTaskModal = useCallback((node) => {
    setTaskNodeModal({ isOpen: true, node });
  }, []);

  // Handler para cerrar el modal de tarea
  const handleCloseTaskModal = useCallback(() => {
    setTaskNodeModal({ isOpen: false, node: null });
  }, []);

  // Handler para actualizar la tarea del nodo
  const handleUpdateNodeTask = useCallback((nodeId, taskUpdates) => {
    if (nodeId && onChangeNodeType) {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        const newTaskData = { ...node.taskData, ...taskUpdates };
        
        // Calcular progreso basado en checklist
        if (newTaskData.checklist && newTaskData.checklist.length > 0) {
          const completed = newTaskData.checklist.filter(item => item.completed).length;
          newTaskData.progress = Math.round((completed / newTaskData.checklist.length) * 100);
          
          // Cambiar estado automáticamente
          if (completed === newTaskData.checklist.length) {
            onChangeNodeType(nodeId, 'task', { taskStatus: 'completed', taskData: newTaskData });
          } else if (completed > 0) {
            onChangeNodeType(nodeId, 'task', { taskStatus: 'in_progress', taskData: newTaskData });
          } else {
            onChangeNodeType(nodeId, 'task', { taskStatus: 'pending', taskData: newTaskData });
          }
        } else {
          onChangeNodeType(nodeId, 'task', { taskData: newTaskData });
        }
      }
    }
  }, [onChangeNodeType, nodes]);

  // Handler para cerrar el selector de tipo de nodo
  const handleCloseNodeTypeSelector = useCallback(() => {
    setNodeTypeSelector({ isOpen: false, position: null, parentId: null });
    setShowControls(true);
  }, []);

  // Handler cuando se completa la edición del nuevo nodo
  const handleEditComplete = useCallback(() => {
    setNewNodeId(null);
    setShowControls(true);
  }, []);

  // Wrapper para crear nodo hijo con auto-alineación
  const handleAddChildWithAutoAlign = useCallback((parentId, position, options = {}) => {
    // Agregar flag de autoAlign a las opciones
    const newOptions = { ...options, autoAlign: autoAlignEnabled };
    const newId = onAddChildNode(parentId, position, newOptions);
    return newId;
  }, [onAddChildNode, autoAlignEnabled]);

  // Wrapper para eliminar nodo con auto-alineación
  const handleDeleteWithAutoAlign = useCallback((nodeId) => {
    if (!nodeId) {
      console.error('[Canvas] handleDeleteWithAutoAlign: nodeId es undefined');
      return;
    }
    if (!onDeleteNode) {
      console.error('[Canvas] handleDeleteWithAutoAlign: onDeleteNode es undefined');
      return;
    }
    console.log('[Canvas] Eliminando nodo:', nodeId, 'autoAlign:', autoAlignEnabled);
    // Pasar el flag de autoAlign para que la eliminación incluya la alineación
    onDeleteNode(nodeId, autoAlignEnabled);
  }, [onDeleteNode, autoAlignEnabled]);

  // Wrapper para duplicar nodo con auto-alineación
  const handleDuplicateWithAutoAlign = useCallback((nodeId) => {
    if (!nodeId) {
      console.error('[Canvas] handleDuplicateWithAutoAlign: nodeId es undefined');
      return;
    }
    if (!onDuplicateNode) {
      console.error('[Canvas] handleDuplicateWithAutoAlign: onDuplicateNode es undefined');
      return;
    }
    console.log('[Canvas] Duplicando nodo:', nodeId, 'autoAlign:', autoAlignEnabled);
    // Pasar el flag de autoAlign para posicionar correctamente el duplicado
    onDuplicateNode(nodeId, autoAlignEnabled);
  }, [onDuplicateNode, autoAlignEnabled]);

  // Handlers de la toolbar
  const handleToolbarEdit = useCallback(() => {
    if (selectedNodeId) {
      const nodeElement = document.querySelector(`[data-node-id="${selectedNodeId}"]`);
      if (nodeElement) {
        const event = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
        nodeElement.dispatchEvent(event);
      }
    }
  }, [selectedNodeId]);

  // Handler para toggle completado (texto tachado)
  const handleToolbarToggleCompleted = useCallback(() => {
    if (selectedNodeId && onToggleNodeCompleted) {
      onToggleNodeCompleted(selectedNodeId);
    }
  }, [selectedNodeId, onToggleNodeCompleted]);

  const handleToolbarComment = useCallback(() => {
    if (selectedNodeId) {
      setCommentPopover({ isOpen: true, nodeId: selectedNodeId });
      setLinkPopover({ isOpen: false, nodeId: null });
    }
  }, [selectedNodeId]);

  const handleNodeCommentClick = useCallback((nodeId) => {
    setCommentPopover({ isOpen: true, nodeId });
    setLinkPopover({ isOpen: false, nodeId: null });
    onSelectNode(nodeId);
  }, [onSelectNode]);

  // ======== MODO DE CONEXIÓN MANUAL ========
  
  // Iniciar modo de conexión desde un nodo
  const startConnectionMode = useCallback((sourceNodeId) => {
    console.log('[Canvas] Iniciando modo conexión desde nodo:', sourceNodeId);
    setConnectionMode({
      isActive: true,
      sourceNodeId,
      mousePosition: { x: 0, y: 0 }
    });
  }, []);

  // Cancelar modo de conexión
  const cancelConnectionMode = useCallback(() => {
    console.log('[Canvas] Cancelando modo conexión');
    setConnectionMode({ isActive: false, sourceNodeId: null, mousePosition: { x: 0, y: 0 }, snapTargetId: null, snapAnchor: null });
  }, []);

  // Completar conexión al hacer clic en un nodo destino
  // El nodo origen (sourceNodeId) será el PADRE
  // El nodo destino (targetNodeId) será el HIJO
  // El modo conexión permanece activo para permitir múltiples conexiones
  const completeConnection = useCallback((targetNodeId) => {
    // Usar la ref para obtener el estado más actualizado (evita stale closures)
    const currentMode = connectionModeRef.current;
    
    if (!currentMode.isActive || !currentMode.sourceNodeId) {
      return;
    }
    
    if (targetNodeId === currentMode.sourceNodeId) {
      console.log('[Canvas] No se puede conectar un nodo a sí mismo');
      return; // No cancelar el modo, solo ignorar el clic
    }
    
    // El nodo origen es el PADRE, el nodo destino es el HIJO
    // connectNodes(childNodeId, parentNodeId)
    console.log('[Canvas] Completando conexión: hijo', targetNodeId, '-> padre', currentMode.sourceNodeId);
    
    if (onConnectNodes) {
      const success = onConnectNodes(targetNodeId, currentMode.sourceNodeId);
      if (success) {
        console.log('[Canvas] Conexión exitosa - modo conexión sigue activo');
      }
    }
    
    // Limpiar el snap pero mantener el modo activo con el MISMO sourceNodeId
    setConnectionMode(prev => ({
      ...prev,
      snapTargetId: null,
      snapAnchor: null
    }));
    
    // NO cancelar el modo - permanece activo para conectar más nodos
    // El usuario puede presionar ESC o hacer clic en el canvas para salir
  }, [onConnectNodes]);

  // ======== FIN MODO DE CONEXIÓN MANUAL ========

  // Manejar selección de nodo con soporte para CTRL/CMD + clic
  const handleNodeSelect = useCallback((nodeId, e) => {
    // Si estamos en modo conexión, completar la conexión
    // Usar la ref para obtener el estado más actualizado
    if (connectionModeRef.current.isActive) {
      completeConnection(nodeId);
      return;
    }
    
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifierKey = isMac ? e?.metaKey : e?.ctrlKey;
    
    if (modifierKey && onAddToSelection) {
      // CTRL/CMD + clic = agregar/quitar de selección múltiple
      onAddToSelection(nodeId);
    } else if (e?.shiftKey && onAddToSelection) {
      // SHIFT + clic = agregar a selección
      onAddToSelection(nodeId);
    } else {
      // Clic normal: verificar si el nodo ya está en una selección múltiple
      // Si está, NO limpiar la selección para permitir arrastre de grupo
      if (selectedNodeIds.size > 1 && selectedNodeIds.has(nodeId)) {
        // El nodo ya está en selección múltiple - no hacer nada para permitir drag de grupo
        return;
      }
      // Si no está en selección múltiple, seleccionar solo este nodo
      onSelectNode(nodeId);
    }
  }, [connectionMode.isActive, completeConnection, onSelectNode, onAddToSelection, selectedNodeIds]);

  // Handlers del popover de enlaces
  const handleToolbarLink = useCallback(() => {
    if (selectedNodeId) {
      if (linkPopover.isOpen && linkPopover.nodeId === selectedNodeId) {
        setLinkPopover({ isOpen: false, nodeId: null });
      } else {
        setLinkPopover({ isOpen: true, nodeId: selectedNodeId });
        setCommentPopover({ isOpen: false, nodeId: null });
      }
    }
  }, [selectedNodeId, linkPopover.isOpen, linkPopover.nodeId]);

  const handleLinkPopoverClose = useCallback(() => {
    setLinkPopover({ isOpen: false, nodeId: null });
  }, []);

  const handleAddLink = useCallback((url) => {
    if (linkPopover.nodeId && onAddNodeLink) {
      onAddNodeLink(linkPopover.nodeId, url);
    }
  }, [linkPopover.nodeId, onAddNodeLink]);

  const handleRemoveLink = useCallback((linkIndex) => {
    if (linkPopover.nodeId && onRemoveNodeLink) {
      onRemoveNodeLink(linkPopover.nodeId, linkIndex);
    }
  }, [linkPopover.nodeId, onRemoveNodeLink]);

  const handleUpdateLink = useCallback((linkIndex, newUrl) => {
    if (linkPopover.nodeId && onUpdateNodeLink) {
      onUpdateNodeLink(linkPopover.nodeId, linkIndex, newUrl);
    }
  }, [linkPopover.nodeId, onUpdateNodeLink]);

  // Manejar tecla ESC para cancelar conexión
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && connectionMode.isActive) {
        cancelConnectionMode();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [connectionMode.isActive, cancelConnectionMode]);

  const handleCommentSave = useCallback((comment) => {
    if (commentPopover.nodeId && onUpdateNodeComment) {
      onUpdateNodeComment(commentPopover.nodeId, comment);
    }
  }, [commentPopover.nodeId, onUpdateNodeComment]);

  const handleCommentClose = useCallback(() => {
    setCommentPopover({ isOpen: false, nodeId: null });
  }, []);

  // Handler para abrir/cerrar el sidebar de estilos
  const handleToolbarStyle = useCallback(() => {
    if (onToggleStyleSidebar) {
      onToggleStyleSidebar('styles');
    }
  }, [onToggleStyleSidebar]);

  // Handler para abrir el sidebar en la pestaña de iconos
  const handleToolbarIcon = useCallback(() => {
    if (onOpenIconPanel) {
      onOpenIconPanel();
    }
  }, [onOpenIconPanel]);

  // Handler para abrir el sidebar en la pestaña de recordatorios
  const handleToolbarReminder = useCallback(() => {
    if (onOpenReminderPanel) {
      onOpenReminderPanel();
    }
  }, [onOpenReminderPanel]);

  // Handlers de alineación de texto del nodo seleccionado
  const handleToolbarAlignTextLeft = useCallback(() => {
    if (selectedNodeId && onAlignTextLeft) {
      onAlignTextLeft(selectedNodeId);
    }
  }, [selectedNodeId, onAlignTextLeft]);

  const handleToolbarAlignTextCenter = useCallback(() => {
    if (selectedNodeId && onAlignTextCenter) {
      onAlignTextCenter(selectedNodeId);
    }
  }, [selectedNodeId, onAlignTextCenter]);

  const handleToolbarAlignTextRight = useCallback(() => {
    if (selectedNodeId && onAlignTextRight) {
      onAlignTextRight(selectedNodeId);
    }
  }, [selectedNodeId, onAlignTextRight]);

  const handleToolbarDuplicate = useCallback(() => {
    if (selectedNodeId) {
      handleDuplicateWithAutoAlign(selectedNodeId);
    }
  }, [selectedNodeId, handleDuplicateWithAutoAlign]);

  const handleToolbarDelete = useCallback(() => {
    if (selectedNodeId) {
      handleDeleteWithAutoAlign(selectedNodeId);
    }
  }, [selectedNodeId, handleDeleteWithAutoAlign]);

  // Manejar inicio de arrastre de nodo
  // En modo navegación, no permitir arrastrar nodos
  const handleNodeDragStart = useCallback((e, node) => {
    // Si está en modo navegación, no iniciar arrastre
    if (isNavigationMode) return;
    
    // Si está en modo conexión, no iniciar arrastre (solo queremos conectar)
    if (connectionMode.isActive) return;
    
    if (!containerRef.current) return;
    
    setShowControls(false);
    setCommentPopover({ isOpen: false, nodeId: null });
    setLinkPopover({ isOpen: false, nodeId: null });
    
    const rect = containerRef.current.getBoundingClientRect();
    // Ajustar por el offset de las reglas
    const adjustedPanX = pan.x + rulerOffset;
    const adjustedPanY = pan.y + rulerOffset;
    setDragging({
      nodeId: node.id,
      offsetX: (e.clientX - rect.left - adjustedPanX) / zoom - node.x,
      offsetY: (e.clientY - rect.top - adjustedPanY) / zoom - node.y
    });
  }, [pan, zoom, isNavigationMode, connectionMode.isActive]);

  // Manejar movimiento del mouse
  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return;

    // Actualizar posición del mouse durante modo conexión
    if (connectionMode.isActive) {
      const rect = containerRef.current.getBoundingClientRect();
      const adjustedPanX = pan.x + rulerOffset;
      const adjustedPanY = pan.y + rulerOffset;
      const mouseX = (e.clientX - rect.left - adjustedPanX) / zoom;
      const mouseY = (e.clientY - rect.top - adjustedPanY) / zoom;
      
      // Obtener el nodo origen para calcular anclajes inteligentes
      const sourceNode = nodes.find(n => n.id === connectionMode.sourceNodeId);
      
      // Buscar nodo cercano para snap (excluyendo el nodo origen)
      let snapTarget = null;
      let snapAnchorData = null;
      let minDistance = SNAP_DISTANCE;
      
      for (const node of nodes) {
        if (node.id === connectionMode.sourceNodeId) continue;
        
        // Calcular centro del nodo
        const nodeWidth = node.width || 160;
        const nodeHeight = node.height || 64;
        const nodeCenterX = node.x + nodeWidth / 2;
        const nodeCenterY = node.y + nodeHeight / 2;
        
        // Calcular distancia al cursor
        const distance = Math.sqrt(
          Math.pow(mouseX - nodeCenterX, 2) + 
          Math.pow(mouseY - nodeCenterY, 2)
        );
        
        // También considerar si el cursor está dentro del bounding box del nodo (con margen)
        const isInsideNode = 
          mouseX >= node.x - 20 && 
          mouseX <= node.x + nodeWidth + 20 &&
          mouseY >= node.y - 20 && 
          mouseY <= node.y + nodeHeight + 20;
        
        if (isInsideNode || distance < minDistance) {
          minDistance = distance;
          snapTarget = node.id;
          
          // Calcular el mejor punto de anclaje para el snap usando getSmartAnchorPoints
          if (sourceNode) {
            const anchors = getSmartAnchorPoints(
              sourceNode, node,
              sourceNode.width || 160, sourceNode.height || 64,
              nodeWidth, nodeHeight
            );
            snapAnchorData = anchors.target; // { point, x, y }
          }
        }
      }
      
      setConnectionMode(prev => ({
        ...prev,
        mousePosition: { x: mouseX, y: mouseY },
        snapTargetId: snapTarget,
        snapAnchor: snapAnchorData
      }));
      return;
    }

    // Ajustar por el offset de las reglas
    const adjustedPanX = pan.x + rulerOffset;
    const adjustedPanY = pan.y + rulerOffset;

    // Selección por área
    if (isSelectingArea && selectionBox) {
      const rect = containerRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      setSelectionBox(prev => ({ ...prev, endX: currentX, endY: currentY }));
      return;
    }

    if (dragging) {
      const rect = containerRef.current.getBoundingClientRect();
      const newX = (e.clientX - rect.left - adjustedPanX) / zoom - dragging.offsetX;
      const newY = (e.clientY - rect.top - adjustedPanY) / zoom - dragging.offsetY;
      
      // Si hay múltiples nodos seleccionados, mover todos
      if (selectedNodeIds.size > 1 && selectedNodeIds.has(dragging.nodeId)) {
        // Calcular el delta
        const node = nodes.find(n => n.id === dragging.nodeId);
        if (node) {
          const deltaX = newX - node.x;
          const deltaY = newY - node.y;
          if (onMoveSelectedNodes) {
            onMoveSelectedNodes(deltaX, deltaY);
          }
        }
      } else {
        onUpdateNodePosition(dragging.nodeId, newX, newY);
      }
      return;
    }

    if (isPanning) {
      onUpdatePanning(e);
    }
  }, [connectionMode.isActive, connectionMode.sourceNodeId, dragging, isPanning, isSelectingArea, selectionBox, pan, zoom, nodes, selectedNodeIds, onUpdateNodePosition, onUpdatePanning, onMoveSelectedNodes, SNAP_DISTANCE]);

  // Manejar fin de arrastre
  const handleMouseUp = useCallback((e) => {
    // Finalizar selección por área
    if (isSelectingArea && selectionBox) {
      // Ajustar por el offset de las reglas
      const adjustedPanX = pan.x + rulerOffset;
      const adjustedPanY = pan.y + rulerOffset;
      
      // Convertir coordenadas de pantalla a coordenadas del canvas
      const startX = (selectionBox.startX - adjustedPanX) / zoom;
      const startY = (selectionBox.startY - adjustedPanY) / zoom;
      const endX = (selectionBox.endX - adjustedPanX) / zoom;
      const endY = (selectionBox.endY - adjustedPanY) / zoom;
      
      // Verificar si el área es suficientemente grande
      const width = Math.abs(endX - startX);
      const height = Math.abs(endY - startY);
      
      if (width > 10 || height > 10) {
        const additive = e.shiftKey;
        onSelectNodesInArea({ x: startX, y: startY }, { x: endX, y: endY }, additive);
      }
      
      setSelectionBox(null);
      setIsSelectingArea(false);
      return;
    }

    if (dragging) {
      setTimeout(() => setShowControls(true), 100);
      // Guardar posición en historial al finalizar el drag
      if (onSaveNodePositionToHistory) {
        onSaveNodePositionToHistory();
      }
      // NO aplicar auto-alineación después del drag manual
      // El usuario movió el nodo intencionalmente, respetar su posición
      // El auto-align solo se aplica al CREAR o ELIMINAR nodos
    }
    setDragging(null);
    onStopPanning();
  }, [dragging, isSelectingArea, selectionBox, pan, zoom, onStopPanning, onSaveNodePositionToHistory, onSelectNodesInArea]);

  // Manejar click en el canvas (para panning o selección por área)
  const handleCanvasMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    
    // Si estamos en modo conexión, cancelar al hacer clic en el canvas
    if (connectionMode.isActive) {
      cancelConnectionMode();
      return;
    }
    
    onCloseContextMenu();
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // MODO PUNTERO: selección por área
    if (interactionMode === 'pointer') {
      // Shift + clic agrega a la selección, clic normal limpia
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        if (onClearSelection) onClearSelection();
      }
      // Iniciar selección por área
      setSelectionBox({ startX: x, startY: y, endX: x, endY: y });
      setIsSelectingArea(true);
      setShowControls(false);
      return;
    }
    
    // MODO MANO: panning (mover el lienzo)
    // Limpiar selección si no hay modificador
    if (!e.ctrlKey && !e.metaKey) {
      if (onClearSelection) onClearSelection();
    }
    
    setShowControls(false);
    setCommentPopover({ isOpen: false, nodeId: null });
    setLinkPopover({ isOpen: false, nodeId: null });
    onStartPanning(e);
  }, [connectionMode.isActive, cancelConnectionMode, onCloseContextMenu, onClearSelection, onStartPanning, interactionMode]);

  // Manejar click derecho en nodo
  const handleNodeContextMenu = useCallback((e, nodeId) => {
    e.preventDefault();
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    onOpenContextMenu(e.clientX - rect.left, e.clientY - rect.top, nodeId);
  }, [onOpenContextMenu]);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    onWheel(e);
  }, [onWheel]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  useEffect(() => {
    if (selectedNodeId && !dragging) {
      setShowControls(true);
    }
  }, [selectedNodeId, dragging]);

  const selectedNodeForMenu = nodes.find(n => n.id === contextMenu?.nodeId);
  // El toolbar debe mostrarse solo cuando hay UN nodo seleccionado (no múltiples)
  const shouldShowToolbar = selectedNodeId && selectedNodeIds.size === 0 && showControls && !contextMenu && !dragging && !newNodeId && !commentPopover.isOpen && !linkPopover.isOpen;
  const shouldShowAddButton = shouldShowToolbar;
  const commentNode = nodes.find(n => n.id === commentPopover.nodeId);
  const linkNode = nodes.find(n => n.id === linkPopover.nodeId);

  return (
    <div
      ref={containerRef}
      className={`
        flex-1 bg-slate-50
        overflow-hidden relative
        ${interactionMode === 'hand' && isPanning && !dragging ? 'cursor-grabbing' : ''}
        ${interactionMode === 'hand' && !isPanning && !dragging ? 'cursor-grab' : ''}
        ${interactionMode === 'pointer' && !isSelectingArea ? 'cursor-crosshair' : ''}
        ${interactionMode === 'pointer' && isSelectingArea ? 'cursor-crosshair' : ''}
        ${dragging ? 'cursor-grabbing' : ''}
        touch-none
      `}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
      {...touchHandlers}
    >
      {/* Reglas horizontales y verticales */}
      {showRulers && (
        <CanvasRulers
          pan={pan}
          zoom={zoom}
          containerRef={containerRef}
        />
      )}

      {/* Panel de modos del lienzo - oculto en fullscreen */}
      <CanvasModePanel
        interactionMode={interactionMode}
        onSetInteractionMode={onSetInteractionMode}
        onEnterFullscreen={onEnterFullscreen}
        isFullscreen={isFullscreen}
        showGrid={showGrid}
        showRulers={showRulers}
        onToggleGrid={onToggleGrid}
        onToggleRulers={onToggleRulers}
        isSidebarExpanded={isSidebarExpanded}
        isMobileOverlayOpen={isMobileOverlayOpen}
      />

      {/* Cuadrícula del lienzo */}
      {showGrid && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{ 
            marginTop: rulerOffset, 
            marginLeft: rulerOffset 
          }}
        >
          <CanvasGrid pan={pan} zoom={zoom} />
        </div>
      )}

      {/* Contenedor transformable para nodos y conexiones */}
      <div
        className="absolute origin-top-left will-change-transform"
        style={{
          transform: `translate(${pan.x + rulerOffset}px, ${pan.y + rulerOffset}px) scale(${zoom})`,
          width: '5000px',
          height: '5000px'
        }}
      >
        <ConnectionsLayer 
          nodes={nodes} 
          layoutType={layoutType}
          onAddNodeFromLine={onAddNodeFromLine}
          onDisconnectNode={onDisconnectNode}
          showLineButtons={layoutType === 'mindhybrid' || layoutType === 'mindtree'}
        />

        {/* Línea de preview durante modo de conexión con anclaje inteligente y SNAP */}
        {connectionMode.isActive && connectionMode.sourceNodeId && (
          <svg 
            className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible"
            style={{ minWidth: '5000px', minHeight: '5000px' }}
          >
            {(() => {
              const sourceNode = nodes.find(n => n.id === connectionMode.sourceNodeId);
              if (!sourceNode) return null;
              
              // Si hay snap activo, usar las coordenadas del anchor del nodo objetivo
              // Si no, usar la posición del mouse
              const hasSnap = connectionMode.snapTargetId && connectionMode.snapAnchor;
              const targetX = hasSnap ? connectionMode.snapAnchor.x : connectionMode.mousePosition.x;
              const targetY = hasSnap ? connectionMode.snapAnchor.y : connectionMode.mousePosition.y;
              
              // Usar anclaje inteligente para la línea de preview
              const anchor = getSmartAnchorToPosition(
                sourceNode,
                targetX,
                targetY,
                sourceNode.width || 160,
                sourceNode.height || 64
              );
              
              // Generar path suave desde el anchor hasta el destino
              // Si hay snap, usar generateSmartPath para una curva más limpia
              let previewPath;
              if (hasSnap) {
                previewPath = generateSmartPath(
                  { x: anchor.x, y: anchor.y, point: anchor.point },
                  { x: targetX, y: targetY, point: connectionMode.snapAnchor.point }
                );
              } else {
                previewPath = generatePreviewPath(
                  anchor.x, anchor.y,
                  targetX, targetY,
                  anchor.point
                );
              }
              
              return (
                <path
                  d={previewPath}
                  stroke={hasSnap ? "#22c55e" : "#8b5cf6"}
                  strokeWidth={hasSnap ? 3 : 2.5}
                  strokeDasharray={hasSnap ? "none" : "8,4"}
                  fill="none"
                  className="transition-all duration-100"
                  style={{ 
                    filter: hasSnap 
                      ? 'drop-shadow(0 0 6px rgba(34, 197, 94, 0.6))' 
                      : 'drop-shadow(0 0 3px rgba(139, 92, 246, 0.5))' 
                  }}
                />
              );
            })()}
          </svg>
        )}

        {nodes.map(node => (
          <NodeItem
            key={node.id}
            node={node}
            isSelected={isNodeSelected ? isNodeSelected(node.id) : selectedNodeId === node.id}
            isMultiSelected={selectedNodeIds.has(node.id)}
            isSnapTarget={connectionMode.isActive && connectionMode.snapTargetId === node.id}
            layoutType={layoutType}
            onSelect={handleNodeSelect}
            onDragStart={handleNodeDragStart}
            onDragEnd={onSaveNodePositionToHistory}
            onUpdateText={onUpdateNodeText}
            onUpdateSize={onUpdateNodeSize}
            onContextMenu={handleNodeContextMenu}
            onCommentClick={handleNodeCommentClick}
            onNavigateToProject={onNavigateToProject}
            onOpenTaskModal={handleOpenTaskModal}
            forceEdit={newNodeId === node.id}
            onEditComplete={handleEditComplete}
            isNavigationMode={isNavigationMode}
          />
        ))}
      </div>

      {/* Controles flotantes - FUERA del contenedor transformable */}
      {/* Botón único "+" para MindFlow y MindTree */}
      {shouldShowAddButton && controlPositions.addButton && layoutType !== 'mindhybrid' && (
        <button
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleAddChildFromButton();
          }}
          className="
            absolute z-50
            w-10 h-10 md:w-8 md:h-8 rounded-full
            bg-blue-500 hover:bg-blue-600 active:bg-blue-700
            text-white shadow-lg
            flex items-center justify-center
            transition-all duration-200
            hover:scale-110 active:scale-95
            border-2 border-white
            touch-manipulation select-none
            cursor-pointer
          "
          style={{
            left: controlPositions.addButton.x,
            top: controlPositions.addButton.y,
            transform: 'translate(-50%, -50%)',
            WebkitTapHighlightColor: 'transparent'
          }}
          title="Agregar nodo hijo"
          aria-label="Agregar nodo hijo"
          data-testid="add-child-button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      )}

      {/* Botón de conexión manual - púrpura, aparece debajo del botón "+" */}
      {shouldShowAddButton && controlPositions.addButton && !connectionMode.isActive && (
        <button
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (selectedNodeId) {
              startConnectionMode(selectedNodeId);
            }
          }}
          className="
            absolute z-50
            w-8 h-8 md:w-7 md:h-7 rounded-full
            bg-purple-500 hover:bg-purple-600 active:bg-purple-700
            text-white shadow-lg
            flex items-center justify-center
            transition-all duration-200
            hover:scale-110 active:scale-95
            border-2 border-white
            touch-manipulation select-none
            cursor-pointer
          "
          style={{
            left: controlPositions.addButton.x,
            top: controlPositions.addButton.y + 35,
            transform: 'translate(-50%, -50%)',
            WebkitTapHighlightColor: 'transparent'
          }}
          title="Conectar con otro nodo"
          aria-label="Conectar con otro nodo"
          data-testid="connect-node-button"
        >
          <Link2 size={14} />
        </button>
      )}

      {/* Indicador de modo conexión activo - permanece para múltiples conexiones */}
      {connectionMode.isActive && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-purple-600 text-white rounded-full shadow-lg flex items-center gap-2">
          <Link2 size={16} className="animate-pulse" />
          <span className="text-sm font-medium">Modo conexión activo - Haz clic en nodos para conectar</span>
          <button 
            onClick={cancelConnectionMode}
            className="ml-2 px-2 py-0.5 bg-white/20 rounded text-xs hover:bg-white/30 transition-colors"
          >
            ESC para salir
          </button>
        </div>
      )}

      {/* Botones MindHybrid: Derecha (horizontal) e Inferior (vertical) */}
      {shouldShowAddButton && layoutType === 'mindhybrid' && (
        <>
          {/* Botón DERECHO → crear hijo horizontal */}
          {controlPositions.addButtonRight && (
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleAddChildHorizontal();
              }}
              className="
                absolute z-50
                w-9 h-9 md:w-7 md:h-7 rounded-full
                bg-blue-500 hover:bg-blue-600 active:bg-blue-700
                text-white shadow-lg
                flex items-center justify-center
                transition-all duration-200
                hover:scale-110 active:scale-95
                border-2 border-white
                touch-manipulation select-none
                cursor-pointer
              "
              style={{
                left: controlPositions.addButtonRight.x,
                top: controlPositions.addButtonRight.y,
                transform: 'translate(-50%, -50%)',
                WebkitTapHighlightColor: 'transparent'
              }}
              title="Agregar nodo horizontal (→)"
              aria-label="Agregar nodo horizontal"
              data-testid="add-child-horizontal-button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          )}
          
          {/* Botón INFERIOR ↓ crear hijo vertical */}
          {controlPositions.addButtonBottom && (
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleAddChildVertical();
              }}
              className="
                absolute z-50
                w-9 h-9 md:w-7 md:h-7 rounded-full
                bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700
                text-white shadow-lg
                flex items-center justify-center
                transition-all duration-200
                hover:scale-110 active:scale-95
                border-2 border-white
                touch-manipulation select-none
                cursor-pointer
              "
              style={{
                left: controlPositions.addButtonBottom.x,
                top: controlPositions.addButtonBottom.y,
                transform: 'translate(-50%, -50%)',
                WebkitTapHighlightColor: 'transparent'
              }}
              title="Agregar nodo vertical (↓)"
              aria-label="Agregar nodo vertical"
              data-testid="add-child-vertical-button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          )}
        </>
      )}

      {/* Botones MindAxis: Izquierda y Derecha para nodo central */}
      {shouldShowAddButton && layoutType === 'mindaxis' && !selectedNode?.parentId && (
        <>
          {/* Botón IZQUIERDO ← crear rama izquierda */}
          {controlPositions.addButtonLeft && (
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleAddChildLeft();
              }}
              className="
                absolute z-50
                w-9 h-9 md:w-7 md:h-7 rounded-full
                bg-teal-500 hover:bg-teal-600 active:bg-teal-700
                text-white shadow-lg
                flex items-center justify-center
                transition-all duration-200
                hover:scale-110 active:scale-95
                border-2 border-white
                touch-manipulation select-none
                cursor-pointer
              "
              style={{
                left: controlPositions.addButtonLeft.x,
                top: controlPositions.addButtonLeft.y,
                transform: 'translate(-50%, -50%)',
                WebkitTapHighlightColor: 'transparent'
              }}
              title="Agregar rama izquierda (←)"
              aria-label="Agregar rama izquierda"
              data-testid="add-child-left-button"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          )}
          
          {/* Botón DERECHO → crear rama derecha */}
          {controlPositions.addButtonRight && (
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleAddChildRight();
              }}
              className="
                absolute z-50
                w-9 h-9 md:w-7 md:h-7 rounded-full
                bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700
                text-white shadow-lg
                flex items-center justify-center
                transition-all duration-200
                hover:scale-110 active:scale-95
                border-2 border-white
                touch-manipulation select-none
                cursor-pointer
              "
              style={{
                left: controlPositions.addButtonRight.x,
                top: controlPositions.addButtonRight.y,
                transform: 'translate(-50%, -50%)',
                WebkitTapHighlightColor: 'transparent'
              }}
              title="Agregar rama derecha (→)"
              aria-label="Agregar rama derecha"
              data-testid="add-child-right-button"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          )}
        </>
      )}

      {/* Selector de tipo de nodo */}
      <NodeTypeSelector
        isOpen={nodeTypeSelector.isOpen}
        position={nodeTypeSelector.position}
        onSelect={handleNodeTypeSelect}
        onSelectProjectType={handleSelectProjectType}
        onClose={handleCloseNodeTypeSelector}
        parentNode={selectedNode}
      />

      {/* Modal para vincular proyecto */}
      <LinkedProjectModal
        isOpen={linkedProjectModal.isOpen}
        onClose={handleCloseLinkedProjectModal}
        onSelectProject={linkedProjectModal.nodeIdToLink ? handleLinkExistingNodeToProject : handleSelectLinkedProject}
        onCreateNewProject={linkedProjectModal.nodeIdToLink ? null : handleCreateAndLinkProject}
        projects={projects}
        currentProjectId={currentProjectId}
      />

      {/* Toolbar flotante - centrada sobre el nodo seleccionado */}
      {shouldShowToolbar && controlPositions.toolbar && (
        <NodeToolbar
          position={controlPositions.toolbar}
          visible={true}
          zoom={1}
          nodeType={selectedNode?.nodeType || 'default'}
          currentColor={selectedNode?.color}
          currentTextAlign={selectedNode?.textAlign || 'center'}
          isCompleted={!!selectedNode?.isCompleted}
          hasComment={!!selectedNode?.comment}
          hasIcon={!!selectedNode?.icon}
          hasLinks={selectedNode?.links?.length > 0}
          hasReminder={!!selectedNode?.hasReminder}
          linksCount={selectedNode?.links?.length || 0}
          stylePanelOpen={styleSidebarOpen && sidebarTab === 'styles'}
          iconPanelOpen={styleSidebarOpen && sidebarTab === 'icons'}
          reminderPanelOpen={styleSidebarOpen && sidebarTab === 'reminders'}
          canvasBounds={canvasBounds}
          onEdit={handleToolbarEdit}
          onStyle={handleToolbarStyle}
          onToggleCompleted={handleToolbarToggleCompleted}
          onComment={handleToolbarComment}
          onAlignTextLeft={handleToolbarAlignTextLeft}
          onAlignTextCenter={handleToolbarAlignTextCenter}
          onAlignTextRight={handleToolbarAlignTextRight}
          onAddLink={handleToolbarLink}
          onAddIcon={handleToolbarIcon}
          onAddReminder={handleToolbarReminder}
          onDuplicate={handleToolbarDuplicate}
          onDelete={handleToolbarDelete}
        />
      )}

      {/* Popover de comentario */}
      {commentPopover.isOpen && commentPopover.nodeId && (
        <CommentPopover
          isOpen={true}
          position={getCommentPopoverPosition(commentPopover.nodeId)}
          comment={commentNode?.comment || ''}
          nodeColor={commentNode?.color}
          onSave={handleCommentSave}
          onClose={handleCommentClose}
        />
      )}

      {/* Popover de enlaces */}
      {linkPopover.isOpen && linkPopover.nodeId && (
        <LinkPopover
          isOpen={true}
          position={getCommentPopoverPosition(linkPopover.nodeId)}
          links={linkNode?.links || []}
          onAddLink={handleAddLink}
          onRemoveLink={handleRemoveLink}
          onUpdateLink={handleUpdateLink}
          onClose={handleLinkPopoverClose}
        />
      )}

      {/* Menú contextual */}
      <ContextMenu
        position={contextMenu}
        nodeId={contextMenu?.nodeId}
        currentColor={selectedNodeForMenu?.color}
        currentNodeType={selectedNodeForMenu?.nodeType}
        currentLineWidth={selectedNodeForMenu?.dashedLineWidth}
        currentTaskStatus={selectedNodeForMenu?.taskStatus}
        linkedProjectId={selectedNodeForMenu?.linkedProjectId}
        onAddChild={handleAddChildWithAutoAlign}
        onDuplicate={handleDuplicateWithAutoAlign}
        onDelete={handleDeleteWithAutoAlign}
        onChangeColor={onChangeNodeColor}
        onChangeNodeType={onChangeNodeType}
        onChangeLineWidth={onChangeLineWidth}
        onLinkToProject={handleLinkToProjectFromContext}
        onUnlinkProject={handleUnlinkProject}
        onConvertToTask={handleConvertToTask}
        onRemoveTaskStatus={handleRemoveTaskStatus}
        onReopenTask={handleReopenTask}
        onClose={onCloseContextMenu}
      />

      {/* Caja de selección por área */}
      {isSelectingArea && selectionBox && (
        <SelectionBox
          startPoint={{ x: selectionBox.startX, y: selectionBox.startY }}
          endPoint={{ x: selectionBox.endX, y: selectionBox.endY }}
          zoom={zoom}
        />
      )}

      {/* Indicador de zoom */}
      <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm border border-gray-200">
        <span className="text-xs font-medium text-gray-600">
          Zoom: {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Botón de modo navegación (solo móvil/tablet) */}
      <NavigationModeButton
        isNavigationMode={isNavigationMode}
        onToggle={setIsNavigationMode}
      />

      {/* Modal de tarea para nodos */}
      {taskNodeModal.isOpen && taskNodeModal.node && (
        <NodeTaskModal
          node={taskNodeModal.node}
          onClose={handleCloseTaskModal}
          onUpdate={handleUpdateNodeTask}
        />
      )}
    </div>
  );
};

export default Canvas;

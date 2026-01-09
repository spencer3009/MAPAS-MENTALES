import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import NodeItem, { NODE_WIDTH, NODE_HEIGHT } from './NodeItem';
import ConnectionsLayer from './ConnectionsLayer';
import ContextMenu from './ContextMenu';
import NodeToolbar from './NodeToolbar';
import CommentPopover from './CommentPopover';
import LinkPopover from './LinkPopover';
import NodeTypeSelector from './NodeTypeSelector';
import SelectionBox from './SelectionBox';
import CanvasModePanel from './CanvasModePanel';
import CanvasGrid from './CanvasGrid';
import CanvasRulers, { RULER_SIZE } from './CanvasRulers';
import { useTouchGestures } from '../../hooks/useTouchGestures';

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
  maxZoom = 2
}) => {
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [newNodeId, setNewNodeId] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const [commentPopover, setCommentPopover] = useState({ isOpen: false, nodeId: null });
  const [linkPopover, setLinkPopover] = useState({ isOpen: false, nodeId: null });
  const [nodeTypeSelector, setNodeTypeSelector] = useState({ isOpen: false, position: null, parentId: null });
  
  // Estado para selección por área (drag selection)
  const [selectionBox, setSelectionBox] = useState(null);
  const [isSelectingArea, setIsSelectingArea] = useState(false);

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
  const touchHandlers = useMemo(() => ({
    onTouchStart: (e) => {
      // Si hay un nodo siendo arrastrado por mouse, continuar con ese
      if (dragging) return;
      
      // Llamar al handler base para pan/zoom/tap
      baseTouchHandlers.onTouchStart(e);
    },
    onTouchMove: (e) => {
      // Si hay un nodo siendo arrastrado, mover el nodo
      if (dragging && e.touches.length === 1) {
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
      
      // Si no hay nodo arrastrándose, usar pan/zoom
      baseTouchHandlers.onTouchMove(e);
    },
    onTouchEnd: (e) => {
      // Si había un nodo arrastrándose, terminar
      if (dragging) {
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
      if (dragging) {
        setDragging(null);
        return;
      }
      baseTouchHandlers.onTouchCancel(e);
    }
  }), [baseTouchHandlers, dragging, pan, zoom, showRulers, nodes, selectedNodeIds, onUpdateNodePosition, onMoveSelectedNodes, onSaveNodePositionToHistory]);

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

  // Manejar selección de nodo con soporte para CTRL/CMD + clic
  const handleNodeSelect = useCallback((nodeId, e) => {
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
  }, [onSelectNode, onAddToSelection, selectedNodeIds]);

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
  const handleNodeDragStart = useCallback((e, node) => {
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
  }, [pan, zoom]);

  // Manejar movimiento del mouse
  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return;

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
  }, [dragging, isPanning, isSelectingArea, selectionBox, pan, zoom, nodes, selectedNodeIds, onUpdateNodePosition, onUpdatePanning, onMoveSelectedNodes]);

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
  }, [onCloseContextMenu, onClearSelection, onStartPanning, interactionMode]);

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
          showLineButtons={layoutType === 'mindhybrid' || layoutType === 'mindtree'}
        />

        {nodes.map(node => (
          <NodeItem
            key={node.id}
            node={node}
            isSelected={isNodeSelected ? isNodeSelected(node.id) : selectedNodeId === node.id}
            isMultiSelected={selectedNodeIds.has(node.id)}
            layoutType={layoutType}
            onSelect={handleNodeSelect}
            onDragStart={handleNodeDragStart}
            onDragEnd={onSaveNodePositionToHistory}
            onUpdateText={onUpdateNodeText}
            onUpdateSize={onUpdateNodeSize}
            onContextMenu={handleNodeContextMenu}
            onCommentClick={handleNodeCommentClick}
            forceEdit={newNodeId === node.id}
            onEditComplete={handleEditComplete}
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

      {/* Botones MindHybrid: Derecha (horizontal) e Inferior (vertical) */}
      {shouldShowAddButton && layoutType === 'mindhybrid' && (
        <>
          {/* Botón DERECHO → crear hijo horizontal */}
          {controlPositions.addButtonRight && (
            <button
              onClick={handleAddChildHorizontal}
              onPointerDown={(e) => {
                e.stopPropagation();
                if (e.pointerType === 'touch') {
                  e.preventDefault();
                  handleAddChildHorizontal();
                }
              }}
              onTouchEnd={(e) => {
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
              "
              style={{
                left: controlPositions.addButtonRight.x,
                top: controlPositions.addButtonRight.y,
                transform: 'translate(-50%, -50%)',
                WebkitTapHighlightColor: 'transparent'
              }}
              title="Agregar nodo horizontal (→)"
              aria-label="Agregar nodo horizontal"
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
              onClick={handleAddChildVertical}
              onPointerDown={(e) => {
                e.stopPropagation();
                if (e.pointerType === 'touch') {
                  e.preventDefault();
                  handleAddChildVertical();
                }
              }}
              onTouchEnd={(e) => {
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
              "
              style={{
                left: controlPositions.addButtonBottom.x,
                top: controlPositions.addButtonBottom.y,
                transform: 'translate(-50%, -50%)',
                WebkitTapHighlightColor: 'transparent'
              }}
              title="Agregar nodo vertical (↓)"
              aria-label="Agregar nodo vertical"
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
              onClick={handleAddChildLeft}
              onPointerDown={(e) => {
                e.stopPropagation();
                if (e.pointerType === 'touch') {
                  e.preventDefault();
                  handleAddChildLeft();
                }
              }}
              onTouchEnd={(e) => {
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
              "
              style={{
                left: controlPositions.addButtonLeft.x,
                top: controlPositions.addButtonLeft.y,
                transform: 'translate(-50%, -50%)',
                WebkitTapHighlightColor: 'transparent'
              }}
              title="Agregar rama izquierda (←)"
              aria-label="Agregar rama izquierda"
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
              onClick={handleAddChildRight}
              onPointerDown={(e) => {
                e.stopPropagation();
                if (e.pointerType === 'touch') {
                  e.preventDefault();
                  handleAddChildRight();
                }
              }}
              onTouchEnd={(e) => {
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
              "
              style={{
                left: controlPositions.addButtonRight.x,
                top: controlPositions.addButtonRight.y,
                transform: 'translate(-50%, -50%)',
                WebkitTapHighlightColor: 'transparent'
              }}
              title="Agregar rama derecha (→)"
              aria-label="Agregar rama derecha"
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
        onClose={handleCloseNodeTypeSelector}
        parentNode={selectedNode}
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
        onAddChild={handleAddChildWithAutoAlign}
        onDuplicate={handleDuplicateWithAutoAlign}
        onDelete={handleDeleteWithAutoAlign}
        onChangeColor={onChangeNodeColor}
        onChangeNodeType={onChangeNodeType}
        onChangeLineWidth={onChangeLineWidth}
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
    </div>
  );
};

export default Canvas;

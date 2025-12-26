import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import NodeItem, { NODE_WIDTH, NODE_HEIGHT } from './NodeItem';
import ConnectionsLayer from './ConnectionsLayer';
import ContextMenu from './ContextMenu';
import NodeToolbar from './NodeToolbar';
import CommentPopover from './CommentPopover';
import LinkPopover from './LinkPopover';
import NodeTypeSelector from './NodeTypeSelector';
import SelectionBox from './SelectionBox';

const Canvas = ({
  nodes,
  selectedNodeId,
  selectedNodeIds = new Set(),
  pan,
  zoom,
  isPanning,
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
  onAutoAlign
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

  // Obtener nodo seleccionado (para toolbar individual)
  const selectedNode = selectedNodeIds.size === 0 ? nodes.find(n => n.id === selectedNodeId) : null;

  // Calcular posiciones transformadas para los controles
  const controlPositions = useMemo(() => {
    if (!selectedNode) return { addButton: null, toolbar: null };
    
    // Usar tamaño del nodo si está disponible, sino usar valores por defecto
    const nodeW = selectedNode.width || NODE_WIDTH;
    const nodeH = selectedNode.height || NODE_HEIGHT;
    
    const addButtonX = (selectedNode.x + nodeW + 15) * zoom + pan.x;
    const addButtonY = (selectedNode.y + nodeH / 2 - 14) * zoom + pan.y;
    
    const toolbarX = (selectedNode.x + nodeW / 2) * zoom + pan.x;
    const toolbarY = (selectedNode.y - 50) * zoom + pan.y;
    
    return {
      addButton: { x: addButtonX, y: addButtonY },
      toolbar: { x: toolbarX, y: toolbarY }
    };
  }, [selectedNode, zoom, pan]);

  // Calcular posición del popover de comentario
  const getCommentPopoverPosition = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    
    const x = (node.x + NODE_WIDTH / 2) * zoom + pan.x;
    const y = (node.y + NODE_HEIGHT + 10) * zoom + pan.y;
    
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

  // Handler para cuando se selecciona un tipo de nodo
  const handleNodeTypeSelect = useCallback((nodeType) => {
    if (nodeTypeSelector.parentId) {
      const newId = onAddChildNode(nodeTypeSelector.parentId, null, { nodeType });
      setNewNodeId(newId);
      setNodeTypeSelector({ isOpen: false, position: null, parentId: null });
      setTimeout(() => setShowControls(true), 500);
      
      // Aplicar alineación jerárquica automática si está habilitada
      if (autoAlignEnabled && onAutoAlign) {
        setTimeout(() => onAutoAlign(), 100);
      }
    }
  }, [nodeTypeSelector.parentId, onAddChildNode, autoAlignEnabled, onAutoAlign]);

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
  const handleAddChildWithAutoAlign = useCallback((parentId, position, options) => {
    const newId = onAddChildNode(parentId, position, options);
    // Aplicar alineación jerárquica automática si está habilitada
    if (autoAlignEnabled && onAutoAlign) {
      setTimeout(() => onAutoAlign(), 100);
    }
    return newId;
  }, [onAddChildNode, autoAlignEnabled, onAutoAlign]);

  // Wrapper para eliminar nodo con auto-alineación
  const handleDeleteWithAutoAlign = useCallback((nodeId) => {
    onDeleteNode(nodeId);
    // Aplicar alineación jerárquica automática si está habilitada
    if (autoAlignEnabled && onAutoAlign) {
      setTimeout(() => onAutoAlign(), 100);
    }
  }, [onDeleteNode, autoAlignEnabled, onAutoAlign]);

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
      // Clic normal = seleccionar solo este nodo
      onSelectNode(nodeId);
    }
  }, [onSelectNode, onAddToSelection]);

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

  const handleToolbarAddImage = useCallback(() => {
    alert('Funcionalidad de agregar imagen próximamente');
  }, []);

  const handleToolbarDuplicate = useCallback(() => {
    if (selectedNodeId) {
      onDuplicateNode(selectedNodeId);
    }
  }, [selectedNodeId, onDuplicateNode]);

  const handleToolbarDelete = useCallback(() => {
    if (selectedNodeId) {
      onDeleteNode(selectedNodeId);
    }
  }, [selectedNodeId, onDeleteNode]);

  // Manejar inicio de arrastre de nodo
  const handleNodeDragStart = useCallback((e, node) => {
    if (!containerRef.current) return;
    
    setShowControls(false);
    setCommentPopover({ isOpen: false, nodeId: null });
    setLinkPopover({ isOpen: false, nodeId: null });
    
    const rect = containerRef.current.getBoundingClientRect();
    setDragging({
      nodeId: node.id,
      offsetX: (e.clientX - rect.left - pan.x) / zoom - node.x,
      offsetY: (e.clientY - rect.top - pan.y) / zoom - node.y
    });
  }, [pan, zoom]);

  // Manejar movimiento del mouse
  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return;

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
      const newX = (e.clientX - rect.left - pan.x) / zoom - dragging.offsetX;
      const newY = (e.clientY - rect.top - pan.y) / zoom - dragging.offsetY;
      
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
      const rect = containerRef.current.getBoundingClientRect();
      
      // Convertir coordenadas de pantalla a coordenadas del canvas
      const startX = (selectionBox.startX - pan.x) / zoom;
      const startY = (selectionBox.startY - pan.y) / zoom;
      const endX = (selectionBox.endX - pan.x) / zoom;
      const endY = (selectionBox.endY - pan.y) / zoom;
      
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
      // Aplicar alineación automática si está habilitada
      if (autoAlignEnabled && onAutoAlign) {
        setTimeout(() => onAutoAlign(), 50);
      }
    }
    setDragging(null);
    onStopPanning();
  }, [dragging, isSelectingArea, selectionBox, pan, zoom, onStopPanning, onSaveNodePositionToHistory, onSelectNodesInArea, autoAlignEnabled, onAutoAlign]);

  // Manejar click en el canvas (para panning o selección por área)
  const handleCanvasMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    
    onCloseContextMenu();
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // SHIFT + clic = iniciar selección por área
    if (e.shiftKey) {
      setSelectionBox({ startX: x, startY: y, endX: x, endY: y });
      setIsSelectingArea(true);
      setShowControls(false);
      return;
    }
    
    // Clic normal en canvas = panning (mover el lienzo)
    // Limpiar selección si no hay modificador
    if (!e.ctrlKey && !e.metaKey) {
      if (onClearSelection) onClearSelection();
    }
    
    setShowControls(false);
    setCommentPopover({ isOpen: false, nodeId: null });
    setLinkPopover({ isOpen: false, nodeId: null });
    onStartPanning(e);
  }, [onCloseContextMenu, onClearSelection, onStartPanning]);

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
        flex-1 bg-gradient-to-br from-slate-50 to-slate-100
        overflow-hidden relative
        ${isPanning && !dragging ? 'cursor-grabbing' : ''}
        ${!isPanning && !dragging ? 'cursor-grab' : ''}
        ${dragging ? 'cursor-grabbing' : ''}
      `}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
    >
      {/* Patrón de fondo */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle, #cbd5e1 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
          transform: `translate(${pan.x % 24}px, ${pan.y % 24}px)`
        }}
      />

      {/* Contenedor transformable para nodos y conexiones */}
      <div
        className="absolute top-0 left-0 origin-top-left will-change-transform"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          width: '5000px',
          height: '5000px'
        }}
      >
        <ConnectionsLayer nodes={nodes} />

        {nodes.map(node => (
          <NodeItem
            key={node.id}
            node={node}
            isSelected={isNodeSelected ? isNodeSelected(node.id) : selectedNodeId === node.id}
            isMultiSelected={selectedNodeIds.has(node.id)}
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
      {shouldShowAddButton && controlPositions.addButton && (
        <button
          onClick={handleAddChildFromButton}
          onMouseDown={(e) => e.stopPropagation()}
          className="
            absolute z-50
            w-8 h-8 rounded-full
            bg-blue-500 hover:bg-blue-600
            text-white shadow-lg
            flex items-center justify-center
            transition-all duration-200
            hover:scale-110 active:scale-95
            border-2 border-white
          "
          style={{
            left: controlPositions.addButton.x,
            top: controlPositions.addButton.y,
            transform: 'translate(-50%, -50%)'
          }}
          title="Agregar nodo hijo"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      )}

      {/* Selector de tipo de nodo */}
      <NodeTypeSelector
        isOpen={nodeTypeSelector.isOpen}
        position={nodeTypeSelector.position}
        onSelect={handleNodeTypeSelect}
        onClose={handleCloseNodeTypeSelector}
        parentNode={selectedNode}
      />

      {/* Toolbar contextual - siempre visible cuando hay nodo seleccionado */}
      {shouldShowToolbar && controlPositions.toolbar && (
        <NodeToolbar
          position={controlPositions.toolbar}
          visible={true}
          zoom={1}
          nodeType={selectedNode?.nodeType || 'default'}
          currentColor={selectedNode?.color}
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
          onComment={handleToolbarComment}
          onAddImage={handleToolbarAddImage}
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
        onAddChild={onAddChildNode}
        onDuplicate={onDuplicateNode}
        onDelete={onDeleteNode}
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

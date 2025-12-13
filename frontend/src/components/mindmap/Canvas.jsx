import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import NodeItem, { NODE_WIDTH, NODE_HEIGHT } from './NodeItem';
import ConnectionsLayer from './ConnectionsLayer';
import ContextMenu from './ContextMenu';
import NodeToolbar from './NodeToolbar';
import NodeAddButton from './NodeAddButton';

const Canvas = ({
  nodes,
  selectedNodeId,
  pan,
  zoom,
  isPanning,
  contextMenu,
  onSelectNode,
  onStartPanning,
  onUpdatePanning,
  onStopPanning,
  onUpdateNodePosition,
  onUpdateNodeText,
  onOpenContextMenu,
  onCloseContextMenu,
  onAddChildNode,
  onDuplicateNode,
  onDeleteNode,
  onChangeNodeColor,
  onWheel
}) => {
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [newNodeId, setNewNodeId] = useState(null);
  const [showControls, setShowControls] = useState(true);

  // Obtener nodo seleccionado
  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  // Calcular posiciones transformadas para los controles (fuera del contenedor escalado)
  const controlPositions = useMemo(() => {
    if (!selectedNode) return { addButton: null, toolbar: null };
    
    // Posición del botón "+" (a la derecha del nodo)
    const addButtonX = (selectedNode.x + NODE_WIDTH + 15) * zoom + pan.x;
    const addButtonY = (selectedNode.y + NODE_HEIGHT / 2 - 14) * zoom + pan.y;
    
    // Posición de la toolbar (arriba del nodo, centrada)
    const toolbarX = (selectedNode.x + NODE_WIDTH / 2) * zoom + pan.x;
    const toolbarY = (selectedNode.y - 50) * zoom + pan.y;
    
    return {
      addButton: { x: addButtonX, y: addButtonY },
      toolbar: { x: toolbarX, y: toolbarY }
    };
  }, [selectedNode, zoom, pan]);

  // Handler para agregar nodo hijo desde el botón "+"
  const handleAddChildFromButton = useCallback(() => {
    console.log('Add button clicked, selectedNodeId:', selectedNodeId);
    if (selectedNodeId) {
      const newId = onAddChildNode(selectedNodeId);
      console.log('New node created with ID:', newId);
      setNewNodeId(newId);
      setShowControls(false);
      // Mostrar controles después de un breve delay
      setTimeout(() => setShowControls(true), 500);
    }
  }, [selectedNodeId, onAddChildNode]);

  // Handler cuando se completa la edición del nuevo nodo
  const handleEditComplete = useCallback(() => {
    setNewNodeId(null);
    setShowControls(true);
  }, []);

  // Handlers de la toolbar
  const handleToolbarEdit = useCallback(() => {
    if (selectedNodeId) {
      // Trigger double click para editar
      const nodeElement = document.querySelector(`[data-node-id="${selectedNodeId}"]`);
      if (nodeElement) {
        const event = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
        nodeElement.dispatchEvent(event);
      }
    }
  }, [selectedNodeId]);

  const handleToolbarChangeColor = useCallback((color) => {
    if (selectedNodeId) {
      onChangeNodeColor(selectedNodeId, color);
    }
  }, [selectedNodeId, onChangeNodeColor]);

  const handleToolbarAddImage = useCallback(() => {
    alert('Funcionalidad de agregar imagen próximamente');
  }, []);

  const handleToolbarAddLink = useCallback(() => {
    alert('Funcionalidad de agregar enlace próximamente');
  }, []);

  const handleToolbarAddEmoji = useCallback(() => {
    alert('Funcionalidad de agregar emoji próximamente');
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

    if (dragging) {
      const rect = containerRef.current.getBoundingClientRect();
      const newX = (e.clientX - rect.left - pan.x) / zoom - dragging.offsetX;
      const newY = (e.clientY - rect.top - pan.y) / zoom - dragging.offsetY;
      onUpdateNodePosition(dragging.nodeId, newX, newY);
      return;
    }

    if (isPanning) {
      onUpdatePanning(e);
    }
  }, [dragging, isPanning, pan, zoom, onUpdateNodePosition, onUpdatePanning]);

  // Manejar fin de arrastre
  const handleMouseUp = useCallback(() => {
    if (dragging) {
      setTimeout(() => setShowControls(true), 100);
    }
    setDragging(null);
    onStopPanning();
  }, [dragging, onStopPanning]);

  // Manejar click en el canvas
  const handleCanvasMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    
    onCloseContextMenu();
    onSelectNode(null);
    setShowControls(false);
    onStartPanning(e);
  }, [onCloseContextMenu, onSelectNode, onStartPanning]);

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
  const shouldShowNodeControls = selectedNodeId && showControls && !contextMenu && !dragging && !newNodeId;

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
            isSelected={selectedNodeId === node.id}
            onSelect={onSelectNode}
            onDragStart={handleNodeDragStart}
            onUpdateText={onUpdateNodeText}
            onContextMenu={handleNodeContextMenu}
            forceEdit={newNodeId === node.id}
            onEditComplete={handleEditComplete}
          />
        ))}
      </div>

      {/* Controles flotantes - FUERA del contenedor transformable */}
      {shouldShowNodeControls && controlPositions.addButton && (
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

      {shouldShowNodeControls && controlPositions.toolbar && (
        <NodeToolbar
          position={controlPositions.toolbar}
          visible={true}
          zoom={1}
          currentColor={selectedNode?.color}
          onEdit={handleToolbarEdit}
          onChangeColor={handleToolbarChangeColor}
          onAddImage={handleToolbarAddImage}
          onAddLink={handleToolbarAddLink}
          onAddEmoji={handleToolbarAddEmoji}
          onDuplicate={handleToolbarDuplicate}
          onDelete={handleToolbarDelete}
        />
      )}

      {/* Menú contextual */}
      <ContextMenu
        position={contextMenu}
        nodeId={contextMenu?.nodeId}
        currentColor={selectedNodeForMenu?.color}
        onAddChild={onAddChildNode}
        onDuplicate={onDuplicateNode}
        onDelete={onDeleteNode}
        onChangeColor={onChangeNodeColor}
        onClose={onCloseContextMenu}
      />

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

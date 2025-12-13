import React, { useRef, useCallback, useState, useEffect } from 'react';
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
  const [newNodeId, setNewNodeId] = useState(null); // Para forzar edición en nuevo nodo
  const [showControls, setShowControls] = useState(true);

  // Obtener nodo seleccionado
  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  // Calcular posición del botón "+" (a la derecha del nodo)
  const getAddButtonPosition = useCallback(() => {
    if (!selectedNode) return { x: 0, y: 0 };
    return {
      x: selectedNode.x + NODE_WIDTH + 10,
      y: selectedNode.y + NODE_HEIGHT / 2 - 14
    };
  }, [selectedNode]);

  // Calcular posición de la toolbar (arriba del nodo, centrada)
  const getToolbarPosition = useCallback(() => {
    if (!selectedNode) return { x: 0, y: 0 };
    return {
      x: selectedNode.x + NODE_WIDTH / 2,
      y: selectedNode.y - 55
    };
  }, [selectedNode]);

  // Handler para agregar nodo hijo desde el botón "+"
  const handleAddChildFromButton = useCallback(() => {
    if (selectedNodeId) {
      const newId = onAddChildNode(selectedNodeId);
      setNewNodeId(newId);
      setShowControls(false);
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
      const nodeElement = document.querySelector(`[data-node-id="${selectedNodeId}"]`);
      if (nodeElement && nodeElement.startEdit) {
        nodeElement.startEdit();
      } else {
        // Simular doble click para editar
        const event = new MouseEvent('dblclick', { bubbles: true });
        nodeElement?.dispatchEvent(event);
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
    
    setShowControls(false); // Ocultar controles durante drag
    
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

    // Arrastrar nodo
    if (dragging) {
      const rect = containerRef.current.getBoundingClientRect();
      const newX = (e.clientX - rect.left - pan.x) / zoom - dragging.offsetX;
      const newY = (e.clientY - rect.top - pan.y) / zoom - dragging.offsetY;
      onUpdateNodePosition(dragging.nodeId, newX, newY);
      return;
    }

    // Panning del lienzo
    if (isPanning) {
      onUpdatePanning(e);
    }
  }, [dragging, isPanning, pan, zoom, onUpdateNodePosition, onUpdatePanning]);

  // Manejar fin de arrastre
  const handleMouseUp = useCallback(() => {
    if (dragging) {
      setShowControls(true); // Mostrar controles después de drag
    }
    setDragging(null);
    onStopPanning();
  }, [dragging, onStopPanning]);

  // Manejar click en el canvas (iniciar panning)
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

  // Prevenir menú contextual del navegador
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
  }, []);

  // Manejar scroll para zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    onWheel(e);
  }, [onWheel]);

  // Agregar listener de wheel con passive: false
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Mostrar controles cuando se selecciona un nodo
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

      {/* Contenedor transformable */}
      <div
        className="absolute top-0 left-0 origin-top-left will-change-transform"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          width: '5000px',
          height: '5000px'
        }}
      >
        {/* Capa de conexiones */}
        <ConnectionsLayer nodes={nodes} />

        {/* Capa de nodos */}
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

        {/* Botón "+" para agregar nodo hijo */}
        <NodeAddButton
          position={getAddButtonPosition()}
          visible={shouldShowNodeControls}
          zoom={zoom}
          onAdd={handleAddChildFromButton}
        />

        {/* Toolbar contextual del nodo */}
        <NodeToolbar
          position={getToolbarPosition()}
          visible={shouldShowNodeControls}
          zoom={zoom}
          currentColor={selectedNode?.color}
          onEdit={handleToolbarEdit}
          onChangeColor={handleToolbarChangeColor}
          onAddImage={handleToolbarAddImage}
          onAddLink={handleToolbarAddLink}
          onAddEmoji={handleToolbarAddEmoji}
          onDuplicate={handleToolbarDuplicate}
          onDelete={handleToolbarDelete}
        />
      </div>

      {/* Menú contextual (click derecho) */}
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

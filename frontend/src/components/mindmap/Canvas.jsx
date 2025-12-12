import React, { useRef, useCallback, useState, useEffect } from 'react';
import NodeItem from './NodeItem';
import ConnectionsLayer from './ConnectionsLayer';
import ContextMenu from './ContextMenu';

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

  // Manejar inicio de arrastre de nodo
  const handleNodeDragStart = useCallback((e, node) => {
    if (!containerRef.current) return;
    
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
    setDragging(null);
    onStopPanning();
  }, [onStopPanning]);

  // Manejar click en el canvas (iniciar panning)
  const handleCanvasMouseDown = useCallback((e) => {
    if (e.button !== 0) return; // Solo botón izquierdo
    
    onCloseContextMenu();
    onSelectNode(null);
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

  const selectedNode = nodes.find(n => n.id === contextMenu?.nodeId);

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
          backgroundImage: `
            radial-gradient(circle, #cbd5e1 1px, transparent 1px)
          `,
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
          />
        ))}
      </div>

      {/* Menú contextual */}
      <ContextMenu
        position={contextMenu}
        nodeId={contextMenu?.nodeId}
        currentColor={selectedNode?.color}
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

import React, { useCallback } from 'react';
import Sidebar from './Sidebar';
import Toolbar from './Toolbar';
import Canvas from './Canvas';
import { useNodes } from '../../hooks/useNodes';
import { usePanning } from '../../hooks/usePanning';
import { useZoom } from '../../hooks/useZoom';
import { useContextMenu } from '../../hooks/useContextMenu';

const MindMapApp = () => {
  const {
    nodes,
    selectedNodeId,
    setSelectedNodeId,
    addNode,
    updateNodePosition,
    updateNodeText,
    updateNodeColor,
    deleteNode,
    duplicateNode,
    undo,
    redo,
    canUndo,
    canRedo,
    resetToDefault,
    clearAll
  } = useNodes();

  const {
    pan,
    isPanning,
    startPanning,
    updatePanning,
    stopPanning,
    resetPan
  } = usePanning();

  const {
    zoom,
    handleWheel,
    zoomIn,
    zoomOut,
    resetZoom
  } = useZoom();

  const {
    contextMenu,
    openContextMenu,
    closeContextMenu
  } = useContextMenu();

  // Handlers para toolbar
  const handleAddNode = useCallback(() => {
    if (selectedNodeId) {
      addNode(selectedNodeId);
    } else {
      addNode(null, { x: 400, y: 300 });
    }
  }, [selectedNodeId, addNode]);

  const handleDeleteNode = useCallback(() => {
    if (selectedNodeId) {
      deleteNode(selectedNodeId);
    }
  }, [selectedNodeId, deleteNode]);

  const handleCenter = useCallback(() => {
    resetPan();
    resetZoom();
  }, [resetPan, resetZoom]);

  const handleExportJSON = useCallback(() => {
    const dataStr = JSON.stringify(nodes, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mapa-mental.json';
    link.click();
    
    URL.revokeObjectURL(url);
  }, [nodes]);

  const handleExportPNG = useCallback(() => {
    // Crear un canvas temporal para exportar
    alert('Funcionalidad de exportar a PNG disponible próximamente');
  }, []);

  // Handlers para sidebar
  const handleNewBlank = useCallback(() => {
    if (window.confirm('¿Crear un nuevo mapa en blanco? Se perderán los cambios no guardados.')) {
      clearAll();
    }
  }, [clearAll]);

  const handleNewFromTemplate = useCallback(() => {
    if (window.confirm('¿Cargar template? Se perderán los cambios no guardados.')) {
      resetToDefault();
    }
  }, [resetToDefault]);

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden">
      {/* Sidebar izquierdo */}
      <Sidebar
        nodes={nodes}
        onNewBlank={handleNewBlank}
        onNewFromTemplate={handleNewFromTemplate}
      />

      {/* Área principal */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Toolbar superior */}
        <Toolbar
          onAddNode={handleAddNode}
          onDeleteNode={handleDeleteNode}
          onUndo={undo}
          onRedo={redo}
          onCenter={handleCenter}
          onExportJSON={handleExportJSON}
          onExportPNG={handleExportPNG}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetZoom={resetZoom}
          canUndo={canUndo}
          canRedo={canRedo}
          hasSelection={!!selectedNodeId}
          zoom={zoom}
        />

        {/* Canvas principal */}
        <Canvas
          nodes={nodes}
          selectedNodeId={selectedNodeId}
          pan={pan}
          zoom={zoom}
          isPanning={isPanning}
          contextMenu={contextMenu}
          onSelectNode={setSelectedNodeId}
          onStartPanning={startPanning}
          onUpdatePanning={updatePanning}
          onStopPanning={stopPanning}
          onUpdateNodePosition={updateNodePosition}
          onUpdateNodeText={updateNodeText}
          onOpenContextMenu={openContextMenu}
          onCloseContextMenu={closeContextMenu}
          onAddChildNode={addNode}
          onDuplicateNode={duplicateNode}
          onDeleteNode={deleteNode}
          onChangeNodeColor={updateNodeColor}
          onWheel={handleWheel}
        />
      </div>
    </div>
  );
};

export default MindMapApp;

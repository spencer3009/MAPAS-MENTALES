import React, { useCallback, useState } from 'react';
import Sidebar from './Sidebar';
import Toolbar from './Toolbar';
import Canvas from './Canvas';
import ConfirmModal from './ConfirmModal';
import TemplateModal from './TemplateModal';
import { useNodes } from '../../hooks/useNodes';
import { usePanning } from '../../hooks/usePanning';
import { useZoom } from '../../hooks/useZoom';
import { useContextMenu } from '../../hooks/useContextMenu';

const MindMapApp = () => {
  const {
    nodes,
    projectName,
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
    createBlankMap,
    loadFromTemplate,
    deleteProject
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

  // Estados para modales
  const [showBlankModal, setShowBlankModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
    try {
      const dataStr = JSON.stringify(nodes, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      console.log('JSON exportado exitosamente');
    } catch (error) {
      console.error('Error al exportar JSON:', error);
    }
  }, [nodes, projectName]);

  const handleExportPNG = useCallback(() => {
    alert('Funcionalidad de exportar a PNG disponible próximamente');
  }, []);

  // ==========================================
  // HANDLERS PARA MODALES CON CONFIRMACIÓN
  // ==========================================

  // Handler para "En Blanco" - Abrir modal
  const handleNewBlankClick = useCallback(() => {
    setShowBlankModal(true);
  }, []);

  // Handler para confirmar "En Blanco"
  const handleConfirmBlank = useCallback(() => {
    try {
      console.log('Confirmando creación de mapa en blanco...');
      const success = createBlankMap();
      if (success) {
        resetPan();
        resetZoom();
        console.log('Mapa en blanco creado y vista centrada');
      }
    } catch (error) {
      console.error('Error al crear mapa en blanco:', error);
    } finally {
      setShowBlankModal(false);
    }
  }, [createBlankMap, resetPan, resetZoom]);

  // Handler para "Desde Template" - Abrir modal
  const handleNewFromTemplateClick = useCallback(() => {
    setShowTemplateModal(true);
  }, []);

  // Handler para seleccionar template
  const handleSelectTemplate = useCallback((templateNodes, templateName) => {
    try {
      console.log('Seleccionando template:', templateName);
      const success = loadFromTemplate(templateNodes, templateName);
      if (success) {
        resetPan();
        resetZoom();
        console.log('Template cargado y vista centrada');
      }
    } catch (error) {
      console.error('Error al cargar template:', error);
    }
  }, [loadFromTemplate, resetPan, resetZoom]);

  // Handler para "Eliminar Proyecto" - Abrir modal
  const handleDeleteProjectClick = useCallback(() => {
    setShowDeleteModal(true);
  }, []);

  // Handler para confirmar eliminación
  const handleConfirmDelete = useCallback(() => {
    try {
      console.log('Confirmando eliminación de proyecto...');
      const success = deleteProject();
      if (success) {
        resetPan();
        resetZoom();
        console.log('Proyecto eliminado y vista centrada');
      }
    } catch (error) {
      console.error('Error al eliminar proyecto:', error);
    } finally {
      setShowDeleteModal(false);
    }
  }, [deleteProject, resetPan, resetZoom]);

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden">
      {/* Sidebar izquierdo */}
      <Sidebar
        nodes={nodes}
        projectName={projectName}
        onNewBlank={handleNewBlankClick}
        onNewFromTemplate={handleNewFromTemplateClick}
        onDeleteProject={handleDeleteProjectClick}
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

      {/* ==================== MODALES ==================== */}
      
      {/* Modal: Crear mapa en blanco */}
      <ConfirmModal
        isOpen={showBlankModal}
        title="Crear Mapa en Blanco"
        message="Se creará un nuevo mapa mental vacío con un nodo central. El mapa actual será reemplazado. ¿Deseas continuar?"
        confirmText="Crear"
        cancelText="Cancelar"
        onConfirm={handleConfirmBlank}
        onCancel={() => setShowBlankModal(false)}
        variant="default"
      />

      {/* Modal: Seleccionar template */}
      <TemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* Modal: Eliminar proyecto */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Eliminar Proyecto"
        message="Se eliminará el mapa mental actual y todos sus nodos. Esta acción no se puede deshacer. ¿Estás seguro?"
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
        variant="danger"
      />
    </div>
  );
};

export default MindMapApp;

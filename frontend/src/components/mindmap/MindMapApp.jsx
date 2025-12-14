import React, { useCallback, useState } from 'react';
import Sidebar from './Sidebar';
import Toolbar from './Toolbar';
import Canvas from './Canvas';
import RightStyleSidebar from './RightStyleSidebar';
import ConfirmModal from './ConfirmModal';
import TemplateModal from './TemplateModal';
import ProjectNameModal from './ProjectNameModal';
import { useNodes } from '../../hooks/useNodes';
import { usePanning } from '../../hooks/usePanning';
import { useZoom } from '../../hooks/useZoom';
import { useContextMenu } from '../../hooks/useContextMenu';
import { useAuth } from '../../contexts/AuthContext';

const MindMapApp = () => {
  const { user, logout } = useAuth();
  
  const {
    nodes,
    projectName,
    activeProjectId,
    projects,
    selectedNodeId,
    setSelectedNodeId,
    addNode,
    updateNodePosition,
    updateNodeText,
    updateNodeColor,
    updateNodeComment,
    updateNodeStyle,
    updateNodeSize,
    updateNodeIcon,
    saveNodePositionToHistory,
    deleteNode,
    duplicateNode,
    undo,
    redo,
    canUndo,
    canRedo,
    createBlankMap,
    loadFromTemplate,
    deleteProject,
    switchProject,
    renameProject
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
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [showProjectNameModal, setShowProjectNameModal] = useState(false);
  const [projectNameModalConfig, setProjectNameModalConfig] = useState({
    title: 'Nuevo Proyecto',
    subtitle: 'Ingresa un nombre para tu mapa mental',
    confirmText: 'Crear',
    initialName: '',
    isRename: false,
    projectId: null
  });

  // Estado para el sidebar de estilos
  const [showStyleSidebar, setShowStyleSidebar] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('styles');

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
  // HANDLERS PARA GESTIÓN DE PROYECTOS
  // ==========================================

  // Handler para "En Blanco" - Abrir modal de nombre
  const handleNewBlankClick = useCallback(() => {
    setProjectNameModalConfig({
      title: 'Nuevo Proyecto',
      subtitle: 'Ingresa un nombre para tu mapa mental',
      confirmText: 'Crear',
      initialName: 'Nuevo Mapa',
      isRename: false,
      projectId: null
    });
    setShowProjectNameModal(true);
  }, []);

  // Handler para confirmar nombre de proyecto
  const handleConfirmProjectName = useCallback((name) => {
    if (projectNameModalConfig.isRename && projectNameModalConfig.projectId) {
      // Renombrar proyecto existente
      renameProject(projectNameModalConfig.projectId, name);
    } else {
      // Crear nuevo proyecto
      const success = createBlankMap(name);
      if (success) {
        resetPan();
        resetZoom();
      }
    }
    setShowProjectNameModal(false);
  }, [projectNameModalConfig, createBlankMap, renameProject, resetPan, resetZoom]);

  // Handler para renombrar proyecto (doble clic en el nombre)
  const handleRenameProject = useCallback((projectId, currentName) => {
    setProjectNameModalConfig({
      title: 'Renombrar Proyecto',
      subtitle: 'Cambia el nombre de tu mapa mental',
      confirmText: 'Guardar',
      initialName: currentName,
      isRename: true,
      projectId: projectId
    });
    setShowProjectNameModal(true);
  }, []);

  // Handler para confirmar "En Blanco" - DEPRECATED, usar handleConfirmProjectName
  const handleConfirmBlank = useCallback(() => {
    try {
      console.log('Creando nuevo proyecto en blanco...');
      const success = createBlankMap();
      if (success) {
        resetPan();
        resetZoom();
        console.log('Nuevo proyecto creado exitosamente');
      }
    } catch (error) {
      console.error('Error al crear proyecto en blanco:', error);
    } finally {
      setShowBlankModal(false);
    }
  }, [createBlankMap, resetPan, resetZoom]);

  // Handler para "Desde Template" - Abrir modal
  const handleNewFromTemplateClick = useCallback(() => {
    setShowTemplateModal(true);
  }, []);

  // Handler para seleccionar template - CREA NUEVO PROYECTO
  const handleSelectTemplate = useCallback((templateNodes, templateName) => {
    try {
      console.log('Creando proyecto desde template:', templateName);
      const success = loadFromTemplate(templateNodes, templateName);
      if (success) {
        resetPan();
        resetZoom();
        console.log('Proyecto desde template creado exitosamente');
      }
    } catch (error) {
      console.error('Error al cargar template:', error);
    }
  }, [loadFromTemplate, resetPan, resetZoom]);

  // Handler para eliminar proyecto - Abrir modal
  const handleDeleteProjectClick = useCallback((projectId) => {
    setProjectToDelete(projectId || activeProjectId);
    setShowDeleteModal(true);
  }, [activeProjectId]);

  // Handler para confirmar eliminación
  const handleConfirmDelete = useCallback(() => {
    try {
      console.log('Eliminando proyecto:', projectToDelete);
      const success = deleteProject(projectToDelete);
      if (success) {
        resetPan();
        resetZoom();
        console.log('Proyecto eliminado exitosamente');
      }
    } catch (error) {
      console.error('Error al eliminar proyecto:', error);
    } finally {
      setShowDeleteModal(false);
      setProjectToDelete(null);
    }
  }, [deleteProject, projectToDelete, resetPan, resetZoom]);

  // Handler para cambiar de proyecto
  const handleSwitchProject = useCallback((projectId) => {
    try {
      console.log('Cambiando a proyecto:', projectId);
      const success = switchProject(projectId);
      if (success) {
        resetPan();
        resetZoom();
        setSelectedNodeId(null);
        setShowStyleSidebar(false);
      }
    } catch (error) {
      console.error('Error al cambiar proyecto:', error);
    }
  }, [switchProject, resetPan, resetZoom, setSelectedNodeId]);

  // Handlers para el sidebar de estilos
  const handleToggleStyleSidebar = useCallback((tab = 'styles') => {
    if (showStyleSidebar && sidebarTab === tab) {
      setShowStyleSidebar(false);
    } else {
      setShowStyleSidebar(true);
      setSidebarTab(tab);
    }
  }, [showStyleSidebar, sidebarTab]);

  const handleOpenIconPanel = useCallback(() => {
    setShowStyleSidebar(true);
    setSidebarTab('icons');
  }, []);

  const handleCloseStyleSidebar = useCallback(() => {
    setShowStyleSidebar(false);
  }, []);

  const handleSidebarTabChange = useCallback((tab) => {
    setSidebarTab(tab);
  }, []);

  // Obtener nodo seleccionado
  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  // Obtener nombre del proyecto a eliminar para el modal
  const projectToDeleteName = projects.find(p => p.id === projectToDelete)?.name || 'este proyecto';

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden">
      {/* Sidebar izquierdo con lista de proyectos */}
      <Sidebar
        projects={projects}
        activeProjectId={activeProjectId}
        onNewBlank={handleNewBlankClick}
        onNewFromTemplate={handleNewFromTemplateClick}
        onDeleteProject={handleDeleteProjectClick}
        onSwitchProject={handleSwitchProject}
        onRenameProject={renameProject}
        user={user}
        onLogout={logout}
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

        {/* Canvas y Sidebar derecho */}
        <div className="flex-1 flex overflow-hidden">
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
            onUpdateNodeComment={updateNodeComment}
            onUpdateNodeStyle={updateNodeStyle}
            onUpdateNodeSize={updateNodeSize}
            onUpdateNodeIcon={updateNodeIcon}
            onSaveNodePositionToHistory={saveNodePositionToHistory}
            onOpenContextMenu={openContextMenu}
            onCloseContextMenu={closeContextMenu}
            onAddChildNode={addNode}
            onDuplicateNode={duplicateNode}
            onDeleteNode={deleteNode}
            onChangeNodeColor={updateNodeColor}
            onWheel={handleWheel}
            onToggleStyleSidebar={handleToggleStyleSidebar}
            styleSidebarOpen={showStyleSidebar}
          />

          {/* Sidebar derecho de estilos */}
          <RightStyleSidebar
            isOpen={showStyleSidebar}
            selectedNode={selectedNode}
            onStyleChange={updateNodeStyle}
            onClose={handleCloseStyleSidebar}
          />
        </div>
      </div>

      {/* ==================== MODALES ==================== */}
      
      {/* Modal: Nombrar proyecto */}
      <ProjectNameModal
        isOpen={showProjectNameModal}
        title={projectNameModalConfig.title}
        subtitle={projectNameModalConfig.subtitle}
        confirmText={projectNameModalConfig.confirmText}
        initialName={projectNameModalConfig.initialName}
        onConfirm={handleConfirmProjectName}
        onCancel={() => setShowProjectNameModal(false)}
      />

      {/* Modal: Crear nuevo proyecto en blanco - DEPRECATED */}
      <ConfirmModal
        isOpen={showBlankModal}
        title="Crear Nuevo Proyecto"
        message="Se creará un nuevo mapa mental vacío. Tu proyecto actual se conservará en la lista de proyectos."
        confirmText="Crear Proyecto"
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
        message={`¿Estás seguro de eliminar "${projectToDeleteName}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteModal(false);
          setProjectToDelete(null);
        }}
        variant="danger"
      />
    </div>
  );
};

export default MindMapApp;

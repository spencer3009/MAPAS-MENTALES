import React, { useCallback, useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Toolbar from './Toolbar';
import Canvas from './Canvas';
import RightStyleSidebar from './RightStyleSidebar';
import ConfirmModal from './ConfirmModal';
import TemplateModal from './TemplateModal';
import ProjectNameModal from './ProjectNameModal';
import ProjectReminderModal from './ProjectReminderModal';
import ProfileModal from './ProfileModal';
import AllProjectsModal from './AllProjectsModal';
import { useNodes } from '../../hooks/useNodes';
import { usePanning } from '../../hooks/usePanning';
import { useZoom } from '../../hooks/useZoom';
import { useContextMenu } from '../../hooks/useContextMenu';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const MindMapApp = () => {
  const { user, logout, token } = useAuth();
  
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
    updateNodeType,
    updateDashedLineWidth,
    addNodeLink,
    removeNodeLink,
    updateNodeLink,
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
    renameProject,
    pinProject,
    reorderProjects,
    // Selección múltiple
    selectedNodeIds,
    addToSelection,
    selectSingleNode,
    selectAllNodes,
    clearSelection,
    selectNodesInArea,
    isNodeSelected,
    getSelectedNodes,
    // Acciones en grupo
    deleteSelectedNodes,
    duplicateSelectedNodes,
    alignNodesLeft,
    alignNodesCenter,
    alignNodesRight,
    alignNodesTop,
    alignNodesMiddle,
    alignNodesBottom,
    moveSelectedNodes
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
  
  // Estado para recordatorio de proyecto
  const [showProjectReminderModal, setShowProjectReminderModal] = useState(false);
  const [projectForReminder, setProjectForReminder] = useState(null);

  // Estado para modal de perfil
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Estado para modal de todos los proyectos
  const [showAllProjectsModal, setShowAllProjectsModal] = useState(false);

  // Estado para recordatorios (para mostrar indicador en nodos)
  const [nodeReminders, setNodeReminders] = useState(new Set());

  // Cargar recordatorios para marcar nodos con recordatorios activos
  const loadReminders = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_URL}/api/reminders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const reminders = await response.json();
        // Filtrar solo recordatorios pendientes de nodos
        const nodeIdsWithReminders = new Set(
          reminders
            .filter(r => r.status === 'pending' && r.node_id)
            .map(r => r.node_id)
        );
        setNodeReminders(nodeIdsWithReminders);
      }
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  }, [token]);

  // Cargar recordatorios al montar y cuando cambie el proyecto
  useEffect(() => {
    loadReminders();
  }, [loadReminders, activeProjectId]);

  // Enriquecer nodos con información de recordatorio
  const nodesWithReminders = nodes.map(node => ({
    ...node,
    hasReminder: nodeReminders.has(node.id)
  }));

  // ==========================================
  // ATAJOS DE TECLADO PARA SELECCIÓN MÚLTIPLE
  // ==========================================
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignorar si estamos en un input o textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;

      // CTRL/CMD + A - Seleccionar todos
      if (modifierKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        selectAllNodes();
      }

      // ESC - Limpiar selección
      if (e.key === 'Escape') {
        clearSelection();
        closeContextMenu();
      }

      // DELETE o BACKSPACE - Eliminar seleccionados
      if ((e.key === 'Delete' || e.key === 'Backspace') && (selectedNodeId || selectedNodeIds.size > 0)) {
        // Solo si no estamos editando
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          deleteSelectedNodes();
        }
      }

      // CTRL/CMD + D - Duplicar seleccionados
      if (modifierKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelectedNodes();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectAllNodes, clearSelection, closeContextMenu, selectedNodeId, selectedNodeIds, deleteSelectedNodes, duplicateSelectedNodes]);

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

  const handleOpenReminderPanel = useCallback(() => {
    setShowStyleSidebar(true);
    setSidebarTab('reminders');
  }, []);

  // Handler para abrir recordatorio de proyecto
  const handleProjectReminder = useCallback((project) => {
    setProjectForReminder(project);
    setShowProjectReminderModal(true);
  }, []);

  const handleCloseStyleSidebar = useCallback(() => {
    setShowStyleSidebar(false);
  }, []);

  const handleSidebarTabChange = useCallback((tab) => {
    setSidebarTab(tab);
  }, []);

  // Obtener nodo seleccionado (con info de recordatorio)
  const selectedNode = nodesWithReminders.find(n => n.id === selectedNodeId);

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
        onProjectReminder={handleProjectReminder}
        onPinProject={pinProject}
        onReorderProjects={reorderProjects}
        onOpenAllProjects={() => setShowAllProjectsModal(true)}
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
          token={token}
          onRefreshNotifications={loadReminders}
          user={user}
          onOpenProfile={() => setShowProfileModal(true)}
          onLogout={logout}
        />

        {/* Canvas y Sidebar derecho */}
        <div className="flex-1 flex overflow-hidden">
          {/* Canvas principal */}
          <Canvas
            nodes={nodesWithReminders}
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
            onAddNodeLink={addNodeLink}
            onRemoveNodeLink={removeNodeLink}
            onUpdateNodeLink={updateNodeLink}
            onSaveNodePositionToHistory={saveNodePositionToHistory}
            onOpenContextMenu={openContextMenu}
            onCloseContextMenu={closeContextMenu}
            onAddChildNode={addNode}
            onDuplicateNode={duplicateNode}
            onDeleteNode={deleteNode}
            onChangeNodeColor={updateNodeColor}
            onChangeNodeType={updateNodeType}
            onChangeLineWidth={updateDashedLineWidth}
            onWheel={handleWheel}
            onToggleStyleSidebar={handleToggleStyleSidebar}
            onOpenIconPanel={handleOpenIconPanel}
            onOpenReminderPanel={handleOpenReminderPanel}
            styleSidebarOpen={showStyleSidebar}
            sidebarTab={sidebarTab}
          />

          {/* Sidebar derecho de estilos */}
          <RightStyleSidebar
            isOpen={showStyleSidebar}
            selectedNode={selectedNode}
            activeTab={sidebarTab}
            projectId={activeProjectId}
            projectName={projectName}
            onTabChange={handleSidebarTabChange}
            onStyleChange={updateNodeStyle}
            onIconChange={updateNodeIcon}
            onClose={handleCloseStyleSidebar}
            onReminderChange={loadReminders}
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

      {/* Modal: Recordatorio de proyecto */}
      <ProjectReminderModal
        isOpen={showProjectReminderModal}
        project={projectForReminder}
        onClose={() => {
          setShowProjectReminderModal(false);
          setProjectForReminder(null);
        }}
      />

      {/* Modal: Perfil de usuario */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
      />

      {/* Modal: Todos los proyectos */}
      <AllProjectsModal
        isOpen={showAllProjectsModal}
        onClose={() => setShowAllProjectsModal(false)}
        projects={projects}
        activeProjectId={activeProjectId}
        onSwitchProject={handleSwitchProject}
        onDeleteProject={handleDeleteProjectClick}
        onRenameProject={renameProject}
        onPinProject={pinProject}
        onReorderProjects={reorderProjects}
      />
    </div>
  );
};

export default MindMapApp;

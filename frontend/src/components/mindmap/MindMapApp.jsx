import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Star, FolderKanban } from 'lucide-react';
import html2canvas from 'html2canvas';
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
import MultiSelectToolbar from './MultiSelectToolbar';
import LayoutTemplateSelector from './LayoutTemplateSelector';
import TrashView from './TrashView';
import DockSidebar from './DockSidebar';
import DashboardView from './DashboardView';
import TemplatesView from './TemplatesView';
import IntegrationsView from './IntegrationsView';
import UpgradeModal from './UpgradeModal';
import RemindersView from './RemindersView';
import { NotificationProvider } from './ToastProvider';
import { useNodes } from '../../hooks/useNodes';
import { usePanning } from '../../hooks/usePanning';
import { useZoom } from '../../hooks/useZoom';
import { useContextMenu } from '../../hooks/useContextMenu';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Componente interno principal
const MindMapAppInner = ({ onAdminClick, onNavigateToReminders, forceView, clearForceView }) => {
  const { user, logout, token, isAdmin } = useAuth();
  
  const {
    nodes,
    projectName,
    activeProjectId,
    activeProject,
    projects,
    selectedNodeId,
    setSelectedNodeId,
    addNode,
    addNodeHorizontal,
    addNodeVertical,
    addNodeFromLine,
    updateNodePosition,
    updateNodeText,
    updateNodeColor,
    updateNodeComment,
    toggleNodeCompleted,
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
    reloadProjects,
    saveThumbnail,
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
    // Alineación de NODOS (posición en canvas)
    alignNodesLeft,
    alignNodesCenter,
    alignNodesRight,
    alignNodesTop,
    alignNodesMiddle,
    alignNodesBottom,
    // Alineación de TEXTO (dentro del nodo)
    alignTextLeft,
    alignTextCenter,
    alignTextRight,
    // Alineación de TEXTO para nodo individual (toolbar)
    alignSingleNodeTextLeft,
    alignSingleNodeTextCenter,
    alignSingleNodeTextRight,
    // Distribución
    distributeNodesVertically,
    distributeNodesHorizontally,
    moveSelectedNodes,
    // Alineación jerárquica automática (MindFlow)
    applyFullAutoAlignment,
    // Alineación MindTree (vertical)
    applyFullMindTreeAlignment,
    // Alineación MindHybrid (mixta)
    applyFullMindHybridAlignment
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

  // Estado para selector de plantilla de layout
  const [showLayoutSelector, setShowLayoutSelector] = useState(false);
  const [pendingProjectName, setPendingProjectName] = useState(null);
  const [preselectedLayout, setPreselectedLayout] = useState(null);

  // Estado para el modal de Upgrade a Pro
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeLimitType, setUpgradeLimitType] = useState('active');

  // Estado para la Papelera
  const [showTrashView, setShowTrashView] = useState(false);
  const [trashCount, setTrashCount] = useState(0);

  // Estado para el modo de interacción: 'hand' (mover lienzo) o 'pointer' (seleccionar)
  const [interactionMode, setInteractionMode] = useState('hand');

  // Estado para el Dock y vistas principales
  const [activeView, setActiveView] = useState('dashboard'); // 'projects' | 'dashboard' | 'templates' | 'integrations'
  const [isProjectsSidebarOpen, setIsProjectsSidebarOpen] = useState(false); // Inicialmente cerrado cuando está en dashboard

  // Efecto para navegar desde notificaciones
  useEffect(() => {
    if (forceView) {
      setActiveView(forceView);
      if (clearForceView) clearForceView();
    }
  }, [forceView, clearForceView]);

  // Estado para alineación automática (ON por defecto)
  const [autoAlignEnabled, setAutoAlignEnabled] = useState(true);

  // Obtener el layoutType del proyecto activo
  const currentLayoutType = activeProject?.layoutType || 'mindflow';

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

  // Cargar conteo de proyectos en la papelera
  const loadTrashCount = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_URL}/api/projects/trash`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const trashProjects = await response.json();
        console.log('[MindMapApp] Actualizando trashCount:', trashProjects.length);
        setTrashCount(trashProjects.length);
      }
    } catch (error) {
      console.error('Error loading trash count:', error);
    }
  }, [token]);

  // Cargar conteo de papelera al montar
  useEffect(() => {
    loadTrashCount();
  }, [loadTrashCount]);

  // Handler para abrir la papelera
  const handleOpenTrash = useCallback(() => {
    setShowTrashView(true);
  }, []);

  // Handler para cuando se restaura un proyecto
  const handleProjectRestored = useCallback(() => {
    // Recargar proyectos y conteo de papelera
    loadTrashCount();
    reloadProjects();
  }, [loadTrashCount, reloadProjects]);

  // ==========================================
  // HANDLERS PARA EL DOCK SIDEBAR
  // ==========================================
  
  // Función para capturar thumbnail del canvas
  const captureThumbnail = useCallback(async () => {
    if (!activeProjectId) return null;
    
    // Buscar el contenedor del canvas por su clase
    const canvasContainer = document.querySelector('.bg-gradient-to-br.from-slate-50.to-slate-100');
    if (!canvasContainer) {
      console.log('No se encontró el canvas container');
      return null;
    }
    
    try {
      const canvas = await html2canvas(canvasContainer, {
        scale: 0.3, // Escala pequeña para thumbnail
        backgroundColor: '#f9fafb',
        logging: false,
        useCORS: true
      });
      
      // Convertir a base64 con calidad reducida
      const thumbnail = canvas.toDataURL('image/jpeg', 0.6);
      return thumbnail;
    } catch (error) {
      console.error('Error capturando thumbnail:', error);
      return null;
    }
  }, [activeProjectId]);

  const handleToggleProjectsSidebar = useCallback(() => {
    if (activeView !== 'projects') {
      // Si estamos en otra vista, volver a projects con sidebar abierto
      setActiveView('projects');
      setIsProjectsSidebarOpen(true);
    } else {
      // Si ya estamos en projects, toggle del sidebar
      setIsProjectsSidebarOpen(prev => !prev);
    }
  }, [activeView]);

  const handleOpenDashboard = useCallback(async () => {
    // Capturar thumbnail del proyecto actual antes de ir al dashboard
    if (activeProjectId && activeView === 'projects') {
      const thumbnail = await captureThumbnail();
      if (thumbnail) {
        await saveThumbnail(activeProjectId, thumbnail);
      }
    }
    setActiveView('dashboard');
  }, [activeProjectId, activeView, captureThumbnail, saveThumbnail]);

  const handleOpenTemplatesView = useCallback(() => {
    setActiveView('templates');
  }, []);

  const handleOpenRemindersPanel = useCallback(() => {
    setActiveView('reminders');
    setIsProjectsSidebarOpen(false);
  }, []);

  const handleOpenIntegrations = useCallback(() => {
    setActiveView('integrations');
  }, []);

  const handleOpenSettings = useCallback(() => {
    setShowProfileModal(true);
  }, []);

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
        duplicateSelectedNodes(autoAlignEnabled);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectAllNodes, clearSelection, closeContextMenu, selectedNodeId, selectedNodeIds, deleteSelectedNodes, duplicateSelectedNodes, autoAlignEnabled]);

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

  // Función de alineación automática
  // Usa el layout correcto según el tipo de proyecto (MindFlow o MindTree)
  const applyAutoAlignment = useCallback(() => {
    if (!autoAlignEnabled) return;

    console.log('[AutoAlign] Aplicando alineación para layout:', currentLayoutType);
    
    // Aplicar alineación según el tipo de layout del proyecto
    if (currentLayoutType === 'mindtree') {
      applyFullMindTreeAlignment();
    } else if (currentLayoutType === 'mindhybrid') {
      applyFullMindHybridAlignment();
    } else {
      applyFullAutoAlignment();
    }

    console.log('[AutoAlign] Alineación completada');
  }, [autoAlignEnabled, currentLayoutType, applyFullAutoAlignment, applyFullMindTreeAlignment, applyFullMindHybridAlignment]);

  // Toggle de alineación automática
  const handleToggleAutoAlign = useCallback((enabled) => {
    setAutoAlignEnabled(enabled);
    console.log('[AutoAlign] Alineación automática:', enabled ? 'ACTIVADA' : 'DESACTIVADA');
    
    // Si se activa, aplicar alineación inmediatamente según el layout
    if (enabled) {
      setTimeout(() => {
        if (currentLayoutType === 'mindtree') {
          applyFullMindTreeAlignment();
        } else if (currentLayoutType === 'mindhybrid') {
          applyFullMindHybridAlignment();
        } else {
          applyFullAutoAlignment();
        }
      }, 100);
    }
  }, [currentLayoutType, applyFullAutoAlignment, applyFullMindTreeAlignment, applyFullMindHybridAlignment]);


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

  // Handler para "En Blanco" - Ahora abre primero el selector de layout
  const handleNewBlankClick = useCallback(() => {
    setPreselectedLayout(null); // Sin pre-selección
    setShowLayoutSelector(true);
  }, []);

  // Handler para abrir el selector de layout con una plantilla pre-seleccionada
  const handleOpenLayoutSelectorWithTemplate = useCallback((templateId) => {
    // Mapear el ID de plantilla del dashboard al ID del layout selector
    const layoutMap = {
      'mindflow': 'mindflow',
      'mindtree': 'mindtree',
      'mindhybrid': 'mindhybrid',
      'blank': null // blank no tiene pre-selección
    };
    setPreselectedLayout(layoutMap[templateId] || null);
    setShowLayoutSelector(true);
  }, []);

  // Handler para cuando se selecciona un layout
  const handleLayoutSelect = useCallback((layoutType) => {
    setShowLayoutSelector(false);
    setPreselectedLayout(null); // Reset después de seleccionar
    // Guardar el layout seleccionado y abrir modal de nombre
    setPendingProjectName(null); // Reset
    setProjectNameModalConfig({
      title: 'Nuevo Proyecto',
      subtitle: layoutType === 'mindtree' 
        ? 'Proyecto con layout vertical (MindTree)' 
        : layoutType === 'mindhybrid'
        ? 'Proyecto con layout híbrido (MindHybrid)'
        : 'Proyecto con layout horizontal (MindFlow)',
      confirmText: 'Crear',
      initialName: 'Nuevo Mapa',
      isRename: false,
      projectId: null,
      layoutType: layoutType // Guardamos el layout seleccionado
    });
    setShowProjectNameModal(true);
  }, []);

  // Handler para confirmar nombre de proyecto
  const handleConfirmProjectName = useCallback(async (name) => {
    if (projectNameModalConfig.isRename && projectNameModalConfig.projectId) {
      // Renombrar proyecto existente
      renameProject(projectNameModalConfig.projectId, name);
    } else {
      // Crear nuevo proyecto con el layout seleccionado
      const layoutType = projectNameModalConfig.layoutType || 'mindflow';
      const result = await createBlankMap(name, layoutType);
      
      if (result.success) {
        resetPan();
        resetZoom();
      } else if (result.error) {
        // Mostrar modal de upgrade si hay error de límites
        setUpgradeLimitType(result.limitType || 'active');
        setShowUpgradeModal(true);
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
  const handleConfirmBlank = useCallback(async () => {
    try {
      console.log('Creando nuevo proyecto en blanco...');
      const result = await createBlankMap();
      if (result.success) {
        resetPan();
        resetZoom();
        console.log('Nuevo proyecto creado exitosamente');
      } else if (result.error) {
        setUpgradeLimitType(result.limitType || 'active');
        setShowUpgradeModal(true);
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
  const handleSelectTemplate = useCallback(async (templateNodes, templateName) => {
    try {
      console.log('Creando proyecto desde template:', templateName);
      const result = await loadFromTemplate(templateNodes, templateName);
      if (result.success) {
        resetPan();
        resetZoom();
        console.log('Proyecto desde template creado exitosamente');
      } else if (result.error) {
        setUpgradeLimitType(result.limitType || 'active');
        setShowUpgradeModal(true);
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

  // Handler para confirmar eliminación (soft delete - va a la papelera)
  const handleConfirmDelete = useCallback(() => {
    try {
      console.log('Enviando proyecto a la papelera:', projectToDelete);
      const success = deleteProject(projectToDelete);
      if (success) {
        resetPan();
        resetZoom();
        console.log('Proyecto enviado a la papelera exitosamente');
        // Actualizar conteo de la papelera
        loadTrashCount();
      }
    } catch (error) {
      console.error('Error al enviar proyecto a la papelera:', error);
    } finally {
      setShowDeleteModal(false);
      setProjectToDelete(null);
    }
  }, [deleteProject, projectToDelete, resetPan, resetZoom, loadTrashCount]);

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

  // Renderizar vista según activeView
  const renderMainContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <DashboardView 
            projects={projects} 
            token={token}
            user={user}
            onOpenProject={(projectId) => {
              handleSwitchProject(projectId);
              setActiveView('projects');
              setIsProjectsSidebarOpen(true);
            }}
            onNewProject={(templateType) => {
              setActiveView('projects');
              setIsProjectsSidebarOpen(true);
              // Crear nuevo proyecto con plantilla
              if (templateType === 'blank') {
                handleNewBlankClick();
              } else {
                // Abrir selector de layout con la plantilla pre-seleccionada
                handleOpenLayoutSelectorWithTemplate(templateType);
              }
            }}
            onOpenTemplates={handleOpenTemplatesView}
            onToggleFavorite={pinProject}
            onDeleteProject={(projectId) => {
              // Llamar directamente a deleteProject ya que la confirmación se hace en el Dashboard
              const success = deleteProject(projectId);
              if (success) {
                loadTrashCount();
              }
            }}
            onDuplicateProject={(projectId) => {
              // TODO: Implementar duplicación de proyecto
              alert('Función de duplicar proyecto próximamente disponible');
            }}
            onShowUpgradeModal={(reason) => {
              setUpgradeLimitType(reason);
              setShowUpgradeModal(true);
            }}
            onViewAllMaps={() => {
              setActiveView('projects');
              setIsProjectsSidebarOpen(true);
            }}
          />
        );
      case 'templates':
        return <TemplatesView onSelectTemplate={(type) => {
          setActiveView('projects');
          setIsProjectsSidebarOpen(true);
          // Abrir el selector de layout con el tipo seleccionado
          setShowLayoutSelector(true);
        }} />;
      case 'favorites':
        return (
          <div className="flex-1 h-full overflow-y-auto bg-white p-6">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <Star className="text-yellow-500" size={28} />
                Favoritos
              </h1>
              {projects.filter(p => p.isPinned).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.filter(p => p.isPinned).map((project) => (
                    <div
                      key={project.id}
                      onClick={() => {
                        handleSwitchProject(project.id);
                        setActiveView('projects');
                        setIsProjectsSidebarOpen(true);
                      }}
                      className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                          <FolderKanban className="text-white" size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{project.name}</p>
                          <p className="text-xs text-gray-500">{project.nodes?.length || 0} nodos</p>
                        </div>
                        <Star className="text-yellow-400 fill-yellow-400" size={18} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <Star className="text-gray-400" size={24} />
                  </div>
                  <p className="text-gray-500 mb-2">No tienes favoritos</p>
                  <p className="text-sm text-gray-400">Haz clic en la estrella de un proyecto para agregarlo aquí</p>
                </div>
              )}
            </div>
          </div>
        );
      case 'reminders':
        return <RemindersView token={token} />;
      case 'integrations':
        return <IntegrationsView />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden">
      {/* Dock Sidebar - Barra lateral izquierda compacta */}
      <DockSidebar
        onToggleProjectsSidebar={handleToggleProjectsSidebar}
        onOpenDashboard={handleOpenDashboard}
        onOpenFavorites={() => {
          setActiveView('favorites');
          setIsProjectsSidebarOpen(false);
        }}
        onOpenReminders={handleOpenRemindersPanel}
        onOpenTrash={handleOpenTrash}
        onOpenSettings={handleOpenSettings}
        onLogout={logout}
        isProjectsSidebarOpen={isProjectsSidebarOpen}
        activeView={activeView}
        trashCount={trashCount}
      />

      {/* Sidebar de proyectos - Solo visible cuando isProjectsSidebarOpen y activeView === 'projects' */}
      {isProjectsSidebarOpen && activeView === 'projects' && (
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
          token={token}
        />
      )}

      {/* Área principal - Cambia según la vista activa */}
      {activeView !== 'projects' ? (
        renderMainContent()
      ) : (
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
          onAdminClick={onAdminClick}
          isAdmin={isAdmin}
          autoAlignEnabled={autoAlignEnabled}
          onToggleAutoAlign={handleToggleAutoAlign}
        />

        {/* Canvas y Sidebar derecho */}
        <div className="flex-1 flex overflow-hidden">
          {/* Canvas principal */}
          <Canvas
            nodes={nodesWithReminders}
            selectedNodeId={selectedNodeId}
            selectedNodeIds={selectedNodeIds}
            pan={pan}
            zoom={zoom}
            isPanning={isPanning}
            interactionMode={interactionMode}
            onSetInteractionMode={setInteractionMode}
            contextMenu={contextMenu}
              onSelectNode={selectSingleNode}
              onAddToSelection={addToSelection}
              onSelectNodesInArea={selectNodesInArea}
              onClearSelection={clearSelection}
              isNodeSelected={isNodeSelected}
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
              onAddNodeHorizontal={addNodeHorizontal}
              onAddNodeVertical={addNodeVertical}
              onAddNodeFromLine={addNodeFromLine}
              onDuplicateNode={duplicateNode}
              onDeleteNode={deleteNode}
              onChangeNodeColor={updateNodeColor}
              onChangeNodeType={updateNodeType}
              onChangeLineWidth={updateDashedLineWidth}
              onMoveSelectedNodes={moveSelectedNodes}
              onWheel={handleWheel}
              onToggleStyleSidebar={handleToggleStyleSidebar}
              onOpenIconPanel={handleOpenIconPanel}
              onOpenReminderPanel={handleOpenReminderPanel}
              styleSidebarOpen={showStyleSidebar}
              sidebarTab={sidebarTab}
            autoAlignEnabled={autoAlignEnabled}
            onAutoAlign={applyAutoAlignment}
            onAlignTextLeft={alignSingleNodeTextLeft}
            onAlignTextCenter={alignSingleNodeTextCenter}
            onAlignTextRight={alignSingleNodeTextRight}
            onToggleNodeCompleted={toggleNodeCompleted}
            layoutType={currentLayoutType}
            />

          {/* Toolbar de selección múltiple */}
          <MultiSelectToolbar
            selectedCount={selectedNodeIds.size}
            // Alineación de TEXTO dentro del nodo
            onAlignTextLeft={alignTextLeft}
            onAlignTextCenter={alignTextCenter}
            onAlignTextRight={alignTextRight}
            // Alineación de NODOS en el canvas
            onAlignNodesLeft={alignNodesLeft}
            onAlignNodesCenter={alignNodesCenter}
            onAlignNodesRight={alignNodesRight}
            onAlignNodesTop={alignNodesTop}
            onAlignNodesMiddle={alignNodesMiddle}
            onAlignNodesBottom={alignNodesBottom}
            // Acciones
            onDeleteSelected={deleteSelectedNodes}
            onDuplicateSelected={duplicateSelectedNodes}
            onClearSelection={clearSelection}
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
      )}

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

      {/* Modal: Eliminar proyecto (ahora va a la papelera) */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Enviar a la Papelera"
        message={`¿Estás seguro de enviar "${projectToDeleteName}" a la papelera? Podrás restaurarlo después.`}
        confirmText="Enviar a Papelera"
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

      {/* Modal: Selector de plantilla de layout */}
      <LayoutTemplateSelector
        isOpen={showLayoutSelector}
        onSelect={handleLayoutSelect}
        onClose={() => {
          setShowLayoutSelector(false);
          setPreselectedLayout(null); // Reset cuando se cierra
        }}
        initialLayout={preselectedLayout}
      />

      {/* Vista de Papelera */}
      <TrashView
        isOpen={showTrashView}
        onClose={() => setShowTrashView(false)}
        onProjectRestored={handleProjectRestored}
        token={token}
      />

      {/* Modal de Upgrade a Pro */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        limitType={upgradeLimitType}
        onUpgrade={() => {
          setShowUpgradeModal(false);
          // TODO: Aquí iría la lógica de pago con Stripe
          window.open('/upgrade', '_blank');
        }}
      />
    </div>
  );
};

// Componente wrapper con NotificationProvider
const MindMapApp = (props) => {
  const { token } = useAuth();
  const [activeViewForNav, setActiveViewForNav] = useState(null);
  
  // Callback para navegar a recordatorios desde notificación
  const handleNavigateToReminders = useCallback((reminderId) => {
    // Este callback será pasado al NotificationProvider
    // La navegación se maneja internamente en MindMapAppInner
    setActiveViewForNav('reminders');
  }, []);
  
  return (
    <NotificationProvider 
      token={token}
      onNavigateToReminders={handleNavigateToReminders}
    >
      <MindMapAppInner 
        {...props} 
        onNavigateToReminders={handleNavigateToReminders}
        forceView={activeViewForNav}
        clearForceView={() => setActiveViewForNav(null)}
      />
    </NotificationProvider>
  );
};

export default MindMapApp;

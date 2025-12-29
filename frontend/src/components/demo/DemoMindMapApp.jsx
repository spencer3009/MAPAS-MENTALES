import React, { useCallback, useState, useEffect, useRef } from 'react';
import { 
  Undo2, 
  Redo2, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Home,
  Plus,
  Trash2
} from 'lucide-react';
import Canvas from '../mindmap/Canvas';
import MultiSelectToolbar from '../mindmap/MultiSelectToolbar';
import { FullscreenControls } from '../mindmap/FullscreenMode';
import DemoBanner from './DemoBanner';
import DemoSaveModal from './DemoSaveModal';
import { useDemoNodes } from '../../hooks/useDemoNodes';
import { usePanning } from '../../hooks/usePanning';
import { useZoom } from '../../hooks/useZoom';
import { useContextMenu } from '../../hooks/useContextMenu';

// URL del logo MindoraMap
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_mindviz-app/artifacts/k1kioask_image.png';

const DemoMindMapApp = ({ onRegister, onLogin, onBackToLanding }) => {
  const {
    nodes,
    projectName,
    activeProjectId,
    activeProject,
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
    centerAllNodes,
    undo,
    redo,
    canUndo,
    canRedo,
    // Selección múltiple
    selectedNodeIds,
    addToSelection,
    selectSingleNode,
    selectAllNodes,
    clearSelection,
    selectNodesInArea,
    isNodeSelected,
    getSelectedNodes,
    deleteSelectedNodes,
    duplicateSelectedNodes,
    moveSelectedNodes,
    // Alineaciones
    alignNodesLeft,
    alignNodesCenter,
    alignNodesRight,
    alignNodesTop,
    alignNodesMiddle,
    alignNodesBottom,
    alignTextLeft,
    alignTextCenter,
    alignTextRight,
    alignSingleNodeTextLeft,
    alignSingleNodeTextCenter,
    alignSingleNodeTextRight,
    distributeNodesVertically,
    distributeNodesHorizontally,
    applyFullAutoAlignment,
    applyFullMindTreeAlignment,
    applyFullMindHybridAlignment
  } = useDemoNodes();

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

  // Estados
  const [interactionMode, setInteractionMode] = useState('hand');
  const [autoAlignEnabled, setAutoAlignEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showRulers, setShowRulers] = useState(false);
  const fullscreenContainerRef = useRef(null);

  // Modal de guardar
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveModalAction, setSaveModalAction] = useState('save');

  const currentLayoutType = activeProject?.layoutType || 'mindflow';

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
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
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          deleteSelectedNodes();
        }
      }

      // CTRL/CMD + Z - Undo
      if (modifierKey && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // CTRL/CMD + SHIFT + Z - Redo
      if (modifierKey && e.key.toLowerCase() === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectAllNodes, clearSelection, closeContextMenu, selectedNodeId, selectedNodeIds, deleteSelectedNodes, undo, redo]);

  // Funciones de fullscreen
  const enterFullscreen = useCallback(async () => {
    try {
      const element = fullscreenContainerRef.current || document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      }
    } catch (error) {
      console.error('Error entering fullscreen:', error);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Error exiting fullscreen:', error);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handlers
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
    const canvasWidth = window.innerWidth - 100;
    const canvasHeight = window.innerHeight - 150;
    centerAllNodes(canvasWidth, canvasHeight);
    resetPan();
    resetZoom();
  }, [centerAllNodes, resetPan, resetZoom]);

  // Mostrar modal de guardar
  const handleSaveAttempt = useCallback((action = 'save') => {
    setSaveModalAction(action);
    setShowSaveModal(true);
  }, []);

  // Handler para intentar salir
  const handleBackAttempt = useCallback(() => {
    if (nodes.length > 4) { // Si modificó el mapa de demo
      handleSaveAttempt('exit');
    } else {
      onBackToLanding();
    }
  }, [nodes, handleSaveAttempt, onBackToLanding]);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="flex flex-col h-screen w-full bg-gray-50 overflow-hidden">
      {/* Banner de Demo */}
      <DemoBanner 
        onRegister={() => handleSaveAttempt('save')}
      />

      {/* Toolbar simplificado */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm">
        {/* Izquierda - Logo y volver */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackAttempt}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <Home size={18} />
            <span className="text-sm font-medium hidden sm:inline">Volver al inicio</span>
          </button>
          
          <div className="h-6 w-px bg-gray-200 hidden sm:block" />
          
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="MindoraMap" className="h-8" />
            <span className="text-sm font-medium text-gray-700 hidden md:inline">Demo</span>
          </div>
        </div>

        {/* Centro - Controles del canvas */}
        <div className="flex items-center gap-1">
          {/* Undo/Redo */}
          <button
            onClick={undo}
            disabled={!canUndo}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Deshacer (Ctrl+Z)"
          >
            <Undo2 size={18} className="text-gray-600" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Rehacer (Ctrl+Shift+Z)"
          >
            <Redo2 size={18} className="text-gray-600" />
          </button>

          <div className="h-6 w-px bg-gray-200 mx-2" />

          {/* Zoom */}
          <button
            onClick={zoomOut}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Alejar"
          >
            <ZoomOut size={18} className="text-gray-600" />
          </button>
          <span className="text-sm font-medium text-gray-600 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={zoomIn}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Acercar"
          >
            <ZoomIn size={18} className="text-gray-600" />
          </button>

          <div className="h-6 w-px bg-gray-200 mx-2" />

          {/* Agregar nodo */}
          <button
            onClick={handleAddNode}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Agregar</span>
          </button>

          {/* Eliminar */}
          {selectedNodeId && (
            <button
              onClick={handleDeleteNode}
              className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
              title="Eliminar nodo"
            >
              <Trash2 size={18} />
            </button>
          )}

          <div className="h-6 w-px bg-gray-200 mx-2" />

          {/* Fullscreen */}
          <button
            onClick={enterFullscreen}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Pantalla completa"
          >
            <Maximize2 size={18} className="text-gray-600" />
          </button>
        </div>

        {/* Derecha - CTA */}
        <div className="hidden md:flex items-center">
          <button
            onClick={() => handleSaveAttempt('save')}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
          >
            Guardar mi mapa
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div 
        ref={fullscreenContainerRef}
        className={`flex-1 flex overflow-hidden ${isFullscreen ? 'fixed inset-0 z-[9998] bg-slate-50' : ''}`}
      >
        <Canvas
          nodes={nodes}
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
          onToggleStyleSidebar={() => {}}
          onOpenIconPanel={() => {}}
          onOpenReminderPanel={() => {}}
          styleSidebarOpen={false}
          sidebarTab="styles"
          autoAlignEnabled={autoAlignEnabled}
          onAutoAlign={applyFullAutoAlignment}
          onAlignTextLeft={alignSingleNodeTextLeft}
          onAlignTextCenter={alignSingleNodeTextCenter}
          onAlignTextRight={alignSingleNodeTextRight}
          onToggleNodeCompleted={toggleNodeCompleted}
          layoutType={currentLayoutType}
          isFullscreen={isFullscreen}
          onEnterFullscreen={enterFullscreen}
          showGrid={showGrid}
          showRulers={showRulers}
          onToggleGrid={() => setShowGrid(prev => !prev)}
          onToggleRulers={() => setShowRulers(prev => !prev)}
        />

        {/* Toolbar de selección múltiple */}
        <MultiSelectToolbar
          selectedCount={selectedNodeIds.size}
          onAlignTextLeft={alignTextLeft}
          onAlignTextCenter={alignTextCenter}
          onAlignTextRight={alignTextRight}
          onAlignNodesLeft={alignNodesLeft}
          onAlignNodesCenter={alignNodesCenter}
          onAlignNodesRight={alignNodesRight}
          onAlignNodesTop={alignNodesTop}
          onAlignNodesMiddle={alignNodesMiddle}
          onAlignNodesBottom={alignNodesBottom}
          onDeleteSelected={deleteSelectedNodes}
          onDuplicateSelected={duplicateSelectedNodes}
          onClearSelection={clearSelection}
        />

        {/* Controles de pantalla completa */}
        <FullscreenControls
          isFullscreen={isFullscreen}
          showGrid={showGrid}
          showRulers={showRulers}
          onToggleGrid={() => setShowGrid(prev => !prev)}
          onToggleRulers={() => setShowRulers(prev => !prev)}
          onExitFullscreen={exitFullscreen}
        />
      </div>

      {/* Modal de guardar */}
      <DemoSaveModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onRegister={() => {
          setShowSaveModal(false);
          onRegister();
        }}
        onLogin={() => {
          setShowSaveModal(false);
          onLogin();
        }}
        action={saveModalAction}
      />
    </div>
  );
};

export default DemoMindMapApp;

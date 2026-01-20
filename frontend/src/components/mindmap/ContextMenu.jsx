import React, { useState, useRef } from 'react';
import { Plus, Copy, Trash2, Square, Minus, ChevronRight, FolderOpen, Unlink, ListTodo, RotateCcw, XCircle } from 'lucide-react';

const LINE_WIDTH_OPTIONS = [
  { value: 1, label: 'Normal (1px)' },
  { value: 2, label: 'Gruesa (2px)' },
  { value: 3, label: 'Muy gruesa (3px)' },
];

// Botón con soporte para touch Y mouse
const MenuButton = ({ onClick, children, danger = false, active = false, className = '' }) => {
  const lastClickTime = useRef(0);
  
  const handleClick = (e) => {
    const now = Date.now();
    if (now - lastClickTime.current < 300) return;
    lastClickTime.current = now;
    
    e.preventDefault();
    e.stopPropagation();
    console.log('[ContextMenu] Button clicked');
    if (onClick) onClick(e);
  };

  return (
    <button
      onClick={handleClick}
      onTouchEnd={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleClick(e);
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className={`
        w-full text-left px-4 py-2.5 text-sm
        flex items-center gap-3
        transition-colors cursor-pointer
        select-none min-h-[44px]
        ${danger 
          ? 'text-red-500 hover:bg-red-50 active:bg-red-100' 
          : active
            ? 'text-sky-600 bg-sky-50 font-medium'
            : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
        }
        ${className}
      `}
      style={{ 
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation'
      }}
    >
      {children}
    </button>
  );
};

const ContextMenu = ({
  position,
  nodeId,
  currentNodeType,
  currentLineWidth,
  linkedProjectId,
  onAddChild,
  onDuplicate,
  onDelete,
  onChangeNodeType,
  onChangeLineWidth,
  onLinkToProject,
  onUnlinkProject,
  onClose
}) => {
  const [showLineWidthMenu, setShowLineWidthMenu] = useState(false);
  const menuRef = useRef(null);
  
  if (!position) return null;

  const isDashedNode = currentNodeType === 'dashed' || currentNodeType === 'dashed_text';
  const isProjectNode = currentNodeType === 'project';
  const estimatedMenuHeight = isDashedNode ? 280 : 200;
  const menuWidth = 224;

  const getAdjustedPosition = () => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let x = position.x;
    let y = position.y;
    
    if (x + menuWidth > viewportWidth - 20) {
      x = Math.max(10, x - menuWidth);
    }
    
    if (y + estimatedMenuHeight > viewportHeight - 20) {
      y = Math.max(10, y - estimatedMenuHeight);
    }
    
    return { x, y };
  };

  const adjustedPos = getAdjustedPosition();

  const handleAction = (action) => {
    action();
    onClose();
  };

  const handleConvertToDefault = () => {
    if (onChangeNodeType) onChangeNodeType(nodeId, 'default');
    onClose();
  };

  const handleConvertToDashed = () => {
    if (onChangeNodeType) onChangeNodeType(nodeId, 'dashed_text');
    onClose();
  };

  const handleChangeLineWidth = (width) => {
    if (onChangeLineWidth) onChangeLineWidth(nodeId, width);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-xl shadow-xl border border-gray-200 w-56 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      style={{
        left: adjustedPos.x,
        top: adjustedPos.y,
        zIndex: 99999,
        pointerEvents: 'auto',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent'
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      data-testid="context-menu"
    >
      <div className="py-2">
        <MenuButton onClick={() => handleAction(() => onAddChild(nodeId))}>
          <Plus size={16} className="text-gray-500" />
          <span>Crear nodo hijo</span>
        </MenuButton>
        
        <MenuButton onClick={() => handleAction(() => onDuplicate(nodeId))}>
          <Copy size={16} className="text-gray-500" />
          <span>Duplicar nodo</span>
        </MenuButton>

        <div className="border-t border-gray-100 my-1" />

        {isDashedNode ? (
          <>
            <MenuButton onClick={handleConvertToDefault}>
              <Square size={16} className="text-blue-500" />
              <span>Cambiar a rectángulo</span>
            </MenuButton>

            <div className="relative">
              <MenuButton 
                onClick={() => setShowLineWidthMenu(!showLineWidthMenu)}
                className="justify-between"
              >
                <div className="flex items-center gap-3">
                  <Minus size={16} className="text-sky-500" />
                  <span>Grosor de línea</span>
                </div>
                <ChevronRight size={14} className={`text-gray-400 transition-transform ${showLineWidthMenu ? 'rotate-90' : ''}`} />
              </MenuButton>
              
              {showLineWidthMenu && (
                <div className="bg-gray-50 border-t border-gray-100">
                  {LINE_WIDTH_OPTIONS.map((option) => (
                    <MenuButton
                      key={option.value}
                      onClick={() => handleChangeLineWidth(option.value)}
                      active={(currentLineWidth || 1) === option.value}
                      className="px-6 py-2"
                    >
                      <div 
                        className="w-6"
                        style={{
                          height: 0,
                          borderBottomWidth: `${option.value}px`,
                          borderBottomStyle: 'dashed',
                          borderBottomColor: '#38bdf8'
                        }}
                      />
                      <span>{option.label}</span>
                      {(currentLineWidth || 1) === option.value && (
                        <span className="ml-auto text-sky-500">✓</span>
                      )}
                    </MenuButton>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <MenuButton onClick={handleConvertToDashed}>
            <div className="flex items-center justify-center w-4">
              <div style={{ width: '16px', height: 0, borderBottomWidth: '3px', borderBottomStyle: 'dashed', borderBottomColor: '#38bdf8' }} />
            </div>
            <span>Cambiar a solo línea</span>
          </MenuButton>
        )}

        <div className="border-t border-gray-100 my-1" />

        {/* Opciones de vinculación de proyecto */}
        {isProjectNode && linkedProjectId ? (
          <MenuButton onClick={() => handleAction(() => onUnlinkProject && onUnlinkProject(nodeId))}>
            <Unlink size={16} className="text-orange-500" />
            <span>Desvincular proyecto</span>
          </MenuButton>
        ) : !isProjectNode && (
          <MenuButton onClick={() => handleAction(() => onLinkToProject && onLinkToProject(nodeId))}>
            <FolderOpen size={16} className="text-emerald-500" />
            <span>Vincular a proyecto</span>
          </MenuButton>
        )}

        <div className="border-t border-gray-100 my-1" />
        
        <MenuButton onClick={() => handleAction(() => onDelete(nodeId))} danger>
          <Trash2 size={16} />
          <span>Eliminar nodo</span>
        </MenuButton>
      </div>
    </div>
  );
};

export default ContextMenu;

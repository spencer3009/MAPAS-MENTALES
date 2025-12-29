import React from 'react';
import { MousePointer2, Hand } from 'lucide-react';

const CanvasModePanel = ({ interactionMode, onSetInteractionMode }) => {
  return (
    <div className="absolute left-2 top-1/2 -translate-y-1/2 z-50">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-1.5 flex flex-col gap-1">
        {/* Modo Puntero */}
        <button
          onClick={() => onSetInteractionMode('pointer')}
          className={`
            p-2.5 rounded-lg transition-all duration-150
            flex items-center justify-center
            ${interactionMode === 'pointer'
              ? 'bg-blue-500 text-white shadow-md'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }
          `}
          title="Modo Puntero: Seleccionar nodos y hacer selección múltiple"
        >
          <MousePointer2 size={20} />
        </button>
        
        {/* Modo Mano */}
        <button
          onClick={() => onSetInteractionMode('hand')}
          className={`
            p-2.5 rounded-lg transition-all duration-150
            flex items-center justify-center
            ${interactionMode === 'hand'
              ? 'bg-blue-500 text-white shadow-md'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }
          `}
          title="Modo Mano: Mover el lienzo arrastrando"
        >
          <Hand size={20} />
        </button>
      </div>
      
      {/* Indicador del modo actual */}
      <div className="mt-2 text-center">
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
          {interactionMode === 'pointer' ? 'Seleccionar' : 'Mover'}
        </span>
      </div>
    </div>
  );
};

export default CanvasModePanel;

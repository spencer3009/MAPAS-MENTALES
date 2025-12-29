import React from 'react';
import { AlertCircle, UserPlus, X } from 'lucide-react';

const DemoBanner = ({ onRegister, onClose }) => {
  return (
    <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white px-4 py-2.5 flex items-center justify-between shadow-lg z-[100] relative">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
          <AlertCircle size={16} />
          <span className="text-sm font-medium">Modo Demo</span>
        </div>
        <p className="text-sm text-white/90 hidden sm:block">
          Estás en modo demo. Los cambios no se guardarán.
        </p>
      </div>
      
      <div className="flex items-center gap-3">
        <button
          onClick={onRegister}
          className="flex items-center gap-2 px-4 py-1.5 bg-white text-orange-600 hover:bg-orange-50 rounded-full text-sm font-semibold transition-all hover:scale-105 shadow-md"
        >
          <UserPlus size={16} />
          <span className="hidden sm:inline">Guardar mi mapa y continuar</span>
          <span className="sm:hidden">Registrarme</span>
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

export default DemoBanner;

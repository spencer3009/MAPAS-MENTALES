import React, { useState } from 'react';
import { X, LayoutTemplate, Briefcase, GraduationCap, Lightbulb, Target } from 'lucide-react';

const TEMPLATES = [
  {
    id: 'business',
    name: 'Plan de Negocios',
    icon: Briefcase,
    color: 'blue',
    nodes: [
      { id: 'root', text: 'Plan de Negocios', x: 200, y: 280, color: 'blue', parentId: null },
      { id: '1', text: 'Producto', x: 480, y: 80, color: 'green', parentId: 'root' },
      { id: '2', text: 'Marketing', x: 480, y: 180, color: 'pink', parentId: 'root' },
      { id: '3', text: 'Finanzas', x: 480, y: 280, color: 'yellow', parentId: 'root' },
      { id: '4', text: 'Equipo', x: 480, y: 380, color: 'green', parentId: 'root' },
      { id: '5', text: 'Operaciones', x: 480, y: 480, color: 'blue', parentId: 'root' },
    ]
  },
  {
    id: 'study',
    name: 'Plan de Estudio',
    icon: GraduationCap,
    color: 'green',
    nodes: [
      { id: 'root', text: 'Tema Principal', x: 200, y: 280, color: 'green', parentId: null },
      { id: '1', text: 'Conceptos Clave', x: 480, y: 120, color: 'blue', parentId: 'root' },
      { id: '2', text: 'Ejemplos', x: 480, y: 220, color: 'yellow', parentId: 'root' },
      { id: '3', text: 'Práctica', x: 480, y: 320, color: 'pink', parentId: 'root' },
      { id: '4', text: 'Recursos', x: 480, y: 420, color: 'green', parentId: 'root' },
    ]
  },
  {
    id: 'brainstorm',
    name: 'Lluvia de Ideas',
    icon: Lightbulb,
    color: 'yellow',
    nodes: [
      { id: 'root', text: 'Idea Central', x: 200, y: 280, color: 'yellow', parentId: null },
      { id: '1', text: 'Idea 1', x: 480, y: 120, color: 'pink', parentId: 'root' },
      { id: '2', text: 'Idea 2', x: 480, y: 220, color: 'blue', parentId: 'root' },
      { id: '3', text: 'Idea 3', x: 480, y: 320, color: 'green', parentId: 'root' },
      { id: '4', text: 'Idea 4', x: 480, y: 420, color: 'yellow', parentId: 'root' },
    ]
  },
  {
    id: 'goals',
    name: 'Objetivos',
    icon: Target,
    color: 'pink',
    nodes: [
      { id: 'root', text: 'Mi Meta', x: 200, y: 280, color: 'pink', parentId: null },
      { id: '1', text: 'Paso 1', x: 480, y: 150, color: 'blue', parentId: 'root' },
      { id: '2', text: 'Paso 2', x: 480, y: 280, color: 'green', parentId: 'root' },
      { id: '3', text: 'Paso 3', x: 480, y: 410, color: 'yellow', parentId: 'root' },
    ]
  },
];

const colorClasses = {
  blue: 'bg-blue-100 text-blue-600 border-blue-200',
  green: 'bg-emerald-100 text-emerald-600 border-emerald-200',
  yellow: 'bg-amber-100 text-amber-600 border-amber-200',
  pink: 'bg-rose-100 text-rose-600 border-rose-200',
};

const TemplateModal = ({ isOpen, onClose, onSelectTemplate }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (selectedTemplate) {
      try {
        const template = TEMPLATES.find(t => t.id === selectedTemplate);
        if (template) {
          console.log('Cargando template:', template.name);
          onSelectTemplate(template.nodes, template.name);
          onClose();
        }
      } catch (error) {
        console.error('Error al cargar template:', error);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <LayoutTemplate className="text-blue-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Seleccionar Template</h2>
              <p className="text-xs text-gray-500">Elige una plantilla para comenzar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Body - Grid de templates */}
        <div className="p-5">
          <div className="grid grid-cols-2 gap-4">
            {TEMPLATES.map((template) => {
              const Icon = template.icon;
              const isSelected = selectedTemplate === template.id;
              
              return (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`
                    p-4 rounded-xl border-2 text-left transition-all
                    ${isSelected 
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${colorClasses[template.color]}`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm">{template.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {template.nodes.length} nodos
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 pt-0">
          <button
            onClick={onClose}
            className="
              flex-1 py-2.5 px-4 rounded-xl
              bg-gray-100 hover:bg-gray-200
              text-gray-700 font-medium
              transition-colors
            "
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedTemplate}
            className={`
              flex-1 py-2.5 px-4 rounded-xl
              font-medium transition-colors
              ${selectedTemplate 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            Usar Template
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateModal;

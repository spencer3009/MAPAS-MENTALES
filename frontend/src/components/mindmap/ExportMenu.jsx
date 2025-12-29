import React, { useState, useRef, useEffect } from 'react';
import { Download, FileImage, FileText, File, ChevronDown, Loader2, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, ImageRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

const ExportMenu = ({ canvasRef, projectName = 'Mapa Mental' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const menuRef = useRef(null);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Cerrar mensaje de error después de 5 segundos
  useEffect(() => {
    if (exportError) {
      const timer = setTimeout(() => setExportError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [exportError]);

  // Función para capturar el canvas como imagen
  const captureCanvas = async () => {
    // Buscar el contenedor del canvas
    const canvasContainer = document.querySelector('.from-slate-50, .bg-slate-50');
    if (!canvasContainer) {
      throw new Error('No se encontró el área del mapa');
    }

    // Capturar con html2canvas
    const canvas = await html2canvas(canvasContainer, {
      backgroundColor: '#f8fafc',
      scale: 2, // Mayor calidad
      logging: false,
      useCORS: true,
      allowTaint: true
    });

    return canvas;
  };

  // Exportar como JPG
  const handleExportJPG = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const canvas = await captureCanvas();
      
      // Convertir a JPG
      const jpgUrl = canvas.toDataURL('image/jpeg', 0.95);
      
      // Descargar
      const link = document.createElement('a');
      link.download = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
      link.href = jpgUrl;
      link.click();

      setIsOpen(false);
    } catch (error) {
      console.error('Error exportando JPG:', error);
      setExportError('No se pudo exportar la imagen. Intenta de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

  // Exportar como PDF
  const handleExportPDF = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const canvas = await captureCanvas();
      
      // Obtener dimensiones
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // Crear PDF con orientación apropiada
      const orientation = imgWidth > imgHeight ? 'l' : 'p';
      const pdf = new jsPDF({
        orientation,
        unit: 'px',
        format: [imgWidth / 2, imgHeight / 2]
      });

      // Agregar imagen al PDF
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth / 2, imgHeight / 2);
      
      // Descargar
      pdf.save(`${projectName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);

      setIsOpen(false);
    } catch (error) {
      console.error('Error exportando PDF:', error);
      setExportError('No se pudo generar el PDF. Intenta de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

  // Exportar como Word (DOCX)
  const handleExportWord = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const canvas = await captureCanvas();
      
      // Convertir canvas a blob
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png', 0.95);
      });
      
      // Leer blob como ArrayBuffer
      const arrayBuffer = await blob.arrayBuffer();
      
      // Calcular dimensiones para el documento (máximo 600px de ancho)
      const maxWidth = 600;
      const scale = maxWidth / canvas.width;
      const imgWidth = Math.round(canvas.width * scale);
      const imgHeight = Math.round(canvas.height * scale);

      // Crear documento Word
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [
                new ImageRun({
                  data: arrayBuffer,
                  transformation: {
                    width: imgWidth,
                    height: imgHeight
                  },
                  type: 'png'
                })
              ],
              alignment: AlignmentType.CENTER
            }),
            new Paragraph({
              text: "",
              spacing: { after: 200 }
            }),
            new Paragraph({
              text: projectName,
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER
            }),
            new Paragraph({
              text: `Exportado el ${new Date().toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}`,
              alignment: AlignmentType.CENTER,
              spacing: { before: 200 }
            })
          ]
        }]
      });

      // Generar y descargar
      const docBlob = await Packer.toBlob(doc);
      saveAs(docBlob, `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}.docx`);

      setIsOpen(false);
    } catch (error) {
      console.error('Error exportando Word:', error);
      setExportError('No se pudo generar el documento Word. Intenta de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportOptions = [
    {
      id: 'jpg',
      label: 'Exportar JPG',
      description: 'Imagen de alta calidad',
      icon: <FileImage size={18} />,
      onClick: handleExportJPG
    },
    {
      id: 'pdf',
      label: 'Exportar PDF',
      description: 'Documento portable',
      icon: <FileText size={18} />,
      onClick: handleExportPDF
    },
    {
      id: 'docx',
      label: 'Exportar Word',
      description: 'Documento editable',
      icon: <File size={18} />,
      onClick: handleExportWord
    }
  ];

  return (
    <div ref={menuRef} className="relative">
      {/* Botón principal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg
          text-sm font-medium transition-all duration-150
          ${isOpen 
            ? 'bg-blue-100 text-blue-700' 
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {isExporting ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Download size={18} />
        )}
        <span className="hidden md:inline">Exportar</span>
        <ChevronDown 
          size={14} 
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Menú desplegable */}
      {isOpen && (
        <div className="
          absolute right-0 top-full mt-2
          bg-white rounded-xl shadow-xl border border-gray-200
          py-2 min-w-[220px]
          z-50
          animate-in fade-in slide-in-from-top-2 duration-200
        ">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Formato de exportación
            </p>
          </div>
          
          {exportOptions.map((option) => (
            <button
              key={option.id}
              onClick={option.onClick}
              disabled={isExporting}
              className="
                w-full flex items-start gap-3 px-3 py-2.5
                hover:bg-gray-50 transition-colors
                text-left
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              <span className="text-gray-500 mt-0.5">{option.icon}</span>
              <div>
                <p className="text-sm font-medium text-gray-800">{option.label}</p>
                <p className="text-xs text-gray-500">{option.description}</p>
              </div>
            </button>
          ))}

          {/* Separador para futuros formatos */}
          <div className="border-t border-gray-100 mt-2 pt-2 px-3">
            <p className="text-[10px] text-gray-400 text-center">
              Más formatos próximamente
            </p>
          </div>
        </div>
      )}

      {/* Toast de error */}
      {exportError && (
        <div className="
          fixed bottom-4 right-4 z-[9999]
          bg-red-50 border border-red-200 text-red-800
          px-4 py-3 rounded-lg shadow-lg
          flex items-center gap-3
          animate-in slide-in-from-bottom-4 duration-300
        ">
          <span className="text-sm">{exportError}</span>
          <button 
            onClick={() => setExportError(null)}
            className="text-red-500 hover:text-red-700"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportMenu;

'use client';

import React from 'react';
import jsPDF from 'jspdf';
import { Download } from 'lucide-react';
import Button from '@/components/Button';

// These types should ideally be in a shared types file
interface ProjectPhase {
  fase: number;
  titulo_fase: string;
  descripcion: string;
}

interface ProjectLevel {
  nivel_escolar: string;
  titulo_adaptado: string;
  pregunta_esencial_adaptada: string;
  producto_final_adaptado: string;
  objetivos_adaptados: string[];
  fases_adaptadas: ProjectPhase[];
  metodo_evaluacion_adaptado: string;
  pregunta_al_docente_adaptada: string;
}

interface DownloadPDFButtonProps {
  projectData: ProjectLevel | null;
  className?: string;
}

const DownloadPDFButton: React.FC<DownloadPDFButtonProps> = ({ projectData, className }) => {
  const handleDownloadPDF = () => {
    if (!projectData) {
      console.error('No project data available to generate PDF.');
      return;
    }

    try {
      const doc = new jsPDF();
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      const margin = 15;
      let y = margin;

      const sanitizeText = (text: string): string => {
        if (typeof text !== 'string') {
          console.warn('Sanitizing non-string value:', text);
          text = String(text);
        }
        return text
          .replace(/[áäâà]/g, 'a').replace(/[ÁÄÂÀ]/g, 'A')
          .replace(/[éëêè]/g, 'e').replace(/[ÉËÊÈ]/g, 'E')
          .replace(/[íïîì]/g, 'i').replace(/[ÍÏÎÌ]/g, 'I')
          .replace(/[óöôò]/g, 'o').replace(/[ÓÖÔÒ]/g, 'O')
          .replace(/[úüûù]/g, 'u').replace(/[ÚÜÛÙ]/g, 'U')
          .replace(/[ñ]/g, 'n').replace(/[Ñ]/g, 'N');
      };

      const addTextWithWrap = (text: string, x: number, startY: number, options: any = {}) => {
        const sanitizedText = sanitizeText(text);
        const splitText = doc.splitTextToSize(sanitizedText, pageWidth - margin * 2);
        const textHeight = doc.getTextDimensions(splitText).h;
        if (startY + textHeight > pageHeight - margin) {
          doc.addPage();
          startY = margin;
        }
        doc.text(splitText, x, startY, options);
        return startY + textHeight;
      };

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      y = addTextWithWrap(projectData.titulo_adaptado, pageWidth / 2, y, { align: 'center' });
      y += 15;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      y = addTextWithWrap('Pregunta Esencial', margin, y);
      y += 2;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      y = addTextWithWrap(projectData.pregunta_esencial_adaptada, margin, y);
      y += 10;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      y = addTextWithWrap('Objetivos de Aprendizaje', margin, y);
      y += 2;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      projectData.objetivos_adaptados.forEach(obj => {
        y = addTextWithWrap(`• ${obj}`, margin + 5, y);
        y += 2;
      });
      y += 8;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      y = addTextWithWrap('Producto Final a Crear', margin, y);
      y += 2;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      y = addTextWithWrap(projectData.producto_final_adaptado, margin, y);
      y += 10;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      y = addTextWithWrap('Evaluación', margin, y);
      y += 2;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      y = addTextWithWrap(projectData.metodo_evaluacion_adaptado, margin, y);
      y += 10;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      y = addTextWithWrap('Fases del Proyecto', margin, y);
      y += 5;
      projectData.fases_adaptadas.sort((a, b) => a.fase - b.fase).forEach(phase => {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        y = addTextWithWrap(`Fase ${phase.fase}: ${phase.titulo_fase}`, margin, y);
        y += 2;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        y = addTextWithWrap(phase.descripcion, margin + 5, y);
        y += 10;
      });

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      y = addTextWithWrap('Teacher Corner', margin, y);
      y += 2;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'italic');
      addTextWithWrap(projectData.pregunta_al_docente_adaptada, margin, y);

      const filename = sanitizeText(projectData.titulo_adaptado).replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.pdf';
      doc.save(filename);

    } catch (error) {
      console.error('Failed to generate or save PDF:', error);
      alert('Ocurrió un error al generar el PDF. Por favor, revisa la consola para más detalles.');
    }
  };

  return (
    <Button onClick={handleDownloadPDF} variant="outline" className={className} disabled={!projectData}>
      <Download className="mr-2 h-4 w-4" />
      Descargar PDF
    </Button>
  );
};

export default DownloadPDFButton;

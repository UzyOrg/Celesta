'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Loader2, BookOpen } from 'lucide-react';
import { unassignWorkshopAction } from '../../[groupId]/actions';
import RemoveWorkshopModal from '@/components/grupos/RemoveWorkshopModal';

interface Workshop {
  id: string;
  taller_id: string;
  position: number;
  talleres: {
    id: string;
    nombre: string;
    descripcion: string | null;
    etiquetas: string[];
  };
}

interface WorkshopListProps {
  workshops: Workshop[];
  groupId: string;
  onWorkshopRemoved?: (tallerId: string) => void;
}

export default function WorkshopList({ workshops, groupId, onWorkshopRemoved }: WorkshopListProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [workshopToRemove, setWorkshopToRemove] = useState<Workshop | null>(null);

  const handleConfirmRemove = async () => {
    if (!workshopToRemove) return;
    
    const tallerId = workshopToRemove.taller_id;
    setRemovingId(tallerId);
    setWorkshopToRemove(null);
    
    try {
      const result = await unassignWorkshopAction(groupId, tallerId);
      if (result.success) {
        await onWorkshopRemoved?.(tallerId);
      }
    } catch (error) {
      console.error('Error removing workshop:', error);
    } finally {
      setRemovingId(null);
    }
  };

  if (workshops.length === 0) {
    return (
      <div className="text-center py-12 bg-neutral-900/30 rounded-xl border border-neutral-800 border-dashed">
        <BookOpen className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
        <p className="text-neutral-400 text-sm">
          No hay talleres asignados a este grupo
        </p>
        <p className="text-neutral-500 text-xs mt-1">
          Usa el botón &quot;Añadir Taller&quot; para comenzar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {workshops.map((workshop, index) => (
        <motion.div
          key={workshop.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 transition-all"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-crystal-blue/20 text-crystal-blue text-xs font-bold">
                  {index + 1}
                </span>
                <h3 className="font-semibold text-white truncate">
                  {workshop.talleres.nombre}
                </h3>
              </div>
              
              {workshop.talleres.descripcion && (
                <p className="text-sm text-neutral-400 mb-2 line-clamp-2">
                  {workshop.talleres.descripcion}
                </p>
              )}
              
              {workshop.talleres.etiquetas?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {workshop.talleres.etiquetas.slice(0, 3).map((tag, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 bg-neutral-800 text-neutral-400 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setWorkshopToRemove(workshop)}
              disabled={removingId === workshop.taller_id}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-red-900/20 hover:bg-red-900/30 text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Remover taller"
            >
              {removingId === workshop.taller_id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </motion.div>
      ))}
      
      <RemoveWorkshopModal
        isOpen={!!workshopToRemove}
        onClose={() => setWorkshopToRemove(null)}
        onConfirm={handleConfirmRemove}
        workshopName={workshopToRemove?.talleres.nombre ?? ''}
      />
    </div>
  );
}

'use client';

// ============================================================================
// MODAL: Asignar Talleres a Grupo
// ============================================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Plus, Loader2, CheckCircle2 } from 'lucide-react';
import { assignWorkshopsAction } from '@/app/(dashboard)/grupos/[groupId]/actions';
import type { TallerWithStats } from '@/types/biblioteca';

interface AssignWorkshopsModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  assignedTallerIds: string[]; // IDs de talleres ya asignados
  onSuccess?: () => void;
}

export default function AssignWorkshopsModal({
  isOpen,
  onClose,
  groupId,
  assignedTallerIds,
  onSuccess,
}: AssignWorkshopsModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [library, setLibrary] = useState<TallerWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch biblioteca del docente
  useEffect(() => {
    if (!isOpen) return;

    const fetchLibrary = async () => {
      setIsFetching(true);
      try {
        const res = await fetch(`/api/library?q=${encodeURIComponent(searchQuery)}`);
        if (!res.ok) throw new Error('Error al cargar biblioteca');
        
        const data = await res.json();
        setLibrary(data.items || []);
      } catch (err) {
        console.error('[AssignWorkshopsModal] Error fetching library:', err);
        setError('Error al cargar talleres');
      } finally {
        setIsFetching(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(fetchLibrary, 300);
    return () => clearTimeout(timeoutId);
  }, [isOpen, searchQuery]);

  // Filtrar talleres disponibles (excluir ya asignados)
  const availableTalleres = useMemo(() => {
    return library.filter(t => !assignedTallerIds.includes(t.id));
  }, [library, assignedTallerIds]);

  // Toggle selección
  const toggleSelect = useCallback((tallerId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(tallerId)) {
        next.delete(tallerId);
      } else {
        next.add(tallerId);
      }
      return next;
    });
  }, []);

  // Seleccionar todos
  const selectAll = useCallback(() => {
    setSelected(new Set(availableTalleres.map(t => t.id)));
  }, [availableTalleres]);

  // Limpiar selección
  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  // Manejar asignación
  const handleAssign = async () => {
    if (selected.size === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await assignWorkshopsAction(groupId, Array.from(selected));
      
      if (!result.success) {
        throw new Error(result.error || 'Error al asignar talleres');
      }

      // Éxito
      onSuccess?.();
      handleClose();
    } catch (err: any) {
      console.error('[AssignWorkshopsModal] Error:', err);
      setError(err.message || 'Error al asignar talleres');
    } finally {
      setIsLoading(false);
    }
  };

  // Cerrar y resetear
  const handleClose = () => {
    setSearchQuery('');
    setSelected(new Set());
    setError(null);
    onClose();
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="bg-neutral-900 rounded-2xl border border-neutral-800 max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Añadir Talleres al Grupo</h2>
                <p className="text-sm text-neutral-400 mt-1">
                  Selecciona talleres de tu biblioteca personal
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-neutral-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-neutral-800"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="p-6 border-b border-neutral-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Buscar talleres por nombre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-crystal-blue transition-all"
                  autoFocus
                />
              </div>

              {/* Quick actions */}
              {availableTalleres.length > 0 && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={selectAll}
                    className="text-xs text-crystal-blue hover:text-crystal-blue/80 transition-colors"
                  >
                    Seleccionar todos
                  </button>
                  {selected.size > 0 && (
                    <>
                      <span className="text-neutral-600">•</span>
                      <button
                        onClick={clearSelection}
                        className="text-xs text-neutral-400 hover:text-white transition-colors"
                      >
                        Limpiar selección
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {isFetching ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-crystal-blue animate-spin" />
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-red-400">{error}</p>
                </div>
              ) : availableTalleres.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-neutral-400">
                    {searchQuery
                      ? 'No se encontraron talleres'
                      : 'No hay talleres disponibles en tu biblioteca'}
                  </p>
                </div>
              ) : (
                availableTalleres.map((taller) => {
                  const isSelected = selected.has(taller.id);
                  
                  return (
                    <motion.label
                      key={taller.id}
                      className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-crystal-blue bg-crystal-blue/10'
                          : 'border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/50'
                      }`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="flex items-center h-6">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(taller.id)}
                          className="w-5 h-5 rounded border-neutral-600 text-crystal-blue focus:ring-crystal-blue focus:ring-offset-0"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{taller.nombre}</p>
                        {taller.descripcion && (
                          <p className="text-sm text-neutral-400 mt-1 line-clamp-2">
                            {taller.descripcion}
                          </p>
                        )}
                        {taller.etiquetas && taller.etiquetas.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {taller.etiquetas.slice(0, 3).map((tag, i) => (
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

                      {taller.grupos_count > 0 && (
                        <div className="text-xs text-neutral-500 whitespace-nowrap">
                          {taller.grupos_count} grupo{taller.grupos_count !== 1 ? 's' : ''}
                        </div>
                      )}
                    </motion.label>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-neutral-800 flex gap-3">
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-white rounded-xl transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleAssign}
                disabled={isLoading || selected.size === 0}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-turquoise to-lime text-black font-bold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Asignando...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    <span>
                      Añadir {selected.size} taller{selected.size !== 1 ? 'es' : ''}
                    </span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

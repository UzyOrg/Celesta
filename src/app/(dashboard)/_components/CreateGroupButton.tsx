'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Loader2 } from 'lucide-react';
import { createEmptyGroup } from '../actions';

export default function CreateGroupButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!groupName.trim()) {
      setError('El nombre del grupo es requerido');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await createEmptyGroup(groupName.trim());
      
      // Si hay error, mostrarlo
      if (result && !result.success) {
        setError(result.error || 'Error al crear grupo');
        setIsLoading(false);
      }
      // Si no hay resultado, significa que redirect() se ejecutó correctamente
      // El componente se desmontará por la navegación
    } catch (err: any) {
      // redirect() lanza un error NEXT_REDIRECT que es normal
      // Solo capturamos otros errores
      if (err.message && !err.message.includes('NEXT_REDIRECT')) {
        console.error('[CreateGroupButton] Error:', err);
        setError(err.message || 'Error al crear grupo');
        setIsLoading(false);
      }
      // Si es NEXT_REDIRECT, dejamos que se propague
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setIsOpen(false);
      setGroupName('');
      setError(null);
    }
  };

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-turquoise to-lime text-black font-bold rounded-xl hover:opacity-90 transition-all shadow-lg"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Plus className="w-5 h-5" />
        <span>Crear Nuevo Grupo</span>
      </motion.button>

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
              className="bg-neutral-900 rounded-2xl border border-neutral-800 max-w-md w-full shadow-2xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Crear Nuevo Grupo</h2>
                  <p className="text-sm text-neutral-400 mt-1">
                    Ingresa un nombre para tu grupo
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isLoading}
                  className="text-neutral-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-neutral-800 disabled:opacity-50"
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6">
                <div className="mb-4">
                  <label htmlFor="groupName" className="block text-sm font-medium text-neutral-300 mb-2">
                    Nombre del Grupo
                  </label>
                  <input
                    id="groupName"
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Ej: Biología 3A"
                    disabled={isLoading}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-crystal-blue transition-all disabled:opacity-50"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isLoading}
                    className="flex-1 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-white rounded-xl transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !groupName.trim()}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-turquoise to-lime text-black font-bold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Creando...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        <span>Crear Grupo</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

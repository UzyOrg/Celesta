'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';

interface RemoveWorkshopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  workshopName: string;
}

export default function RemoveWorkshopModal({
  isOpen,
  onClose,
  onConfirm,
  workshopName,
}: RemoveWorkshopModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
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
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-900/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Remover Taller</h2>
              </div>
              <button
                onClick={onClose}
                className="text-neutral-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-neutral-800"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-neutral-300 mb-2">
                ¿Estás seguro de que deseas remover este taller del grupo?
              </p>
              <p className="text-sm text-neutral-400 bg-neutral-800/50 rounded-lg p-3 border border-neutral-700">
                <strong className="text-white">{workshopName}</strong>
              </p>
              <p className="text-xs text-neutral-500 mt-3">
                Los estudiantes ya no podrán acceder a este taller. Esta acción no se puede deshacer.
              </p>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-neutral-800 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors font-medium"
              >
                Sí, remover
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

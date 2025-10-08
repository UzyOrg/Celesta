"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Star, Trophy, Clock } from 'lucide-react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  workshopTitle: string;
  completedAt?: string;
  finalStars?: number;
};

export default function CompletedMissionModal({ 
  isOpen, 
  onClose, 
  workshopTitle,
  completedAt,
  finalStars = 0
}: Props) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 max-w-lg w-full"
          >
            <div className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 rounded-2xl p-8 shadow-2xl border border-neutral-700/50 overflow-hidden">
              
              {/* Efecto de fondo */}
              <div className="absolute inset-0 bg-gradient-to-br from-lime/5 via-transparent to-turquoise/5 opacity-50" />
              
              {/* Botón de cerrar */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-20 p-2 rounded-lg bg-neutral-800/50 hover:bg-neutral-700/50 transition-colors"
              >
                <X className="w-5 h-5 text-neutral-400" />
              </button>

              {/* Contenido */}
              <div className="relative z-10 space-y-6 text-center">
                
                {/* Icono de completado */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
                  className="flex justify-center"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-lime/20 rounded-full blur-xl" />
                    <div className="relative z-10 bg-neutral-800/80 rounded-full p-4 border-2 border-lime/30">
                      <CheckCircle2 className="w-12 h-12 text-lime" strokeWidth={2} />
                    </div>
                  </div>
                </motion.div>

                {/* Título */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-2"
                >
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-lime via-turquoise to-lime bg-clip-text text-transparent">
                    ¡Misión Completada!
                  </h2>
                  <p className="text-lg text-neutral-300">
                    <span className="font-semibold text-neutral-100">{workshopTitle}</span>
                  </p>
                </motion.div>

                {/* Información de logro */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-neutral-800/50 backdrop-blur-sm rounded-xl p-5 border border-neutral-700/50"
                >
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <span className="text-base font-semibold text-neutral-200">Tu Logro</span>
                  </div>
                  
                  {finalStars > 0 && (
                    <div className="flex items-center justify-center gap-1 mb-3">
                      {[...Array(3)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-6 h-6 ${i < finalStars ? 'text-amber-400 fill-amber-400' : 'text-neutral-600'}`}
                        />
                      ))}
                    </div>
                  )}
                  
                  {completedAt && (
                    <div className="flex items-center justify-center gap-2 text-sm text-neutral-400">
                      <Clock className="w-4 h-4" />
                      <span>
                        {new Date(completedAt).toLocaleDateString('es-ES', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                  )}
                </motion.div>

                {/* Mensaje */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-sm text-neutral-400"
                >
                  Has completado exitosamente este taller. ¡Sigue explorando más misiones!
                </motion.p>

                {/* Botón */}
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  onClick={onClose}
                  className="w-full px-6 py-3 bg-gradient-to-r from-turquoise to-lime text-black font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                  Continuar Explorando
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

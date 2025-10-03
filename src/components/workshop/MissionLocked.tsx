"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Star, Trophy, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Props = {
  workshopTitle: string;
  workshopId: string;
  completedAt?: string;
  finalStars?: number;
};

export default function MissionLocked({ 
  workshopTitle, 
  workshopId,
  completedAt,
  finalStars = 0
}: Props) {
  const router = useRouter();

  return (
    <div className="min-h-[600px] flex items-center justify-center p-6">
      <motion.div
        className="max-w-2xl w-full"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="relative bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 rounded-3xl p-12 shadow-2xl border border-neutral-700/50 overflow-hidden">
          
          {/* Efecto de fondo */}
          <div className="absolute inset-0 bg-gradient-to-br from-turquoise/5 via-transparent to-amber/5 opacity-50" />
          
          {/* Contenido */}
          <div className="relative z-10 space-y-8 text-center">
            
            {/* Icono de completado con candado */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
              className="flex justify-center"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-lime/20 rounded-full blur-2xl scale-150" />
                <div className="relative z-10 bg-neutral-800/80 rounded-full p-6 border-2 border-lime/30">
                  <CheckCircle2 className="w-16 h-16 text-lime" strokeWidth={2} />
                  <div className="absolute -bottom-2 -right-2 bg-amber-500 rounded-full p-2">
                    <Lock className="w-4 h-4 text-black" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Título */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-3"
            >
              <h1 className="text-4xl font-bold bg-gradient-to-r from-lime via-turquoise to-lime bg-clip-text text-transparent">
                Misión Ya Completada
              </h1>
              <p className="text-xl text-neutral-300">
                Ya terminaste <span className="font-semibold text-neutral-100">"{workshopTitle}"</span>
              </p>
            </motion.div>

            {/* Información de completado */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-neutral-800/50 backdrop-blur-sm rounded-xl p-6 border border-neutral-700/50"
            >
              <div className="flex items-center justify-center gap-3 mb-3">
                <Trophy className="w-6 h-6 text-amber-400" />
                <span className="text-lg font-semibold text-neutral-200">Tu Logro</span>
              </div>
              
              {finalStars > 0 && (
                <div className="flex items-center justify-center gap-1 mb-2">
                  {[...Array(3)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-6 h-6 ${i < finalStars ? 'text-amber-400 fill-amber-400' : 'text-neutral-600'}`}
                    />
                  ))}
                </div>
              )}
              
              <p className="text-sm text-neutral-400">
                {completedAt 
                  ? `Completada el ${new Date(completedAt).toLocaleDateString('es-ES', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}`
                  : 'Completada anteriormente'}
              </p>
            </motion.div>

            {/* Mensaje informativo */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="space-y-4"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-800/50 border border-neutral-700/50 text-neutral-300 text-sm">
                <Lock className="w-4 h-4" />
                <span>Esta misión no puede repetirse</span>
              </div>
              
              <p className="text-sm text-neutral-500 max-w-md mx-auto">
                Has completado exitosamente este taller. Explora otras misiones disponibles para continuar tu aprendizaje.
              </p>
            </motion.div>

            {/* Botón de retorno */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="pt-4"
            >
              <button
                onClick={() => router.push('/missions')}
                className="px-8 py-3 bg-gradient-to-r from-turquoise to-lime text-black font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                Ver Todas las Misiones
              </button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

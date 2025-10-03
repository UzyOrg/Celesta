"use client";
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Star, Trophy, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Props = {
  workshopTitle: string;
  workshopId?: string; // ID del workshop (ej: BIO-001)
  totalSteps: number;
  completedSteps: number;
  finalStars: number;
  maxStars: number;
  autoRedirect?: boolean;
  redirectDelay?: number;
};

export default function MissionComplete({ 
  workshopTitle, 
  workshopId,
  totalSteps, 
  completedSteps, 
  finalStars, 
  maxStars,
  autoRedirect = true,
  redirectDelay = 4000 
}: Props) {
  const router = useRouter();

  // Guardar estado de completado en localStorage
  useEffect(() => {
    if (workshopId) {
      localStorage.setItem(`workshop_${workshopId}_completed`, 'true');
      localStorage.setItem(`workshop_${workshopId}_stars`, String(finalStars));
      localStorage.setItem(`workshop_${workshopId}_completedAt`, new Date().toISOString());
    }
  }, [workshopId, finalStars]);

  useEffect(() => {
    if (autoRedirect) {
      const timer = setTimeout(() => {
        router.push('/missions');
      }, redirectDelay);
      
      return () => clearTimeout(timer);
    }
  }, [autoRedirect, redirectDelay, router]);

  const completionPercentage = Math.round((completedSteps / totalSteps) * 100);
  const starPercentage = Math.round((finalStars / maxStars) * 100);

  return (
    <div className="min-h-[600px] flex items-center justify-center p-6">
      <motion.div
        className="max-w-2xl w-full"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Contenedor principal */}
        <div className="relative bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 rounded-3xl p-12 shadow-2xl border border-neutral-700/50 overflow-hidden">
          
          {/* Efecto de fondo animado */}
          <div className="absolute inset-0 bg-gradient-to-br from-turquoise/5 via-transparent to-lime/5 opacity-50" />
          
          {/* Confetti particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: i % 3 === 0 ? '#14b8a6' : i % 3 === 1 ? '#84cc16' : '#fbbf24',
                  left: `${Math.random() * 100}%`,
                  top: '-10%',
                }}
                animate={{
                  y: ['0vh', '110vh'],
                  x: [0, (Math.random() - 0.5) * 100],
                  rotate: [0, 360],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  delay: Math.random() * 0.5,
                  repeat: 0,
                }}
              />
            ))}
          </div>

          {/* Contenido */}
          <div className="relative z-10 space-y-8 text-center">
            
            {/* Icono de éxito */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
              className="flex justify-center"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-turquoise/20 rounded-full blur-2xl scale-150" />
                <CheckCircle2 className="w-24 h-24 text-turquoise relative z-10" strokeWidth={2} />
              </div>
            </motion.div>

            {/* Título */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-3"
            >
              <h1 className="text-4xl font-bold bg-gradient-to-r from-turquoise via-lime to-turquoise bg-clip-text text-transparent">
                ¡Misión Completada!
              </h1>
              <p className="text-xl text-neutral-300">
                Has terminado <span className="font-semibold text-neutral-100">"{workshopTitle}"</span>
              </p>
            </motion.div>

            {/* Estadísticas */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-2 gap-4 max-w-md mx-auto"
            >
              {/* Pasos completados */}
              <div className="bg-neutral-800/50 backdrop-blur-sm rounded-xl p-4 border border-neutral-700/50">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Trophy className="w-5 h-5 text-lime" />
                  <span className="text-sm text-neutral-400">Progreso</span>
                </div>
                <div className="text-3xl font-bold text-neutral-100">
                  {completedSteps}/{totalSteps}
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  {completionPercentage}% completado
                </div>
              </div>

              {/* Autonomía final - PROMINENTE */}
              <div className="bg-gradient-to-br from-amber-900/20 via-neutral-800/50 to-neutral-800/50 backdrop-blur-sm rounded-xl p-5 border-2 border-amber-500/30 shadow-lg shadow-amber-500/10">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
                  <span className="text-sm font-semibold text-amber-200">Tu Viaje de Esfuerzo</span>
                </div>
                <div className="flex items-center justify-center gap-1 text-4xl font-extrabold text-amber-300 mb-2">
                  {finalStars}
                  <span className="text-xl text-amber-500/70">/ {maxStars}</span>
                </div>
                <div className="flex items-center justify-center gap-1 mb-2">
                  {[...Array(maxStars)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${i < finalStars ? 'text-amber-400 fill-amber-400' : 'text-neutral-600'}`}
                    />
                  ))}
                </div>
                <p className="text-xs text-center text-amber-200/70">
                  {finalStars === maxStars 
                    ? '¡No necesitaste ayuda!' 
                    : finalStars > 0
                      ? 'Completaste con autonomía'
                      : 'Usaste todos los recursos disponibles'}
                </p>
              </div>
            </motion.div>

            {/* Mensaje motivacional */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="space-y-2"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-lime/10 border border-lime/30 text-lime text-sm font-medium">
                <TrendingUp className="w-4 h-4" />
                <span>
                  {starPercentage === 100 
                    ? '¡Autonomía perfecta!' 
                    : starPercentage >= 66 
                      ? '¡Excelente trabajo!' 
                      : '¡Sigue aprendiendo!'}
                </span>
              </div>
            </motion.div>

            {/* Redirección */}
            {autoRedirect && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-sm text-neutral-500"
              >
                Redirigiendo a misiones en {Math.ceil(redirectDelay / 1000)} segundos...
              </motion.p>
            )}
          </div>
        </div>

        {/* Botón manual (por si auto-redirect está deshabilitado) */}
        {!autoRedirect && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-6 flex justify-center"
          >
            <button
              onClick={() => router.push('/missions')}
              className="px-8 py-3 bg-gradient-to-r from-turquoise to-lime text-black font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              Ver Todas las Misiones
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

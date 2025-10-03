"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, TrendingUp } from 'lucide-react';

type Props = {
  totalSteps: number;
  completedSteps: number;
  starsLeft: number; // 0..3
};

export default function MissionProgress({ totalSteps, completedSteps, starsLeft }: Props) {
  const pct = totalSteps > 0 ? Math.min(100, Math.round((completedSteps / totalSteps) * 100)) : 0;
  
  return (
    <motion.div 
      className="flex flex-col gap-4 p-4 rounded-xl bg-gradient-to-br from-neutral-800/40 to-neutral-800/20 border border-neutral-700/50 backdrop-blur-sm"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
    >
      {/* Progreso */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-1.5 text-neutral-300 font-medium">
            <TrendingUp className="w-4 h-4" />
            <span>Progreso</span>
          </div>
          <span className="text-neutral-200 font-semibold">{completedSteps}/{totalSteps} · {pct}%</span>
        </div>
        <div className="relative w-full h-3 bg-neutral-800/60 rounded-full overflow-hidden shadow-inner">
          <motion.div 
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-lime to-turquoise rounded-full shadow-lg shadow-lime/30"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
          {/* Efecto de brillo animado */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{
              x: ['-100%', '200%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
              ease: 'easeInOut'
            }}
          />
        </div>
      </div>

      {/* Autonomía */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-300 font-medium">Autonomía</span>
        <div className="flex gap-1.5">
          <AnimatePresence mode="popLayout">
            {Array.from({ length: 3 }, (_, i) => (
              <motion.div
                key={i}
                layout
                initial={{ scale: 0, rotate: -180 }}
                animate={{ 
                  scale: i < starsLeft ? 1 : 0.7, 
                  rotate: 0,
                  opacity: i < starsLeft ? 1 : 0.3 
                }}
                exit={{ scale: 0, rotate: 180, opacity: 0 }}
                transition={{ 
                  type: 'spring', 
                  stiffness: 200, 
                  damping: 15,
                  delay: i * 0.05 
                }}
              >
                <Star 
                  className={`w-6 h-6 ${
                    i < starsLeft 
                      ? 'fill-yellow-400 text-yellow-400' 
                      : 'fill-neutral-700 text-neutral-700'
                  }`}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

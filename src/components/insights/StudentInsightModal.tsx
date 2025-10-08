'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  User, 
  Clock, 
  Calendar,
  Star,
  TrendingUp,
  Loader2,
  AlertCircle
} from 'lucide-react';
import StepCard from './StepCard';
import type { StudentInsightsResponse } from '@/types/student-insights';

interface StudentInsightModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentAlias: string;
  classToken: string;
}

/**
 * StudentInsightModal - Modal de pantalla completa
 * 
 * Muestra el "viaje de aprendizaje" completo de un estudiante:
 * - Header con métricas globales
 * - Lista de StepCards (una por cada paso completado)
 * - Tarjeta especial para reflexión final
 */
export default function StudentInsightModal({
  isOpen,
  onClose,
  studentAlias,
  classToken
}: StudentInsightModalProps) {
  const [data, setData] = useState<StudentInsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch student insights when modal opens
  useEffect(() => {
    if (!isOpen) return;

    async function fetchInsights() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/student/insights?class_token=${encodeURIComponent(classToken)}&student_alias=${encodeURIComponent(studentAlias)}`
        );

        if (!response.ok) {
          throw new Error('Error al cargar insights del estudiante');
        }

        const json = await response.json();
        setData(json);
      } catch (err) {
        setError((err as Error).message);
        console.error('[StudentInsightModal] Error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchInsights();
  }, [isOpen, classToken, studentAlias]);

  // Format time helper
  const formatTotalTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Detectar si el último evento es reflexión
  const lastEvent = data?.events?.[data.events.length - 1];
  const hasReflexion = lastEvent?.result?.reflexion_texto !== undefined;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 md:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl max-h-[95vh] md:max-h-[90vh] bg-neutral-950 border border-neutral-800/50 rounded-xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-neutral-950/95 backdrop-blur-xl border-b border-neutral-800/50">
              <div className="p-3 md:p-6">
                <div className="flex items-start justify-between mb-3 md:mb-4">
                  <div className="flex items-center gap-2 md:gap-4">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-crystal-blue/20 to-crystal-lavender/20 border border-crystal-blue/30 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 md:w-8 md:h-8 text-crystal-blue" />
                    </div>
                    <div>
                      <h2 className="text-base md:text-xl font-bold !text-white mb-0.5 md:mb-1">{studentAlias}</h2>
                      <p className="text-[10px] md:text-xs !text-neutral-400">Panel de Insights del Estudiante</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={onClose}
                    className="p-1.5 md:p-2 hover:bg-neutral-800/50 rounded-lg transition flex-shrink-0"
                  >
                    <X className="w-5 h-5 md:w-6 md:h-6 text-neutral-400 hover:text-white" />
                  </button>
                </div>

                {/* Global Metrics */}
                {!loading && data?.metrics && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                    {/* Autonomía Final */}
                    <div className="p-2.5 md:p-4 bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-lg md:rounded-xl">
                      <div className="flex items-center gap-1 md:gap-2 mb-1.5 md:mb-2">
                        <Star className="w-3 h-3 md:w-4 md:h-4 text-amber-400" />
                        <p className="text-[9px] md:text-[10px] font-semibold text-amber-400 uppercase">Autonomía</p>
                      </div>
                      <div className="flex items-center gap-0.5 md:gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 md:w-5 md:h-5 ${
                              star <= (data.metrics?.autonomy_stars || 0)
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-neutral-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Tiempo Total */}
                    <div className="p-2.5 md:p-4 bg-neutral-900/50 border border-neutral-800/50 rounded-lg md:rounded-xl">
                      <div className="flex items-center gap-1 md:gap-2 mb-1.5 md:mb-2">
                        <Clock className="w-3 h-3 md:w-4 md:h-4 text-crystal-blue" />
                        <p className="text-[9px] md:text-[10px] font-semibold text-crystal-blue uppercase">Tiempo Total</p>
                      </div>
                      <p className="text-base md:text-2xl font-bold text-white">
                        {formatTotalTime(data.metrics.total_time_seconds)}
                      </p>
                    </div>

                    {/* Fecha de Finalización */}
                    <div className="p-2.5 md:p-4 bg-neutral-900/50 border border-neutral-800/50 rounded-lg md:rounded-xl">
                      <div className="flex items-center gap-1 md:gap-2 mb-1.5 md:mb-2">
                        <Calendar className="w-3 h-3 md:w-4 md:h-4 text-crystal-lavender" />
                        <p className="text-[9px] md:text-[10px] font-semibold text-crystal-lavender uppercase">Finalizado</p>
                      </div>
                      <p className="text-[10px] md:text-xs font-bold text-white">
                        {data.metrics.completion_date
                          ? new Date(data.metrics.completion_date).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })
                          : 'No completado'}
                      </p>
                    </div>

                    {/* Total de Pasos */}
                    <div className="p-2.5 md:p-4 bg-neutral-900/50 border border-neutral-800/50 rounded-lg md:rounded-xl">
                      <div className="flex items-center gap-1 md:gap-2 mb-1.5 md:mb-2">
                        <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-purple-400" />
                        <p className="text-[9px] md:text-[10px] font-semibold text-purple-400 uppercase">Pasos</p>
                      </div>
                      <p className="text-base md:text-2xl font-bold text-white">{data.metrics.total_steps}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Body - Lista de Pasos */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 md:p-6">
                {loading && (
                  <div className="flex flex-col items-center justify-center py-12 md:py-20">
                    <Loader2 className="w-6 h-6 md:w-8 md:h-8 text-crystal-blue animate-spin mb-3 md:mb-4" />
                    <p className="text-xs md:text-sm text-neutral-400">Cargando viaje de aprendizaje...</p>
                  </div>
                )}

                {error && (
                  <div className="flex flex-col items-center justify-center py-12 md:py-20">
                    <AlertCircle className="w-10 h-10 md:w-12 md:h-12 text-red-400 mb-3 md:mb-4" />
                    <p className="text-sm md:text-base text-red-400 font-semibold mb-2">Error al cargar insights</p>
                    <p className="text-xs md:text-sm text-neutral-500">{error}</p>
                  </div>
                )}

                {!loading && !error && data?.events && (
                  <div className="space-y-3 md:space-y-4">
                    <div className="mb-4 md:mb-6">
                      <h3 className="text-sm md:text-base font-bold text-white mb-1.5 md:mb-2">
                        Viaje de Aprendizaje Paso a Paso
                      </h3>
                      <p className="text-[10px] md:text-xs text-neutral-300">
                        Cada tarjeta muestra el esfuerzo, las respuestas y la reflexión del estudiante.
                      </p>
                    </div>

                    {/* Pasos normales */}
                    {data.events.map((event, index) => {
                      const isLastStep = index === data.events.length - 1;
                      const isReflexionStep = isLastStep && hasReflexion;
                      
                      return (
                        <StepCard
                          key={event.id}
                          event={event}
                          index={index}
                          isReflexionStep={isReflexionStep}
                        />
                      );
                    })}

                    {data.events.length === 0 && (
                      <div className="text-center py-12 md:py-20">
                        <AlertCircle className="w-10 h-10 md:w-12 md:h-12 text-neutral-600 mx-auto mb-3 md:mb-4" />
                        <p className="text-xs md:text-sm text-neutral-400 mb-4">
                          No hay eventos de pasos completados para este estudiante.
                        </p>
                        
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

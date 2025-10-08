'use client';
import { motion } from 'framer-motion';
import { 
  RotateCw, 
  Lightbulb, 
  Building2, 
  Clock, 
  MessageSquare,
  Star,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import type { StepCompletionEvent } from '@/types/student-insights';

interface StepCardProps {
  event: StepCompletionEvent;
  index: number;
  isReflexionStep?: boolean;
}

/**
 * StepCard - El corazón del Student Insight Panel
 * 
 * Muestra la historia completa de un paso:
 * - Esfuerzo (intentos, pistas, andamios, tiempo)
 * - Respuesta final del estudiante
 * - Reflexión (si es el paso final)
 */
export default function StepCard({ event, index, isReflexionStep = false }: StepCardProps) {
  const { result } = event;
  
  // Formatear tiempo
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Renderizar respuesta final
  const renderRespuesta = () => {
    if (!result.respuesta_final) {
      return <p className="text-xs md:text-sm text-neutral-500 italic">Sin respuesta registrada</p>;
    }

    // Si es array (multiple choice)
    if (Array.isArray(result.respuesta_final)) {
      return (
        <div className="space-y-1.5 md:space-y-2">
          {result.respuesta_final.map((opcion, idx) => (
            <div 
              key={idx}
              className="flex items-center gap-2 p-2 md:p-2.5 bg-neutral-900/50 rounded-lg border border-neutral-800/50"
            >
              <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-crystal-lavender flex-shrink-0" />
              <span className="text-xs md:text-sm text-white">{opcion}</span>
            </div>
          ))}
        </div>
      );
    }

    // Si es string o número
    return (
      <div className="p-2.5 md:p-3 bg-neutral-900/50 rounded-lg border border-neutral-800/50">
        <p className="text-xs md:text-sm text-white whitespace-pre-wrap">{result.respuesta_final}</p>
      </div>
    );
  };

  // Tarjeta especial para reflexión final
  if (isReflexionStep) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="relative bg-gradient-to-br from-crystal-blue/10 via-neutral-900/50 to-crystal-lavender/10 backdrop-blur-sm border-2 border-crystal-blue/30 rounded-lg md:rounded-xl p-3 md:p-6 overflow-hidden"
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-crystal-blue/5 to-crystal-lavender/5 blur-xl" />
        
        <div className="relative space-y-3 md:space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-crystal-blue/20 border border-crystal-blue/40 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-crystal-blue" />
              </div>
              <div>
                <h3 className="text-sm md:text-base font-bold text-white">Reflexión Final</h3>
                <p className="text-[10px] md:text-xs text-neutral-400">{result.paso_titulo || 'Cierre del taller'}</p>
              </div>
            </div>
            
            {/* Confianza (auto-evaluación) */}
            {result.confianza_auto_evaluada && (
              <div className="flex flex-col items-end gap-0.5 md:gap-1 flex-shrink-0">
                <p className="text-[9px] md:text-[10px] text-neutral-400 font-medium">Confianza</p>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3 h-3 md:w-4 md:h-4 ${
                        star <= (result.confianza_auto_evaluada || 0)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-neutral-700'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[10px] md:text-xs font-bold text-white">{result.confianza_auto_evaluada}/5</p>
              </div>
            )}
          </div>

          {/* Reflexión (El "Oro") */}
          {result.reflexion_texto && (
            <div className="space-y-1.5 md:space-y-2">
              <p className="text-[9px] md:text-[10px] font-semibold text-crystal-blue uppercase tracking-wider">
                Principal Conclusión
              </p>
              <div className="p-3 md:p-4 bg-neutral-900/70 rounded-lg border border-crystal-blue/20">
                <p className="text-xs md:text-sm text-white leading-relaxed italic">
                  &ldquo;{result.reflexion_texto}&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* Tiempo */}
          {result.tiempo_en_paso_segundos > 0 && (
            <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-neutral-400">
              <Clock className="w-3 h-3 md:w-4 md:h-4" />
              <span>Tiempo de reflexión: {formatTime(result.tiempo_en_paso_segundos)}</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Tarjeta estándar de paso
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800/50 rounded-lg md:rounded-xl p-3 md:p-6 hover:border-crystal-lavender/20 transition-colors"
    >
      <div className="space-y-3 md:space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 md:gap-2 mb-1">
              <span className="px-1.5 md:px-2 py-0.5 bg-neutral-800/50 text-neutral-400 text-[10px] md:text-xs font-mono rounded">
                Paso {index + 1}
              </span>
              {result.es_correcta !== undefined && (
                result.es_correcta ? (
                  <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-crystal-lavender" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-400" />
                )
              )}
            </div>
            <h3 className="text-sm md:text-base font-bold text-white break-words">
              {result.paso_titulo || result.paso_id}
            </h3>
          </div>
          
          {/* Autonomía (estrellas) */}
          {result.autonomia_estrellas && (
            <div className="flex items-center gap-0.5 md:gap-1 flex-shrink-0">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3 h-3 md:w-4 md:h-4 ${
                    star <= (result.autonomia_estrellas || 0)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-neutral-700'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Indicadores de Esfuerzo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {/* Intentos Fallidos */}
          <div className="flex items-center gap-1.5 md:gap-2 p-2 md:p-2.5 bg-neutral-800/30 rounded-lg">
            <RotateCw className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] md:text-[10px] text-neutral-400 truncate">Intentos</p>
              <p className="text-xs md:text-sm font-bold text-white">{result.intentos_fallidos || 0}</p>
            </div>
          </div>

          {/* Pistas Usadas */}
          <div className="flex items-center gap-1.5 md:gap-2 p-2 md:p-2.5 bg-neutral-800/30 rounded-lg">
            <Lightbulb className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] md:text-[10px] text-neutral-400 truncate">Pistas</p>
              <p className="text-xs md:text-sm font-bold text-white">{result.pistas_usadas || 0}</p>
            </div>
          </div>

          {/* Andamio */}
          <div className="flex items-center gap-1.5 md:gap-2 p-2 md:p-2.5 bg-neutral-800/30 rounded-lg">
            <Building2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-crystal-blue flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] md:text-[10px] text-neutral-400 truncate">Andamio</p>
              <p className="text-xs md:text-sm font-bold text-white">
                {result.ayuda_andamio_usada ? '✅' : '—'}
              </p>
            </div>
          </div>

          {/* Tiempo */}
          <div className="flex items-center gap-1.5 md:gap-2 p-2 md:p-2.5 bg-neutral-800/30 rounded-lg">
            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-crystal-lavender flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] md:text-[10px] text-neutral-400 truncate">Tiempo</p>
              <p className="text-xs md:text-sm font-bold text-white truncate">
                {formatTime(result.tiempo_en_paso_segundos || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Respuesta Final del Alumno */}
        <div className="space-y-1.5 md:space-y-2">
          <p className="text-[9px] md:text-[10px] font-semibold text-crystal-lavender uppercase tracking-wider">
            Respuesta Final
          </p>
          {renderRespuesta()}
        </div>
      </div>
    </motion.div>
  );
}

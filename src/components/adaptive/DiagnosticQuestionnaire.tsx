"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Target, 
  Lightbulb, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2,
  Sparkles 
} from 'lucide-react';
import type { DiagnosticQuestion } from '@/lib/adaptive/schema';

type Props = {
  preguntas: DiagnosticQuestion[];
  onComplete: (respuestas: Record<string, string>) => void;
  tallerId: string;
  tituloTaller: string;
};

const iconosPreguntas = {
  conocimiento_previo: Brain,
  estilo_aprendizaje: Lightbulb,
  nivel_autonomia: Target,
  contexto_aplicacion: Sparkles,
};

export default function DiagnosticQuestionnaire({ 
  preguntas, 
  onComplete, 
  tallerId,
  tituloTaller 
}: Props) {
  const [pasoActual, setPasoActual] = useState(0);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});

  const preguntaActual = preguntas[pasoActual];
  const esUltimaPregunta = pasoActual === preguntas.length - 1;
  const progresoPercentage = ((pasoActual + 1) / preguntas.length) * 100;

  const handleSeleccion = (questionId: string, optionId: string) => {
    setRespuestas(prev => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleSiguiente = () => {
    if (esUltimaPregunta) {
      onComplete(respuestas);
    } else {
      setPasoActual(prev => prev + 1);
    }
  };

  const handleAtras = () => {
    if (pasoActual > 0) {
      setPasoActual(prev => prev - 1);
    }
  };

  const respuestaSeleccionada = respuestas[preguntaActual?.id];
  const puedeAvanzar = !preguntaActual?.obligatoria || respuestaSeleccionada;

  if (!preguntaActual) return null;

  const IconoPregunta = iconosPreguntas[preguntaActual.tipo] || Brain;

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <motion.div
          className="text-center mb-8 space-y-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-turquoise/10 border border-turquoise/30">
            <Brain className="w-4 h-4 text-turquoise" />
            <span className="text-sm font-medium text-turquoise">Diagnóstico Personalizado</span>
          </div>
          
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-neutral-300 bg-clip-text text-transparent">
            {tituloTaller}
          </h1>
          
          <p className="text-neutral-400 max-w-2xl mx-auto">
            Responde estas preguntas para que personalicemos tu experiencia de aprendizaje
          </p>
        </motion.div>

        {/* Barra de progreso */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between text-sm text-neutral-400 mb-2">
            <span>Pregunta {pasoActual + 1} de {preguntas.length}</span>
            <span>{Math.round(progresoPercentage)}%</span>
          </div>
          <div className="h-2 bg-neutral-800/50 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-turquoise to-lime"
              initial={{ width: 0 }}
              animate={{ width: `${progresoPercentage}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </motion.div>

        {/* Tarjeta de pregunta */}
        <AnimatePresence mode="wait">
          <motion.div
            key={preguntaActual.id}
            className="bg-neutral-900/60 backdrop-blur-sm rounded-2xl border border-neutral-800/50 shadow-2xl p-8 space-y-6"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            {/* Encabezado de pregunta */}
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-turquoise/20 to-lime/10 flex-shrink-0">
                <IconoPregunta className="w-6 h-6 text-turquoise" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-neutral-100 leading-tight">
                  {preguntaActual.pregunta}
                </h2>
                {preguntaActual.obligatoria && (
                  <p className="text-xs text-neutral-500 mt-2">* Pregunta obligatoria</p>
                )}
              </div>
            </div>

            {/* Opciones */}
            <div className="space-y-3">
              {preguntaActual.opciones.map((opcion, idx) => {
                const isSelected = respuestaSeleccionada === opcion.id;

                return (
                  <motion.button
                    key={opcion.id}
                    type="button"
                    className={`
                      w-full p-4 rounded-xl border-2 text-left transition-all
                      ${isSelected
                        ? 'border-turquoise bg-turquoise/10 shadow-lg shadow-turquoise/20'
                        : 'border-neutral-700/50 bg-neutral-800/30 hover:border-neutral-600 hover:bg-neutral-800/50'
                      }
                    `}
                    onClick={() => handleSeleccion(preguntaActual.id, opcion.id)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.3 }}
                    whileHover={{ scale: 1.01, y: -2 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                        ${isSelected 
                          ? 'border-turquoise bg-turquoise' 
                          : 'border-neutral-600'
                        }
                      `}>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.2, type: 'spring' }}
                          >
                            <CheckCircle2 className="w-4 h-4 text-black" />
                          </motion.div>
                        )}
                      </div>
                      <span className={`text-base ${
                        isSelected ? 'text-white font-medium' : 'text-neutral-200'
                      }`}>
                        {opcion.texto}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Navegación */}
            <div className="flex items-center justify-between pt-4">
              {pasoActual > 0 ? (
                <motion.button
                  type="button"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-neutral-800/80 text-white rounded-xl hover:bg-neutral-700 border border-neutral-700/50 backdrop-blur-sm transition-all"
                  onClick={handleAtras}
                  whileHover={{ scale: 1.02, x: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Atrás</span>
                </motion.button>
              ) : (
                <div />
              )}

              <motion.button
                type="button"
                className={`
                  inline-flex items-center gap-2 px-6 py-3 font-semibold rounded-xl shadow-lg transition-all
                  ${puedeAvanzar
                    ? 'bg-gradient-to-r from-turquoise to-lime text-black hover:shadow-xl'
                    : 'bg-neutral-700/50 text-neutral-500 cursor-not-allowed'
                  }
                `}
                onClick={handleSiguiente}
                disabled={!puedeAvanzar}
                whileHover={puedeAvanzar ? { scale: 1.02, y: -1 } : {}}
                whileTap={puedeAvanzar ? { scale: 0.98 } : {}}
              >
                <span>{esUltimaPregunta ? 'Comenzar Misión' : 'Siguiente'}</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Footer info */}
        <motion.p
          className="text-center text-sm text-neutral-500 mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Tus respuestas nos ayudan a crear la mejor experiencia para ti
        </motion.p>
      </div>
    </div>
  );
}

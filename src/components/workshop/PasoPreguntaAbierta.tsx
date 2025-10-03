"use client";
import React, { useEffect, useRef, useState } from 'react';
import type { Paso } from '@/lib/workshops/schema';
import type { StepComplete } from './PasoInstruccion';
import type { StepController } from './types';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle, Lightbulb, LifeBuoy } from 'lucide-react';

type Props = {
  step: Extract<Paso, { tipo_paso: 'pregunta_abierta_validada' }>;
  onComplete: (res: StepComplete) => void;
  pistasUsadas: number;
  onHint?: (costo: number) => void;
  disabledInputs?: boolean;
  starsLeft?: number;
  immersive?: boolean;
  exposeController?: (ctrl: StepController) => void;
  onUiFeedback?: (text: string, kind: 'success' | 'info' | 'error') => void;
};

function validateAnswer(text: string, criterios: string[]): boolean {
  const lower = text.toLowerCase();
  for (let i = 0; i < criterios.length; i++) {
    const kw = criterios[i]!.toLowerCase();
    if (!lower.includes(kw)) return false;
  }
  return true;
}

// Más tolerante: normaliza acentos y decimales, acepta 'proporcional' o 'lineal' como equivalentes,
// y permite coincidencias numéricas con coma o distintos redondeos (2,4 ~ 2.4 ~ 2.40)
function validateAnswerFlex(text: string, criterios: string[]): boolean {
  const norm = (s: string) =>
    String(s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/,/g, '.');

  const t = norm(text);
  const tokens = Array.from(new Set(criterios.map((c) => norm(c))));

  const isNumeric = (x: string) => /^\d+(?:\.\d+)?$/.test(x);
  const numeric = tokens.filter(isNumeric);
  const words = tokens.filter((x) => !isNumeric(x));

  // grupos: proporcional/lineal (basta con uno) y razon unitaria (sinonimos)
  const wantsProp = words.some((w) => w === 'proporc' || w === 'proporcional' || w === 'lineal');
  const wantsRazon = words.some((w) => w === 'razon' || w === 'unitaria' || w === 'unitario');
  const wordRequired = words.filter(
    (w) => w !== 'proporc' && w !== 'proporcional' && w !== 'lineal' && w !== 'razon' && w !== 'unitaria' && w !== 'unitario'
  );

  // comprobar palabras
  for (let i = 0; i < wordRequired.length; i++) {
    const w = wordRequired[i]!;
    // tolerancia para 'multiplicar' -> cualquier forma 'multiplic*' o expresion con x/×
    if (w === 'multiplicar') {
      const hasMulRoot = t.includes('multiplic');
      const hasMulSymbol = /\b\d+\s*(?:x|×)\s*\d+(?:\.\d+)?\b/.test(t);
      if (!(hasMulRoot || hasMulSymbol)) return false;
      continue;
    }
    if (!t.includes(w)) return false;
  }
  if (wantsProp) {
    const okProp = t.includes('proporc') || t.includes('lineal');
    if (!okProp) return false;
  }

  if (wantsRazon) {
    const okRazon =
      t.includes('razon') ||
      t.includes('unitari') ||
      t.includes('precio por 1') ||
      t.includes('precio por uno') ||
      t.includes('por 1') ||
      t.includes('precio unitario') ||
      t.includes('por unidad');
    if (!okRazon) return false;
  }

  // comprobar números con tolerancia simple de formato (2.4 / 2.40)
  const hasAllNumbers = numeric.every((n) => {
    if (t.includes(n)) return true;
    const num = Number(n);
    const candidates = [num.toFixed(0), num.toFixed(1), num.toFixed(2), num.toFixed(3)];
    return candidates.some((c) => t.includes(c));
  });

  return hasAllNumbers;
}

/**
 * Calcula la similitud entre dos textos usando distancia de Levenshtein normalizada
 * Retorna un valor entre 0 (completamente diferente) y 1 (idéntico)
 */
function calculateSimilarity(text1: string, text2: string): number {
  const normalize = (s: string) => 
    s.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, '')
      .trim();
  
  const s1 = normalize(text1);
  const s2 = normalize(text2);
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  // Levenshtein distance
  const matrix: number[][] = [];
  
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= s1.length; j++) {
    matrix[0]![j] = j;
  }
  
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1,
          matrix[i]![j - 1]! + 1,
          matrix[i - 1]![j]! + 1
        );
      }
    }
  }
  
  const maxLength = Math.max(s1.length, s2.length);
  const distance = matrix[s2.length]![s1.length]!;
  return 1 - (distance / maxLength);
}

export default function PasoPreguntaAbierta({ step, onComplete, pistasUsadas, onHint, disabledInputs, starsLeft, immersive, exposeController, onUiFeedback }: Props) {
  const cfg = step.pregunta_abierta_validada;
  const [answer, setAnswer] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [lastWasCorrect, setLastWasCorrect] = useState<boolean | null>(null);
  const [rescueShown, setRescueShown] = useState(false);
  const [showingComprehension, setShowingComprehension] = useState(false);
  const [comprehensionAnswer, setComprehensionAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const onSubmit = () => {
    const ok = validateAnswerFlex(answer, cfg.validacion.criterio);
    setLastWasCorrect(ok);
    if (ok) {
      setFeedback(cfg.validacion.feedback_correcto ?? '¡Bien! Respuesta válida.');
      if (onUiFeedback) onUiFeedback(cfg.validacion.feedback_correcto ?? '¡Bien! Respuesta válida.', 'success');
      onComplete({
        success: true,
        score: step.puntaje ?? 1,
        pistasUsadas,
        explicacionLongitud: answer.trim().length,
        raw: { answer },
      });
      return;
    }
    // fallo
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setFeedback(cfg.validacion.feedback_incorrecto ?? 'Revisa tu respuesta y vuelve a intentar.');
    if (onUiFeedback) onUiFeedback(cfg.validacion.feedback_incorrecto ?? 'Revisa tu respuesta y vuelve a intentar.', 'info');
    onComplete({
      success: false,
      score: 0,
      pistasUsadas,
      explicacionLongitud: answer.trim().length,
      raw: { answer, attempts: nextAttempts },
    });
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const askHint = () => {
    const pista = step.pistas?.[Math.min(pistasUsadas, (step.pistas?.length ?? 1) - 1)];
    const costo = pista?.costo ?? 1;
    onHint?.(costo);
  };

  const nextHintCost = step.pistas?.[Math.min(pistasUsadas, (step.pistas?.length ?? 1) - 1)]?.costo ?? 1;
  const canAskHint =
    !!step.pistas &&
    step.pistas.length > 0 &&
    !disabledInputs &&
    (step.pistas.length > pistasUsadas) &&
    (nextHintCost <= (starsLeft ?? 0));

  const rescate = cfg.rescate;

  // Expose imperative controller for immersive layout
  useEffect(() => {
    if (!exposeController) return;
    
    const handleSubmit = () => {
      if (showingComprehension && rescate?.pregunta_de_aplicacion) {
        // Ejecutar lógica de pregunta de aplicación
        const aplicacion = rescate.pregunta_de_aplicacion;
        if (!aplicacion || !selectedOption) return;
        
        const correcto = selectedOption === aplicacion.respuesta_correcta;
        
        if (!correcto) {
          setFeedback('❌ Esa no es la respuesta correcta. Consulta el Santuario y vuelve a intentarlo.');
          setLastWasCorrect(false);
          return;
        }
        
        setFeedback('✅ ¡Correcto! Has demostrado que comprendes el concepto.');
        setLastWasCorrect(true);
        
        // Resetear flag para que el componente renderice el contenido normal después
        setShowingComprehension(false);
        
        onComplete({
          success: true,
          score: Math.floor((step.puntaje ?? 1) / 2),
          pistasUsadas,
          raw: { 
            andamio_progresivo: true, 
            respuesta_original: answer,
            respuesta_aplicacion: selectedOption,
            pregunta_aplicacion: aplicacion.pregunta
          },
        });
      } else {
        onSubmit();
      }
    };
    
    exposeController({
      submit: handleSubmit,
      canSubmit: () => !disabledInputs && (showingComprehension ? !!selectedOption : answer.trim().length > 0),
      canAskHint: () => canAskHint,
      askHint: () => askHint(),
    });
  }, [exposeController, onSubmit, disabledInputs, answer, canAskHint, showingComprehension, selectedOption, rescate, onComplete, step.puntaje, pistasUsadas]);

  const rescueEligible =
    !!rescate &&
    (
      (typeof rescate.desde_intento === 'number' && attempts >= rescate.desde_intento) ||
      (typeof rescate.desde_pistas === 'number' && pistasUsadas >= rescate.desde_pistas)
    );

  const onAcceptRescue = () => {
    if (!rescate) return;
    if ((starsLeft ?? 0) < (rescate.costo ?? 1)) return;
    onHint?.(rescate.costo ?? 1);
    setRescueShown(true);

    // Caso 1: Activar pre-taller de nivelación
    if (rescate.activar_pre_taller) {
      // Redirigir al pre-taller
      window.location.href = `/workshop/${rescate.activar_pre_taller}?return=${step.ref_id || step.paso_numero}`;
      return;
    }

    // Caso 2: Ciclo de Andamio Progresivo (con pregunta de aplicación o comprensión)
    if (rescate.pregunta_de_aplicacion || rescate.pregunta_comprension) {
      // Limpiar feedback de la pregunta original
      setFeedback('');
      setLastWasCorrect(null);
      
      // Inyectar respuesta ejemplo al Santuario
      if (typeof window !== 'undefined' && (window as any).addSanctuaryResource) {
        (window as any).addSanctuaryResource({
          tipo: 'texto',
          contenido: rescate.explicacion,
          descripcion: 'Ejemplo de respuesta correcta',
          titulo: '📝 Respuesta Modelo'
        });
      }
      
      // Mostrar pregunta de aplicación o comprensión
      setShowingComprehension(true);
      return;
    }

    // Caso 3: Rescate tradicional (solo mostrar explicación)
    onComplete({
      success: true,
      score: 0, // rescate: no puntaje
      pistasUsadas,
      explicacionLongitud: answer.trim().length,
      raw: { rescue: true, answer, explicacion_rescate: rescate.explicacion },
    });
  };

  const onSubmitComprehension = () => {
    const userAnswer = comprehensionAnswer.trim();
    const modelAnswer = rescate?.explicacion || '';
    
    // Validación anti-copy-paste: rechazar si >90% similar al ejemplo
    const similarity = calculateSimilarity(userAnswer, modelAnswer);
    
    if (similarity > 0.90) {
      setFeedback('⚠️ Tu respuesta es muy similar al ejemplo. Intenta explicarlo con tus propias palabras, como si le estuvieras enseñando a un compañero.');
      setLastWasCorrect(false);
      return;
    }
    
    // Validación de longitud mínima
    if (userAnswer.length < 10) {
      setFeedback('Tu respuesta es demasiado corta. Intenta desarrollar más tu explicación.');
      setLastWasCorrect(false);
      return;
    }
    
    // Completar con la respuesta de comprensión
    onComplete({
      success: true,
      score: Math.floor((step.puntaje ?? 1) / 2), // Medio puntaje por usar andamio
      pistasUsadas,
      explicacionLongitud: userAnswer.length,
      raw: { 
        andamio_progresivo: true, 
        respuesta_original: answer,
        respuesta_comprension: userAnswer,
        similitud_con_ejemplo: Math.round(similarity * 100) 
      },
    });
  };

  const onSubmitAplicacion = () => {
    const aplicacion = rescate?.pregunta_de_aplicacion;
    if (!aplicacion || !selectedOption) return;
    
    const correcto = selectedOption === aplicacion.respuesta_correcta;
    
    if (!correcto) {
      setFeedback('❌ Esa no es la respuesta correcta. Consulta el Santuario y vuelve a intentarlo.');
      setLastWasCorrect(false);
      return;
    }
    
    // Respuesta correcta
    setFeedback('✅ ¡Correcto! Has demostrado que comprendes el concepto.');
    setLastWasCorrect(true);
    
    onComplete({
      success: true,
      score: Math.floor((step.puntaje ?? 1) / 2), // Medio puntaje por usar andamio
      pistasUsadas,
      raw: { 
        andamio_progresivo: true, 
        respuesta_original: answer,
        respuesta_aplicacion: selectedOption,
        pregunta_aplicacion: aplicacion.pregunta
      },
    });
  };

  // Si estamos mostrando la pregunta de APLICACIÓN (Ciclo de Andamio - Nuevo)
  if (showingComprehension && rescate?.pregunta_de_aplicacion) {
    const aplicacion = rescate.pregunta_de_aplicacion;
    
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-lime/10 border border-lime/30 text-lime text-sm font-medium mb-2">
            <Lightbulb className="w-4 h-4" />
            🪜 Ciclo de Andamio Progresivo
          </div>
          <h2 className="text-2xl font-bold text-neutral-100">Pregunta de Aplicación</h2>
          <p className="text-lg text-neutral-300 leading-relaxed">{aplicacion.pregunta}</p>
          <div className="p-3 rounded-lg bg-turquoise/10 border border-turquoise/30 text-sm text-turquoise/90">
            💡 Consulta el <strong>Santuario del Conocimiento</strong> (botón flotante abajo a la derecha) para revisar el concepto.
          </div>
        </div>

        {/* Feedback */}
        <AnimatePresence mode="wait">
          {feedback && lastWasCorrect !== null && (
            <motion.div
              className={`p-4 rounded-xl backdrop-blur-sm ${
                lastWasCorrect
                  ? 'bg-lime/10 border-2 border-lime/50 text-lime'
                  : 'bg-red-900/10 border-2 border-red-500/50 text-red-300'
              }`}
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, type: 'spring' }}
            >
              <div className="flex items-start gap-2">
                {lastWasCorrect ? (
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                )}
                <p className="leading-relaxed">{feedback}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Opciones de respuesta */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {aplicacion.opciones.map((opcion, idx) => (
            <motion.button
              key={idx}
              type="button"
              className={`w-full p-4 rounded-xl text-left transition-all border-2 ${
                selectedOption === opcion
                  ? 'bg-lime/20 border-lime/50 text-lime'
                  : 'bg-neutral-800/40 border-neutral-700/50 text-neutral-200 hover:border-neutral-600 hover:bg-neutral-800/60'
              }`}
              onClick={() => setSelectedOption(opcion)}
              whileHover={{ scale: 1.01, x: 2 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  selectedOption === opcion
                    ? 'border-lime bg-lime/20'
                    : 'border-neutral-600'
                }`}>
                  {selectedOption === opcion && (
                    <CheckCircle2 className="w-4 h-4 text-lime" />
                  )}
                </div>
                <span className="flex-1">{opcion}</span>
              </div>
            </motion.button>
          ))}
        </motion.div>

        {/* El botón "Enviar" es manejado por InteractivePlayer (botón pequeño abajo) */}
      </div>
    );
  }

  // Si estamos mostrando la pregunta de comprensión (Ciclo de Andamio - DEPRECADO)
  // PERO solo si el paso NO está completado (para evitar botones duplicados)
  if (showingComprehension && rescate?.pregunta_comprension && !disabledInputs) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-lime/10 border border-lime/30 text-lime text-sm font-medium mb-2">
            <Lightbulb className="w-4 h-4" />
            Ciclo de Andamio Progresivo
          </div>
          <h2 className="text-2xl font-bold text-neutral-100">Pregunta de Comprensión</h2>
          <p className="text-lg text-neutral-300 leading-relaxed">{rescate.pregunta_comprension}</p>
          <div className="p-3 rounded-lg bg-turquoise/10 border border-turquoise/30 text-sm text-turquoise/90">
            💡 Consulta el <strong>Santuario del Conocimiento</strong> (botón flotante abajo a la derecha) para ver la respuesta modelo.
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <textarea
            className="w-full p-4 rounded-xl bg-neutral-800/40 border-2 border-neutral-700/50 focus:border-lime/50 focus:outline-none focus:ring-2 focus:ring-lime/20 text-neutral-200 placeholder:text-neutral-500 transition-all min-h-[120px] backdrop-blur-sm resize-y"
            placeholder="Explica con tus propias palabras..."
            value={comprehensionAnswer}
            onChange={(e) => setComprehensionAnswer(e.target.value)}
          />
        </motion.div>

        <motion.button
          type="button"
          className="w-full px-6 py-3 bg-gradient-to-r from-lime to-turquoise text-black font-bold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          onClick={onSubmitComprehension}
          disabled={comprehensionAnswer.trim().length < 10}
          whileHover={{ scale: 1.01, y: -1 }}
          whileTap={{ scale: 0.99 }}
        >
          Enviar Comprensión
        </motion.button>
      </div>
    );
  }

  // UI normal de pregunta abierta
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-neutral-100">{step.titulo_paso}</h2>
        <p className="text-lg text-neutral-300 leading-relaxed">{cfg.pregunta}</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <textarea
          ref={textareaRef}
          className="w-full p-4 rounded-xl bg-neutral-800/40 border-2 border-neutral-700/50 focus:border-turquoise/50 focus:outline-none focus:ring-2 focus:ring-turquoise/20 text-neutral-200 placeholder:text-neutral-500 transition-all min-h-[120px] backdrop-blur-sm resize-y"
          placeholder={cfg.placeholder || "Escribe tu respuesta aquí..."}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={!!disabledInputs}
        />
      </motion.div>

      <AnimatePresence mode="wait">
        {feedback && (
          <motion.div 
            className={`p-4 rounded-xl border-2 backdrop-blur-sm shadow-lg ${
              lastWasCorrect 
                ? 'bg-green-900/20 border-green-600/50 text-green-100' 
                : 'bg-amber-900/20 border-amber-600/50 text-amber-100'
            }`}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, type: 'spring' }}
          >
            <div className="flex items-start gap-2">
              {lastWasCorrect ? (
                <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              )}
              <p className="leading-relaxed">{feedback}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {step.pistas && pistasUsadas > 0 && (
        <motion.div 
          className="p-4 rounded-xl bg-blue-900/10 border-2 border-blue-700/30 backdrop-blur-sm space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-2 text-blue-300 font-medium text-sm">
            <Lightbulb className="w-4 h-4" />
            <span>Pistas utilizadas:</span>
          </div>
          <div className="space-y-2 pl-6">
            {step.pistas.slice(0, pistasUsadas).map((p, i) => (
              <motion.div
                key={i}
                className="text-sm text-blue-100"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <span className="font-semibold text-blue-200">Pista {i + 1}:</span> {p.texto}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {lastWasCorrect === false && !disabledInputs && (
        <motion.p 
          className="flex items-center gap-2 text-sm text-amber-300 font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <AlertCircle className="w-4 h-4" />
          Ajusta tu respuesta y vuelve a intentarlo
        </motion.p>
      )}

      {rescate && rescueEligible && !rescueShown && (
        <motion.div
          className="p-4 rounded-xl bg-amber-900/20 border-2 border-amber-600/50 backdrop-blur-sm space-y-3"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <LifeBuoy className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-100 mb-1">
                {rescate.activar_pre_taller 
                  ? '🎓 Taller de Nivelación Disponible'
                  : rescate.pregunta_de_aplicacion || rescate.pregunta_comprension
                    ? '🪜 Ciclo de Andamio Progresivo'
                    : '🆘 Opción de Rescate Disponible'}
              </h3>
              <p className="text-sm text-amber-200/80">
                {rescate.activar_pre_taller 
                  ? "Parece que necesitas reforzar un concepto clave. Te recomendamos completar primero un breve taller de nivelación para construir las bases necesarias." 
                  : rescate.pregunta_de_aplicacion
                    ? "¿Necesitas más ayuda? Puedo mostrarte un ejemplo y luego verificar que lo comprendiste con una pregunta de aplicación."
                    : rescate.pregunta_comprension
                      ? "¿Necesitas más ayuda? Puedo mostrarte un ejemplo de una respuesta correcta para guiarte."
                      : "Si lo necesitas, puedo ayudarte a completar este paso."}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {!immersive && (
        <div className="flex flex-wrap gap-3 pt-4">
          <motion.button
            className="px-6 py-3 bg-gradient-to-r from-turquoise to-lime text-black font-semibold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 transition-all"
            onClick={onSubmit}
            disabled={!!disabledInputs}
            whileHover={!disabledInputs ? { scale: 1.02, y: -1 } : {}}
            whileTap={!disabledInputs ? { scale: 0.98 } : {}}
          >
            Enviar Respuesta
          </motion.button>

          {step.pistas && step.pistas.length > 0 && (
            <motion.button
              type="button"
              className="inline-flex items-center gap-2 px-5 py-3 bg-neutral-800/80 text-white rounded-xl hover:bg-neutral-700 disabled:opacity-50 border border-neutral-700/50 backdrop-blur-sm transition-all"
              onClick={askHint}
              disabled={!canAskHint}
              whileHover={canAskHint ? { scale: 1.02, y: -1 } : {}}
              whileTap={canAskHint ? { scale: 0.98 } : {}}
            >
              <Lightbulb className="w-4 h-4" />
              <span>{`Pedir pista (-${nextHintCost}⭐)`}</span>
            </motion.button>
          )}
        </div>
      )}

      {/* Botón de rescate: SIEMPRE visible (incluso en modo immersive) */}
      {rescate && rescueEligible && !rescueShown && (
        <div className="pt-3">
          <motion.button
            type="button"
            className="inline-flex items-center gap-2 px-5 py-3 bg-amber-500/20 hover:bg-amber-500/30 border-2 border-amber-500/50 text-amber-100 font-semibold rounded-xl disabled:opacity-50 transition-all"
            onClick={onAcceptRescue}
            disabled={((rescate.costo ?? 1) > (starsLeft ?? 0))}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <LifeBuoy className="w-4 h-4" />
            <span>
              {rescate.activar_pre_taller 
                ? `Ir a Nivelación (-${rescate.costo ?? 1}⭐)`
                : rescate.pregunta_de_aplicacion || rescate.pregunta_comprension
                  ? `Ver Ejemplo (-${rescate.costo ?? 1}⭐)`
                  : rescate.titulo 
                    ? `${rescate.titulo} (-${rescate.costo ?? 1}⭐)` 
                    : `Rescate (-${rescate.costo ?? 1}⭐)`}
            </span>
          </motion.button>
        </div>
      )}
    </div>
  );
}
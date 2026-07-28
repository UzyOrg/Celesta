"use client";

import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  CREAR_MAX_ANSWER_LENGTH,
  type CrearCertaintyMap,
  type CrearCertaintyMapSubmission,
  type CrearResponseCategory,
} from '@/lib/crear/types';
import styles from './CinematicEnglishPlayer.hallmark.module.css';

interface CinematicCertaintyMapProps {
  config: CrearCertaintyMap;
  pending: boolean;
  assisted: boolean;
  onAssistance: (reason: 'map_retry') => void;
  onSubmit: (submission: CrearCertaintyMapSubmission) => void;
  onFocusChange?: (focused: boolean) => void;
}

type MapPhase = 'map' | 'produce';

export function CinematicCertaintyMap({
  config,
  pending,
  assisted,
  onAssistance,
  onSubmit,
  onFocusChange,
}: CinematicCertaintyMapProps) {
  const prefersReducedMotion = useReducedMotion();
  const [assignments, setAssignments] = useState<Record<string, CrearResponseCategory>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [wrongStatementIds, setWrongStatementIds] = useState<string[]>([]);
  const [hadIncorrectMap, setHadIncorrectMap] = useState(false);
  const [phase, setPhase] = useState<MapPhase>('map');
  const [productionText, setProductionText] = useState('');
  const [draggingCategory, setDraggingCategory] = useState<CrearResponseCategory | null>(null);
  const dropTargetRef = useRef<HTMLSpanElement>(null);
  const didDragRef = useRef(false);

  const activeStatement = config.statements[activeIndex] ?? config.statements[0];
  const selectedCategory = activeStatement ? assignments[activeStatement.id] : undefined;
  const selectedTerm = config.categories.find(
    (category) => category.id === selectedCategory
  )?.term;
  const assignedCount = Object.keys(assignments).length;
  const effectiveAssistance = assisted || hadIncorrectMap;
  const currentNeedsCorrection = activeStatement
    ? wrongStatementIds.includes(activeStatement.id)
    : false;

  function assignStatement(statementId: string, category: CrearResponseCategory): void {
    if (pending) return;
    setAssignments((current) => ({ ...current, [statementId]: category }));
    setWrongStatementIds((current) => current.filter((id) => id !== statementId));
  }

  function handleDragEnd(category: CrearResponseCategory, info: PanInfo): void {
    const target = dropTargetRef.current?.getBoundingClientRect();
    if (target && activeStatement) {
      const insideTarget =
        info.point.x >= target.left &&
        info.point.x <= target.right &&
        info.point.y >= target.top &&
        info.point.y <= target.bottom;
      if (insideTarget) assignStatement(activeStatement.id, category);
    }
    setDraggingCategory(null);
    window.requestAnimationFrame(() => {
      didDragRef.current = false;
    });
  }

  function checkMap(): void {
    const wrong = config.statements
      .filter((statement) => assignments[statement.id] !== statement.correctCategory)
      .map((statement) => statement.id);

    if (wrong.length > 0) {
      setWrongStatementIds(wrong);
      setAssignments((current) => Object.fromEntries(
        Object.entries(current).filter(([statementId]) => !wrong.includes(statementId))
      ));
      setHadIncorrectMap(true);
      const firstWrongIndex = config.statements.findIndex(
        (statement) => statement.id === wrong[0]
      );
      if (firstWrongIndex >= 0) setActiveIndex(firstWrongIndex);
      onAssistance('map_retry');
      return;
    }

    if (config.production) {
      setPhase('produce');
      return;
    }

    onSubmit({
      assignments,
      assisted: effectiveAssistance,
    });
  }

  function continueMap(): void {
    if (!activeStatement || !selectedCategory || pending) return;

    if (hadIncorrectMap) {
      const remainingWrongIds = wrongStatementIds.filter((id) => id !== activeStatement.id);
      if (remainingWrongIds.length > 0) {
        const nextWrongIndex = config.statements.findIndex(
          (statement) => statement.id === remainingWrongIds[0]
        );
        if (nextWrongIndex >= 0) setActiveIndex(nextWrongIndex);
        return;
      }
      checkMap();
      return;
    }

    if (activeIndex < config.statements.length - 1) {
      setActiveIndex(activeIndex + 1);
      return;
    }

    checkMap();
  }

  if (phase === 'produce' && config.production) {
    return (
      <motion.section
        className={styles.certaintyMap}
        data-phase="produce"
        aria-busy={pending}
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: prefersReducedMotion ? 0.1 : 0.24 }}
      >
        <h2 className={styles.productionTitle}>Ahora escribe tu propia deducción</h2>
        <label className={styles.productionPrompt} htmlFor="celestea-map-production">
          {config.production.prompt}
        </label>
        <textarea
          id="celestea-map-production"
          className={styles.cinematicTextarea}
          value={productionText}
          onChange={(event) => setProductionText(event.target.value)}
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
          placeholder={config.production.placeholder}
          rows={3}
          maxLength={CREAR_MAX_ANSWER_LENGTH}
          lang="en-US"
          disabled={pending}
          spellCheck
        />
        <button
          className={styles.primaryAction}
          disabled={productionText.trim().length < config.production.minChars || pending}
          type="button"
          onClick={() => onSubmit({
            assignments,
            productionText: productionText.trim(),
            assisted: effectiveAssistance,
          })}
        >
          {pending ? (
            <>
              <Loader2 className={styles.thinkingIcon} size={18} />
              <span>Leyendo tu frase…</span>
            </>
          ) : (
            <>
              <span>Enviar mi frase</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </motion.section>
    );
  }

  return (
    <section className={styles.certaintyMap} data-phase="match" aria-busy={pending}>
      <div className={styles.mapInstruction}>
        <p>Elige cuánto puedes asegurar</p>
        <span>{activeIndex + 1} de {config.statements.length}</span>
      </div>

      <div className={styles.mapProgress} aria-hidden="true">
        {config.statements.map((statement, index) => (
          <span
            data-state={
              assignments[statement.id]
                ? 'complete'
                : index === activeIndex
                  ? 'active'
                  : 'upcoming'
            }
            key={statement.id}
          />
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {activeStatement ? (
          <motion.article
            className={styles.mapQuestion}
            data-error={currentNeedsCorrection ? 'true' : 'false'}
            key={activeStatement.id}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -10 }}
            transition={{ duration: prefersReducedMotion ? 0.1 : 0.22 }}
          >
            <p className={styles.mapClue} lang="en-US">{activeStatement.clue}</p>
            <p
              className={styles.mapSentence}
              data-testid="certainty-map-sentence"
              lang="en-US"
            >
              <span>{activeStatement.sentenceStart}</span>
              <motion.span
                ref={dropTargetRef}
                className={styles.mapDropTarget}
                data-testid="certainty-map-drop-target"
                data-filled={selectedTerm ? 'true' : 'false'}
                data-dragging={draggingCategory ? 'true' : 'false'}
                data-error={currentNeedsCorrection ? 'true' : 'false'}
                aria-label={
                  selectedTerm
                    ? `Espacio completado con ${selectedTerm}`
                    : 'Espacio para la expresión'
                }
                animate={
                  draggingCategory && !prefersReducedMotion
                    ? { scale: 1.025 }
                    : { scale: 1 }
                }
                transition={{ duration: 0.16 }}
              >
                {selectedTerm ?? null}
              </motion.span>
              <span>{activeStatement.sentenceEnd}</span>
            </p>
          </motion.article>
        ) : null}
      </AnimatePresence>

      <div className={styles.mapControls} data-testid="certainty-map-controls">
        <div className={styles.optionTray} role="group" aria-label="Expresiones disponibles">
          {config.categories.map((category) => (
            <motion.button
              className={styles.mapToken}
              data-selected={selectedCategory === category.id ? 'true' : 'false'}
              key={category.id}
              type="button"
              disabled={!activeStatement || pending}
              drag={!pending}
              dragSnapToOrigin
              dragMomentum={false}
              dragElastic={0.08}
              onDragStart={() => {
                didDragRef.current = true;
                setDraggingCategory(category.id);
              }}
              onDragEnd={(_, info) => handleDragEnd(category.id, info)}
              onClick={() => {
                if (!didDragRef.current && activeStatement) {
                  assignStatement(activeStatement.id, category.id);
                }
              }}
              whileDrag={prefersReducedMotion ? undefined : { scale: 1.04, zIndex: 2 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
              aria-label={`Elegir ${category.term} para completar la frase`}
              aria-pressed={selectedCategory === category.id}
            >
              {category.term}
            </motion.button>
          ))}
        </div>

        {currentNeedsCorrection ? (
          <p className={styles.mapFeedback} role="status" aria-live="polite">
            Esa expresión dice algo distinto. Revisa cuánto puedes asegurar y prueba otra.
          </p>
        ) : null}

        <button
          className={styles.primaryAction}
          disabled={!selectedCategory || pending}
          type="button"
          onClick={continueMap}
        >
          <span>
            {hadIncorrectMap
              ? wrongStatementIds.length > 0
                ? 'Revisar siguiente'
                : 'Comprobar'
              : activeIndex < config.statements.length - 1
                ? 'Siguiente'
                : 'Comprobar'}
          </span>
          <ArrowRight size={18} />
        </button>
      </div>
    </section>
  );
}

"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type PanInfo,
} from 'framer-motion';
import { ArrowRight, Languages, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CREAR_MAX_ANSWER_LENGTH,
  type CrearCertaintyMap,
  type CrearCertaintyMapAttempt,
  type CrearCertaintyMapSubmission,
  type CrearResponseCategory,
} from '@/lib/crear/types';
import { CinematicCaseArtifact } from './CinematicCaseArtifact';
import styles from './CinematicEnglishPlayer.hallmark.module.css';

interface CinematicCertaintyMapProps {
  config: CrearCertaintyMap;
  pending: boolean;
  assisted: boolean;
  onAssistance: (
    reason: 'map_retry' | 'translation_opened',
    statementId?: string
  ) => void;
  onAttempt: (attempt: CrearCertaintyMapAttempt) => void;
  onSubmit: (submission: CrearCertaintyMapSubmission) => void;
  onFocusChange?: (focused: boolean) => void;
  onPhaseChange?: (phase: CrearCertaintyMapPhase) => void;
}

export type CrearCertaintyMapPhase = 'map' | 'produce';

interface TermRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface TermTraveler {
  id: string;
  category: CrearResponseCategory;
  direction: 'incoming' | 'outgoing';
  from: TermRect;
  to: TermRect;
  term: string;
}

function readRect(element: Element): TermRect {
  const rect = element.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

function destinationRect(container: Element, movingRect: TermRect): TermRect {
  const target = container.getBoundingClientRect();
  const computed = window.getComputedStyle(container);
  const paddingBottom = Number.parseFloat(computed.paddingBottom) || 0;
  const borderBottom = Number.parseFloat(computed.borderBottomWidth) || 0;
  return {
    left: target.left + ((target.width - movingRect.width) / 2),
    top: target.bottom - paddingBottom - movingRect.height - borderBottom,
    width: movingRect.width,
    height: movingRect.height,
  };
}

export function CinematicCertaintyMap({
  config,
  pending,
  assisted,
  onAssistance,
  onAttempt,
  onSubmit,
  onFocusChange,
  onPhaseChange,
}: CinematicCertaintyMapProps) {
  const prefersReducedMotion = useReducedMotion();
  const [assignments, setAssignments] = useState<Record<string, CrearResponseCategory>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [wrongStatementIds, setWrongStatementIds] = useState<string[]>([]);
  const [hadIncorrectMap, setHadIncorrectMap] = useState(false);
  const [phase, setPhase] = useState<CrearCertaintyMapPhase>('map');
  const [productionText, setProductionText] = useState('');
  const [draggingCategory, setDraggingCategory] = useState<CrearResponseCategory | null>(null);
  const [translationOpenId, setTranslationOpenId] = useState<string | null>(null);
  const [travelers, setTravelers] = useState<TermTraveler[]>([]);
  const dropTargetRef = useRef<HTMLButtonElement>(null);
  const selectedTermRef = useRef<HTMLSpanElement>(null);
  const sourceTermRefs = useRef<Partial<Record<CrearResponseCategory, HTMLSpanElement | null>>>({});
  const travelerSequenceRef = useRef(0);
  const didDragRef = useRef(false);
  const statementAttemptsRef = useRef<Record<string, number>>({});
  const assistedStatementIdsRef = useRef<Set<string>>(new Set());
  const translatedStatementIdsRef = useRef<Set<string>>(new Set());

  const activeStatement = config.statements[activeIndex] ?? config.statements[0];
  const selectedCategory = activeStatement ? assignments[activeStatement.id] : undefined;
  const selectedTerm = config.categories.find(
    (category) => category.id === selectedCategory
  )?.term;
  const effectiveAssistance = assisted || hadIncorrectMap;
  const currentNeedsCorrection = activeStatement
    ? wrongStatementIds.includes(activeStatement.id)
    : false;
  const interactionLocked = pending || travelers.length > 0;

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [onPhaseChange, phase]);

  function createTraveler(
    category: CrearResponseCategory,
    direction: TermTraveler['direction'],
    from: TermRect,
    to: TermRect
  ): TermTraveler | null {
    const term = config.categories.find((candidate) => candidate.id === category)?.term;
    if (!term) return null;
    travelerSequenceRef.current += 1;
    return {
      id: `${activeStatement.id}-${category}-${direction}-${travelerSequenceRef.current}`,
      category,
      direction,
      from,
      to,
      term,
    };
  }

  function assignStatement(
    statementId: string,
    category: CrearResponseCategory,
    animate = true
  ): void {
    if (interactionLocked || selectedCategory === category) return;

    const nextTravelers: TermTraveler[] = [];
    if (animate && !prefersReducedMotion && dropTargetRef.current) {
      const incomingSource = sourceTermRefs.current[category];
      if (incomingSource) {
        const incomingRect = readRect(incomingSource);
        const incoming = createTraveler(
          category,
          'incoming',
          incomingRect,
          destinationRect(dropTargetRef.current, incomingRect)
        );
        if (incoming) nextTravelers.push(incoming);
      }

      if (selectedCategory && selectedTermRef.current) {
        const outgoingTarget = sourceTermRefs.current[selectedCategory];
        if (outgoingTarget) {
          const outgoing = createTraveler(
            selectedCategory,
            'outgoing',
            readRect(selectedTermRef.current),
            readRect(outgoingTarget)
          );
          if (outgoing) nextTravelers.push(outgoing);
        }
      }
    }

    setTravelers(nextTravelers);
    setAssignments((current) => ({ ...current, [statementId]: category }));
    setWrongStatementIds((current) => current.filter((id) => id !== statementId));
  }

  function clearStatement(statementId: string): void {
    if (interactionLocked) return;

    const nextTravelers: TermTraveler[] = [];
    if (
      !prefersReducedMotion
      && selectedCategory
      && selectedTermRef.current
      && sourceTermRefs.current[selectedCategory]
    ) {
      const outgoing = createTraveler(
        selectedCategory,
        'outgoing',
        readRect(selectedTermRef.current),
        readRect(sourceTermRefs.current[selectedCategory])
      );
      if (outgoing) nextTravelers.push(outgoing);
    }

    setTravelers(nextTravelers);
    setAssignments((current) => {
      const next = { ...current };
      delete next[statementId];
      return next;
    });
    setWrongStatementIds((current) => current.filter((id) => id !== statementId));
  }

  function toggleTranslation(): void {
    if (!activeStatement?.translationEs || pending) return;
    const opening = translationOpenId !== activeStatement.id;
    setTranslationOpenId(opening ? activeStatement.id : null);
    if (opening && !translatedStatementIdsRef.current.has(activeStatement.id)) {
      translatedStatementIdsRef.current.add(activeStatement.id);
      onAssistance('translation_opened', activeStatement.id);
    }
  }

  function handleDragEnd(category: CrearResponseCategory, info: PanInfo): void {
    const target = dropTargetRef.current?.getBoundingClientRect();
    if (target && activeStatement) {
      const insideTarget =
        info.point.x >= target.left &&
        info.point.x <= target.right &&
        info.point.y >= target.top &&
        info.point.y <= target.bottom;
      if (insideTarget) assignStatement(activeStatement.id, category, false);
    }
    setDraggingCategory(null);
    window.requestAnimationFrame(() => {
      didDragRef.current = false;
    });
  }

  function continueMap(): void {
    if (!activeStatement || !selectedCategory || interactionLocked) return;

    const nextAttempt = (statementAttemptsRef.current[activeStatement.id] ?? 0) + 1;
    const correct = selectedCategory === activeStatement.correctCategory;
    statementAttemptsRef.current[activeStatement.id] = nextAttempt;
    onAttempt({
      statementId: activeStatement.id,
      category: selectedCategory,
      correct,
      attempt: nextAttempt,
      assignments,
      assisted: effectiveAssistance,
    });

    if (!correct) {
      setWrongStatementIds([activeStatement.id]);
      setHadIncorrectMap(true);
      if (!assistedStatementIdsRef.current.has(activeStatement.id)) {
        assistedStatementIdsRef.current.add(activeStatement.id);
        onAssistance('map_retry', activeStatement.id);
      }
      return;
    }

    if (activeIndex < config.statements.length - 1) {
      setWrongStatementIds([]);
      setTranslationOpenId(null);
      setActiveIndex((current) => current + 1);
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
        <h2 className={styles.productionTitle}>Escribe tu propia deducción.</h2>
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
        <p>Pista {activeIndex + 1} de {config.statements.length}</p>
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0.1 : 0.22 }}
            >
              <div className={styles.mapEvidenceRow}>
                {config.artifact ? (
                  <CinematicCaseArtifact
                    artifact={config.artifact}
                    cue={activeStatement.visualCue}
                    compact
                  />
                ) : null}
                <div className={styles.mapClueBlock}>
                  <div
                    className={styles.mapClueViewport}
                    data-testid="certainty-map-clue"
                    aria-live="polite"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.p
                        className={styles.mapClue}
                        data-language={
                          translationOpenId === activeStatement.id ? 'es' : 'en'
                        }
                        key={
                          translationOpenId === activeStatement.id
                            ? `${activeStatement.id}-es`
                            : `${activeStatement.id}-en`
                        }
                        lang={
                          translationOpenId === activeStatement.id ? 'es-MX' : 'en-US'
                        }
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: prefersReducedMotion ? 0.1 : 0.18 }}
                      >
                        {translationOpenId === activeStatement.id
                          ? activeStatement.translationEs
                          : activeStatement.clue}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                  {activeStatement.translationEs ? (
                    <button
                      className={styles.translationAction}
                      type="button"
                      aria-label={
                        translationOpenId === activeStatement.id
                          ? 'Mostrar pista en inglés'
                          : 'Mostrar pista en español'
                      }
                      aria-pressed={translationOpenId === activeStatement.id}
                      onClick={toggleTranslation}
                    >
                      <Languages size={18} aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              </div>
              <p
                className={styles.mapSentence}
                data-testid="certainty-map-sentence"
                lang="en-US"
              >
                <span>{activeStatement.sentenceStart}</span>
                <motion.button
                  ref={dropTargetRef}
                  className={`${styles.mapDropTarget} ${styles.mapTermLabel}`}
                  type="button"
                  data-testid="certainty-map-drop-target"
                  data-filled={selectedTerm ? 'true' : 'false'}
                  data-dragging={draggingCategory ? 'true' : 'false'}
                  data-error={currentNeedsCorrection ? 'true' : 'false'}
                  aria-disabled={!selectedTerm || interactionLocked}
                  aria-label={
                    selectedTerm
                      ? `Espacio completado con ${selectedTerm}. Toca para cambiarlo`
                      : 'Espacio para la expresión'
                  }
                  tabIndex={selectedTerm ? 0 : -1}
                  onClick={() => {
                    if (selectedTerm) clearStatement(activeStatement.id);
                  }}
                  animate={
                    draggingCategory && !prefersReducedMotion
                      ? { scale: 1.025 }
                      : { scale: 1 }
                  }
                  transition={{ duration: 0.16 }}
                >
                  {selectedTerm && selectedCategory ? (
                    <span
                      ref={selectedTermRef}
                      className={`${styles.mapSelectedTerm} ${styles.mapTermLabel}`}
                      data-suppressed={
                        travelers.some((traveler) =>
                          traveler.direction === 'incoming'
                          && traveler.category === selectedCategory
                        )
                          ? 'true'
                          : 'false'
                      }
                      data-testid="selected-certainty-term"
                    >
                      {selectedTerm}
                    </span>
                  ) : null}
                </motion.button>
                <span>{activeStatement.sentenceEnd}</span>
              </p>

              {currentNeedsCorrection ? (
                <p className={styles.mapFeedback} role="status" aria-live="polite">
                  {activeStatement.feedbackIncorrecto
                    ?? 'La pista permite un nivel de seguridad distinto. Prueba otra expresión.'}
                </p>
              ) : null}
            </motion.article>
          ) : null}
      </AnimatePresence>

      <div className={styles.mapControls} data-testid="certainty-map-controls">
          <div
            className={styles.optionTray}
            role="group"
            aria-label="Expresiones para completar la frase"
          >
            {config.categories.map((category) => {
              const vacant = selectedCategory === category.id;
              const returning = travelers.some((traveler) =>
                traveler.direction === 'outgoing' && traveler.category === category.id
              );
              return (
                <div
                  className={styles.mapTokenSlot}
                  data-testid={`certainty-term-slot-${category.id}`}
                  data-vacant={vacant ? 'true' : 'false'}
                  key={category.id}
                >
                  <motion.button
                    className={styles.mapToken}
                    type="button"
                    disabled={!activeStatement || interactionLocked || vacant}
                    drag={!interactionLocked && !vacant}
                    dragSnapToOrigin
                    dragMomentum={false}
                    dragElastic={0.08}
                    data-suppressed={vacant || returning ? 'true' : 'false'}
                    aria-hidden={vacant ? 'true' : undefined}
                    tabIndex={vacant ? -1 : undefined}
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
                    whileDrag={
                      prefersReducedMotion ? undefined : { scale: 1.04, zIndex: 2 }
                    }
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                    aria-label={`Elegir ${category.term} para completar la frase`}
                  >
                    <span
                      className={styles.mapTermLabel}
                      ref={(element) => {
                        sourceTermRefs.current[category.id] = element;
                      }}
                      data-testid={`certainty-source-term-${category.id}`}
                    >
                      {category.term}
                    </span>
                  </motion.button>
                </div>
              );
            })}
          </div>

          <button
            className={styles.primaryAction}
            disabled={!selectedCategory || interactionLocked}
            type="button"
            onClick={continueMap}
          >
            <span>
              {activeIndex < config.statements.length - 1 ? 'Siguiente' : 'Comprobar'}
            </span>
            <ArrowRight size={18} />
          </button>
      </div>

      {typeof document !== 'undefined' && travelers.length > 0
        ? createPortal(
          <>
            {travelers.map((traveler) => (
              <motion.span
                aria-hidden="true"
                className={`${styles.termTraveler} ${styles.mapTermLabel}`}
                data-category={traveler.category}
                data-direction={traveler.direction}
                data-term-traveler="true"
                data-testid={
                  `certainty-term-traveler-${traveler.direction}-${traveler.category}`
                }
                initial={{ x: 0, y: 0 }}
                animate={{
                  x: traveler.to.left - traveler.from.left,
                  y: traveler.to.top - traveler.from.top,
                }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                key={traveler.id}
                onAnimationComplete={() => {
                  setTravelers((current) =>
                    current.filter((candidate) => candidate.id !== traveler.id)
                  );
                }}
                style={{
                  height: traveler.from.height,
                  left: traveler.from.left,
                  top: traveler.from.top,
                  width: traveler.from.width,
                }}
              >
                {traveler.term}
              </motion.span>
            ))}
          </>,
          document.body
        )
        : null}
    </section>
  );
}

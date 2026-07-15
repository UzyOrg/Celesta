"use client";

import { ArrowRight, Check, Lightbulb, X } from 'lucide-react';
import styles from './CrearLessonPlayer.module.css';

interface VerdictCardProps {
  lessonTitle: string;
  verdict?: string;
  onRestart: () => void;
}

export function VerdictCard({ lessonTitle, verdict, onRestart }: VerdictCardProps) {
  return (
    <section className={styles.completeShell} aria-labelledby="crear-complete-title">
      <header className={styles.screenBar}>
        <button className={styles.closeButton} type="button" onClick={onRestart} aria-label="Elegir otro misterio">
          <X size={22} />
        </button>
        <p className={styles.screenTitle}>Transferencia</p>
        <span className={styles.screenBarSlot} aria-hidden="true" />
      </header>

      <div className={styles.completePanel}>
        <span className={styles.completeIcon}>
          <Check size={26} />
        </span>
        <h2 id="crear-complete-title">Ya tienes la idea</h2>
        <p>La prueba no fue memorizarla. Fue usarla en otro caso.</p>
        <p className={styles.completeContext}>{lessonTitle}</p>

        <div className={styles.insightPanel}>
          <span className={styles.insightLabel}>
            <Lightbulb size={17} />
            Idea aplicada
          </span>
          <p>
            Reconociste el patrón y lo llevaste a un contexto nuevo. Esa transferencia es la señal
            importante.
          </p>
          {verdict ? <strong className={styles.savedVerdict}>{verdict}</strong> : null}
        </div>

        <button className={`${styles.primaryButton} ${styles.restartButton}`} type="button" onClick={onRestart}>
          Elegir otro misterio
          <ArrowRight size={17} />
        </button>
      </div>
    </section>
  );
}

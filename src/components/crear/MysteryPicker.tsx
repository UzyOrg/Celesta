"use client";

import { ChevronRight } from 'lucide-react';
import type { CrearLessonId } from '@/lib/crear/types';
import { CREAR_LESSONS } from '@/lib/crear/types';
import styles from './CrearLessonPlayer.module.css';

interface MysteryPickerProps {
  disabled?: boolean;
  onSelect: (id: CrearLessonId) => void;
}

export function MysteryPicker({ disabled = false, onSelect }: MysteryPickerProps) {
  return (
    <section className={styles.picker} aria-labelledby="crear-title">
      <header className={styles.screenBar}>
        <span className={styles.screenBarSlot} aria-hidden="true" />
        <p className={styles.screenTitle}>Misterios</p>
        <span className={styles.screenBarSlot} aria-hidden="true" />
      </header>

      <div className={styles.pickerIntro}>
        <h1 id="crear-title">Elige un misterio</h1>
        <p>Descubre una idea y pruébala en otro caso.</p>
      </div>

      <div className={styles.mysteryGrid}>
        {CREAR_LESSONS.map((lesson) => (
          <button
            className={styles.mysteryButton}
            disabled={disabled}
            key={lesson.id}
            onClick={() => onSelect(lesson.id)}
            type="button"
          >
            <span>
              <small>{lesson.title}</small>
              <strong>{lesson.subtitle}</strong>
            </span>
            <ChevronRight className={styles.mysteryArrow} size={22} aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}

"use client";

import type { CrearPrecheck } from '@/lib/crear/types';
import { CinematicPrecheck, type CinematicPrecheckPreviewState } from './CinematicPrecheck';
import playerStyles from './CinematicEnglishPlayer.hallmark.module.css';
import styles from './CinematicPrecheck.module.css';

const previewConfig: CrearPrecheck = {
  options: [
    { id: 'casi_seguro', label: 'Es seguro' },
    { id: 'posible', label: 'Podría ser' },
    { id: 'imposible', label: 'No puede ser' },
  ],
  items: [
    {
      id: 'sofia',
      clue: 'Sofía tenía pintura azul fresca en las manos. El cartel tenía la misma pintura.',
      prompt: 'Sobre Sofía, dirías que…',
      correctCategory: 'casi_seguro',
    },
    {
      id: 'mateo',
      clue: 'Mateo se quedó en el salón. Nadie vio en qué trabajó.',
      prompt: 'Sobre Mateo, dirías que…',
      correctCategory: 'posible',
    },
    {
      id: 'renata',
      clue: 'Renata estaba en otro plantel cuando cambiaron el cartel.',
      prompt: 'Sobre Renata, dirías que…',
      correctCategory: 'imposible',
    },
  ],
};

const states: CinematicPrecheckPreviewState[] = [
  'default',
  'hover',
  'focus',
  'active',
  'disabled',
  'loading',
  'error',
  'success',
];

/** Development-only Hallmark fixture. It is deliberately not routed in production. */
export function CinematicPrecheckPreview() {
  return (
    <main className={`${playerStyles.pageShell} ${styles.preview}`} lang="es-MX">
      <h1>Pre-check — 8 estados</h1>
      <div className={styles.previewList}>
        {states.map((state) => (
          <section className={styles.previewState} key={state}>
            <h2>{state}</h2>
            <CinematicPrecheck
              config={previewConfig}
              pending={state === 'loading'}
              onAttempt={() => undefined}
              onComplete={() => undefined}
              previewState={state}
            />
          </section>
        ))}
      </div>
    </main>
  );
}

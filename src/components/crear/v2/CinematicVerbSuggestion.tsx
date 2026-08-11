import type { CrearVerbSuggestion } from '@/lib/crear/types';
import styles from './CinematicVerbSuggestion.module.css';

interface CinematicVerbSuggestionProps {
  suggestion: CrearVerbSuggestion;
}

export function CinematicVerbSuggestion({
  suggestion,
}: CinematicVerbSuggestionProps) {
  return (
    <p className={styles.suggestion}>
      <span>{suggestion.label}:</span>{' '}
      <strong lang="en-US">{suggestion.base}</strong>
    </p>
  );
}

"use client";

import { Pause, Play, RotateCcw, Volume2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { CrearAudioLine } from '@/lib/crear/types';
import type { CinematicVoiceStatus } from './useCinematicNarration';
import styles from './CinematicEnglishPlayer.module.css';

interface CinematicVoiceProps {
  audio: CrearAudioLine;
  status: CinematicVoiceStatus;
  compact?: boolean;
  onToggle: () => void | Promise<void>;
}

export function CinematicVoice({
  audio,
  status,
  compact = false,
  onToggle,
}: CinematicVoiceProps) {
  const actionLabel = status === 'playing' ? 'Pausar voz' : status === 'ended' ? 'Repetir voz' : 'Reproducir voz';
  const VoiceIcon = status === 'playing' ? Pause : status === 'ended' ? RotateCcw : Play;

  return (
    <section
      className={`${styles.voicePresence} ${compact ? styles.voicePresenceCompact : ''}`}
      data-voice-state={status}
      aria-label="Voz de Celestea"
    >
      <button className={styles.voiceControl} type="button" onClick={onToggle} aria-label={actionLabel}>
        <span className={styles.voiceHalo} aria-hidden="true" />
        <span className={styles.voiceOrbit} aria-hidden="true" />
        <span className={styles.voiceCore} aria-hidden="true">
          <Volume2 className={styles.voiceCoreGhost} size={compact ? 18 : 22} />
          <VoiceIcon className={styles.voiceCoreIcon} size={compact ? 18 : 24} />
        </span>
        <span className={styles.voiceBars} aria-hidden="true">
          {Array.from({ length: 7 }, (_, index) => (
            <span key={index} style={{ '--bar-index': index } as CSSProperties} />
          ))}
        </span>
      </button>

      <div className={styles.voiceTranscript}>
        <span className={styles.voiceLabel}>
          <span className={styles.liveDot} aria-hidden="true" />
          {audio.label ?? 'Voz de Celestea'}
        </span>
        <p lang={audio.lang ?? 'en-US'}>{audio.text}</p>
        {status === 'error' ? <small>El audio no cargó; el texto sigue disponible.</small> : null}
      </div>
    </section>
  );
}

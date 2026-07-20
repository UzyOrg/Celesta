"use client";

import { Pause, Play, RotateCcw, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { CrearAudioLine } from '@/lib/crear/types';
import styles from './CinematicEnglishPlayer.module.css';

export type CinematicVoiceStatus = 'ready' | 'playing' | 'paused' | 'ended' | 'error';

interface CinematicVoiceProps {
  audio: CrearAudioLine;
  sceneKey: string;
  compact?: boolean;
  onStatusChange?: (status: CinematicVoiceStatus) => void;
}

const speechFallbackEnabled = process.env.NEXT_PUBLIC_CREAR_TTS_FALLBACK === '1';

export function CinematicVoice({
  audio,
  sceneKey,
  compact = false,
  onStatusChange,
}: CinematicVoiceProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fallbackActiveRef = useRef(false);
  const [status, setStatus] = useState<CinematicVoiceStatus>('ready');

  function updateStatus(next: CinematicVoiceStatus) {
    setStatus(next);
    onStatusChange?.(next);
  }

  useEffect(() => {
    const player = audioRef.current;
    window.speechSynthesis?.cancel();
    fallbackActiveRef.current = false;
    if (player) {
      player.pause();
      player.currentTime = 0;
      player.load();
    }
    updateStatus('ready');

    return () => {
      player?.pause();
      window.speechSynthesis?.cancel();
    };
    // onStatusChange is intentionally omitted: scene changes own the reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneKey, audio.src]);

  useEffect(() => {
    function handleVisibilityChange() {
      const player = audioRef.current;
      if (document.hidden && player && !player.paused) {
        player.pause();
        updateStatus('paused');
      }
      if (document.hidden && fallbackActiveRef.current && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        updateStatus('paused');
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    // onStatusChange is intentionally handled through updateStatus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function speakWithFallback() {
    if (!speechFallbackEnabled || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    fallbackActiveRef.current = true;
    const utterance = new SpeechSynthesisUtterance(audio.text);
    utterance.lang = audio.lang ?? 'en-US';
    utterance.rate = 0.94;
    utterance.onstart = () => updateStatus('playing');
    utterance.onend = () => {
      fallbackActiveRef.current = false;
      updateStatus('ended');
    };
    utterance.onerror = () => {
      fallbackActiveRef.current = false;
      updateStatus('error');
    };
    window.speechSynthesis.speak(utterance);
  }

  async function handleToggle() {
    const player = audioRef.current;
    if (!player) return;

    if (status === 'playing') {
      if (fallbackActiveRef.current) {
        window.speechSynthesis.pause();
      } else {
        player.pause();
      }
      updateStatus('paused');
      return;
    }

    if (status === 'paused' && fallbackActiveRef.current && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      updateStatus('playing');
      return;
    }

    if (status === 'ended') player.currentTime = 0;

    try {
      window.speechSynthesis?.cancel();
      fallbackActiveRef.current = false;
      await player.play();
      updateStatus('playing');
    } catch {
      // A browser or automated test surface can block playback even after a
      // direct gesture. That is not a media-load failure; keep the transcript
      // and retry control available instead of showing a false error.
      updateStatus('paused');
      speakWithFallback();
    }
  }

  const actionLabel = status === 'playing' ? 'Pausar voz' : status === 'ended' ? 'Repetir voz' : 'Reproducir voz';
  const VoiceIcon = status === 'playing' ? Pause : status === 'ended' ? RotateCcw : Play;

  return (
    <section
      className={`${styles.voicePresence} ${compact ? styles.voicePresenceCompact : ''}`}
      data-voice-state={status}
      aria-label="Voz de Celestea"
    >
      <audio
        ref={audioRef}
        preload="metadata"
        src={audio.src}
        onEnded={() => updateStatus('ended')}
        onError={() => updateStatus('error')}
        onPause={() => setStatus((current) => (current === 'playing' ? 'paused' : current))}
        onPlay={() => updateStatus('playing')}
      />

      <button className={styles.voiceControl} type="button" onClick={handleToggle} aria-label={actionLabel}>
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

"use client";

import { Pause, Play, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { CrearAudioLine } from '@/lib/crear/types';
import styles from './CrearLessonPlayer.module.css';

interface VoiceLineProps {
  audio: CrearAudioLine;
  autoplayKey: string;
  variant?: 'orb' | 'card';
}

type VoiceStatus = 'ready' | 'playing' | 'paused' | 'ended' | 'error';

const speechFallbackEnabled = process.env.NEXT_PUBLIC_CREAR_TTS_FALLBACK === '1';

function splitVoicePrompt(text: string): { primary: string; secondary?: string } {
  const firstQuestionEnd = text.indexOf('?');
  if (firstQuestionEnd < 0 || firstQuestionEnd >= text.length - 1) {
    return { primary: text };
  }

  return {
    primary: text.slice(0, firstQuestionEnd + 1).trim(),
    secondary: text.slice(firstQuestionEnd + 1).trim(),
  };
}

export function VoiceLine({ audio, autoplayKey, variant = 'orb' }: VoiceLineProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [status, setStatus] = useState<VoiceStatus>('ready');

  useEffect(() => {
    setStatus('ready');
    const player = audioRef.current;
    if (!player) return;

    player.pause();
    player.currentTime = 0;
    player.load();
  }, [autoplayKey, audio.src]);

  function speakWithFallback() {
    if (!speechFallbackEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(audio.text);
    utterance.lang = 'es-MX';
    utterance.rate = 0.95;
    utterance.onstart = () => setStatus('playing');
    utterance.onend = () => setStatus('ended');
    utterance.onerror = () => setStatus('error');
    window.speechSynthesis.speak(utterance);
  }

  async function handleToggle() {
    const player = audioRef.current;
    if (!player) return;

    if (status === 'playing') {
      player.pause();
      setStatus('paused');
      return;
    }

    try {
      await player.play();
      setStatus('playing');
    } catch {
      setStatus('error');
      speakWithFallback();
    }
  }

  const label = status === 'playing' ? 'Pausar voz' : 'Reproducir voz';
  const buttonClassName = `${styles.voiceButton} ${status === 'playing' ? styles.voiceButtonActive : ''}`;
  const compactPrompt = splitVoicePrompt(audio.text);

  if (variant === 'card') {
    return (
      <div className={styles.hypothesisVoiceCard}>
        <audio
          ref={audioRef}
          preload="metadata"
          src={audio.src}
          onEnded={() => setStatus('ended')}
          onError={() => setStatus('error')}
          onPause={() => setStatus((current) => (current === 'playing' ? 'paused' : current))}
          onPlay={() => setStatus('playing')}
        />
        <button className={styles.hypothesisVoiceButton} type="button" onClick={handleToggle} aria-label={label} title={label}>
          {status === 'playing' ? <Pause size={24} /> : <Volume2 size={24} />}
        </button>
        <div className={styles.hypothesisVoiceText}>
          <strong>{compactPrompt.primary}</strong>
          {compactPrompt.secondary ? <span>{compactPrompt.secondary}</span> : null}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.voiceLine}>
      <audio
        ref={audioRef}
        preload="metadata"
        src={audio.src}
        onEnded={() => setStatus('ended')}
        onError={() => setStatus('error')}
        onPause={() => setStatus((current) => (current === 'playing' ? 'paused' : current))}
        onPlay={() => setStatus('playing')}
      />
      <div className={styles.voiceOrbWrap}>
        <span className={styles.voiceRing} aria-hidden="true" />
        <span className={styles.voiceRingInner} aria-hidden="true" />
        <button className={buttonClassName} type="button" onClick={handleToggle} aria-label={label} title={label}>
          {status === 'playing' ? <Pause size={26} /> : <Play size={26} />}
        </button>
      </div>
      <div className={styles.voiceCopy}>
        <span className={styles.voiceEyebrow}>
          <span className={styles.voiceDot} aria-hidden="true" />
          Voz de Celestea
        </span>
        <p>{audio.text}</p>
      </div>
    </div>
  );
}

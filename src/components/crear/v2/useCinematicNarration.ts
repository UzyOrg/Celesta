"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CrearAudioLine } from '@/lib/crear/types';

export type CinematicVoiceStatus = 'ready' | 'playing' | 'paused' | 'ended' | 'error';

interface UseCinematicNarrationOptions {
  audio?: CrearAudioLine;
  sceneKey: string;
  pageHidden: boolean;
}

interface TransitionRequest {
  audio?: CrearAudioLine;
  sceneKey: string;
  transitionMs: number;
}

const speechFallbackEnabled = process.env.NEXT_PUBLIC_CREAR_TTS_FALLBACK === '1';
const AUDIO_FADE_MS = 180;
const AUDIO_EXIT_FADE_MS = 100;

function resolveAudioSource(src: string): string {
  return new URL(src, window.location.href).href;
}

export function useCinematicNarration({
  audio,
  sceneKey,
  pageHidden,
}: UseCinematicNarrationOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preparedSceneRef = useRef<string | null>(null);
  const fallbackActiveRef = useRef(false);
  const transitionTimerRef = useRef<number | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  const fadeFrameRef = useRef<number | null>(null);
  const [status, setStatus] = useState<CinematicVoiceStatus>('ready');

  const cancelTimers = useCallback(() => {
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    if (exitTimerRef.current !== null) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    if (fadeFrameRef.current !== null) {
      window.cancelAnimationFrame(fadeFrameRef.current);
      fadeFrameRef.current = null;
    }
  }, []);

  const stopFallback = useCallback(() => {
    window.speechSynthesis?.cancel();
    fallbackActiveRef.current = false;
  }, []);

  const loadAudio = useCallback((nextAudio?: CrearAudioLine, nextSceneKey?: string) => {
    const player = audioRef.current;
    if (!player) return;

    player.pause();
    player.currentTime = 0;
    player.volume = 1;
    player.dataset.sceneKey = nextSceneKey ?? '';

    if (!nextAudio) {
      player.removeAttribute('src');
      player.load();
      setStatus('ready');
      return;
    }

    const nextSource = resolveAudioSource(nextAudio.src);
    if (player.src !== nextSource) player.src = nextSource;
    player.load();
    setStatus('ready');
  }, []);

  const fadeTo = useCallback((target: number, durationMs: number, onComplete?: () => void) => {
    const player = audioRef.current;
    if (!player) return;
    if (fadeFrameRef.current !== null) window.cancelAnimationFrame(fadeFrameRef.current);

    const startVolume = player.volume;
    const startedAt = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / Math.max(durationMs, 1));
      player.volume = startVolume + (target - startVolume) * progress;
      if (progress < 1) {
        fadeFrameRef.current = window.requestAnimationFrame(tick);
        return;
      }
      fadeFrameRef.current = null;
      onComplete?.();
    };
    fadeFrameRef.current = window.requestAnimationFrame(tick);
  }, []);

  const speakWithFallback = useCallback((line: CrearAudioLine) => {
    if (!speechFallbackEnabled || !('speechSynthesis' in window)) return;

    stopFallback();
    fallbackActiveRef.current = true;
    const utterance = new SpeechSynthesisUtterance(line.text);
    utterance.lang = line.lang ?? 'en-US';
    utterance.rate = 0.94;
    utterance.onstart = () => setStatus('playing');
    utterance.onend = () => {
      fallbackActiveRef.current = false;
      setStatus('ended');
    };
    utterance.onerror = () => {
      fallbackActiveRef.current = false;
      setStatus('error');
    };
    window.speechSynthesis.speak(utterance);
  }, [stopFallback]);

  const playCurrent = useCallback(async (line: CrearAudioLine, fadeIn: boolean) => {
    const player = audioRef.current;
    if (!player) return;

    stopFallback();
    if (player.ended || status === 'ended') player.currentTime = 0;
    player.volume = fadeIn ? 0 : 1;

    try {
      await player.play();
      setStatus('playing');
      if (fadeIn) fadeTo(1, AUDIO_FADE_MS);
    } catch {
      player.volume = 1;
      setStatus('paused');
      if (!fadeIn) speakWithFallback(line);
    }
  }, [fadeTo, speakWithFallback, status, stopFallback]);

  const pause = useCallback(() => {
    cancelTimers();
    const player = audioRef.current;
    if (fallbackActiveRef.current && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setStatus('paused');
      return;
    }
    if (player && !player.paused) {
      player.pause();
      player.volume = 1;
      setStatus('paused');
    }
  }, [cancelTimers]);

  const toggle = useCallback(async () => {
    if (!audio) return;
    const player = audioRef.current;
    if (!player) return;

    cancelTimers();
    if (status === 'playing') {
      pause();
      return;
    }
    if (status === 'paused' && fallbackActiveRef.current && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setStatus('playing');
      return;
    }
    await playCurrent(audio, false);
  }, [audio, cancelTimers, pause, playCurrent, status]);

  const prepareTransition = useCallback((request: TransitionRequest) => {
    cancelTimers();
    stopFallback();
    preparedSceneRef.current = request.sceneKey;

    const player = audioRef.current;
    if (!player || !request.audio) {
      loadAudio(request.audio, request.sceneKey);
      return;
    }

    const primeNextAudio = (audibleDelayMs: number) => {
      loadAudio(request.audio, request.sceneKey);
      const primedPlayer = audioRef.current;
      if (!primedPlayer || pageHidden) return;

      // Start the persistent media element inside the navigation gesture at
      // volume zero. This preserves autoplay permission across the visual
      // transition, including browsers with strict media policies.
      primedPlayer.volume = 0;
      void primedPlayer.play()
        .then(() => setStatus('playing'))
        .catch(() => setStatus('paused'));

      transitionTimerRef.current = window.setTimeout(() => {
        transitionTimerRef.current = null;
        if (primedPlayer.paused) {
          void playCurrent(request.audio!, true);
          return;
        }
        fadeTo(1, AUDIO_FADE_MS);
      }, Math.max(0, audibleDelayMs));
    };

    if (!player.paused && player.volume > 0) {
      fadeTo(0, AUDIO_EXIT_FADE_MS, () => {
        exitTimerRef.current = window.setTimeout(() => {
          exitTimerRef.current = null;
          primeNextAudio(request.transitionMs - AUDIO_EXIT_FADE_MS);
        }, 0);
      });
      return;
    }

    primeNextAudio(request.transitionMs);
  }, [cancelTimers, fadeTo, loadAudio, pageHidden, playCurrent, stopFallback]);

  useEffect(() => {
    if (preparedSceneRef.current === sceneKey) {
      preparedSceneRef.current = null;
      return;
    }
    cancelTimers();
    stopFallback();
    loadAudio(audio, sceneKey);
  }, [audio, cancelTimers, loadAudio, sceneKey, stopFallback]);

  useEffect(() => {
    if (pageHidden) pause();
  }, [pageHidden, pause]);

  useEffect(() => () => {
    cancelTimers();
    stopFallback();
    audioRef.current?.pause();
  }, [cancelTimers, stopFallback]);

  return {
    audioRef,
    pause,
    prepareTransition,
    status,
    toggle,
    onEnded: () => setStatus('ended' as const),
    onError: () => setStatus('error' as const),
    onPause: () => setStatus((current) => (current === 'playing' ? 'paused' : current)),
    onPlay: () => setStatus('playing' as const),
  };
}

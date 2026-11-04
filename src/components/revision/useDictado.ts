'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiProfesor, ErrorDelProfesor } from './clienteProfesor';

/** Un dictado se corta solo a los 30 segundos: una petición, no un discurso. */
const MAX_DICTADO_MS = 30_000;

interface OpcionesDictado {
  token: string;
  /** El texto que entendió el transcriptor; el profesor lo revisa antes de enviarlo. */
  alEntender: (texto: string) => void;
  alFallar: (mensaje: string) => void;
}

/**
 * Dictado del profesor en la barra de Celestea. El micrófono se abre solo con un
 * toque, la grabación va al servidor a transcribirse y el texto vuelve al campo.
 * El audio no se guarda en ningún lado.
 */
export function useDictado({ token, alEntender, alFallar }: OpcionesDictado) {
  const [escuchando, setEscuchando] = useState(false);
  const [transcribiendo, setTranscribiendo] = useState(false);
  const grabadora = useRef<MediaRecorder | null>(null);
  const corte = useRef<ReturnType<typeof setTimeout>>(undefined);

  const soltar = useCallback(() => {
    clearTimeout(corte.current);
    const actual = grabadora.current;
    grabadora.current = null;
    actual?.stream.getTracks().forEach((pista) => pista.stop());
  }, []);

  useEffect(() => soltar, [soltar]);

  const detener = useCallback(() => {
    if (grabadora.current?.state === 'recording') grabadora.current.stop();
  }, []);

  const empezar = useCallback(async () => {
    let flujo: MediaStream;
    try {
      flujo = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      alFallar('No pude usar el micrófono. Puedes escribir tu petición.');
      return;
    }
    const partes: Blob[] = [];
    const nueva = new MediaRecorder(flujo);
    grabadora.current = nueva;
    nueva.ondataavailable = (evento) => {
      if (evento.data.size > 0) partes.push(evento.data);
    };
    nueva.onstop = () => {
      const tipo = nueva.mimeType || 'audio/webm';
      flujo.getTracks().forEach((pista) => pista.stop());
      setEscuchando(false);
      if (partes.length === 0) return;
      setTranscribiendo(true);
      apiProfesor
        .dictado(token, new Blob(partes, { type: tipo }))
        .then(({ texto }) => (texto ? alEntender(texto) : alFallar('No alcancé a oír nada. Inténtalo otra vez.')))
        .catch((causa: unknown) => alFallar(causa instanceof ErrorDelProfesor ? causa.message : 'No pude entender el audio.'))
        .finally(() => setTranscribiendo(false));
    };
    nueva.start();
    setEscuchando(true);
    corte.current = setTimeout(detener, MAX_DICTADO_MS);
  }, [token, alEntender, alFallar, detener]);

  const alternar = useCallback(() => {
    if (transcribiendo) return;
    if (escuchando) detener();
    else void empezar();
  }, [escuchando, transcribiendo, detener, empezar]);

  return { escuchando, transcribiendo, alternar };
}

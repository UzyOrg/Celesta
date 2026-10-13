'use client';

import { useEffect } from 'react';
import { apiProfesor } from './clienteProfesor';

/** Sin tocar la pantalla por tanto tiempo, se deja de contar: la persona se fue a otra cosa. */
const MS_INACTIVIDAD = 60_000;
const MS_ENTRE_AVISOS = 20_000;

/**
 * Mide cuánto tiempo activo pasa el profesor con un reporte abierto y lo avisa al servidor:
 * un primer aviso abre la medición y los siguientes la actualizan (el tiempo solo crece).
 * Cuenta solo con la pestaña a la vista y con actividad reciente; al salir manda lo último.
 * No guarda nada en el navegador y, si el aviso falla, el reporte sigue como si nada.
 */
export function useTiempoDeRevision(enlace: string, defensaId: string | undefined, activo: boolean): void {
  useEffect(() => {
    if (!activo || !defensaId) return undefined;

    let activoMs = 0;
    let enviado = 0;
    let apertura: string | undefined;
    let enVuelo = false;
    let ultimaActividad = Date.now();

    const alActividad = () => {
      ultimaActividad = Date.now();
    };
    const eventos = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'] as const;
    for (const nombre of eventos) window.addEventListener(nombre, alActividad, { passive: true });

    const contando = () => document.visibilityState === 'visible' && Date.now() - ultimaActividad < MS_INACTIVIDAD;

    const enviar = (alSalir: boolean) => {
      if (enVuelo && !alSalir) return;
      if (apertura !== undefined && activoMs === enviado) return;
      enVuelo = true;
      const medido = activoMs;
      apiProfesor
        .tiempo(enlace, { defensaId, ...(apertura ? { aperturaId: apertura } : {}), activoMs: medido }, alSalir)
        .then((respuesta) => {
          apertura = respuesta.aperturaId;
          enviado = medido;
        })
        .catch(() => undefined)
        .finally(() => {
          enVuelo = false;
        });
    };

    // Abre la medición apenas se abre el reporte, para que luego solo haya que actualizarla.
    enviar(false);

    const cada1s = window.setInterval(() => {
      if (contando()) activoMs += 1_000;
    }, 1_000);
    const cadaAviso = window.setInterval(() => enviar(false), MS_ENTRE_AVISOS);
    const alOcultar = () => {
      if (document.visibilityState === 'hidden') enviar(true);
    };
    const alSalir = () => enviar(true);
    document.addEventListener('visibilitychange', alOcultar);
    window.addEventListener('pagehide', alSalir);

    return () => {
      window.clearInterval(cada1s);
      window.clearInterval(cadaAviso);
      document.removeEventListener('visibilitychange', alOcultar);
      window.removeEventListener('pagehide', alSalir);
      for (const nombre of eventos) window.removeEventListener(nombre, alActividad);
      enviar(true);
    };
  }, [enlace, defensaId, activo]);
}

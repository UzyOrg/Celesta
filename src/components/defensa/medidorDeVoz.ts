'use client';

import { useEffect, useState } from 'react';
import { UMBRAL_VOZ } from './microfono';
import { alturasDeBarras, nivelRms, suavizarAlturas } from './nivelDeVoz';

/**
 * Un solo medidor del micrófono para todo el flujo: la prueba de "Di «hola»", el detector de
 * "Sin prisa" y las barras que siguen la voz leen el mismo AnalyserNode, en un solo AudioContext.
 *
 * Solo mide: no guarda ni manda audio, y no toca la grabación (`grabador.ts` y `colaSubida.ts`
 * leen el micrófono por su lado). Pensado para teléfonos de gama baja:
 *  - un solo cuadro (`requestAnimationFrame`) con tope de ~30 por segundo;
 *  - nada corre si no hay micrófono, si nadie escucha o si la pestaña no está a la vista;
 *  - al desconectar o cerrar se sueltan los nodos y se cancela el cuadro.
 */

/** Tamaño de la ventana: 512 muestras (~11 ms) alcanzan para una voz grave y dan 256 casillas. */
const FFT = 512;
/** Tope de cuadros: ~30 por segundo. */
const MS_POR_CUADRO = 1000 / 30;
/** La prueba y "Sin prisa" reciben una muestra cada 100 ms, como antes (`evaluarPrueba` cuenta con eso). */
const MS_POR_NIVEL = 100;
/** Entre una palabra y otra la voz cae un momento: "hay voz" se sostiene un poco para no parpadear. */
const MS_RETENER_VOZ = 400;

type AlNivel = (nivel: number) => void;
/** Un cuadro para las barras: altura de 0 a 1 de cada una y si ahora hay voz (es `FuenteDeVoz` de `BarrasDeVoz`). */
type AlCuadroDeVoz = (alturas: readonly number[], hayVoz: boolean) => void;

interface OyenteDeCuadros {
  cantidad: number;
  alCuadro: AlCuadroDeVoz;
  alturas: number[];
  vozHasta: number;
}

function constructorDeContexto(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

export class MedidorDeVoz {
  private contexto: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private fuente: MediaStreamAudioSourceNode | null = null;
  private analizador: AnalyserNode | null = null;
  private muestras: Float32Array<ArrayBuffer> = new Float32Array(0);
  private espectro: Uint8Array<ArrayBuffer> = new Uint8Array(0);

  private readonly oyentesDeNivel = new Set<AlNivel>();
  private readonly oyentesDeCuadros = new Set<OyenteDeCuadros>();

  private cuadro: number | null = null;
  private ultimoCuadro = 0;
  private ultimoNivel = 0;
  private escuchandoPagina = false;

  /**
   * Llamar DENTRO de un toque (lo exige iOS): crea el AudioContext o lo reanuda. Fuera de un
   * toque el navegador puede dejarlo en pausa y el analizador no oiría nada.
   */
  desbloquear(): void {
    const contexto = this.obtenerContexto();
    if (contexto && contexto.state !== 'running') void contexto.resume().catch(() => undefined);
  }

  /** Empieza a medir este micrófono (si ya era este, no hace nada). */
  conectar(stream: MediaStream): void {
    if (this.stream === stream && this.analizador) return;
    this.soltarNodos();
    const contexto = this.obtenerContexto();
    if (!contexto) return;
    // Tras recargar no hubo toque todavía: se intenta igual y, si queda en pausa, el siguiente toque lo reanuda.
    if (contexto.state !== 'running') void contexto.resume().catch(() => undefined);
    try {
      const fuente = contexto.createMediaStreamSource(stream);
      const analizador = contexto.createAnalyser();
      analizador.fftSize = FFT;
      // El suavizado lo hacen las barras (sube rápido, baja lento); el del analizador iría parejo en los dos sentidos.
      analizador.smoothingTimeConstant = 0;
      analizador.minDecibels = -90;
      analizador.maxDecibels = -25;
      fuente.connect(analizador);
      this.fuente = fuente;
      this.analizador = analizador;
      this.stream = stream;
      this.muestras = new Float32Array(analizador.fftSize);
      this.espectro = new Uint8Array(analizador.frequencyBinCount);
    } catch {
      // Un micrófono que ya se cerró o un navegador sin Web Audio: no hay medición, todo lo demás sigue.
      this.soltarNodos();
      return;
    }
    this.vigilarPagina(true);
    this.actualizar();
  }

  /** Deja de medir (se soltó el micrófono). El AudioContext se pausa y se reusa con el siguiente. */
  desconectar(): void {
    this.soltarNodos();
    this.vigilarPagina(false);
    this.actualizar();
    if (this.contexto?.state === 'running') void this.contexto.suspend().catch(() => undefined);
  }

  /** Volumen RMS (0 a 1) cada ~100 ms mientras haya micrófono y la página esté a la vista. Devuelve cómo dejar de oír. */
  escucharNivel(alNivel: AlNivel): () => void {
    this.oyentesDeNivel.add(alNivel);
    this.actualizar();
    return () => {
      this.oyentesDeNivel.delete(alNivel);
      this.actualizar();
    };
  }

  /** Alturas (0 a 1) de `cantidad` barras, hasta ~30 veces por segundo: lo que piden las barras de voz. */
  escuchar(cantidad: number, alCuadro: AlCuadroDeVoz): () => void {
    const oyente: OyenteDeCuadros = { cantidad, alCuadro, alturas: new Array<number>(cantidad).fill(0), vozHasta: 0 };
    this.oyentesDeCuadros.add(oyente);
    this.actualizar();
    return () => {
      this.oyentesDeCuadros.delete(oyente);
      this.actualizar();
    };
  }

  /** Al salir del flujo: suelta todo y cierra el AudioContext. Si se vuelve a usar, se crea otro. */
  cerrar(): void {
    this.soltarNodos();
    this.vigilarPagina(false);
    this.detener();
    const contexto = this.contexto;
    this.contexto = null;
    if (contexto && contexto.state !== 'closed') void contexto.close().catch(() => undefined);
  }

  /* ------------------------------ por dentro ------------------------------ */

  private obtenerContexto(): AudioContext | null {
    if (this.contexto && this.contexto.state !== 'closed') return this.contexto;
    const Contexto = constructorDeContexto();
    if (!Contexto) return null;
    try {
      this.contexto = new Contexto();
    } catch {
      this.contexto = null;
    }
    return this.contexto;
  }

  private soltarNodos(): void {
    try {
      this.fuente?.disconnect();
      this.analizador?.disconnect();
    } catch {
      // Ya estaban desconectados.
    }
    this.fuente = null;
    this.analizador = null;
    this.stream = null;
  }

  /** Corre el cuadro solo si hay a quién medir, alguien que escuche y la página se ve. */
  private actualizar(): void {
    const hayOyentes = this.oyentesDeNivel.size > 0 || this.oyentesDeCuadros.size > 0;
    const visible = typeof document === 'undefined' || document.visibilityState !== 'hidden';
    if (this.analizador && hayOyentes && visible) {
      if (this.cuadro === null) {
        this.ultimoCuadro = 0;
        this.ultimoNivel = 0;
        this.cuadro = window.requestAnimationFrame(this.alCuadro);
      }
    } else {
      this.detener();
    }
  }

  private detener(): void {
    if (this.cuadro !== null) {
      window.cancelAnimationFrame(this.cuadro);
      this.cuadro = null;
    }
    // Las barras no se quedan congeladas a media palabra: vuelven a reposo.
    this.oyentesDeCuadros.forEach((oyente) => {
      if (oyente.vozHasta === 0 && oyente.alturas.every((altura) => altura === 0)) return;
      oyente.alturas = new Array<number>(oyente.cantidad).fill(0);
      oyente.vozHasta = 0;
      oyente.alCuadro(oyente.alturas, false);
    });
  }

  private readonly alCuadro = (ahora: number): void => {
    const analizador = this.analizador;
    if (!analizador || !this.contexto) {
      this.cuadro = null;
      return;
    }
    this.cuadro = window.requestAnimationFrame(this.alCuadro);
    // Tope de ~30 cuadros por segundo: en pantallas de 60 Hz se salta uno de cada dos.
    if (this.ultimoCuadro !== 0 && ahora - this.ultimoCuadro < MS_POR_CUADRO - 4) return;
    const ms = this.ultimoCuadro === 0 ? MS_POR_CUADRO : Math.min(ahora - this.ultimoCuadro, 120);
    this.ultimoCuadro = ahora;

    analizador.getFloatTimeDomainData(this.muestras);
    const nivel = nivelRms(this.muestras);

    if (this.oyentesDeNivel.size > 0 && ahora - this.ultimoNivel >= MS_POR_NIVEL - 8) {
      this.ultimoNivel = ahora;
      this.oyentesDeNivel.forEach((alNivel) => alNivel(nivel));
    }

    if (this.oyentesDeCuadros.size === 0) return;
    analizador.getByteFrequencyData(this.espectro);
    const hzPorCasilla = this.contexto.sampleRate / analizador.fftSize;
    const hayVozAhora = nivel >= UMBRAL_VOZ;
    this.oyentesDeCuadros.forEach((oyente) => {
      const objetivo = alturasDeBarras({ frecuencias: this.espectro, nivel, cantidad: oyente.cantidad, hzPorCasilla });
      oyente.alturas = suavizarAlturas(oyente.alturas, objetivo, ms);
      if (hayVozAhora) oyente.vozHasta = ahora + MS_RETENER_VOZ;
      oyente.alCuadro(oyente.alturas, ahora < oyente.vozHasta);
    });
  };

  private readonly alCambiarVisibilidad = (): void => this.actualizar();

  /**
   * Tras recargar, el AudioContext puede nacer en pausa: el primer toque en cualquier parte lo reanuda.
   * Al soltar el dedo (`pointerup`): en un teléfono es ahí donde el navegador cuenta el toque como gesto.
   */
  private readonly alTocar = (): void => {
    if (this.contexto && this.contexto.state !== 'running' && this.contexto.state !== 'closed') {
      void this.contexto.resume().catch(() => undefined);
    }
  };

  private vigilarPagina(vigilar: boolean): void {
    if (typeof document === 'undefined' || vigilar === this.escuchandoPagina) return;
    this.escuchandoPagina = vigilar;
    if (vigilar) {
      document.addEventListener('visibilitychange', this.alCambiarVisibilidad);
      document.addEventListener('pointerup', this.alTocar, true);
      document.addEventListener('keydown', this.alTocar, true);
    } else {
      document.removeEventListener('visibilitychange', this.alCambiarVisibilidad);
      document.removeEventListener('pointerup', this.alTocar, true);
      document.removeEventListener('keydown', this.alTocar, true);
    }
  }
}

/** El medidor del flujo: uno por montaje; al desmontar se cierra (su AudioContext incluido). */
export function useMedidorDeVoz(): MedidorDeVoz {
  const [medidor] = useState(() => new MedidorDeVoz());
  useEffect(() => () => medidor.cerrar(), [medidor]);
  return medidor;
}

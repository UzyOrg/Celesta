/**
 * Cuentas puras del medidor de voz: del espectro del micrófono a la altura de cada barra.
 *
 * No tocan el navegador (ni AudioContext ni el DOM), así que se prueban solas. El medidor
 * (`medidorDeVoz.ts`) las llama en cada cuadro y las barras solo escriben el resultado.
 */

import { UMBRAL_VOZ } from './microfono';

/** Volumen RMS a partir del cual la voz ya se considera fuerte: las barras llegan arriba. */
export const NIVEL_FUERTE = 0.2;

/** Por debajo de esto (de 0 a 1 en la escala del espectro) es el fondo del cuarto, no voz. */
const PISO_ESPECTRO = 0.3;

/** De dónde a dónde se reparten las bandas: del tono más grave de una voz a las eses. */
const DESDE_HZ = 90;
const HASTA_HZ = 5_000;

/** Subida rápida y bajada lenta: las barras siguen cada sílaba pero no parpadean. */
const MS_SUBIDA = 40;
const MS_BAJADA = 220;

const recortar = (valor: number): number => (valor < 0 ? 0 : valor > 1 ? 1 : valor);

/** Volumen RMS (de 0 a 1) de un tramo de muestras: la escala de UMBRAL_VOZ y de `evaluarPrueba`. */
export function nivelRms(muestras: ArrayLike<number>): number {
  if (muestras.length === 0) return 0;
  let suma = 0;
  for (let i = 0; i < muestras.length; i += 1) {
    const muestra = muestras[i] as number;
    suma += muestra * muestra;
  }
  return Math.sqrt(suma / muestras.length);
}

/**
 * Bordes (en casillas del espectro) de `bandas` bandas logarítmicas entre DESDE_HZ y HASTA_HZ.
 * Devuelve `bandas + 1` bordes; cada banda abarca al menos una casilla, aunque en los graves
 * el espectro sea más grueso que la banda.
 */
export function bandasLogaritmicas(bandas: number, casillas: number, hzPorCasilla: number): number[] {
  const bordes: number[] = [];
  const razon = HASTA_HZ / DESDE_HZ;
  for (let k = 0; k <= bandas; k += 1) {
    const hz = DESDE_HZ * Math.pow(razon, k / bandas);
    const minimo = k === 0 ? 1 : (bordes[k - 1] as number) + 1;
    bordes.push(Math.min(casillas, Math.max(minimo, Math.round(hz / hzPorCasilla))));
  }
  return bordes;
}

export interface EntradaDeBarras {
  /** Espectro en bytes (0 a 255), como lo da `AnalyserNode.getByteFrequencyData`. */
  frecuencias: ArrayLike<number>;
  /** Volumen RMS (0 a 1) del mismo instante: decide si hay voz (compuerta) y cuánta. */
  nivel: number;
  /** Cuántas barras se dibujan. */
  cantidad: number;
  /** Hz que abarca cada casilla del espectro: `sampleRate / fftSize`. */
  hzPorCasilla: number;
}

/**
 * Altura (de 0 a 1) de cada barra para un cuadro del micrófono.
 *
 * - Compuerta: bajo UMBRAL_VOZ (el mismo que decide si hay voz en la prueba y en "Sin prisa")
 *   todas quedan en 0, aunque el espectro traiga el ruido del cuarto.
 * - Forma: la mitad de las barras son bandas logarítmicas y la otra mitad su reflejo. Los graves
 *   (donde está casi toda la energía de una voz) van al centro y los agudos a las orillas.
 * - Tamaño: la forma se escala con el volumen; una voz suave apenas sube y una fuerte llega arriba.
 */
export function alturasDeBarras({ frecuencias, nivel, cantidad, hzPorCasilla }: EntradaDeBarras): number[] {
  const alturas = new Array<number>(cantidad).fill(0);
  if (cantidad <= 0 || nivel < UMBRAL_VOZ || frecuencias.length === 0) return alturas;

  const bandas = Math.ceil(cantidad / 2);
  const bordes = bandasLogaritmicas(bandas, frecuencias.length, hzPorCasilla);
  const envolvente = Math.sqrt(recortar((nivel - UMBRAL_VOZ) / (NIVEL_FUERTE - UMBRAL_VOZ)));
  const tamano = 0.35 + 0.65 * envolvente;

  const porBanda: number[] = [];
  for (let banda = 0; banda < bandas; banda += 1) {
    const desde = bordes[banda] as number;
    const hasta = Math.max(desde + 1, bordes[banda + 1] as number);
    let suma = 0;
    let pico = 0;
    let cuantas = 0;
    for (let i = desde; i < hasta && i < frecuencias.length; i += 1) {
      const valor = (frecuencias[i] as number) / 255;
      suma += valor;
      if (valor > pico) pico = valor;
      cuantas += 1;
    }
    // Entre promedio y pico: las bandas anchas de los agudos no se diluyen entre armónicos.
    const valor = cuantas === 0 ? 0 : (suma / cuantas + pico) / 2;
    porBanda.push(recortar((valor - PISO_ESPECTRO) / (1 - PISO_ESPECTRO)) * tamano);
  }

  const centro = (cantidad - 1) / 2;
  for (let i = 0; i < cantidad; i += 1) {
    alturas[i] = porBanda[Math.floor(Math.abs(i - centro))] ?? 0;
  }
  return alturas;
}

/**
 * Un paso del suavizado: hacia arriba casi de inmediato, hacia abajo despacio.
 * `ms` es lo que pasó desde el cuadro anterior (con menos cuadros por segundo, pasos más largos).
 */
export function suavizarAlturas(previas: readonly number[], objetivo: readonly number[], ms: number): number[] {
  const subida = 1 - Math.exp(-ms / MS_SUBIDA);
  const bajada = 1 - Math.exp(-ms / MS_BAJADA);
  return objetivo.map((meta, i) => {
    const antes = previas[i] ?? 0;
    return antes + (meta - antes) * (meta > antes ? subida : bajada);
  });
}

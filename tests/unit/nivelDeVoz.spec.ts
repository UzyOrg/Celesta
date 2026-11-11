import { expect, test } from '@playwright/test';
import { UMBRAL_VOZ } from '../../src/components/defensa/microfono';
import { alturasDeBarras, bandasLogaritmicas, nivelRms, suavizarAlturas } from '../../src/components/defensa/nivelDeVoz';

/**
 * Del espectro del micrófono a la altura de las barras de "Te escucho". Los números imitan lo que da
 * un AnalyserNode con fftSize 512 a 48 kHz (256 casillas de 93,75 Hz, en bytes de 0 a 255).
 */

const CASILLAS = 256;
const HZ_POR_CASILLA = 48_000 / 512;
const BARRAS = 18;

/** Una voz: mucha energía en los graves y menos hacia los agudos (unos 6 dB menos por octava). */
const espectroDeVoz = (fuerza: number): number[] =>
  Array.from({ length: CASILLAS }, (_, i) => Math.max(0, Math.min(255, Math.round(fuerza - 22 * Math.log2(Math.max(1, i))))));

const alturas = (frecuencias: readonly number[], nivel: number, cantidad = BARRAS) =>
  alturasDeBarras({ frecuencias, nivel, cantidad, hzPorCasilla: HZ_POR_CASILLA });

const mayor = (valores: readonly number[]) => Math.max(...valores);

test.describe('alturasDeBarras · del espectro a las barras', () => {
  test('en silencio todas quedan en reposo', () => {
    const resultado = alturas(new Array<number>(CASILLAS).fill(0), 0);
    expect(resultado).toHaveLength(BARRAS);
    expect(resultado.every((altura) => altura === 0)).toBe(true);
  });

  test('el ruido del cuarto bajo la compuerta no mueve nada, aunque traiga espectro', () => {
    const ruido = new Array<number>(CASILLAS).fill(140);
    expect(alturas(ruido, UMBRAL_VOZ - 0.005).every((altura) => altura === 0)).toBe(true);
    // Lo que las deja quietas es la compuerta: el mismo espectro con voz sí las mueve.
    expect(mayor(alturas(ruido, UMBRAL_VOZ + 0.02))).toBeGreaterThan(0);
  });

  test('una voz suave apenas las sube', () => {
    const suave = alturas(espectroDeVoz(190), 0.03);
    expect(mayor(suave)).toBeGreaterThan(0.1);
    expect(mayor(suave)).toBeLessThan(0.5);
  });

  test('una voz fuerte las lleva casi arriba, y cada barra queda más alta que con la suave', () => {
    const suave = alturas(espectroDeVoz(190), 0.03);
    const fuerte = alturas(espectroDeVoz(245), 0.25);
    expect(mayor(fuerte)).toBeGreaterThan(0.85);
    fuerte.forEach((altura, i) => expect(altura).toBeGreaterThanOrEqual(suave[i] as number));
  });

  test('los graves van al centro y la forma es un reflejo, con todo entre 0 y 1', () => {
    for (const cantidad of [BARRAS, 17]) {
      const resultado = alturas(espectroDeVoz(245), 0.25, cantidad);
      expect(resultado).toHaveLength(cantidad);
      resultado.forEach((altura, i) => {
        expect(altura).toBeGreaterThanOrEqual(0);
        expect(altura).toBeLessThanOrEqual(1);
        expect(altura).toBeCloseTo(resultado[cantidad - 1 - i] as number, 10);
      });
      expect(resultado[Math.floor(cantidad / 2)] as number).toBeGreaterThan(resultado[0] as number);
    }
  });
});

test.describe('suavizarAlturas · sube rápido, baja lento', () => {
  test('en un cuadro (33 ms) sube más de la mitad y baja menos de una quinta parte', () => {
    expect(suavizarAlturas([0], [1], 33)[0] as number).toBeGreaterThan(0.5);
    expect(suavizarAlturas([1], [0], 33)[0] as number).toBeGreaterThan(0.8);
  });

  test('en un segundo de silencio ya volvió al reposo', () => {
    let actual: readonly number[] = [1, 0.6];
    for (let cuadro = 0; cuadro < 30; cuadro += 1) actual = suavizarAlturas(actual, [0, 0], 33);
    expect(mayor(actual)).toBeLessThan(0.02);
  });
});

test.describe('bandas y volumen', () => {
  test('las bandas logarítmicas crecen y ninguna queda vacía', () => {
    const bordes = bandasLogaritmicas(9, CASILLAS, HZ_POR_CASILLA);
    expect(bordes).toHaveLength(10);
    expect(bordes[0]).toBeGreaterThanOrEqual(1);
    for (let i = 1; i < bordes.length; i += 1) expect(bordes[i] as number).toBeGreaterThan(bordes[i - 1] as number);
    // La última banda llega hasta las eses (~5 kHz), no hasta el final del espectro.
    expect((bordes[9] as number) * HZ_POR_CASILLA).toBeLessThan(5_100);
  });

  test('el volumen RMS de una onda es su amplitud entre raíz de dos', () => {
    const onda = Array.from({ length: 480 }, (_, i) => 0.5 * Math.sin((2 * Math.PI * i) / 48));
    expect(nivelRms(onda)).toBeCloseTo(0.5 / Math.SQRT2, 3);
    expect(nivelRms([])).toBe(0);
  });
});

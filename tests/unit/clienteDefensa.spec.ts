import { expect, test } from '@playwright/test';
import { ColaSubida, type ResultadoDeSubida } from '../../src/components/defensa/colaSubida';
import { ErrorDeApi, conReintentos } from '../../src/components/defensa/clienteApi';
import { UMBRAL_RUIDO, UMBRAL_VOZ, evaluarPrueba } from '../../src/components/defensa/microfono';

const parte = (texto: string) => new Blob([texto]);
const pausa = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms));

test.describe('ColaSubida · una red que se cae no pierde la respuesta', () => {
  test('sube las partes de una en una y en el orden en que salieron', async () => {
    const subidas: number[] = [];
    const cola = new ColaSubida({
      subir: async (indice) => {
        await pausa(5 - Math.min(indice, 4)); // la primera tarda más: no debe adelantarse la segunda
        subidas.push(indice);
        return 'listo';
      },
    });
    cola.encolar(0, parte('a'));
    cola.encolar(1, parte('b'));
    cola.encolar(2, parte('c'));
    expect(await cola.vaciar(2_000)).toBe(true);
    expect(subidas).toEqual([0, 1, 2]);
    expect(cola.faltan).toBe(0);
  });

  test('si la red falla reintenta con espera creciente y no se salta ninguna parte', async () => {
    const esperas: number[] = [];
    const intentos: number[] = [];
    let fallos = 3;
    const cola = new ColaSubida({
      subir: async (indice) => {
        intentos.push(indice);
        if (indice === 0 && fallos > 0) {
          fallos -= 1;
          return 'reintentar';
        }
        return 'listo';
      },
      espera: async (ms) => void esperas.push(ms),
    });
    cola.encolar(0, parte('a'));
    cola.encolar(1, parte('b'));
    expect(await cola.vaciar(2_000)).toBe(true);
    expect(esperas).toEqual([1_000, 2_000, 4_000]);
    expect(intentos).toEqual([0, 0, 0, 0, 1]);
  });

  test('la espera tiene tope y una excepción cuenta como falla de red', async () => {
    const esperas: number[] = [];
    let llamadas = 0;
    const cola = new ColaSubida({
      esperaBaseMs: 10_000,
      esperaMaximaMs: 30_000,
      subir: async () => {
        llamadas += 1;
        if (llamadas <= 4) throw new Error('sin red');
        return 'listo';
      },
      espera: async (ms) => void esperas.push(ms),
    });
    cola.encolar(0, parte('a'));
    expect(await cola.vaciar(2_000)).toBe(true);
    expect(esperas).toEqual([10_000, 20_000, 30_000, 30_000]);
  });

  test('lo que el servidor rechaza de verdad no se reintenta y se cuenta', async () => {
    const intentos: number[] = [];
    const cola = new ColaSubida({
      subir: async (indice): Promise<ResultadoDeSubida> => {
        intentos.push(indice);
        return indice === 0 ? 'descartar' : 'listo';
      },
      espera: async () => {
        throw new Error('no debía esperar');
      },
    });
    cola.encolar(0, parte('a'));
    cola.encolar(1, parte('b'));
    expect(await cola.vaciar(2_000)).toBe(true);
    expect(intentos).toEqual([0, 1]);
    expect(cola.rechazadas).toBe(1);
  });

  test('vaciar avisa si pasó el tiempo y siguen faltando partes', async () => {
    const cola = new ColaSubida({ subir: async () => 'reintentar', espera: () => pausa(30) });
    cola.encolar(0, parte('a'));
    expect(await cola.vaciar(150)).toBe(false);
    expect(cola.faltan).toBe(1);
    cola.limpiar();
  });

  test('al volver la red reintenta de inmediato, sin esperar la pausa que quedaba', async () => {
    let conexion = false;
    let subidas = 0;
    const cola = new ColaSubida({
      esperaBaseMs: 60_000,
      subir: async () => {
        if (!conexion) return 'reintentar';
        subidas += 1;
        return 'listo';
      },
    });
    cola.encolar(0, parte('a'));
    await pausa(30); // ya falló una vez y está durmiendo 60 s
    conexion = true;
    cola.hayRed();
    expect(await cola.vaciar(1_000)).toBe(true);
    expect(subidas).toBe(1);
  });

  test('reenviar vuelve a subir lo que el servidor dijo que le falta, con lo que se guardó', async () => {
    const subidas: Array<[number, string]> = [];
    const cola = new ColaSubida({
      subir: async (indice, blob) => {
        subidas.push([indice, await blob.text()]);
        return 'listo';
      },
    });
    cola.encolar(0, parte('cero'));
    cola.encolar(1, parte('uno'));
    await cola.vaciar(1_000);
    expect(cola.reenviar([1, 7])).toBe(1);
    await cola.vaciar(1_000);
    expect(subidas).toEqual([[0, 'cero'], [1, 'uno'], [1, 'uno']]);
  });

  test('limpiar suelta todo: una grabación nueva empieza de cero', async () => {
    const subidas: number[] = [];
    const cola = new ColaSubida({
      subir: async (indice) => {
        subidas.push(indice);
        return indice === 0 ? 'reintentar' : 'listo';
      },
      espera: () => pausa(20),
    });
    cola.encolar(0, parte('vieja'));
    await pausa(5);
    cola.limpiar();
    expect(cola.faltan).toBe(0);
    expect(cola.reenviar([0])).toBe(0);
    cola.encolar(0, parte('nueva'));
    await pausa(60);
    expect(subidas.filter((i) => i === 0).length).toBeGreaterThanOrEqual(1);
  });
});

test.describe('conReintentos', () => {
  test('repite solo las fallas de red, con 1 s, 2 s, 4 s', async () => {
    const esperas: number[] = [];
    let llamadas = 0;
    const resultado = await conReintentos(
      async () => {
        llamadas += 1;
        if (llamadas < 4) throw new ErrorDeApi('sin_red', 'sin red');
        return 'ok';
      },
      { espera: async (ms) => void esperas.push(ms) },
    );
    expect([resultado, llamadas, esperas]).toEqual(['ok', 4, [1_000, 2_000, 4_000]]);
  });

  test('un rechazo del servidor, o agotar los intentos, no se sigue reintentando', async () => {
    let llamadas = 0;
    await expect(
      conReintentos(async () => {
        llamadas += 1;
        throw new ErrorDeApi('estado_invalido', 'ya no', 409);
      }, { espera: async () => undefined }),
    ).rejects.toMatchObject({ codigo: 'estado_invalido' });
    expect(llamadas).toBe(1);

    llamadas = 0;
    await expect(
      conReintentos(async () => {
        llamadas += 1;
        throw new ErrorDeApi('tiempo_agotado', 'tarda', 0);
      }, { intentos: 3, espera: async () => undefined }),
    ).rejects.toMatchObject({ codigo: 'tiempo_agotado', esDeRed: true });
    expect(llamadas).toBe(3);
  });
});

test.describe('evaluarPrueba · ¿se oye bien?', () => {
  const voz = (n: number, nivel = 0.1) => Array.from({ length: n }, () => nivel);
  const fondo = (n: number, nivel = 0.005) => Array.from({ length: n }, () => nivel);

  test('voz clara con poco fondo → bien', () => {
    expect(evaluarPrueba([...fondo(10), ...voz(15), ...fondo(5)])).toBe('bien');
  });

  test('casi sin voz → poco volumen', () => {
    expect(evaluarPrueba(fondo(40))).toBe('poco_volumen');
    expect(evaluarPrueba([...fondo(40), UMBRAL_VOZ + 0.001, UMBRAL_VOZ + 0.001])).toBe('poco_volumen');
    expect(evaluarPrueba([])).toBe('poco_volumen');
  });

  test('un fondo fuerte, incluso entre palabras → ruido', () => {
    expect(evaluarPrueba([...fondo(5, UMBRAL_RUIDO + 0.01), ...voz(20, 0.3), ...fondo(10, UMBRAL_RUIDO + 0.02)])).toBe('ruido');
  });

  test('una palabra fuerte en medio del silencio no cuenta como ruido de fondo', () => {
    expect(evaluarPrueba([...fondo(30), ...voz(10, 0.4)])).toBe('bien');
  });
});

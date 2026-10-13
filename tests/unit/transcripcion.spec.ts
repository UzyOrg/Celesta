import '../support/sinServerOnly';
import { expect, test } from '@playwright/test';
import type { PalabraTranscrita } from '../../src/lib/defensa/providers/tipos';
import {
  TEXTO_NO_ENTENDIDO,
  aplicarRelleno,
  construirLineas,
  elegirHueco,
  textoDe,
  tiempoCorto,
} from '../../src/lib/defensa/transcripcion';

/** Palabras seguidas, 400 ms cada una; las marcadas con ~ salen con confianza baja. */
function palabras(frase: string, confianzaBaja = 0.2): PalabraTranscrita[] {
  return frase
    .split(' ')
    .filter(Boolean)
    .map((crudo, i) => {
      const baja = crudo.startsWith('~');
      return {
        texto: baja ? crudo.slice(1) : crudo,
        inicioMs: i * 400,
        finMs: i * 400 + 360,
        confianza: baja ? confianzaBaja : 0.95,
      };
    });
}

const UMBRAL = 0.55;

test.describe('elegirHueco · qué parte no se entendió', () => {
  test('encuentra el tramo dudoso y arma el contexto como en la pantalla de aclaración', () => {
    const p = palabras('Quería más pero la muestra fue ~de ~cuarenta ~personas porque solo tenía dos semanas');
    const hueco = elegirHueco(p, UMBRAL);
    expect(hueco).toMatchObject({
      indiceInicio: 6,
      indiceFin: 8,
      inicioMs: 6 * 400,
      finMs: 8 * 400 + 360,
      antes: '…pero la muestra fue',
      despues: 'porque solo tenía dos semanas',
    });
    expect(hueco?.confianzaMedia).toBeCloseTo(0.2, 5);
  });

  test('pone "…" solo cuando de verdad hay más palabras antes o después', () => {
    const corto = elegirHueco(palabras('La muestra fue ~dudosa porque sí'), UMBRAL);
    expect(corto?.antes).toBe('La muestra fue');
    expect(corto?.despues).toBe('porque sí');

    const largo = elegirHueco(
      palabras('uno dos tres cuatro cinco seis ~siete ocho nueve diez once doce trece catorce'),
      UMBRAL,
    );
    expect(largo?.antes).toBe('…tres cuatro cinco seis');
    expect(largo?.despues).toBe('ocho nueve diez once doce…');
  });

  test('si hay dos tramos dudosos elige el que más pesa (más palabras, menos confianza)', () => {
    const p = palabras('hola ~uno y luego ~dos ~tres ~cuatro y al final cierra');
    const hueco = elegirHueco(p, UMBRAL);
    expect(textoDe(p.slice(hueco!.indiceInicio, hueco!.indiceFin + 1))).toBe('dos tres cuatro');
  });

  test('sin palabras dudosas no hay hueco: lo normal es no interrumpir', () => {
    expect(elegirHueco(palabras('todo se entendió perfectamente bien'), UMBRAL)).toBeNull();
    expect(elegirHueco([], UMBRAL)).toBeNull();
    // Justo en el umbral ya no es dudoso.
    expect(elegirHueco(palabras('una ~palabra aquí', 0.55), UMBRAL)).toBeNull();
  });

  test('un tramo demasiado largo es ruido, no una frase que valga la pena pedir otra vez', () => {
    const p = palabras('inicio ~a ~b ~c ~d ~e ~f ~g ~h ~i fin');
    expect(elegirHueco(p, UMBRAL)).toBeNull();
    expect(elegirHueco(p, UMBRAL, { maxPalabras: 9 })).not.toBeNull();
  });

  test('las muletillas y los signos sueltos no se piden de nuevo', () => {
    const p = palabras('la muestra ~eh ~mmm ~... fue chica');
    expect(elegirHueco(p, UMBRAL)).toBeNull();
  });

  test('lo ya aclarado o marcado como no entendido no vuelve a salir', () => {
    const p = palabras('la muestra fue ~dudosa hoy');
    const [rellena] = [aplicarRelleno(p, elegirHueco(p, UMBRAL)!, 'de cuarenta personas')];
    expect(elegirHueco(rellena!, UMBRAL)).toBeNull();
    const vacia = aplicarRelleno(p, elegirHueco(p, UMBRAL)!, null);
    expect(elegirHueco(vacia, UMBRAL)).toBeNull();
  });
});

test.describe('aplicarRelleno · lo llena el alumno, nunca la IA', () => {
  const p = palabras('Quería más pero la muestra fue ~de ~cuarenta ~personas porque solo tenía dos semanas');

  test('con texto: reemplaza el tramo, marca lo aclarado y reparte el tiempo dentro del hueco', () => {
    const hueco = elegirHueco(p, UMBRAL)!;
    const nuevas = aplicarRelleno(p, hueco, '  de treinta y cinco personas ');
    expect(textoDe(nuevas)).toBe('Quería más pero la muestra fue de treinta y cinco personas porque solo tenía dos semanas');

    const aclaradas = nuevas.filter((w) => w.aclarada);
    expect(aclaradas.map((w) => w.texto)).toEqual(['de', 'treinta', 'y', 'cinco', 'personas']);
    expect(aclaradas.every((w) => w.confianza === 1)).toBe(true);
    expect(aclaradas[0]!.inicioMs).toBe(hueco.inicioMs);
    expect(aclaradas[aclaradas.length - 1]!.finMs).toBe(hueco.finMs);
    // Lo de antes y lo de después queda intacto, con sus tiempos y su confianza.
    expect(nuevas.slice(0, 6)).toEqual(p.slice(0, 6));
    expect(nuevas.slice(-5)).toEqual(p.slice(-5));
  });

  test('sin texto: queda "no se entendió" y no se inventa nada', () => {
    const hueco = elegirHueco(p, UMBRAL)!;
    for (const vacio of [null, '', '   ']) {
      const nuevas = aplicarRelleno(p, hueco, vacio);
      const marcada = nuevas.filter((w) => w.noEntendida);
      expect(marcada).toHaveLength(1);
      expect(marcada[0]).toMatchObject({ texto: TEXTO_NO_ENTENDIDO, confianza: 0 });
      expect(textoDe(nuevas)).toContain(`fue ${TEXTO_NO_ENTENDIDO} porque`);
    }
  });
});

test.describe('construirLineas · la revisión del alumno y el reporte', () => {
  test('parte por oración y le pone su minuto', () => {
    const p: PalabraTranscrita[] = [
      { texto: 'Porque', inicioMs: 14_000, finMs: 14_300, confianza: 1 },
      { texto: 'llegaba', inicioMs: 14_300, finMs: 14_600, confianza: 1 },
      { texto: 'a', inicioMs: 14_600, finMs: 14_700, confianza: 1 },
      { texto: 'más.', inicioMs: 14_700, finMs: 15_000, confianza: 1 },
      { texto: 'Con', inicioMs: 19_000, finMs: 19_200, confianza: 1 },
      { texto: 'entrevistas.', inicioMs: 19_200, finMs: 19_900, confianza: 1 },
    ];
    const lineas = construirLineas('t1', p);
    expect(lineas.map((l) => [l.id, l.tiempo, l.segmentos.map((s) => s.texto).join('')])).toEqual([
      ['t1:0', '00:14', 'Porque llegaba a más.'],
      ['t1:1', '00:19', 'Con entrevistas.'],
    ]);
    expect(lineas.every((l) => !l.aclarada)).toBe(true);
  });

  test('una pausa larga o 14 palabras también cortan la línea', () => {
    const pausa: PalabraTranscrita[] = [
      { texto: 'uno', inicioMs: 0, finMs: 300, confianza: 1 },
      { texto: 'dos', inicioMs: 2_000, finMs: 2_300, confianza: 1 },
    ];
    expect(construirLineas('x', pausa)).toHaveLength(2);

    const largas = palabras(Array.from({ length: 30 }, (_, i) => `p${i}`).join(' '));
    expect(construirLineas('x', largas).map((l) => l.segmentos.map((s) => s.texto).join('').split(' ').length)).toEqual([14, 14, 2]);
  });

  test('separa en segmentos lo aclarado y lo que no se entendió, con un espacio entre ellos', () => {
    const base = palabras('Quería más pero la muestra fue ~de ~cuarenta porque solo tenía dos semanas.');
    const conAclarado = aplicarRelleno(base, elegirHueco(base, UMBRAL)!, 'de cuarenta personas');
    const [linea] = construirLineas('t2', conAclarado);
    expect(linea!.segmentos).toEqual([
      { texto: 'Quería más pero la muestra fue ' },
      { texto: 'de cuarenta personas ', aclarado: true },
      { texto: 'porque solo tenía dos semanas.' },
    ]);
    expect(linea!.aclarada).toBe(true);

    const sinEntender = aplicarRelleno(base, elegirHueco(base, UMBRAL)!, null);
    const [otra] = construirLineas('t3', sinEntender);
    expect(otra!.segmentos[1]).toEqual({ texto: `${TEXTO_NO_ENTENDIDO} `, noEntendido: true });
    expect(otra!.aclarada).toBe(false);
  });

  test('sin palabras no hay líneas, y el minuto se formatea siempre con dos dígitos', () => {
    expect(construirLineas('x', [])).toEqual([]);
    expect([0, 999, 14_000, 61_000, 3_599_000].map(tiempoCorto)).toEqual(['00:00', '00:00', '00:14', '01:01', '59:59']);
    expect(tiempoCorto(-5)).toBe('00:00');
  });
});

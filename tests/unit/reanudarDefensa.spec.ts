import { expect, test } from '@playwright/test';
import type { DefensaCliente, EstadoSesionCliente } from '../../src/components/defensa/contrato';
import { PASOS_ALUMNO, pasoAlcanzable, pasoDeRespaldo, type ContextoDeAlcance, type PasoAlumnoId } from '../../src/components/defensa/pasos';
import {
  bloquesDeRevision,
  contextoDeAlcance,
  defensaEnPantalla,
  pasoDeDefensa,
  pasoDeReanudacion,
} from '../../src/components/defensa/reanudar';

/**
 * A qué pantalla se puede llegar y a cuál se regresa a quien abre el enlace en otro teléfono,
 * recarga o vuelve de una falla de red. Nunca debe quedar una pantalla vacía.
 */

const PREGUNTA = { turnoId: 't1', numero: 1, contexto: 'c', pregunta: 'p', audioUrl: null, repeticiones: 0 };
const ACLARACION = { turnoId: 't1', numero: 1, antes: 'a', despues: 'd', vozUrl: null, audioUrl: null, desdeMs: 0, hastaMs: 1 };
const REVISION = [{ turnoId: 't1', numero: 1, contexto: 'c', pregunta: 'p', modo: 'escrito' as const, porEscrito: 'respuesta' }];

function defensa(parcial: Partial<DefensaCliente> = {}): DefensaCliente {
  return {
    id: 'd1',
    esEnsayo: false,
    estado: 'en_curso',
    respondidas: 0,
    pregunta: null,
    aclaracion: null,
    revision: null,
    entregadaEn: null,
    estresRespondido: false,
    ...parcial,
  };
}

function estado(parcial: Partial<EstadoSesionCliente> = {}): EstadoSesionCliente {
  return {
    alumno: { nombre: 'Ana', matricula: 'A1', modo: null },
    entrega: { id: 'e1', version: 1, tipo: 'texto', nombre: 'Texto', paginas: null, palabras: 300, entregadaEn: '2026-10-09T03:05:00.000Z', tardia: false },
    plan: 'listo',
    defensa: null,
    ensayo: null,
    ...parcial,
  };
}

const alcanzables = (c: ContextoDeAlcance): PasoAlumnoId[] => PASOS_ALUMNO.filter((paso) => pasoAlcanzable(paso, c));

test.describe('pasoAlcanzable · solo se muestra lo que ya existe', () => {
  const sinSesion: ContextoDeAlcance = { haySesion: false, hayEntrega: false, actual: null, defensaEntregada: false };

  test('sin sesión solo se llega a la entrada', () => {
    expect(alcanzables(sinSesion)).toEqual(['inicio', 'quien', 'permisos']);
  });

  test('con sesión pero sin trabajo se llega a elegir cómo responder y a subirlo', () => {
    expect(alcanzables({ ...sinSesion, haySesion: true })).toEqual(['inicio', 'quien', 'permisos', 'voz', 'trabajo']);
  });

  test('con trabajo entregado se llega a la prueba de micrófono y a "Cuando quieras", pero no a una pregunta', () => {
    const lista = alcanzables({ ...sinSesion, haySesion: true, hayEntrega: true });
    expect(lista).toEqual(expect.arrayContaining(['archivo', 'entregado', 'hola', 'respira']));
    for (const paso of ['pregunta', 'silencio', 'aclaracion', 'revisar', 'estres', 'listo'] as const) expect(lista).not.toContain(paso);
  });

  const base = { haySesion: true, hayEntrega: true, defensaEntregada: false };
  const actual = (estadoDefensa: NonNullable<ContextoDeAlcance['actual']>['estado'], resto: Partial<NonNullable<ContextoDeAlcance['actual']>> = {}) => ({
    estado: estadoDefensa,
    hayPregunta: false,
    hayAclaracion: false,
    hayRevision: false,
    esEnsayo: false,
    ...resto,
  });

  const tabla: Array<{ caso: string; contexto: ContextoDeAlcance; si: PasoAlumnoId[]; no: PasoAlumnoId[] }> = [
    {
      caso: 'pregunta en curso',
      contexto: { ...base, actual: actual('en_curso', { hayPregunta: true }) },
      si: ['pregunta', 'silencio'],
      no: ['aclaracion', 'revisar', 'estres', 'listo'],
    },
    {
      caso: 'aclaración en curso',
      contexto: { ...base, actual: actual('en_curso', { hayAclaracion: true }) },
      si: ['aclaracion'],
      no: ['pregunta', 'revisar', 'listo'],
    },
    {
      caso: 'por revisar',
      contexto: { ...base, actual: actual('por_revisar', { hayRevision: true }) },
      si: ['revisar'],
      no: ['pregunta', 'aclaracion', 'estres', 'listo'],
    },
    {
      caso: 'por revisar sin bloques todavía',
      contexto: { ...base, actual: actual('por_revisar') },
      si: [],
      no: ['revisar'],
    },
    {
      caso: 'defensa entregada',
      contexto: { ...base, defensaEntregada: true, actual: actual('entregada') },
      si: ['estres', 'listo'],
      no: ['pregunta', 'aclaracion', 'revisar'],
    },
    {
      caso: 'ensayo entregado (la defensa de verdad aún no)',
      contexto: { ...base, actual: actual('entregada', { esEnsayo: true }) },
      si: ['estres'],
      no: ['listo', 'pregunta', 'revisar'],
    },
  ];

  for (const { caso, contexto, si, no } of tabla) {
    test(caso, () => {
      const lista = alcanzables(contexto);
      for (const paso of si) expect(lista, paso).toContain(paso);
      for (const paso of no) expect(lista, paso).not.toContain(paso);
    });
  }

  test('el paso de respaldo siempre es uno alcanzable', () => {
    const contextos: ContextoDeAlcance[] = [
      sinSesion,
      { ...sinSesion, haySesion: true },
      { ...sinSesion, haySesion: true, hayEntrega: true },
    ];
    expect(contextos.map(pasoDeRespaldo)).toEqual(['inicio', 'trabajo', 'respira']);
    for (const contexto of contextos) expect(pasoAlcanzable(pasoDeRespaldo(contexto), contexto)).toBe(true);
  });
});

test.describe('pasoDeReanudacion · dónde se retoma', () => {
  test('sin trabajo entregado, a subirlo', () => {
    expect(pasoDeReanudacion(estado({ entrega: null, plan: 'sin_entrega' }))).toBe('trabajo');
  });

  test('con trabajo y sin defensa, a "Cuando quieras"', () => {
    expect(pasoDeReanudacion(estado())).toBe('respira');
  });

  test('a media defensa, a la misma pregunta; con una parte por aclarar, a la aclaración', () => {
    expect(pasoDeReanudacion(estado({ defensa: defensa({ pregunta: PREGUNTA }) }))).toBe('pregunta');
    expect(pasoDeReanudacion(estado({ defensa: defensa({ aclaracion: ACLARACION }) }))).toBe('aclaracion');
  });

  test('terminó de responder: a revisar', () => {
    expect(pasoDeReanudacion(estado({ defensa: defensa({ estado: 'por_revisar', revision: REVISION }) }))).toBe('revisar');
  });

  test('ya entregó: a la pregunta de estrés si falta, y a "Listo" si ya la contestó', () => {
    expect(pasoDeReanudacion(estado({ defensa: defensa({ estado: 'entregada' }) }))).toBe('estres');
    expect(pasoDeReanudacion(estado({ defensa: defensa({ estado: 'entregada', estresRespondido: true }) }))).toBe('listo');
  });

  test('un ensayo terminado regresa a "Cuando quieras" y no a "Listo"', () => {
    expect(pasoDeDefensa(defensa({ esEnsayo: true, estado: 'entregada', estresRespondido: true }))).toBe('respira');
  });

  test('una defensa abandonada o incompleta regresa a "Cuando quieras"', () => {
    expect(pasoDeDefensa(defensa({ estado: 'abandonada' }))).toBe('respira');
    expect(pasoDeDefensa(defensa({ estado: 'incompleta' }))).toBe('respira');
  });

  test('un ensayo abierto se retoma aunque la defensa de verdad haya quedado abandonada', () => {
    const ensayo = defensa({ id: 'e', esEnsayo: true, pregunta: PREGUNTA });
    const e = estado({ defensa: defensa({ estado: 'abandonada' }), ensayo });
    expect(defensaEnPantalla(e)).toBe(ensayo);
    expect(pasoDeReanudacion(e)).toBe('pregunta');
  });

  test('la defensa de verdad abierta tiene prioridad sobre un ensayo abierto', () => {
    const real = defensa({ pregunta: PREGUNTA });
    const e = estado({ defensa: real, ensayo: defensa({ id: 'e', esEnsayo: true, pregunta: PREGUNTA }) });
    expect(defensaEnPantalla(e)).toBe(real);
  });
});

test.describe('contextoDeAlcance y bloquesDeRevision', () => {
  test('resume lo que hay en pantalla sin guardar nada de las respuestas', () => {
    const e = estado({ defensa: defensa({ estado: 'por_revisar', revision: REVISION }) });
    expect(contextoDeAlcance(e, true, e.defensa)).toEqual({
      haySesion: true,
      hayEntrega: true,
      actual: { estado: 'por_revisar', hayPregunta: false, hayAclaracion: false, hayRevision: true, esEnsayo: false },
      defensaEntregada: false,
    });
  });

  test('la revisión hablada conserva las líneas marcadas y aclaradas; la escrita, el texto', () => {
    const bloques = bloquesDeRevision(
      defensa({
        estado: 'por_revisar',
        revision: [
          {
            turnoId: 't1',
            numero: 1,
            contexto: 'c1',
            pregunta: 'p1',
            modo: 'voz',
            lineas: [
              { id: 't1:0', tiempo: '00:03', segmentos: [{ texto: 'hola' }, { texto: 'cuarenta', aclarado: true }], aclarada: true, marcada: true },
            ],
          },
          { turnoId: 't2', numero: 2, contexto: 'c2', pregunta: 'p2', modo: 'escrito', porEscrito: 'mi texto' },
        ],
      }),
    );
    expect(bloques).toHaveLength(2);
    expect(bloques[0]?.pregunta).toEqual({ id: 't1', numero: 1, contexto: 'c1', pregunta: 'p1' });
    expect(bloques[0]?.lineas?.[0]).toMatchObject({ id: 't1:0', tiempo: '00:03', marcadaDeInicio: true, aclarada: true });
    expect(bloques[1]?.porEscrito).toBe('mi texto');
    expect(bloques[1]?.lineas).toBeUndefined();
    expect(bloquesDeRevision(null)).toEqual([]);
  });
});

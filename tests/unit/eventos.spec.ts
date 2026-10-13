import '../support/sinServerOnly';
import { expect, test } from '@playwright/test';
import { crearEstadoMemoria, crearRepoMemoria } from '../../src/lib/defensa/almacen/memoria';
import { crearEmisor, filaDeEvento, tallerIdDeActividad, type EventoDefensa } from '../../src/lib/defensa/eventos';
import { esTallerIdReservado, parseIngestPayload } from '../../src/lib/events/ingestPolicy';

const AHORA = new Date('2026-10-13T18:30:00.000Z');

const EVENTO: EventoDefensa = {
  verbo: 'envio_respuesta',
  evento: 'respuesta',
  pasoId: 'pregunta-2',
  actividadId: 'act-1',
  actorId: 'alumno-1',
  clave: 'turno-7',
  medidas: { numero: 2, modo: 'voz', duracionRespuestaMs: 41_000, silencios: 1, repeticiones: 0, clase: 'vaga' },
};

function payload(tallerId: string): string {
  const ts = '2026-10-13T12:00:00.000Z';
  return JSON.stringify({
    events: [
      {
        actor_sid: 'sid-1',
        taller_id: tallerId,
        paso_id: 'x',
        verbo: 'completo_paso',
        ts,
        client_event_id: 'evento-0000001',
        client_ts: ts,
      },
    ],
  });
}

test.describe('la ingesta pública rechaza los taller_id del servidor', () => {
  test('cualquier forma de escribir el prefijo reservado se rechaza', () => {
    for (const reservado of ['defensa:act-1', 'DEFENSA:act-1', '  defensa:act-1', 'Defensa:', 'defensa：act-1', 'ＤＥＦＥＮＳＡ:x']) {
      expect(esTallerIdReservado(reservado), reservado).toBe(true);
      expect(() => parseIngestPayload(payload(reservado)), reservado).toThrow();
    }
  });

  test('los demás talleres siguen pasando', () => {
    for (const permitido of ['CREAR-ENGLISH-DEDUCTION-V1', 'defensas-x', 'mi-defensa:1', 'defensa']) {
      expect(esTallerIdReservado(permitido), permitido).toBe(false);
      expect(parseIngestPayload(payload(permitido)).events).toHaveLength(1);
    }
  });

  test('un lote con un solo evento reservado se rechaza completo', () => {
    const ts = '2026-10-13T12:00:00.000Z';
    const base = { actor_sid: 's', paso_id: 'x', verbo: 'completo_paso', ts, client_ts: ts };
    const lote = JSON.stringify({
      events: [
        { ...base, taller_id: 'CREAR-ENGLISH-DEDUCTION-V1', client_event_id: 'evento-0000001' },
        { ...base, taller_id: 'defensa:act-1', client_event_id: 'evento-0000002' },
      ],
    });
    expect(() => parseIngestPayload(lote)).toThrow();
  });
});

test.describe('filaDeEvento', () => {
  test('usa los seis verbos de siempre y deja el detalle en result, sin texto ni alias', () => {
    const fila = filaDeEvento(EVENTO, AHORA);
    expect(fila).toMatchObject({
      actor_sid: 'alumno-1',
      student_session_id: 'alumno-1',
      student_alias: null,
      class_token: null,
      taller_id: 'defensa:act-1',
      paso_id: 'pregunta-2',
      verbo: 'envio_respuesta',
      ts: AHORA.toISOString(),
      client_ts: AHORA.toISOString(),
      client_event_id: 'def:respuesta:turno-7',
    });
    expect(fila.result).toEqual({
      evento: 'respuesta',
      actividadId: 'act-1',
      numero: 2,
      modo: 'voz',
      duracionRespuestaMs: 41_000,
      silencios: 1,
      repeticiones: 0,
      clase: 'vaga',
    });
    expect(esTallerIdReservado(fila.taller_id)).toBe(true);
  });

  test('un texto largo no puede colarse en un evento y un número roto se vuelve null', () => {
    const fila = filaDeEvento(
      { ...EVENTO, medidas: { texto: 'Esto es lo que dijo el alumno en su respuesta, palabra por palabra, durante la defensa.', nan: Number.NaN, corto: 'ok' } },
      AHORA,
    );
    expect(fila.result).toMatchObject({ texto: '[omitido]', nan: null, corto: 'ok' });
  });

  test('la clave fija la identidad del evento y se recorta a 160 caracteres', () => {
    expect(filaDeEvento(EVENTO, AHORA).client_event_id).toBe(filaDeEvento(EVENTO, new Date()).client_event_id);
    expect(filaDeEvento({ ...EVENTO, clave: 'x'.repeat(400) }, AHORA).client_event_id).toHaveLength(160);
    expect(tallerIdDeActividad('abc')).toBe('defensa:abc');
  });
});

test.describe('el emisor', () => {
  test('guarda los eventos y un reintento con la misma clave no deja otra fila', async () => {
    const estado = crearEstadoMemoria();
    const emisor = crearEmisor(crearRepoMemoria(estado), () => AHORA);
    await emisor.emitir(EVENTO);
    await emisor.emitir(EVENTO, { ...EVENTO, clave: 'turno-8' });
    expect(estado.eventos.map((e) => e.client_event_id)).toEqual(['def:respuesta:turno-7', 'def:respuesta:turno-8']);
  });

  test('si la base falla, la defensa no se entera', async () => {
    const roto = {
      ...crearRepoMemoria(crearEstadoMemoria()),
      insertarEventos: async () => {
        throw new Error('base caída con datos privados');
      },
    };
    const original = console.error;
    const registros: unknown[][] = [];
    console.error = (...args: unknown[]) => void registros.push(args);
    try {
      await expect(crearEmisor(roto, () => AHORA).emitir(EVENTO)).resolves.toBeUndefined();
    } finally {
      console.error = original;
    }
    expect(JSON.stringify(registros)).not.toContain('datos privados');
  });

  test('sin eventos no toca la base', async () => {
    let llamadas = 0;
    const repo = { ...crearRepoMemoria(crearEstadoMemoria()), insertarEventos: async () => void (llamadas += 1) };
    await crearEmisor(repo, () => AHORA).emitir();
    expect(llamadas).toBe(0);
  });
});

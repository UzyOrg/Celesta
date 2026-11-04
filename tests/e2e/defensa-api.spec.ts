import '../support/sinServerOnly';
import { expect, test, type APIRequestContext } from '@playwright/test';
import { unzipSync } from 'fflate';
import { ACTIVIDAD_DEMO_ID, TOKEN_GRUPO_DEMO } from '../../src/lib/defensa/almacen/semilla';
import { emitirAccesoProfesor } from '../../src/lib/defensa/firmas';
import { pdfConTexto } from '../support/archivos';
import { TRABAJO } from '../support/fixtures';

/**
 * La API de las defensas contra el servidor de desarrollo de Playwright: almacén en
 * memoria con la actividad de demostración, y modelo, transcripción y voz falsos.
 * Los secretos de abajo son los de playwright.config.ts (solo existen en las pruebas).
 */
process.env.DEFENSA_SIGNING_SECRET = 'playwright-only-defensa-secret-00000000000';
const CRON = 'playwright-only-cron-secret';

const LARGA =
  'Elegí esa opción porque necesitaba llegar a más compañeros en pocos días y con entrevistas solo hubiera hablado con cinco personas esa semana';

const CONSENTIMIENTOS = { avisoPrivacidad: true, transferenciaInternacional: true, mayorDeEdad: true };

let contador = 0;
const matriculaNueva = () => `E2E-${Date.now().toString(36).toUpperCase()}-${(contador += 1)}`;

interface Alumno {
  sesion: string;
  encabezados: { Authorization: string };
}

async function entrar(request: APIRequestContext, matricula = matriculaNueva(), modo: 'voz' | 'escrito' = 'escrito'): Promise<Alumno> {
  const r = await request.post('/api/defensa/sesion', {
    data: { token: TOKEN_GRUPO_DEMO, nombre: 'Ana Torres Ruiz', matricula, consentimientos: CONSENTIMIENTOS, modo },
  });
  expect(r.status(), await r.text()).toBe(200);
  const cuerpo = (await r.json()) as { sesion: string };
  return { sesion: cuerpo.sesion, encabezados: { Authorization: `Bearer ${cuerpo.sesion}` } };
}

const profesor = () => ({
  Authorization: `Bearer ${emitirAccesoProfesor(ACTIVIDAD_DEMO_ID, 1, { duracionMs: 60 * 60 * 1000 }).token}`,
});

async function esperarPlan(request: APIRequestContext, alumno: Alumno): Promise<void> {
  for (let i = 0; i < 40; i += 1) {
    const r = await request.get('/api/defensa/estado', { headers: alumno.encabezados });
    const { plan } = (await r.json()) as { plan: string };
    if (plan === 'listo') return;
    expect(['generando'], `plan ${plan}`).toContain(plan);
    await new Promise((resolver) => setTimeout(resolver, 500));
  }
  throw new Error('el plan no quedó listo');
}

async function entregarTexto(request: APIRequestContext, alumno: Alumno): Promise<void> {
  const r = await request.post('/api/defensa/entrega', { headers: alumno.encabezados, data: { tipo: 'texto', texto: TRABAJO } });
  expect(r.status(), await r.text()).toBe(201);
  await esperarPlan(request, alumno);
}

interface DefensaApi {
  id: string;
  estado: string;
  pregunta: { turnoId: string; numero: number; pregunta: string; audioUrl: string | null } | null;
  aclaracion: { turnoId: string; antes: string; despues: string; audioUrl: string | null; vozUrl: string | null } | null;
  revision: Array<{ turnoId: string; lineas?: Array<{ id: string }> }> | null;
}

async function iniciarDefensa(request: APIRequestContext, alumno: Alumno, ensayo: boolean): Promise<DefensaApi> {
  const r = await request.post('/api/defensa/defensas', { headers: alumno.encabezados, data: { ensayo } });
  expect(r.status(), await r.text()).toBe(200);
  return ((await r.json()) as { defensa: DefensaApi }).defensa;
}

async function responderEscrito(request: APIRequestContext, alumno: Alumno, turnoId: string, texto = LARGA): Promise<DefensaApi> {
  const r = await request.post(`/api/defensa/turnos/${turnoId}/responder`, {
    headers: alumno.encabezados,
    data: { modo: 'escrito', texto, duracionMs: 9000 },
  });
  expect(r.status(), await r.text()).toBe(200);
  return ((await r.json()) as { defensa: DefensaApi }).defensa;
}

async function contestarTodo(request: APIRequestContext, alumno: Alumno, inicial: DefensaApi): Promise<DefensaApi> {
  let defensa = inicial;
  for (let i = 0; i < 12 && defensa.estado === 'en_curso'; i += 1) {
    defensa = await responderEscrito(request, alumno, defensa.pregunta!.turnoId);
  }
  return defensa;
}

test.describe('cabeceras y superficie', () => {
  test('el micrófono solo se permite en /defensa y /revision (dictado); la cámara nunca', async ({ request }) => {
    const defensa = await request.get('/defensa/no-existe-este-grupo');
    expect(defensa.headers()['permissions-policy']).toBe('camera=(), geolocation=(), microphone=(self), payment=(), usb=()');
    const revision = await request.get('/revision/x');
    expect(revision.headers()['permissions-policy']).toBe('camera=(), geolocation=(), microphone=(self), payment=(), usb=()');
    for (const ruta of ['/crear', '/api/health', '/api/defensa/estado']) {
      const r = await request.get(ruta);
      expect(r.headers()['permissions-policy'], ruta).toBe('camera=(), geolocation=(), microphone=(), payment=(), usb=()');
    }
    // Los demás encabezados de seguridad siguen en /defensa.
    expect(defensa.headers()['x-frame-options']).toBe('DENY');
    expect(defensa.headers()['x-content-type-options']).toBe('nosniff');
  });

  test('las respuestas de la API no se guardan en caché', async ({ request }) => {
    const r = await request.get('/api/defensa/estado');
    expect(r.status()).toBe(401);
    expect(r.headers()['cache-control']).toBe('no-store');
  });
});

test.describe('quién puede entrar', () => {
  test('sin portador, o con uno que no es de alumno, todo responde 401', async ({ request }) => {
    const rutas: Array<['get' | 'post' | 'put', string]> = [
      ['get', '/api/defensa/estado'],
      ['post', '/api/defensa/entrega'],
      ['post', '/api/defensa/plan'],
      ['post', '/api/defensa/defensas'],
      ['get', '/api/defensa/defensas/00000000-0000-4000-8000-000000000001'],
      ['post', '/api/defensa/defensas/00000000-0000-4000-8000-000000000001/entregar'],
      ['put', '/api/defensa/turnos/00000000-0000-4000-8000-000000000001/audio?i=0'],
      ['post', '/api/defensa/turnos/00000000-0000-4000-8000-000000000001/responder'],
      ['post', '/api/defensa/revision/toque'],
      ['post', '/api/defensa/descargas'],
      ['post', '/api/defensa/enlace'],
    ];
    const profesorToken = profesor();
    for (const [metodo, ruta] of rutas) {
      const sin = await request.fetch(ruta, { method: metodo, data: metodo === 'post' ? {} : undefined });
      expect(sin.status(), `sin portador ${ruta}`).toBe(401);
      const mal = await request.fetch(ruta, { method: metodo, headers: { Authorization: 'Bearer basura.basura.basura' }, data: metodo === 'post' ? {} : undefined });
      expect(mal.status(), `portador malo ${ruta}`).toBe(401);
      if (!ruta.includes('/revision/') && !ruta.includes('/descargas') && !ruta.includes('/enlace')) {
        // Un acceso de profesor no abre nada del alumno.
        const cruzado = await request.fetch(ruta, { method: metodo, headers: profesorToken, data: metodo === 'post' ? {} : undefined });
        expect(cruzado.status(), `profesor en ${ruta}`).toBe(401);
      }
    }
  });

  test('una sesión de alumno no abre las rutas del profesor', async ({ request }) => {
    const alumno = await entrar(request);
    for (const ruta of ['/api/defensa/descargas', '/api/defensa/enlace', '/api/defensa/revision/toque', '/api/defensa/revision/tiempo', '/api/defensa/revision/audio']) {
      const r = await request.post(ruta, { headers: alumno.encabezados, data: {} });
      expect(r.status(), ruta).toBe(401);
    }
  });

  test('la entrada exige los tres sí, un enlace que exista y un cuerpo bien formado', async ({ request }) => {
    const base = { token: TOKEN_GRUPO_DEMO, nombre: 'Ana Torres', matricula: matriculaNueva(), consentimientos: CONSENTIMIENTOS, modo: 'voz' };

    const sinUno = await request.post('/api/defensa/sesion', { data: { ...base, consentimientos: { ...CONSENTIMIENTOS, mayorDeEdad: false } } });
    expect(sinUno.status()).toBe(400);
    expect(await sinUno.json()).toMatchObject({ error: 'consentimiento_requerido' });

    const noExiste = await request.post('/api/defensa/sesion', { data: { ...base, token: 'grupo-que-no-existe' } });
    expect([noExiste.status(), (await noExiste.json()).error]).toEqual([404, 'no_encontrado']);

    for (const malo of [{ ...base, extra: 1 }, { ...base, modo: 'telepatia' }, { ...base, nombre: '' }, { token: base.token }]) {
      const r = await request.post('/api/defensa/sesion', { data: malo });
      expect(r.status(), JSON.stringify(malo)).toBe(400);
      expect((await r.json()).error).toBe('solicitud_invalida');
    }
    const noEsJson = await request.post('/api/defensa/sesion', { headers: { 'Content-Type': 'application/json' }, data: '{no es json' });
    expect(noEsJson.status()).toBe(400);

    const enorme = await request.post('/api/defensa/sesion', { data: { ...base, nombre: 'x'.repeat(10_000) } });
    expect(enorme.status()).toBe(413);
  });

  test('un alumno nuevo recibe su sesión y un estado vacío; volver a entrar lo retoma', async ({ request }) => {
    const matricula = matriculaNueva();
    const primera = await request.post('/api/defensa/sesion', {
      data: { token: TOKEN_GRUPO_DEMO, nombre: 'Ana Torres Ruiz', matricula, consentimientos: CONSENTIMIENTOS, modo: 'voz' },
    });
    const cuerpo = (await primera.json()) as { sesion: string; expiraEn: number; estado: Record<string, unknown> };
    expect(cuerpo.sesion.split('.')).toHaveLength(2);
    expect(cuerpo.expiraEn).toBeGreaterThan(Date.now());
    expect(cuerpo.estado).toMatchObject({ alumno: { nombre: 'Ana Torres Ruiz', matricula, modo: 'voz' }, entrega: null, plan: 'sin_entrega', defensa: null, ensayo: null });

    const segunda = await request.post('/api/defensa/sesion', {
      data: { token: TOKEN_GRUPO_DEMO.toUpperCase(), nombre: 'Otra Persona', matricula: matricula.toLowerCase(), consentimientos: CONSENTIMIENTOS, modo: 'escrito' },
    });
    const retomada = (await segunda.json()) as { estado: { alumno: { nombre: string; modo: string } } };
    expect(retomada.estado.alumno).toMatchObject({ nombre: 'Ana Torres Ruiz', modo: 'escrito' });
  });

  test('pedir la entrada muchas veces seguidas para la misma persona se frena con 429', async ({ request }) => {
    const matricula = matriculaNueva();
    const cuerpo = { token: TOKEN_GRUPO_DEMO, nombre: 'Ana Torres', matricula, consentimientos: CONSENTIMIENTOS, modo: 'voz' };
    const estados: number[] = [];
    for (let i = 0; i < 18; i += 1) estados.push((await request.post('/api/defensa/sesion', { data: cuerpo })).status());
    expect(estados.slice(0, 15).every((s) => s === 200)).toBe(true);
    expect(estados.slice(15).every((s) => s === 429)).toBe(true);
    const limitado = await request.post('/api/defensa/sesion', { data: cuerpo });
    expect(limitado.headers()['cache-control']).toBe('no-store');
    expect(await limitado.json()).toMatchObject({ error: 'demasiadas_solicitudes' });
  });
});

test.describe('entrega y plan', () => {
  test('texto pegado: entrega al momento y el plan se arma solo, sin llamar a /plan', async ({ request }) => {
    const alumno = await entrar(request);
    const r = await request.post('/api/defensa/entrega', { headers: alumno.encabezados, data: { tipo: 'texto', texto: TRABAJO } });
    expect(r.status()).toBe(201);
    const { entrega } = (await r.json()) as { entrega: { version: number; tipo: string; palabras: number; tardia: boolean; entregadaEn: string } };
    expect(entrega).toMatchObject({ version: 1, tipo: 'texto', tardia: false });
    expect(Date.parse(entrega.entregadaEn)).toBeLessThanOrEqual(Date.now());
    await esperarPlan(request, alumno);

    const estado = await (await request.get('/api/defensa/estado', { headers: alumno.encabezados })).json();
    expect(estado).toMatchObject({ plan: 'listo', entrega: { version: 1 }, defensa: null });
    // Pedir el plan otra vez no hace nada nuevo.
    const otra = await request.post('/api/defensa/plan', { headers: alumno.encabezados });
    expect(await otra.json()).toEqual({ plan: 'listo' });
  });

  test('un texto demasiado corto, un cuerpo con claves de más o un archivo con extensión rara se rechazan', async ({ request }) => {
    const alumno = await entrar(request);
    const corto = await request.post('/api/defensa/entrega', { headers: alumno.encabezados, data: { tipo: 'texto', texto: 'muy poco' } });
    expect([corto.status(), (await corto.json()).error]).toEqual([422, 'sin_texto']);
    const extra = await request.post('/api/defensa/entrega', { headers: alumno.encabezados, data: { tipo: 'texto', texto: TRABAJO, otro: true } });
    expect(extra.status()).toBe(400);
    const exe = await request.post('/api/defensa/entrega', { headers: alumno.encabezados, data: { tipo: 'archivo', nombre: 'virus.exe', bytes: 5000, mime: '' } });
    expect([exe.status(), (await exe.json()).error]).toEqual([415, 'formato_no_aceptado']);
    const grande = await request.post('/api/defensa/entrega', { headers: alumno.encabezados, data: { tipo: 'archivo', nombre: 'a.pdf', bytes: 99 * 1024 * 1024, mime: '' } });
    expect(grande.status()).toBe(400);
  });

  test('archivo: se pide el envío, se sube por la API y se confirma', async ({ request }) => {
    const alumno = await entrar(request);
    const pdf = pdfConTexto([TRABAJO.normalize('NFD').replace(/[̀-ͯ]/g, '')]);
    const inicio = await request.post('/api/defensa/entrega', { headers: alumno.encabezados, data: { tipo: 'archivo', nombre: 'Mi trabajo.pdf', bytes: pdf.byteLength, mime: 'application/pdf' } });
    expect(inicio.status()).toBe(201);
    const { entregaId, subida, maxBytesPorApi } = (await inicio.json()) as { entregaId: string; subida: unknown; maxBytesPorApi: number };
    expect([subida, maxBytesPorApi]).toEqual([null, 4 * 1024 * 1024]);

    // Confirmar antes de que llegue el archivo no entrega nada.
    const antes = await request.post(`/api/defensa/entrega/${entregaId}/confirmar`, { headers: alumno.encabezados });
    expect([antes.status(), (await antes.json()).error]).toEqual([409, 'archivo_no_llego']);

    const sube = await request.put(`/api/defensa/entrega/${entregaId}/archivo`, {
      headers: { ...alumno.encabezados, 'Content-Type': 'application/octet-stream' },
      data: Buffer.from(pdf),
    });
    expect(sube.status()).toBe(204);
    const confirma = await request.post(`/api/defensa/entrega/${entregaId}/confirmar`, { headers: alumno.encabezados });
    expect(confirma.status()).toBe(200);
    expect(await confirma.json()).toMatchObject({ entrega: { version: 1, tipo: 'archivo', nombre: 'Mi trabajo.pdf', paginas: 1 } });
    await esperarPlan(request, alumno);

    // Otro alumno no puede tocar esa entrega.
    const intruso = await entrar(request);
    const ajena = await request.post(`/api/defensa/entrega/${entregaId}/confirmar`, { headers: intruso.encabezados });
    expect(ajena.status()).toBe(404);
    // Ni subir un archivo de más de 4 MB por este camino.
    const otra = await request.post('/api/defensa/entrega', { headers: alumno.encabezados, data: { tipo: 'archivo', nombre: 'otro.pdf', bytes: 5000, mime: '' } });
    const { entregaId: id2 } = (await otra.json()) as { entregaId: string };
    const demasiado = await request.put(`/api/defensa/entrega/${id2}/archivo`, {
      headers: { ...alumno.encabezados, 'Content-Type': 'application/octet-stream' },
      data: Buffer.alloc(4 * 1024 * 1024 + 10),
    });
    expect(demasiado.status()).toBe(413);
  });
});

test.describe('la defensa por la API', () => {
  test('de principio a fin por escrito, sin que el navegador vea nunca el plan', async ({ request }) => {
    const alumno = await entrar(request);
    await entregarTexto(request, alumno);

    const inicio = await iniciarDefensa(request, alumno, false);
    expect(inicio).toMatchObject({ estado: 'en_curso', aclaracion: null, revision: null });
    expect(inicio.pregunta!.pregunta).toMatch(/^¿.+\?$/);
    expect(inicio.pregunta!.audioUrl).toMatch(/^\/api\/defensa\/archivo-dev\?/);

    // Retomar devuelve la misma pregunta.
    expect((await iniciarDefensa(request, alumno, false)).pregunta!.turnoId).toBe(inicio.pregunta!.turnoId);

    const final = await contestarTodo(request, alumno, inicio);
    expect(final).toMatchObject({ estado: 'por_revisar', pregunta: null });
    expect(final.revision).toHaveLength(5);

    const cuerpos = [JSON.stringify(inicio), JSON.stringify(final), await (await request.get('/api/defensa/estado', { headers: alumno.encabezados })).text()];
    for (const texto of cuerpos) {
      for (const secreto of ['evidence', 'followup_if', 'anchor', 'objective_id', 'work_summary', 'promptVersion', 'semilla']) {
        expect(texto, secreto).not.toContain(secreto);
      }
    }

    const entrega = await request.post(`/api/defensa/defensas/${final.id}/entregar`, { headers: alumno.encabezados, data: { marcas: [] } });
    expect(entrega.status()).toBe(200);
    expect((await entrega.json()).defensa).toMatchObject({ estado: 'entregada', estresRespondido: false });
    const estres = await request.post(`/api/defensa/defensas/${final.id}/estres`, { headers: alumno.encabezados, data: { nivel: 3 } });
    expect(estres.status()).toBe(204);
    const malEstres = await request.post(`/api/defensa/defensas/${final.id}/estres`, { headers: alumno.encabezados, data: { nivel: 9 } });
    expect(malEstres.status()).toBe(400);
    expect((await (await request.get('/api/defensa/estado', { headers: alumno.encabezados })).json()).defensa).toMatchObject({ estado: 'entregada', estresRespondido: true });
  });

  test('por voz: partes de audio, aclaración puntual y la parte que se oye', async ({ request }) => {
    const alumno = await entrar(request, matriculaNueva(), 'voz');
    await entregarTexto(request, alumno);
    const inicio = await iniciarDefensa(request, alumno, false);
    const pregunta1 = await responderEscrito(request, alumno, inicio.pregunta!.turnoId);
    const turnoId = pregunta1.pregunta!.turnoId;

    const cabeceras = { ...alumno.encabezados, 'Content-Type': 'application/octet-stream' };
    expect((await request.put(`/api/defensa/turnos/${turnoId}/audio?i=0&intento=0`, { headers: cabeceras, data: Buffer.from([1, 2, 3, 4]) })).status()).toBe(204);
    expect((await request.put(`/api/defensa/turnos/${turnoId}/audio?i=1&intento=0`, { headers: cabeceras, data: Buffer.from([5, 6]) })).status()).toBe(204);
    // Parámetros raros o partes demasiado grandes se rechazan.
    expect((await request.put(`/api/defensa/turnos/${turnoId}/audio?i=abc`, { headers: cabeceras, data: Buffer.from([1]) })).status()).toBe(400);
    expect((await request.put(`/api/defensa/turnos/${turnoId}/audio?i=700`, { headers: cabeceras, data: Buffer.from([1]) })).status()).toBe(400);
    expect((await request.put(`/api/defensa/turnos/${turnoId}/audio?i=2`, { headers: cabeceras, data: Buffer.alloc(600 * 1024) })).status()).toBe(413);

    // Declara tres partes y solo hay dos: dice cuáles faltan.
    const faltan = await request.post(`/api/defensa/turnos/${turnoId}/responder`, {
      headers: alumno.encabezados,
      data: { modo: 'voz', totalPartes: 3, intento: 0, mime: 'audio/webm;codecs=opus', duracionMs: 20000 },
    });
    expect(faltan.status()).toBe(409);
    expect(await faltan.json()).toMatchObject({ error: 'partes_faltantes', detalle: { faltan: [2] } });

    expect((await request.put(`/api/defensa/turnos/${turnoId}/audio?i=2&intento=0`, { headers: cabeceras, data: Buffer.from([7]) })).status()).toBe(204);
    const respuesta = await request.post(`/api/defensa/turnos/${turnoId}/responder`, {
      headers: alumno.encabezados,
      data: { modo: 'voz', totalPartes: 3, intento: 0, mime: 'audio/webm;codecs=opus', duracionMs: 20000 },
    });
    expect(respuesta.status(), await respuesta.text()).toBe(200);
    const { defensa } = (await respuesta.json()) as { defensa: DefensaApi };
    expect(defensa.pregunta).toBeNull();
    expect(defensa.aclaracion).toMatchObject({ turnoId, antes: '…La muestra fue de', despues: 'porque solo tenía dos semanas…' });

    // El audio de la frase fija y el de la respuesta se pueden oír con enlaces firmados, también por tramos.
    for (const url of [defensa.aclaracion!.vozUrl!, defensa.aclaracion!.audioUrl!]) {
      expect(url).toMatch(/^\/api\/defensa\/archivo-dev\?/);
    }
    const voz = await request.get(defensa.aclaracion!.vozUrl!);
    expect(voz.status()).toBe(200);
    expect(voz.headers()['content-type']).toBe('audio/wav');
    expect(voz.headers()['accept-ranges']).toBe('bytes');
    const tramo = await request.get(defensa.aclaracion!.vozUrl!, { headers: { Range: 'bytes=0-9' } });
    expect(tramo.status()).toBe(206);
    expect(tramo.headers()['content-range']).toMatch(/^bytes 0-9\/\d+$/);
    expect((await tramo.body()).byteLength).toBe(10);
    expect((await request.get(defensa.aclaracion!.vozUrl!.replace(/f=[^&]+/, 'f=falsa'))).status()).toBe(404);

    const aclara = await request.post(`/api/defensa/turnos/${turnoId}/aclarar`, {
      headers: alumno.encabezados,
      data: { modo: 'escrito', texto: 'de treinta personas' },
    });
    expect(aclara.status(), await aclara.text()).toBe(200);
    const siguiente = ((await aclara.json()) as { defensa: DefensaApi }).defensa;
    expect(siguiente.aclaracion).toBeNull();
    expect(siguiente.pregunta!.numero).toBe(3);
    // Aclarar otra vez lo mismo no hace nada.
    const repetida = await request.post(`/api/defensa/turnos/${turnoId}/aclarar`, { headers: alumno.encabezados, data: { modo: 'escrito', texto: 'otra cosa' } });
    expect(repetida.status()).toBe(200);
  });

  test('repetir la pregunta y los silencios se cuentan; un turno ajeno no se toca', async ({ request }) => {
    const alumno = await entrar(request);
    await entregarTexto(request, alumno);
    const { pregunta } = await iniciarDefensa(request, alumno, false);
    for (const tipo of ['repeticion', 'repeticion', 'silencio']) {
      const r = await request.post(`/api/defensa/turnos/${pregunta!.turnoId}/marca`, { headers: alumno.encabezados, data: { tipo } });
      expect(r.status()).toBe(204);
    }
    const estado = (await (await request.get('/api/defensa/estado', { headers: alumno.encabezados })).json()) as { defensa: DefensaApi & { pregunta: { repeticiones: number } } };
    expect(estado.defensa.pregunta.repeticiones).toBe(2);

    const intruso = await entrar(request);
    const ajena = await request.post(`/api/defensa/turnos/${pregunta!.turnoId}/marca`, { headers: intruso.encabezados, data: { tipo: 'repeticion' } });
    expect(ajena.status()).toBe(404);
    const noEsId = await request.post('/api/defensa/turnos/no-es-un-id/marca', { headers: alumno.encabezados, data: { tipo: 'repeticion' } });
    expect(noEsId.status()).toBe(404);
    const tipoRaro = await request.post(`/api/defensa/turnos/${pregunta!.turnoId}/marca`, { headers: alumno.encabezados, data: { tipo: 'otra' } });
    expect(tipoRaro.status()).toBe(400);
  });

  test('no se puede empezar sin plan ni leer la defensa de otro', async ({ request }) => {
    const sinNada = await entrar(request);
    const r = await request.post('/api/defensa/defensas', { headers: sinNada.encabezados, data: { ensayo: false } });
    expect([r.status(), (await r.json()).error]).toEqual([409, 'sin_entrega']);

    const dueno = await entrar(request);
    await entregarTexto(request, dueno);
    const defensa = await iniciarDefensa(request, dueno, true);
    const ajena = await request.get(`/api/defensa/defensas/${defensa.id}`, { headers: sinNada.encabezados });
    expect(ajena.status()).toBe(404);
    expect((await request.get(`/api/defensa/defensas/${defensa.id}`, { headers: dueno.encabezados })).status()).toBe(200);
  });
});

test.describe('lo que ve el profesor, por la API', () => {
  test('toques, tiempo de revisión, descargas y el control del enlace', async ({ request }) => {
    const alumno = await entrar(request);
    await entregarTexto(request, alumno);
    const final = await contestarTodo(request, alumno, await iniciarDefensa(request, alumno, false));
    await request.post(`/api/defensa/defensas/${final.id}/entregar`, { headers: alumno.encabezados, data: { marcas: [] } });

    const encabezados = profesor();
    // Los dos toques.
    for (const [tipo, valor] of [['antes', 'si'], ['despues', 'parte']] as const) {
      const r = await request.post('/api/defensa/revision/toque', { headers: encabezados, data: { defensaId: final.id, tipo, valor } });
      expect(r.status(), await r.text()).toBe(204);
    }
    const malToque = await request.post('/api/defensa/revision/toque', { headers: encabezados, data: { defensaId: final.id, tipo: 'antes', valor: 'mucho' } });
    expect(malToque.status()).toBe(400);
    const ajeno = await request.post('/api/defensa/revision/toque', { headers: encabezados, data: { defensaId: '00000000-0000-4000-8000-000000000999', tipo: 'antes', valor: 'si' } });
    expect(ajeno.status()).toBe(404);

    // Tiempo de revisión: abre y actualiza.
    const abre = await request.post('/api/defensa/revision/tiempo', { headers: encabezados, data: { defensaId: final.id, activoMs: 0 } });
    const { aperturaId } = (await abre.json()) as { aperturaId: string };
    expect(aperturaId).toMatch(/^[0-9a-f-]{36}$/);
    const actualiza = await request.post('/api/defensa/revision/tiempo', { headers: encabezados, data: { defensaId: final.id, aperturaId, activoMs: 42_000 } });
    expect(actualiza.status()).toBe(200);

    // Descargas: el zip de todos los trabajos con un enlace que se puede bajar.
    const descarga = await request.post('/api/defensa/descargas', { headers: encabezados, data: { alcance: 'todos' } });
    expect(descarga.status(), await descarga.text()).toBe(200);
    const { url, nombre, cantidad } = (await descarga.json()) as { url: string; nombre: string; cantidad: number };
    expect(nombre).toMatch(/\.zip$/);
    expect(cantidad).toBeGreaterThanOrEqual(1);
    const zip = await request.get(url);
    expect(zip.status()).toBe(200);
    expect(zip.headers()['content-type']).toBe('application/zip');
    expect(Object.keys(unzipSync(new Uint8Array(await zip.body()))).length).toBe(cantidad);

    // Desactivar el enlace: nadie nuevo entra, quien ya estaba sigue; reactivar lo devuelve.
    const apaga = await request.post('/api/defensa/enlace', { headers: encabezados, data: { activo: false } });
    expect(await apaga.json()).toEqual({ activo: false });
    const nuevo = await request.post('/api/defensa/sesion', { data: { token: TOKEN_GRUPO_DEMO, nombre: 'Nueva Persona', matricula: matriculaNueva(), consentimientos: CONSENTIMIENTOS, modo: 'voz' } });
    expect([nuevo.status(), (await nuevo.json()).error]).toEqual([403, 'enlace_inactivo']);
    expect((await request.get('/api/defensa/estado', { headers: alumno.encabezados })).status()).toBe(200);
    await request.post('/api/defensa/enlace', { headers: encabezados, data: { activo: true } });
    expect((await entrar(request)).sesion).toBeTruthy();
  });

  test('un acceso de profesor caducado o firmado con otra clave no sirve', async ({ request }) => {
    const caducado = emitirAccesoProfesor(ACTIVIDAD_DEMO_ID, 1, { ahora: Date.now() - 3_600_000, duracionMs: 1000 }).token;
    const r = await request.post('/api/defensa/enlace', { headers: { Authorization: `Bearer ${caducado}` }, data: { activo: true } });
    expect(r.status()).toBe(401);
    const versionVieja = emitirAccesoProfesor(ACTIVIDAD_DEMO_ID, 7, { duracionMs: 60_000 }).token;
    const v = await request.post('/api/defensa/enlace', { headers: { Authorization: `Bearer ${versionVieja}` }, data: { activo: true } });
    expect(v.status()).toBe(401);
  });
});

test.describe('mantenimiento, ingesta pública y archivos de desarrollo', () => {
  test('el cron solo responde con su secreto', async ({ request }) => {
    expect((await request.get('/api/defensa/mantenimiento')).status()).toBe(401);
    expect((await request.get('/api/defensa/mantenimiento', { headers: { Authorization: 'Bearer incorrecto' } })).status()).toBe(401);
    expect((await request.get('/api/defensa/mantenimiento', { headers: { Authorization: `Bearer ${CRON}x` } })).status()).toBe(401);
    const ok = await request.get('/api/defensa/mantenimiento', { headers: { Authorization: `Bearer ${CRON}` } });
    expect(ok.status()).toBe(200);
    expect(await ok.json()).toMatchObject({ ok: true, defensasSinAudio: expect.any(Number), zipsBorrados: expect.any(Number) });
    // Es solo GET: la limpieza no se dispara con un POST de cualquiera.
    expect((await request.post('/api/defensa/mantenimiento', { headers: { Authorization: `Bearer ${CRON}` } })).status()).toBe(405);
  });

  test('la ingesta pública de eventos rechaza los taller_id que escribe el servidor', async ({ request }) => {
    const ts = new Date().toISOString();
    const evento = (tallerId: string, id: string) => ({
      actor_sid: 'sid-prueba', taller_id: tallerId, paso_id: 'x', verbo: 'completo_paso', ts, client_event_id: id, client_ts: ts,
    });
    const falso = await request.post('/api/events/ingest', { data: { events: [evento('defensa:00000000-0000-4000-8000-000000000d3a', 'evento-falso-1')] } });
    expect([falso.status(), (await falso.json()).error]).toEqual([400, 'invalid_payload']);
    const mayusculas = await request.post('/api/events/ingest', { data: { events: [evento('DEFENSA：x', 'evento-falso-2')] } });
    expect(mayusculas.status()).toBe(400);
  });

  test('los archivos de desarrollo solo se sirven con firma vigente', async ({ request }) => {
    for (const ruta of ['/api/defensa/archivo-dev', '/api/defensa/archivo-dev?k=audio/x&e=9999999999999&f=nada', '/api/defensa/archivo-dev?k=trabajos/x&e=1&f=nada']) {
      expect((await request.get(ruta)).status(), ruta).toBe(404);
    }
  });
});

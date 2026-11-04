import '../support/sinServerOnly';
import { expect, test, type APIRequestContext } from '@playwright/test';
import type { EventoAsistente, RespuestaAsistente } from '../../src/components/revision/catalogo';
import { ACTIVIDAD_DEMO_ID, TOKEN_GRUPO_DEMO } from '../../src/lib/defensa/almacen/semilla';
import { emitirAccesoProfesor } from '../../src/lib/defensa/firmas';
import { TRABAJO } from '../support/fixtures';

/**
 * El asistente del profesor de punta a punta, con almacén en memoria y el modelo
 * `mock`: la ruta con sus pasos en NDJSON, los rechazos, el respaldo de reglas, el
 * dictado (cerrado sin transcripción real) y el visor del trabajo.
 */
process.env.DEFENSA_SIGNING_SECRET = 'playwright-only-defensa-secret-00000000000';

const RESPUESTA =
  'Elegí la encuesta porque necesitaba llegar a más compañeros en pocos días y con entrevistas solo hubiera hablado con cinco personas esa semana';
const CONSENTIMIENTOS = { avisoPrivacidad: true, transferenciaInternacional: true, mayorDeEdad: true };
const enlaceDelProfesor = () => emitirAccesoProfesor(ACTIVIDAD_DEMO_ID, 1, { duracionMs: 60 * 60 * 1000 }).token;

interface DefensaApi {
  id: string;
  estado: string;
  pregunta: { turnoId: string } | null;
}

async function defensaEntregada(request: APIRequestContext, nombre: string): Promise<{ matricula: string }> {
  const matricula = `AS-${Date.now().toString(36).toUpperCase()}`;
  const sesion = await request.post('/api/defensa/sesion', {
    data: { token: TOKEN_GRUPO_DEMO, nombre, matricula, consentimientos: CONSENTIMIENTOS, modo: 'escrito' },
  });
  expect(sesion.status(), await sesion.text()).toBe(200);
  const encabezados = { Authorization: `Bearer ${((await sesion.json()) as { sesion: string }).sesion}` };
  expect((await request.post('/api/defensa/entrega', { headers: encabezados, data: { tipo: 'texto', texto: TRABAJO } })).status()).toBe(201);
  for (let i = 0; i < 40; i += 1) {
    const estado = (await (await request.get('/api/defensa/estado', { headers: encabezados })).json()) as { plan: string };
    if (estado.plan === 'listo') break;
    await new Promise((resolver) => setTimeout(resolver, 500));
  }
  let defensa = ((await (await request.post('/api/defensa/defensas', { headers: encabezados, data: { ensayo: false } })).json()) as { defensa: DefensaApi }).defensa;
  for (let i = 0; i < 12 && defensa.estado === 'en_curso' && defensa.pregunta; i += 1) {
    const r = await request.post(`/api/defensa/turnos/${defensa.pregunta.turnoId}/responder`, {
      headers: encabezados,
      data: { modo: 'escrito', texto: RESPUESTA, duracionMs: 9000 },
    });
    defensa = ((await r.json()) as { defensa: DefensaApi }).defensa;
  }
  expect((await request.post(`/api/defensa/defensas/${defensa.id}/entregar`, { headers: encabezados, data: { marcas: [] } })).status()).toBe(200);
  return { matricula };
}

async function preguntar(request: APIRequestContext, enlace: string, peticion: string): Promise<{ pasos: string[]; respuesta: RespuestaAsistente }> {
  const r = await request.post('/api/defensa/asistente', {
    headers: { Authorization: `Bearer ${enlace}` },
    data: { peticion, historial: [] },
  });
  expect(r.status(), await r.text()).toBe(200);
  expect(r.headers()['content-type']).toContain('application/x-ndjson');
  expect(r.headers()['cache-control']).toBe('no-store');
  const eventos = (await r.text())
    .split('\n')
    .filter(Boolean)
    .map((linea) => JSON.parse(linea) as EventoAsistente);
  const final = eventos[eventos.length - 1];
  if (final?.tipo !== 'respuesta') throw new Error(`sin respuesta: ${JSON.stringify(final)}`);
  return { pasos: eventos.flatMap((e) => (e.tipo === 'paso' ? [e.texto] : [])), respuesta: final.respuesta };
}

test.describe('la ruta del asistente', () => {
  test('pide el enlace del profesor y valida lo que recibe', async ({ request }) => {
    expect((await request.post('/api/defensa/asistente', { data: { peticion: 'hola' } })).status()).toBe(401);
    const enlace = enlaceDelProfesor();
    const vacia = await request.post('/api/defensa/asistente', { headers: { Authorization: `Bearer ${enlace}` }, data: { peticion: '' } });
    expect(vacia.status()).toBe(400);
    const larga = await request.post('/api/defensa/asistente', { headers: { Authorization: `Bearer ${enlace}` }, data: { peticion: 'a'.repeat(301) } });
    expect(larga.status()).toBe(400);
  });

  test('contesta con pasos y tarjetas del catálogo', async ({ request }) => {
    await defensaEntregada(request, 'Ana Torres Ruiz');
    const enlace = enlaceDelProfesor();
    const { pasos, respuesta } = await preguntar(request, enlace, '¿Cuántos defendieron?');
    expect(pasos[0]).toMatch(/^Leo tu grupo: \d+ personas, \d+ entregas y \d+ defensas…$/);
    expect(respuesta.tarjetas.map((t) => t.tipo)).toEqual(['avance']);
    expect(respuesta.fuente).toBe('plantilla'); // el modelo falso no escribe frase
    // Lo que llega al navegador no trae el prompt ni la hoja del grupo.
    expect(JSON.stringify(respuesta)).not.toContain('HOJA DEL GRUPO');
  });

  test('rechaza sin modelo y, si el modelo falla, contestan las reglas', async ({ request }) => {
    const enlace = enlaceDelProfesor();
    const copia = await preguntar(request, enlace, '¿Quién copió?');
    expect(copia.respuesta).toMatchObject({ fuente: 'filtro', rechazo: 'sospecha', tarjetas: [] });
    const falla = await preguntar(request, enlace, 'simula una falla: ¿cuántos defendieron?');
    expect(falla.respuesta.fuente).toBe('reglas');
    expect(falla.respuesta.tarjetas.map((t) => t.tipo)).toEqual(['avance']);
    const cifra = await preguntar(request, enlace, 'simula una cifra');
    expect(cifra.respuesta.fuente).toBe('plantilla');
    expect(cifra.respuesta.texto).not.toContain('9999');
  });

  test('el dictado no existe sin transcripción real', async ({ request }) => {
    const r = await request.post('/api/defensa/asistente/dictado', {
      headers: { Authorization: `Bearer ${enlaceDelProfesor()}`, 'Content-Type': 'audio/webm' },
      data: Buffer.from('MOCK:muéstrame a todos'),
    });
    expect(r.status()).toBe(503);
  });
});

test.describe('el profesor en el navegador', () => {
  test('pide algo, ve los pasos plegados, la tarjeta y un rechazo amable', async ({ page, request }) => {
    await defensaEntregada(request, 'Luis Bravo Méndez');
    await page.goto(`/revision/${enlaceDelProfesor()}`);
    await expect(page.getByRole('heading', { name: 'Hola, Laura.' })).toBeVisible();
    // Sin transcripción real no se ofrece dictar.
    await expect(page.getByRole('button', { name: 'Dictar' })).toHaveCount(0);

    const campo = page.getByLabel('Pídele algo a Celestea');
    await campo.fill('¿Qué me falta?');
    await campo.press('Enter');
    await expect(page.getByRole('article', { name: 'Lo que te falta' })).toBeVisible();
    await expect(page.getByText(/Cómo lo busqué · \d pasos/)).toBeVisible();

    await campo.fill('¿Quién es el peor?');
    await campo.press('Enter');
    await expect(page.getByText('No ordeno a nadie de mejor a peor.', { exact: false })).toBeVisible();
  });

  test('lee el trabajo del alumno junto a su reporte, sin calificar', async ({ page, request }) => {
    const { matricula } = await defensaEntregada(request, 'Sofía Aguilar Ramos');
    await page.goto(`/revision/${enlaceDelProfesor()}/alumno/${matricula}?vista=reporte`);
    await page.getByRole('button', { name: 'Leer su trabajo' }).click();
    const visor = page.getByRole('complementary', { name: 'Trabajo de Sofía' });
    await expect(visor).toBeVisible();
    await expect(visor.getByText('Aquí no se califica', { exact: false })).toBeVisible();
    await expect(visor.getByText(TRABAJO.slice(0, 40), { exact: false })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(visor).toHaveCount(0);
  });
});

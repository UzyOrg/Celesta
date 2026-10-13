import '../support/sinServerOnly';
import { expect, test, type APIRequestContext } from '@playwright/test';
import { ACTIVIDAD_DEMO_ID, TOKEN_GRUPO_DEMO } from '../../src/lib/defensa/almacen/semilla';
import { emitirAccesoProfesor } from '../../src/lib/defensa/firmas';
import { TRABAJO } from '../support/fixtures';

/**
 * El lado del profesor en el navegador, con datos reales del almacén en memoria: una defensa
 * completa se hace por la API y luego la profesora entra con su enlace firmado.
 * Los secretos son los de playwright.config.ts (solo existen en las pruebas).
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
  aclaracion: { turnoId: string } | null;
  revision: Array<{ turnoId: string; lineas?: Array<{ id: string }> }> | null;
}

/** Una defensa entregada por la API: entra, sube su trabajo, contesta todo por escrito y entrega. */
async function defensaEntregada(request: APIRequestContext): Promise<{ matricula: string }> {
  const matricula = `PRO-${Date.now().toString(36).toUpperCase()}`;
  const sesion = await request.post('/api/defensa/sesion', {
    data: { token: TOKEN_GRUPO_DEMO, nombre: 'Ana Torres Ruiz', matricula, consentimientos: CONSENTIMIENTOS, modo: 'escrito' },
  });
  expect(sesion.status(), await sesion.text()).toBe(200);
  const encabezados = { Authorization: `Bearer ${((await sesion.json()) as { sesion: string }).sesion}` };

  const entrega = await request.post('/api/defensa/entrega', { headers: encabezados, data: { tipo: 'texto', texto: TRABAJO } });
  expect(entrega.status(), await entrega.text()).toBe(201);
  for (let i = 0; i < 40; i += 1) {
    const estado = (await (await request.get('/api/defensa/estado', { headers: encabezados })).json()) as { plan: string };
    if (estado.plan === 'listo') break;
    await new Promise((resolver) => setTimeout(resolver, 500));
  }

  const inicio = await request.post('/api/defensa/defensas', { headers: encabezados, data: { ensayo: false } });
  expect(inicio.status(), await inicio.text()).toBe(200);
  let defensa = ((await inicio.json()) as { defensa: DefensaApi }).defensa;
  for (let i = 0; i < 12 && defensa.estado === 'en_curso' && defensa.pregunta; i += 1) {
    const r = await request.post(`/api/defensa/turnos/${defensa.pregunta.turnoId}/responder`, {
      headers: encabezados,
      data: { modo: 'escrito', texto: RESPUESTA, duracionMs: 9000 },
    });
    expect(r.status(), await r.text()).toBe(200);
    defensa = ((await r.json()) as { defensa: DefensaApi }).defensa;
  }
  expect(defensa.estado).toBe('por_revisar');
  const entregada = await request.post(`/api/defensa/defensas/${defensa.id}/entregar`, { headers: encabezados, data: { marcas: [] } });
  expect(entregada.status(), await entregada.text()).toBe(200);
  return { matricula };
}

/** Una defensa entregada por voz: audio por partes, una parte que no se entiende y una frase marcada. */
async function defensaPorVozEntregada(request: APIRequestContext): Promise<{ matricula: string }> {
  const matricula = `VOZ-${Date.now().toString(36).toUpperCase()}`;
  const sesion = await request.post('/api/defensa/sesion', {
    data: { token: TOKEN_GRUPO_DEMO, nombre: 'Ana Torres Ruiz', matricula, consentimientos: CONSENTIMIENTOS, modo: 'voz' },
  });
  const encabezados = { Authorization: `Bearer ${((await sesion.json()) as { sesion: string }).sesion}` };
  expect((await request.post('/api/defensa/entrega', { headers: encabezados, data: { tipo: 'texto', texto: TRABAJO } })).status()).toBe(201);
  for (let i = 0; i < 40; i += 1) {
    const estado = (await (await request.get('/api/defensa/estado', { headers: encabezados })).json()) as { plan: string };
    if (estado.plan === 'listo') break;
    await new Promise((resolver) => setTimeout(resolver, 500));
  }

  let defensa = ((await (await request.post('/api/defensa/defensas', { headers: encabezados, data: { ensayo: false } })).json()) as { defensa: DefensaApi }).defensa;
  let turno = 0;
  for (let i = 0; i < 14 && defensa.estado === 'en_curso'; i += 1) {
    if (defensa.aclaracion) {
      const r = await request.post(`/api/defensa/turnos/${defensa.aclaracion.turnoId}/aclarar`, {
        headers: encabezados,
        data: { modo: 'escrito', texto: 'necesitaba llegar a más compañeros' },
      });
      expect(r.status(), await r.text()).toBe(200);
      defensa = ((await r.json()) as { defensa: DefensaApi }).defensa;
      continue;
    }
    const turnoId = defensa.pregunta?.turnoId;
    if (!turnoId) break;
    turno += 1;
    // La segunda respuesta lleva palabras dudosas: pide una aclaración puntual.
    const dicho = turno === 2 ? RESPUESTA.replace('necesitaba llegar a más compañeros', '~~necesitaba llegar a más compañeros~~') : RESPUESTA;
    const subida = await request.put(`/api/defensa/turnos/${turnoId}/audio?i=0&intento=0`, {
      headers: { ...encabezados, 'Content-Type': 'application/octet-stream' },
      data: Buffer.from(`MOCK:${dicho}`),
    });
    expect(subida.status()).toBe(204);
    const r = await request.post(`/api/defensa/turnos/${turnoId}/responder`, {
      headers: encabezados,
      data: { modo: 'voz', totalPartes: 1, intento: 0, mime: 'audio/webm;codecs=opus', duracionMs: 9000 },
    });
    expect(r.status(), await r.text()).toBe(200);
    defensa = ((await r.json()) as { defensa: DefensaApi }).defensa;
  }
  expect(defensa.estado).toBe('por_revisar');

  // Marca la primera línea de la última respuesta hablada: "No lo dije así".
  const ultimo = [...(defensa.revision ?? [])].reverse().find((bloque) => (bloque.lineas?.length ?? 0) > 0);
  const marcas = ultimo?.lineas?.[0] ? [{ turnoId: ultimo.turnoId, linea: ultimo.lineas[0].id }] : [];
  expect(marcas).toHaveLength(1);
  const entregada = await request.post(`/api/defensa/defensas/${defensa.id}/entregar`, { headers: encabezados, data: { marcas } });
  expect(entregada.status(), await entregada.text()).toBe(200);
  return { matricula };
}

test.describe('profesor con datos reales', () => {
  test('entra con su enlace, ve el reporte, contesta los dos toques y baja el trabajo', async ({ page, request }) => {
    const { matricula } = await defensaEntregada(request);
    const enlace = enlaceDelProfesor();

    // Inicio: saludo y sin la entrada de "Nueva actividad", que todavía no existe con datos reales.
    await page.goto(`/revision/${enlace}`);
    await expect(page.getByRole('heading', { name: 'Hola, Laura.' })).toBeVisible();
    await expect(page.getByText('Nueva actividad')).toHaveCount(0);

    // Antes de ver el reporte: el toque se guarda y lleva al reporte.
    await page.goto(`/revision/${enlace}/alumno/${matricula}`);
    await expect(page.getByRole('heading', { name: /domina el tema/ })).toBeVisible();
    const toqueAntes = page.waitForResponse((r) => r.url().endsWith('/api/defensa/revision/toque') && r.request().method() === 'POST');
    await page.getByRole('link', { name: 'En parte' }).click();
    expect((await toqueAntes).status()).toBe(204);

    // El reporte: la identidad, lo que respondió y la medición del tiempo abierta.
    await expect(page.getByRole('heading', { level: 1, name: 'Ana Torres Ruiz' })).toBeVisible();
    await expect(page.getByText(RESPUESTA).first()).toBeVisible();
    await expect(page.getByText('La transcripción de Ana no está en esta demostración.')).toHaveCount(0);
    await expect(page.getByText('Esta demostración')).toHaveCount(0);

    // Descargar el trabajo: un enlace que caduca con el nombre de la matrícula.
    const descarga = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar trabajo' }).click();
    expect((await descarga).suggestedFilename()).toMatch(new RegExp(`^${matricula}-ana-torres-ruiz-v1\\.txt$`, 'i'));

    // La pregunta de cierre también se guarda.
    const toqueDespues = page.waitForResponse((r) => r.url().endsWith('/api/defensa/revision/toque') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Sí', exact: true }).click();
    expect((await toqueDespues).status()).toBe(204);
  });

  test('una defensa por voz muestra la transcripción, lo marcado y deja oír solo esa parte', async ({ page, request }) => {
    const { matricula } = await defensaPorVozEntregada(request);
    await page.goto(`/revision/${enlaceDelProfesor()}/alumno/${matricula}?vista=reporte`);

    await expect(page.getByRole('heading', { level: 1, name: 'Ana Torres Ruiz' })).toBeVisible();
    // La transcripción sale línea por línea con su minuto, y lo aclarado se distingue de lo dicho.
    await expect(page.getByText('00:00').first()).toBeVisible();
    await expect(page.getByText(/partes? para oír/)).toBeVisible();
    await expect(page.getByText(/El audio se borra el/)).toBeVisible();

    // Oír la frase marcada: pide un enlace firmado que caduca para esa respuesta y solo ese tramo.
    const audio = page.waitForResponse((r) => r.url().endsWith('/api/defensa/revision/audio') && r.request().method() === 'POST');
    await page.getByRole('button', { name: /Oír la (frase que Ana marcó|parte aclarada)/ }).first().click();
    const respuesta = await audio;
    expect(respuesta.status()).toBe(200);
    expect(((await respuesta.json()) as { url: string }).url).toMatch(/^(\/api\/defensa\/archivo-dev\?|https:\/\/)/);
  });

  test('la lista del grupo baja todos los trabajos en un zip', async ({ page, request }) => {
    await defensaEntregada(request);
    const enlace = enlaceDelProfesor();
    const descarga = page.waitForEvent('download', { timeout: 30_000 });
    await page.goto(`/revision/${enlace}?escena=descarga`);
    expect((await descarga).suggestedFilename()).toMatch(/\.zip$/);
    await expect(page.getByText('Descargado')).toBeVisible();
  });

  test('un enlace que no sirve responde no encontrado, igual que uno que nunca existió', async ({ page }) => {
    const bueno = enlaceDelProfesor();
    const manipulado = `${bueno.slice(0, -2)}xx`;
    for (const ruta of [`/revision/${manipulado}`, '/revision/no-es-un-enlace', `/revision/${manipulado}/alumno/20231457`]) {
      const respuesta = await page.goto(ruta);
      expect(respuesta?.status(), ruta).toBe(404);
    }
    // La pantalla de "Nueva actividad" es solo el diseño: con datos reales no existe.
    const nueva = await page.goto(`/revision/${bueno}/nueva`);
    expect(nueva?.status()).toBe(404);
  });

  test('un alumno inexistente en el grupo responde no encontrado', async ({ page }) => {
    const respuesta = await page.goto(`/revision/${enlaceDelProfesor()}/alumno/NO-EXISTE-9999`);
    expect(respuesta?.status()).toBe(404);
  });
});

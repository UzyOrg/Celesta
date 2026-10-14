import { expect, test, type Page } from '@playwright/test';
import { TRABAJO } from '../support/fixtures';

/**
 * El flujo del alumno en el navegador, contra el servidor de desarrollo de Playwright:
 * almacén en memoria con la actividad de demostración y modelo, transcripción y voz falsos.
 *
 * - Por escrito: de "Hola" a "Listo" sin tocar el micrófono.
 * - Con voz: micrófono falso de Chrome/Edge (un tono), grabación por partes, la parte
 *   que no se entiende y su aclaración.
 * - Reanudar: recargar a media defensa devuelve a la misma pregunta.
 */

const RUTA = '/defensa/demo-celestea';
const RESPUESTA =
  'Elegí la encuesta porque necesitaba llegar a más compañeros en pocos días y con entrevistas solo hubiera hablado con cinco personas esa semana';

// Micrófono falso (un tono) y permiso dado: solo la prueba con voz lo usa; las demás nunca lo piden.
test.use({
  permissions: ['microphone'],
  launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
});

let contador = 0;
const matriculaNueva = () => `UI-${Date.now().toString(36).toUpperCase()}-${(contador += 1)}`;

async function entrarYSubirTrabajo(page: Page, modo: 'Hablar' | 'Escribir'): Promise<void> {
  await page.goto(RUTA);
  await page.getByRole('button', { name: 'Empezar' }).click();

  await page.getByLabel('Nombre completo').fill('Ana Torres Ruiz');
  await page.getByLabel('Matrícula').fill(matriculaNueva());
  await page.getByRole('button', { name: 'Seguir' }).click();

  for (const interruptor of await page.getByRole('switch').all()) await interruptor.check({ force: true });
  await page.getByRole('button', { name: 'Aceptar' }).click();

  await page.getByText(modo, { exact: true }).click();
  await page.getByRole('button', { name: 'Seguir' }).click();

  await page.getByRole('button', { name: 'Pegar texto' }).click();
  await page.getByLabel('El texto de tu trabajo').fill(TRABAJO);
  await page.getByRole('button', { name: 'Usar este texto' }).click();

  await expect(page.getByRole('heading', { name: /Ya cuenta/ })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Seguir' }).click();
}

async function empezarDefensa(page: Page): Promise<void> {
  const empezar = page.getByRole('button', { name: /Empezar defensa|Continuar defensa/ });
  // El botón se activa cuando las preguntas ya están listas.
  await expect(empezar).not.toHaveAttribute('aria-disabled', 'true', { timeout: 60_000 });
  await empezar.click();
}

/**
 * Hace una acción y espera a que la pantalla siguiente tome su lugar: mientras se anima el
 * cambio la pantalla anterior sigue a la vista, y actuar sobre ella no sirve de nada.
 */
async function alAvanzar(page: Page, accion: () => Promise<void>): Promise<void> {
  const titulo = page.getByRole('heading', { level: 1 }).first();
  const antes = (await titulo.textContent()) ?? '';
  await accion();
  await expect(titulo).not.toHaveText(antes, { timeout: 30_000 });
}

async function responderPorEscrito(page: Page): Promise<void> {
  await alAvanzar(page, async () => {
    await page.getByLabel('Tu respuesta').fill(RESPUESTA);
    await page.getByRole('button', { name: 'Listo' }).click();
  });
}

test('valida nombre y matrícula antes de llegar a los permisos', async ({ page }) => {
  await page.goto(RUTA);
  await page.getByRole('button', { name: 'Empezar' }).click();
  await page.getByLabel('Nombre completo').fill('12345');
  await page.getByLabel('Matrícula').fill('DEMO-VALIDACION');
  await page.getByRole('button', { name: 'Seguir' }).click({ force: true });
  await expect(page.getByRole('heading', { name: '¿Quién eres?' })).toBeVisible();
  expect(await page.getByLabel('Nombre completo').evaluate((campo: HTMLInputElement) => campo.validationMessage)).toContain('nombre');
  await page.getByLabel('Nombre completo').fill('Prueba Local');
  await page.getByLabel('Matrícula').fill('1');
  await page.getByRole('button', { name: 'Seguir' }).click({ force: true });
  await expect(page.getByRole('heading', { name: '¿Quién eres?' })).toBeVisible();
  expect(await page.getByLabel('Matrícula').evaluate((campo: HTMLInputElement) => campo.validationMessage)).toContain('3 a 30');
  await page.getByLabel('Matrícula').fill('a01 234');
  await page.getByRole('button', { name: 'Seguir' }).click();
  await expect(page.getByRole('heading', { name: 'Tres sí y seguimos.' })).toBeVisible();
});

test('permite reintentar una sesión fallida sin perder los switches', async ({ page }, testInfo) => {
  let intentos = 0;
  await page.route('**/api/defensa/sesion', async (ruta) => {
    intentos += 1;
    if (intentos === 1) await ruta.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'no_configurado', mensaje: 'El servicio no está configurado.' }) });
    else await ruta.continue();
  });
  await page.goto(RUTA);
  await page.getByRole('button', { name: 'Empezar' }).click();
  await page.getByLabel('Nombre completo').fill('Prueba Local');
  await page.getByLabel('Matrícula').fill(matriculaNueva());
  await page.getByRole('button', { name: 'Seguir' }).click();
  for (const interruptor of await page.getByRole('switch').all()) await interruptor.check({ force: true });
  await page.getByRole('button', { name: 'Aceptar' }).click();
  await expect(page.getByText('El servicio no está configurado.')).toBeVisible();
  for (const interruptor of await page.getByRole('switch').all()) await expect(interruptor).toBeChecked();
  await page.getByRole('button', { name: 'Aceptar' }).click();
  await expect(page.getByRole('heading', { name: '¿Hablas o escribes?' })).toBeVisible();
  expect(intentos).toBe(2);
  // Espera a que terminen las entradas finitas; no altera las animaciones del producto.
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations().filter((a) => Number.isFinite(a.effect?.getTiming().iterations)).map((a) => a.finished.catch(() => undefined)));
  });
  await page.screenshot({ path: testInfo.outputPath('permisos-resueltos.png'), scale: 'css' });
});

test.describe('alumno por escrito', () => {
  test('recorre el flujo completo sin micrófono y entrega', async ({ page }) => {
    await entrarYSubirTrabajo(page, 'Escribir');

    await expect(page.getByRole('heading', { name: 'Cuando quieras.' })).toBeVisible();
    await empezarDefensa(page);

    // Cada pregunta se contesta por escrito hasta llegar a la revisión (máximo 6 en la modalidad corta).
    for (let turno = 0; turno < 8; turno += 1) {
      const revision = page.getByRole('heading', { name: 'Revisa tu transcripción' });
      const respuesta = page.getByLabel('Tu respuesta');
      await expect(revision.or(respuesta)).toBeVisible({ timeout: 30_000 });
      if (await revision.isVisible()) break;
      await responderPorEscrito(page);
    }
    await expect(page.getByRole('heading', { name: 'Revisa tu transcripción' })).toBeVisible();

    await page.getByRole('button', { name: 'Entregar defensa' }).click();
    await expect(page.getByText(/Defensa entregada a las \d{2}:\d{2}/)).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: 'Igual' }).click();
    await expect(page.getByRole('heading', { name: 'Listo.' })).toBeVisible();
    await expect(page.getByText('Tu profe califica donde siempre.')).toBeVisible();
  });

  test('si se recarga a media defensa, regresa a la misma pregunta', async ({ page }) => {
    await entrarYSubirTrabajo(page, 'Escribir');
    await empezarDefensa(page);

    const pregunta = page.getByRole('heading', { level: 1 }).first();
    await expect(page.getByLabel('Tu respuesta')).toBeVisible({ timeout: 30_000 });
    const texto = (await pregunta.textContent()) ?? '';

    await page.reload();
    await expect(page.getByLabel('Tu respuesta')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('heading', { level: 1 }).first()).toHaveText(texto);
  });

  test('un enlace que no existe responde no encontrado', async ({ page }) => {
    const respuesta = await page.goto('/defensa/no-existe-este-enlace');
    expect(respuesta?.status()).toBe(404);
  });
});

test.describe('alumno con voz', () => {
  test('graba por partes, aclara la parte que no se entendió y entrega', async ({ page }) => {
    await entrarYSubirTrabajo(page, 'Hablar');

    // Prueba de micrófono: con el tono falso se oye bien o, como mínimo, deja seguir.
    await expect(page.getByRole('heading', { name: /hola/i }).first()).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: /Seguir|Listo|Sí/ }).last().click();

    await empezarDefensa(page);

    const subidas: string[] = [];
    page.on('request', (peticion) => {
      if (peticion.method() === 'PUT' && /\/api\/defensa\/turnos\/[^/]+\/audio/.test(peticion.url())) subidas.push(peticion.url());
    });

    let huboAclaracion = false;
    for (let turno = 0; turno < 10; turno += 1) {
      const revision = page.getByRole('heading', { name: 'Revisa tu transcripción' });
      const escuchando = page.getByText(/Te escucho|Escucha la pregunta/);
      const aclaracion = page.getByRole('heading', { name: 'No te entendí esta parte.' });
      await expect(revision.or(escuchando).or(aclaracion).first()).toBeVisible({ timeout: 30_000 });
      if (await revision.isVisible()) break;

      if (await aclaracion.isVisible()) {
        huboAclaracion = true;
        await alAvanzar(page, async () => {
          await page.getByRole('button', { name: 'Escribirlo' }).click();
          await page.getByLabel('Escribe esa parte').fill('cuarenta personas de mi facultad');
          await page.getByRole('button', { name: 'Listo' }).click();
        });
        continue;
      }

      // Se habla un par de segundos (el micrófono falso emite un tono) y se pulsa Listo.
      await expect(page.getByText('Te escucho')).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(4_500);
      await alAvanzar(page, () => page.getByRole('button', { name: 'Listo' }).click());
    }

    await expect(page.getByRole('heading', { name: 'Revisa tu transcripción' })).toBeVisible();
    expect(subidas.length, 'se subieron partes de audio').toBeGreaterThan(0);
    expect(huboAclaracion, 'el hueco de baja confianza pidió una aclaración').toBe(true);

    await page.getByRole('button', { name: 'Entregar defensa' }).click();
    await page.getByRole('button', { name: 'Igual' }).click();
    await expect(page.getByRole('heading', { name: 'Listo.' })).toBeVisible({ timeout: 30_000 });
  });
});

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

/** Cuenta las veces que el navegador pide un audio de Celestea (las preguntas se sirven desde esta ruta en pruebas). */
function contarAudiosDeCelestea(page: Page): () => number {
  let pedidos = 0;
  page.on('request', (peticion) => {
    if (peticion.url().includes('/api/defensa/archivo-dev')) pedidos += 1;
  });
  return () => pedidos;
}

test.describe('micrófono bloqueado', () => {
  test.beforeEach(async ({ page }) => {
    // Lo mismo que ve quien pulsó "Bloquear" o abre la página en un navegador que no ofrece permisos.
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
    });
  });

  test('dice por qué falló y Celestea sigue diciendo las preguntas aunque se responda escribiendo', async ({ page }) => {
    const audios = contarAudiosDeCelestea(page);
    await entrarYSubirTrabajo(page, 'Hablar');

    // La prueba de micrófono avisa que no hay micrófono; "Seguir" pasa a escribir sin apagar la voz de Celestea.
    await expect(page.getByRole('heading', { name: /hola/i }).first()).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Seguir' }).click();
    await empezarDefensa(page);

    await expect(page.getByLabel('Tu respuesta')).toBeVisible({ timeout: 30_000 });
    await expect.poll(audios, { message: 'la pregunta se pidió en audio', timeout: 15_000 }).toBeGreaterThan(0);

    // La pregunta no calla la falla: dice qué pasó y qué hacer, no un mensaje genérico, y deja volver a intentarlo.
    await expect(page.getByText(/bloqueado el micrófono para esta página/)).toBeVisible();
    await page.getByRole('button', { name: 'Probar el micrófono otra vez' }).click();
    await expect(page.getByText(/Sigue sin abrir/)).toBeVisible();
    await expect(page.getByLabel('Tu respuesta')).toBeVisible();
  });

  test('quien elige escribir desde el principio no oye nada solo', async ({ page }) => {
    const audios = contarAudiosDeCelestea(page);
    await entrarYSubirTrabajo(page, 'Escribir');
    await empezarDefensa(page);
    await expect(page.getByLabel('Tu respuesta')).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(2_500);
    expect(audios()).toBe(0);

    // Repetir la pregunta es otro toque: eso sí la dice.
    await page.getByRole('button', { name: 'Repetir pregunta' }).click();
    await expect.poll(audios, { timeout: 15_000 }).toBeGreaterThan(0);
  });
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
      const escuchando = page.getByText(/Te escucho|Celestea habla/);
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

/* ------------------------- primero habla, después se lee ------------------------- */

interface RegistroDeVoz {
  /** Cuándo empezó a sonar de verdad cada audio de Celestea (evento `playing`). */
  sonando: number[];
  /** Cada vez que la pregunta escrita aparece en la página o cambia de "en-espera" a "visible". */
  textos: { t: number; valor: string | null }[];
  /** Cuándo empezó cada grabación del micrófono. */
  grabaciones: number[];
}

/** Anota, con el reloj de la página, cuándo suena la voz y cuándo se deja ver la pregunta escrita. */
async function registrarVozYTexto(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const registro: RegistroDeVoz = { sonando: [], textos: [], grabaciones: [] };
    (window as unknown as { __registro: RegistroDeVoz }).__registro = registro;
    if (typeof MediaRecorder !== 'undefined') {
      const grabar = MediaRecorder.prototype.start;
      MediaRecorder.prototype.start = function start(this: MediaRecorder, ...argumentos: [number?]) {
        registro.grabaciones.push(performance.now());
        return grabar.apply(this, argumentos);
      };
    }
    const escuchados = new WeakSet<HTMLMediaElement>();
    const reproducir = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function play(this: HTMLMediaElement) {
      if (!escuchados.has(this)) {
        escuchados.add(this);
        this.addEventListener('playing', () => {
          if (this.currentSrc.includes('/api/defensa/archivo-dev')) registro.sonando.push(performance.now());
        });
      }
      return reproducir.call(this);
    };
    const anotar = (elemento: Element) => registro.textos.push({ t: performance.now(), valor: elemento.getAttribute('data-texto') });
    new MutationObserver((cambios) => {
      for (const cambio of cambios) {
        if (cambio.type === 'attributes' && cambio.target instanceof Element) anotar(cambio.target);
        for (const nodo of Array.from(cambio.addedNodes)) {
          if (!(nodo instanceof Element)) continue;
          if (nodo.matches('[data-texto]')) anotar(nodo);
          nodo.querySelectorAll('[data-texto]').forEach(anotar);
        }
      }
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-texto'] });
  });
}

const leerRegistro = (page: Page): Promise<RegistroDeVoz> =>
  page.evaluate(() => (window as unknown as { __registro: RegistroDeVoz }).__registro);

/**
 * Cada vez que la pregunta escrita pasa de "en-espera" a "visible", la voz ya había empezado
 * a sonar y no tardó más de un segundo. Devuelve cuántas veces pasó.
 */
function revisarRevelaciones(registro: RegistroDeVoz): number {
  let revelaciones = 0;
  let desde: number | null = null;
  for (const { t, valor } of registro.textos) {
    if (valor === 'en-espera') {
      desde ??= t;
    } else if (valor === 'visible' && desde !== null) {
      const inicio = desde;
      expect(
        registro.sonando.some((momento) => momento >= inicio && momento <= t),
        'la pregunta escrita aparece después de que empieza la voz',
      ).toBe(true);
      expect(t - inicio, 'la pregunta escrita no hace esperar').toBeLessThan(1_000);
      revelaciones += 1;
      desde = null;
    }
  }
  return revelaciones;
}

/** Un WAV mono de 8 kHz en silencio: sirve de voz de Celestea con la duración que haga falta. */
function wavDeSilencio(milisegundos: number): Buffer {
  const bytes = Math.round((8_000 * milisegundos) / 1_000) * 2;
  const wav = Buffer.alloc(44 + bytes);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + bytes, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8_000, 24);
  wav.writeUInt32LE(16_000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(bytes, 40);
  return wav;
}

/** La voz de las preguntas dura lo que diga la prueba (la falsa dura un cuarto de segundo). */
async function servirVozDeCelestea(page: Page, milisegundos: number): Promise<void> {
  const voz = wavDeSilencio(milisegundos);
  await page.route('**/api/defensa/archivo-dev**', (ruta) => ruta.fulfill({ status: 200, contentType: 'audio/wav', body: voz }));
}

/** Las preguntas llegan sin audio (`audioUrl: null`), como cuando no se pudo crear la voz. */
async function quitarAudioDeLasPreguntas(page: Page): Promise<void> {
  await page.route('**/api/defensa/**', async (ruta) => {
    if (ruta.request().url().includes('/api/defensa/archivo-dev')) return ruta.continue();
    const respuesta = await ruta.fetch();
    if (!(respuesta.headers()['content-type'] ?? '').includes('application/json')) return ruta.fulfill({ response: respuesta });
    const sinAudio = JSON.stringify(await respuesta.json(), (_clave, valor: unknown) =>
      valor !== null && typeof valor === 'object' && 'turnoId' in valor && 'pregunta' in valor ? { ...valor, audioUrl: null } : valor,
    );
    return ruta.fulfill({ response: respuesta, body: sinAudio });
  });
}

async function bloquearMicrofono(page: Page): Promise<void> {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
  });
}

/** Quería hablar pero el micrófono no abrió: Celestea dice las preguntas y la persona escribe. */
async function llegarAPreguntaSinMicrofono(page: Page): Promise<void> {
  await entrarYSubirTrabajo(page, 'Hablar');
  await expect(page.getByRole('heading', { name: /hola/i }).first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Seguir' }).click();
  await empezarDefensa(page);
}

test.describe('la pregunta: primero habla Celestea', () => {
  test('el texto aparece después de que empieza la voz; repetir hace lo mismo y no graba encima', async ({ page }) => {
    await registrarVozYTexto(page);
    await servirVozDeCelestea(page, 2_500);
    await entrarYSubirTrabajo(page, 'Hablar');
    await expect(page.getByRole('heading', { name: /hola/i }).first()).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: /Seguir|Listo|Sí/ }).last().click();
    await empezarDefensa(page);

    // Mientras habla: la pantalla y la esfera lo marcan, y la pregunta ya está para el lector de pantalla.
    const pantalla = page.locator('[data-celestea]');
    await expect(pantalla).toHaveAttribute('data-celestea', 'habla', { timeout: 30_000 });
    await expect(page.getByText('Celestea habla')).toBeVisible();
    await expect(page.locator('[data-hablando="true"]').first()).toBeAttached();
    await expect(page.getByRole('heading', { level: 1 }).first()).not.toHaveText('');
    await expect(page.getByRole('button', { name: 'Listo' })).toHaveAttribute('aria-disabled', 'true');

    // Repetir a media voz: Celestea sigue hablando; no se empieza a grabar encima de su voz.
    await page.getByRole('button', { name: 'Repetir pregunta' }).click();
    await page.waitForTimeout(700);
    await expect(pantalla).toHaveAttribute('data-celestea', 'habla');
    expect((await leerRegistro(page)).grabaciones, 'no se graba mientras Celestea repite').toHaveLength(0);
    await expect(page.getByText('Te escucho')).toBeVisible({ timeout: 20_000 });
    await expect.poll(async () => (await leerRegistro(page)).grabaciones.length, { message: 'al terminar la voz, sí se graba' }).toBe(1);
    await expect(page.locator('[data-texto]')).toHaveAttribute('data-texto', 'visible');

    // Repetir después: la misma secuencia, primero la voz y después el texto.
    await page.getByRole('button', { name: 'Repetir pregunta' }).click();
    await expect(pantalla).toHaveAttribute('data-celestea', 'habla');
    await expect(page.getByText('Te escucho')).toBeVisible({ timeout: 20_000 });

    const registro = await leerRegistro(page);
    expect(registro.textos[0]?.valor, 'al llegar, la pregunta escrita espera a la voz').toBe('en-espera');
    expect(registro.sonando.length).toBeGreaterThanOrEqual(3);
    expect(revisarRevelaciones(registro)).toBeGreaterThanOrEqual(2);
  });

  test('si el micrófono falló, Celestea dice la pregunta y el cuadro aparece al terminar', async ({ page }) => {
    await bloquearMicrofono(page);
    await registrarVozYTexto(page);
    await servirVozDeCelestea(page, 2_000);
    await llegarAPreguntaSinMicrofono(page);

    const pantalla = page.locator('[data-celestea]');
    await expect(pantalla).toHaveAttribute('data-celestea', 'habla', { timeout: 30_000 });
    await expect(page.getByText('Celestea habla')).toBeVisible();
    await expect(page.getByLabel('Tu respuesta')).toBeHidden();
    await expect(page.getByLabel('Tu respuesta')).toBeVisible({ timeout: 20_000 });
    await expect(pantalla).toHaveAttribute('data-celestea', 'escucha');
    expect(revisarRevelaciones(await leerRegistro(page))).toBeGreaterThanOrEqual(1);

    // Lo que ya escribió no se esconde al repetir la pregunta.
    await page.getByLabel('Tu respuesta').fill('Empecé por la encuesta');
    await page.getByRole('button', { name: 'Repetir pregunta' }).click();
    await expect(pantalla).toHaveAttribute('data-celestea', 'habla');
    await expect(page.getByLabel('Tu respuesta')).toBeVisible();
    await expect(page.getByLabel('Tu respuesta')).toHaveValue('Empecé por la encuesta');
  });

  test('sin audio, la pregunta y el cuadro se ven desde el principio', async ({ page }) => {
    await bloquearMicrofono(page);
    await registrarVozYTexto(page);
    await quitarAudioDeLasPreguntas(page);
    await llegarAPreguntaSinMicrofono(page);

    await expect(page.getByLabel('Tu respuesta')).toBeVisible({ timeout: 30_000 });
    const registro = await leerRegistro(page);
    expect(registro.textos.length).toBeGreaterThan(0);
    expect(registro.textos.map((entrada) => entrada.valor)).not.toContain('en-espera');
    expect(registro.sonando).toHaveLength(0);
  });

  test('si el audio falla, la pregunta se ve enseguida', async ({ page }) => {
    await bloquearMicrofono(page);
    await registrarVozYTexto(page);
    await page.route('**/api/defensa/archivo-dev**', (ruta) => ruta.abort());
    await llegarAPreguntaSinMicrofono(page);

    await expect(page.getByLabel('Tu respuesta')).toBeVisible({ timeout: 30_000 });
    const { textos } = await leerRegistro(page);
    const visible = textos.find((entrada) => entrada.valor === 'visible');
    expect(visible).toBeDefined();
    // Sin esperar el tope de medio segundo: la falla misma destapa la pregunta.
    expect((visible?.t ?? Infinity) - (textos[0]?.t ?? 0)).toBeLessThan(400);
  });

  test('con movimiento reducido, todo aparece a la vez', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await bloquearMicrofono(page);
    await registrarVozYTexto(page);
    await servirVozDeCelestea(page, 2_500);
    await llegarAPreguntaSinMicrofono(page);

    // Mientras Celestea habla ya están la pregunta y el cuadro de respuesta.
    await expect(page.locator('[data-celestea]')).toHaveAttribute('data-celestea', 'habla', { timeout: 30_000 });
    await expect(page.getByLabel('Tu respuesta')).toBeVisible();
    await expect(page.locator('[data-texto]')).toHaveCSS('opacity', '1');
    const registro = await leerRegistro(page);
    expect(registro.textos.length).toBeGreaterThan(0);
    expect(registro.textos.map((entrada) => entrada.valor)).not.toContain('en-espera');
  });
});

import '../support/sinServerOnly';
import { expect, test } from '@playwright/test';
import { DefensaError } from '../../src/lib/defensa/errores';
import { crearLlmAnthropic, crearLlmOpenai } from '../../src/lib/defensa/providers/llm';
import {
  TEXTO_STT_POR_DEFECTO,
  audioFalso,
  crearLlmMock,
  crearSttMock,
  crearTtsMock,
  palabrasDesdeMarcado,
  wavDeSilencio,
} from '../../src/lib/defensa/providers/mock';
import { crearLlm, crearStt, crearTts } from '../../src/lib/defensa/providers';
import { crearSttAssemblyai, crearSttDeepgram, crearSttElevenlabs } from '../../src/lib/defensa/providers/stt';
import type { SolicitudJson } from '../../src/lib/defensa/providers/tipos';
import { crearTtsElevenlabs } from '../../src/lib/defensa/providers/tts';
import { buildQuestionPlanUser, questionPlanJsonSchema, validateQuestionPlan } from '../../src/lib/defensa/questionPlan';
import { OBJETIVOS, TRABAJO } from '../support/fixtures';

interface Llamada {
  url: string;
  init: RequestInit;
}

function json(cuerpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } });
}

function fetchFalso(respuestas: Array<Response | (() => Response)>) {
  const llamadas: Llamada[] = [];
  let i = 0;
  const fetchFn = (async (url: unknown, init?: RequestInit) => {
    llamadas.push({ url: String(url), init: init ?? {} });
    const siguiente = respuestas[Math.min(i, respuestas.length - 1)]!;
    i += 1;
    return typeof siguiente === 'function' ? siguiente() : siguiente.clone();
  }) as typeof fetch;
  return { fetchFn, llamadas };
}

const cuerpo = (llamada: Llamada) => JSON.parse(String(llamada.init.body)) as Record<string, any>;
const encabezados = (llamada: Llamada) => llamada.init.headers as Record<string, string>;

const SOLICITUD: SolicitudJson = {
  tarea: 'plan',
  system: 'Eres el diseñador.',
  mensajes: [
    { rol: 'user', contenido: 'Primer mensaje' },
    { rol: 'assistant', contenido: '{"previo":true}' },
    { rol: 'user', contenido: 'Corrige' },
  ],
  esquema: { nombre: 'plan_de_preguntas', json: { type: 'object', properties: { a: { type: 'string' } }, required: ['a'], additionalProperties: false } },
  maxTokens: 1234,
  timeoutMs: 5000,
};

async function sinRuido<T>(accion: () => Promise<T>): Promise<T> {
  const original = console.error;
  console.error = () => undefined;
  try {
    return await accion();
  } finally {
    console.error = original;
  }
}

async function fallo(accion: () => Promise<unknown>): Promise<DefensaError> {
  const error = await sinRuido(() => accion().then(() => null, (e: unknown) => e));
  expect(error).toBeInstanceOf(DefensaError);
  return error as DefensaError;
}

test.describe('modelo falso · produce planes que pasan la validación real', () => {
  for (const registro of ['tu', 'usted'] as const) {
    test(`plan (${registro})`, async () => {
      const entrada = {
        assignmentInstructions: 'Diseña y aplica una encuesta.',
        objectives: OBJETIVOS.map((o) => ({ ...o })),
        register: registro,
        workText: TRABAJO,
      };
      const r = await crearLlmMock().generarJson({
        ...SOLICITUD,
        mensajes: [{ rol: 'user', contenido: buildQuestionPlanUser(entrada) }],
        esquema: { nombre: 'plan', json: questionPlanJsonSchema() },
      });
      const validado = validateQuestionPlan(r.json, entrada);
      expect(validado.issues.filter((i) => i.severity === 'error')).toEqual([]);
      expect(validado.ok).toBe(true);
      expect(validado.plan?.objectives.map((o) => o.candidates.length)).toEqual([2, 2, 2]);
      expect(validado.plan?.transfer.length).toBe(2);
      expect(validado.plan?.opener).toContain(registro === 'usted' ? 'su trabajo' : 'tu trabajo');
    });
  }
});

test.describe('OpenAI', () => {
  const credenciales = (fetchFn: typeof fetch, extra: Partial<Parameters<typeof crearLlmOpenai>[0]> = {}) => ({
    clave: () => 'sk-prueba-123',
    modelo: () => 'modelo-de-prueba',
    fetchFn,
    ...extra,
  });

  test('pide salida estructurada estricta, sin guardar nada, y lee el contenido', async () => {
    const { fetchFn, llamadas } = fetchFalso([json({ choices: [{ message: { content: '{"a":"hola"}' } }] })]);
    const r = await crearLlmOpenai(credenciales(fetchFn)).generarJson(SOLICITUD);

    expect(r).toEqual({ json: { a: 'hola' }, proveedor: 'openai', modelo: 'modelo-de-prueba' });
    const llamada = llamadas[0]!;
    expect(llamada.url).toBe('https://api.openai.com/v1/chat/completions');
    expect(encabezados(llamada).Authorization).toBe('Bearer sk-prueba-123');
    const c = cuerpo(llamada);
    expect(c.model).toBe('modelo-de-prueba');
    expect(c.store).toBe(false);
    expect(c.max_completion_tokens).toBe(1234);
    expect(c.response_format).toEqual({
      type: 'json_schema',
      json_schema: { name: 'plan_de_preguntas', strict: true, schema: SOLICITUD.esquema.json },
    });
    expect(c.messages.map((m: { role: string }) => m.role)).toEqual(['system', 'user', 'assistant', 'user']);
    expect(c.messages[0].content).toBe('Eres el diseñador.');
  });

  test('un modelo indicado en la solicitud manda sobre el configurado', async () => {
    const { fetchFn, llamadas } = fetchFalso([json({ choices: [{ message: { content: '{}' } }] })]);
    await crearLlmOpenai(credenciales(fetchFn)).generarJson({ ...SOLICITUD, modelo: 'otro-modelo' });
    expect(cuerpo(llamadas[0]!).model).toBe('otro-modelo');
  });

  test('sin llave o sin modelo falla como "no configurado" antes de llamar', async () => {
    const { fetchFn, llamadas } = fetchFalso([json({})]);
    const sinClave = await fallo(() => crearLlmOpenai(credenciales(fetchFn, { clave: () => undefined })).generarJson(SOLICITUD));
    expect(sinClave.codigo).toBe('no_configurado');
    const sinModelo = await fallo(() => crearLlmOpenai(credenciales(fetchFn, { modelo: () => undefined })).generarJson(SOLICITUD));
    expect(sinModelo.codigo).toBe('no_configurado');
    expect(llamadas).toHaveLength(0);
  });

  test('errores HTTP, rechazos y contenido que no es JSON son un error genérico, sin filtrar la llave', async () => {
    const casos = [
      json({ error: { message: 'Incorrect API key sk-prueba-123' } }, 401),
      json({ choices: [{ message: { content: null, refusal: 'No puedo' } }] }),
      json({ choices: [] }),
      json({ choices: [{ message: { content: 'esto no es json' } }] }),
    ];
    for (const caso of casos) {
      const { fetchFn } = fetchFalso([caso]);
      const error = await fallo(() => crearLlmOpenai(credenciales(fetchFn)).generarJson(SOLICITUD));
      expect(error.codigo).toBe('proveedor_fallo');
      expect(error.status).toBe(502);
      expect(`${error.message} ${JSON.stringify(error)}`).not.toContain('sk-prueba');
    }
  });

  test('un fallo de red también es un error genérico', async () => {
    const roto = (async () => {
      throw new TypeError('fetch failed');
    }) as typeof fetch;
    expect((await fallo(() => crearLlmOpenai(credenciales(roto)).generarJson(SOLICITUD))).codigo).toBe('proveedor_fallo');
  });
});

test.describe('Anthropic', () => {
  test('pide la salida como una herramienta de uso obligatorio y lee su entrada', async () => {
    const { fetchFn, llamadas } = fetchFalso([
      json({ content: [{ type: 'text', text: 'pensando' }, { type: 'tool_use', name: 'plan_de_preguntas', input: { a: 'hola' } }] }),
    ]);
    const llm = crearLlmAnthropic({ clave: () => 'sk-ant-prueba', modelo: () => 'claude-de-prueba', fetchFn });
    const r = await llm.generarJson(SOLICITUD);

    expect(r).toEqual({ json: { a: 'hola' }, proveedor: 'anthropic', modelo: 'claude-de-prueba' });
    const llamada = llamadas[0]!;
    expect(llamada.url).toBe('https://api.anthropic.com/v1/messages');
    expect(encabezados(llamada)['x-api-key']).toBe('sk-ant-prueba');
    expect(encabezados(llamada)['anthropic-version']).toBe('2023-06-01');
    const c = cuerpo(llamada);
    expect(c.system).toBe('Eres el diseñador.');
    expect(c.max_tokens).toBe(1234);
    expect(c.tool_choice).toEqual({ type: 'tool', name: 'plan_de_preguntas' });
    expect(c.tools[0].input_schema).toEqual(SOLICITUD.esquema.json);
    expect(c.messages).toEqual([
      { role: 'user', content: 'Primer mensaje' },
      { role: 'assistant', content: '{"previo":true}' },
      { role: 'user', content: 'Corrige' },
    ]);
  });

  test('sin herramienta en la respuesta o sin llave es un error', async () => {
    const { fetchFn } = fetchFalso([json({ content: [{ type: 'text', text: 'hola' }] })]);
    const llm = crearLlmAnthropic({ clave: () => 'k', modelo: () => 'm', fetchFn });
    expect((await fallo(() => llm.generarJson(SOLICITUD))).codigo).toBe('proveedor_fallo');
    const sinClave = crearLlmAnthropic({ clave: () => undefined, modelo: () => 'm', fetchFn });
    expect((await fallo(() => sinClave.generarJson(SOLICITUD))).codigo).toBe('no_configurado');
  });
});

test.describe('Deepgram', () => {
  const respuesta = {
    metadata: { duration: 3.2 },
    results: {
      channels: [
        {
          alternatives: [
            {
              transcript: 'hola mundo',
              words: [
                { word: 'hola', punctuated_word: 'Hola,', start: 0.31, end: 0.62, confidence: 0.98 },
                { word: 'mundo', start: 0.7, end: 1.04, confidence: 1.4 },
                { word: '', start: 1.1, end: 1.2, confidence: 0.5 },
              ],
            },
          ],
        },
      ],
    },
  };

  test('envía el audio crudo con idioma, puntuación y sin retención para entrenar', async () => {
    const { fetchFn, llamadas } = fetchFalso([json(respuesta)]);
    const stt = crearSttDeepgram({ clave: () => 'dg-clave', modelo: () => undefined, fetchFn });
    const audio = new Uint8Array([1, 2, 3, 4]);
    const r = await stt.transcribir(audio, 'audio/webm;codecs=opus', { idioma: 'es-419', timeoutMs: 5000 });

    const llamada = llamadas[0]!;
    const url = new URL(llamada.url);
    expect(url.origin + url.pathname).toBe('https://api.deepgram.com/v1/listen');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      model: 'nova-3',
      language: 'es-419',
      punctuate: 'true',
      smart_format: 'true',
      mip_opt_out: 'true',
    });
    expect(encabezados(llamada)).toEqual({ Authorization: 'Token dg-clave', 'Content-Type': 'audio/webm' });
    expect(llamada.init.body).toBe(audio);

    expect(r.proveedor).toBe('deepgram');
    expect(r.duracionMs).toBe(3200);
    expect(r.texto).toBe('Hola, mundo');
    // Confianza y momento de cada palabra: el requisito para elegir proveedor.
    expect(r.palabras).toEqual([
      { texto: 'Hola,', inicioMs: 310, finMs: 620, confianza: 0.98 },
      { texto: 'mundo', inicioMs: 700, finMs: 1040, confianza: 1 },
    ]);
  });

  test('el modelo configurado manda sobre el predeterminado y una respuesta vacía no rompe', async () => {
    const { fetchFn, llamadas } = fetchFalso([json({ results: { channels: [] } })]);
    const stt = crearSttDeepgram({ clave: () => 'k', modelo: () => 'nova-2', fetchFn });
    const r = await stt.transcribir(new Uint8Array(1), 'audio/mp4', { idioma: 'es', timeoutMs: 1000 });
    expect(new URL(llamadas[0]!.url).searchParams.get('model')).toBe('nova-2');
    expect(r).toMatchObject({ texto: '', palabras: [], duracionMs: 0 });
  });

  test('sin llave no llama', async () => {
    const { fetchFn, llamadas } = fetchFalso([json(respuesta)]);
    const stt = crearSttDeepgram({ clave: () => undefined, modelo: () => undefined, fetchFn });
    expect((await fallo(() => stt.transcribir(new Uint8Array(1), 'audio/webm', { idioma: 'es', timeoutMs: 1000 }))).codigo).toBe('no_configurado');
    expect(llamadas).toHaveLength(0);
  });
});

test.describe('ElevenLabs Scribe (por lotes)', () => {
  const respuesta = {
    language_code: 'spa',
    text: 'Hola mundo',
    words: [
      { text: 'Hola,', start: 0.31, end: 0.62, type: 'word', logprob: -0.1 },
      { text: ' ', start: 0.62, end: 0.7, type: 'spacing', logprob: 0 },
      { text: 'mundo', start: 0.7, end: 1.04, type: 'word', logprob: -2.3 },
      { text: '(risas)', start: 1.1, end: 1.5, type: 'audio_event', logprob: -0.2 },
      { text: 'sin', start: 1.6, end: 1.9, type: 'word' },
      { text: '', start: 2, end: 2.1, type: 'word', logprob: -0.1 },
    ],
  };

  test('sube la grabación como formulario con palabra por palabra y la llave en el encabezado', async () => {
    const { fetchFn, llamadas } = fetchFalso([json(respuesta)]);
    const stt = crearSttElevenlabs({ clave: () => 'el-clave', modelo: () => undefined, fetchFn });
    const audio = new Uint8Array([1, 2, 3, 4]);
    await stt.transcribir(audio, 'audio/webm;codecs=opus', { idioma: 'es-419', timeoutMs: 5000 });

    const llamada = llamadas[0]!;
    expect(llamada.url).toBe('https://api.elevenlabs.io/v1/speech-to-text');
    expect(llamada.init.method).toBe('POST');
    // Sin Content-Type propio: el navegador de Node pone el límite del multipart.
    expect(encabezados(llamada)).toEqual({ 'xi-api-key': 'el-clave' });
    const formulario = llamada.init.body as FormData;
    expect(formulario.get('model_id')).toBe('scribe_v2');
    expect(formulario.get('language_code')).toBe('es');
    expect(formulario.get('timestamps_granularity')).toBe('word');
    expect(formulario.get('tag_audio_events')).toBe('false');
    expect(formulario.get('diarize')).toBe('false');
    const archivo = formulario.get('file') as File;
    expect(archivo.name).toBe('respuesta.webm');
    expect(archivo.type).toBe('audio/webm');
    expect(Array.from(new Uint8Array(await archivo.arrayBuffer()))).toEqual([1, 2, 3, 4]);
  });

  test('la confianza es exp(logprob); ignora espacios y sonidos y no inventa palabras', async () => {
    const { fetchFn } = fetchFalso([json(respuesta)]);
    const stt = crearSttElevenlabs({ clave: () => 'k', modelo: () => undefined, fetchFn });
    const r = await stt.transcribir(new Uint8Array(1), 'audio/mp4', { idioma: 'es', timeoutMs: 1000 });
    expect(r.proveedor).toBe('elevenlabs');
    expect(r.modelo).toBe('scribe_v2');
    expect(r.texto).toBe('Hola, mundo sin');
    expect(r.palabras.map((p) => [p.texto, p.inicioMs, p.finMs])).toEqual([
      ['Hola,', 310, 620],
      ['mundo', 700, 1040],
      ['sin', 1600, 1900],
    ]);
    expect(r.palabras[0]!.confianza).toBeCloseTo(Math.exp(-0.1), 6);
    // Una palabra dudosa (logprob -2.3 ≈ 10 %) queda por debajo del umbral de aclaración.
    expect(r.palabras[1]!.confianza).toBeCloseTo(Math.exp(-2.3), 6);
    expect(r.palabras[1]!.confianza).toBeLessThan(0.55);
    // Sin logprob se da por segura, para no pedir aclaraciones por todo.
    expect(r.palabras[2]!.confianza).toBe(1);
    // Sin duración en la respuesta, se usa donde termina la última palabra.
    expect(r.duracionMs).toBe(1900);
  });

  test('una confianza imposible se limita a 0–1 y la duración de la respuesta manda si viene', async () => {
    const { fetchFn } = fetchFalso([json({ audio_duration_secs: 4.5, words: [{ text: 'a', start: 0, end: 1, type: 'word', logprob: 3 }] })]);
    const stt = crearSttElevenlabs({ clave: () => 'k', modelo: () => 'scribe_v2', fetchFn });
    const r = await stt.transcribir(new Uint8Array(1), 'audio/wav', { idioma: 'es', timeoutMs: 1000 });
    expect(r.palabras[0]!.confianza).toBe(1);
    expect(r.duracionMs).toBe(4500);
  });

  test('el modo sin registro solo se pide si está activado, y una respuesta vacía no rompe', async () => {
    const normal = fetchFalso([json({})]);
    const sin = fetchFalso([json({ words: null })]);
    const a = await crearSttElevenlabs({ clave: () => 'k', modelo: () => undefined, fetchFn: normal.fetchFn }).transcribir(new Uint8Array(1), 'audio/webm', { idioma: 'es', timeoutMs: 1000 });
    const b = await crearSttElevenlabs({ clave: () => 'k', modelo: () => undefined, sinRegistro: () => true, fetchFn: sin.fetchFn }).transcribir(new Uint8Array(1), 'audio/webm', { idioma: 'es', timeoutMs: 1000 });
    expect(normal.llamadas[0]!.url).not.toContain('enable_logging');
    expect(sin.llamadas[0]!.url).toBe('https://api.elevenlabs.io/v1/speech-to-text?enable_logging=false');
    expect(a).toMatchObject({ texto: '', palabras: [], duracionMs: 0 });
    expect(b.palabras).toEqual([]);
  });

  test('sin llave no llama, y un error del servicio no revela su contenido', async () => {
    const { fetchFn, llamadas } = fetchFalso([json({ detail: 'secreto-del-proveedor' }, 401)]);
    const sinLlave = crearSttElevenlabs({ clave: () => undefined, modelo: () => undefined, fetchFn });
    expect((await fallo(() => sinLlave.transcribir(new Uint8Array(1), 'audio/webm', { idioma: 'es', timeoutMs: 1000 }))).codigo).toBe('no_configurado');
    expect(llamadas).toHaveLength(0);
    const conLlave = crearSttElevenlabs({ clave: () => 'k', modelo: () => undefined, fetchFn });
    const error = await fallo(() => conLlave.transcribir(new Uint8Array(1), 'audio/webm', { idioma: 'es', timeoutMs: 1000 }));
    expect(error.codigo).toBe('proveedor_fallo');
    expect(error.message).not.toContain('secreto-del-proveedor');
  });
});


test.describe('AssemblyAI', () => {
  const completada = {
    status: 'completed',
    audio_duration: 2.5,
    words: [
      { text: 'Hola', start: 100, end: 400, confidence: 0.91 },
      { text: 'mundo.', start: 450, end: 900, confidence: 0.4 },
    ],
  };

  test('sube, pide la transcripción, espera y devuelve palabras con confianza y tiempo', async () => {
    const { fetchFn, llamadas } = fetchFalso([
      json({ upload_url: 'https://cdn.assemblyai.com/upload/abc' }),
      json({ id: 'tr-1' }),
      json({ status: 'queued' }),
      json({ status: 'processing' }),
      json(completada),
    ]);
    const stt = crearSttAssemblyai({ clave: () => 'aai-clave', modelo: () => 'universal', fetchFn, esperaSondeoMs: 0 });
    const r = await stt.transcribir(new Uint8Array([9]), 'audio/webm', { idioma: 'es', timeoutMs: 5000 });

    expect(llamadas.map((l) => `${l.init.method} ${l.url}`)).toEqual([
      'POST https://api.assemblyai.com/v2/upload',
      'POST https://api.assemblyai.com/v2/transcript',
      'GET https://api.assemblyai.com/v2/transcript/tr-1',
      'GET https://api.assemblyai.com/v2/transcript/tr-1',
      'GET https://api.assemblyai.com/v2/transcript/tr-1',
    ]);
    expect(encabezados(llamadas[0]!).authorization).toBe('aai-clave');
    expect(cuerpo(llamadas[1]!)).toEqual({
      audio_url: 'https://cdn.assemblyai.com/upload/abc',
      language_code: 'es',
      punctuate: true,
      format_text: true,
      speech_model: 'universal',
    });
    expect(r.texto).toBe('Hola mundo.');
    expect(r.duracionMs).toBe(2500);
    expect(r.palabras).toEqual([
      { texto: 'Hola', inicioMs: 100, finMs: 400, confianza: 0.91 },
      { texto: 'mundo.', inicioMs: 450, finMs: 900, confianza: 0.4 },
    ]);
  });

  test('un estado de error, o no terminar a tiempo, es un error genérico', async () => {
    const conError = fetchFalso([json({ upload_url: 'u' }), json({ id: 'x' }), json({ status: 'error', error: 'detalle interno' })]);
    const a = crearSttAssemblyai({ clave: () => 'k', modelo: () => undefined, fetchFn: conError.fetchFn, esperaSondeoMs: 0 });
    const error = await fallo(() => a.transcribir(new Uint8Array(1), 'audio/webm', { idioma: 'es', timeoutMs: 3000 }));
    expect(error.codigo).toBe('proveedor_fallo');
    expect(error.message).not.toContain('detalle interno');

    const eterna = fetchFalso([json({ upload_url: 'u' }), json({ id: 'x' }), json({ status: 'processing' })]);
    const b = crearSttAssemblyai({ clave: () => 'k', modelo: () => undefined, fetchFn: eterna.fetchFn, esperaSondeoMs: 0 });
    // El tiempo mínimo por consulta es 1 s, así que con 50 ms de límite vence en la primera vuelta.
    expect((await fallo(() => b.transcribir(new Uint8Array(1), 'audio/webm', { idioma: 'es', timeoutMs: 50 }))).codigo).toBe('proveedor_fallo');
  });
});

test.describe('ElevenLabs', () => {
  const mp3 = new Uint8Array(4096).fill(7);

  test('sintetiza con la voz y el modelo configurados', async () => {
    const { fetchFn, llamadas } = fetchFalso([() => new Response(mp3, { status: 200, headers: { 'content-type': 'audio/mpeg' } })]);
    const tts = crearTtsElevenlabs({ clave: () => 'xi-clave', voz: () => 'voz/rara 1', modelo: () => 'eleven_multilingual_v2', fetchFn });
    const r = await tts.sintetizar('¿Por qué lo elegiste?', { timeoutMs: 5000 });

    const llamada = llamadas[0]!;
    const url = new URL(llamada.url);
    expect(url.origin + url.pathname).toBe('https://api.elevenlabs.io/v1/text-to-speech/voz%2Frara%201');
    expect(url.searchParams.get('output_format')).toBe('mp3_44100_64');
    expect(url.searchParams.has('enable_logging')).toBe(false);
    expect(encabezados(llamada)['xi-api-key']).toBe('xi-clave');
    expect(cuerpo(llamada)).toEqual({ text: '¿Por qué lo elegiste?', model_id: 'eleven_multilingual_v2' });
    expect(r).toMatchObject({ mime: 'audio/mpeg', extension: 'mp3' });
    expect(r.bytes.byteLength).toBe(4096);
  });

  test('el modo sin registro pide enable_logging=false', async () => {
    const { fetchFn, llamadas } = fetchFalso([() => new Response(mp3)]);
    const tts = crearTtsElevenlabs({ clave: () => 'k', voz: () => 'v', modelo: () => 'm', sinRegistro: () => true, fetchFn });
    await tts.sintetizar('hola', { timeoutMs: 1000 });
    expect(new URL(llamadas[0]!.url).searchParams.get('enable_logging')).toBe('false');
  });

  test('sin voz, sin llave o con audio vacío es un error', async () => {
    const { fetchFn } = fetchFalso([() => new Response(new Uint8Array(10))]);
    const sinVoz = crearTtsElevenlabs({ clave: () => 'k', voz: () => undefined, modelo: () => 'm', fetchFn });
    expect((await fallo(() => sinVoz.sintetizar('x', { timeoutMs: 1000 }))).codigo).toBe('no_configurado');
    const sinClave = crearTtsElevenlabs({ clave: () => undefined, voz: () => 'v', modelo: () => 'm', fetchFn });
    expect((await fallo(() => sinClave.sintetizar('x', { timeoutMs: 1000 }))).codigo).toBe('no_configurado');
    const vacio = crearTtsElevenlabs({ clave: () => 'k', voz: () => 'v', modelo: () => 'm', fetchFn });
    expect((await fallo(() => vacio.sintetizar('x', { timeoutMs: 1000 }))).codigo).toBe('proveedor_fallo');
  });
});

test.describe('transcriptor y voz falsos', () => {
  test('el marcado ~~así~~ da confianza baja y tiempos consecutivos', () => {
    const p = palabrasDesdeMarcado('la muestra fue ~~de cuarenta~~ personas');
    expect(p.map((x) => [x.texto, x.confianza < 0.5])).toEqual([
      ['la', false], ['muestra', false], ['fue', false], ['de', true], ['cuarenta', true], ['personas', false],
    ]);
    expect(p[1]!.inicioMs).toBeGreaterThan(p[0]!.finMs);
    expect(palabrasDesdeMarcado('~~una~~ dos')[0]!.confianza).toBeLessThan(0.5);
    expect(palabrasDesdeMarcado('')).toEqual([]);
  });

  test('un audio "MOCK:" lleva su propio texto; cualquier otro usa el de por defecto o el del entorno', async () => {
    const stt = crearSttMock(() => undefined);
    const propio = await stt.transcribir(audioFalso('hola ~~mundo~~'), 'audio/webm', { idioma: 'es', timeoutMs: 1 });
    expect(propio.texto).toBe('hola mundo');
    expect(propio.palabras[1]!.confianza).toBeLessThan(0.5);
    expect(propio.duracionMs).toBeGreaterThan(propio.palabras[1]!.finMs);

    const porDefecto = await stt.transcribir(new Uint8Array([1, 2, 3]), 'audio/webm', { idioma: 'es', timeoutMs: 1 });
    expect(porDefecto.texto).toBe(TEXTO_STT_POR_DEFECTO.replace(/~~/g, ''));
    expect(porDefecto.palabras.filter((w) => w.confianza < 0.5).map((w) => w.texto)).toEqual(['cuarenta', 'personas']);

    const delEntorno = await crearSttMock(() => 'solo esto').transcribir(new Uint8Array([1]), 'audio/webm', { idioma: 'es', timeoutMs: 1 });
    expect(delEntorno.texto).toBe('solo esto');
  });

  test('la voz falsa devuelve un WAV válido', async () => {
    const r = await crearTtsMock().sintetizar('hola', { timeoutMs: 1 });
    expect(r).toMatchObject({ mime: 'audio/wav', extension: 'wav' });
    const wav = wavDeSilencio(250);
    expect(new TextDecoder().decode(wav.slice(0, 4))).toBe('RIFF');
    expect(new TextDecoder().decode(wav.slice(8, 12))).toBe('WAVE');
    expect(wav.byteLength).toBe(44 + 4000);
    expect(new DataView(wav.buffer).getUint32(4, true)).toBe(wav.byteLength - 8);
  });
});

test.describe('elegir proveedor por variable de entorno', () => {
  const variables = ['DEFENSA_LLM_PROVIDER', 'DEFENSA_STT_PROVIDER', 'DEFENSA_TTS_PROVIDER'] as const;

  function con(valores: Partial<Record<(typeof variables)[number], string>>, accion: () => void) {
    const antes = variables.map((v) => process.env[v]);
    try {
      for (const v of variables) delete process.env[v];
      Object.assign(process.env, valores);
      accion();
    } finally {
      variables.forEach((v, i) => {
        if (antes[i] === undefined) delete process.env[v];
        else process.env[v] = antes[i];
      });
    }
  }

  test('cada variable cambia solo su proveedor y un valor desconocido cae en el falso', () => {
    con({}, () => {
      expect([crearLlm().id, crearStt().id, crearTts().id]).toEqual(['mock', 'mock', 'mock']);
    });
    con({ DEFENSA_LLM_PROVIDER: 'openai', DEFENSA_STT_PROVIDER: 'deepgram', DEFENSA_TTS_PROVIDER: 'elevenlabs' }, () => {
      expect([crearLlm().id, crearStt().id, crearTts().id]).toEqual(['openai', 'deepgram', 'elevenlabs']);
    });
    con({ DEFENSA_LLM_PROVIDER: 'openai', DEFENSA_STT_PROVIDER: 'elevenlabs', DEFENSA_TTS_PROVIDER: 'elevenlabs' }, () => {
      expect([crearStt().id, crearTts().id]).toEqual(['elevenlabs', 'elevenlabs']);
    });
    con({ DEFENSA_LLM_PROVIDER: 'anthropic', DEFENSA_STT_PROVIDER: 'assemblyai' }, () => {
      expect([crearLlm().id, crearStt().id, crearTts().id]).toEqual(['anthropic', 'assemblyai', 'mock']);
    });
    con({ DEFENSA_LLM_PROVIDER: 'gemini', DEFENSA_STT_PROVIDER: '', DEFENSA_TTS_PROVIDER: ' ' }, () => {
      expect([crearLlm().id, crearStt().id, crearTts().id]).toEqual(['mock', 'mock', 'mock']);
    });
  });
});

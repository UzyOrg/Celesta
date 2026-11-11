import { expect, test } from '@playwright/test';
import '../support/sinServerOnly';
import type { SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { COLUMNAS_POR_TABLA, probarProveedores, probarSupabase, revisarConfiguracion } from '../../src/lib/defensa/diagnostico';
import type { Proveedores } from '../../src/lib/defensa/providers/tipos';

const envDemo = {
  DEFENSA_ALMACEN: 'memoria',
  DEFENSA_SIGNING_SECRET: 'secreto-ficticio-de-la-prueba-1234567890',
  NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3000',
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:9',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-ficticio',
};

test('el diagnóstico identifica la firma ausente y no imprime valores sensibles', () => {
  const resultados = revisarConfiguracion({ ...envDemo, DEFENSA_SIGNING_SECRET: '', DEFENSA_OPENAI_API_KEY: 'secreto-api-que-no-debe-salir' });
  expect(resultados.find((r) => r.nombre === 'DEFENSA_SIGNING_SECRET')?.estado).toBe('error');
  expect(JSON.stringify(resultados)).not.toContain('secreto-api-que-no-debe-salir');
  expect(JSON.stringify(resultados)).not.toContain('anon-ficticio');
  expect(resultados.filter((r) => r.estado === 'simulado')).toHaveLength(3);
});

test('configuración válida para demo no equivale a configuración para producción', () => {
  expect(revisarConfiguracion(envDemo).filter((r) => r.estado === 'error')).toHaveLength(0);
  const produccion = revisarConfiguracion({ ...envDemo, NODE_ENV: 'production' });
  expect(produccion.filter((r) => r.estado === 'error').map((r) => r.nombre)).toEqual([
    'DEFENSA_ALMACEN', 'DEFENSA_LLM_PROVIDER', 'DEFENSA_STT_PROVIDER', 'DEFENSA_TTS_PROVIDER',
  ]);
  expect(revisarConfiguracion({ ...envDemo, DEFENSA_LLM_PROVIDER: 'opneai' }).some((r) => r.estado === 'error')).toBe(true);
});

test('proveedores reales requieren sus variables y los marcadores .example no son una URL lista', () => {
  const resultados = revisarConfiguracion({ ...envDemo, DEFENSA_ALMACEN: 'supabase', DEFENSA_LLM_PROVIDER: 'openai', DEFENSA_STT_PROVIDER: 'deepgram', DEFENSA_TTS_PROVIDER: 'elevenlabs', NEXT_PUBLIC_SITE_URL: 'https://celestea.example' });
  expect(resultados.filter((r) => r.estado === 'error').map((r) => r.nombre)).toEqual(expect.arrayContaining([
    'SUPABASE_SERVICE_ROLE_KEY', 'CRON_SECRET', 'DEFENSA_OPENAI_API_KEY', 'DEFENSA_LLM_MODEL',
    'DEFENSA_DEEPGRAM_API_KEY', 'DEFENSA_ELEVENLABS_API_KEY', 'DEFENSA_ELEVENLABS_VOICE_ID', 'NEXT_PUBLIC_SITE_URL',
  ]));
});

function proveedoresDePrueba(): Proveedores {
  return {
    llm: { id: 'real-llm', generarJson: async () => ({ json: { estado: 'ok' }, modelo: 'modelo-prueba', proveedor: 'real-llm' }) },
    tts: { id: 'real-voz', sintetizar: async () => ({ bytes: new Uint8Array(1024), mime: 'audio/mpeg', extension: 'mp3' }) },
    stt: { id: 'real-stt', transcribir: async () => ({ texto: 'Prueba', palabras: [{ texto: 'Prueba', inicioMs: 0, finMs: 500, confianza: 0.9 }], duracionMs: 500, proveedor: 'real-stt', modelo: 'modelo-prueba' }) },
  };
}

test('prueba ambos modelos y usa el audio sintético para comprobar palabras, confianza y tiempos', async () => {
  const proveedores = proveedoresDePrueba();
  const tareas: string[] = [];
  proveedores.llm.generarJson = async (r) => { tareas.push(r.tarea); return { json: { estado: 'ok' }, modelo: 'prueba', proveedor: 'prueba' }; };
  const resultados = await probarProveedores(proveedores);
  expect(tareas).toEqual(['plan', 'clasificar_turno']);
  expect(resultados).toHaveLength(4);
  expect(resultados.every((r) => r.estado === 'ok')).toBe(true);
});

test('un mock se omite sin invocarlo y nunca aparece como conexión real verificada', async () => {
  const fallo = async (): Promise<never> => { throw new Error('No debe invocarse'); };
  const resultados = await probarProveedores({ llm: { id: 'mock', generarJson: fallo }, tts: { id: 'mock', sintetizar: fallo }, stt: { id: 'mock', transcribir: fallo } });
  expect(resultados).toHaveLength(3);
  expect(resultados.every((r) => r.estado === 'simulado')).toBe(true);
});

test('un error del modelo no se disfraza de éxito por fallback ni expone su mensaje', async () => {
  const proveedores = proveedoresDePrueba();
  proveedores.llm.generarJson = async () => { throw new Error('secreto-respuesta-del-proveedor'); };
  const resultados = await probarProveedores(proveedores);
  expect(resultados.filter((r) => r.estado === 'error')).toHaveLength(2);
  expect(JSON.stringify(resultados)).not.toContain('secreto-respuesta-del-proveedor');
});

test('texto sin tiempos o confianza válida no pasa la prueba de transcripción', async () => {
  const proveedores = proveedoresDePrueba();
  proveedores.stt.transcribir = async () => ({ texto: 'Prueba', palabras: [{ texto: 'Prueba', inicioMs: 500, finMs: 0, confianza: NaN }], duracionMs: 500, proveedor: 'prueba', modelo: 'prueba' });
  const resultados = await probarProveedores(proveedores);
  expect(resultados.find((r) => r.nombre === 'Transcripción')?.estado).toBe('error');
});

test('Supabase se comprueba sin leer filas ni escribir; detecta eventos ausentes y buckets públicos', async () => {
  const tablas: string[] = [];
  const db = {
    from: (tabla: string) => ({ select: (_columnas: string, opciones: { head: boolean }) => {
      expect(opciones.head).toBe(true);
      tablas.push(tabla);
      return { limit: async (limite: number) => {
        expect(limite).toBe(0);
        return { error: tabla === 'eventos_de_aprendizaje' ? { code: 'PGRST205' } : null };
      } };
    } }),
    storage: { getBucket: async (bucket: string) => ({ data: { public: bucket === 'defensa-audio' }, error: null }) },
  } as unknown as SupabaseClient;
  const resultados = await probarSupabase(db);
  expect(tablas).toHaveLength(13);
  expect(resultados.filter((r) => r.estado === 'error').map((r) => r.nombre)).toEqual(['eventos_de_aprendizaje', 'defensa-audio']);
});

test('las columnas que consulta el diagnóstico existen en la migración de las defensas', () => {
  const sql = readFileSync(resolve(__dirname, '../../supabase/migrations/20261013_defensa_oral_piloto.sql'), 'utf8');
  const columnasDe = (tabla: string): string[] => {
    const inicio = sql.indexOf(`create table if not exists public.${tabla} (`);
    expect(inicio, tabla).toBeGreaterThanOrEqual(0);
    const cuerpo = sql.slice(inicio, sql.indexOf('\n);', inicio));
    return cuerpo
      .split('\n')
      .slice(1)
      .map((linea) => linea.trim().split(/\s+/)[0] ?? '')
      .filter((nombre) => /^[a-z_]+$/.test(nombre));
  };
  const tablas = Object.keys(COLUMNAS_POR_TABLA).filter((tabla) => tabla.startsWith('defensa_'));
  expect(tablas).toHaveLength(12);
  for (const tabla of tablas) {
    const existentes = columnasDe(tabla);
    for (const columna of (COLUMNAS_POR_TABLA[tabla] ?? '').split(',')) expect(existentes, `${tabla}.${columna}`).toContain(columna);
  }
});

test('ElevenLabs para voz y transcripción pide la llave una sola vez', () => {
  const base = { ...envDemo, DEFENSA_STT_PROVIDER: 'elevenlabs', DEFENSA_TTS_PROVIDER: 'elevenlabs', DEFENSA_ELEVENLABS_VOICE_ID: 'voz-ficticia' };
  const sinLlave = revisarConfiguracion(base);
  expect(sinLlave.filter((r) => r.nombre === 'DEFENSA_ELEVENLABS_API_KEY')).toHaveLength(1);
  expect(sinLlave.find((r) => r.nombre === 'DEFENSA_ELEVENLABS_API_KEY')?.estado).toBe('error');
  const soloTranscripcion = revisarConfiguracion({ ...envDemo, DEFENSA_STT_PROVIDER: 'elevenlabs' });
  expect(soloTranscripcion.find((r) => r.nombre === 'DEFENSA_STT_PROVIDER')?.estado).toBe('ok');
  expect(soloTranscripcion.find((r) => r.nombre === 'DEFENSA_ELEVENLABS_API_KEY')?.estado).toBe('error');
  const completa = revisarConfiguracion({ ...base, DEFENSA_ELEVENLABS_API_KEY: 'llave-ficticia' });
  expect(completa.filter((r) => r.nombre === 'DEFENSA_ELEVENLABS_API_KEY').map((r) => r.estado)).toEqual(['ok']);
});

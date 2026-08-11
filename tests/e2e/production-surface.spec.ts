import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { isRetiredProductionPath } from '../../src/lib/server/productionSurface';
import { evaluateReadiness } from '../../src/lib/server/readiness';

test('production exposes the active learner APIs but retires legacy surfaces', () => {
  for (const path of [
    '/dashboard',
    '/auth/confirmar-registro',
    '/grupos/PILOT-01',
    '/missions/legacy',
    '/ai-transparencia',
    '/transparencia-ia',
    '/api/plan',
    '/api/roster/set-alias',
    '/api/teacher/export',
    '/api/analytics/PILOT-01',
  ]) {
    expect(isRetiredProductionPath(path, 'production'), path).toBe(true);
    expect(isRetiredProductionPath(path, 'development'), path).toBe(false);
  }

  for (const path of [
    '/',
    '/crear',
    '/workshops/CREAR-ENGLISH-DEDUCTION-V1.json',
    '/api/classify',
    '/api/crear/retest',
    '/api/events/ingest',
    '/api/health',
    '/api/readiness',
    '/api/planner',
  ]) {
    expect(isRetiredProductionPath(path, 'production'), path).toBe(false);
  }
});

test('legacy plan lookup rejects traversal-shaped template names in development', async ({ request }) => {
  const response = await request.post('/api/plan', {
    data: {
      materia: '../../package',
      grado: '1',
      tema: 'No debe salir del directorio',
    },
  });

  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toEqual({ error: 'Materia inválida.' });
});

test('responses carry baseline security headers without blocking same-origin media', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.status()).toBe(200);
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  expect(response.headers()['x-frame-options']).toBe('DENY');
  expect(response.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(response.headers()['permissions-policy']).toContain('microphone=()');
  expect(response.headers()['x-powered-by']).toBeUndefined();
  await expect(response.json()).resolves.toEqual({ status: 'ok' });

  const [workshop, audio, video] = await Promise.all([
    request.get('/workshops/CREAR-ENGLISH-DEDUCTION-V1.json'),
    request.get('/audio/crear/english-deduction/arrival.mp3'),
    request.get('/video/bg_waves.mp4'),
  ]);
  expect(workshop.status()).toBe(200);
  expect(workshop.headers()['content-type']).toContain('application/json');
  expect(audio.status()).toBe(200);
  expect(audio.headers()['content-type']).toContain('audio/mpeg');
  expect(video.status()).toBe(200);
  expect(video.headers()['content-type']).toContain('video/mp4');
});

test('readiness fails closed in production and reports statuses, never values', async () => {
  const missing = evaluateReadiness({ NODE_ENV: 'production' });
  expect(missing.ready).toBe(false);
  expect(Object.values(missing.checks)).toContain(false);

  const unsafeTestMode = evaluateReadiness({
    NODE_ENV: 'production',
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-0000000000',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key-0000000000',
    CREAR_RETEST_SIGNING_SECRET: 'a'.repeat(32),
    CREAR_RETEST_TEST_MODE: '1',
    CREAR_RETEST_DELAY_HOURS: '0',
  });
  expect(unsafeTestMode.ready).toBe(false);
  expect(unsafeTestMode.checks.retestProductionMode).toBe(false);
  expect(unsafeTestMode.checks.retestDelay).toBe(false);

  const ready = evaluateReadiness({
    NODE_ENV: 'production',
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-0000000000',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key-0000000000',
    CREAR_RETEST_SIGNING_SECRET: 'b'.repeat(32),
  });
  expect(ready.ready).toBe(true);
});

test('learning evidence migration closes tables, aliases, views, and public policies', async () => {
  const sql = await readFile(
    'supabase/migrations/20260810_secure_learning_event_readers.sql',
    'utf8'
  );

  for (const objectName of [
    'eventos_de_aprendizaje',
    'alias_sessions',
    'learning_events',
    'learning_events_with_alias',
  ]) {
    expect(sql).toContain(objectName);
  }
  expect(sql).toContain('REVOKE ALL PRIVILEGES');
  expect(sql).toContain('anon, authenticated, PUBLIC');
  expect(sql).toContain('security_invoker = true');
  expect(sql).toContain("FROM pg_policies");
  expect(sql).toContain("cmd IN ('SELECT', 'ALL')");
});

test('readiness endpoint contains only named check statuses', async ({ request }) => {
  const response = await request.get('/api/readiness');
  expect([200, 503]).toContain(response.status());
  const payload = (await response.json()) as {
    status: string;
    checks: Record<string, unknown>;
  };
  expect(['ready', 'not_ready']).toContain(payload.status);
  expect(Object.values(payload.checks).every((value) =>
    value === 'ok' || value === 'misconfigured'
  )).toBe(true);
});

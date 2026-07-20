import { expect, test } from '@playwright/test';

test('rejects unsafe workshop ids before filesystem access', async ({ request }) => {
  const response = await request.get('/api/talleres/package.json');
  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toMatchObject({ error: 'ID de taller inválido' });
});

test('rate limits classifier abuse without invoking the model', async ({ request }) => {
  const headers = {
    'Content-Type': 'application/json',
    'x-forwarded-for': '203.0.113.77',
  };

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const response = await request.post('/api/classify', { data: {}, headers });
    expect(response.status()).toBe(400);
  }

  const limited = await request.post('/api/classify', { data: {}, headers });
  expect(limited.status()).toBe(429);
  expect(limited.headers()['retry-after']).toBeTruthy();
});

test('replaces a corrupt CREAR navigation state instead of coercing it', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'celesta:crear:study:CREAR-ENGLISH-DEDUCTION-V1',
      JSON.stringify({
        studyId: 'corrupt-study',
        lessonId: 'CREAR-ENGLISH-DEDUCTION-V1',
        contentVersion: '1.2.0',
        startedAt: Date.now(),
        updatedAt: Date.now(),
        phase: 'initial',
        stepIndex: '5',
      })
    );
  });

  const response = await page.goto('/crear');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: '¿Qué fue lo que pasó?' })).toBeVisible();

  const storedStepIndex = await page.evaluate(() => {
    const raw = localStorage.getItem('celesta:crear:study:CREAR-ENGLISH-DEDUCTION-V1');
    return raw ? (JSON.parse(raw) as { stepIndex?: unknown }).stepIndex : undefined;
  });
  expect(storedStepIndex).toBe(0);
});

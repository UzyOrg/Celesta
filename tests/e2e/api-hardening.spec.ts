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

test('public learner APIs reject oversized bodies before schema work', async ({ request }) => {
  const oversizedAnswer = await request.post('/api/classify', {
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '203.0.113.78',
    },
    data: {
      tallerId: 'CREAR-ENGLISH-DEDUCTION-V1',
      pasoRefId: 'transfer-production',
      texto: 'x'.repeat(33 * 1024),
    },
  });
  expect(oversizedAnswer.status()).toBe(413);

  const oversizedRetest = await request.post('/api/crear/retest', {
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '203.0.113.79',
    },
    data: {
      classToken: 'TEST-PILOT',
      participantCode: 'P01',
      studyId: 'x'.repeat(9 * 1024),
      lessonId: 'CREAR-ENGLISH-DEDUCTION-V1',
    },
  });
  expect(oversizedRetest.status()).toBe(413);

  const oversizedTicket = await request.put('/api/crear/retest', {
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '203.0.113.80',
    },
    data: { ticket: 'x'.repeat(9 * 1024) },
  });
  expect(oversizedTicket.status()).toBe(413);
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
  // A corrupt state must land on the arrival scene, not on a coerced step.
  // Anchored to the authored arrival headline so a copy bump fails loudly here
  // instead of letting the state-recovery assertion below go unverified.
  await expect(page.getByRole('heading', {
    name: 'El cartel cambió antes de la feria.',
    exact: true,
  })).toBeVisible();

  const storedStepIndex = await page.evaluate(() => {
    const raw = localStorage.getItem('celesta:crear:study:CREAR-ENGLISH-DEDUCTION-V1');
    return raw ? (JSON.parse(raw) as { stepIndex?: unknown }).stepIndex : undefined;
  });
  expect(storedStepIndex).toBe(0);
});

test('raw evidence readers are closed without authorization', async ({ request }) => {
  const exportResponse = await request.get('/api/teacher/export?token=TEST-PILOT');
  expect(exportResponse.status()).toBe(401);

  for (const path of [
    '/api/analytics/TEST-PILOT',
    '/api/student/insights?class_token=TEST-PILOT&student_alias=P01',
    '/api/student/completed-missions',
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(410);
  }
});

test('public beta form rejects oversized and structurally unexpected input', async ({ request }) => {
  const oversized = await request.post('/api/beta-request', {
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '203.0.113.201',
    },
    data: {
      fullName: 'A'.repeat(9_000),
      email: 'pilot@example.com',
      schoolName: 'Prepa piloto',
    },
  });
  expect(oversized.status()).toBe(413);

  const unexpected = await request.post('/api/beta-request', {
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '203.0.113.202',
    },
    data: {
      fullName: 'Participante',
      email: 'pilot@example.com',
      schoolName: 'Prepa piloto',
      html: '<script>alert(1)</script>',
    },
  });
  expect(unexpected.status()).toBe(400);
});

test('an authenticated identity still needs to own the requested cohort', async () => {
  const { classAssignmentBelongsTo } =
    await import('../../src/lib/server/classReadAuthorization');
  expect(classAssignmentBelongsTo('teacher-a', { teacher_id: 'teacher-a' })).toBe(true);
  expect(classAssignmentBelongsTo('teacher-a', { teacher_id: 'teacher-b' })).toBe(false);
  expect(classAssignmentBelongsTo('teacher-a', null)).toBe(false);
});

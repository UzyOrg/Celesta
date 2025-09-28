import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID, randomBytes } from 'node:crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function uuid() {
  try {
    return randomUUID();
  } catch {
    return randomBytes(16).toString('hex');
  }
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]!; }

export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Disabled in production', { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return new NextResponse('Server not configured', { status: 500 });
  }
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const url = new URL(req.url);
  const token = url.searchParams.get('token') || 'DEMO-101';
  const n = Math.max(1, Math.min(50, Number(url.searchParams.get('n') || 8)));
  const talleres = (url.searchParams.get('talleres') || 'ALG-001,BIO-001').split(',').map((s) => s.trim()).filter(Boolean);

  // Generate synthetic sessions
  const now = Date.now();
  const events: any[] = [];
  const aliases: Array<{ class_token: string; student_session_id: string; alias: string; last_seen: string }>
    = [];

  for (let i = 0; i < n; i++) {
    const sid = uuid();
    const alias = `demo-${sid.slice(0, 6)}`;
    aliases.push({ class_token: token, student_session_id: sid, alias, last_seen: new Date(now + i * 1000).toISOString() });

    const taller = pick(talleres);
    const baseTs = now - Math.floor(Math.random() * 3 * 24 * 60 * 60 * 1000); // last 3 days

    // inicio_taller
    events.push({
      client_event_id: uuid(),
      actor_sid: sid,
      student_session_id: sid,
      class_token: token,
      taller_id: taller,
      paso_id: 'intro',
      verbo: 'inicio_taller',
      result: { tipo_paso: 'instruccion' },
      ts: new Date(baseTs).toISOString(),
      client_ts: new Date(baseTs).toISOString(),
    });

    // prediccion
    const predTs = baseTs + 60 * 1000;
    events.push({
      client_event_id: uuid(),
      actor_sid: sid,
      student_session_id: sid,
      class_token: token,
      taller_id: taller,
      paso_id: 'pred',
      verbo: 'envio_respuesta',
      result: { tipo_paso: 'prediccion', raw: { selected: pick(['a','b','c']), explicacion: 'demo' } },
      ts: new Date(predTs).toISOString(),
      client_ts: new Date(predTs).toISOString(),
    });

    // a veces pide pista
    if (Math.random() < 0.5) {
      const hintTs = predTs + 20 * 1000;
      events.push({
        client_event_id: uuid(),
        actor_sid: sid,
        student_session_id: sid,
        class_token: token,
        taller_id: taller,
        paso_id: 'pred',
        verbo: 'solicito_pista',
        result: { costo: 1 },
        ts: new Date(hintTs).toISOString(),
        client_ts: new Date(hintTs).toISOString(),
      });
    }

    // observacion completa
    const obsTs = predTs + 120 * 1000;
    const ok = Math.random() < 0.7;
    events.push({
      client_event_id: uuid(),
      actor_sid: sid,
      student_session_id: sid,
      class_token: token,
      taller_id: taller,
      paso_id: 'obs',
      verbo: 'completo_paso',
      result: { success: ok, score: ok ? 1 : 0, tipo_paso: 'observacion', raw: { answer: ok ? 'razon unitaria' : 'no proporcional' } },
      ts: new Date(obsTs).toISOString(),
      client_ts: new Date(obsTs).toISOString(),
    });

    // caza_errores
    const bugTs = obsTs + 120 * 1000;
    const fallas = ['f1','f2','f3','f4','f5'];
    const picked = fallas.filter(() => Math.random() < 0.3);
    events.push({
      client_event_id: uuid(),
      actor_sid: sid,
      student_session_id: sid,
      class_token: token,
      taller_id: taller,
      paso_id: 'bughunt',
      verbo: 'envio_respuesta',
      result: { tipo_paso: 'caza_errores', raw: { fallas_marcadas: picked } },
      ts: new Date(bugTs).toISOString(),
      client_ts: new Date(bugTs).toISOString(),
    });

    // decision completa
    const decTs = bugTs + 120 * 1000;
    const ok2 = Math.random() < 0.6;
    events.push({
      client_event_id: uuid(),
      actor_sid: sid,
      student_session_id: sid,
      class_token: token,
      taller_id: taller,
      paso_id: 'decision',
      verbo: 'completo_paso',
      result: { success: ok2, score: ok2 ? 1 : 0, tipo_paso: 'pregunta_abierta_validada', raw: { answer: 'precio razonado' } },
      ts: new Date(decTs).toISOString(),
      client_ts: new Date(decTs).toISOString(),
    });

    // taller_completado
    const finTs = decTs + 60 * 1000;
    events.push({
      client_event_id: uuid(),
      actor_sid: sid,
      student_session_id: sid,
      class_token: token,
      taller_id: taller,
      paso_id: 'fin',
      verbo: 'taller_completado',
      result: {},
      ts: new Date(finTs).toISOString(),
      client_ts: new Date(finTs).toISOString(),
    });
  }

  // Upsert aliases
  const { error: aliasErr } = await supabase
    .from('alias_sessions')
    .upsert(aliases, { onConflict: 'class_token,student_session_id' });
  if (aliasErr) {
    return new NextResponse('Alias upsert error: ' + aliasErr.message, { status: 500 });
  }

  // Insert events
  const { error: evErr } = await supabase
    .from('eventos_de_aprendizaje')
    .insert(events);
  if (evErr) {
    return new NextResponse('Insert error: ' + evErr.message, { status: 500 });
  }

  return NextResponse.json({ ok: true, token, inserted: events.length, sessions: aliases.length });
}

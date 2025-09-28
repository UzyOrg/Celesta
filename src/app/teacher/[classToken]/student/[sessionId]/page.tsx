import { createClient } from '@supabase/supabase-js';
import { performance } from 'node:perf_hooks';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export default async function StudentPage({ params, searchParams }: { params: Promise<{ classToken: string; sessionId: string }>, searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-2">Detalle de Estudiante</h1>
        <div className="p-3 rounded border border-red-600/40 bg-red-900/20">
          Configura NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor.
        </div>
      </div>
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const pageStart = performance.now();
  const { classToken, sessionId } = await params;
  const sp = (await searchParams) ?? {};

  // Filters
  const now = new Date();
  const defTo = now.toISOString().slice(0, 10);
  const defFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const fromParam = (sp?.from as string) || defFrom;
  const toParam = (sp?.to as string) || defTo;
  const tallerParam = (sp?.taller as string) || '';
  const fromISO = `${fromParam}T00:00:00.000Z`;
  const toISO = `${toParam}T23:59:59.999Z`;

  let query = supabase
    .from('learning_events_with_alias')
    .select('student_session_id, actor_sid, class_token, taller_id, paso_id, verbo, result, ts, client_ts, alias')
    .eq('class_token', classToken)
    .eq('student_session_id', sessionId)
    .gte('ts', fromISO)
    .lte('ts', toISO)
    .order('ts', { ascending: true })
    .limit(5000);
  if (tallerParam) query = query.eq('taller_id', tallerParam);
  const qStart = performance.now();
  const { data, error } = await query;
  const qMs = Math.round(performance.now() - qStart);
  try {
    console.log(
      `[SSR][student] query ${qMs}ms token=${classToken} session=${sessionId} from=${fromParam} to=${toParam} taller=${tallerParam || '-'} rows=${(data ?? []).length}`
    );
  } catch {}

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-2">Detalle de Estudiante</h1>
        <div className="p-3 rounded border border-red-600/40 bg-red-900/20">{error.message}</div>
      </div>
    );
  }

  const events = (data ?? []) as Array<{
    student_session_id: string;
    actor_sid: string;
    class_token: string;
    taller_id: string;
    paso_id: string;
    verbo: string;
    result: any;
    ts: string;
    client_ts?: string | null;
    alias?: string | null;
  }>;

  const alias = events.find((e) => (e.alias ?? '').trim().length > 0)?.alias ?? `anon-${sessionId.slice(0, 6)}`;

  // Metrics
  const completed = events.filter((e) => e.verbo === 'completo_paso' && e.result?.success === true);
  const stepsCompleted = completed.length;
  const scores = completed.map((e) => Number(e.result?.score ?? 0)).filter((n) => Number.isFinite(n));
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const hintCosts = events.filter((e) => e.verbo === 'solicito_pista').map((e) => Number(e.result?.costo ?? 1));
  const totalHintCost = hintCosts.reduce((a, b) => a + b, 0);

  // Changed answers (% across attempts per paso)
  const attemptMap = new Map<string, Set<string>>();
  const normRaw = (raw: any): string => {
    if (!raw) return '∅';
    if (typeof raw.selected !== 'undefined') return `sel:${String(raw.selected)}`;
    if (typeof raw.answer === 'string') return `ans:${raw.answer.trim().toLowerCase()}`;
    if (Array.isArray(raw.fallas_marcadas)) return `fallas:${raw.fallas_marcadas.slice().sort().join(',')}`;
    if (Array.isArray(raw.order)) return `order:${raw.order.join(',')}`;
    return JSON.stringify(raw);
  };
  for (const e of events) {
    if (e.verbo !== 'envio_respuesta') continue;
    const key = String(e.paso_id);
    if (!attemptMap.has(key)) attemptMap.set(key, new Set());
    attemptMap.get(key)!.add(normRaw(e.result?.raw));
  }
  let changed = 0;
  const vals = Array.from(attemptMap.values());
  for (const s of vals) if (s.size > 1) changed += 1;
  const changedPct = attemptMap.size ? (changed / attemptMap.size) * 100 : 0;

  const totalMs = Math.round(performance.now() - pageStart);
  try {
    console.log(`[SSR][student] total ${totalMs}ms token=${classToken} session=${sessionId}`);
  } catch {}
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{alias}</h1>
        <p className="text-neutral-300 text-sm">Grupo: {classToken}</p>
        <p className="text-neutral-500 text-xs break-all">Session: {sessionId}</p>
      </header>

      <section className="p-4 rounded bg-black/20 border border-neutral-800">
        <form className="flex flex-col md:flex-row gap-3 items-end" method="get">
          <div className="flex flex-col">
            <label className="text-xs text-neutral-400">Desde</label>
            <input type="date" name="from" defaultValue={fromParam} className="bg-neutral-900 border border-neutral-700 rounded p-2" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-neutral-400">Hasta</label>
            <input type="date" name="to" defaultValue={toParam} className="bg-neutral-900 border border-neutral-700 rounded p-2" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-neutral-400">Taller</label>
            <input type="text" name="taller" defaultValue={tallerParam} placeholder="(opcional)" className="bg-neutral-900 border border-neutral-700 rounded p-2" />
          </div>
          <button className="px-3 py-2 bg-lime text-black rounded" type="submit">Aplicar</button>
          <a className="px-3 py-2 bg-neutral-800 text-white rounded" href={`/teacher/${encodeURIComponent(classToken)}?from=${encodeURIComponent(fromParam)}&to=${encodeURIComponent(toParam)}${tallerParam ? `&taller=${encodeURIComponent(tallerParam)}` : ''}`}>← Volver al panel</a>
        </form>
      </section>

      <section className="grid md:grid-cols-4 gap-4">
        <div className="p-4 rounded bg-black/20 border border-neutral-800">
          <div className="text-neutral-400 text-sm">Pasos completados</div>
          <div className="text-3xl font-bold">{stepsCompleted}</div>
        </div>
        <div className="p-4 rounded bg-black/20 border border-neutral-800">
          <div className="text-neutral-400 text-sm">Pistas (costo total)</div>
          <div className="text-3xl font-bold">{totalHintCost}</div>
        </div>
        <div className="p-4 rounded bg-black/20 border border-neutral-800">
          <div className="text-neutral-400 text-sm">Promedio de puntaje</div>
          <div className="text-3xl font-bold">{avgScore.toFixed(2)}</div>
        </div>
        <div className="p-4 rounded bg-black/20 border border-neutral-800">
          <div className="text-neutral-400 text-sm">% cambios de respuesta</div>
          <div className="text-3xl font-bold">{changedPct.toFixed(0)}%</div>
        </div>
      </section>

      <section className="p-4 rounded bg-black/20 border border-neutral-800">
        <h2 className="text-xl font-semibold mb-2">Línea de tiempo</h2>
        {events.length === 0 ? (
          <div className="text-neutral-400">Sin eventos en el periodo.</div>
        ) : (
          <ul className="space-y-2">
            {events.map((e, idx) => (
              <li key={idx} className="p-3 border border-neutral-800 rounded bg-black/10">
                <div className="flex justify-between items-center text-xs text-neutral-400">
                  <span>{new Date(e.ts).toLocaleString()}</span>
                  <span>{e.taller_id} · Paso {e.paso_id}</span>
                </div>
                <div className="mt-1 text-sm">
                  <span className="inline-block px-2 py-0.5 rounded bg-neutral-800 text-white mr-2">{e.verbo}</span>
                  {e.verbo === 'completo_paso' && (
                    <span>
                      {e.result?.success ? '✔️ Éxito' : '❌ Fallo'} · Puntaje {Number(e.result?.score ?? 0)}
                    </span>
                  )}
                  {e.verbo === 'solicito_pista' && (
                    <span>🛈 Pista (costo {Number(e.result?.costo ?? 1)})</span>
                  )}
                  {e.verbo === 'envio_respuesta' && (
                    <span>Envió respuesta</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

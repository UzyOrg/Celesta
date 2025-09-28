import { createClient } from '@supabase/supabase-js';
import { performance } from 'node:perf_hooks';
import RadarChart from '@/components/teacher/RadarChart';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

type SearchParams = Record<string, string | string[] | undefined>;

export default async function TeacherClassPage({
  params,
  searchParams,
}: {
  params: Promise<{ classToken: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-2">Panel Docente</h1>
        <div className="p-3 rounded border border-red-600/40 bg-red-900/20">
          Configura NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor.
        </div>
      </div>
    );
  }

  const pageStart = performance.now();
  const { classToken } = await params;
  const sp = (await searchParams) ?? {};

  // Filtros por defecto: últimos 7 días
  const now = new Date();
  const defTo = now.toISOString().slice(0, 10);
  const defFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const fromParam = (sp.from as string) || defFrom;
  const toParam = (sp.to as string) || defTo;
  const tallerParam = (sp.taller as string) || '';
  const fromISO = `${fromParam}T00:00:00.000Z`;
  const toISO = `${toParam}T23:59:59.999Z`;

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  let query = supabase
    .from('learning_events_with_alias')
    .select(
      'student_session_id, actor_sid, class_token, taller_id, paso_id, verbo, result, ts, client_ts, alias'
    )
    .eq('class_token', classToken)
    .gte('ts', fromISO)
    .lte('ts', toISO)
    .order('ts', { ascending: false })
    .limit(10000);
  if (tallerParam) query = query.eq('taller_id', tallerParam);

  const qStart = performance.now();
  const { data, error } = await query;
  const qMs = Math.round(performance.now() - qStart);

  try {
    console.log(
      `[SSR][teacher] query ${qMs}ms token=${classToken} from=${fromParam} to=${toParam} taller=${tallerParam || '-'} rows=${(data ?? []).length}`
    );
  } catch {}

  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-3xl font-bold">Panel Docente</h1>
        <div className="p-3 rounded border border-red-600/40 bg-red-900/20">{error.message}</div>
      </div>
    );
  }

  const events =
    (data ?? []) as Array<{
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

  // Métricas generales
  const sessions = new Set(events.map((e) => e.student_session_id));
  const completed = events.filter((e) => e.verbo === 'completo_paso' && e.result?.success === true);
  const stepsCompleted = completed.length;
  const scores = completed.map((e) => Number(e.result?.score ?? 0)).filter((n) => Number.isFinite(n));
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const hintCosts = events.filter((e) => e.verbo === 'solicito_pista').map((e) => Number(e.result?.costo ?? 1));
  const totalHintCost = hintCosts.reduce((a, b) => a + b, 0);

  // Agregado por estudiante
  type StudentAgg = { sessionId: string; alias: string; stepsCompleted: number; lastTs: string };
  const perStudent = new Map<string, StudentAgg>();
  for (const e of events) {
    const sid = e.student_session_id;
    if (!perStudent.has(sid)) {
      perStudent.set(sid, {
        sessionId: sid,
        alias: (e.alias ?? '').trim().length ? (e.alias as string) : `anon-${sid.slice(0, 6)}`,
        stepsCompleted: 0,
        lastTs: e.ts,
      });
    }
    if (e.verbo === 'completo_paso' && e.result?.success === true) {
      perStudent.get(sid)!.stepsCompleted += 1;
    }
  }
  const students = Array.from(perStudent.values()).sort((a, b) => b.stepsCompleted - a.stepsCompleted);
  const studentCount = sessions.size;
  const pasoNums = events
    .map((e) => parseInt(e.paso_id, 10))
    .filter((n) => Number.isFinite(n) && n > 0) as number[];
  const estimatedTotalSteps = pasoNums.length ? Math.max(...pasoNums) : 10;

  const avgCompletedPerStudent = students.length
    ? students.reduce((sum, s) => sum + s.stepsCompleted, 0) / students.length
    : 0;

  const participation = Math.min(100, Math.round((studentCount / 30) * 100)); // base 30
  const progress = estimatedTotalSteps > 0
    ? Math.min(100, Math.round((avgCompletedPerStudent / estimatedTotalSteps) * 100))
    : 0;

  const maxScoreObserved = scores.length ? Math.max(...scores) : 1;
  const mastery = scores.length
    ? Math.min(100, Math.round((avgScore / maxScoreObserved) * 100))
    : 0;

  const hintsPerStudent = studentCount ? totalHintCost / studentCount : 0;
  const autonomy = Math.max(0, Math.min(100, Math.round(100 - (hintsPerStudent / 3) * 100)));

  const radarData = [
    { metric: 'Participación', valor: participation },
    { metric: 'Progreso', valor: progress },
    { metric: 'Maestría', valor: mastery },
    { metric: 'Autonomía', valor: autonomy },
  ];
  const totalMs = Math.round(performance.now() - pageStart);
  try {
    console.log(`[SSR][teacher] total ${totalMs}ms token=${classToken}`);
  } catch {}

  const exportQS = `classToken=${encodeURIComponent(classToken)}&from=${encodeURIComponent(fromParam)}&to=${encodeURIComponent(
    toParam
  )}${tallerParam ? `&taller=${encodeURIComponent(tallerParam)}` : ''}`;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Panel Docente</h1>
        <p className="text-neutral-300 text-sm">Grupo: {classToken}</p>
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
          <button className="px-3 py-2 bg-lime text-black rounded" type="submit">
            Aplicar
          </button>
          <a className="px-3 py-2 bg-neutral-800 text-white rounded" href={`/teacher`}>
            ← Cambiar grupo
          </a>
          <a className="ml-auto px-3 py-2 bg-turquoise text-black rounded" href={`/api/teacher/export?${exportQS}`}>
            Exportar CSV
          </a>
        </form>
      </section>

      <section className="grid md:grid-cols-4 gap-4">
        <div className="p-4 rounded bg-black/20 border border-neutral-800">
          <div className="text-neutral-400 text-sm">Estudiantes</div>
          <div className="text-3xl font-bold">{sessions.size}</div>
        </div>
        <div className="p-4 rounded bg-black/20 border border-neutral-800">
          <div className="text-neutral-400 text-sm">Pasos completados</div>
          <div className="text-3xl font-bold">{stepsCompleted}</div>
        </div>
        <div className="p-4 rounded bg-black/20 border border-neutral-800">
          <div className="text-neutral-400 text-sm">Promedio de puntaje</div>
          <div className="text-3xl font-bold">{avgScore.toFixed(2)}</div>
        </div>
        <div className="p-4 rounded bg-black/20 border border-neutral-800">
          <div className="text-neutral-400 text-sm">Pistas (costo total)</div>
          <div className="text-3xl font-bold">{totalHintCost}</div>
        </div>
      </section>

      <section className="p-4 rounded bg-black/20 border border-neutral-800">
        <h2 className="text-xl font-semibold mb-2">Indicadores (0–100)</h2>
        <RadarChart data={radarData} />
      </section>

      <section className="p-4 rounded bg-black/20 border border-neutral-800">
        <h2 className="text-xl font-semibold mb-2">Estudiantes</h2>
        {students.length === 0 ? (
          <div className="text-neutral-400">Sin eventos en el periodo.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-neutral-400">
                <tr>
                  <th className="py-2 pr-4">Alias</th>
                  <th className="py-2 pr-4">Session</th>
                  <th className="py-2 pr-4">Completados</th>
                  <th className="py-2 pr-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.sessionId} className="border-t border-neutral-800">
                    <td className="py-2 pr-4">{s.alias}</td>
                    <td className="py-2 pr-4 text-neutral-400">{s.sessionId}</td>
                    <td className="py-2 pr-4">{s.stepsCompleted}</td>
                    <td className="py-2 pr-4">
                      <a
                        className="px-2 py-1 rounded bg-neutral-800"
                        href={`/teacher/${encodeURIComponent(classToken)}/student/${encodeURIComponent(s.sessionId)}?from=${encodeURIComponent(
                          fromParam
                        )}&to=${encodeURIComponent(toParam)}${tallerParam ? `&taller=${encodeURIComponent(tallerParam)}` : ''}`}
                      >
                        Ver detalle →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
import { createClient } from '@supabase/supabase-js';
import { performance } from 'node:perf_hooks';
import TeacherDashboardWithShell from '@/components/teacher/TeacherDashboardWithShell';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Cache por 30 segundos para reducir latencia en navegaciones frecuentes
export const revalidate = 30;

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
    .from('eventos_de_aprendizaje')
    .select(
      'student_session_id, actor_sid, class_token, taller_id, paso_id, verbo, result, ts, client_ts'
    )
    .eq('class_token', classToken)
    .gte('ts', fromISO)
    .lte('ts', toISO)
    .order('ts', { ascending: false })
    // Reducido de 10000 a 2000 para mejorar performance
    // 2000 eventos = ~30 estudiantes x ~70 eventos cada uno
    .limit(2000);
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
    }>;

  // Canonical aliases from alias_sessions
  const sessionIds = Array.from(new Set(events.map((e) => e.student_session_id))).filter(Boolean);
  const aliasMap = new Map<string, string>();
  if (sessionIds.length > 0) {
    const { data: aliasRows, error: aliasErr } = await supabase
      .from('alias_sessions')
      .select('student_session_id, alias')
      .eq('class_token', classToken)
      .in('student_session_id', sessionIds)
      .limit(500); // Reducido: suficiente para ~500 estudiantes
    if (aliasErr) {
      console.error('[SSR][teacher] alias_lookup_failed', aliasErr.message);
    } else {
      for (const row of aliasRows ?? []) {
        if (!row) continue;
        const alias = typeof row.alias === 'string' ? row.alias.trim() : '';
        if (alias) aliasMap.set(row.student_session_id, alias);
      }
    }
  }
  // Métricas generales (REFACTORED para eventos agregados)
  const sessions = new Set(events.map((e) => e.student_session_id));
  const completed = events.filter((e) => e.verbo === 'completo_paso' && e.result?.success === true);
  const stepsCompleted = completed.length;
  const scores = completed
    .map((e) => Number(e.result?.score ?? 0))
    .filter((n) => Number.isFinite(n)) as number[];
  const avgScore = scores.length ? scores.reduce((sum, val) => sum + val, 0) / scores.length : 0;
  
  // NUEVO: Extraer pistas del evento agregado completo_paso
  const hintCosts = completed
    .map((e) => Number(e.result?.pistas_usadas ?? 0))
    .filter((n) => Number.isFinite(n)) as number[];
  const totalHintCost = hintCosts.reduce((sum, val) => sum + val, 0);

  // Agregado por estudiante
  type StudentAgg = { sessionId: string; alias: string; stepsCompleted: number; lastTs: string };
  const perStudent = new Map<string, StudentAgg>();
  for (const e of events) {
    const sid = e.student_session_id;
    if (!perStudent.has(sid)) {
      const canonical = aliasMap.get(sid);
      perStudent.set(sid, {
        sessionId: sid,
        alias: canonical && canonical.trim().length ? canonical : `anon-${sid.slice(0, 6)}`,
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
    <TeacherDashboardWithShell
      classToken={classToken}
      studentCount={studentCount}
      stepsCompleted={stepsCompleted}
      avgScore={avgScore}
      totalHintCost={totalHintCost}
      students={students}
      radarData={radarData}
      fromParam={fromParam}
      toParam={toParam}
      tallerParam={tallerParam}
      exportQS={exportQS}
    />
  );
}
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * GET /api/analytics/[classToken]?from=YYYY-MM-DD&to=YYYY-MM-DD&taller=XXX
 * 
 * Calcula métricas de analíticas para el dashboard del grupo:
 * - Estudiantes activos
 * - Pasos completados
 * - Puntuación promedio
 * - Pistas utilizadas
 * - Radar data (Participación, Progreso, Maestría, Autonomía)
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ classToken: string }> }
) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // Rate limiting (60/min)
  const clientIp = getClientIp(req);
  const { allowed } = checkRateLimit(`analytics:${clientIp}`, 60, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Demasiadas consultas.' },
      { status: 429 }
    );
  }

  try {
    const { classToken } = await params;
    const { searchParams } = new URL(req.url);

    // Filtros por defecto: últimos 7 días
    const now = new Date();
    const defTo = now.toISOString().slice(0, 10);
    const defFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const fromParam = searchParams.get('from') || defFrom;
    const toParam = searchParams.get('to') || defTo;
    const tallerParam = searchParams.get('taller') || '';
    const fromISO = `${fromParam}T00:00:00.000Z`;
    const toISO = `${toParam}T23:59:59.999Z`;

    const supabase = createClient(supabaseUrl, serviceRoleKey, { 
      auth: { persistSession: false } 
    });

    // Query eventos de aprendizaje
    let query = supabase
      .from('eventos_de_aprendizaje')
      .select('student_session_id, student_alias, class_token, taller_id, paso_id, verbo, result, ts')
      .eq('class_token', classToken)
      .gte('ts', fromISO)
      .lte('ts', toISO)
      .order('ts', { ascending: false })
      .limit(2000);

    if (tallerParam) {
      query = query.eq('taller_id', tallerParam);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[API][analytics] Query error:', error.code, error.message);
      return NextResponse.json(
        { error: 'query_failed', message: 'No se pudieron obtener los eventos.' },
        { status: 500 }
      );
    }

    const events = data || [];

    // Calcular métricas
    const sessions = new Set(events.map((e: any) => e.student_session_id));
    const completed = events.filter((e: any) => e.verbo === 'completo_paso' && e.result?.success === true);
    const stepsCompleted = completed.length;
    
    const scores = completed
      .map((e: any) => Number(e.result?.score ?? 0))
      .filter((n: number) => Number.isFinite(n));
    const avgScore = scores.length ? scores.reduce((sum: number, val: number) => sum + val, 0) / scores.length : 0;

    const hintCosts = completed
      .map((e: any) => Number(e.result?.pistas_usadas ?? 0))
      .filter((n: number) => Number.isFinite(n));
    const totalHintCost = hintCosts.reduce((sum: number, val: number) => sum + val, 0);

    const studentCount = sessions.size;

    // Calcular pasos promedio por estudiante
    const perStudent = new Map<string, number>();
    for (const e of events) {
      const sid = (e as any).student_session_id;
      if (!perStudent.has(sid)) {
        perStudent.set(sid, 0);
      }
      if ((e as any).verbo === 'completo_paso' && (e as any).result?.success === true) {
        perStudent.set(sid, perStudent.get(sid)! + 1);
      }
    }

    const students = Array.from(perStudent.values());
    const avgCompletedPerStudent = students.length
      ? students.reduce((sum, s) => sum + s, 0) / students.length
      : 0;

    // Estimar total de pasos del taller
    const pasoNums = events
      .map((e: any) => parseInt(e.paso_id, 10))
      .filter((n: number) => Number.isFinite(n) && n > 0);
    const estimatedTotalSteps = pasoNums.length ? Math.max(...pasoNums) : 10;

    // Calcular métricas del radar
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
      { metric: 'Participación', valor: participation / 10 }, // Escala 0-10
      { metric: 'Progreso', valor: progress / 10 },
      { metric: 'Maestría', valor: mastery / 10 },
      { metric: 'Autonomía', valor: autonomy / 10 },
    ];

    const exportQS = `classToken=${encodeURIComponent(classToken)}&from=${encodeURIComponent(fromParam)}&to=${encodeURIComponent(
      toParam
    )}${tallerParam ? `&taller=${encodeURIComponent(tallerParam)}` : ''}`;

    return NextResponse.json({
      classToken,
      studentCount,
      stepsCompleted,
      avgScore,
      totalHintCost,
      radarData,
      fromParam,
      toParam,
      tallerParam,
      exportQS,
    });

  } catch (error) {
    console.error('[API][analytics] Unexpected error:', (error as Error)?.message ?? error);
    return NextResponse.json(
      { error: 'server_error', message: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}

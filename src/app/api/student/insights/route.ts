import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * GET /api/student/insights?class_token=XXX&student_alias=YYY
 * 
 * Obtiene todos los eventos completo_paso de un estudiante específico
 * para mostrar en el Student Insight Panel del docente.
 * 
 * Retorna:
 * - Eventos completo_paso ordenados cronológicamente
 * - Métricas agregadas (tiempo total, autonomía final, etc.)
 */
export async function GET(req: Request) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // SECURITY: Rate limiting (30/min)
  const clientIp = getClientIp(req);
  const { allowed } = checkRateLimit(`student:insights:${clientIp}`, 30, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Demasiadas consultas.' },
      { status: 429 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const classToken = searchParams.get('class_token');
    const studentAlias = searchParams.get('student_alias');

    if (!classToken || !studentAlias) {
      return NextResponse.json(
        { error: 'missing_params', message: 'Se requieren class_token y student_alias' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    // PASO 1: Obtener el student_session_id desde el roster
    const { data: rosterEntry, error: rosterError } = await supabase
      .from('student_roster')
      .select('student_session_id')
      .eq('class_token', classToken)
      .eq('student_alias', studentAlias)
      .eq('status', 'approved')
      .single();

    if (rosterError || !rosterEntry?.student_session_id) {
      console.error('[API][student/insights] Student not found in roster:', rosterError?.message);
      return NextResponse.json({
        events: [],
        metrics: null,
        message: 'Estudiante no encontrado en el roster.',
        debug: { error: 'roster_not_found' }
      });
    }

    const studentSessionId = rosterEntry.student_session_id;

    // PASO 2A: Buscar eventos por student_session_id
    let { data: events, error } = await supabase
      .from('eventos_de_aprendizaje')
      .select('*')
      .eq('student_session_id', studentSessionId)
      .eq('verbo', 'completo_paso')
      .order('ts', { ascending: true });

    // FALLBACK: Si no hay eventos con ese session_id, buscar por alias en result
    if (!events || events.length === 0) {
      const { data: eventsByAlias, error: aliasError } = await supabase
        .from('eventos_de_aprendizaje')
        .select('*')
        .eq('class_token', classToken)
        .eq('verbo', 'completo_paso')
        .eq('result->>alias', studentAlias)
        .order('ts', { ascending: true });
      
      if (!aliasError && eventsByAlias && eventsByAlias.length > 0) {
        events = eventsByAlias;
        error = null;
      }
    }

    if (error) {
      console.error('[API][student/insights] Error fetching events:', error.code, error.message);
      return NextResponse.json(
        { error: 'query_failed', message: 'No se pudieron obtener los eventos.' },
        { status: 500 }
      );
    }

    if (!events || events.length === 0) {
      // Retornar info de debug para el frontend
      return NextResponse.json({
        events: [],
        metrics: null,
        message: 'No hay eventos completo_paso para este estudiante.'
      });
    }

    // Calcular métricas agregadas
    const metrics = calculateMetrics(events);

    return NextResponse.json({
      events,
      metrics,
      student_alias: studentAlias,
      class_token: classToken
    });

  } catch (error) {
    console.error('[API][student/insights] Unexpected error:', (error as Error)?.message ?? error);
    return NextResponse.json(
      { error: 'server_error', message: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}

/**
 * Calcula métricas agregadas del viaje de aprendizaje
 */
function calculateMetrics(events: any[]) {
  let totalTime = 0;
  let totalIntentos = 0;
  let totalPistas = 0;
  let totalAndamios = 0;
  let autonomiaFinal = 5; // Default 5 estrellas

  events.forEach((event) => {
    const result = event.result || {};
    
    // Tiempo total
    if (result.tiempo_en_paso_segundos) {
      totalTime += result.tiempo_en_paso_segundos;
    }
    
    // Esfuerzo
    if (result.intentos_fallidos) {
      totalIntentos += result.intentos_fallidos;
    }
    
    if (result.pistas_usadas) {
      totalPistas += result.pistas_usadas;
    }
    
    if (result.ayuda_andamio_usada) {
      totalAndamios += 1;
    }
    
    // Autonomía final (último evento con autonomia_estrellas)
    if (result.autonomia_estrellas !== undefined) {
      autonomiaFinal = result.autonomia_estrellas;
    }
  });

  const lastEvent = events[events.length - 1];
  const completionDate = lastEvent?.ts || null;

  return {
    total_time_seconds: totalTime,
    total_failed_attempts: totalIntentos,
    total_hints_used: totalPistas,
    total_scaffolds_used: totalAndamios,
    autonomy_stars: autonomiaFinal,
    completion_date: completionDate,
    total_steps: events.length
  };
}

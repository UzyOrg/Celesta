import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * API para obtener misiones completadas de un estudiante
 * Usa SERVICE_ROLE para bypass RLS
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionIdsParam = searchParams.get('sessionIds');
  const alias = searchParams.get('alias');
  const classToken = searchParams.get('classToken') || searchParams.get('class_token');
  
  // Opción 1: Por session IDs (primario)
  if (sessionIdsParam) {
    const sessionIds = sessionIdsParam.split(',');
    return getBySessionIds(sessionIds);
  }
  
  // Opción 2: Por alias + classToken (fallback si se borró localStorage)
  if (alias && classToken) {
    return getByAliasAndToken(alias, classToken);
  }
  
  return NextResponse.json({ error: 'sessionIds o (alias + classToken) requeridos' }, { status: 400 });
}

async function getBySessionIds(sessionIds: string[]) {
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Configuración de Supabase faltante' }, { status: 500 });
    }
    
    // Usar SERVICE_ROLE para bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });
    
    // 1. Talleres completados
    const { data: completedData, error: completedError } = await supabase
      .from('eventos_de_aprendizaje')
      .select('taller_id')
      .in('student_session_id', sessionIds)
      .eq('verbo', 'taller_completado');
    
    if (completedError) {
      console.error('[API][completed-missions] Error talleres completados:', completedError);
      return NextResponse.json({ error: completedError.message }, { status: 500 });
    }
    
    const uniqueWorkshops = Array.from(new Set(completedData.map(e => e.taller_id)));
    
    // 2. Pasos completados (para puntos y tiempo)
    const { data: stepsData, error: stepsError } = await supabase
      .from('eventos_de_aprendizaje')
      .select('result, ts')
      .in('student_session_id', sessionIds)
      .eq('verbo', 'completo_paso');
    
    if (stepsError) {
      console.error('[API][completed-missions] Error pasos completados:', stepsError);
      // No falla completamente, continúa con datos parciales
    }
    
    // Calcular puntos totales
    const totalPoints = stepsData?.reduce((sum, e) => {
      const score = typeof e.result === 'object' && e.result !== null 
        ? (e.result as any).score ?? 0 
        : 0;
      return sum + Number(score);
    }, 0) ?? 0;
    
    // Calcular tiempo total (en minutos)
    const totalMinutes = Math.round(
      (stepsData?.reduce((sum, e) => {
        const tiempo = typeof e.result === 'object' && e.result !== null 
          ? (e.result as any).tiempo_segundos ?? 0 
          : 0;
        return sum + Number(tiempo);
      }, 0) ?? 0) / 60
    );
    
    // Calcular racha (días consecutivos con actividad)
    // Incluir eventos de taller_completado también
    const { data: allEventsForStreak } = await supabase
      .from('eventos_de_aprendizaje')
      .select('ts')
      .in('student_session_id', sessionIds)
      .in('verbo', ['completo_paso', 'taller_completado']);
    
    const uniqueDates = new Set(
      allEventsForStreak?.map(e => e.ts?.split('T')[0]).filter(Boolean) ?? []
    );
    const sortedDates = Array.from(uniqueDates).sort().reverse();
    
    let racha = 0;
    if (sortedDates.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      // Determinar desde cuándo empezar a contar
      let startDate: Date | null = null;
      if (sortedDates.includes(today)) {
        // Tiene actividad hoy, empezar desde hoy
        startDate = new Date(today);
        racha = 1;
      } else if (sortedDates.includes(yesterdayStr)) {
        // No tiene hoy pero sí ayer, empezar desde ayer
        startDate = yesterday;
        racha = 1;
      }
      
      // Continuar contando días consecutivos hacia atrás
      if (startDate && racha > 0) {
        let currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() - 1);
        
        for (let i = 1; i < sortedDates.length; i++) {
          const compareDate = currentDate.toISOString().split('T')[0];
          if (sortedDates.includes(compareDate)) {
            racha++;
            currentDate.setDate(currentDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
    }
    
    return NextResponse.json({
      completedMissions: uniqueWorkshops.length,
      workshops: uniqueWorkshops,
      totalPoints,
      totalMinutes,
      currentStreak: racha,
    });
    
  } catch (error) {
    console.error('[API][completed-missions] Exception:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

async function getByAliasAndToken(alias: string, classToken: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Configuración de Supabase faltante' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });
    
    // 1. Obtener student_session_id desde el roster
    const { data: rosterEntry, error: rosterError } = await supabase
      .from('student_roster')
      .select('student_session_id')
      .eq('class_token', classToken)
      .eq('student_alias', alias)
      .eq('status', 'approved')
      .single();

    if (rosterError || !rosterEntry?.student_session_id) {
      console.error('[API][completed-missions] Student not found in roster');
      return NextResponse.json({ 
        completedMissions: 0,
        workshops: [],
        totalStepsCompleted: 0,
        totalPoints: 0,
        totalMinutes: 0
      });
    }

    const studentSessionId = rosterEntry.student_session_id;

    // 2. Talleres completados (buscar por student_session_id)
    let { data: completedData, error: completedError } = await supabase
      .from('eventos_de_aprendizaje')
      .select('taller_id')
      .eq('student_session_id', studentSessionId)
      .eq('verbo', 'taller_completado');

    // FALLBACK: Buscar por alias en result si no hay eventos
    if (!completedData || completedData.length === 0) {
      const { data: byAlias } = await supabase
        .from('eventos_de_aprendizaje')
        .select('taller_id')
        .eq('class_token', classToken)
        .eq('verbo', 'taller_completado')
        .eq('result->>alias', alias);
      
      if (byAlias && byAlias.length > 0) {
        completedData = byAlias;
      }
    }
    
    if (completedError) {
      console.error('[API][completed-missions] Error talleres:', completedError);
      return NextResponse.json({ error: completedError.message }, { status: 500 });
    }
    
    const uniqueWorkshops = Array.from(new Set(completedData?.map(e => e.taller_id) ?? []));
    
    // 3. Pasos completados (para métricas)
    let { data: stepsData, error: stepsError } = await supabase
      .from('eventos_de_aprendizaje')
      .select('result, ts')
      .eq('student_session_id', studentSessionId)
      .eq('verbo', 'completo_paso');

    // FALLBACK: Buscar por alias en result
    if (!stepsData || stepsData.length === 0) {
      const { data: stepsByAlias } = await supabase
        .from('eventos_de_aprendizaje')
        .select('result, ts')
        .eq('class_token', classToken)
        .eq('verbo', 'completo_paso')
        .eq('result->>alias', alias);
      
      if (stepsByAlias && stepsByAlias.length > 0) {
        stepsData = stepsByAlias;
      }
    }
    
    if (stepsError) {
      console.error('[API][completed-missions] Error pasos:', stepsError);
    }
    
    // Calcular métricas (igual que antes)
    const totalPoints = stepsData?.reduce((sum, e) => {
      const score = typeof e.result === 'object' && e.result !== null 
        ? (e.result as any).score ?? 0 
        : 0;
      return sum + Number(score);
    }, 0) ?? 0;
    
    const totalMinutes = Math.round(
      (stepsData?.reduce((sum, e) => {
        const tiempo = typeof e.result === 'object' && e.result !== null 
          ? (e.result as any).tiempo_segundos ?? 0 
          : 0;
        return sum + Number(tiempo);
      }, 0) ?? 0) / 60
    );
    
    // Calcular racha: incluir eventos de taller_completado también
    const { data: allEventsForStreak } = await supabase
      .from('eventos_de_aprendizaje')
      .select('ts')
      .or(`student_session_id.eq.${studentSessionId},and(class_token.eq.${classToken},result->>alias.eq.${alias})`)
      .in('verbo', ['completo_paso', 'taller_completado']);
    
    const uniqueDates = new Set(
      allEventsForStreak?.map(e => e.ts?.split('T')[0]).filter(Boolean) ?? []
    );
    const sortedDates = Array.from(uniqueDates).sort().reverse();
    
    let racha = 0;
    if (sortedDates.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      // Determinar desde cuándo empezar a contar
      let startDate: Date | null = null;
      if (sortedDates.includes(today)) {
        startDate = new Date(today);
        racha = 1;
      } else if (sortedDates.includes(yesterdayStr)) {
        startDate = yesterday;
        racha = 1;
      }
      
      // Continuar contando días consecutivos hacia atrás
      if (startDate && racha > 0) {
        let currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() - 1);
        
        for (let i = 1; i < sortedDates.length; i++) {
          const compareDate = currentDate.toISOString().split('T')[0];
          if (sortedDates.includes(compareDate)) {
            racha++;
            currentDate.setDate(currentDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
    }
    
    return NextResponse.json({
      completedMissions: uniqueWorkshops.length,
      workshops: uniqueWorkshops,
      totalPoints,
      totalMinutes,
      currentStreak: racha,
      recoveredFromAlias: true,  // Flag para debug
    });
    
  } catch (error) {
    console.error('[API][completed-missions] Exception en getByAlias:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

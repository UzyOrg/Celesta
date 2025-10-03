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
  const classToken = searchParams.get('classToken');
  
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
    const uniqueDates = new Set(
      stepsData?.map(e => e.ts?.split('T')[0]) ?? []
    );
    const sortedDates = Array.from(uniqueDates).sort().reverse();
    
    let racha = 0;
    if (sortedDates.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      let currentDate = new Date(today);
      
      for (const dateStr of sortedDates) {
        const eventDate = dateStr ?? '';
        const compareDate = currentDate.toISOString().split('T')[0];
        
        if (eventDate === compareDate) {
          racha++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
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
    
    // 1. Talleres completados (buscar por columna student_alias)
    const { data: completedData, error: completedError } = await supabase
      .from('eventos_de_aprendizaje')
      .select('taller_id')
      .eq('class_token', classToken)
      .eq('verbo', 'taller_completado')
      .eq('student_alias', alias);  // ✅ Buscar por columna directa
    
    if (completedError) {
      console.error('[API][completed-missions] Error talleres por alias:', completedError);
      return NextResponse.json({ error: completedError.message }, { status: 500 });
    }
    
    const uniqueWorkshops = Array.from(new Set(completedData?.map(e => e.taller_id) ?? []));
    
    // 2. Pasos completados (para métricas)
    const { data: stepsData, error: stepsError } = await supabase
      .from('eventos_de_aprendizaje')
      .select('result, ts')
      .eq('class_token', classToken)
      .eq('verbo', 'completo_paso')
      .eq('student_alias', alias);  // ✅ Buscar por columna directa
    
    if (stepsError) {
      console.error('[API][completed-missions] Error pasos por alias:', stepsError);
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
    
    const uniqueDates = new Set(
      stepsData?.map(e => e.ts?.split('T')[0]) ?? []
    );
    const sortedDates = Array.from(uniqueDates).sort().reverse();
    
    let racha = 0;
    if (sortedDates.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      let currentDate = new Date(today);
      
      for (const dateStr of sortedDates) {
        const eventDate = dateStr ?? '';
        const compareDate = currentDate.toISOString().split('T')[0];
        
        if (eventDate === compareDate) {
          racha++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
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

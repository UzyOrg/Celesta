import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/roster/[classToken]
 * 
 * Obtiene el roster completo de un grupo:
 * - Estudiantes aprobados
 * - Solicitudes pendientes
 * - Solicitudes rechazadas (opcional)
 * 
 * Requiere autenticación de docente.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ classToken: string }> }
) {
  try {
    const { classToken } = await context.params;

    // 1. Verificar autenticación del docente
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    // 2. Verificar que el class_token pertenece al docente
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    const { data: classAssignment, error: tokenError } = await serviceClient
      .from('class_assignments')
      .select('class_token, teacher_id')
      .eq('class_token', classToken)
      .eq('teacher_id', user.id)
      .maybeSingle();

    if (tokenError || !classAssignment) {
      console.error('[roster/GET] Token no encontrado o no pertenece al docente:', tokenError?.message);
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    // 3. Obtener todas las entradas del roster
    const { data: rosterEntries, error: rosterError } = await serviceClient
      .from('student_roster')
      .select('*')
      .eq('class_token', classToken)
      .order('created_at', { ascending: false });

    if (rosterError) {
      console.error('[roster/GET] Error obteniendo roster:', rosterError);
      return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
    }

    // 4. Separar por status
    const approved = rosterEntries.filter(e => e.status === 'approved');
    const pending = rosterEntries.filter(e => e.status === 'pending');
    const rejected = rosterEntries.filter(e => e.status === 'rejected');

    // 5. Para estudiantes aprobados, obtener last_seen de alias_sessions
    const approvedWithActivity = await Promise.all(
      approved.map(async (student) => {
        if (!student.student_session_id) return student;

        const { data: sessionData } = await serviceClient
          .from('alias_sessions')
          .select('last_seen')
          .eq('class_token', classToken)
          .eq('student_session_id', student.student_session_id)
          .maybeSingle();

        return {
          ...student,
          last_seen: sessionData?.last_seen || null,
        };
      })
    );

    // 6. Calcular estadísticas
    const stats = {
      total_approved: approved.length,
      total_pending: pending.length,
      total_rejected: rejected.length,
      total: rosterEntries.length,
    };

    console.log('[roster/GET] ✅ Roster obtenido:', classToken, stats);

    return NextResponse.json({
      class_token: classToken,
      stats,
      approved: approvedWithActivity,
      pending,
      rejected,
    });

  } catch (error) {
    console.error('[roster/GET] Error inesperado:', (error as Error)?.message ?? error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

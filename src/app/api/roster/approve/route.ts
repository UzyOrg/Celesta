import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const ApproveSchema = z.object({
  request_id: z.number(),
  class_token: z.string(),
});

/**
 * POST /api/roster/approve
 * 
 * Docente aprueba una solicitud de estudiante.
 * Cambia status de 'pending' a 'approved'.
 */
export async function POST(req: Request) {
  try {
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

    // 2. Parsear request
    const body = await req.json();
    const parsed = ApproveSchema.parse(body);

    // 3. Usar service role para la operación
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    // 4. Verificar que la solicitud existe y pertenece al docente
    const { data: request, error: fetchError } = await serviceClient
      .from('student_roster')
      .select('*')
      .eq('id', parsed.request_id)
      .eq('class_token', parsed.class_token)
      .eq('teacher_id', user.id)
      .single();

    if (fetchError || !request) {
      console.error('[roster/approve] Solicitud no encontrada:', fetchError);
      return NextResponse.json({ error: 'request_not_found' }, { status: 404 });
    }

    if (request.status === 'approved') {
      return NextResponse.json({ 
        message: 'Esta solicitud ya fue aprobada',
        student_alias: request.student_alias 
      });
    }

    // 5. Generar session_id si no existe
    const sessionId = request.student_session_id || crypto.randomUUID();

    // 6. Actualizar status a 'approved'
    const { data: updated, error: updateError } = await serviceClient
      .from('student_roster')
      .update({
        status: 'approved',
        student_session_id: sessionId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', parsed.request_id)
      .select()
      .single();

    if (updateError) {
      console.error('[roster/approve] Error aprobando:', updateError);
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }

    // 7. También crear/actualizar en alias_sessions para compatibilidad
    await serviceClient
      .from('alias_sessions')
      .upsert({
        class_token: parsed.class_token,
        student_session_id: sessionId,
        alias: request.student_alias,
        last_seen: new Date().toISOString(),
      }, { 
        onConflict: 'class_token,student_session_id' 
      });

    console.log('[roster/approve] ✅ Aprobado:', request.student_alias, 'en', parsed.class_token);

    return NextResponse.json({ 
      success: true,
      student_alias: updated.student_alias,
      student_session_id: updated.student_session_id
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'invalid_payload', 
        details: error.flatten() 
      }, { status: 400 });
    }
    
    console.error('[roster/approve] Error inesperado:', (error as Error)?.message ?? error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

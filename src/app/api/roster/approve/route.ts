import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { validateCsrfForMutation } from '@/lib/csrf';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

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
 * 
 * SECURITY:
 * - CSRF protection
 * - Rate limit: 20 approvals per minute per teacher
 * - Auth required (teacher only)
 */
export async function POST(req: Request) {
  // SECURITY: Validar CSRF token
  const csrfError = validateCsrfForMutation(req);
  if (csrfError) return csrfError;

  // SECURITY: Rate limiting (20 approvals/min)
  const clientIp = getClientIp(req);
  const { allowed } = checkRateLimit(`roster:approve:${clientIp}`, 20, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Demasiadas solicitudes. Espera un momento.' },
      { status: 429 }
    );
  }

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
      // SECURITY: Log código de error, mensaje genérico al cliente
      console.error('[roster/approve] Request fetch failed:', fetchError?.code || 'not_found');
      return NextResponse.json({ 
        error: 'invalid_request',
        message: 'No se pudo procesar la solicitud.'
      }, { status: 400 });
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
      console.error('[roster/approve] Update failed:', updateError.code);
      return NextResponse.json({ 
        error: 'operation_failed',
        message: 'No se pudo aprobar la solicitud. Intenta de nuevo.'
      }, { status: 500 });
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

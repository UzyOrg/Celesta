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

const RejectSchema = z.object({
  request_id: z.number(),
  class_token: z.string(),
});

/**
 * POST /api/roster/reject
 * 
 * Docente rechaza una solicitud de estudiante.
 * Cambia status de 'pending' a 'rejected'.
 * 
 * SECURITY:
 * - CSRF protection
 * - Rate limit: 20 rejections per minute
 * - Auth required (teacher only)
 */
export async function POST(req: Request) {
  // SECURITY: Validar CSRF token
  const csrfError = validateCsrfForMutation(req);
  if (csrfError) return csrfError;

  // SECURITY: Rate limiting (20/min)
  const clientIp = getClientIp(req);
  const { allowed } = checkRateLimit(`roster:reject:${clientIp}`, 20, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Demasiadas solicitudes.' },
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
    const parsed = RejectSchema.parse(body);

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
      console.error('[roster/reject] Request fetch failed:', fetchError?.code || 'not_found');
      return NextResponse.json({ 
        error: 'invalid_request',
        message: 'No se pudo procesar la solicitud.'
      }, { status: 400 });
    }

    // 5. Actualizar status a 'rejected'
    const { data: updated, error: updateError } = await serviceClient
      .from('student_roster')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
      })
      .eq('id', parsed.request_id)
      .select()
      .single();

    if (updateError) {
      console.error('[roster/reject] Update failed:', updateError.code);
      return NextResponse.json({ 
        error: 'operation_failed',
        message: 'No se pudo rechazar la solicitud. Intenta de nuevo.'
      }, { status: 500 });
    }

    console.log('[roster/reject] ✅ Rechazado:', request.student_alias, 'en', parsed.class_token);

    return NextResponse.json({ 
      success: true,
      student_alias: updated.student_alias
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'invalid_payload', 
        details: error.flatten() 
      }, { status: 400 });
    }
    
    console.error('[roster/reject] Error inesperado:', (error as Error)?.message ?? error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

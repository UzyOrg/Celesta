import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeAlias, sanitizeClassToken } from '@/lib/sanitize';

export const runtime = 'nodejs';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const CheckSchema = z.object({
  class_token: z.string(),
  student_alias: z.string(),
});

/**
 * POST /api/roster/check-status
 * 
 * Verifica el estado de la solicitud de un estudiante.
 * Retorna: 'approved', 'pending', 'rejected', o 'not_found'.
 * 
 * SECURITY:
 * - Rate limit: 10 checks per minute per IP
 * - Alias sanitization
 * - No CSRF (public endpoint)
 */
export async function POST(req: Request) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // SECURITY: Rate limiting (10/min)
  const clientIp = getClientIp(req);
  const { allowed } = checkRateLimit(`roster:check:${clientIp}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Demasiadas consultas. Espera un momento.' },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const parsed = CheckSchema.parse(body);
    
    // SECURITY: Sanitizar inputs
    const alias = sanitizeAlias(parsed.student_alias);
    const classToken = sanitizeClassToken(parsed.class_token);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    // Buscar la entrada del estudiante
    const { data, error } = await supabase
      .from('student_roster')
      .select('status, student_session_id, approved_at, rejected_at')
      .eq('class_token', classToken)
      .eq('student_alias', alias)
      .maybeSingle();

    if (error) {
      console.error('[roster/check-status] Query failed:', error.code);
      return NextResponse.json({ 
        error: 'service_error',
        message: 'No se pudo verificar el estado. Intenta de nuevo.'
      }, { status: 500 });
    }

    if (!data) {
      console.log(`[roster/check-status] NOT_FOUND: token="${classToken}", alias="${alias}"`);
      return NextResponse.json({ 
        status: 'not_found',
        message: 'No hay solicitud para este alias en este grupo.' 
      });
    }
    
    console.log(`[roster/check-status] FOUND: token="${classToken}", alias="${alias}", status="${data.status}"`);

    // Retornar el status
    const response: any = {
      status: data.status,
    };

    if (data.status === 'approved') {
      response.message = '¡Tu solicitud fue aprobada! Ya puedes acceder.';
      response.student_session_id = data.student_session_id;
    } else if (data.status === 'pending') {
      response.message = 'Tu solicitud está esperando aprobación del docente.';
    } else if (data.status === 'rejected') {
      response.message = 'Tu solicitud fue rechazada por el docente.';
    }

    return NextResponse.json(response);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'invalid_payload', 
        details: error.flatten() 
      }, { status: 400 });
    }
    
    console.error('[roster/check-status] Error inesperado:', (error as Error)?.message ?? error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

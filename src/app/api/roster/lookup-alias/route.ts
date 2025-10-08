import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeClassToken } from '@/lib/sanitize';

export const runtime = 'nodejs';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const RequestSchema = z.object({
  class_token: z.string().min(1),
  student_session_id: z.string().min(1),
});

/**
 * POST /api/roster/lookup-alias
 * 
 * Busca el alias de un estudiante por su session_id.
 * 
 * SECURITY:
 * - Rate limit: 30 lookups per minute per IP
 * - Class token sanitization
 * - Generic error messages
 */
export async function POST(req: Request) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // SECURITY: Rate limiting (30/min)
  const clientIp = getClientIp(req);
  const { allowed } = checkRateLimit(`roster:lookup:${clientIp}`, 30, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Demasiadas consultas.' },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { class_token, student_session_id } = RequestSchema.parse(body);
    
    // SECURITY: Sanitizar class_token
    const classToken = sanitizeClassToken(class_token);

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data, error } = await supabase
      .from('alias_sessions')
      .select('alias')
      .eq('class_token', classToken)
      .eq('student_session_id', student_session_id)
      .limit(1);

    if (error) {
      // SECURITY: Log código, mensaje genérico
      console.error('[roster/lookup-alias] Query failed:', error.code);
      return NextResponse.json({ 
        error: 'service_error',
        message: 'No se pudo obtener el alias.'
      }, { status: 500 });
    }

    const alias = Array.isArray(data) && data.length > 0 ? data[0]?.alias ?? null : null;
    return NextResponse.json({ alias });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'invalid_payload', details: error.flatten() }, { status: 400 });
    }
    console.error('[roster/lookup-alias] Unexpected error:', (error as Error)?.message ?? error);
    return NextResponse.json({ 
      error: 'service_error',
      message: 'Error al procesar la solicitud.'
    }, { status: 500 });
  }
}

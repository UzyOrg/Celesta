import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeAlias, validateAlias, sanitizeClassToken } from '@/lib/sanitize';

export const runtime = 'nodejs';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const RequestSchema = z.object({
  class_token: z.string().min(1),
  student_alias: z.string().min(1).max(64),
});

/**
 * POST /api/roster/request
 * 
 * Estudiante solicita ingreso a un grupo.
 * Crea una entrada en student_roster con status='pending'.
 * 
 * SECURITY:
 * - Rate limit: 5 requests per minute per IP
 * - Alias sanitization: XSS prevention
 * - Generic error messages: Information leakage prevention
 */
export async function POST(req: Request) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // SECURITY: Rate limiting (5 requests/min per IP)
  const clientIp = getClientIp(req);
  const { allowed, remaining, resetAt } = checkRateLimit(
    `roster:request:${clientIp}`, 
    5,  // 5 requests max
    60_000  // per 60 seconds
  );

  if (!allowed) {
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { 
        error: 'rate_limited',
        message: 'Demasiadas solicitudes. Por favor espera un momento e intenta de nuevo.',
        retry_after: retryAfter
      },
      { 
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetAt.toString()
        }
      }
    );
  }

  try {
    const body = await req.json();
    const parsed = RequestSchema.parse(body);
    
    // SECURITY: Sanitizar alias (prevenir XSS)
    const alias = sanitizeAlias(parsed.student_alias);
    
    // SECURITY: Sanitizar class_token
    const classToken = sanitizeClassToken(parsed.class_token);

    if (alias.length === 0) {
      return NextResponse.json({ error: 'alias_empty' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, { 
      auth: { persistSession: false } 
    });

    // SECURITY: Validar alias
    const validation = validateAlias(alias);
    if (!validation.valid) {
      return NextResponse.json({ 
        error: 'invalid_alias',
        message: validation.error 
      }, { status: 400 });
    }

    // 1. Verificar que el class_token existe en class_assignments
    const { data: classAssignment, error: tokenError } = await supabase
      .from('class_assignments')
      .select('class_token, teacher_id')
      .eq('class_token', classToken)
      .eq('is_active', true)
      .maybeSingle();

    if (tokenError || !classAssignment) {
      // SECURITY: Log con código de error (no detalles) + mensaje genérico al cliente
      console.error('[roster/request] Token verification failed:', tokenError?.code || 'not_found');
      return NextResponse.json({ 
        error: 'invalid_request',
        message: 'El código de grupo no es válido o ha expirado.'
      }, { status: 400 }); // 400 en vez de 404 para no revelar existencia
    }

    // 2. Verificar si ya existe una solicitud para este alias
    const { data: existing, error: checkError } = await supabase
      .from('student_roster')
      .select('id, status')
      .eq('class_token', classToken)
      .eq('student_alias', alias)
      .maybeSingle();

    if (checkError) {
      console.error('[roster/request] Error verificando existencia:', checkError);
      return NextResponse.json({ error: 'check_failed' }, { status: 500 });
    }

    if (existing) {
      // Ya existe una solicitud
      if (existing.status === 'pending') {
        return NextResponse.json({ 
          status: 'pending',
          message: 'Tu solicitud ya fue enviada. Esperando aprobación del docente.' 
        });
      }
      if (existing.status === 'approved') {
        return NextResponse.json({ 
          status: 'approved',
          message: 'Ya estás aprobado en este grupo.' 
        });
      }
      if (existing.status === 'rejected') {
        return NextResponse.json({ 
          status: 'rejected',
          message: 'Tu solicitud fue rechazada por el docente.' 
        }, { status: 403 });
      }
    }

    // 3. Crear nueva solicitud
    const { data: newRequest, error: insertError } = await supabase
      .from('student_roster')
      .insert({
        class_token: classToken,
        teacher_id: classAssignment.teacher_id,
        student_alias: alias,
        status: 'pending',
        student_session_id: null,  // Se asignará después de aprobación
      })
      .select()
      .single();

    if (insertError) {
      // SECURITY: Log código de error, no detalles
      console.error('[roster/request] Insert failed:', insertError.code);
      
      // Manejar error de duplicado
      if (insertError.code === '23505') {  // unique_violation
        return NextResponse.json({ 
          error: 'alias_taken',
          message: 'Este alias ya está en uso en este grupo.' 
        }, { status: 409 });
      }
      
      return NextResponse.json({ 
        error: 'request_failed',
        message: 'No se pudo procesar tu solicitud. Intenta de nuevo.'
      }, { status: 500 });
    }

    console.log('[roster/request] ✅ Request created:', classToken, '(alias sanitized)');

    return NextResponse.json({ 
      status: 'pending',
      message: 'Solicitud enviada. Esperando aprobación del docente.',
      request_id: newRequest.id
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'invalid_payload', 
        details: error.flatten() 
      }, { status: 400 });
    }
    
    console.error('[roster/request] Error inesperado:', (error as Error)?.message ?? error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

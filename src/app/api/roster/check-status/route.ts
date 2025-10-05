import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

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
 * Esta API NO requiere autenticación (estudiantes anónimos).
 */
export async function POST(req: Request) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const parsed = CheckSchema.parse(body);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    // Buscar la entrada del estudiante
    const { data, error } = await supabase
      .from('student_roster')
      .select('status, student_session_id, approved_at, rejected_at')
      .eq('class_token', parsed.class_token)
      .eq('student_alias', parsed.student_alias)
      .maybeSingle();

    if (error) {
      console.error('[roster/check-status] Error:', error);
      return NextResponse.json({ error: 'check_failed' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ 
        status: 'not_found',
        message: 'No hay solicitud para este alias en este grupo.' 
      });
    }

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

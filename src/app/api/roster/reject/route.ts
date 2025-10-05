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

const RejectSchema = z.object({
  request_id: z.number(),
  class_token: z.string(),
});

/**
 * POST /api/roster/reject
 * 
 * Docente rechaza una solicitud de estudiante.
 * Cambia status de 'pending' a 'rejected'.
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
      console.error('[roster/reject] Solicitud no encontrada:', fetchError);
      return NextResponse.json({ error: 'request_not_found' }, { status: 404 });
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
      console.error('[roster/reject] Error rechazando:', updateError);
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
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

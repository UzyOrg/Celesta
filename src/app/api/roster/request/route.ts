import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

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
 */
export async function POST(req: Request) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const parsed = RequestSchema.parse(body);
    const alias = parsed.student_alias.trim();

    if (alias.length === 0) {
      return NextResponse.json({ error: 'alias_empty' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, { 
      auth: { persistSession: false } 
    });

    // 1. Verificar que el class_token existe
    const { data: classToken, error: tokenError } = await supabase
      .from('class_tokens')
      .select('token, teacher_id')
      .eq('token', parsed.class_token)
      .single();

    if (tokenError || !classToken) {
      console.error('[roster/request] Token no encontrado:', parsed.class_token);
      return NextResponse.json({ error: 'invalid_token' }, { status: 404 });
    }

    // 2. Verificar si ya existe una solicitud para este alias
    const { data: existing, error: checkError } = await supabase
      .from('student_roster')
      .select('id, status')
      .eq('class_token', parsed.class_token)
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
        class_token: parsed.class_token,
        teacher_id: classToken.teacher_id,
        student_alias: alias,
        status: 'pending',
        student_session_id: null,  // Se asignará después de aprobación
      })
      .select()
      .single();

    if (insertError) {
      console.error('[roster/request] Error creando solicitud:', insertError);
      
      // Manejar error de duplicado
      if (insertError.code === '23505') {  // unique_violation
        return NextResponse.json({ 
          error: 'alias_taken',
          message: 'Este alias ya está en uso en este grupo.' 
        }, { status: 409 });
      }
      
      return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
    }

    console.log('[roster/request] ✅ Solicitud creada:', alias, 'para', parsed.class_token);

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

import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

export const runtime = 'nodejs';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validación del payload
const RequestGroupSchema = z.object({
  groupName: z.string().min(1, 'El nombre del grupo es requerido').max(100),
  workshopId: z.string().optional(),
  notes: z.string().max(500).optional(),
});

/**
 * POST /api/groups/request
 * Endpoint para que los docentes soliciten la creación de un nuevo grupo.
 * No crea el grupo directamente - envía una notificación para procesamiento manual.
 */
export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  try {
    // 1. Autenticar al docente
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // No-op for POST
        },
        remove(name: string, options: CookieOptions) {
          // No-op for POST
        },
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[request_group] Not authenticated');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Validar payload
    const body = await request.json();
    const validation = RequestGroupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { groupName, workshopId, notes } = validation.data;

    // 3. Obtener info del docente
    const { data: teacherProfile } = await supabase
      .from('teachers')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const teacherName = teacherProfile?.full_name || user.email?.split('@')[0] || 'Docente';

    console.log('[request_group] ✅ New group request:', {
      teacher: user.email,
      groupName,
      workshopId: workshopId || 'No especificado',
    });

    // 4. Enviar notificación interna
    await sendNotification({
      teacherEmail: user.email!,
      teacherName,
      teacherId: user.id,
      groupName,
      workshopId: workshopId || 'No especificado',
      notes: notes || 'Sin notas adicionales',
    });

    return NextResponse.json({
      success: true,
      message: '¡Solicitud enviada! Te notificaremos cuando tu grupo esté listo.',
    });
  } catch (error) {
    console.error('[request_group] ❌ Exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Envía una notificación interna cuando se solicita un nuevo grupo.
 * En el futuro, esto podría integrarse con Slack, SendGrid, etc.
 */
async function sendNotification(data: {
  teacherEmail: string;
  teacherName: string;
  teacherId: string;
  groupName: string;
  workshopId: string;
  notes: string;
}) {
  const { teacherEmail, teacherName, teacherId, groupName, workshopId, notes } = data;

  // Por ahora, usar el mismo sistema de email que el botón anterior
  // En el futuro, esto puede ser:
  // - Un webhook a Slack
  // - Un email a través de SendGrid/Resend
  // - Una entrada en una tabla de "pending_requests" en Supabase

  const emailBody = `
Nueva Solicitud de Grupo - Celesta
====================================

DOCENTE:
- Nombre: ${teacherName}
- Email: ${teacherEmail}
- ID: ${teacherId}

DETALLES DEL GRUPO:
- Nombre del Grupo: ${groupName}
- Taller Asignado: ${workshopId}
- Notas: ${notes}

ACCIÓN REQUERIDA:
1. Crear el grupo en Supabase:
   INSERT INTO public.class_assignments (class_token, assigned_workshop_id, teacher_id, is_active)
   VALUES ('GENERAR-TOKEN', '${workshopId}', '${teacherId}', true);

2. Notificar al docente que su grupo está listo.

====================================
Generado automáticamente por Celesta
  `.trim();

  console.log('[request_group] 📧 Notification to send:');
  console.log(emailBody);

  // TODO: Integrar con servicio de email real o Slack webhook
  // Por ahora, solo loguear. El equipo recibirá esto en los logs de Vercel.

  return { success: true };
}

'use server';

// ============================================================================
// SERVER ACTIONS: Asignación de Talleres a Grupos
// ============================================================================

import { revalidatePath, revalidateTag } from 'next/cache';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  assignTalleresToGroup,
  unassignTallerFromGroup,
  reorderGroupTalleres,
} from '@/lib/supabase/biblioteca';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ============================================================================
// HELPER: Obtener teacher_id del usuario autenticado
// ============================================================================

async function getCurrentTeacherId(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set() {},
      remove() {},
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: teacher } = await supabase
    .from('teachers')
    .select('id')
    .eq('id', user.id)
    .single();

  return teacher?.id || null;
}

// ============================================================================
// ACTIONS: ASIGNACIÓN DE TALLERES
// ============================================================================

export async function assignWorkshopsAction(groupId: string, tallerIds: string[]) {
  try {
    const teacherId = await getCurrentTeacherId();
    if (!teacherId) {
      return { success: false, error: 'No autenticado' };
    }

    if (!tallerIds || tallerIds.length === 0) {
      return { success: false, error: 'Debe seleccionar al menos un taller' };
    }

    const result = await assignTalleresToGroup({
      groupId,
      tallerIds,
      teacherId,
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    // Revalidar grupo
    revalidateTag(`group:${groupId}:talleres`);
    revalidatePath(`/dashboard/grupos/${groupId}`);
    revalidatePath('/dashboard/grupos');

    return { success: true };
  } catch (error) {
    console.error('[assignWorkshopsAction] Error:', error);
    return { success: false, error: 'Error al asignar talleres' };
  }
}

export async function unassignWorkshopAction(groupId: string, tallerId: string) {
  try {
    const teacherId = await getCurrentTeacherId();
    if (!teacherId) {
      return { success: false, error: 'No autenticado' };
    }

    const result = await unassignTallerFromGroup({
      groupId,
      tallerId,
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    // Revalidar grupo
    revalidateTag(`group:${groupId}:talleres`);
    revalidatePath(`/dashboard/grupos/${groupId}`);
    revalidatePath('/dashboard/grupos');

    return { success: true };
  } catch (error) {
    console.error('[unassignWorkshopAction] Error:', error);
    return { success: false, error: 'Error al desasignar taller' };
  }
}

export async function reorderWorkshopsAction(groupId: string, tallerIds: string[]) {
  try {
    const teacherId = await getCurrentTeacherId();
    if (!teacherId) {
      return { success: false, error: 'No autenticado' };
    }

    const result = await reorderGroupTalleres({
      groupId,
      tallerIds,
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    // Revalidar grupo
    revalidateTag(`group:${groupId}:talleres`);
    revalidatePath(`/dashboard/grupos/${groupId}`);

    return { success: true };
  } catch (error) {
    console.error('[reorderWorkshopsAction] Error:', error);
    return { success: false, error: 'Error al reordenar talleres' };
  }
}

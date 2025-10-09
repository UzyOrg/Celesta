'use server';

// ============================================================================
// SERVER ACTIONS: Biblioteca y Talleres
// ============================================================================

import { revalidatePath, revalidateTag } from 'next/cache';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  createTaller,
  updateTaller,
  deleteTaller,
  addToLibrary,
  removeFromLibrary,
} from '@/lib/supabase/biblioteca';
import type { CreateTallerInput, UpdateTallerInput } from '@/types/biblioteca';

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

  // Obtener teacher_id desde la tabla teachers
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id')
    .eq('id', user.id)
    .single();

  return teacher?.id || null;
}

// ============================================================================
// ACTIONS: GESTIÓN DE TALLERES
// ============================================================================

export async function createTallerAction(input: CreateTallerInput) {
  try {
    const teacherId = await getCurrentTeacherId();
    if (!teacherId) {
      return { success: false, error: 'No autenticado' };
    }

    const result = await createTaller({ teacherId, input });
    
    if (result.error) {
      return { success: false, error: result.error.message };
    }

    // Revalidar biblioteca
    revalidateTag(`teacher:${teacherId}:library`);
    revalidatePath('/dashboard/biblioteca');

    return { success: true, data: result.data };
  } catch (error) {
    console.error('[createTallerAction] Error:', error);
    return { success: false, error: 'Error al crear taller' };
  }
}

export async function updateTallerAction(tallerId: string, input: UpdateTallerInput) {
  try {
    const teacherId = await getCurrentTeacherId();
    if (!teacherId) {
      return { success: false, error: 'No autenticado' };
    }

    const result = await updateTaller({ tallerId, input });
    
    if (result.error) {
      return { success: false, error: result.error.message };
    }

    // Revalidar biblioteca y grupos que usen este taller
    revalidateTag(`teacher:${teacherId}:library`);
    revalidateTag(`taller:${tallerId}`);
    revalidatePath('/dashboard/biblioteca');

    return { success: true };
  } catch (error) {
    console.error('[updateTallerAction] Error:', error);
    return { success: false, error: 'Error al actualizar taller' };
  }
}

export async function deleteTallerAction(tallerId: string) {
  try {
    const teacherId = await getCurrentTeacherId();
    if (!teacherId) {
      return { success: false, error: 'No autenticado' };
    }

    const result = await deleteTaller({ tallerId });
    
    if (result.error) {
      return { success: false, error: result.error.message };
    }

    // Revalidar biblioteca
    revalidateTag(`teacher:${teacherId}:library`);
    revalidatePath('/dashboard/biblioteca');

    return { success: true };
  } catch (error) {
    console.error('[deleteTallerAction] Error:', error);
    return { success: false, error: 'Error al eliminar taller' };
  }
}

export async function addToLibraryAction(tallerId: string, notasPersonales?: string) {
  try {
    const teacherId = await getCurrentTeacherId();
    if (!teacherId) {
      return { success: false, error: 'No autenticado' };
    }

    const result = await addToLibrary({ teacherId, tallerId, notasPersonales });
    
    if (result.error) {
      return { success: false, error: result.error.message };
    }

    // Revalidar biblioteca
    revalidateTag(`teacher:${teacherId}:library`);
    revalidatePath('/dashboard/biblioteca');

    return { success: true };
  } catch (error) {
    console.error('[addToLibraryAction] Error:', error);
    return { success: false, error: 'Error al añadir a biblioteca' };
  }
}

export async function removeFromLibraryAction(tallerId: string) {
  try {
    const teacherId = await getCurrentTeacherId();
    if (!teacherId) {
      return { success: false, error: 'No autenticado' };
    }

    const result = await removeFromLibrary({ teacherId, tallerId });
    
    if (result.error) {
      return { success: false, error: result.error.message };
    }

    // Revalidar biblioteca
    revalidateTag(`teacher:${teacherId}:library`);
    revalidatePath('/dashboard/biblioteca');

    return { success: true };
  } catch (error) {
    console.error('[removeFromLibraryAction] Error:', error);
    return { success: false, error: 'Error al eliminar de biblioteca' };
  }
}

// ============================================================================
// BIBLIOTECA: Funciones de acceso a datos para talleres y biblioteca
// ============================================================================

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { 
  Taller, 
  DocenteBiblioteca, 
  GrupoTaller,
  CreateTallerInput,
  UpdateTallerInput,
  TallerWithStats
} from '@/types/biblioteca';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ============================================================================
// HELPER: Crear cliente de Supabase en servidor
// ============================================================================

async function getServerClient() {
  const cookieStore = await cookies();
  
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        cookieStore.set(name, value, options);
      },
      remove(name: string, options: any) {
        cookieStore.delete(name);
      },
    },
  });
}

// ============================================================================
// BIBLIOTECA DEL DOCENTE
// ============================================================================

/**
 * Obtiene la biblioteca personal del docente con búsqueda y paginación
 */
export async function getTeacherLibrary(params: {
  teacherId: string;
  query?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: TallerWithStats[] | null; error: any }> {
  const { teacherId, query = '', limit = 50, offset = 0 } = params;
  
  try {
    const supabase = await getServerClient();
    
    let queryBuilder = supabase
      .from('docente_biblioteca')
      .select(`
        *,
        talleres (
          id,
          nombre,
          descripcion,
          contenido_json,
          etiquetas,
          es_publico,
          owner_teacher_id,
          created_at,
          updated_at
        )
      `)
      .eq('teacher_id', teacherId);
    
    // Filtro de búsqueda por nombre
    if (query.trim()) {
      queryBuilder = queryBuilder.ilike('talleres.nombre', `%${query}%`);
    }
    
    queryBuilder = queryBuilder
      .order('agregado_en', { ascending: false })
      .range(offset, offset + limit - 1);
    
    const { data, error } = await queryBuilder;
    
    if (error) {
      console.error('[getTeacherLibrary] Error:', error);
      return { data: null, error };
    }
    
    // Transformar y añadir stats
    const talleres = await Promise.all(
      (data || []).map(async (item: any) => {
        const taller = item.talleres;
        if (!taller) return null;
        
        // Contar en cuántos grupos está asignado este taller
        const { count } = await supabase
          .from('grupo_talleres')
          .select('*', { count: 'exact', head: true })
          .eq('taller_id', taller.id);
        
        return {
          ...taller,
          grupos_count: count || 0,
          en_biblioteca: true,
        } as TallerWithStats;
      })
    );
    
    return { data: talleres.filter(Boolean) as TallerWithStats[], error: null };
  } catch (error) {
    console.error('[getTeacherLibrary] Exception:', error);
    return { data: null, error };
  }
}

/**
 * Añade un taller a la biblioteca del docente
 */
export async function addToLibrary(params: {
  teacherId: string;
  tallerId: string;
  notasPersonales?: string;
}): Promise<{ success: boolean; error?: any }> {
  const { teacherId, tallerId, notasPersonales } = params;
  
  try {
    const supabase = await getServerClient();
    
    const { error } = await supabase
      .from('docente_biblioteca')
      .insert({
        teacher_id: teacherId,
        taller_id: tallerId,
        notas_personales: notasPersonales || null,
      });
    
    if (error) {
      console.error('[addToLibrary] Error:', error);
      return { success: false, error };
    }
    
    return { success: true };
  } catch (error) {
    console.error('[addToLibrary] Exception:', error);
    return { success: false, error };
  }
}

/**
 * Elimina un taller de la biblioteca del docente
 */
export async function removeFromLibrary(params: {
  teacherId: string;
  tallerId: string;
}): Promise<{ success: boolean; error?: any }> {
  const { teacherId, tallerId } = params;
  
  try {
    const supabase = await getServerClient();
    
    const { error } = await supabase
      .from('docente_biblioteca')
      .delete()
      .eq('teacher_id', teacherId)
      .eq('taller_id', tallerId);
    
    if (error) {
      console.error('[removeFromLibrary] Error:', error);
      return { success: false, error };
    }
    
    return { success: true };
  } catch (error) {
    console.error('[removeFromLibrary] Exception:', error);
    return { success: false, error };
  }
}

// ============================================================================
// GESTIÓN DE TALLERES
// ============================================================================

/**
 * Crea un nuevo taller
 */
export async function createTaller(params: {
  teacherId: string;
  input: CreateTallerInput;
}): Promise<{ data: Taller | null; error?: any }> {
  const { teacherId, input } = params;
  
  try {
    const supabase = await getServerClient();
    
    const { data, error } = await supabase
      .from('talleres')
      .insert({
        owner_teacher_id: teacherId,
        nombre: input.nombre,
        descripcion: input.descripcion || null,
        contenido_json: input.contenido_json || {},
        etiquetas: input.etiquetas || [],
        es_publico: input.es_publico || false,
      })
      .select()
      .single();
    
    if (error) {
      console.error('[createTaller] Error:', error);
      return { data: null, error };
    }
    
    return { data: data as Taller };
  } catch (error) {
    console.error('[createTaller] Exception:', error);
    return { data: null, error };
  }
}

/**
 * Actualiza un taller existente
 */
export async function updateTaller(params: {
  tallerId: string;
  input: UpdateTallerInput;
}): Promise<{ success: boolean; error?: any }> {
  const { tallerId, input } = params;
  
  try {
    const supabase = await getServerClient();
    
    const { error } = await supabase
      .from('talleres')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tallerId);
    
    if (error) {
      console.error('[updateTaller] Error:', error);
      return { success: false, error };
    }
    
    return { success: true };
  } catch (error) {
    console.error('[updateTaller] Exception:', error);
    return { success: false, error };
  }
}

/**
 * Elimina un taller (solo si es owner y no está asignado a grupos)
 */
export async function deleteTaller(params: {
  tallerId: string;
}): Promise<{ success: boolean; error?: any }> {
  const { tallerId } = params;
  
  try {
    const supabase = await getServerClient();
    
    // Verificar que no esté asignado a ningún grupo
    const { count } = await supabase
      .from('grupo_talleres')
      .select('*', { count: 'exact', head: true })
      .eq('taller_id', tallerId);
    
    if (count && count > 0) {
      return { 
        success: false, 
        error: { message: 'No se puede eliminar un taller asignado a grupos' } 
      };
    }
    
    const { error } = await supabase
      .from('talleres')
      .delete()
      .eq('id', tallerId);
    
    if (error) {
      console.error('[deleteTaller] Error:', error);
      return { success: false, error };
    }
    
    return { success: true };
  } catch (error) {
    console.error('[deleteTaller] Exception:', error);
    return { success: false, error };
  }
}

// ============================================================================
// ASIGNACIÓN DE TALLERES A GRUPOS
// ============================================================================

/**
 * Lista talleres asignados a un grupo
 */
export async function getGroupTalleres(params: {
  groupId: string;
}): Promise<{ data: GrupoTaller[] | null; error?: any }> {
  const { groupId } = params;
  
  try {
    const supabase = await getServerClient();
    
    const { data, error } = await supabase
      .from('grupo_talleres')
      .select(`
        *,
        talleres (
          id,
          nombre,
          descripcion,
          contenido_json,
          etiquetas,
          es_publico,
          owner_teacher_id,
          created_at,
          updated_at
        )
      `)
      .eq('group_id', groupId)
      .order('position', { ascending: true });
    
    if (error) {
      console.error('[getGroupTalleres] Error:', error);
      return { data: null, error };
    }
    
    return { data: data as GrupoTaller[], error: null };
  } catch (error) {
    console.error('[getGroupTalleres] Exception:', error);
    return { data: null, error };
  }
}

/**
 * Asigna múltiples talleres a un grupo
 */
export async function assignTalleresToGroup(params: {
  groupId: string;
  tallerIds: string[];
  teacherId: string;
}): Promise<{ success: boolean; error?: any }> {
  const { groupId, tallerIds, teacherId } = params;
  
  try {
    const supabase = await getServerClient();
    
    // Obtener la posición máxima actual
    const { data: maxPos } = await supabase
      .from('grupo_talleres')
      .select('position')
      .eq('group_id', groupId)
      .order('position', { ascending: false })
      .limit(1)
      .single();
    
    let nextPosition = (maxPos?.position || -1) + 1;
    
    // Insertar talleres con posiciones incrementales
    const insertData = tallerIds.map((tallerId) => ({
      group_id: groupId,
      taller_id: tallerId,
      assigned_by_teacher_id: teacherId,
      position: nextPosition++,
    }));
    
    const { error } = await supabase
      .from('grupo_talleres')
      .upsert(insertData, {
        onConflict: 'group_id,taller_id',
        ignoreDuplicates: false,
      });
    
    if (error) {
      console.error('[assignTalleresToGroup] Error:', error);
      return { success: false, error };
    }
    
    return { success: true };
  } catch (error) {
    console.error('[assignTalleresToGroup] Exception:', error);
    return { success: false, error };
  }
}

/**
 * Desasigna un taller de un grupo
 */
export async function unassignTallerFromGroup(params: {
  groupId: string;
  tallerId: string;
}): Promise<{ success: boolean; error?: any }> {
  const { groupId, tallerId } = params;
  
  try {
    const supabase = await getServerClient();
    
    const { error } = await supabase
      .from('grupo_talleres')
      .delete()
      .eq('group_id', groupId)
      .eq('taller_id', tallerId);
    
    if (error) {
      console.error('[unassignTallerFromGroup] Error:', error);
      return { success: false, error };
    }
    
    return { success: true };
  } catch (error) {
    console.error('[unassignTallerFromGroup] Exception:', error);
    return { success: false, error };
  }
}

/**
 * Reordena talleres en un grupo
 */
export async function reorderGroupTalleres(params: {
  groupId: string;
  tallerIds: string[]; // Array ordenado de IDs
}): Promise<{ success: boolean; error?: any }> {
  const { groupId, tallerIds } = params;
  
  try {
    const supabase = await getServerClient();
    
    // Actualizar posiciones
    const updates = tallerIds.map((tallerId, index) =>
      supabase
        .from('grupo_talleres')
        .update({ position: index })
        .eq('group_id', groupId)
        .eq('taller_id', tallerId)
    );
    
    await Promise.all(updates);
    
    return { success: true };
  } catch (error) {
    console.error('[reorderGroupTalleres] Exception:', error);
    return { success: false, error };
  }
}

// ============================================================================
// TALLERES: Gestión unificada de talleres (oficiales + personalizados)
// ============================================================================

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
// TIPOS
// ============================================================================

export interface TallerMetadata {
  id: string;
  nombre: string;
  descripcion: string | null;
  etiquetas: string[];
  es_publico: boolean;
  owner_teacher_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TallerCompleto extends TallerMetadata {
  contenido: any; // El JSON completo del taller
}

// ============================================================================
// FUNCIÓN PRINCIPAL: Obtener contenido de un taller
// ============================================================================

/**
 * Arquitectura Híbrida:
 * 
 * 1. TALLERES OFICIALES (curados):
 *    - contenido_json = {"file": "/workshops/BIO-001.json"}
 *    - Se cargan desde archivos estáticos (versionados en git)
 *    - owner_teacher_id = NULL
 * 
 * 2. TALLERES PERSONALIZADOS (generados/editados):
 *    - contenido_json = {objeto JSON completo del taller}
 *    - Se guardan directamente en la base de datos
 *    - owner_teacher_id = UUID del docente
 */
export async function getTallerContent(tallerId: string): Promise<{
  data: TallerCompleto | null;
  error: any;
}> {
  try {
    const supabase = await getServerClient();
    
    // 1. Obtener metadata del taller desde DB
    const { data: taller, error } = await supabase
      .from('talleres')
      .select('*')
      .eq('id', tallerId)
      .single();
    
    if (error || !taller) {
      console.error('[getTallerContent] Error fetching taller:', error);
      return { data: null, error };
    }
    
    // 2. Determinar si es oficial (archivo) o personalizado (DB)
    const contenidoJson = taller.contenido_json;
    
    // Caso 1: Taller oficial con referencia a archivo
    if (contenidoJson && typeof contenidoJson === 'object' && 'file' in contenidoJson) {
      const fileUrl = contenidoJson.file as string;
      
      try {
        // Cargar desde archivo estático (en producción sería desde tu dominio)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const fullUrl = `${baseUrl}${fileUrl}`;
        
        const res = await fetch(fullUrl, { cache: 'no-store' });
        
        if (!res.ok) {
          throw new Error(`Failed to fetch workshop file: ${res.status}`);
        }
        
        const contenido = await res.json();
        
        return {
          data: {
            ...taller,
            contenido,
          },
          error: null,
        };
      } catch (fetchError) {
        console.error('[getTallerContent] Error loading workshop file:', fetchError);
        return { data: null, error: fetchError };
      }
    }
    
    // Caso 2: Taller personalizado con contenido completo en DB
    return {
      data: {
        ...taller,
        contenido: contenidoJson,
      },
      error: null,
    };
    
  } catch (error) {
    console.error('[getTallerContent] Exception:', error);
    return { data: null, error };
  }
}

// ============================================================================
// FUNCIÓN: Listar talleres disponibles
// ============================================================================

export async function listarTalleres(params?: {
  esPublico?: boolean;
  ownerId?: string;
}): Promise<{
  data: TallerMetadata[] | null;
  error: any;
}> {
  try {
    const supabase = await getServerClient();
    
    let query = supabase
      .from('talleres')
      .select('id, nombre, descripcion, etiquetas, es_publico, owner_teacher_id, created_at, updated_at')
      .order('created_at', { ascending: false });
    
    if (params?.esPublico !== undefined) {
      query = query.eq('es_publico', params.esPublico);
    }
    
    if (params?.ownerId) {
      query = query.eq('owner_teacher_id', params.ownerId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('[listarTalleres] Error:', error);
      return { data: null, error };
    }
    
    return { data: data as TallerMetadata[], error: null };
    
  } catch (error) {
    console.error('[listarTalleres] Exception:', error);
    return { data: null, error };
  }
}

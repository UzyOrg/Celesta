import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getTeacherLibrary } from '@/lib/supabase/biblioteca';

export const runtime = 'nodejs';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * GET /api/library
 * Obtiene la biblioteca personal del docente + talleres oficiales públicos
 * Query params: q (búsqueda), limit, offset
 */
export async function GET(request: Request) {
  try {
    // 1. Autenticar docente
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Obtener teacher_id
    const { data: teacher } = await supabase
      .from('teachers')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    // 3. Parse query params
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 4. Fetch biblioteca personal
    const { data: libraryData, error: libraryError } = await getTeacherLibrary({
      teacherId: teacher.id,
      query,
      limit,
      offset,
    });

    if (libraryError) {
      console.error('[GET /api/library] Error fetching library:', libraryError);
    }

    // 5. Fetch talleres oficiales públicos (owner=NULL y es_publico=true)
    let officialTalleres: any[] = [];
    try {
      let officialQuery = supabase
        .from('talleres')
        .select('id, nombre, descripcion, contenido_json, etiquetas, es_publico, owner_teacher_id, created_at, updated_at')
        .is('owner_teacher_id', null)
        .eq('es_publico', true);

      // Aplicar búsqueda si existe
      if (query.trim()) {
        officialQuery = officialQuery.ilike('nombre', `%${query}%`);
      }

      const { data: officialData, error: officialError } = await officialQuery;

      if (officialError) {
        console.error('[GET /api/library] Error fetching official talleres:', officialError);
      } else {
        // Calcular grupos_count para talleres oficiales
        officialTalleres = await Promise.all(
          (officialData || []).map(async (taller) => {
            const { count } = await supabase
              .from('grupo_talleres')
              .select('*', { count: 'exact', head: true })
              .eq('taller_id', taller.id);

            return {
              ...taller,
              grupos_count: count || 0,
              en_biblioteca: false, // Marcar como no en biblioteca personal
            };
          })
        );
      }
    } catch (error) {
      console.error('[GET /api/library] Exception fetching official talleres:', error);
    }

    // 6. Combinar y eliminar duplicados
    const libraryItems = libraryData || [];
    const libraryIds = new Set(libraryItems.map(t => t.id));
    
    // Añadir talleres oficiales que NO están en biblioteca personal
    const uniqueOfficialTalleres = officialTalleres.filter(t => !libraryIds.has(t.id));
    
    const combinedItems = [...libraryItems, ...uniqueOfficialTalleres];

    return NextResponse.json({
      items: combinedItems,
      total: combinedItems.length,
      query,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[GET /api/library] Exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

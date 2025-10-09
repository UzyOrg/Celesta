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
 * Obtiene la biblioteca personal del docente autenticado
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

    // 4. Fetch biblioteca
    const { data, error } = await getTeacherLibrary({
      teacherId: teacher.id,
      query,
      limit,
      offset,
    });

    if (error) {
      console.error('[GET /api/library] Error:', error);
      return NextResponse.json(
        { error: 'Error al obtener biblioteca' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      items: data || [],
      total: data?.length || 0,
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

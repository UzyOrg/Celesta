import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getGroupTalleres } from '@/lib/supabase/biblioteca';

export const runtime = 'nodejs';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;

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

    // Verificar que el grupo pertenece al docente
    const { data: group } = await supabase
      .from('class_assignments')
      .select('id, teacher_id')
      .eq('id', groupId)
      .single();

    if (!group || group.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Obtener talleres asignados
    const { data: talleres, error } = await getGroupTalleres({ groupId });

    if (error) {
      console.error('[GET /api/groups/[groupId]/talleres] Error:', error);
      return NextResponse.json({ error: 'Error fetching talleres' }, { status: 500 });
    }

    return NextResponse.json({ talleres: talleres || [] });
  } catch (error) {
    console.error('[GET /api/groups/[groupId]/talleres] Exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

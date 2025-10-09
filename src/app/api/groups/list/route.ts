import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  try {
    // Create Supabase SSR client with proper cookie handling
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // No-op for GET requests
        },
        remove(name: string, options: CookieOptions) {
          // No-op for GET requests
        },
      },
    });
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Unauthorized'
      }, { status: 401 });
    }
    
    // Fetch groups filtered by teacher_id
    // RLS policy will also enforce this, but we add explicit filter
    const { data, error } = await supabase
      .from('class_assignments')
      .select('id, class_token, is_active, created_at, updated_at, teacher_id')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Enriquecer con conteo de talleres asignados
    const groupsWithCounts = await Promise.all(
      (data || []).map(async (group) => {
        const { count } = await supabase
          .from('grupo_talleres')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', group.id);
        
        return {
          ...group,
          talleres_count: count || 0,
        };
      })
    );

    return NextResponse.json({ groups: groupsWithCounts });
  } catch (error) {
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

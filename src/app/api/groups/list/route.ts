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
      console.error('[list_groups] Auth error:', authError?.message || 'No user');
      console.error('[list_groups] Cookies present:', cookieStore.getAll().map(c => c.name));
      return NextResponse.json({ 
        error: 'Unauthorized',
        debug: process.env.NODE_ENV === 'development' ? {
          message: authError?.message || 'No user found',
          cookiesCount: cookieStore.getAll().length
        } : undefined
      }, { status: 401 });
    }
    
    console.log('[list_groups] Fetching groups for teacher:', user.email);
    
    // Fetch groups filtered by teacher_id
    // RLS policy will also enforce this, but we add explicit filter
    const { data, error } = await supabase
      .from('class_assignments')
      .select('id, class_token, assigned_workshop_id, is_active, created_at, updated_at, teacher_id')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[list_groups] Database error:', error.message);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    console.log(`[list_groups] Found ${data?.length || 0} groups for teacher ${user.email}`);
    return NextResponse.json({ groups: data || [] });
  } catch (error) {
    console.error('[list_groups] Unexpected error:', (error as Error)?.message ?? error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';

export const runtime = 'nodejs';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const RequestSchema = z.object({
  class_token: z.string().min(1),
  is_active: z.boolean(),
});

export async function POST(req: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { class_token, is_active } = RequestSchema.parse(body);

    // Create Supabase client with user's session
    const cookieStore = await cookies();
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Cookie: cookieStore.toString() },
      },
    });
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[archive_group] Not authenticated:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('[archive_group] Updating group by teacher:', user.email, {
      class_token,
      is_active,
    });
    
    // Update with ownership check (RLS will also enforce this)
    const { data, error } = await supabase
      .from('class_assignments')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('class_token', class_token)
      .eq('teacher_id', user.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found - either doesn't exist or not owned by this teacher
        return NextResponse.json({ 
          error: 'Grupo no encontrado o no tienes permiso para modificarlo' 
        }, { status: 404 });
      }
      console.error('[archive_group] Database error:', error.message);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    console.log('[archive_group] ✅ Group updated successfully:', class_token);
    return NextResponse.json({ success: true, group: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid payload', details: error.flatten() }, { status: 400 });
    }
    console.error('[archive_group] Unexpected error:', (error as Error)?.message ?? error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

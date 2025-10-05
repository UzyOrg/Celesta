import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(req: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  try {
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
      console.error('[create_group] Not authenticated:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const body = await req.json();
    const { class_token, assigned_workshop_id } = body;
    
    if (!class_token || !assigned_workshop_id) {
      return NextResponse.json({ 
        error: 'Missing required fields: class_token, assigned_workshop_id' 
      }, { status: 400 });
    }
    
    console.log('[create_group] Creating group for teacher:', user.email, {
      class_token,
      assigned_workshop_id,
    });
    
    // Insert new group
    const { data, error } = await supabase
      .from('class_assignments')
      .insert({
        class_token,
        assigned_workshop_id,
        teacher_id: user.id,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        return NextResponse.json({ 
          error: 'Este código de grupo ya existe. Por favor, usa uno diferente.' 
        }, { status: 409 });
      }
      
      console.error('[create_group] Database error:', error.message);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    console.log('[create_group] ✅ Group created successfully:', class_token);
    return NextResponse.json({ group: data }, { status: 201 });
  } catch (error) {
    console.error('[create_group] Unexpected error:', (error as Error)?.message ?? error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

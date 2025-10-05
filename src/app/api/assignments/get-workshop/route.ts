import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(req: Request) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const classToken = searchParams.get('class_token');

    if (!classToken) {
      return NextResponse.json({ error: 'Missing class_token parameter' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    
    const { data, error } = await supabase
      .from('class_assignments')
      .select('assigned_workshop_id, is_active')
      .eq('class_token', classToken)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return NextResponse.json({ 
          error: 'No active assignment found for this class',
          workshop_id: null 
        }, { status: 404 });
      }
      console.error('get_workshop_error', error.message);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ 
      workshop_id: data.assigned_workshop_id,
      class_token: classToken
    });
  } catch (error) {
    console.error('get_workshop_unexpected', (error as Error)?.message ?? error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

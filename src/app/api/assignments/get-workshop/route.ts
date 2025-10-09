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
    
    // Primero obtener el group_id desde class_token
    const { data: groupData, error: groupError } = await supabase
      .from('class_assignments')
      .select('id')
      .eq('class_token', classToken)
      .eq('is_active', true)
      .single();

    if (groupError || !groupData) {
      console.error('[get-workshop] ❌ Group not found:', groupError);
      return NextResponse.json(
        { error: 'Group not found or inactive' },
        { status: 404 }
      );
    }
    
    // Obtener el primer taller asignado al grupo (por orden de position)
    const { data, error } = await supabase
      .from('grupo_talleres')
      .select('taller_id, talleres(id, nombre)')
      .eq('group_id', groupData.id)
      .order('position', { ascending: true })
      .limit(1)
      .single();

    if (error || !data) {
      console.error('[get-workshop] ❌ Error fetching assignment:', error);
      return NextResponse.json(
        { error: 'No workshop assigned to this group' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      workshop_id: data.taller_id,
      workshop_name: (data.talleres as any)?.nombre || data.taller_id,
      class_token: classToken
    });
  } catch (error) {
    console.error('[get-workshop] Unexpected error:', (error as Error)?.message ?? error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

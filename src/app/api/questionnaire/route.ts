import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Supabase URL or Service Role Key is not defined for /api/questionnaire");
}

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceRoleKey!);

export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  const formData = await request.json();

  try {
    const { data, error } = await supabaseAdmin
      .from('Leads')
      .insert([formData])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });

  } catch (error) {
    console.error('Error submitting questionnaire:', error);
    return NextResponse.json({ error: 'Error submitting questionnaire' }, { status: 500 });
  }
}

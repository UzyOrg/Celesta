import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const RequestSchema = z.object({
  class_token: z.string().min(1),
  student_session_id: z.string().min(1),
});

export async function POST(req: Request) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { class_token, student_session_id } = RequestSchema.parse(body);

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data, error } = await supabase
      .from('alias_sessions')
      .select('alias')
      .eq('class_token', class_token)
      .eq('student_session_id', student_session_id)
      .limit(1);

    if (error) {
      console.error('lookup_alias_error', error.message);
      return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
    }

    const alias = Array.isArray(data) && data.length > 0 ? data[0]?.alias ?? null : null;
    return NextResponse.json({ alias });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'invalid_payload', details: error.flatten() }, { status: 400 });
    }
    console.error('lookup_alias_unexpected', (error as Error)?.message ?? error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

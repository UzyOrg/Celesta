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
  alias: z.string().min(1).max(64),
});

export async function POST(req: Request) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const parsed = RequestSchema.parse(body);
    const alias = parsed.alias.trim();
    if (alias.length === 0) {
      return NextResponse.json({ error: 'alias_empty' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { error } = await supabase.from('alias_sessions').upsert(
      {
        class_token: parsed.class_token,
        student_session_id: parsed.student_session_id,
        alias,
        last_seen: new Date().toISOString(),
      },
      { onConflict: 'class_token,student_session_id' }
    );

    if (error) {
      console.error('set_alias_error', error.message);
      return NextResponse.json({ error: 'upsert_failed' }, { status: 500 });
    }

    return NextResponse.json({ alias });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'invalid_payload', details: error.flatten() }, { status: 400 });
    }
    console.error('set_alias_unexpected', (error as Error)?.message ?? error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

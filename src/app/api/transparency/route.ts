import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function toISODateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return new NextResponse('Server not configured', { status: 500 });
    }

    const url = new URL(req.url);
    const token = url.searchParams.get('token') || '';
    const fromParam = url.searchParams.get('from');
    const toParam = url.searchParams.get('to');

    const now = new Date();
    const defTo = toISODateOnly(now);
    const defFrom = toISODateOnly(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));

    const from = (fromParam || defFrom) + 'T00:00:00.000Z';
    const to = (toParam || defTo) + 'T23:59:59.999Z';

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data, error } = await supabase.rpc('get_transparency_stats', {
      _from: from,
      _to: to,
      _class_token: token || null,
    });
    if (error) {
      return new NextResponse('Query error: ' + error.message, { status: 500 });
    }

    return NextResponse.json({
      from: from.slice(0, 10),
      to: to.slice(0, 10),
      token: token || null,
      rows: data ?? [],
    }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return new NextResponse('Unexpected error: ' + (e?.message || 'unknown'), { status: 500 });
  }
}

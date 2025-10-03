import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// RL: 60/min por class_token
const WINDOW_MS = 60_000;
const LIMIT = 60;
const bucket = new Map<string, { count: number; reset: number }>();

function csvCell(v: any): string {
  if (v === null || v === undefined) return '""';
  let s = typeof v === 'string' ? v : String(v);
  s = s.replace(/\r?\n/g, ' ').replace(/"/g, '""');
  return `"${s}"`;
}

export async function GET(req: Request) {
  try {
    if (!supabaseUrl || !serviceKey) {
      return new Response('Server misconfigured', { status: 500 });
    }
    const url = new URL(req.url);
    const sp = url.searchParams;
    const classToken = sp.get('classToken') || sp.get('token');
    const taller = sp.get('taller') || '';
    const fromParam = sp.get('from') || new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const toParam = sp.get('to') || new Date().toISOString().slice(0, 10);
    if (!classToken) {
      return new Response('Missing classToken', { status: 400 });
    }

    // rate limit per class_token
    const now = Date.now();
    const b = bucket.get(classToken);
    if (!b || now > b.reset) {
      bucket.set(classToken, { count: 1, reset: now + WINDOW_MS });
    } else {
      if (b.count >= LIMIT) {
        return new Response('rate_limited', { status: 429 });
      }
      b.count += 1;
      bucket.set(classToken, b);
    }
    const fromISO = `${fromParam}T00:00:00.000Z`;
    const toISO = `${toParam}T23:59:59.999Z`;

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    let query = supabase
      .from('eventos_de_aprendizaje')
      .select('student_session_id, actor_sid, class_token, taller_id, paso_id, verbo, result, ts, client_ts')
      .eq('class_token', classToken)
      .gte('ts', fromISO)
      .lte('ts', toISO)
      .order('ts', { ascending: true })
      .limit(50000);

    if (taller) query = query.eq('taller_id', taller);
    const { data, error } = await query;
    if (error) {
      return new Response(error.message, { status: 500 });
    }

    const header = [
      'student_session_id',
      'alias',
      'class_token',
      'taller_id',
      'paso_id',
      'verbo',
      'ts',
      'client_ts',
      'score',
      'success',
      'hint_cost',
      'result_json',
    ].map(csvCell).join(',') + '\n';

    const encoder = new TextEncoder();
    const rows = data ?? [];
    const sessionIds = Array.from(new Set(rows.map((r: any) => r?.student_session_id))).filter(Boolean);
    const aliasMap = new Map<string, string>();
    if (sessionIds.length > 0) {
      const { data: aliasRows, error: aliasErr } = await supabase
        .from('alias_sessions')
        .select('student_session_id, alias')
        .eq('class_token', classToken)
        .in('student_session_id', sessionIds)
        .limit(5000);
      if (aliasErr) {
        console.error('[export] alias_lookup_failed', aliasErr.message);
      } else {
        for (const row of aliasRows ?? []) {
          if (!row) continue;
          const alias = typeof row.alias === 'string' ? row.alias.trim() : '';
          if (alias) aliasMap.set(row.student_session_id, alias);
        }
      }
    }

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(header));
        for (let i = 0; i < rows.length; i++) {
          const e = rows[i] as any;
          const canonicalAlias = aliasMap.get(e.student_session_id) ?? '';
          const score = e?.result?.score ?? '';
          const success = e?.result?.success ?? '';
          const hintCost = e?.verbo === 'solicito_pista' ? (e?.result?.costo ?? '') : '';
          const resultJson = (() => {
            try {
              return JSON.stringify(e?.result ?? null);
            } catch {
              return '';
            }
          })();

          const line = [
            csvCell(e.student_session_id),
            csvCell(canonicalAlias),
            csvCell(e.class_token),
            csvCell(e.taller_id),
            csvCell(e.paso_id),
            csvCell(e.verbo),
            csvCell(e.ts),
            csvCell(e.client_ts ?? ''),
            csvCell(score),
            csvCell(success),
            csvCell(hintCost),
            csvCell(resultJson),
          ].join(',') + '\n';

          controller.enqueue(encoder.encode(line));
        }
        controller.close();
      },
    });

    const filename = `export_${classToken}_${fromParam}_${toParam}${taller ? `_taller_${taller}` : ''}.csv`;
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    return new Response(e?.message ?? 'unexpected', { status: 500 });
  }
}
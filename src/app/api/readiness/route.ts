import { NextResponse } from 'next/server';
import {
  evaluateReadiness,
  type ReadinessChecks,
} from '@/lib/server/readiness';

export const runtime = 'nodejs';
export const revalidate = 0;

type ReadinessCheckStatus = 'ok' | 'misconfigured';

interface ReadinessResponse {
  status: 'ready' | 'not_ready';
  checks: Record<keyof ReadinessChecks, ReadinessCheckStatus>;
}

export async function GET() {
  const result = evaluateReadiness(process.env);
  const checkStatus = (ok: boolean): ReadinessCheckStatus => ok ? 'ok' : 'misconfigured';
  const body: ReadinessResponse = {
    status: result.ready ? 'ready' : 'not_ready',
    checks: {
      supabaseUrl: checkStatus(result.checks.supabaseUrl),
      supabaseAnonKey: checkStatus(result.checks.supabaseAnonKey),
      supabaseServiceRole: checkStatus(result.checks.supabaseServiceRole),
      retestSigningSecret: checkStatus(result.checks.retestSigningSecret),
      retestProductionMode: checkStatus(result.checks.retestProductionMode),
      retestDelay: checkStatus(result.checks.retestDelay),
    },
  };
  return NextResponse.json(
    body,
    {
      status: result.ready ? 200 : 503,
      headers: { 'Cache-Control': 'private, no-store' },
    }
  );
}

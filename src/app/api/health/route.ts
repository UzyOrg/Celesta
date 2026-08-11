import { NextResponse } from 'next/server';

interface HealthResponse {
  status: 'ok';
}

export async function GET() {
  const body: HealthResponse = { status: 'ok' };
  return NextResponse.json(
    body,
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}

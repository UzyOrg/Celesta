import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 0;

/** Deprecated mission reader from the pre-Celestea product model. */
export async function GET() {
  return NextResponse.json(
    { error: 'legacy_reader_disabled' },
    { status: 410, headers: { 'Cache-Control': 'no-store' } }
  );
}

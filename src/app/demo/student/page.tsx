import path from 'node:path';
import { promises as fs } from 'node:fs';
import WorkshopClient from '@/app/workshop/[id]/Client';
import AliasGuard from '@/components/join/AliasGuard';

export const runtime = 'nodejs';

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const classToken = typeof sp?.t === 'string' ? sp.t : 'DEMO-101';

  // Prefer BIO-001 if present in public/workshops, else fallback to DEV-TEST
  let id = 'BIO-001';
  try {
    const p = path.join(process.cwd(), 'public', 'workshops', `${id}.json`);
    await fs.access(p);
  } catch {
    id = 'DEV-TEST';
  }

  return (
    <>
      <AliasGuard token={classToken} />
      <WorkshopClient id={id} classToken={classToken} />
    </>
  );
}

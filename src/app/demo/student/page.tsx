import WorkshopClientWithShell from './ClientWithShell';
import AliasGuard from '@/components/join/AliasGuard';

export const runtime = 'nodejs';

async function getAssignedWorkshop(classToken: string): Promise<string | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const url = `${baseUrl}/api/assignments/get-workshop?class_token=${encodeURIComponent(classToken)}`;
    
    const response = await fetch(url, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.error(`[getAssignedWorkshop] Failed to fetch assignment for ${classToken}:`, response.status);
      return null;
    }

    const data = await response.json();
    return data.workshop_id || null;
  } catch (error) {
    console.error('[getAssignedWorkshop] Error:', error);
    return null;
  }
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const classToken = typeof sp?.t === 'string' ? sp.t : 'DEMO-101';

  // Fetch assigned workshop dynamically
  const assignedWorkshopId = await getAssignedWorkshop(classToken);
  
  // Fallback to BIO-001 if no assignment found
  const workshopId = assignedWorkshopId || 'BIO-001';

  return (
    <>
      <AliasGuard token={classToken} />
      <WorkshopClientWithShell id={workshopId} classToken={classToken} />
    </>
  );
}

import JoinFormModern from "@/components/join/JoinFormModern";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const token = typeof sp?.t === 'string' ? sp!.t : '';

  return <JoinFormModern token={token} />;
}

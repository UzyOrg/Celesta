import JoinFormModern from "@/components/join/JoinFormModern";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = searchParams ? await searchParams : {};
  const token = typeof sp?.t === 'string' ? sp.t : '';
  const redirectTo = typeof sp?.redirect === 'string' ? sp.redirect : '';

  return <JoinFormModern token={token} redirectTo={redirectTo} />;
}

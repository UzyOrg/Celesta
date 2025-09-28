import JoinForm from "@/components/join/JoinForm";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const token = typeof sp?.t === 'string' ? sp!.t : '';

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Unirse a la misión</h1>
        {token ? (
          <p className="text-neutral-300 text-sm">Grupo: {token}</p>
        ) : (
          <p className="text-neutral-300 text-sm">Ingresa tu alias para continuar</p>
        )}
      </header>
      <div className="p-4 rounded bg-black/20 border border-neutral-800">
        <JoinForm token={token} />
      </div>
      <p className="text-xs text-neutral-400">
        Usaremos tu alias para identificar tu progreso en esta misión. No recolectamos PII.
      </p>
    </div>
  );
}

import { Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function toISODateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function StatsTable({ token, from, to }: { token: string; from: string; to: string }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return <div className="text-red-400">Servidor no configurado</div>;
  }
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc('get_transparency_stats', {
    _from: from + 'T00:00:00.000Z',
    _to: to + 'T23:59:59.999Z',
    _class_token: token || null,
  });
  if (error) {
    return <div className="text-red-400">Error: {error.message}</div>;
  }
  const rows: Array<{
    class_token: string | null;
    taller_id: string;
    total_eventos: number;
    respuestas: number;
    pistas: number;
    completos: number;
    estudiantes: number;
  }> = data || [];

  if (rows.length === 0) {
    return <div className="text-neutral-400">Sin datos en el período seleccionado.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-neutral-300">
            <th className="py-2 pr-4">Token</th>
            <th className="py-2 pr-4">Taller</th>
            <th className="py-2 pr-4">Eventos</th>
            <th className="py-2 pr-4">Respuestas</th>
            <th className="py-2 pr-4">Pistas</th>
            <th className="py-2 pr-4">Completos</th>
            <th className="py-2 pr-4">Estudiantes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-neutral-800">
              <td className="py-2 pr-4 text-neutral-200">{r.class_token || '—'}</td>
              <td className="py-2 pr-4 text-neutral-200">{r.taller_id}</td>
              <td className="py-2 pr-4">{r.total_eventos}</td>
              <td className="py-2 pr-4">{r.respuestas}</td>
              <td className="py-2 pr-4">{r.pistas}</td>
              <td className="py-2 pr-4">{r.completos}</td>
              <td className="py-2 pr-4">{r.estudiantes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const now = new Date();
  const defTo = toISODateOnly(now);
  const defFrom = toISODateOnly(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
  const token = typeof sp?.token === 'string' ? sp!.token : '';
  const from = typeof sp?.from === 'string' ? sp!.from : defFrom;
  const to = typeof sp?.to === 'string' ? sp!.to : defTo;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Transparencia de IA (pública)</h1>
        <p className="text-neutral-400 text-sm">
          Esta página muestra actividad agregada y anonimizada. No se expone PII ni alias.
        </p>
      </header>

      <form method="get" className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-black/20 p-4 rounded border border-neutral-800">
        <div className="flex flex-col">
          <label className="text-xs text-neutral-400">Token (opcional)</label>
          <input name="token" defaultValue={token} placeholder="DEMO-101" className="bg-neutral-900 border border-neutral-700 rounded p-2" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-neutral-400">Desde</label>
          <input name="from" type="date" defaultValue={from} className="bg-neutral-900 border border-neutral-700 rounded p-2" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-neutral-400">Hasta</label>
          <input name="to" type="date" defaultValue={to} className="bg-neutral-900 border border-neutral-700 rounded p-2" />
        </div>
        <div className="flex items-end">
          <button type="submit" className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white">Actualizar</button>
        </div>
      </form>

      <Suspense fallback={<div>Cargando...</div>}>
        <StatsTable token={token} from={from} to={to} />
      </Suspense>
    </div>
  );
}

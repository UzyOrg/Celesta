import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { obtenerActividadPorToken } from '@/components/defensa/consultas';
import { FlujoAlumno } from '@/components/defensa/FlujoAlumno';
import { leerBandera, leerModo, normalizarPaso } from '@/components/defensa/pasos';

export const metadata: Metadata = {
  title: 'Tu defensa oral | Celestea',
  robots: { index: false, follow: false },
};

// El enlace depende de la actividad guardada (y de si sigue activo): nunca se prerenderiza.
export const dynamic = 'force-dynamic';

interface PaginaDefensaProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Enlace de grupo del alumno: `/defensa/<token>`. En desarrollo, con el almacén en memoria,
 * el token de ejemplo es `demo-celestea` (ver `src/lib/defensa/almacen/semilla.ts`).
 *
 * Un solo flujo con máquina de pasos del lado del cliente. `?paso=<id>` (o un
 * número del 1 al 15) abre un paso si ya se puede llegar a él, `?ensayo=1` pide el
 * ensayo privado y `?modo=escrito` pide la respuesta por escrito. La página solo lee lo
 * que es de todo el grupo; lo de cada persona llega por la API con su sesión.
 */
export default async function PaginaDefensa({ params, searchParams }: PaginaDefensaProps) {
  const { token } = await params;
  const consulta = await searchParams;
  const actividad = await obtenerActividadPorToken(token);

  if (!actividad) notFound();

  return (
    <FlujoAlumno
      actividad={actividad}
      pasoInicial={normalizarPaso(consulta.paso)}
      ensayoInicial={leerBandera(consulta.ensayo)}
      modoInicial={leerModo(consulta.modo)}
    />
  );
}

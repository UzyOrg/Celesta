import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { obtenerActividadPorToken } from '@/components/defensa/consultas';
import { FlujoAlumno } from '@/components/defensa/FlujoAlumno';
import { leerBandera, leerModo, normalizarPaso } from '@/components/defensa/pasos';

export const metadata: Metadata = {
  title: 'Tu defensa oral | Celestea',
};

interface PaginaDefensaProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Enlace del alumno: `/defensa/<token>` (el token de demostración es `demo`).
 *
 * Un solo flujo con máquina de pasos del lado del cliente. `?paso=<id>` (o un
 * número del 1 al 15) abre cualquier paso, `?ensayo=1` abre el ensayo privado y
 * `?modo=escrito` abre la respuesta por escrito. Hoy el token se resuelve con el
 * escenario de ejemplo (ver `consultas.ts`).
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

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { obtenerGrupoPorToken } from '@/components/revision/consultas';
import { construirMenu, resumenDelGrupo } from '@/components/revision/derivados';
import { EnlaceListo } from '@/components/revision/EnlaceListo';
import { MarcoProfesor } from '@/components/revision/MarcoProfesor';
import { normalizarPasoNueva, PASO_FINAL, TOKEN_DE_LA_NUEVA } from '@/components/revision/nueva';
import { NuevaActividad } from '@/components/revision/NuevaActividad';

// El enlace firmado y los datos del grupo cambian con cada visita: nunca se prerenderiza.
export const dynamic = 'force-dynamic';

interface PaginaNuevaProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: PaginaNuevaProps): Promise<Metadata> {
  const consulta = await searchParams;
  const vista = normalizarPasoNueva(consulta.paso);
  if (vista.tipo === 'enlace') return { title: 'Enlace listo | Celestea' };
  return {
    title: vista.paso >= PASO_FINAL ? 'Borrador listo | Celestea' : 'Nueva actividad con Celestea | Celestea',
  };
}

/**
 * Nueva actividad: `/revision/<token>/nueva` (en la demostración, `/revision/demo/nueva`).
 *
 * Una conversación con Celestea que llena un borrador y termina en el enlace
 * para el grupo. `?paso=0` a `?paso=6` abre la conversación en ese paso (con
 * respuestas de ejemplo en los anteriores), `?paso=listo` es el borrador
 * completo y `?paso=enlace` es el enlace ya creado. Sin parámetro, empieza una
 * actividad nueva.
 */
export default async function PaginaNueva({ params, searchParams }: PaginaNuevaProps) {
  const { token } = await params;
  const consulta = await searchParams;
  const grupo = await obtenerGrupoPorToken(token);

  // Con datos reales la actividad se da de alta con el script (docs/defensas/backend.md): esta pantalla es solo el diseño.
  if (!grupo || grupo.conectado) notFound();

  const vista = normalizarPasoNueva(consulta.paso);
  const resumen = resumenDelGrupo(grupo.alumnos);

  if (vista.tipo === 'enlace') {
    // La actividad que armó la conversación de ejemplo; en un servidor real sería la recién creada.
    const nueva = await obtenerGrupoPorToken(TOKEN_DE_LA_NUEVA);
    if (!nueva) notFound();
    const menu = construirMenu('enlace', nueva.actividad, resumen, nueva.otrasActividades);
    return (
      <MarcoProfesor token={nueva.actividad.token} menu={menu} profesora={nueva.profesora} forma="pagina">
        <EnlaceListo
          actividad={nueva.actividad}
          totalAlumnos={nueva.actividad.totalAlumnos}
          rutaGrupo={`/revision/${nueva.actividad.token}`}
          rutaAlumno={`/defensa/${nueva.actividad.token}`}
        />
      </MarcoProfesor>
    );
  }

  const menu = construirMenu('nueva', grupo.actividad, resumen, grupo.otrasActividades);
  return (
    <MarcoProfesor token={grupo.actividad.token} menu={menu} profesora={grupo.profesora} forma="dividido">
      <NuevaActividad token={grupo.actividad.token} pasoInicial={vista.paso} />
    </MarcoProfesor>
  );
}

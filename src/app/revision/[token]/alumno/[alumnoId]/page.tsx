import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AntesDeVerReporte } from '@/components/revision/AntesDeVerReporte';
import { obtenerReporte } from '@/components/revision/consultas';
import { construirMenu, resumenDelGrupo } from '@/components/revision/derivados';
import { MarcoProfesor } from '@/components/revision/MarcoProfesor';
import { ReporteDelAlumno } from '@/components/revision/ReporteDelAlumno';

interface PaginaReporteProps {
  params: Promise<{ token: string; alumnoId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** `?vista=reporte` salta la pregunta previa y abre el reporte directo. */
function pideElReporte(valor: string | string[] | undefined): boolean {
  const crudo = Array.isArray(valor) ? valor[0] : valor;
  return crudo === 'reporte';
}

export async function generateMetadata({ params, searchParams }: PaginaReporteProps): Promise<Metadata> {
  const { token, alumnoId } = await params;
  const consulta = await searchParams;
  const datos = await obtenerReporte(token, alumnoId);
  if (!datos) return { title: 'Celestea' };
  return {
    title: pideElReporte(consulta.vista)
      ? `Reporte de ${datos.alumno.nombre} | Celestea`
      : 'Antes de ver el reporte | Celestea',
  };
}

/**
 * Reporte de un alumno: `/revision/<token>/alumno/<matrícula>` (en la demostración,
 * `/revision/demo/alumno/20231457`).
 *
 * Primero se le pregunta al profesor qué cree del alumno ("Antes de ver su
 * reporte"); `?vista=reporte` abre el reporte directo. Solo el alumno de
 * ejemplo trae transcripción completa. Si la matrícula no existe en el grupo o
 * el alumno no tiene defensa, responde "no encontrado".
 */
export default async function PaginaReporte({ params, searchParams }: PaginaReporteProps) {
  const { token, alumnoId } = await params;
  const consulta = await searchParams;
  const datos = await obtenerReporte(token, alumnoId);

  if (!datos) notFound();

  if (!pideElReporte(consulta.vista)) {
    return <AntesDeVerReporte datos={datos} />;
  }

  const { grupo } = datos;
  const resumen = resumenDelGrupo(grupo.alumnos);
  const menu = construirMenu('revisar', grupo.actividad, resumen, grupo.otrasActividades);

  return (
    <MarcoProfesor token={grupo.actividad.token} menu={menu} profesora={grupo.profesora} forma="pagina">
      <ReporteDelAlumno datos={datos} />
    </MarcoProfesor>
  );
}

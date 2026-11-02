import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { obtenerGrupoPorToken } from '@/components/revision/consultas';
import { construirMenu, resumenDelGrupo } from '@/components/revision/derivados';
import { TITULOS_DE_ESCENA } from '@/components/revision/frases';
import { InicioAgentico } from '@/components/revision/InicioAgentico';
import { leerEscenaInicial } from '@/components/revision/intenciones';
import { MaquetaDelAsistente } from '@/components/revision/MaquetaDelAsistente';
import { leerEscenaDeMaqueta, maquetaDelAsistente } from '@/components/revision/maquetas';
import { MarcoProfesor } from '@/components/revision/MarcoProfesor';

// El enlace firmado y los datos del grupo cambian con cada visita: nunca se prerenderiza.
export const dynamic = 'force-dynamic';

interface PaginaRevisionProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: PaginaRevisionProps): Promise<Metadata> {
  const consulta = await searchParams;
  if (leerEscenaDeMaqueta(consulta.escena)) return { title: 'Maquetas del asistente | Celestea' };
  return { title: `${TITULOS_DE_ESCENA[leerEscenaInicial(consulta.escena)]} | Celestea` };
}

/**
 * Inicio del profesor: `/revision/<enlace firmado>`. En desarrollo, `demo` abre el escenario de ejemplo.
 *
 * Una sola pantalla con la barra de Celestea abajo. `?escena=` abre una de las
 * respuestas ya dadas: `avance`, `ana` (o `alumno`), `descarga`, `lista` u
 * `objetivos`; sin ella abre el inicio. El grupo sale de la base de datos
 * (ver `consultas.ts`).
 *
 * Solo con el grupo de ejemplo, `?escena=asistente` abre las maquetas del
 * asistente del profesor (propuesta en `docs/defensas/asistente-profesor.md`).
 */
export default async function PaginaRevision({ params, searchParams }: PaginaRevisionProps) {
  const { token } = await params;
  const consulta = await searchParams;
  const grupo = await obtenerGrupoPorToken(token);

  if (!grupo) notFound();

  const resumen = resumenDelGrupo(grupo.alumnos);
  const menu = construirMenu('revisar', grupo.actividad, resumen, grupo.otrasActividades, grupo.conectado === true);
  const maqueta = grupo.conectado === true ? null : leerEscenaDeMaqueta(consulta.escena);

  return (
    <MarcoProfesor token={grupo.actividad.token} menu={menu} profesora={grupo.profesora} forma="agente">
      {maqueta ? (
        <MaquetaDelAsistente grupo={grupo} maqueta={maqueta === 'asistente' ? null : maquetaDelAsistente(grupo, maqueta)} />
      ) : (
        <InicioAgentico grupo={grupo} escenaInicial={leerEscenaInicial(consulta.escena)} />
      )}
    </MarcoProfesor>
  );
}

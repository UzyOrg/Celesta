import { after } from 'next/server';
import { z } from 'zod';
import { atender, conSesionAlumno, idDeLaRuta, leerJson, limitar, limitarPorIp, responder } from '@/lib/defensa/api';
import { entregarDefensa } from '@/lib/defensa/servicios/defensas';
import { generarReporteDeDefensa } from '@/lib/defensa/servicios/reportes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface Contexto {
  params: Promise<{ id: string }>;
}

const Esquema = z
  .object({
    marcas: z
      .array(z.object({ turnoId: z.string().uuid(), linea: z.string().min(1).max(80) }).strict())
      .max(200),
  })
  .strict();

/**
 * Entrega de la defensa tras la revisión del alumno, con las líneas que marcó como
 * "No lo dije así". Si fue la defensa de verdad, deja pedido su reporte.
 */
export async function POST(request: Request, { params }: Contexto) {
  return atender(async () => {
    limitarPorIp(request, 'defensa-entregar', 300);
    const { ctx, sesion } = await conSesionAlumno(request);
    limitar(`defensa-entregar:${sesion.alumno.id}`, 10);
    const id = idDeLaRuta((await params).id);
    const { marcas } = await leerJson(request, Esquema, 32 * 1024);
    const { generarReporteDe, ...respuesta } = await entregarDefensa(ctx, sesion, id, marcas);
    if (generarReporteDe) after(() => generarReporteDeDefensa(ctx, generarReporteDe));
    return responder(respuesta);
  });
}

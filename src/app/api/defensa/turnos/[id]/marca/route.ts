import { z } from 'zod';
import { atender, conSesionAlumno, idDeLaRuta, leerJson, limitar, limitarPorIp, sinContenido } from '@/lib/defensa/api';
import { marcarTurno } from '@/lib/defensa/servicios/defensas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface Contexto {
  params: Promise<{ id: string }>;
}

const Esquema = z.object({ tipo: z.enum(['repeticion', 'silencio']) }).strict();

/** El alumno pidió repetir la pregunta o pasaron 30 s sin respuesta (el aviso amable). Solo se cuenta. */
export async function POST(request: Request, { params }: Contexto) {
  return atender(async () => {
    limitarPorIp(request, 'turno-marca', 900);
    const { ctx, sesion } = await conSesionAlumno(request);
    limitar(`turno-marca:${sesion.alumno.id}`, 90);
    const id = idDeLaRuta((await params).id);
    const { tipo } = await leerJson(request, Esquema, 1024);
    await marcarTurno(ctx, sesion, id, tipo);
    return sinContenido();
  });
}

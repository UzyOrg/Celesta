import { z } from 'zod';
import { atender, conSesionAlumno, idDeLaRuta, leerJson, limitar, limitarPorIp, sinContenido } from '@/lib/defensa/api';
import { registrarEstres } from '@/lib/defensa/servicios/defensas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface Contexto {
  params: Promise<{ id: string }>;
}

const Esquema = z.object({ nivel: z.number().int().min(0).max(4) }).strict();

/** "¿Más o menos estrés que un examen escrito?": de 0 (mucho menos) a 4 (mucho más). */
export async function POST(request: Request, { params }: Contexto) {
  return atender(async () => {
    limitarPorIp(request, 'defensa-estres', 300);
    const { ctx, sesion } = await conSesionAlumno(request);
    limitar(`defensa-estres:${sesion.alumno.id}`, 10);
    const id = idDeLaRuta((await params).id);
    const { nivel } = await leerJson(request, Esquema, 1024);
    await registrarEstres(ctx, sesion, id, nivel);
    return sinContenido();
  });
}

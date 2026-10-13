import { z } from 'zod';
import { atender, conSesionAlumno, idDeLaRuta, leerJson, limitar, limitarPorIp, responder } from '@/lib/defensa/api';
import { LIMITES } from '@/lib/defensa/config';
import { resolverAclaracion } from '@/lib/defensa/servicios/defensas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface Contexto {
  params: Promise<{ id: string }>;
}

const Esquema = z
  .object({
    modo: z.enum(['voz', 'escrito']),
    texto: z.string().max(LIMITES.aclaracionCaracteres * 2).optional(),
    intento: z.number().int().min(0).max(99).optional(),
    totalPartes: z.number().int().min(0).max(600).optional(),
    mime: z.string().max(120).optional(),
    duracionMs: z.number().min(0).max(5 * 60_000).optional(),
  })
  .strict();

/**
 * La parte que no se entendió, dicha o escrita por el alumno. La IA nunca la llena: si
 * sigue sin entenderse, esa parte queda como "no se entendió" y no cuenta en su contra.
 */
export async function POST(request: Request, { params }: Contexto) {
  return atender(async () => {
    limitarPorIp(request, 'turno-aclarar', 600);
    const { ctx, sesion } = await conSesionAlumno(request);
    limitar(`turno-aclarar:${sesion.alumno.id}`, 30);
    const id = idDeLaRuta((await params).id);
    const cuerpo = await leerJson(request, Esquema, 16 * 1024);
    return responder(await resolverAclaracion(ctx, sesion, id, cuerpo));
  });
}

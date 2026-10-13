import { z } from 'zod';
import { atender, conSesionAlumno, idDeLaRuta, leerJson, limitar, limitarPorIp, responder } from '@/lib/defensa/api';
import { LIMITES } from '@/lib/defensa/config';
import { responderTurno } from '@/lib/defensa/servicios/defensas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Juntar el audio, transcribirlo y clasificarlo cabe de sobra; este es el techo.
export const maxDuration = 60;

interface Contexto {
  params: Promise<{ id: string }>;
}

const Esquema = z
  .object({
    modo: z.enum(['voz', 'escrito']),
    texto: z.string().max(LIMITES.respuestaCaracteres * 2).optional(),
    intento: z.number().int().min(0).max(99).optional(),
    totalPartes: z.number().int().min(0).max(600).optional(),
    mime: z.string().max(120).optional(),
    duracionMs: z.number().min(0).max(30 * 60_000).optional(),
    silencios: z.number().int().min(0).max(1000).optional(),
    repeticiones: z.number().int().min(0).max(1000).optional(),
  })
  .strict();

/**
 * "Listo": cierra la respuesta. Por voz, junta las partes, las transcribe y clasifica; por
 * escrito, solo clasifica. Devuelve cómo sigue la defensa: la siguiente pregunta, una
 * aclaración de una parte que no se entendió, o la revisión si ya no hay más preguntas.
 */
export async function POST(request: Request, { params }: Contexto) {
  return atender(async () => {
    limitarPorIp(request, 'turno-responder', 600);
    const { ctx, sesion } = await conSesionAlumno(request);
    limitar(`turno-responder:${sesion.alumno.id}`, 40);
    const id = idDeLaRuta((await params).id);
    const cuerpo = await leerJson(request, Esquema, 32 * 1024);
    return responder(await responderTurno(ctx, sesion, id, cuerpo));
  });
}

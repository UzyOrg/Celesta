import { z } from 'zod';
import { atender, conAccesoProfesor, leerJson, limitar, limitarPorIp, responder } from '@/lib/defensa/api';
import { urlAudioDeParte } from '@/lib/defensa/servicios/profesor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const Esquema = z.object({ defensaId: z.string().uuid(), turnoId: z.string().uuid() }).strict();

/** Enlace que caduca para oír el audio original de una respuesta, mientras no se haya borrado (a los 7 días). */
export async function POST(request: Request) {
  return atender(async () => {
    limitarPorIp(request, 'revision-audio', 300);
    const { ctx, actividad } = await conAccesoProfesor(request);
    limitar(`revision-audio:${actividad.id}`, 60);
    return responder(await urlAudioDeParte(ctx, actividad, await leerJson(request, Esquema, 1024)));
  });
}

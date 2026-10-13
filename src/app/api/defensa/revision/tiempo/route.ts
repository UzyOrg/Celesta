import { z } from 'zod';
import { atender, conAccesoProfesor, leerJson, limitar, limitarPorIp, responder } from '@/lib/defensa/api';
import { registrarTiempoRevision } from '@/lib/defensa/servicios/profesor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const Esquema = z
  .object({
    defensaId: z.string().uuid(),
    aperturaId: z.string().uuid().optional(),
    activoMs: z.number().min(0).max(24 * 60 * 60 * 1000),
  })
  .strict();

/**
 * Cuánto tiempo activo pasa el profesor con un reporte abierto. El primer aviso abre la
 * medición y devuelve su id; los siguientes la actualizan (el tiempo solo crece).
 */
export async function POST(request: Request) {
  return atender(async () => {
    limitarPorIp(request, 'revision-tiempo', 300);
    const { ctx, actividad } = await conAccesoProfesor(request);
    limitar(`revision-tiempo:${actividad.id}`, 120);
    return responder(await registrarTiempoRevision(ctx, actividad, await leerJson(request, Esquema, 1024)));
  });
}

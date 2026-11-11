import { z } from 'zod';
import { atender, conAccesoProfesor, leerJson, limitar, limitarPorIp, responder } from '@/lib/defensa/api';
import { trabajoParaLeer } from '@/lib/defensa/servicios/profesor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const Esquema = z.object({ entregaId: z.string().uuid() }).strict();

/**
 * El trabajo que entregó un alumno, en texto, para leerlo junto a su reporte. Solo
 * lectura: no se califica dentro de Celestea. El original se baja con /descargas.
 */
export async function POST(request: Request) {
  return atender(async () => {
    limitarPorIp(request, 'revision-trabajo', 300);
    const { ctx, actividad } = await conAccesoProfesor(request);
    limitar(`revision-trabajo:${actividad.id}`, 60);
    return responder(await trabajoParaLeer(ctx, actividad, (await leerJson(request, Esquema, 1024)).entregaId));
  });
}

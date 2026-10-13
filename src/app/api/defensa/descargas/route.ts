import { z } from 'zod';
import { atender, conAccesoProfesor, leerJson, limitar, limitarPorIp, responder } from '@/lib/defensa/api';
import { prepararDescarga } from '@/lib/defensa/servicios/profesor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Armar el zip de todo un grupo baja y junta cada archivo.
export const maxDuration = 60;

const Esquema = z
  .object({
    alcance: z.enum(['todos', 'uno']),
    entregaId: z.string().uuid().optional(),
  })
  .strict();

/**
 * Descarga de trabajos: un enlace que caduca (a los 10 minutos) para un trabajo, o un zip
 * con el último de cada alumno. El profesor califica en su plataforma escolar, como siempre.
 */
export async function POST(request: Request) {
  return atender(async () => {
    limitarPorIp(request, 'descargas', 300);
    const { ctx, actividad } = await conAccesoProfesor(request);
    limitar(`descargas:${actividad.id}`, 20);
    return responder(await prepararDescarga(ctx, actividad, await leerJson(request, Esquema, 1024)));
  });
}

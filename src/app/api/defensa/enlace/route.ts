import { z } from 'zod';
import { atender, conAccesoProfesor, leerJson, limitar, limitarPorIp, responder } from '@/lib/defensa/api';
import { cambiarEnlaceDeGrupo } from '@/lib/defensa/servicios/profesor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const Esquema = z.object({ activo: z.boolean() }).strict();

/**
 * Desactiva o reactiva el enlace de grupo. Desactivado, nadie nuevo entra ni entrega; quien
 * ya estaba defendiendo puede terminar. El acceso del profesor no se ve afectado.
 */
export async function POST(request: Request) {
  return atender(async () => {
    limitarPorIp(request, 'enlace', 300);
    const { ctx, actividad } = await conAccesoProfesor(request);
    limitar(`enlace:${actividad.id}`, 20);
    const { activo } = await leerJson(request, Esquema, 1024);
    await cambiarEnlaceDeGrupo(ctx, actividad, activo);
    return responder({ activo });
  });
}

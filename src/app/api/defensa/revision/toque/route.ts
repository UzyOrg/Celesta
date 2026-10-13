import { z } from 'zod';
import { atender, conAccesoProfesor, leerJson, limitar, limitarPorIp, sinContenido } from '@/lib/defensa/api';
import { registrarToqueProfesor } from '@/lib/defensa/servicios/profesor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const Esquema = z
  .object({
    defensaId: z.string().uuid(),
    tipo: z.enum(['antes', 'despues']),
    valor: z.enum(['si', 'parte', 'no', 'no_se']),
  })
  .strict();

/**
 * Los dos toques del profesor por reporte: antes de verlo ("¿domina el tema?") y al
 * cerrarlo ("¿coincide con lo que piensas?"). El alumno nunca los ve.
 */
export async function POST(request: Request) {
  return atender(async () => {
    limitarPorIp(request, 'revision-toque', 300);
    const { ctx, actividad } = await conAccesoProfesor(request);
    limitar(`revision-toque:${actividad.id}`, 60);
    await registrarToqueProfesor(ctx, actividad, await leerJson(request, Esquema, 1024));
    return sinContenido();
  });
}

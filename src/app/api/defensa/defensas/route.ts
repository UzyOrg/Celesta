import { z } from 'zod';
import { atender, conSesionAlumno, leerJson, limitar, limitarPorIp, responder } from '@/lib/defensa/api';
import { iniciarDefensa } from '@/lib/defensa/servicios/defensas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const Esquema = z.object({ ensayo: z.boolean() }).strict();

/**
 * Empieza la defensa (o el ensayo privado). Si ya hay una en curso de la misma
 * versión del trabajo, devuelve esa en su turno actual: así se retoma tras una caída.
 */
export async function POST(request: Request) {
  return atender(async () => {
    limitarPorIp(request, 'defensas', 300);
    const { ctx, sesion } = await conSesionAlumno(request);
    limitar(`defensas:${sesion.alumno.id}`, 20);
    const { ensayo } = await leerJson(request, Esquema, 1024);
    return responder(await iniciarDefensa(ctx, sesion, { ensayo }));
  });
}

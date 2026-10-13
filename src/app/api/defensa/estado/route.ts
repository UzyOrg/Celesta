import { atender, conSesionAlumno, limitar, limitarPorIp, responder } from '@/lib/defensa/api';
import { obtenerEstadoSesion } from '@/lib/defensa/servicios/defensas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Dónde se quedó el alumno: su entrega, su plan, la defensa y el ensayo. Sirve para retomar en otro dispositivo. */
export async function GET(request: Request) {
  return atender(async () => {
    limitarPorIp(request, 'estado', 400);
    const { ctx, sesion } = await conSesionAlumno(request);
    limitar(`estado:${sesion.alumno.id}`, 90);
    return responder(await obtenerEstadoSesion(ctx, sesion));
  });
}

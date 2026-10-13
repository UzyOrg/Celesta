import { atender, conSesionAlumno, idDeLaRuta, limitar, limitarPorIp, responder } from '@/lib/defensa/api';
import { estadoDeUnaDefensa } from '@/lib/defensa/servicios/defensas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface Contexto {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: Contexto) {
  return atender(async () => {
    limitarPorIp(request, 'defensa-estado', 400);
    const { ctx, sesion } = await conSesionAlumno(request);
    limitar(`defensa-estado:${sesion.alumno.id}`, 90);
    return responder(await estadoDeUnaDefensa(ctx, sesion, idDeLaRuta((await params).id)));
  });
}

import { atender, conSesionAlumno, idDeLaRuta, limitar, limitarPorIp, sinContenido } from '@/lib/defensa/api';
import { registrarSalida } from '@/lib/defensa/servicios/defensas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface Contexto {
  params: Promise<{ id: string }>;
}

/** El alumno salió de la defensa. Se mide, pero la defensa queda abierta para retomarla en el mismo turno. */
export async function POST(request: Request, { params }: Contexto) {
  return atender(async () => {
    limitarPorIp(request, 'defensa-salir', 300);
    const { ctx, sesion } = await conSesionAlumno(request);
    limitar(`defensa-salir:${sesion.alumno.id}`, 20);
    await registrarSalida(ctx, sesion, idDeLaRuta((await params).id));
    return sinContenido();
  });
}

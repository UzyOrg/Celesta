import { after } from 'next/server';
import { atender, conSesionAlumno, limitar, limitarPorIp, responder } from '@/lib/defensa/api';
import { prepararPlan } from '@/lib/defensa/servicios/planes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Armar el plan y sintetizar la voz de las preguntas ocupa casi todo este tiempo.
export const maxDuration = 60;

/**
 * Pide que se arme el plan de preguntas de la última entrega (si no está ya armado o en
 * camino) y contesta enseguida cómo va. La pantalla vuelve a preguntar con /estado.
 * Pedirlo varias veces no arma varios planes; si falló, volver a pedirlo lo reintenta.
 */
export async function POST(request: Request) {
  return atender(async () => {
    limitarPorIp(request, 'plan', 300);
    const { ctx, sesion } = await conSesionAlumno(request);
    limitar(`plan:${sesion.alumno.id}`, 12);
    const { estado, trabajo } = await prepararPlan(ctx, sesion);
    if (trabajo) after(trabajo);
    return responder({ plan: estado });
  });
}

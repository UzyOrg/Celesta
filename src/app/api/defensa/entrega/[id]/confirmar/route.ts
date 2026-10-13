import { after } from 'next/server';
import type { RespuestaEntregaTexto } from '@/components/defensa/contrato';
import { atender, conSesionAlumno, idDeLaRuta, limitar, limitarPorIp, responder } from '@/lib/defensa/api';
import { confirmarEntrega } from '@/lib/defensa/servicios/entregas';
import { prepararPlan } from '@/lib/defensa/servicios/planes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface Contexto {
  params: Promise<{ id: string }>;
}

/** El archivo ya está en el bucket: se baja, se le saca el texto y se da por entregado. */
export async function POST(request: Request, { params }: Contexto) {
  return atender(async () => {
    limitarPorIp(request, 'entrega-confirmar', 300);
    const { ctx, sesion } = await conSesionAlumno(request);
    limitar(`entrega-confirmar:${sesion.alumno.id}`, 20);
    const id = idDeLaRuta((await params).id);
    const entrega = await confirmarEntrega(ctx, sesion, id);
    const { trabajo } = await prepararPlan(ctx, sesion);
    if (trabajo) after(trabajo);
    const respuesta: RespuestaEntregaTexto = { entrega };
    return responder(respuesta);
  });
}

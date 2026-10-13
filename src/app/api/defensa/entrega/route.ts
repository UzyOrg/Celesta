import { after } from 'next/server';
import { z } from 'zod';
import type { RespuestaEntregaTexto } from '@/components/defensa/contrato';
import { atender, conSesionAlumno, leerJson, limitar, limitarPorIp, responder } from '@/lib/defensa/api';
import { LIMITES } from '@/lib/defensa/config';
import { entregarTextoPegado, iniciarEntregaArchivo } from '@/lib/defensa/servicios/entregas';
import { prepararPlan } from '@/lib/defensa/servicios/planes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const Esquema = z.discriminatedUnion('tipo', [
  z
    .object({
      tipo: z.literal('archivo'),
      nombre: z.string().min(1).max(300),
      bytes: z.number().int().min(1).max(LIMITES.archivoBytes),
      mime: z.string().max(120),
    })
    .strict(),
  z.object({ tipo: z.literal('texto'), texto: z.string().min(1).max(LIMITES.textoPegadoCaracteres) }).strict(),
]);

/**
 * Entrega del trabajo.
 *  - archivo: reserva el envío y devuelve el enlace de subida directa al bucket; después se confirma.
 *  - texto: se entrega en esta misma llamada.
 */
export async function POST(request: Request) {
  return atender(async () => {
    limitarPorIp(request, 'entrega', 300);
    const { ctx, sesion } = await conSesionAlumno(request);
    limitar(`entrega:${sesion.alumno.id}`, 20);
    // 150 000 caracteres pueden pesar hasta 600 KB en UTF-8.
    const cuerpo = await leerJson(request, Esquema, 700 * 1024);

    if (cuerpo.tipo === 'archivo') {
      return responder(await iniciarEntregaArchivo(ctx, sesion, cuerpo), 201);
    }
    const entrega = await entregarTextoPegado(ctx, sesion, cuerpo.texto);
    // El plan se arma mientras el alumno hace la prueba de micrófono.
    const { trabajo } = await prepararPlan(ctx, sesion);
    if (trabajo) after(trabajo);
    const respuesta: RespuestaEntregaTexto = { entrega };
    return responder(respuesta, 201);
  });
}

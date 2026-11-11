import { z } from 'zod';
import { LIMITES_ASISTENTE, TIPOS_DE_TARJETA, type EventoAsistente } from '@/components/revision/catalogo';
import { NextResponse } from 'next/server';
import { atender, conAccesoProfesor, leerJson, limitar, limitarPorIp } from '@/lib/defensa/api';
import { leerPortador } from '@/lib/defensa/firmas';
import { registrarUsoDelAsistente, responderAsistente } from '@/lib/defensa/servicios/asistenteProfesor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const Esquema = z
  .object({
    peticion: z.string().trim().min(1).max(LIMITES_ASISTENTE.peticion),
    historial: z
      .array(
        z
          .object({
            peticion: z.string().max(LIMITES_ASISTENTE.peticion),
            tipos: z.array(z.enum(TIPOS_DE_TARJETA)).max(3),
          })
          .strict(),
      )
      .max(LIMITES_ASISTENTE.historial)
      .default([]),
  })
  .strict();

/**
 * El asistente del profesor: recibe lo que pidió y contesta con los datos del grupo de su
 * enlace firmado, en NDJSON (una línea JSON por evento): primero los pasos que va dando
 * (`{ tipo: 'paso' }`) y al final la respuesta ya verificada (`{ tipo: 'respuesta' }`).
 * El prompt, la hoja del grupo y la salida cruda del modelo nunca salen del servidor.
 */
export async function POST(request: Request) {
  return atender(async () => {
    limitarPorIp(request, 'asistente', 120);
    const { ctx, actividad } = await conAccesoProfesor(request);
    limitar(`asistente:${actividad.id}`, 30);
    const entrada = await leerJson(request, Esquema, 8 * 1024);
    const token = leerPortador(request);

    const codificador = new TextEncoder();
    const flujo = new ReadableStream<Uint8Array>({
      async start(controlador) {
        const enviar = (evento: EventoAsistente) => controlador.enqueue(codificador.encode(`${JSON.stringify(evento)}\n`));
        try {
          const resultado = await responderAsistente(ctx, actividad, token, entrada, { alPaso: (texto) => enviar({ tipo: 'paso', texto }) });
          enviar({ tipo: 'respuesta', respuesta: resultado.respuesta });
          await registrarUsoDelAsistente(ctx, actividad, resultado).catch(() => undefined);
        } catch (error) {
          console.error('defensa_asistente_error', { nombre: error instanceof Error ? error.name : 'desconocido' });
          enviar({ tipo: 'error', mensaje: 'No pude contestar eso ahora. Intenta otra vez.' });
        } finally {
          controlador.close();
        }
      },
    });
    return new NextResponse(flujo, {
      status: 200,
      headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' },
    });
  });
}

import { atender, conAccesoProfesor, leerBytes, limitar, limitarPorIp, responder } from '@/lib/defensa/api';
import { MAX_DICTADO_BYTES, transcribirDictado } from '@/lib/defensa/servicios/asistenteProfesor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Dictado del profesor en la barra de Celestea: el audio va al transcriptor y vuelve como
 * texto para que lo revise antes de enviarlo. No se guarda. Solo funciona si hay
 * transcripción real configurada (con `mock` responde "no configurado").
 */
export async function POST(request: Request) {
  return atender(async () => {
    limitarPorIp(request, 'asistente-dictado', 60);
    const { ctx, actividad } = await conAccesoProfesor(request);
    limitar(`asistente-dictado:${actividad.id}`, 12);
    const bytes = await leerBytes(request, MAX_DICTADO_BYTES);
    return responder(await transcribirDictado(ctx, bytes, request.headers.get('content-type')));
  });
}

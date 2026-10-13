import { timingSafeEqual } from 'node:crypto';
import { atender, responder } from '@/lib/defensa/api';
import { config } from '@/lib/defensa/config';
import { DefensaError, noAutorizado } from '@/lib/defensa/errores';
import { contextoDeSolicitud } from '@/lib/defensa/servicios/contexto';
import { ejecutarMantenimiento } from '@/lib/defensa/servicios/mantenimiento';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function esElCron(request: Request, secreto: string): boolean {
  const recibido = Buffer.from(request.headers.get('authorization') ?? '');
  const esperado = Buffer.from(`Bearer ${secreto}`);
  return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
}

/**
 * Limpieza diaria (vercel.json → crons): borra el audio a los 7 días, cierra defensas
 * abandonadas, descarta entregas que nunca llegaron y limpia zips viejos. Vercel Cron la
 * llama con `Authorization: Bearer $CRON_SECRET`; sin ese secreto configurado no corre.
 */
export async function GET(request: Request) {
  return atender(async () => {
    const secreto = config.secretoCron();
    if (!secreto || secreto.length < 16) throw new DefensaError('no_configurado', 503);
    if (!esElCron(request, secreto)) throw noAutorizado();
    const resumen = await ejecutarMantenimiento(contextoDeSolicitud());
    return responder({ ok: true, ...resumen });
  });
}

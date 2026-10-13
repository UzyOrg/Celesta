import { z } from 'zod';
import type { RespuestaSesion } from '@/components/defensa/contrato';
import { atender, leerJson, limitar, limitarPorIp, responder } from '@/lib/defensa/api';
import { iniciarSesion } from '@/lib/defensa/servicios/acceso';
import { contextoDeSolicitud } from '@/lib/defensa/servicios/contexto';
import { obtenerEstadoSesion } from '@/lib/defensa/servicios/defensas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const Esquema = z
  .object({
    token: z.string().min(1).max(64),
    nombre: z.string().min(1).max(200),
    matricula: z.string().min(1).max(60),
    consentimientos: z
      .object({ avisoPrivacidad: z.boolean(), transferenciaInternacional: z.boolean(), mayorDeEdad: z.boolean() })
      .strict(),
    modo: z.enum(['voz', 'escrito']),
  })
  .strict();

/** Entrada del alumno: enlace del grupo + nombre + matrícula + las tres confirmaciones. Devuelve su sesión firmada. */
export async function POST(request: Request) {
  return atender(async () => {
    // Un salón entero entra por la misma IP: el límite por IP es amplio y el fino es por persona.
    limitarPorIp(request, 'sesion', 150);
    const cuerpo = await leerJson(request, Esquema, 4 * 1024);
    limitar(`sesion:${cuerpo.token.toLowerCase()}:${cuerpo.matricula.toLowerCase()}`, 15);
    const ctx = contextoDeSolicitud();
    const resultado = await iniciarSesion(ctx, cuerpo, request.headers.get('user-agent'));
    const estado = await obtenerEstadoSesion(ctx, { alumno: resultado.alumno, actividad: resultado.actividad });
    const respuesta: RespuestaSesion = { sesion: resultado.sesion, expiraEn: resultado.expiraEn, estado };
    return responder(respuesta);
  });
}

import { atender, conSesionAlumno, idDeLaRuta, leerBytes, limitar, limitarPorIp, sinContenido } from '@/lib/defensa/api';
import { LIMITES } from '@/lib/defensa/config';
import { subirArchivoPorApi } from '@/lib/defensa/servicios/entregas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface Contexto {
  params: Promise<{ id: string }>;
}

/**
 * Respaldo de la subida: si el navegador no puede subir directo al bucket, el archivo
 * llega por aquí, hasta 4 MB (el límite de cuerpo de las funciones de Vercel es 4.5 MB).
 */
export async function PUT(request: Request, { params }: Contexto) {
  return atender(async () => {
    limitarPorIp(request, 'entrega-archivo', 300);
    const { ctx, sesion } = await conSesionAlumno(request);
    limitar(`entrega-archivo:${sesion.alumno.id}`, 10);
    const id = idDeLaRuta((await params).id);
    const bytes = await leerBytes(request, LIMITES.archivoPorApiBytes);
    await subirArchivoPorApi(ctx, sesion, id, bytes);
    return sinContenido();
  });
}

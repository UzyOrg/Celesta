import { atender, conSesionAlumno, enteroDeLaDireccion, idDeLaRuta, leerBytes, limitar, limitarPorIp, sinContenido } from '@/lib/defensa/api';
import { LIMITES } from '@/lib/defensa/config';
import { subirParteAudio } from '@/lib/defensa/servicios/defensas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface Contexto {
  params: Promise<{ id: string }>;
}

/**
 * Una parte del audio de una respuesta (unos 4 segundos). `?i=` es el número de la parte
 * y `?intento=` el de la grabación: subir la misma parte otra vez la reemplaza, así los
 * reintentos de una red mala no ensucian nada.
 */
export async function PUT(request: Request, { params }: Contexto) {
  return atender(async () => {
    limitarPorIp(request, 'turno-audio', 1200);
    const { ctx, sesion } = await conSesionAlumno(request);
    // Una parte cada 4 s son 15 por minuto; el tope deja margen para reintentos.
    limitar(`turno-audio:${sesion.alumno.id}`, 240);
    const id = idDeLaRuta((await params).id);
    const parte = enteroDeLaDireccion(request, 'i', 0, 599);
    const intento = enteroDeLaDireccion(request, 'intento', 0, 99, 0);
    const bytes = await leerBytes(request, LIMITES.parteAudioBytes);
    await subirParteAudio(ctx, sesion, id, { intento, parte, bytes });
    return sinContenido();
  });
}

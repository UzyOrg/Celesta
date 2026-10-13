import { NextResponse } from 'next/server';
import { estadoMemoriaGlobal, leerArchivoDev, verificarEnlaceDev } from '@/lib/defensa/almacen/memoria';
import { tipoDeAlmacen } from '@/lib/defensa/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_ENCONTRADO = () => NextResponse.json({ error: 'no_encontrado' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });

/**
 * SOLO DESARROLLO Y PRUEBAS. Sirve los archivos del almacén en memoria con enlaces firmados
 * que caducan, igual que lo harían los enlaces de Supabase Storage. Con el almacén de
 * Supabase (el de producción) esta ruta no existe: responde 404.
 */
export async function GET(request: Request) {
  if (tipoDeAlmacen() !== 'memoria') return NO_ENCONTRADO();
  const url = new URL(request.url);
  const clave = url.searchParams.get('k') ?? '';
  const expira = Number(url.searchParams.get('e'));
  const firma = url.searchParams.get('f') ?? '';
  if (!clave || !verificarEnlaceDev(clave, expira, firma)) return NO_ENCONTRADO();

  const archivo = leerArchivoDev(estadoMemoriaGlobal(), clave);
  if (!archivo) return NO_ENCONTRADO();

  const total = archivo.datos.byteLength;
  const encabezados: Record<string, string> = {
    'Content-Type': archivo.mime,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  };

  // Los reproductores piden el audio por tramos (Range) para poder saltar a un segundo.
  const rango = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') ?? '');
  if (rango) {
    const inicio = rango[1] ? Number(rango[1]) : 0;
    const fin = rango[2] ? Math.min(Number(rango[2]), total - 1) : total - 1;
    if (inicio > fin || inicio >= total) {
      return new NextResponse(null, { status: 416, headers: { ...encabezados, 'Content-Range': `bytes */${total}` } });
    }
    return new NextResponse(archivo.datos.slice(inicio, fin + 1), {
      status: 206,
      headers: { ...encabezados, 'Content-Range': `bytes ${inicio}-${fin}/${total}`, 'Content-Length': String(fin - inicio + 1) },
    });
  }
  return new NextResponse(archivo.datos, { status: 200, headers: { ...encabezados, 'Content-Length': String(total) } });
}

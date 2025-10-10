import { NextResponse } from 'next/server';
import { getTallerContent } from '@/lib/supabase/talleres';

export const runtime = 'nodejs';
export const revalidate = 0;

/**
 * GET /api/talleres/[id]
 * Retorna el contenido completo de un taller (oficial o personalizado)
 * 
 * Arquitectura híbrida:
 * - Talleres oficiales: carga desde /workshops/*.json
 * - Talleres personalizados: carga desde DB
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID de taller requerido' },
        { status: 400 }
      );
    }
    
    const { data, error } = await getTallerContent(id);
    
    if (error || !data) {
      console.error('[GET /api/talleres/[id]] Error:', error);
      return NextResponse.json(
        { error: 'Taller no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      id: data.id,
      nombre: data.nombre,
      descripcion: data.descripcion,
      etiquetas: data.etiquetas,
      contenido: data.contenido,
    });
    
  } catch (error) {
    console.error('[GET /api/talleres/[id]] Exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

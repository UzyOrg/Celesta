import { NextResponse } from 'next/server';
import { getTallerContent } from '@/lib/supabase/talleres';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const revalidate = 0;

const WORKSHOP_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const EXAMPLES_DIRECTORY = path.resolve(process.cwd(), 'src', 'lib', 'workshops', 'examples');

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
    
    if (!id || !WORKSHOP_ID_PATTERN.test(id)) {
      return NextResponse.json(
        { error: 'ID de taller inválido' },
        { status: 400 }
      );
    }
    
    const { data, error } = await getTallerContent(id);
    
    if (error || !data) {
      // Fallback: intentar cargar desde src/lib/workshops/examples/{id}.json (dev)
      try {
        const localPath = path.resolve(EXAMPLES_DIRECTORY, `${id}.json`);
        if (!localPath.startsWith(`${EXAMPLES_DIRECTORY}${path.sep}`)) {
          return NextResponse.json({ error: 'ID de taller inválido' }, { status: 400 });
        }
        if (fs.existsSync(localPath)) {
          const contenido = JSON.parse(fs.readFileSync(localPath, 'utf-8'));
          return NextResponse.json({
            id,
            nombre: contenido.titulo ?? id,
            descripcion: null,
            etiquetas: [],
            contenido,
          });
        }
      } catch (localErr) {
        console.error('[GET /api/talleres/[id]] Local fallback failed:', localErr);
      }
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

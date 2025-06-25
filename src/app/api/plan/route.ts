import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Helper function to replace placeholders in a string
function replacePlaceholders(text: string, tema?: string, grado?: string): string {
  let result = text;
  if (tema) {
    result = result.replace(/{{tema}}/g, tema);
  }
  if (grado) {
    result = result.replace(/{{grado}}/g, grado);
  }
  return result;
}

// Helper function to recursively replace placeholders in an object
function processObject(obj: any, tema?: string, grado?: string): any {
  if (typeof obj === 'string') {
    return replacePlaceholders(obj, tema, grado);
  }
  if (Array.isArray(obj)) {
    return obj.map(item => processObject(item, tema, grado));
  }
  if (typeof obj === 'object' && obj !== null) {
    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = processObject(obj[key], tema, grado);
      }
    }
    return newObj;
  }
  return obj;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { materia, grado } = body;
    let tema = body.tema; // 'tema' is now optional

    if (!materia || !grado) {
      return NextResponse.json({ error: 'Faltan parámetros: materia y grado son requeridos.' }, { status: 400 });
    }

    // If no specific topic is provided, use the subject's name as a default topic.
    if (!tema) {
      tema = materia.charAt(0).toUpperCase() + materia.slice(1);
    }

    // Normalize materia to match file names (e.g., 'Algebra' -> 'algebra')
    const normalizedMateria = materia.toLowerCase().replace(/\s+/g, '_');
    
    // Construct path to templates directory (assuming it's at the project root, outside 'src')
    // The project root is c:\Users\PC\Desktop\project-edTech\Celesta
    const templatesDir = path.join(process.cwd(), 'templates');
    
    let templatePath = path.join(templatesDir, `${normalizedMateria}.json`);
    const fallbackTemplatePath = path.join(templatesDir, 'generico.json');

    let planContent;
    try {
      planContent = await fs.readFile(templatePath, 'utf-8');
    } catch (error) {
      // If specific template not found, try fallback
      console.warn(`Plantilla para '${normalizedMateria}' no encontrada, usando 'generico.json'.`);
      try {
        planContent = await fs.readFile(fallbackTemplatePath, 'utf-8');
      } catch (fallbackError) {
        console.error(`Error al leer la plantilla genérica: ${fallbackError}`);
        return NextResponse.json({ error: 'No se pudo cargar la plantilla del plan de estudios.' }, { status: 500 });
      }
    }

    let planData = JSON.parse(planContent);

    // Replace placeholders
    planData = processObject(planData, tema, grado);

    return NextResponse.json(planData);

  } catch (error) {
    console.error('Error en /api/plan:', error);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Cuerpo de la solicitud inválido (JSON malformado).' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Ocurrió un error interno en el servidor.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';

// Mock data for the lesson plan
const mockPlan = {
  objetivo: "Que los estudiantes comprendan y apliquen el concepto de fracciones equivalentes para resolver problemas.",
  estructura: [
    "Introducción (5 min): Presentar el concepto de 'partes de un todo'.",
    "Modelado (10 min): Mostrar con ejemplos visuales cómo 1/2 es igual a 2/4.",
    "Práctica Guiada (15 min): Resolver 3 problemas en conjunto.",
    "Práctica Independiente (10 min): Los alumnos resuelven 5 ejercicios.",
    "Cierre (5 min): Repaso rápido y ticket de salida."
  ],
  rubrica: [
    { criterio: "Comprensión del Concepto", nivel: "Identifica y crea fracciones equivalentes." },
    { criterio: "Aplicación en Problemas", nivel: "Usa las fracciones para resolver situaciones dadas." },
    { criterio: "Participación", nivel: "Colabora activamente en la práctica guiada." },
  ]
};

export async function POST(request: Request) {
  // In the future, you could read the topic from the request body
  // const { topic } = await request.json();

  // For now, we return the hardcoded plan after a short delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  return NextResponse.json(mockPlan);
}

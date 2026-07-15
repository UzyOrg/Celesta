import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type {
  ClassifyResponse,
  CrearPaso,
  CrearWorkshop,
} from '@/lib/crear/types';
import { classifyCrearLocally } from '@/lib/crear/localClassifier';
import { validateCrearWorkshopJson } from '@/lib/crear/validation';
import type { CrearClassifierBranch } from '@/lib/crear/types';
import { CREAR_MAX_ANSWER_LENGTH } from '@/lib/crear/types';

export const runtime = 'nodejs';

const CrearLessonIdSchema = z.enum([
  'CREAR-ENGLISH-DEDUCTION-V1',
  'CREAR-VIDEOJUEGO',
  'CREAR-CANCION',
  'CREAR-REDES',
]);

const ClassifyRequestSchema = z.object({
  tallerId: CrearLessonIdSchema,
  pasoRefId: z.string().min(1).max(80),
  texto: z.string().min(1).max(CREAR_MAX_ANSWER_LENGTH),
});

const ModelResponseSchema = z.object({
  rama: z.string().min(1).max(80),
  confianza: z.number().min(0).max(1),
});

interface LocalClassification {
  rama: string;
  confianza: number;
}

interface OpenAIChatChoice {
  message?: {
    content?: string | null;
  };
}

interface OpenAIChatResponse {
  choices?: OpenAIChatChoice[];
}

function loadWorkshopFromPublic(id: string): CrearWorkshop {
  const filePath = path.join(process.cwd(), 'public', 'workshops', `${id}.json`);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return validateCrearWorkshopJson(JSON.parse(raw) as unknown);
}

function findStep(workshop: CrearWorkshop, pasoRefId: string): CrearPaso | null {
  return workshop.pasos.find((paso) => paso.ref_id === pasoRefId) ?? null;
}

function buildClassifierPrompt(texto: string, ramas: CrearClassifierBranch[]): string {
  const branchList = ramas.map((branch) => ({
    rama: branch.rama,
    descripcion: branch.descripcion,
    ejemplos: branch.ejemplos ?? [],
  }));

  return [
    'Clasifica la respuesta del estudiante en exactamente una rama permitida.',
    'No escribas feedback, contenido de clase, explicaciones ni texto para UI.',
    'Responde solo JSON valido con esta forma: {"rama":"...","confianza":0.0}.',
    `Ramas permitidas: ${JSON.stringify(branchList)}`,
    `Respuesta del estudiante: ${JSON.stringify(texto)}`,
  ].join('\n');
}

async function classifyWithModel(
  texto: string,
  ramas: CrearClassifierBranch[]
): Promise<LocalClassification | null> {
  const apiKey = process.env.CREAR_CLASSIFIER_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey || process.env.CREAR_CLASSIFIER_FORCE_LOCAL === '1') {
    return null;
  }

  const model = process.env.CREAR_CLASSIFIER_MODEL ?? 'gpt-4o-mini';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'Eres un clasificador estricto. Solo eliges ramas preautorizadas.',
        },
        {
          role: 'user',
          content: buildClassifierPrompt(texto, ramas),
        },
      ],
    }),
    signal: AbortSignal.timeout(4500),
  });

  if (!res.ok) return null;

  const json = (await res.json()) as OpenAIChatResponse;
  const content = json.choices?.[0]?.message?.content;
  if (!content) return null;

  return ModelResponseSchema.parse(JSON.parse(content) as unknown);
}

function sanitizeClassification(
  classification: LocalClassification,
  ramas: CrearClassifierBranch[],
  fallbackRama: string,
  minConfianza: number
): ClassifyResponse {
  const allowed = new Set(ramas.map((branch) => branch.rama));
  if (!allowed.has(classification.rama) || classification.confianza < minConfianza) {
    return { rama: fallbackRama, confianza: Math.min(classification.confianza, minConfianza) };
  }

  return {
    rama: classification.rama,
    confianza: Number(classification.confianza.toFixed(2)),
  };
}

export async function POST(req: Request) {
  try {
    const body = ClassifyRequestSchema.parse(await req.json());
    const workshop = loadWorkshopFromPublic(body.tallerId);
    const step = findStep(workshop, body.pasoRefId);
    const classifier = step?.crear?.classifier;

    if (!step || !classifier || classifier.ramas.length === 0) {
      return NextResponse.json({ error: 'classifier_not_found' }, { status: 404 });
    }

    const local = classifyCrearLocally(body.texto, classifier);
    let classification = local;

    try {
      const modelClassification = await classifyWithModel(body.texto, classifier.ramas);
      if (modelClassification) {
        classification = modelClassification;
      }
    } catch (error) {
      console.error('[api/classify] model_error', (error as Error).message);
    }

    const response = sanitizeClassification(
      classification,
      classifier.ramas,
      classifier.fallbackRama,
      classifier.minConfianza
    );

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'invalid_payload', details: error.flatten() }, { status: 400 });
    }

    console.error('[api/classify] unexpected', (error as Error).message);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

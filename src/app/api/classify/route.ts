import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type {
  ClassifyResponse,
  CrearPaso,
  CrearLessonId,
  CrearResponsePartAnswer,
  CrearWorkshop,
} from '@/lib/crear/types';
import {
  classifyCrearLocally,
  classifyCrearResponseStructure,
} from '@/lib/crear/localClassifier';
import { validateCrearWorkshopJson } from '@/lib/crear/validation';
import type { CrearClassifierBranch } from '@/lib/crear/types';
import {
  ALL_CREAR_LESSON_IDS,
  CREAR_MAX_ANSWER_LENGTH,
  CREAR_MAX_RESPONSE_PART_LENGTH,
} from '@/lib/crear/types';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';
/** The model call aborts at 4.5s; this is the ceiling for the whole request. */
export const maxDuration = 10;

const CrearLessonIdSchema = z.enum(
  [...ALL_CREAR_LESSON_IDS] as [CrearLessonId, ...CrearLessonId[]]
);

const CLASSIFY_RATE_LIMIT = 30;
const CLASSIFY_RATE_WINDOW_MS = 60_000;
const workshopCache = new Map<CrearLessonId, CrearWorkshop>();

const ClassifyRequestSchema = z.object({
  tallerId: CrearLessonIdSchema,
  pasoRefId: z.string().min(1).max(80),
  texto: z.string().min(1).max(CREAR_MAX_ANSWER_LENGTH),
  partes: z.array(z.object({
    categoria: z.enum(['casi_seguro', 'posible', 'imposible']),
    texto: z.string().min(1).max(CREAR_MAX_RESPONSE_PART_LENGTH),
  })).max(3).optional(),
});

const ModelResponseSchema = z.object({
  rama: z.string().min(1).max(80),
  confianza: z.number().min(0).max(1),
});

interface LocalClassification {
  rama: string;
  confianza: number;
}

/**
 * Above this, a local branch that matched an authored structural rule is
 * treated as deterministic evidence rather than a guess.
 */
const LOCAL_STRUCTURAL_CONFIDENCE = 0.8;

function isStructuralLocalMatch(
  local: LocalClassification,
  classifier: { ramas: CrearClassifierBranch[]; fallbackRama: string }
): boolean {
  if (local.rama === classifier.fallbackRama) return false;
  if (local.confianza < LOCAL_STRUCTURAL_CONFIDENCE) return false;
  const branch = classifier.ramas.find((candidate) => candidate.rama === local.rama);
  const match = branch?.match;
  return Boolean(
    match &&
    ((match.all?.length ?? 0) > 0 ||
      (match.allGroups?.length ?? 0) > 0 ||
      (match.any?.length ?? 0) > 0)
  );
}

interface OpenAIChatChoice {
  message?: {
    content?: string | null;
  };
}

interface OpenAIChatResponse {
  choices?: OpenAIChatChoice[];
}

function loadWorkshopFromPublic(id: CrearLessonId): CrearWorkshop {
  const cached = workshopCache.get(id);
  if (cached) return cached;
  const filePath = path.join(process.cwd(), 'public', 'workshops', `${id}.json`);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const workshop = validateCrearWorkshopJson(JSON.parse(raw) as unknown);
  workshopCache.set(id, workshop);
  return workshop;
}

function findStep(workshop: CrearWorkshop, pasoRefId: string): CrearPaso | null {
  return workshop.pasos.find((paso) => paso.ref_id === pasoRefId) ?? null;
}

function buildClassifierPrompt(
  texto: string,
  ramas: CrearClassifierBranch[],
  parts?: CrearResponsePartAnswer[]
): string {
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
    parts?.length ? `Respuestas separadas por categoria: ${JSON.stringify(parts)}` : '',
    `Respuesta del estudiante: ${JSON.stringify(texto)}`,
  ].filter(Boolean).join('\n');
}

async function classifyWithModel(
  texto: string,
  ramas: CrearClassifierBranch[],
  parts?: CrearResponsePartAnswer[]
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
          content: buildClassifierPrompt(texto, ramas, parts),
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
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(
      `crear:classify:${ip}`,
      CLASSIFY_RATE_LIMIT,
      CLASSIFY_RATE_WINDOW_MS
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'rate_limited' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) },
        }
      );
    }

    const body = ClassifyRequestSchema.parse(await req.json());
    const workshop = loadWorkshopFromPublic(body.tallerId);
    const step = findStep(workshop, body.pasoRefId);
    const classifier = step?.crear?.classifier;

    if (!step || !classifier || classifier.ramas.length === 0) {
      return NextResponse.json({ error: 'classifier_not_found' }, { status: 404 });
    }

    const structureResult = classifyCrearResponseStructure(body.partes, classifier);
    if (structureResult) {
      return NextResponse.json({
        ...structureResult,
        source: 'local',
        localRama: structureResult.rama,
        localConfianza: structureResult.confianza,
      } satisfies ClassifyResponse);
    }

    const local = classifyCrearLocally(body.texto, classifier, body.partes);
    let model: LocalClassification | null = null;

    try {
      model = await classifyWithModel(body.texto, classifier.ramas, body.partes);
    } catch (error) {
      console.error('[api/classify] model_error', (error as Error).message);
    }

    /**
     * The model no longer overwrites local silently. A deterministic rule that
     * already matched the authored structure outranks a model answer that
     * disagrees with it, and the disagreement itself is recorded: where the
     * regex and the model diverge is where the learner wrote something the
     * author did not anticipate.
     */
    const agreed = model ? model.rama === local.rama : undefined;
    const preferLocal = Boolean(
      model && !agreed && isStructuralLocalMatch(local, classifier)
    );
    const chosen = model && !preferLocal ? model : local;
    const source: 'model' | 'local' = model && !preferLocal ? 'model' : 'local';

    if (model && !agreed) {
      console.info(
        '[api/classify] disagreement',
        JSON.stringify({
          pasoRefId: body.pasoRefId,
          localRama: local.rama,
          localConfianza: local.confianza,
          modelRama: model.rama,
          modelConfianza: model.confianza,
          source,
          needsHumanReview: true,
        })
      );
    }

    const response: ClassifyResponse = {
      ...sanitizeClassification(
        chosen,
        classifier.ramas,
        classifier.fallbackRama,
        classifier.minConfianza
      ),
      source,
      localRama: local.rama,
      localConfianza: local.confianza,
      ...(model
        ? { modelRama: model.rama, modelConfianza: model.confianza, agreed }
        : {}),
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'invalid_payload', details: error.flatten() }, { status: 400 });
    }

    console.error('[api/classify] unexpected', (error as Error).message);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

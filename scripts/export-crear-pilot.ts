import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  CREAR_RETEST_DELAY_MS,
  CREAR_RETEST_TICKET_TTL_MS,
  createCrearRetestTicket,
} from '../src/lib/crear/retestTicket';

loadEnv({ path: '.env.local', override: false });

interface EventRow {
  id: number;
  client_event_id: string;
  student_session_id: string | null;
  student_alias: string | null;
  class_token: string | null;
  taller_id: string;
  paso_id: string;
  verbo: string;
  result: Record<string, unknown> | null;
  ts: string;
  client_ts: string | null;
}

interface Args {
  classToken: string;
  outputDirectory: string;
  baseUrl?: string;
}

function parseArgs(argv: string[]): Args {
  // Package managers may keep the argument separator in `process.argv`.
  // Normalize it so `npm/pnpm run ... -- TOKEN` never queries a cohort named
  // literally `--`.
  const cliArgs = argv.slice(2).filter((argument) => argument !== '--');
  const classToken = cliArgs[0]?.trim();
  if (!classToken || !/^[A-Za-z0-9_-]{1,64}$/.test(classToken)) {
    throw new Error('Uso: npm run pilot:export -- <CLASS_TOKEN> [--out <directorio>] [--base-url <url>]');
  }
  const outIndex = cliArgs.indexOf('--out');
  const baseIndex = cliArgs.indexOf('--base-url');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return {
    classToken,
    outputDirectory: resolve(outIndex >= 0 && cliArgs[outIndex + 1]
      ? cliArgs[outIndex + 1]!
      : `/private/tmp/celestea-pilot-${classToken}-${stamp}`),
    baseUrl: (baseIndex >= 0 ? cliArgs[baseIndex + 1] : process.env.NEXT_PUBLIC_SITE_URL)?.replace(/\/$/, ''),
  };
}

function resultOf(row: EventRow): Record<string, unknown> {
  return row.result && typeof row.result === 'object' ? row.result : {};
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function studyIdOf(row: EventRow): string {
  return stringValue(resultOf(row).studyId);
}

function participantOf(row: EventRow): string {
  return row.student_alias?.trim() || stringValue(resultOf(row).alias).trim() || 'DESCONOCIDO';
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined
    ? ''
    : typeof value === 'string'
      ? value
      : JSON.stringify(value);
  const singleLine = text.replace(/\r?\n/g, ' ');
  // Spreadsheet programs can execute learner-authored values beginning with a
  // formula sigil even when the CSV cell is quoted. Prefixing an apostrophe
  // keeps raw evidence visible while forcing it to remain inert text.
  const inert = /^[=+\-@\t]/.test(singleLine) ? `'${singleLine}` : singleLine;
  return `"${inert.replace(/"/g, '""')}"`;
}

function safeMarkdownInline(value: string): string {
  return value
    .replace(/[\r\n]+/g, ' ')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`/g, "'");
}

function opportunity(row: EventRow): Record<string, unknown> {
  const value = resultOf(row).learningOpportunity;
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function observationLabel(row: EventRow): 'baseline' | 'supported' | 'transfer' | 'd7' | 'process' {
  const learning = opportunity(row);
  if (learning.timing === 'delayed') return 'd7';
  if (
    learning.condition === 'independent'
    && learning.novelty === 'same_case'
    && learning.timing === 'immediate'
  ) return 'baseline';
  if (learning.condition === 'supported') return 'supported';
  if (learning.condition === 'independent' && learning.novelty === 'new_case') return 'transfer';
  return 'process';
}

function answerStatus(row: EventRow): string {
  const result = resultOf(row);
  if (result.observed === false) return 'desconocido (omitido)';
  if (typeof result.correcto === 'boolean') return result.correcto ? 'correcto' : 'incorrecto';
  return 'no calificable';
}

function formatObservation(row: EventRow): string {
  const result = resultOf(row);
  const text = stringValue(result.texto);
  const support = result.assisted === true ? 'asistido' : 'independiente';
  return `- ${safeMarkdownInline(row.paso_id)}: ${answerStatus(row)} · ${support}${
    text ? ` · “${safeMarkdownInline(text)}”` : ''
  }`;
}

function buildRetestLink(rows: EventRow[], args: Args): string | null {
  const milestone = rows.find((row) => resultOf(row).milestone === 'day1_complete');
  const secret = process.env.CREAR_RETEST_SIGNING_SECRET ?? '';
  if (!milestone || !args.baseUrl || secret.length < 32) return null;
  const studyId = studyIdOf(milestone);
  const participantCode = participantOf(milestone);
  const completedAt = Date.parse(milestone.ts);
  if (
    !studyId ||
    participantCode === 'DESCONOCIDO' ||
    participantCode.length > 64 ||
    !Number.isFinite(completedAt)
  ) return null;
  const notBefore = completedAt + CREAR_RETEST_DELAY_MS;
  const expiresAt = notBefore + CREAR_RETEST_TICKET_TTL_MS;
  const issuedAt = Date.now();
  if (issuedAt >= expiresAt) return null;
  const ticket = createCrearRetestTicket(secret, {
    version: 1,
    classToken: args.classToken,
    participantCode,
    studyId,
    lessonId: milestone.taller_id,
    issuedAt,
    notBefore,
    expiresAt,
  });
  return `${args.baseUrl}/crear#rt=${encodeURIComponent(ticket)}`;
}

function humanProjection(key: string, rows: EventRow[], args: Args): string {
  const participant = participantOf(rows[0]!);
  const studyId = studyIdOf(rows.find((row) => studyIdOf(row)) ?? rows[0]!);
  const answers = rows.filter((row) => row.verbo === 'envio_respuesta');
  const select = (label: ReturnType<typeof observationLabel>) =>
    answers.filter((row) => observationLabel(row) === label);
  const supports = answers.filter((row) => resultOf(row).assisted === true);
  const market = rows.filter((row) => resultOf(row).marketSignal === 'next_challenge');
  const missing: string[] = [];
  if (!studyId) missing.push('studyId ausente: la traza no puede unirse longitudinalmente');
  if (participant === 'DESCONOCIDO') missing.push('código de participante ausente');
  if (!rows.some((row) => resultOf(row).milestone === 'day1_complete')) {
    missing.push('cierre D1 no observado');
  }
  if (select('baseline').length === 0) missing.push('baseline calificable ausente');
  if (select('d7').length === 0) missing.push('D7 todavía no observado');
  const retestLink = buildRetestLink(rows, args);

  const section = (title: string, entries: EventRow[], empty: string) => [
    `### ${title}`,
    '',
    entries.length ? entries.map(formatObservation).join('\n') : `- ${empty}`,
    '',
  ].join('\n');

  return [
    `## ${safeMarkdownInline(participant)} · ${safeMarkdownInline(studyId || key)}`,
    '',
    `- Eventos: ${rows.length}`,
    `- Primera fila: ${rows[0]?.ts ?? 'desconocida'}`,
    `- Última fila: ${rows.at(-1)?.ts ?? 'desconocida'}`,
    `- Enlace D7: ${retestLink ?? 'no generado (falta milestone, URL base o secreto de firma)'}`,
    '',
    section('1. Qué observamos antes', select('baseline'), 'No observado.'),
    section('2. Qué pudo hacer en un caso nuevo', select('transfer'), 'No observado.'),
    section('3. Qué apoyo utilizó', supports, 'No se registró apoyo.'),
    section('4. Qué volvió a demostrar una semana después', select('d7'), 'Todavía no observado.'),
    '### 5. Qué todavía no sabemos',
    '',
    ...(missing.length ? missing.map((item) => `- ${item}`) : ['- No hay faltantes estructurales detectados.']),
    '',
    '### 6. Qué reto eligió ahora',
    '',
    ...(market.length
      ? market.map((row) => {
          const result = resultOf(row);
          return `- ${stringValue(result.moment)} · ${stringValue(result.stage)} · ${stringValue(result.objective) || 'sin objetivo'}`;
        })
      : ['- No expresó una elección.']),
    '',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // Supabase commonly caps one response at 1,000 rows even when `.limit()` asks
  // for more. Page explicitly so the reader never turns a large pilot into a
  // plausible-looking partial export.
  const rows: EventRow[] = [];
  const pageSize = 1_000;
  for (let from = 0; ; from += pageSize) {
    let query = admin
      .from('eventos_de_aprendizaje')
      .select('id,client_event_id,student_session_id,student_alias,class_token,taller_id,paso_id,verbo,result,ts,client_ts')
      .order('ts', { ascending: true })
      .order('client_ts', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    query = args.classToken === 'ANONYMOUS'
      ? query.is('class_token', null).eq('taller_id', 'CREAR-ENGLISH-DEDUCTION-V1')
      : query.eq('class_token', args.classToken);
    const { data, error } = await query;
    if (error) throw new Error(`Supabase: ${error.message}`);
    const page = (data ?? []) as EventRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  const groups = new Map<string, EventRow[]>();
  for (const row of rows) {
    const studyId = studyIdOf(row);
    const key = studyId
      ? `${participantOf(row)}:${studyId}`
      : `UNJOINED:${row.client_event_id || row.id}`;
    const entries = groups.get(key) ?? [];
    entries.push(row);
    groups.set(key, entries);
  }

  const headers = [
    'participant_code', 'study_id', 'joined', 'ts', 'verbo', 'paso_id', 'phase',
    'observation', 'observed', 'correct', 'text', 'attempt', 'assisted',
    'form_well_formed', 'subject_present', 'expressed_category',
    'certainty_consistent', 'cue_frame', 'shown_order', 'classifier_source',
    'classifier_agreed', 'latency_ms', 'milestone', 'market_stage', 'market_objective',
  ];
  const csvRows = rows.map((row) => {
    const result = resultOf(row);
    const learning = opportunity(row);
    return [
      participantOf(row), studyIdOf(row), Boolean(studyIdOf(row)), row.ts, row.verbo,
      row.paso_id, result.fase, observationLabel(row), result.observed ?? true,
      result.correcto, result.texto, result.attempt ?? result.intento, result.assisted,
      result.formWellFormed, result.subjectPresent, result.expressedCategory,
      result.certaintyConsistent, learning.cueFrame, result.shownOrder,
      result.classifierSource, result.classifierAgreed, result.latencyMs,
      result.milestone, result.stage, result.objective,
    ].map(csvCell).join(',');
  });

  await mkdir(args.outputDirectory, { recursive: true, mode: 0o700 });
  await chmod(args.outputDirectory, 0o700);
  await writeFile(
    resolve(args.outputDirectory, 'crear-events-flat.csv'),
    `${headers.map(csvCell).join(',')}\n${csvRows.join('\n')}\n`,
    'utf8'
  );
  const markdown = [
    '# Lector interno · Piloto `/crear`',
    '',
    `- Cohorte: ${args.classToken}`,
    `- Filas: ${rows.length}`,
    `- Estudios/trazas: ${groups.size}`,
    '- Los códigos DESCONOCIDO/UNJOINED son faltantes explícitos; ninguna fila se descarta.',
    '',
    ...Array.from(groups.entries()).map(([key, entries]) => humanProjection(key, entries, args)),
  ].join('\n');
  await writeFile(resolve(args.outputDirectory, 'crear-participants.md'), markdown, 'utf8');
  await Promise.all([
    chmod(resolve(args.outputDirectory, 'crear-events-flat.csv'), 0o600),
    chmod(resolve(args.outputDirectory, 'crear-participants.md'), 0o600),
  ]);

  process.stdout.write(`${args.outputDirectory}\n${rows.length} filas · ${groups.size} trazas\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${(error as Error).message}\n`);
  process.exitCode = 1;
});

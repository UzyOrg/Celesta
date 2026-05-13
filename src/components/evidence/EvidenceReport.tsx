"use client";
/**
 * EvidenceReport — Reporte académico de aprendizaje durable.
 *
 * Muestra al alumno (y, vía descarga, a su escuela/coordinador) la evidencia
 * de su aprendizaje en un formato:
 *   - Sobrio (no gamificado)
 *   - Auditable (hash criptográfico, fechas, tiempos)
 *   - Constructivo (banding cualitativo, no punitivo)
 *   - Privado (es del alumno, decide compartir)
 *
 * Es la pieza central del Pasaporte Cognitivo.
 */

import React from 'react';
import {
  Award,
  Calendar,
  Clock,
  Download,
  FileText,
  GraduationCap,
  Lock,
  Sparkles,
  Target,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { bandToNarrative } from '@/lib/ird';
import type { EvidenceData } from '@/lib/evidence/mockData';

type Props = {
  data: EvidenceData;
};

// ============================================
// HELPERS
// ============================================

function formatDuration(totalSec: number): string {
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins} min`;
  return `${mins} min ${secs}s`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function bandStyles(band: string): { bg: string; text: string; border: string } {
  switch (band) {
    case 'durable':
      return { bg: 'bg-green-50', text: 'text-green-900', border: 'border-green-300' };
    case 'fragile':
      return { bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-300' };
    case 'shallow':
      return { bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-300' };
    default:
      return { bg: 'bg-neutral-100', text: 'text-neutral-700', border: 'border-neutral-300' };
  }
}

// ============================================
// SUBCOMPONENTES
// ============================================

function ScoreBar({
  label,
  value,
  weight,
  isPreliminary,
}: {
  label: string;
  value: number;
  weight: number;
  isPreliminary?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline text-sm">
        <span className="font-medium text-neutral-700">
          {label} <span className="text-xs text-neutral-500">({Math.round(weight * 100)}%)</span>
        </span>
        <span className="font-mono text-neutral-900">
          {value}
          {isPreliminary && <span className="text-xs text-amber-600 ml-1">(prelim.)</span>}
        </span>
      </div>
      <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            value >= 80
              ? 'bg-green-500'
              : value >= 60
                ? 'bg-amber-500'
                : value >= 40
                  ? 'bg-orange-500'
                  : 'bg-red-500'
          }`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function StepRow({ step }: { step: EvidenceData['steps'][number] }) {
  const stateLabel = step.correctOnFirstTry
    ? 'Resuelto al primer intento'
    : step.completed
      ? `Resuelto tras ${step.intentosFallidos} intento${step.intentosFallidos === 1 ? '' : 's'} fallido${step.intentosFallidos === 1 ? '' : 's'}`
      : 'No completado';

  return (
    <div className="grid grid-cols-12 gap-2 py-2 border-b border-neutral-200 text-sm last:border-b-0">
      <div className="col-span-1 font-mono text-neutral-500">{step.pasoNumero}</div>
      <div className="col-span-5 text-neutral-800">
        <div className="font-medium">{step.title}</div>
        <div className="text-xs text-neutral-500">{step.type}</div>
      </div>
      <div className="col-span-2 text-neutral-700 font-mono text-xs flex items-center">
        <Clock className="w-3 h-3 mr-1 text-neutral-400" />
        {formatDuration(step.timeSec)}
      </div>
      <div className="col-span-2 text-neutral-700 text-xs flex items-center">
        {step.pistasUsadas > 0 ? (
          <span className="text-amber-700">
            {step.pistasUsadas} pista{step.pistasUsadas === 1 ? '' : 's'}
          </span>
        ) : (
          <span className="text-neutral-400">— sin pistas</span>
        )}
      </div>
      <div className="col-span-2 text-xs flex items-center">
        {step.correctOnFirstTry ? (
          <span className="inline-flex items-center gap-1 text-green-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>1er intento</span>
          </span>
        ) : step.completed ? (
          <span className="inline-flex items-center gap-1 text-amber-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{step.intentosFallidos + 1} intentos</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-red-700">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Incompleto</span>
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function EvidenceReport({ data }: Props) {
  const narrative = bandToNarrative(data.ird.band);
  const styles = bandStyles(data.ird.band);

  const totalHints = data.steps.reduce((sum, s) => sum + s.pistasUsadas, 0);
  const totalAttempts = data.steps.reduce((sum, s) => sum + s.intentosFallidos + (s.completed ? 1 : 0), 0);
  const correctOnFirstCount = data.steps.filter((s) => s.correctOnFirstTry).length;

  // CSV download
  const handleDownloadCSV = () => {
    const rows = [
      // header
      ['Reporte de Evidencia — Celesta Education'],
      ['Generado:', new Date().toISOString()],
      ['Hash:', data.evidenceHash],
      [],
      ['Alumno:', data.student.alias],
      ['Taller:', data.workshop.id, data.workshop.title],
      ['Iniciado:', data.startedAt],
      ['Completado:', data.completedAt],
      ['Duración total (segundos):', String(data.totalDurationSec)],
      [],
      ['IRD Score:', String(data.ird.score)],
      ['Banda:', data.ird.band],
      ['Componentes:'],
      ['  Retención durable (%):', String(data.ird.components.retention_strength)],
      ['  Autonomía (%):', String(data.ird.components.autonomy)],
      ['  Calidad de proceso (%):', String(data.ird.components.process_quality)],
      ['IRD preliminar:', data.ird.is_preliminary ? 'Sí' : 'No'],
      [],
      ['Transfer-test:'],
      ['  Estado:', data.transferTest.status],
      ['  Programado:', data.transferTest.scheduledFor ?? '—'],
      ['  Resultado:', data.transferTest.score?.toString() ?? '—'],
      [],
      ['DETALLE POR PASO'],
      ['paso', 'titulo', 'tipo', 'tiempo_sec', 'intentos_fallidos', 'pistas_usadas', 'completado', 'correcto_primer_intento'],
      ...data.steps.map((s) => [
        String(s.pasoNumero),
        s.title,
        s.type,
        String(s.timeSec),
        String(s.intentosFallidos),
        String(s.pistasUsadas),
        s.completed ? '1' : '0',
        s.correctOnFirstTry ? '1' : '0',
      ]),
    ];
    const csv = rows
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evidencia-${data.workshop.id}-${data.student.alias}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print();
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 print:bg-white">
      {/* Toolbar — visible en pantalla, oculta al imprimir */}
      <div className="sticky top-0 z-10 bg-white border-b border-neutral-200 shadow-sm print:hidden">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <h1 className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
            <FileText className="w-4 h-4 text-neutral-500" />
            Reporte de Evidencia
          </h1>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-neutral-300 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Imprimir / PDF
            </button>
            <button
              onClick={handleDownloadCSV}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <Download className="w-4 h-4" />
              Descargar CSV
            </button>
          </div>
        </div>
      </div>

      {/* Reporte */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8 print:py-4 print:space-y-6">
        {/* Header académico */}
        <header className="border-b-2 border-neutral-900 pb-6 space-y-3">
          <div className="flex justify-between items-start gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-neutral-500 font-semibold">
                Celesta Education · Reporte de Evidencia
              </p>
              <h1 className="text-3xl font-bold text-neutral-900 mt-1 leading-tight">
                {data.workshop.title}
              </h1>
              <p className="text-sm text-neutral-600 mt-1">
                <span className="font-mono text-neutral-500">{data.workshop.id}</span>
                {data.workshop.subject && <> · {data.workshop.subject}</>}
                {data.workshop.grade && <> · {data.workshop.grade}</>}
              </p>
            </div>
            <div className="text-right text-xs text-neutral-500 space-y-0.5">
              <div className="font-mono">v.1.0</div>
              <div>{new Date().toLocaleDateString('es-ES', { dateStyle: 'medium' })}</div>
            </div>
          </div>

          {/* Identidad y fechas */}
          <div className="grid grid-cols-2 gap-4 pt-2 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">
                Alumno
              </div>
              <div className="font-mono text-neutral-800 mt-0.5">{data.student.alias}</div>
              <div className="text-xs text-neutral-500">
                Sesión {data.student.sessionId.substring(0, 16)}…
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">
                Periodo de aprendizaje
              </div>
              <div className="text-sm text-neutral-700 mt-0.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                {formatDate(data.startedAt)}
              </div>
              <div className="text-xs text-neutral-500">
                Duración total: {formatDuration(data.totalDurationSec)}
              </div>
            </div>
          </div>
        </header>

        {/* Score IRD destacado */}
        <section className={`rounded-xl border-2 p-6 ${styles.bg} ${styles.border}`}>
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              <div className="text-xs uppercase tracking-widest font-semibold text-neutral-600 mb-1">
                Índice de Retención Durable
              </div>
              <div className={`text-6xl font-bold ${styles.text} font-mono leading-none`}>
                {data.ird.score}
                <span className="text-2xl text-neutral-500">/100</span>
              </div>
              {data.ird.is_preliminary && (
                <div className="text-xs text-amber-700 mt-1 italic">
                  Preliminar · transfer-test pendiente
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Award className={`w-5 h-5 ${styles.text}`} />
                <h2 className={`text-xl font-bold ${styles.text}`}>{narrative.title}</h2>
              </div>
              <p className="text-sm text-neutral-700 leading-relaxed">{narrative.message}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <ScoreBar
              label="Retención durable"
              value={data.ird.components.retention_strength}
              weight={0.4}
              isPreliminary={data.ird.is_preliminary}
            />
            <ScoreBar
              label="Autonomía"
              value={data.ird.components.autonomy}
              weight={0.3}
            />
            <ScoreBar
              label="Calidad del proceso"
              value={data.ird.components.process_quality}
              weight={0.3}
            />
          </div>
        </section>

        {/* Resumen ejecutivo */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg border border-neutral-200 p-4">
            <div className="text-xs uppercase tracking-wider text-neutral-500 font-semibold flex items-center gap-1">
              <Target className="w-3.5 h-3.5" />
              Pasos
            </div>
            <div className="text-2xl font-bold text-neutral-900 mt-1 font-mono">
              {data.ird.completion.completed}/{data.ird.completion.total}
            </div>
            <div className="text-xs text-neutral-500">completados</div>
          </div>
          <div className="bg-white rounded-lg border border-neutral-200 p-4">
            <div className="text-xs uppercase tracking-wider text-neutral-500 font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Pistas
            </div>
            <div className="text-2xl font-bold text-neutral-900 mt-1 font-mono">{totalHints}</div>
            <div className="text-xs text-neutral-500">aceptadas</div>
          </div>
          <div className="bg-white rounded-lg border border-neutral-200 p-4">
            <div className="text-xs uppercase tracking-wider text-neutral-500 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              1er intento
            </div>
            <div className="text-2xl font-bold text-neutral-900 mt-1 font-mono">
              {correctOnFirstCount}/{data.steps.length}
            </div>
            <div className="text-xs text-neutral-500">resueltos</div>
          </div>
          <div className="bg-white rounded-lg border border-neutral-200 p-4">
            <div className="text-xs uppercase tracking-wider text-neutral-500 font-semibold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Tiempo
            </div>
            <div className="text-2xl font-bold text-neutral-900 mt-1 font-mono">
              {Math.round(data.totalDurationSec / 60)}
            </div>
            <div className="text-xs text-neutral-500">minutos</div>
          </div>
        </section>

        {/* Detalle por paso */}
        <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <header className="px-5 py-3 border-b border-neutral-200 bg-neutral-50">
            <h2 className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-neutral-500" />
              Detalle por paso
            </h2>
          </header>
          <div className="px-5 pb-3">
            <div className="grid grid-cols-12 gap-2 pt-3 pb-2 border-b border-neutral-300 text-xs uppercase tracking-wider text-neutral-500 font-semibold">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Paso</div>
              <div className="col-span-2">Tiempo</div>
              <div className="col-span-2">Andamiaje</div>
              <div className="col-span-2">Resultado</div>
            </div>
            {data.steps.map((step) => (
              <StepRow key={step.pasoNumero} step={step} />
            ))}
          </div>
        </section>

        {/* Transfer-test */}
        <section className="bg-white rounded-xl border border-neutral-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-neutral-500" />
            Transfer-test a 21 días
          </h2>
          {data.transferTest.status === 'pending' ? (
            <div className="text-sm text-neutral-700">
              <p>
                El alumno será evaluado nuevamente con un test de transferencia el{' '}
                <span className="font-semibold">
                  {data.transferTest.scheduledFor &&
                    formatDate(data.transferTest.scheduledFor).split(' ')[0]}
                </span>
                . El resultado de ese test es el que valida si el aprendizaje fue durable.
              </p>
              <p className="mt-2 text-xs text-neutral-500 italic">
                Mientras tanto, el IRD se reporta como preliminar (componente de retención por
                defecto = 50/100).
              </p>
            </div>
          ) : (
            <div className="text-sm text-neutral-700">
              <p>
                Resultado del transfer-test:{' '}
                <span className="font-mono font-bold text-neutral-900">
                  {data.transferTest.score}/100
                </span>
              </p>
            </div>
          )}
        </section>

        {/* Footer auditable */}
        <footer className="border-t border-neutral-200 pt-6 space-y-3 text-xs text-neutral-500">
          <div className="flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-neutral-700">Reporte auditable</p>
              <p className="font-mono break-all mt-0.5">{data.evidenceHash}</p>
              <p className="mt-1">
                Esta evidencia es del alumno. Se generó automáticamente al completar el taller y
                puede compartirse voluntariamente con instituciones, empleadores o universidades.
                La firma criptográfica permite verificar autenticidad sin revelar datos personales
                adicionales.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <p>
              Metodología:{' '}
              <a href="/ai-transparencia" className="underline hover:text-neutral-900">
                cómo se calcula el IRD
              </a>
              . Las pistas no penalizan el score; el sistema las ofrece proactivamente cuando
              detecta fricción.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

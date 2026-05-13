/**
 * Mock data para EvidenceReport durante desarrollo.
 * Reemplazar con queries reales a Supabase cuando Week 2 esté listo.
 */

import type { IRDResult } from '../ird';

export interface EvidenceStepRecord {
  pasoNumero: number;
  title: string;
  type: string;
  /** Tiempo total en segundos (incluye intentos fallidos) */
  timeSec: number;
  intentosFallidos: number;
  pistasUsadas: number;
  completed: boolean;
  correctOnFirstTry: boolean;
}

export interface EvidenceData {
  student: { alias: string; sessionId: string };
  workshop: {
    id: string;
    title: string;
    subject?: string;
    grade?: string;
  };
  startedAt: string;
  completedAt: string;
  totalDurationSec: number;
  steps: EvidenceStepRecord[];
  ird: IRDResult;
  transferTest: {
    status: 'pending' | 'completed';
    scheduledFor?: string;
    score?: number;
  };
  /** Cryptographic signature (placeholder hex) */
  evidenceHash: string;
}

export function getMockEvidenceData(workshopId: string): EvidenceData {
  const startedAt = new Date(Date.now() - 28 * 60 * 1000).toISOString(); // hace 28 min
  const completedAt = new Date().toISOString();

  return {
    student: {
      alias: 'estrella-azul-7',
      sessionId: 'sess_a8f3b2d1c4e5f6a7',
    },
    workshop: {
      id: workshopId,
      title: workshopId === 'CRISOL-001' ? 'Crisol — Pensamiento Estructurado' : 'Taller Demo',
      subject: 'Razonamiento Lógico',
      grade: 'Secundaria 3°',
    },
    startedAt,
    completedAt,
    totalDurationSec: 28 * 60,
    steps: [
      {
        pasoNumero: 1,
        title: 'Bienvenida al crisol',
        type: 'instruccion',
        timeSec: 45,
        intentosFallidos: 0,
        pistasUsadas: 0,
        completed: true,
        correctOnFirstTry: true,
      },
      {
        pasoNumero: 2,
        title: 'Observa el patrón',
        type: 'observacion',
        timeSec: 95,
        intentosFallidos: 1,
        pistasUsadas: 0,
        completed: true,
        correctOnFirstTry: false,
      },
      {
        pasoNumero: 3,
        title: 'Predice qué pasa después',
        type: 'prediccion',
        timeSec: 120,
        intentosFallidos: 0,
        pistasUsadas: 0,
        completed: true,
        correctOnFirstTry: true,
      },
      {
        pasoNumero: 4,
        title: 'Construye tu razonamiento',
        type: 'terminal_canvas',
        timeSec: 320,
        intentosFallidos: 0,
        pistasUsadas: 1,
        completed: true,
        correctOnFirstTry: true,
      },
      {
        pasoNumero: 5,
        title: 'Ordena los pasos del argumento',
        type: 'logic_scaffold',
        timeSec: 180,
        intentosFallidos: 2,
        pistasUsadas: 1,
        completed: true,
        correctOnFirstTry: false,
      },
      {
        pasoNumero: 6,
        title: 'Defiende tu solución',
        type: 'socratico_chat',
        timeSec: 420,
        intentosFallidos: 0,
        pistasUsadas: 0,
        completed: true,
        correctOnFirstTry: true,
      },
      {
        pasoNumero: 7,
        title: 'Aplica a un caso nuevo',
        type: 'transferencia',
        timeSec: 165,
        intentosFallidos: 1,
        pistasUsadas: 0,
        completed: true,
        correctOnFirstTry: false,
      },
      {
        pasoNumero: 8,
        title: 'Reflexiona sobre tu confianza',
        type: 'confianza_reflexion',
        timeSec: 75,
        intentosFallidos: 0,
        pistasUsadas: 0,
        completed: true,
        correctOnFirstTry: true,
      },
    ],
    ird: {
      score: 76,
      components: {
        retention_strength: 50, // preliminar (transfer-test pendiente)
        autonomy: 92, // 2 pistas de ~12 disponibles
        process_quality: 85, // 1 paste detectado, 0 señales severas
      },
      is_preliminary: true,
      band: 'fragile',
      completion: { completed: 8, total: 8 },
    },
    transferTest: {
      status: 'pending',
      scheduledFor: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    },
    // Hash placeholder (en producción: HMAC-SHA256 firmado con clave del servidor)
    evidenceHash: 'sha256:f3a2b1d4c5e6f789a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5',
  };
}

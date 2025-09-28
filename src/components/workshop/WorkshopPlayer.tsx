"use client";
import React from 'react';
import type { Workshop } from '@/lib/workshops/schema';

type Props = {
  workshop: Workshop;
  classToken?: string;
};

export default function WorkshopPlayer({ workshop }: Props) {
  const totalSteps = workshop.pasos?.length ?? 0;

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{workshop.titulo}</h1>
        {workshop.metadata && (
          <div className="flex flex-wrap gap-2 text-sm text-neutral-300">
            {workshop.metadata.grado && <span className="px-2 py-0.5 rounded bg-black/30 border border-neutral-800">Grado: {workshop.metadata.grado}</span>}
            {workshop.metadata.materia && <span className="px-2 py-0.5 rounded bg-black/30 border border-neutral-800">Materia: {workshop.metadata.materia}</span>}
            {typeof workshop.metadata.duracion_estimada_min === 'number' && (
              <span className="px-2 py-0.5 rounded bg-black/30 border border-neutral-800">
                Duración ~{workshop.metadata.duracion_estimada_min} min
              </span>
            )}
          </div>
        )}
        <p className="text-neutral-400 text-sm">
          Pasos: {totalSteps} {workshop.content_version ? `· Contenido: ${workshop.content_version}` : ''}
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Contenido</h2>
        <ol className="space-y-2">
          {workshop.pasos.map((p, idx) => (
            <li key={p.ref_id ?? idx} className="p-3 rounded bg-black/20 border border-neutral-800">
              <div className="text-sm text-neutral-400">Paso {p.paso_numero ?? idx + 1} · {p.tipo_paso}</div>
              <div className="text-base">{p.titulo_paso}</div>
            </li>
          ))}
        </ol>
        <div className="text-sm text-neutral-400">
          Nota: esta es una vista previa mínima. Los componentes de paso interactivos se integrarán después.
        </div>
      </section>
    </div>
  );
}
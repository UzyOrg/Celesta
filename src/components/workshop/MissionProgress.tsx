"use client";
import React from 'react';

type Props = {
  totalSteps: number;
  completedSteps: number;
  starsLeft: number; // 0..3
};

export default function MissionProgress({ totalSteps, completedSteps, starsLeft }: Props) {
  const pct = totalSteps > 0 ? Math.min(100, Math.round((completedSteps / totalSteps) * 100)) : 0;
  const stars = Array.from({ length: 3 }, (_, i) => (i < starsLeft ? '★' : '☆'));
  return (
    <div className="flex flex-col gap-2 p-3 rounded bg-black/20 border border-neutral-800">
      <div className="flex justify-between text-sm">
        <span className="text-neutral-300">Progreso</span>
        <span className="text-neutral-300">{completedSteps}/{totalSteps} · {pct}%</span>
      </div>
      <div className="w-full h-2 bg-neutral-800 rounded">
        <div className="h-2 bg-lime rounded" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-sm flex items-center gap-2">
        <span className="text-neutral-300">Autonomía</span>
        <span className="text-lg leading-none" aria-label={`autonomía ${starsLeft} de 3`}>
          {stars.join(' ')}
        </span>
      </div>
    </div>
  );
}

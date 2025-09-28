"use client";
import React from 'react';
import { useWorkshop } from '@/lib/workshops/useWorkshop';
import InteractivePlayer from '@/components/workshop/InteractivePlayer';

export default function WorkshopClient({ id, classToken }: { id: string; classToken?: string }) {
  const { data, loading, error } = useWorkshop(id);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <div className="animate-pulse h-8 w-1/2 bg-neutral-800 rounded" />
        <div className="animate-pulse h-2 w-full bg-neutral-800 rounded" />
        <div className="animate-pulse h-2 w-5/6 bg-neutral-800 rounded" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="p-3 rounded border border-red-600/40 bg-red-900/20">
          Error cargando el taller: {error ?? 'desconocido'}
        </div>
      </div>
    );
  }
  return <InteractivePlayer workshop={data} classToken={classToken} />;
}
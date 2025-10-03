"use client";
import React from 'react';
import { useWorkshop } from '@/lib/workshops/useWorkshop';
import InteractivePlayer from '@/components/workshop/InteractivePlayer';
import { motion } from 'framer-motion';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { AdaptationResult } from '@/lib/adaptive/schema';

type Props = {
  id: string;
  classToken?: string;
  adaptacion?: AdaptationResult | null;
};

export default function WorkshopClient({ id, classToken, adaptacion }: Props) {
  const { data, loading, error } = useWorkshop(id);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <motion.div
          className="bg-neutral-900/60 backdrop-blur-sm rounded-2xl border border-neutral-800/50 p-12 space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-center gap-3 text-turquoise">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-lg font-medium">Cargando tu misión...</span>
          </div>
          <div className="space-y-3">
            <div className="animate-pulse h-4 w-3/4 bg-neutral-800/50 rounded-lg mx-auto" />
            <div className="animate-pulse h-4 w-2/3 bg-neutral-800/50 rounded-lg mx-auto" />
            <div className="animate-pulse h-4 w-1/2 bg-neutral-800/50 rounded-lg mx-auto" />
          </div>
        </motion.div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <motion.div
          className="bg-red-900/20 backdrop-blur-sm rounded-2xl border-2 border-red-600/50 p-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-red-500/20">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-lg font-semibold text-red-200">Error al cargar el taller</h3>
              <p className="text-red-300/80">{error ?? 'Error desconocido'}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 rounded-lg text-red-200 font-medium transition-colors"
              >
                Reintentar
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return <InteractivePlayer workshop={data} classToken={classToken} adaptacion={adaptacion} />;
}
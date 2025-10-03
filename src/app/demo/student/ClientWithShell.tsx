"use client";
import React from 'react';
import AppShell from '@/components/shell/AppShell';
import WorkshopClient from '@/app/workshop/[id]/Client';
import DiagnosticQuestionnaire from '@/components/adaptive/DiagnosticQuestionnaire';
import { useSearchParams } from 'next/navigation';
import { useCanonicalAlias } from '@/lib/alias';
import { getOrCreateSessionId } from '@/lib/session';
import { useAdaptiveWorkshop } from '@/lib/adaptive/useAdaptiveWorkshop';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

type Props = {
  id: string;
  classToken?: string;
};

export default function WorkshopClientWithShell({ id, classToken }: Props) {
  const searchParams = useSearchParams();
  const token = classToken || (searchParams ? searchParams.get('t') : null) || 'DEMO-101';
  const sessionId = getOrCreateSessionId(token);
  const { alias, loading: aliasLoading } = useCanonicalAlias(token, sessionId);

  // Hook de adaptación (ahora SIEMPRE asigna 3 estrellas, sin importar las respuestas)
  const {
    necesitaDiagnostico,
    configDiagnostico,
    loadingConfig,
    perfil,
    adaptacion,
    completarDiagnostico,
  } = useAdaptiveWorkshop(id, sessionId, token);

  // Loading state
  if (loadingConfig || aliasLoading) {
    return (
      <AppShell userAlias="Cargando..." userRole="student">
        <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center">
          <motion.div
            className="flex flex-col items-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Loader2 className="w-8 h-8 text-turquoise animate-spin" />
            <p className="text-neutral-400">Preparando tu experiencia...</p>
          </motion.div>
        </div>
      </AppShell>
    );
  }

  // Mostrar diagnóstico si es necesario
  // El diagnóstico ahora SOLO personaliza la experiencia (perfil, mensajes)
  // pero NO afecta las estrellas iniciales (siempre 3)
  if (necesitaDiagnostico && configDiagnostico) {
    return (
      <DiagnosticQuestionnaire
        preguntas={configDiagnostico.cuestionarioDiagnostico}
        onComplete={completarDiagnostico}
        tallerId={id}
        tituloTaller="La Célula como Unidad de Vida"
      />
    );
  }

  // Renderizar taller con adaptación
  return (
    <AppShell userAlias={alias || 'Estudiante'} userRole="student">
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
        <WorkshopClient 
          id={id} 
          classToken={token}
          adaptacion={adaptacion}
        />
      </div>
    </AppShell>
  );
}

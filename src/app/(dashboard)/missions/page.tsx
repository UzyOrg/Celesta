"use client";
import React, { useState, useEffect } from 'react';
import PageContainer from '@/components/shell/PageContainer';
import { Card } from '@/components/shell/Card';
import { Rocket, ArrowRight, Clock, TrendingUp, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function MissionsPage() {
  const { userState } = useAuth();
  const [isBIO001Completed, setIsBIO001Completed] = useState(false);
  const [assignedWorkshop, setAssignedWorkshop] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si BIO-001 está completada en localStorage
    const completed = localStorage.getItem('workshop_BIO-001_completed');
    setIsBIO001Completed(completed === 'true');

    // Obtener el workshop asignado al grupo del estudiante
    async function fetchAssignedWorkshop() {
      if (!userState.classToken) {
        console.error('[missions] No class token available');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/assignments/get-workshop?class_token=${userState.classToken}`);
        
        if (!response.ok) {
          console.error('[missions] Error fetching workshop assignment');
          setLoading(false);
          return;
        }

        const data = await response.json();
        setAssignedWorkshop(data.workshop_id);
        console.log('[missions] Workshop asignado:', data.workshop_id);
      } catch (error) {
        console.error('[missions] Error:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAssignedWorkshop();
  }, [userState.classToken]);

  // Mostrar loader mientras carga
  if (loading) {
    return (
      <PageContainer
        title="Misiones"
        subtitle="Explora talleres interactivos de aprendizaje"
        maxWidth="7xl"
      >
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-turquoise animate-spin" />
        </div>
      </PageContainer>
    );
  }

  // URL del workshop: usar el classToken del estudiante
  const workshopUrl = userState.classToken 
    ? `/demo/student?t=${userState.classToken}`
    : '/demo/student?t=DEMO-101'; // Fallback

  return (
      <PageContainer
        title="Misiones"
        subtitle="Explora talleres interactivos de aprendizaje"
        maxWidth="7xl"
      >
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* BIO-001 Mission Card */}
          <Card hover>
            <Link href={workshopUrl} className="block p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="p-3 rounded-xl bg-gradient-to-br from-turquoise/20 to-lime/10">
                  <Rocket className="w-6 h-6 text-turquoise" />
                </div>
                {isBIO001Completed ? (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-lime/20 text-lime border border-lime/30 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3" />
                    Completada
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-lime/20 text-lime border border-lime/30">
                    Disponible
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">La Célula como Unidad de Vida</h3>
                <p className="text-sm text-neutral-400 line-clamp-2">
                  Explora la estructura y función de la célula a través de observaciones y razonamiento científico.
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-neutral-800/50">
                <div className="flex items-center gap-4 text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    ~15 min
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Básico
                  </span>
                </div>
                <ArrowRight className="w-5 h-5 text-turquoise" />
              </div>
            </Link>
          </Card>

          {/* Placeholder cards */}
          {[1, 2].map((i) => (
            <Card key={i} className="opacity-50">
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-xl bg-neutral-800/50">
                    <Rocket className="w-6 h-6 text-neutral-600" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-neutral-800/50 text-neutral-500 border border-neutral-700/50">
                    Próximamente
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-neutral-500">Próxima Misión</h3>
                  <p className="text-sm text-neutral-600">
                    Nuevas misiones estarán disponibles próximamente. Completa las misiones actuales para desbloquear más contenido.
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </PageContainer>
  );
}

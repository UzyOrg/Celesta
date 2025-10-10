"use client";
import React, { useState, useEffect } from 'react';
import PageContainer from '@/components/shell/PageContainer';
import { MetricCard } from '@/components/shell/Card';
import MetricCardSkeleton from '@/components/skeletons/MetricCardSkeleton';
import { Target, Trophy, Clock, Zap } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { getOrCreateSessionId } from '@/lib/session';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardPage() {
  const { userState } = useAuth();
  const [completedMissions, setCompletedMissions] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCompletedMissions() {
      if (typeof window === 'undefined') return;
      
      // 1. PRIMARIO: Usar alias + classToken del contexto de Auth
      if (userState.alias && userState.classToken) {
        try {
          const response = await fetch(
            `/api/student/completed-missions?alias=${encodeURIComponent(userState.alias)}&class_token=${encodeURIComponent(userState.classToken)}`
          );
          
          if (response.ok) {
            const result = await response.json();
            
            setCompletedMissions(result.completedMissions || 0);
            setTotalPoints(result.totalPoints || 0);
            setTotalMinutes(result.totalMinutes || 0);
            setCurrentStreak(result.currentStreak || 0);
            setLoading(false);
            return;
          } else {
            console.error('[Dashboard] Error API:', response.status);
          }
        } catch (error) {
          console.error('[Dashboard] Exception:', error);
        }
      }
      
      // 2. FALLBACK: Buscar por session IDs de localStorage
      try {
        const sessionIds: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('celesta:sid:')) {
            const sid = localStorage.getItem(key);
            if (sid) sessionIds.push(sid);
          }
        }
        
        if (sessionIds.length > 0) {
          const response = await fetch(`/api/student/completed-missions?sessionIds=${sessionIds.join(',')}`);
          
          if (response.ok) {
            const result = await response.json();
            setCompletedMissions(result.completedMissions || 0);
            setTotalPoints(result.totalPoints || 0);
            setTotalMinutes(result.totalMinutes || 0);
            setCurrentStreak(result.currentStreak || 0);
            setLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error('[Dashboard] Excepción al consultar por alias:', error);
      }
      
      // 2. FALLBACK: localStorage (offline)
      let count = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('workshop_') && key.endsWith('_completed')) {
          const value = localStorage.getItem(key);
          if (value === 'true') {
            count++;
          }
        }
      }
      
      setCompletedMissions(count);
      setLoading(false);
    }
    
    loadCompletedMissions();
  }, [userState.alias, userState.classToken]);

  return (
      <PageContainer
        title="Dashboard"
        subtitle="Tu progreso y próximas misiones"
        maxWidth="7xl"
      >
        <div className="grid gap-3 md:gap-4 lg:gap-6 grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8">
          {loading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              <MetricCard
                title="Misiones Completadas"
                value={completedMissions.toString()}
                icon={Trophy}
                color="lime"
                subtitle={completedMissions === 0 ? "Ninguna aún" : `${completedMissions} ${completedMissions === 1 ? 'misión' : 'misiones'}`}
              />
              <MetricCard
                title="Puntos Totales"
                value={totalPoints.toString()}
                icon={Target}
                color="turquoise"
                subtitle={totalPoints === 0 ? "Comienza tu primera misión" : `${totalPoints} puntos acumulados`}
              />
              <MetricCard
                title="Tiempo Invertido"
                value={`${totalMinutes} min`}
                icon={Clock}
                color="blue"
                subtitle={totalMinutes === 0 ? "" : `${Math.round(totalMinutes / 60)} horas aproximadamente`}
              />
              <MetricCard
                title="Racha Actual"
                value={`${currentStreak} ${currentStreak === 1 ? 'día' : 'días'}`}
                icon={Zap}
                color="amber"
                subtitle={currentStreak === 0 ? "Comienza tu racha hoy" : currentStreak === 1 ? "¡Sigue así!" : "¡Increíble consistencia!"}
              />
            </>
          )}
        </div>
      </PageContainer>
  );
}

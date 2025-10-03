"use client";
import React, { useState, useEffect } from 'react';
import AppShell from '@/components/shell/AppShell';
import PageContainer from '@/components/shell/PageContainer';
import { MetricCard } from '@/components/shell/Card';
import { Target, Trophy, Clock, Zap } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { getOrCreateSessionId } from '@/lib/session';

export default function DashboardPage() {
  const [completedMissions, setCompletedMissions] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCompletedMissions() {
      if (typeof window === 'undefined') return;
      
      // Recolectar TODOS los session IDs de localStorage
      const sessionIds: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('celesta:sid:')) {
          const sid = localStorage.getItem(key);
          if (sid) sessionIds.push(sid);
        }
      }
      
      console.log('[Dashboard] Session IDs encontrados:', sessionIds);
      
      // 1. PRIMARIO: Usar API con SESSION IDs
      try {
        if (sessionIds.length > 0) {
          console.log('[Dashboard] Consultando API por session IDs...');
          const response = await fetch(`/api/student/completed-missions?sessionIds=${sessionIds.join(',')}`);
          
          if (response.ok) {
            const result = await response.json();
            console.log('[Dashboard] Respuesta API:', result);
            console.log('[Dashboard] Métricas:', {
              misiones: result.completedMissions,
              puntos: result.totalPoints,
              minutos: result.totalMinutes,
              racha: result.currentStreak
            });
            
            setCompletedMissions(result.completedMissions);
            setTotalPoints(result.totalPoints);
            setTotalMinutes(result.totalMinutes);
            setCurrentStreak(result.currentStreak);
            setLoading(false);
            return;
          } else {
            console.error('[Dashboard] Error de API:', response.status, response.statusText);
          }
        }
      } catch (error) {
        console.error('[Dashboard] Excepción al consultar API por session:', error);
      }
      
      // 2. FALLBACK: Recuperar por ALIAS (si se borró localStorage)
      try {
        // Buscar alias en localStorage (cualquier classToken)
        let aliasFound = null;
        let tokenFound = null;
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('celesta:alias:')) {
            const alias = localStorage.getItem(key);
            const token = key.replace('celesta:alias:', '');
            if (alias && token !== '__global__') {
              aliasFound = alias;
              tokenFound = token;
              break;
            }
          }
        }
        
        if (aliasFound && tokenFound) {
          console.log('[Dashboard] Intentando recuperar por alias:', aliasFound, 'token:', tokenFound);
          const response = await fetch(`/api/student/completed-missions?alias=${encodeURIComponent(aliasFound)}&classToken=${encodeURIComponent(tokenFound)}`);
          
          if (response.ok) {
            const result = await response.json();
            console.log('[Dashboard] ✅ Datos recuperados por alias:', result);
            
            setCompletedMissions(result.completedMissions);
            setTotalPoints(result.totalPoints);
            setTotalMinutes(result.totalMinutes);
            setCurrentStreak(result.currentStreak);
            setLoading(false);
            return;
          }
        } else {
          console.warn('[Dashboard] No se encontró alias para recuperar datos');
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
  }, []);

  return (
    <AppShell userAlias="Estudiante" userRole="student">
      <PageContainer
        title="Dashboard"
        subtitle="Tu progreso y próximas misiones"
        maxWidth="7xl"
      >
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
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
        </div>

        <div className="bg-neutral-900/60 backdrop-blur-sm rounded-2xl border border-neutral-800/50 p-12 text-center">
          <h2 className="text-2xl font-bold text-neutral-300 mb-4">
            ¡Bienvenido a Celesta OS!
          </h2>
          <p className="text-neutral-400">
            Tu dashboard personal estará disponible próximamente. Por ahora, dirígete a <strong className="text-turquoise">Misiones</strong> para comenzar tu primera experiencia de aprendizaje.
          </p>
        </div>
      </PageContainer>
    </AppShell>
  );
}

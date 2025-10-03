"use client";
import React, { useEffect } from 'react';
import AppShell from '@/components/shell/AppShell';
import TeacherDashboard from './TeacherDashboard';

type StudentData = {
  sessionId: string;
  alias: string;
  stepsCompleted: number;
  lastTs: string;
};

type RadarMetric = {
  metric: string;
  valor: number;
};

type Props = {
  classToken: string;
  studentCount: number;
  stepsCompleted: number;
  avgScore: number;
  totalHintCost: number;
  students: StudentData[];
  radarData: RadarMetric[];
  fromParam: string;
  toParam: string;
  tallerParam: string;
  exportQS: string;
};

export default function TeacherDashboardWithShell(props: Props) {
  // Guardar el token del grupo actual en localStorage para navegación contextual
  useEffect(() => {
    if (props.classToken) {
      localStorage.setItem('celesta:last_teacher_token', props.classToken);
    }
  }, [props.classToken]);

  return (
    <AppShell userAlias="Docente" userRole="teacher" classToken={props.classToken}>
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
        <div className="max-w-7xl mx-auto p-6">
          <TeacherDashboard {...props} />
        </div>
      </div>
    </AppShell>
  );
}

"use client";
import React, { useState } from 'react';
import { MetricCard, Card } from '@/components/shell/Card';
import { Users, CheckCircle, TrendingUp, Lightbulb, Download, Eye, Filter } from 'lucide-react';
import RadarChart from './RadarChart';
import Link from 'next/link';
import { motion } from 'framer-motion';

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

type TeacherDashboardProps = {
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

export default function TeacherDashboard({
  classToken,
  studentCount,
  stepsCompleted,
  avgScore,
  totalHintCost,
  students,
  radarData,
  fromParam,
  toParam,
  tallerParam,
  exportQS,
}: TeacherDashboardProps) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="space-y-8">
      {/* Header with filters */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-neutral-300 bg-clip-text text-transparent mb-2">
            Panel Docente
          </h1>
          <p className="text-neutral-400">
            Grupo: <span className="text-lime font-medium">{classToken}</span>
          </p>
        </div>

        <div className="flex gap-3">
          <motion.button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-800/80 hover:bg-neutral-700 border border-neutral-700/50 rounded-xl text-sm font-medium transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Filter className="w-4 h-4" />
            Filtros
          </motion.button>

          <motion.a
            href={`/api/teacher/export?${exportQS}`}
            download
            className="inline-flex items-center gap-2 px-4 py-2 bg-turquoise/10 hover:bg-turquoise/20 border border-turquoise/30 text-turquoise rounded-xl text-sm font-medium transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </motion.a>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <Card className="p-6">
            <form method="get" className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Desde</label>
                <input
                  type="date"
                  name="from"
                  defaultValue={fromParam}
                  className="w-full bg-neutral-800/60 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-turquoise/50 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Hasta</label>
                <input
                  type="date"
                  name="to"
                  defaultValue={toParam}
                  className="w-full bg-neutral-800/60 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-turquoise/50 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Taller ID</label>
                <input
                  type="text"
                  name="taller"
                  defaultValue={tallerParam}
                  placeholder="Ej: BIO-001"
                  className="w-full bg-neutral-800/60 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-turquoise/50 transition-all"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-gradient-to-r from-turquoise to-lime text-black font-semibold rounded-lg hover:shadow-lg hover:shadow-turquoise/20 transition-all"
                >
                  Aplicar
                </button>
              </div>
            </form>
          </Card>
        </motion.div>
      )}

      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Estudiantes Activos"
          value={studentCount}
          icon={Users}
          color="turquoise"
          subtitle="En este periodo"
        />
        <MetricCard
          title="Pasos Completados"
          value={stepsCompleted}
          icon={CheckCircle}
          color="lime"
          subtitle="Total del grupo"
        />
        <MetricCard
          title="Puntuación Promedio"
          value={avgScore.toFixed(1)}
          icon={TrendingUp}
          color="blue"
          subtitle="De 10 puntos máx"
        />
        <MetricCard
          title="Pistas Utilizadas"
          value={totalHintCost}
          icon={Lightbulb}
          color="amber"
          subtitle="Costo total"
        />
      </div>

      {/* Radar Chart */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-neutral-100">Indicadores de Desempeño</h2>
            <p className="text-sm text-neutral-400 mt-1">
              Análisis multidimensional del grupo
            </p>
          </div>
          <div className="h-[400px]">
            <RadarChart data={radarData} />
          </div>
        </div>
      </Card>

      {/* Students List */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-neutral-100">Estudiantes</h2>
              <p className="text-sm text-neutral-400 mt-1">{students.length} participantes</p>
            </div>
          </div>

          <div className="space-y-2">
            {students.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">
                No hay estudiantes registrados en este periodo
              </div>
            ) : (
              students.map((student, idx) => (
                <motion.div
                  key={student.sessionId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03, duration: 0.2 }}
                >
                  <Link
                    href={`/teacher/${classToken}/student/${student.sessionId}`}
                    className="block p-4 rounded-xl bg-neutral-800/30 border border-neutral-700/30 hover:border-turquoise/50 hover:bg-neutral-800/50 transition-all group"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-lime to-turquoise flex items-center justify-center font-bold text-black text-sm flex-shrink-0">
                          {student.alias.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate group-hover:text-turquoise transition-colors">
                            {student.alias}
                          </p>
                          <p className="text-xs text-neutral-500 truncate">
                            ID: {student.sessionId.slice(0, 12)}...
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm font-medium text-neutral-400">Pasos completados</p>
                          <p className="text-2xl font-bold text-lime">{student.stepsCompleted}</p>
                        </div>

                        <div className="flex items-center gap-2 text-turquoise opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye className="w-5 h-5" />
                          <span className="text-sm font-medium">Ver detalle</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

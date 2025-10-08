"use client";
import React, { useState } from 'react';
import { MetricCard, Card } from '@/components/shell/Card';
import { Users, CheckCircle, TrendingUp, Lightbulb, Download, Filter } from 'lucide-react';
import RadarChart from '@/components/teacher/RadarChart';
import { motion } from 'framer-motion';

type RadarMetric = {
  metric: string;
  valor: number;
};

type AnalyticsDashboardProps = {
  classToken: string;
  studentCount: number;
  stepsCompleted: number;
  avgScore: number;
  totalHintCost: number;
  radarData: RadarMetric[];
  fromParam: string;
  toParam: string;
  tallerParam: string;
  exportQS: string;
};

/**
 * AnalyticsDashboard - Vista de métricas y analíticas del grupo
 * 
 * Componente unificado que muestra:
 * - 4 tarjetas de métricas clave
 * - Radar chart de indicadores de desempeño
 * - Filtros de fecha y taller
 * - Export CSV
 * 
 * NO incluye lista de estudiantes (eso está en la pestaña "Estudiantes Aprobados")
 */
export default function AnalyticsDashboard({
  classToken,
  studentCount,
  stepsCompleted,
  avgScore,
  totalHintCost,
  radarData,
  fromParam,
  toParam,
  tallerParam,
  exportQS,
}: AnalyticsDashboardProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);

  return (
    <div className="space-y-8">
      {/* Header with filters - Responsive */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-white to-neutral-300 bg-clip-text text-transparent mb-2">
            Analíticas del Grupo
          </h2>
          <p className="text-sm md:text-base !text-neutral-400">
            Métricas de desempeño y progreso del grupo
          </p>
        </div>

        <div className="flex gap-2 md:gap-3">
          <motion.button
            onClick={() => setShowFilters(!showFilters)}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-neutral-800/80 hover:bg-neutral-700 border border-neutral-700/50 rounded-xl text-xs md:text-sm font-medium transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Filter className="w-4 h-4" />
            <span>Filtros</span>
          </motion.button>

          <motion.a
            href={`/api/teacher/export?${exportQS}`}
            download
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-turquoise/10 hover:bg-turquoise/20 border border-turquoise/30 text-turquoise rounded-xl text-xs md:text-sm font-medium transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">Exportar CSV</span>
            <span className="md:hidden">CSV</span>
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

      {/* Metrics Grid - 2x2 en móvil, 4 columnas en desktop */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
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

      {/* Performance Indicators - Mobile-First */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-neutral-100">Indicadores de Desempeño</h3>
              <p className="text-sm text-neutral-400 mt-1">
                Análisis multidimensional del grupo
              </p>
            </div>
            
            {/* Botón para mostrar análisis completo en móvil */}
            <button
              onClick={() => setShowDetailedAnalysis(!showDetailedAnalysis)}
              className="md:hidden px-3 py-1.5 bg-turquoise/10 hover:bg-turquoise/20 border border-turquoise/30 text-turquoise rounded-lg text-xs font-medium transition-all"
            >
              {showDetailedAnalysis ? 'Ocultar Gráfico' : 'Ver Análisis'}
            </button>
          </div>

          {/* KPIs Simplificados - Móvil por defecto, siempre visibles en desktop */}
          <div className={`grid grid-cols-2 gap-3 ${showDetailedAnalysis ? 'md:hidden' : ''}`}>
            {radarData.slice(0, 4).map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-neutral-800/30 border border-neutral-700/30">
                <p className="text-xs text-neutral-400 mb-1">{item.metric}</p>
                <p className="text-2xl font-bold text-lime">{item.valor.toFixed(1)}</p>
                <div className="mt-2 h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-turquoise to-lime rounded-full transition-all duration-500"
                    style={{ width: `${(item.valor / 10) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Radar Chart Completo - Desktop siempre, móvil solo si se expande */}
          <div className={`${showDetailedAnalysis ? '' : 'hidden md:block'} h-[400px]`}>
            <RadarChart data={radarData} />
          </div>
        </div>
      </Card>

      {/* Info Card - Nota sobre lista de estudiantes */}
      <Card className="p-4 bg-neutral-900/30 border-neutral-800/30">
        <p className="text-sm text-neutral-400 text-center">
          💡 <span className="text-neutral-300 font-medium">Tip:</span> Para ver la lista detallada de estudiantes y sus insights individuales, 
          ve a la pestaña <span className="text-turquoise font-semibold">&ldquo;Estudiantes Aprobados&rdquo;</span>
        </p>
      </Card>
    </div>
  );
}

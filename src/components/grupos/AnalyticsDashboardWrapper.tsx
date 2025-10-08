'use client';
import { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import AnalyticsDashboard from './AnalyticsDashboard';
import { useSearchParams } from 'next/navigation';

type AnalyticsData = {
  classToken: string;
  studentCount: number;
  stepsCompleted: number;
  avgScore: number;
  totalHintCost: number;
  radarData: Array<{ metric: string; valor: number }>;
  fromParam: string;
  toParam: string;
  tallerParam: string;
  exportQS: string;
};

interface AnalyticsDashboardWrapperProps {
  classToken: string;
}

/**
 * AnalyticsDashboardWrapper - Cliente wrapper para fetchear analíticas
 * 
 * Obtiene datos del API /api/analytics/[classToken] y renderiza AnalyticsDashboard
 */
export default function AnalyticsDashboardWrapper({ classToken }: AnalyticsDashboardWrapperProps) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!classToken) return;

    async function fetchAnalytics() {
      setLoading(true);
      setError(null);

      try {
        // Construir query params desde searchParams
        const queryParams = new URLSearchParams();
        const from = searchParams?.get('from');
        const to = searchParams?.get('to');
        const taller = searchParams?.get('taller');

        if (from) queryParams.set('from', from);
        if (to) queryParams.set('to', to);
        if (taller) queryParams.set('taller', taller);

        const url = `/api/analytics/${encodeURIComponent(classToken)}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('Error al cargar analíticas');
        }

        const json = await response.json();
        setData(json);
      } catch (err) {
        setError((err as Error).message);
        console.error('[AnalyticsDashboardWrapper] Error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [classToken, searchParams]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-turquoise animate-spin mb-4" />
        <p className="text-neutral-400">Cargando analíticas del grupo...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-red-400 font-semibold mb-2">Error al cargar analíticas</p>
        <p className="text-neutral-500 text-sm">{error || 'No se pudieron obtener los datos.'}</p>
      </div>
    );
  }

  return <AnalyticsDashboard {...data} />;
}

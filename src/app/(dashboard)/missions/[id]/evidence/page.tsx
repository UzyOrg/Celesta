import EvidenceReport from '@/components/evidence/EvidenceReport';
import { getMockEvidenceData } from '@/lib/evidence/mockData';

/**
 * Reporte de Evidencia del Pasaporte Cognitivo.
 *
 * Por ahora consume mock data. En Week 2 se reemplazará por:
 *   - Query a `eventos_de_aprendizaje` (Supabase) por `taller_id` + `alias`
 *   - Cálculo de IRD a partir de los eventos agregados (`completo_paso`,
 *     `taller_completado`, `telemetria_crisol`)
 *   - Hash firmado en el servidor (HMAC con clave privada)
 */
export default async function EvidencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = getMockEvidenceData(id);

  return <EvidenceReport data={data} />;
}

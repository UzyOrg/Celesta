-- ============================================
-- Script de Limpieza de Eventos de Desarrollo
-- ============================================
-- Propósito: Eliminar eventos de prueba/testing acumulados durante desarrollo
-- Uso: Ejecutar en Supabase SQL Editor antes de producción

-- OPCIÓN 1: Borrar TODOS los eventos de prueba de un token específico
-- (Útil para limpiar token DEMO-101 antes de demo oficial)
DELETE FROM eventos_de_aprendizaje
WHERE class_token = 'DEMO-101';

-- OPCIÓN 2: Borrar eventos anteriores a una fecha específica
-- (Mantener solo últimos 7 días para testing)
DELETE FROM eventos_de_aprendizaje
WHERE class_token = 'DEMO-101'
AND ts < NOW() - INTERVAL '7 days';

-- OPCIÓN 3: Borrar eventos obsoletos (envio_respuesta y solicito_pista)
-- Estos eventos ya no se usan en el nuevo sistema agregado
DELETE FROM eventos_de_aprendizaje
WHERE verbo IN ('envio_respuesta', 'solicito_pista');

-- OPCIÓN 4: Borrar eventos de sesiones específicas de desarrollo
-- (Reemplazar con tus session IDs de testing)
DELETE FROM eventos_de_aprendizaje
WHERE student_session_id IN (
  'session-id-1',
  'session-id-2'
  -- Agregar más session IDs de testing aquí
);

-- ============================================
-- Query de Verificación: Ver conteo antes y después
-- ============================================
SELECT 
  class_token,
  verbo,
  COUNT(*) as total_eventos,
  MIN(ts)::date as primer_evento,
  MAX(ts)::date as ultimo_evento
FROM eventos_de_aprendizaje
WHERE class_token = 'DEMO-101'
GROUP BY class_token, verbo
ORDER BY total_eventos DESC;

-- ============================================
-- Política de Retención Automática (PRODUCCIÓN)
-- ============================================
-- Crear función para auto-limpieza de eventos viejos
CREATE OR REPLACE FUNCTION clean_old_events()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Borrar eventos mayores a 90 días
  DELETE FROM eventos_de_aprendizaje
  WHERE ts < NOW() - INTERVAL '90 days';
  
  RAISE NOTICE 'Eventos viejos eliminados';
END;
$$;

-- Programar limpieza semanal (requiere pg_cron extension)
-- SELECT cron.schedule('clean-old-events', '0 3 * * 0', 'SELECT clean_old_events()');

-- ================================================================
-- Migration: Agregar student_alias como columna principal
-- Fecha: 2025-10-03
-- Descripción: Refactor para usar alias en lugar de solo SID
-- ================================================================

-- 1. AGREGAR COLUMNA
-- -----------------------------------------------------------------
ALTER TABLE eventos_de_aprendizaje
ADD COLUMN IF NOT EXISTS student_alias TEXT;

COMMENT ON COLUMN eventos_de_aprendizaje.student_alias IS 
  'Alias del estudiante, único por class_token. Primary identifier junto con class_token.';

-- 2. POBLAR DATOS EXISTENTES
-- -----------------------------------------------------------------
-- Extraer alias del result JSON para eventos existentes
UPDATE eventos_de_aprendizaje
SET student_alias = result->>'alias'
WHERE student_alias IS NULL
  AND result IS NOT NULL
  AND result->>'alias' IS NOT NULL
  AND result->>'alias' != '';

-- 3. CREAR ÍNDICE PARA PERFORMANCE
-- -----------------------------------------------------------------
-- Index compuesto para búsquedas rápidas por (class_token, student_alias)
CREATE INDEX IF NOT EXISTS idx_student_alias_class 
ON eventos_de_aprendizaje(class_token, student_alias)
WHERE student_alias IS NOT NULL;

-- Index para búsquedas por verbo + alias
CREATE INDEX IF NOT EXISTS idx_student_alias_verbo 
ON eventos_de_aprendizaje(class_token, student_alias, verbo)
WHERE student_alias IS NOT NULL;

-- 4. (OPCIONAL) CONSTRAINT DE UNICIDAD
-- -----------------------------------------------------------------
-- Esto FUERZA que un alias solo pueda usarse una vez por grupo
-- Descomentar si quieres aplicarlo:

/*
CREATE UNIQUE INDEX idx_unique_alias_per_class_workshop 
ON eventos_de_aprendizaje(class_token, student_alias, taller_id)
WHERE verbo = 'taller_completado';
*/

-- 5. ESTADÍSTICAS DE MIGRACIÓN
-- -----------------------------------------------------------------
-- Verificar cuántos eventos tienen alias
SELECT 
  COUNT(*) as total_eventos,
  COUNT(student_alias) as eventos_con_alias,
  COUNT(*) - COUNT(student_alias) as eventos_sin_alias,
  ROUND(100.0 * COUNT(student_alias) / COUNT(*), 2) as porcentaje_con_alias
FROM eventos_de_aprendizaje;

-- Verificar distribución por verbo
SELECT 
  verbo,
  COUNT(*) as total,
  COUNT(student_alias) as con_alias,
  COUNT(*) - COUNT(student_alias) as sin_alias
FROM eventos_de_aprendizaje
GROUP BY verbo
ORDER BY total DESC;

-- Ver algunos ejemplos de alias migrados
SELECT 
  class_token,
  student_alias,
  verbo,
  taller_id,
  ts
FROM eventos_de_aprendizaje
WHERE student_alias IS NOT NULL
ORDER BY ts DESC
LIMIT 10;

-- 6. (OPCIONAL) LIMPIEZA DE EVENTOS VIEJOS SIN ALIAS
-- -----------------------------------------------------------------
-- Si tienes eventos muy antiguos sin alias que ya no son relevantes,
-- puedes borrarlos (CUIDADO, esto es irreversible):

/*
DELETE FROM eventos_de_aprendizaje
WHERE student_alias IS NULL
  AND ts < '2025-01-01'::timestamp;
*/

-- ================================================================
-- FIN DE MIGRACIÓN
-- ================================================================

-- ROLLBACK (si algo sale mal):
-- DROP INDEX IF EXISTS idx_student_alias_class;
-- DROP INDEX IF EXISTS idx_student_alias_verbo;
-- ALTER TABLE eventos_de_aprendizaje DROP COLUMN IF EXISTS student_alias;

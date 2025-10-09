-- ============================================================================
-- MIGRACIÓN: Eliminar columna assigned_workshop_id
-- Fecha: 2025-01-09
-- Descripción: Elimina la columna obsoleta assigned_workshop_id de class_assignments
-- ============================================================================

-- Eliminar la columna assigned_workshop_id
ALTER TABLE public.class_assignments 
DROP COLUMN IF EXISTS assigned_workshop_id;

-- Verificación
DO $$
BEGIN
  RAISE NOTICE 'Columna assigned_workshop_id eliminada exitosamente';
END $$;

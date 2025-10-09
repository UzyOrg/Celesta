-- ============================================================================
-- ROLLBACK: Refactorización a Modelo Centrado en Docente
-- Fecha: 2025-01-08
-- Descripción: Revertir cambios y restaurar modelo grupo-céntrico original
-- ============================================================================

-- ============================================================================
-- PASO 1: RE-AÑADIR COLUMNA assigned_workshop_id
-- ============================================================================

ALTER TABLE public.class_assignments 
ADD COLUMN IF NOT EXISTS assigned_workshop_id TEXT;

-- ============================================================================
-- PASO 2: RESTAURAR DATOS (del primer taller asignado por grupo)
-- ============================================================================

-- Actualizar assigned_workshop_id con el primer taller asignado
UPDATE public.class_assignments ca
SET assigned_workshop_id = (
  SELECT t.nombre
  FROM public.grupo_talleres gt
  JOIN public.talleres t ON t.id = gt.taller_id
  WHERE gt.group_id = ca.id
  ORDER BY gt.position ASC, gt.assigned_at ASC
  LIMIT 1
);

-- ============================================================================
-- PASO 3: ELIMINAR TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS trg_add_owner_taller_to_library ON public.talleres;
DROP TRIGGER IF EXISTS trg_update_talleres_timestamp ON public.talleres;

DROP FUNCTION IF EXISTS public.fn_add_owner_taller_to_library();
DROP FUNCTION IF EXISTS public.fn_update_talleres_timestamp();

-- ============================================================================
-- PASO 4: ELIMINAR POLÍTICAS RLS
-- ============================================================================

-- Políticas de talleres
DROP POLICY IF EXISTS "talleres_select_by_library_or_owner" ON public.talleres;
DROP POLICY IF EXISTS "talleres_insert_owner_only" ON public.talleres;
DROP POLICY IF EXISTS "talleres_update_owner_only" ON public.talleres;
DROP POLICY IF EXISTS "talleres_delete_owner_only" ON public.talleres;

-- Políticas de docente_biblioteca
DROP POLICY IF EXISTS "biblioteca_crud_self" ON public.docente_biblioteca;

-- Políticas de grupo_talleres
DROP POLICY IF EXISTS "grupo_talleres_select_own_groups" ON public.grupo_talleres;
DROP POLICY IF EXISTS "grupo_talleres_insert_own_groups" ON public.grupo_talleres;
DROP POLICY IF EXISTS "grupo_talleres_update_own_groups" ON public.grupo_talleres;
DROP POLICY IF EXISTS "grupo_talleres_delete_own_groups" ON public.grupo_talleres;

-- ============================================================================
-- PASO 5: ELIMINAR TABLAS (en orden inverso por dependencias)
-- ============================================================================

DROP TABLE IF EXISTS public.grupo_talleres CASCADE;
DROP TABLE IF EXISTS public.docente_biblioteca CASCADE;
DROP TABLE IF EXISTS public.talleres CASCADE;

-- ============================================================================
-- VERIFICACIÓN POST-ROLLBACK
-- ============================================================================

DO $$
DECLARE
  groups_with_workshop INTEGER;
  groups_without_workshop INTEGER;
BEGIN
  SELECT COUNT(*) INTO groups_with_workshop 
  FROM public.class_assignments 
  WHERE assigned_workshop_id IS NOT NULL;
  
  SELECT COUNT(*) INTO groups_without_workshop 
  FROM public.class_assignments 
  WHERE assigned_workshop_id IS NULL;
  
  RAISE NOTICE 'Rollback completado:';
  RAISE NOTICE '  - Grupos con taller asignado: %', groups_with_workshop;
  RAISE NOTICE '  - Grupos sin taller: %', groups_without_workshop;
  
  IF groups_without_workshop > 0 THEN
    RAISE WARNING 'Hay % grupos sin taller asignado. Revisar manualmente.', groups_without_workshop;
  END IF;
END $$;

-- ============================================================================
-- FIN DE ROLLBACK
-- ============================================================================

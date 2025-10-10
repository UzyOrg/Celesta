-- ============================================================================
-- Permitir owner_teacher_id NULL para talleres oficiales
-- Fecha: 2025-01-09
-- Razón: Talleres oficiales (BIO-001, etc.) no tienen un owner específico
-- ============================================================================

-- PASO 1: Eliminar FK constraint y recrearla sin NOT NULL
ALTER TABLE public.talleres
DROP CONSTRAINT IF EXISTS talleres_owner_teacher_id_fkey;

-- PASO 2: Permitir NULL en owner_teacher_id
ALTER TABLE public.talleres
ALTER COLUMN owner_teacher_id DROP NOT NULL;

-- PASO 3: Recrear FK constraint (ahora permite NULL)
ALTER TABLE public.talleres
ADD CONSTRAINT talleres_owner_teacher_id_fkey
FOREIGN KEY (owner_teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;

-- PASO 4: Actualizar comentario
COMMENT ON COLUMN public.talleres.owner_teacher_id IS 'Docente propietario del taller (NULL para talleres oficiales/públicos)';

-- PASO 5: Actualizar política de SELECT para incluir talleres oficiales (owner_teacher_id IS NULL)
DROP POLICY IF EXISTS "talleres_select_by_library_or_owner" ON public.talleres;
CREATE POLICY "talleres_select_by_library_or_owner" ON public.talleres
  FOR SELECT USING (
    -- Talleres oficiales sin dueño son visibles para todos
    owner_teacher_id IS NULL
    OR
    -- Talleres del docente autenticado
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = owner_teacher_id AND t.id = auth.uid()
    )
    OR
    -- Talleres en la biblioteca del docente
    EXISTS (
      SELECT 1 FROM public.docente_biblioteca b
      WHERE b.taller_id = talleres.id AND b.teacher_id = auth.uid()
    )
    OR
    -- Talleres públicos
    es_publico = TRUE
  );

-- Verificación
DO $$
BEGIN
  RAISE NOTICE 'Columna owner_teacher_id ahora permite NULL para talleres oficiales';
  RAISE NOTICE 'Política RLS actualizada para talleres oficiales';
END $$;

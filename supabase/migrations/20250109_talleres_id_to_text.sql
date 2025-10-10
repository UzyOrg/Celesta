-- ============================================================================
-- Cambiar talleres.id de UUID a TEXT para soportar códigos legibles
-- Fecha: 2025-01-09
-- Razón: Talleres oficiales necesitan IDs como 'BIO-001', 'MAT-101', etc.
-- ============================================================================

-- PASO 1: Eliminar políticas RLS temporalmente
DROP POLICY IF EXISTS "talleres_select_by_library_or_owner" ON public.talleres;
DROP POLICY IF EXISTS "talleres_insert_owner_only" ON public.talleres;
DROP POLICY IF EXISTS "talleres_update_owner_only" ON public.talleres;
DROP POLICY IF EXISTS "talleres_delete_owner_only" ON public.talleres;

DROP POLICY IF EXISTS "grupo_talleres_select_own_groups" ON public.grupo_talleres;
DROP POLICY IF EXISTS "grupo_talleres_insert_own_groups" ON public.grupo_talleres;
DROP POLICY IF EXISTS "grupo_talleres_update_own_groups" ON public.grupo_talleres;
DROP POLICY IF EXISTS "grupo_talleres_delete_own_groups" ON public.grupo_talleres;

-- PASO 2: Eliminar FK constraints
ALTER TABLE public.grupo_talleres
DROP CONSTRAINT IF EXISTS grupo_talleres_taller_id_fkey;

ALTER TABLE public.docente_biblioteca
DROP CONSTRAINT IF EXISTS docente_biblioteca_taller_id_fkey;

-- PASO 3: Cambiar tipo de columna en talleres
-- Primero eliminar el default (gen_random_uuid)
ALTER TABLE public.talleres
ALTER COLUMN id DROP DEFAULT;

-- Cambiar tipo de UUID a TEXT
ALTER TABLE public.talleres
ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- PASO 4: Cambiar tipo de columna en tablas relacionadas
ALTER TABLE public.grupo_talleres
ALTER COLUMN taller_id TYPE TEXT USING taller_id::TEXT;

ALTER TABLE public.docente_biblioteca
ALTER COLUMN taller_id TYPE TEXT USING taller_id::TEXT;

-- PASO 5: Recrear FK constraints
ALTER TABLE public.grupo_talleres
ADD CONSTRAINT grupo_talleres_taller_id_fkey
FOREIGN KEY (taller_id) REFERENCES public.talleres(id) ON DELETE CASCADE;

ALTER TABLE public.docente_biblioteca
ADD CONSTRAINT docente_biblioteca_taller_id_fkey
FOREIGN KEY (taller_id) REFERENCES public.talleres(id) ON DELETE CASCADE;

-- PASO 6: Agregar constraint para validar formato de ID
-- Formato: LETRAS-NÚMEROS (ej: BIO-001, MAT-3A)
ALTER TABLE public.talleres
ADD CONSTRAINT talleres_id_format_check
CHECK (id ~ '^[A-Z]+-[A-Z0-9]+$');

-- PASO 7: Recrear políticas RLS para talleres
CREATE POLICY "talleres_select_by_library_or_owner" ON public.talleres
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = owner_teacher_id AND t.id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.docente_biblioteca b
      WHERE b.taller_id = talleres.id AND b.teacher_id = auth.uid()
    )
    OR es_publico = TRUE
  );

CREATE POLICY "talleres_insert_owner_only" ON public.talleres
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = talleres.owner_teacher_id AND t.id = auth.uid()
    )
  );

CREATE POLICY "talleres_update_owner_only" ON public.talleres
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = talleres.owner_teacher_id AND t.id = auth.uid()
    )
  );

CREATE POLICY "talleres_delete_owner_only" ON public.talleres
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = talleres.owner_teacher_id AND t.id = auth.uid()
    )
  );

-- PASO 8: Recrear políticas RLS para grupo_talleres
CREATE POLICY "grupo_talleres_select_own_groups" ON public.grupo_talleres
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.class_assignments g
      WHERE g.id = grupo_talleres.group_id AND g.teacher_id = auth.uid()
    )
  );

CREATE POLICY "grupo_talleres_insert_own_groups" ON public.grupo_talleres
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.class_assignments g
      WHERE g.id = grupo_talleres.group_id AND g.teacher_id = auth.uid()
    )
    AND assigned_by_teacher_id = auth.uid()
  );

CREATE POLICY "grupo_talleres_update_own_groups" ON public.grupo_talleres
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.class_assignments g
      WHERE g.id = grupo_talleres.group_id AND g.teacher_id = auth.uid()
    )
  );

CREATE POLICY "grupo_talleres_delete_own_groups" ON public.grupo_talleres
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.class_assignments g
      WHERE g.id = grupo_talleres.group_id AND g.teacher_id = auth.uid()
    )
  );

-- Verificación
DO $$
BEGIN
  RAISE NOTICE 'Tabla talleres: id cambiado de UUID a TEXT exitosamente';
  RAISE NOTICE 'Políticas RLS recreadas correctamente';
END $$;

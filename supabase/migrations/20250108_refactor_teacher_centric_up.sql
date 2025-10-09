-- ============================================================================
-- MIGRACIÓN: Refactorización a Modelo Centrado en Docente
-- Fecha: 2025-01-08
-- Descripción: Transición de modelo grupo-céntrico a docente-céntrico
--              con biblioteca personal de talleres
-- ============================================================================

-- ============================================================================
-- PASO 1: CREAR NUEVAS TABLAS
-- ============================================================================

-- Tabla: talleres (contenido maestro de talleres)
CREATE TABLE IF NOT EXISTS public.talleres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  owner_teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  contenido_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  etiquetas TEXT[] DEFAULT '{}',
  es_publico BOOLEAN DEFAULT FALSE,
  CONSTRAINT talleres_nombre_not_empty CHECK (LENGTH(TRIM(nombre)) > 0)
);

-- Índices para talleres
CREATE INDEX IF NOT EXISTS idx_talleres_owner ON public.talleres(owner_teacher_id);
CREATE INDEX IF NOT EXISTS idx_talleres_nombre ON public.talleres USING gin(to_tsvector('spanish', nombre));
CREATE INDEX IF NOT EXISTS idx_talleres_etiquetas ON public.talleres USING gin(etiquetas);

COMMENT ON TABLE public.talleres IS 'Contenido maestro de talleres pedagógicos';
COMMENT ON COLUMN public.talleres.owner_teacher_id IS 'Docente creador y propietario del taller';
COMMENT ON COLUMN public.talleres.contenido_json IS 'Estructura JSON del taller (pasos, recursos, etc.)';

-- ============================================================================
-- Tabla: docente_biblioteca (biblioteca personal del docente)
CREATE TABLE IF NOT EXISTS public.docente_biblioteca (
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  taller_id UUID NOT NULL REFERENCES public.talleres(id) ON DELETE CASCADE,
  agregado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notas_personales TEXT,
  PRIMARY KEY (teacher_id, taller_id)
);

-- Índices para docente_biblioteca
CREATE INDEX IF NOT EXISTS idx_docente_biblioteca_taller ON public.docente_biblioteca(taller_id);
CREATE INDEX IF NOT EXISTS idx_docente_biblioteca_teacher ON public.docente_biblioteca(teacher_id);

COMMENT ON TABLE public.docente_biblioteca IS 'Biblioteca personal de talleres por docente (N:M)';

-- ============================================================================
-- Tabla: grupo_talleres (asignaciones de talleres a grupos)
CREATE TABLE IF NOT EXISTS public.grupo_talleres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.class_assignments(id) ON DELETE CASCADE,
  taller_id UUID NOT NULL REFERENCES public.talleres(id) ON DELETE CASCADE,
  assigned_by_teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  position INTEGER NOT NULL DEFAULT 0,
  configuracion_json JSONB DEFAULT '{}'::jsonb,
  UNIQUE (group_id, taller_id)
);

-- Índices para grupo_talleres
CREATE INDEX IF NOT EXISTS idx_grupo_talleres_group ON public.grupo_talleres(group_id);
CREATE INDEX IF NOT EXISTS idx_grupo_talleres_taller ON public.grupo_talleres(taller_id);
CREATE INDEX IF NOT EXISTS idx_grupo_talleres_position ON public.grupo_talleres(group_id, position);

COMMENT ON TABLE public.grupo_talleres IS 'Asignaciones de talleres a grupos (N:M)';
COMMENT ON COLUMN public.grupo_talleres.position IS 'Orden de presentación del taller en el grupo';

-- ============================================================================
-- PASO 2: HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.talleres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docente_biblioteca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupo_talleres ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASO 3: CREAR POLÍTICAS RLS
-- ============================================================================

-- Políticas para talleres
-- Los docentes pueden ver talleres si son owner o si están en su biblioteca
DROP POLICY IF EXISTS "talleres_select_by_library_or_owner" ON public.talleres;
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

-- Solo el owner puede insertar talleres
DROP POLICY IF EXISTS "talleres_insert_owner_only" ON public.talleres;
CREATE POLICY "talleres_insert_owner_only" ON public.talleres
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = owner_teacher_id AND t.id = auth.uid()
    )
  );

-- Solo el owner puede actualizar sus talleres
DROP POLICY IF EXISTS "talleres_update_owner_only" ON public.talleres;
CREATE POLICY "talleres_update_owner_only" ON public.talleres
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = owner_teacher_id AND t.id = auth.uid()
    )
  );

-- Solo el owner puede eliminar sus talleres
DROP POLICY IF EXISTS "talleres_delete_owner_only" ON public.talleres;
CREATE POLICY "talleres_delete_owner_only" ON public.talleres
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = owner_teacher_id AND t.id = auth.uid()
    )
  );

-- Políticas para docente_biblioteca
-- Los docentes solo pueden gestionar su propia biblioteca
DROP POLICY IF EXISTS "biblioteca_crud_self" ON public.docente_biblioteca;
CREATE POLICY "biblioteca_crud_self" ON public.docente_biblioteca
  FOR ALL USING (
    teacher_id = auth.uid()
  )
  WITH CHECK (
    teacher_id = auth.uid()
  );

-- Políticas para grupo_talleres
-- Los docentes solo pueden gestionar talleres de sus propios grupos
DROP POLICY IF EXISTS "grupo_talleres_select_own_groups" ON public.grupo_talleres;
CREATE POLICY "grupo_talleres_select_own_groups" ON public.grupo_talleres
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.class_assignments g
      WHERE g.id = grupo_talleres.group_id AND g.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "grupo_talleres_insert_own_groups" ON public.grupo_talleres;
CREATE POLICY "grupo_talleres_insert_own_groups" ON public.grupo_talleres
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.class_assignments g
      WHERE g.id = grupo_talleres.group_id AND g.teacher_id = auth.uid()
    )
    AND assigned_by_teacher_id = auth.uid()
  );

DROP POLICY IF EXISTS "grupo_talleres_update_own_groups" ON public.grupo_talleres;
CREATE POLICY "grupo_talleres_update_own_groups" ON public.grupo_talleres
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.class_assignments g
      WHERE g.id = grupo_talleres.group_id AND g.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "grupo_talleres_delete_own_groups" ON public.grupo_talleres;
CREATE POLICY "grupo_talleres_delete_own_groups" ON public.grupo_talleres
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.class_assignments g
      WHERE g.id = grupo_talleres.group_id AND g.teacher_id = auth.uid()
    )
  );

-- ============================================================================
-- PASO 4: TRIGGER PARA AUTO-AÑADIR TALLER A BIBLIOTECA DEL OWNER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_add_owner_taller_to_library()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Cuando un docente crea un taller, automáticamente se añade a su biblioteca
  INSERT INTO public.docente_biblioteca (teacher_id, taller_id)
  VALUES (NEW.owner_teacher_id, NEW.id)
  ON CONFLICT (teacher_id, taller_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_add_owner_taller_to_library ON public.talleres;
CREATE TRIGGER trg_add_owner_taller_to_library
  AFTER INSERT ON public.talleres
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_add_owner_taller_to_library();

COMMENT ON FUNCTION public.fn_add_owner_taller_to_library() IS 'Auto-añade talleres creados a la biblioteca del docente owner';

-- ============================================================================
-- PASO 5: TRIGGER PARA ACTUALIZAR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_update_talleres_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_talleres_timestamp ON public.talleres;
CREATE TRIGGER trg_update_talleres_timestamp
  BEFORE UPDATE ON public.talleres
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_update_talleres_timestamp();

-- ============================================================================
-- PASO 6: MIGRACIÓN DE DATOS EXISTENTES
-- ============================================================================

-- IMPORTANTE: Este script asume que assigned_workshop_id contiene IDs de talleres
-- que ya existen o que se crearán a partir de los datos actuales

-- 6.1: Crear talleres a partir de assigned_workshop_id únicos
-- Nota: Ajusta esto según tu estructura real de datos
INSERT INTO public.talleres (id, owner_teacher_id, nombre, descripcion, contenido_json)
SELECT 
  gen_random_uuid() as id,
  ca.teacher_id as owner_teacher_id,
  ca.assigned_workshop_id as nombre,
  'Taller migrado desde grupo ' || ca.class_token as descripcion,
  '{}'::jsonb as contenido_json
FROM public.class_assignments ca
WHERE ca.assigned_workshop_id IS NOT NULL
  AND ca.assigned_workshop_id != ''
ON CONFLICT DO NOTHING;

-- 6.2: Crear una tabla temporal para mapear assigned_workshop_id -> taller_id
CREATE TEMP TABLE temp_workshop_mapping AS
SELECT DISTINCT
  ca.assigned_workshop_id as old_workshop_id,
  t.id as new_taller_id,
  ca.teacher_id
FROM public.class_assignments ca
JOIN public.talleres t ON t.nombre = ca.assigned_workshop_id AND t.owner_teacher_id = ca.teacher_id
WHERE ca.assigned_workshop_id IS NOT NULL;

-- 6.3: Añadir talleres a biblioteca de docentes
INSERT INTO public.docente_biblioteca (teacher_id, taller_id)
SELECT DISTINCT
  teacher_id,
  new_taller_id
FROM temp_workshop_mapping
ON CONFLICT (teacher_id, taller_id) DO NOTHING;

-- 6.4: Crear asignaciones grupo ↔ taller
INSERT INTO public.grupo_talleres (group_id, taller_id, assigned_by_teacher_id, position)
SELECT 
  ca.id as group_id,
  tm.new_taller_id as taller_id,
  ca.teacher_id as assigned_by_teacher_id,
  0 as position
FROM public.class_assignments ca
JOIN temp_workshop_mapping tm ON tm.old_workshop_id = ca.assigned_workshop_id AND tm.teacher_id = ca.teacher_id
WHERE ca.assigned_workshop_id IS NOT NULL
ON CONFLICT (group_id, taller_id) DO NOTHING;

-- Limpiar tabla temporal
DROP TABLE IF EXISTS temp_workshop_mapping;

-- ============================================================================
-- PASO 7: ELIMINAR COLUMNA OBSOLETA (COMENTADO POR SEGURIDAD)
-- ============================================================================
-- IMPORTANTE: Ejecuta esto SOLO después de verificar que la migración fue exitosa
-- y que todos los datos se migraron correctamente

-- Descomentar cuando estés listo:
-- ALTER TABLE public.class_assignments DROP COLUMN IF EXISTS assigned_workshop_id;

-- ============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================================================

-- Verificar conteo de talleres creados
DO $$
DECLARE
  taller_count INTEGER;
  biblioteca_count INTEGER;
  grupo_talleres_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO taller_count FROM public.talleres;
  SELECT COUNT(*) INTO biblioteca_count FROM public.docente_biblioteca;
  SELECT COUNT(*) INTO grupo_talleres_count FROM public.grupo_talleres;
  
  RAISE NOTICE 'Migración completada:';
  RAISE NOTICE '  - Talleres creados: %', taller_count;
  RAISE NOTICE '  - Entradas en biblioteca: %', biblioteca_count;
  RAISE NOTICE '  - Asignaciones grupo-taller: %', grupo_talleres_count;
END $$;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

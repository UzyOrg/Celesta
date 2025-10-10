-- ============================================================================
-- Corregir trigger para talleres sin owner (oficiales)
-- Fecha: 2025-01-09
-- Razón: El trigger fallaba al intentar añadir talleres con owner=NULL a biblioteca
-- ============================================================================

-- Reemplazar función para que ignore talleres sin owner
CREATE OR REPLACE FUNCTION public.fn_add_owner_taller_to_library()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Solo ejecutar si el taller tiene un owner (no es oficial)
  IF NEW.owner_teacher_id IS NOT NULL THEN
    -- Cuando un docente crea un taller, automáticamente se añade a su biblioteca
    INSERT INTO public.docente_biblioteca (teacher_id, taller_id)
    VALUES (NEW.owner_teacher_id, NEW.id)
    ON CONFLICT (teacher_id, taller_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Verificación
DO $$
BEGIN
  RAISE NOTICE 'Trigger actualizado: talleres oficiales (owner=NULL) no se añaden a biblioteca';
END $$;

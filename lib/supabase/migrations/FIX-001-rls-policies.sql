-- FIX-001: RLS Policies para eventos_de_aprendizaje y alias_sessions
-- APLICAR DESPUÉS DE: eventos_de_aprendizaje.sql y prb-alias-rls.sql
-- PRINCIPIO: Defense in Depth - RLS como última línea de defensa

-- ============================================================================
-- POLÍTICA 1: eventos_de_aprendizaje - Solo lectura agregada anónima
-- ============================================================================

-- Los usuarios anónimos SOLO pueden leer sus propios eventos (por session_id)
-- Esto previene que un estudiante vea eventos de otros estudiantes
CREATE POLICY "anon_read_own_events"
  ON public.eventos_de_aprendizaje
  FOR SELECT
  TO anon
  USING (
    -- Un usuario anónimo solo puede ver eventos donde el session_id coincida
    -- con el que pasa como parámetro (debe venir del cliente)
    student_session_id = current_setting('request.jwt.claims', true)::json->>'student_session_id'
  );

-- NOTA: Para inserción, los eventos DEBEN venir a través de /api/events/ingest
-- que usa service_role. NO permitimos INSERT directo desde cliente.

-- ============================================================================
-- POLÍTICA 2: alias_sessions - Solo lectura de propio alias
-- ============================================================================

-- Los usuarios anónimos solo pueden leer su propio alias
CREATE POLICY "anon_read_own_alias"
  ON public.alias_sessions
  FOR SELECT
  TO anon
  USING (
    student_session_id = current_setting('request.jwt.claims', true)::json->>'student_session_id'
  );

-- ============================================================================
-- POLÍTICA 3: class_assignments - Lectura pública de asignaciones activas
-- ============================================================================

-- ESTA POLÍTICA YA EXISTE en prd-class-assignments.sql
-- Solo confirmar que está activa:
-- "Students can read active assignments" (line 74-77 en pre-teacher-authentication.sql)

-- ============================================================================
-- POLÍTICA 4: Docentes autenticados - Acceso a sus propios datos
-- ============================================================================

-- Los docentes autenticados pueden leer eventos de sus clases
CREATE POLICY "teachers_read_own_class_events"
  ON public.eventos_de_aprendizaje
  FOR SELECT
  TO authenticated
  USING (
    -- Verificar que el class_token pertenece al docente autenticado
    EXISTS (
      SELECT 1 FROM public.class_assignments ca
      WHERE ca.class_token = eventos_de_aprendizaje.class_token
        AND ca.teacher_id = auth.uid()
    )
  );

-- Los docentes pueden leer aliases de sus clases
CREATE POLICY "teachers_read_own_class_aliases"
  ON public.alias_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_assignments ca
      WHERE ca.class_token = alias_sessions.class_token
        AND ca.teacher_id = auth.uid()
    )
  );

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Para verificar que las políticas están activas:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('eventos_de_aprendizaje', 'alias_sessions', 'class_assignments');

-- ============================================================================
-- NOTAS DE SEGURIDAD
-- ============================================================================

-- 1. El service_role SIEMPRE bypassea RLS (por diseño de Supabase)
--    Por eso /api/events/ingest funciona sin problemas
--
-- 2. Para que anon_read_own_events funcione, necesitas pasar el session_id
--    en las llamadas del cliente usando el parámetro JWT personalizado
--
-- 3. ALTERNATIVA SIMPLE: Si no quieres manejar JWT claims personalizados,
--    puedes dejar estas políticas DESHABILITADAS y confiar 100% en la lógica
--    de la aplicación + service_role. Pero esto NO es defensa en profundidad.
--
-- 4. RECOMENDACIÓN: Para el MVP, mantén las políticas de docentes (authenticated)
--    y deshabilita las de anon hasta que implementes JWT claims personalizados.

-- Para deshabilitar temporalmente las políticas de anon:
-- DROP POLICY IF EXISTS "anon_read_own_events" ON public.eventos_de_aprendizaje;
-- DROP POLICY IF EXISTS "anon_read_own_alias" ON public.alias_sessions;

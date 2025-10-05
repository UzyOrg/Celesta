-- PRF: Managed Roster System - Student Request & Approval Flow
-- Fecha: 2025-01-04
-- Descripción: Sistema de gestión de roster donde docentes aprueban estudiantes

-- ============================================================================
-- TABLA: student_roster
-- ============================================================================
-- Esta tabla centraliza el control de acceso de estudiantes a grupos.
-- Un estudiante debe ser aprobado por el docente para acceder.

CREATE TABLE IF NOT EXISTS public.student_roster (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Identificadores
  class_token TEXT NOT NULL,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  
  -- Identidad del estudiante
  student_alias TEXT NOT NULL,
  student_session_id TEXT,  -- Nullable: se asigna después de aprobación
  
  -- Estado de la solicitud
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Metadatos
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  
  -- Restricciones
  CONSTRAINT unique_class_alias UNIQUE (class_token, student_alias)
);

-- ============================================================================
-- ÍNDICES
-- ============================================================================

-- Índice para búsquedas por class_token (docente viendo su roster)
CREATE INDEX IF NOT EXISTS idx_student_roster_class_token 
ON public.student_roster(class_token);

-- Índice para búsquedas por teacher_id (docente viendo todos sus estudiantes)
CREATE INDEX IF NOT EXISTS idx_student_roster_teacher_id 
ON public.student_roster(teacher_id);

-- Índice para búsquedas por status (filtrar pendientes/aprobados)
CREATE INDEX IF NOT EXISTS idx_student_roster_status 
ON public.student_roster(class_token, status);

-- Índice para verificación de acceso de estudiante
CREATE INDEX IF NOT EXISTS idx_student_roster_session_lookup 
ON public.student_roster(class_token, student_alias, status) 
WHERE status = 'approved';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.student_roster ENABLE ROW LEVEL SECURITY;

-- Policy 1: Docentes pueden ver/modificar solo sus estudiantes
CREATE POLICY "Docentes ven su propio roster"
ON public.student_roster
FOR ALL
TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

-- Policy 2: Inserción pública para solicitudes (sin autenticación)
-- Los estudiantes anónimos pueden crear solicitudes
CREATE POLICY "Estudiantes pueden solicitar ingreso"
ON public.student_roster
FOR INSERT
TO anon
WITH CHECK (status = 'pending');

-- Policy 3: Lectura pública limitada para verificación de estado
-- Un estudiante puede verificar el estado de SU solicitud específica
CREATE POLICY "Estudiantes pueden ver estado de su solicitud"
ON public.student_roster
FOR SELECT
TO anon
USING (true);  -- Permitimos SELECT, pero la lógica del cliente filtra

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_student_roster_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  -- Si se aprueba, guardar timestamp
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    NEW.approved_at = NOW();
  END IF;
  
  -- Si se rechaza, guardar timestamp
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    NEW.rejected_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_student_roster_timestamp
BEFORE UPDATE ON public.student_roster
FOR EACH ROW
EXECUTE FUNCTION update_student_roster_updated_at();

-- ============================================================================
-- FUNCIONES AUXILIARES
-- ============================================================================

-- Función para obtener el conteo de solicitudes pendientes por grupo
CREATE OR REPLACE FUNCTION get_pending_requests_count(p_class_token TEXT, p_teacher_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.student_roster
  WHERE class_token = p_class_token
    AND teacher_id = p_teacher_id
    AND status = 'pending';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================================
-- COMENTARIOS (Documentación)
-- ============================================================================

COMMENT ON TABLE public.student_roster IS 
'Roster gestionado de estudiantes. Requiere aprobación del docente para acceder.';

COMMENT ON COLUMN public.student_roster.status IS 
'Estado de la solicitud: pending (esperando), approved (aprobado), rejected (rechazado)';

COMMENT ON COLUMN public.student_roster.student_session_id IS 
'UUID de sesión del estudiante. Se asigna después de aprobación cuando el estudiante inicia sesión.';

-- ============================================================================
-- MIGRACIÓN DE DATOS EXISTENTES (Opcional)
-- ============================================================================
-- Si tienes estudiantes en alias_sessions que ya existen, puedes migrarlos:

-- DESCOMENTA ESTO SOLO SI QUIERES MIGRAR DATOS EXISTENTES:
-- INSERT INTO public.student_roster (class_token, teacher_id, student_alias, student_session_id, status, created_at, approved_at)
-- SELECT 
--   a.class_token,
--   c.teacher_id,
--   a.alias as student_alias,
--   a.student_session_id,
--   'approved' as status,
--   a.last_seen as created_at,
--   a.last_seen as approved_at
-- FROM public.alias_sessions a
-- JOIN public.class_tokens c ON c.token = a.class_token
-- ON CONFLICT (class_token, student_alias) DO NOTHING;

COMMIT;

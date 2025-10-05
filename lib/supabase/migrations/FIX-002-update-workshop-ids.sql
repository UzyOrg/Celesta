-- FIX-002: Update Workshop IDs from cell-mystery to BIO-001
-- Fecha: 2025-01-05
-- Razón: Migración de identificadores antiguos a nuevos IDs de workshop

-- Actualizar DEMO-101 si existe con el ID antiguo
UPDATE public.class_assignments 
SET assigned_workshop_id = 'BIO-001', 
    updated_at = now()
WHERE class_token = 'DEMO-101' 
  AND assigned_workshop_id = 'cell-mystery';

-- Actualizar DEMO-101 para asignarle teacher si no tiene
-- Esto solo se ejecuta si existe un teacher con ese email
UPDATE public.class_assignments 
SET teacher_id = (SELECT id FROM public.teachers WHERE email = 'uzielmedina@hotmail.com' LIMIT 1),
    updated_at = now()
WHERE class_token = 'DEMO-101'
  AND teacher_id IS NULL
  AND EXISTS (SELECT 1 FROM public.teachers WHERE email = 'uzielmedina@hotmail.com');

-- Crear CIENCIAS-101 si no existe (para testing)
-- Solo se crea si existe el teacher en la base de datos
INSERT INTO public.class_assignments (class_token, assigned_workshop_id, teacher_id, is_active)
SELECT 'CIENCIAS-101', 'BIO-001', t.id, true
FROM public.teachers t
WHERE t.email = 'uzielmedina@hotmail.com'
ON CONFLICT (class_token) 
DO UPDATE SET 
  assigned_workshop_id = 'BIO-001',
  updated_at = now();

-- Verificar cambios
SELECT class_token, assigned_workshop_id, teacher_id, is_active, updated_at 
FROM public.class_assignments 
WHERE class_token IN ('DEMO-101', 'CIENCIAS-101')
ORDER BY class_token;

-- ============================================================================
-- BACKFILL: Insertar usuarios existentes de auth.users a public.teachers
-- ============================================================================
-- Este script inserta todos los usuarios que ya existen en auth.users
-- pero que no están en la tabla teachers
-- ============================================================================

-- Ejecuta esto en el SQL Editor de Supabase:

INSERT INTO public.teachers (id, email, full_name, created_at, updated_at)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'full_name', '') as full_name,
  created_at,
  NOW() as updated_at
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

-- Verificar que se insertaron correctamente:
SELECT 
  t.id,
  t.email,
  t.full_name,
  t.created_at,
  u.email_confirmed_at
FROM public.teachers t
LEFT JOIN auth.users u ON t.id = u.id
ORDER BY t.created_at DESC;

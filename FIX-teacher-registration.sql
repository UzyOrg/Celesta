-- ============================================================================
-- FIX: Teacher Registration - Auto-insert trigger
-- ============================================================================
-- Problem: When a teacher signs up via Supabase Auth, the user is created in
-- auth.users but NOT automatically inserted into public.teachers table.
-- This causes the teacher to be able to login but not appear in the teachers table.
--
-- Solution: Create a trigger that automatically inserts into public.teachers
-- when a new user is created in auth.users
-- ============================================================================

-- 1. Create teachers table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS on teachers table
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for teachers
-- Policy: Teachers can read their own data
DROP POLICY IF EXISTS "Teachers can read own data" ON public.teachers;
CREATE POLICY "Teachers can read own data"
  ON public.teachers
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Teachers can update their own data
DROP POLICY IF EXISTS "Teachers can update own data" ON public.teachers;
CREATE POLICY "Teachers can update own data"
  ON public.teachers
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_teacher()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.teachers (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- 5. Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_teacher();

-- 6. Create function to handle user updates
CREATE OR REPLACE FUNCTION public.handle_teacher_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.teachers
  SET 
    email = NEW.email,
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
    updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- 7. Create trigger for user updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_teacher_updated();

-- ============================================================================
-- IMPORTANT: After running this migration, any EXISTING users in auth.users
-- need to be backfilled into the teachers table. Run the following query:
-- ============================================================================
-- INSERT INTO public.teachers (id, email, full_name, created_at, updated_at)
-- SELECT 
--   id, 
--   email, 
--   COALESCE(raw_user_meta_data->>'full_name', '') as full_name,
--   created_at,
--   updated_at
-- FROM auth.users
-- ON CONFLICT (id) DO NOTHING;
-- ============================================================================

COMMENT ON TABLE public.teachers IS 'Teacher profiles synchronized with auth.users';
COMMENT ON FUNCTION public.handle_new_teacher() IS 'Automatically creates teacher record when user signs up';
COMMENT ON FUNCTION public.handle_teacher_updated() IS 'Keeps teacher record in sync with auth.users updates';

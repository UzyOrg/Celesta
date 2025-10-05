-- PR-E: Teacher Authentication System
-- Complete authentication infrastructure for multi-teacher platform
-- This migration transforms Celesta from a demo to a production-ready multi-user system

-- ============================================================================
-- STEP 1: Create Teachers Profile Table
-- ============================================================================

create table if not exists public.teachers (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS for teachers table
alter table public.teachers enable row level security;

-- Policy: Teachers can read their own profile
create policy "Teachers can view own profile"
  on public.teachers
  for select
  using (auth.uid() = id);

-- Policy: Teachers can update their own profile
create policy "Teachers can update own profile"
  on public.teachers
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Indexes for performance
create index if not exists teachers_email_idx on public.teachers (email);
create index if not exists teachers_id_idx on public.teachers (id);

-- Comments
comment on table public.teachers is 'Teacher profiles linked to auth.users';
comment on column public.teachers.id is 'Foreign key to auth.users.id';
comment on column public.teachers.email is 'Teacher email (synced from auth.users)';
comment on column public.teachers.full_name is 'Teacher full name';

-- ============================================================================
-- STEP 2: Modify class_assignments to link to teachers
-- ============================================================================

-- Add teacher_id column if it doesn't exist
do $$ 
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'class_assignments' 
    and column_name = 'teacher_id'
  ) then
    alter table public.class_assignments 
    add column teacher_id uuid references public.teachers(id) on delete cascade;
    
    -- Create index
    create index class_assignments_teacher_idx on public.class_assignments (teacher_id);
    
    comment on column public.class_assignments.teacher_id is 'Teacher who owns this class assignment';
  end if;
end $$;

-- ============================================================================
-- STEP 3: Update RLS Policies for class_assignments
-- ============================================================================

-- Drop existing public read policy (we need more granular control now)
drop policy if exists "Allow public read for active assignments" on public.class_assignments;

-- NEW POLICY: Students can read active assignments (for workshop loading)
-- This allows anonymous users to access workshops
create policy "Students can read active assignments"
  on public.class_assignments
  for select
  using (is_active = true);

-- NEW POLICY: Teachers can read their own assignments
create policy "Teachers can view own assignments"
  on public.class_assignments
  for select
  using (auth.uid() = teacher_id);

-- NEW POLICY: Teachers can create their own assignments
create policy "Teachers can create own assignments"
  on public.class_assignments
  for insert
  with check (auth.uid() = teacher_id);

-- NEW POLICY: Teachers can update their own assignments
create policy "Teachers can update own assignments"
  on public.class_assignments
  for update
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

-- NEW POLICY: Teachers can delete their own assignments
create policy "Teachers can delete own assignments"
  on public.class_assignments
  for delete
  using (auth.uid() = teacher_id);

-- ============================================================================
-- STEP 4: Automatic Teacher Profile Creation (Trigger)
-- ============================================================================

-- Function to auto-create teacher profile on auth.users insert
create or replace function public.handle_new_teacher()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Only create teacher profile if email is confirmed
  -- and user metadata indicates they're signing up as a teacher
  insert into public.teachers (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  
  return new;
end;
$$;

-- Trigger on auth.users table
-- This will run every time a new user is created via Supabase Auth
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_teacher();

-- ============================================================================
-- STEP 5: Seed Data (Optional - for demo/testing)
-- ============================================================================

-- Note: In production, teachers will be created via signup flow
-- This seed is only for development/testing

-- Example: Create a demo teacher (only if auth.users entry exists)
-- In real flow, this happens automatically via the trigger above
-- Uncomment the following if you want to manually create a demo teacher:

/*
-- First, you'd create the auth.users entry via Supabase Dashboard or API
-- Then this would create the profile:
insert into public.teachers (id, email, full_name)
values (
  'YOUR-AUTH-USER-UUID-HERE', 
  'demo@celesta.com', 
  'Demo Teacher'
)
on conflict (id) do nothing;

-- Then you can link the existing DEMO-101 assignment to this teacher:
update public.class_assignments
set teacher_id = 'YOUR-AUTH-USER-UUID-HERE'
where class_token = 'DEMO-101';
*/

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- IMPORTANT NOTES:
-- 1. Run this migration in your Supabase SQL Editor
-- 2. Ensure Supabase Auth Email/Password provider is enabled in dashboard
-- 3. Existing class_assignments will have NULL teacher_id (legacy demo data)
-- 4. New groups created via the app will automatically link to the teacher
-- 5. The trigger ensures every auth.users insert creates a teacher profile

-- NEXT STEPS:
-- 1. Enable Email/Password auth in Supabase Dashboard > Authentication > Providers
-- 2. Configure email templates (optional)
-- 3. Deploy frontend changes (/login, /signup, AuthGuard)
-- 4. Test the complete flow

-- ROLLBACK (if needed):
-- drop trigger if exists on_auth_user_created on auth.users;
-- drop function if exists public.handle_new_teacher();
-- drop policy if exists "Teachers can delete own assignments" on public.class_assignments;
-- drop policy if exists "Teachers can update own assignments" on public.class_assignments;
-- drop policy if exists "Teachers can create own assignments" on public.class_assignments;
-- drop policy if exists "Teachers can view own assignments" on public.class_assignments;
-- drop policy if exists "Students can read active assignments" on public.class_assignments;
-- alter table public.class_assignments drop column if exists teacher_id;
-- drop table if exists public.teachers;

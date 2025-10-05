-- PR-D: Class Assignments - Dynamic Workshop Assignment System
-- Allows assigning specific workshops to class tokens

-- Create class_assignments table
create table if not exists public.class_assignments (
  id uuid primary key default gen_random_uuid(),
  class_token text not null unique,
  assigned_workshop_id text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.class_assignments enable row level security;

-- Create policy: Allow read access to anyone (needed for student workshop loading)
create policy "Allow public read for active assignments"
  on public.class_assignments
  for select
  using (is_active = true);

-- Indexes for performance
create index if not exists class_assignments_token_idx on public.class_assignments (class_token);
create index if not exists class_assignments_active_idx on public.class_assignments (is_active);

-- Add comments
comment on table public.class_assignments is 'Maps class tokens to assigned workshops';
comment on column public.class_assignments.class_token is 'Unique identifier for the class/group';
comment on column public.class_assignments.assigned_workshop_id is 'ID of the assigned workshop/taller';
comment on column public.class_assignments.is_active is 'Whether this assignment is currently active';

-- Insert demo data
insert into public.class_assignments (class_token, assigned_workshop_id, is_active)
values 
  ('DEMO-101', 'BIO-001', true)
on conflict (class_token) do nothing;

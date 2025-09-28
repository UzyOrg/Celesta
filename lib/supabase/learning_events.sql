-- Learning Events table for Celesta
-- Run this SQL in your Supabase project (SQL editor)

create table if not exists public.learning_events (
  id bigserial primary key,
  actor_sid text not null,
  class_token text,
  taller_id text not null,
  paso_id text not null,
  verbo text not null check (verbo in ('inicio_taller','envio_respuesta','solicito_pista','completo_paso','abandono_taller')),
  result jsonb,
  ts timestamptz not null default now()
);

-- Helpful indexes
create index if not exists learning_events_class_token_idx on public.learning_events (class_token);
create index if not exists learning_events_actor_sid_idx on public.learning_events (actor_sid);
create index if not exists learning_events_taller_id_idx on public.learning_events (taller_id);
create index if not exists learning_events_ts_idx on public.learning_events (ts desc);

-- Enable RLS (service role bypasses RLS by design)
alter table public.learning_events enable row level security;

-- Example policy to allow inserts only for service role (bypass), deny others by default
-- Supabase service role bypasses RLS; no explicit policy required for it.
-- Optionally, allow read-only to authenticated users for dashboard experiments:
-- create policy "read_learning_events" on public.learning_events
--   for select using (auth.role() = 'authenticated');

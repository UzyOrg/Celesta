-- Canonical learning events table with idempotency
-- Run in Supabase SQL editor

create table if not exists public.eventos_de_aprendizaje (
  id bigserial primary key,
  client_event_id text not null unique,
  actor_sid text not null,
  student_session_id text,
  class_token text,
  taller_id text not null,
  paso_id text not null,
  verbo text not null check (verbo in ('inicio_taller','envio_respuesta','solicito_pista','completo_paso','taller_completado','abandono_taller')),
  result jsonb,
  ts timestamptz not null default now(),
  client_ts timestamptz
);

-- Helpful indexes
create index if not exists eventos_de_aprendizaje_class_token_idx on public.eventos_de_aprendizaje (class_token);
create index if not exists eventos_de_aprendizaje_actor_sid_idx on public.eventos_de_aprendizaje (actor_sid);
create index if not exists eventos_de_aprendizaje_session_idx on public.eventos_de_aprendizaje (student_session_id);
create index if not exists eventos_de_aprendizaje_taller_id_idx on public.eventos_de_aprendizaje (taller_id);
create index if not exists eventos_de_aprendizaje_ts_idx on public.eventos_de_aprendizaje (ts desc);

-- Enable RLS
alter table public.eventos_de_aprendizaje enable row level security;

-- PR-1: Identidad individual (DATA) — student_session_id
-- Ejecutar en Supabase SQL editor en el proyecto correspondiente

-- 1) Columna nueva (id de sesión por alumno)
alter table public.eventos_de_aprendizaje
  add column if not exists student_session_id text;

-- 2) Migración/backfill: cuando no exista, copiar actor_sid
update public.eventos_de_aprendizaje
  set student_session_id = actor_sid
where student_session_id is null;

-- 3) Índice por sesión para consultas por alumno/sesión
create index if not exists idx_events_session
  on public.eventos_de_aprendizaje(student_session_id);

-- 4) Vista canónica para analítica/SSR (expone student_session_id garantizado)
create or replace view public.learning_events as
select
  e.id,
  e.client_event_id,
  e.actor_sid,
  coalesce(e.student_session_id, e.actor_sid) as student_session_id,
  e.class_token,
  e.taller_id,
  e.paso_id,
  e.verbo,
  e.result,
  e.ts,
  e.client_ts
from public.eventos_de_aprendizaje e;

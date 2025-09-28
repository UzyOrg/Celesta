-- Backward-compatible view mapping canonical eventos_de_aprendizaje to learning_events
-- Safe to run even if a table named learning_events already exists: this block only creates the view if no relation exists.

do $$
begin
  if to_regclass('public.learning_events') is null then
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
  end if;
end $$;

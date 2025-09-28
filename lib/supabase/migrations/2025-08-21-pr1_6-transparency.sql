-- PR-1.6 Transparency: security definer function for anonymized aggregates

create or replace function public.get_transparency_stats(
  _from timestamptz,
  _to timestamptz,
  _class_token text default null
)
returns table (
  class_token text,
  taller_id text,
  total_eventos bigint,
  respuestas bigint,
  pistas bigint,
  completos bigint,
  estudiantes bigint
)
language sql
security definer
set search_path = public
as $$
  select
    e.class_token,
    e.taller_id,
    count(*) as total_eventos,
    count(*) filter (where e.verbo = 'envio_respuesta') as respuestas,
    count(*) filter (where e.verbo = 'solicito_pista') as pistas,
    count(*) filter (where e.verbo in ('completo_paso','taller_completado')) as completos,
    count(distinct coalesce(e.student_session_id, e.actor_sid)) as estudiantes
  from public.learning_events e
  where e.ts >= _from and e.ts <= _to
    and (_class_token is null or e.class_token = _class_token)
  group by e.class_token, e.taller_id
  order by e.class_token, e.taller_id;
$$;

revoke all on function public.get_transparency_stats(timestamptz, timestamptz, text) from public;
grant execute on function public.get_transparency_stats(timestamptz, timestamptz, text) to anon, authenticated;

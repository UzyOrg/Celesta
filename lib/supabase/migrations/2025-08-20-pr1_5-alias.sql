-- PR-1.5 Alias servidor: alias_sessions table and learning_events_with_alias view

create table if not exists public.alias_sessions (
  id bigserial primary key,
  class_token text not null,
  student_session_id text not null,
  alias text not null,
  last_seen timestamptz default now(),
  unique (class_token, student_session_id)
);

create or replace view public.learning_events_with_alias as
select e.*, a.alias
from public.learning_events e
left join public.alias_sessions a
  on a.class_token = e.class_token
 and a.student_session_id = e.student_session_id;

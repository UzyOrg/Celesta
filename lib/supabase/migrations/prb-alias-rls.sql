-- PR-B: RLS and indexes for alias_sessions

-- Enable Row Level Security (RLS)
alter table if exists public.alias_sessions enable row level security;

-- Composite indexes to speed joins and lookups
create index if not exists alias_sessions_class_session_idx on public.alias_sessions (class_token, student_session_id);
create index if not exists alias_sessions_class_last_seen_idx on public.alias_sessions (class_token, last_seen desc);

-- PR-C: Composite indexes for eventos_de_aprendizaje to speed common queries

-- Teacher panel: filter by class_token and time range with ordering by ts desc
create index if not exists eventos_class_ts_idx on public.eventos_de_aprendizaje (class_token, ts desc);

-- Student view: filter by student_session_id and time range with ordering by ts desc
create index if not exists eventos_session_ts_idx on public.eventos_de_aprendizaje (student_session_id, ts desc);

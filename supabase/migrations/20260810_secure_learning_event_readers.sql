-- Raw learning evidence contains free text from minors. Client roles must not
-- read it directly: authorized server readers use service_role only after an
-- application-level identity and ownership check.
--
-- This migration is intentionally safe to run more than once and tolerates a
-- legacy object being absent or `learning_events` still being a table.

DO $migration$
DECLARE
  object_name text;
  object_kind "char";
  public_policy record;
BEGIN
  FOREACH object_name IN ARRAY ARRAY[
    'eventos_de_aprendizaje',
    'alias_sessions',
    'learning_events',
    'learning_events_with_alias'
  ]
  LOOP
    SELECT c.relkind
      INTO object_kind
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = object_name
       AND c.relkind IN ('r', 'p', 'v', 'm')
     LIMIT 1;

    IF object_kind IS NULL THEN
      CONTINUE;
    END IF;

    -- Revoke privileges granted directly to Supabase client roles as well as
    -- privileges inherited through PUBLIC. Service role is deliberately not
    -- changed.
    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon, authenticated, PUBLIC',
      object_name
    );

    IF object_kind IN ('r', 'p') THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', object_name);
    ELSIF object_kind = 'v' THEN
      -- A view owned by a privileged role must not bypass the RLS of its base
      -- tables if a future server-side grant is added deliberately.
      EXECUTE format(
        'ALTER VIEW public.%I SET (security_invoker = true)',
        object_name
      );
    END IF;

    object_kind := NULL;
  END LOOP;

  -- These policies came from the previous teacher/anonymous-reader model.
  -- Dropping every SELECT/ALL policy that includes a client role also covers
  -- renamed copies, while leaving service-role ingestion unaffected.
  FOR public_policy IN
    SELECT schemaname, tablename, policyname
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN ('eventos_de_aprendizaje', 'alias_sessions', 'learning_events')
       AND cmd IN ('SELECT', 'ALL')
       AND roles && ARRAY['anon', 'authenticated', 'public']::name[]
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      public_policy.policyname,
      public_policy.schemaname,
      public_policy.tablename
    );
  END LOOP;
END
$migration$;

import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export type ClassReadAuthorization =
  | { ok: true; user: User; admin: SupabaseClient }
  | { ok: false; status: 401 | 403 | 500; error: string };

export function classAssignmentBelongsTo(
  userId: string,
  assignment: { teacher_id?: unknown } | null
): boolean {
  return Boolean(assignment && assignment.teacher_id === userId);
}

/**
 * Service-role reads are allowed only after both authentication and explicit
 * ownership have succeeded. Knowing a class token is never authorization.
 */
export async function authorizeClassRead(
  classToken: string
): Promise<ClassReadAuthorization> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return { ok: false, status: 500, error: 'server_misconfigured' };
  }

  const cookieStore = await cookies();
  const authClient = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set() {},
      remove() {},
    },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    return { ok: false, status: 401, error: 'unauthorized' };
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: assignment, error } = await admin
    .from('class_assignments')
    .select('teacher_id')
    .eq('class_token', classToken)
    .maybeSingle();

  if (error) {
    console.error('[class-read-authorization] ownership lookup failed', error.message);
    return { ok: false, status: 500, error: 'ownership_lookup_failed' };
  }
  if (!classAssignmentBelongsTo(user.id, assignment)) {
    return { ok: false, status: 403, error: 'forbidden' };
  }

  return { ok: true, user, admin };
}

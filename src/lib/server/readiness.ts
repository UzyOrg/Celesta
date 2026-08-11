interface ReadinessEnvironment {
  NODE_ENV?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  CREAR_RETEST_SIGNING_SECRET?: string;
  CREAR_RETEST_TEST_MODE?: string;
  CREAR_RETEST_DELAY_HOURS?: string;
  NEXT_PUBLIC_CREAR_RETEST_DELAY_HOURS?: string;
}

export interface ReadinessChecks {
  supabaseUrl: boolean;
  supabaseAnonKey: boolean;
  supabaseServiceRole: boolean;
  retestSigningSecret: boolean;
  retestProductionMode: boolean;
  retestDelay: boolean;
}

export interface ReadinessResult {
  ready: boolean;
  checks: ReadinessChecks;
}

const RETEST_DELAY_HOURS = 168;

function credentialLooksConfigured(value: string | undefined): boolean {
  return (value?.trim().length ?? 0) >= 16;
}

function validSupabaseUrl(value: string | undefined, production: boolean): boolean {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return production ? parsed.protocol === 'https:' : ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function doesNotShortenRetest(value: string | undefined): boolean {
  if (!value?.trim()) return true;
  const hours = Number(value);
  return Number.isFinite(hours) && hours >= RETEST_DELAY_HOURS;
}

/**
 * Configuration-only readiness. It never returns or logs credential values
 * and intentionally avoids making an external Supabase request on every probe.
 */
export function evaluateReadiness(env: ReadinessEnvironment): ReadinessResult {
  const production = env.NODE_ENV === 'production';
  const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  const checks: ReadinessChecks = {
    supabaseUrl: validSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL?.trim(), production),
    supabaseAnonKey: credentialLooksConfigured(anonKey),
    supabaseServiceRole: credentialLooksConfigured(serviceRole) && serviceRole !== anonKey,
    retestSigningSecret: (env.CREAR_RETEST_SIGNING_SECRET?.trim().length ?? 0) >= 32,
    retestProductionMode: !production || env.CREAR_RETEST_TEST_MODE !== '1',
    retestDelay:
      !production ||
      (
        doesNotShortenRetest(env.CREAR_RETEST_DELAY_HOURS) &&
        doesNotShortenRetest(env.NEXT_PUBLIC_CREAR_RETEST_DELAY_HOURS)
      ),
  };

  return {
    ready: Object.values(checks).every(Boolean),
    checks,
  };
}

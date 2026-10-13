export type RuntimeEnvironment = 'development' | 'production' | 'test';

/**
 * Oral defences (alumno `/defensa`, profesor `/revision` and their API) are hidden
 * in production until the pilot is cleared to open: they need migration
 * 20261013_defensa_oral_piloto.sql applied, the signing secret and the provider keys
 * (see .env.example), and ADR 0014 approved. They are NOT part of the retired
 * legacy list below; they are simply not open yet.
 *
 * To test them on a deployed preview (a phone needs HTTPS to use the microphone) set
 * DEFENSA_PUBLICA=1 in that environment. To open them for good, delete this list
 * and the check in `isRetiredProductionPath`.
 */
export const NOT_YET_OPEN_PRODUCTION_ROUTE_PREFIXES = ['/defensa', '/revision', '/api/defensa'] as const;

/**
 * Routes retained in the repository for development/reference but excluded
 * from the student MVP deployment. Prefix matching is segment-aware, so
 * `/api/planner` is not retired merely because `/api/plan` is.
 */
export const RETIRED_PRODUCTION_ROUTE_PREFIXES = [
  '/ai-transparencia',
  '/auth/confirmar-registro',
  '/biblioteca',
  '/dashboard',
  '/demo',
  '/grupos',
  '/join',
  '/missions',
  '/pilot-login',
  '/transparencia-ia',
  '/workshop',
  '/api/analytics',
  '/api/assignments',
  '/api/demo',
  '/api/groups',
  '/api/library',
  '/api/plan',
  '/api/roster',
  '/api/student',
  '/api/talleres',
  '/api/teacher',
  '/api/transparency',
] as const;

function matchesRoutePrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function runtimeEnvironmentFromNodeEnv(value: string | undefined): RuntimeEnvironment {
  if (value === 'production' || value === 'test') return value;
  return 'development';
}

export function isRetiredProductionPath(
  pathname: string,
  environment: RuntimeEnvironment = runtimeEnvironmentFromNodeEnv(process.env.NODE_ENV),
  options: { defensaPublica?: boolean } = { defensaPublica: process.env.DEFENSA_PUBLICA === '1' }
): boolean {
  if (environment !== 'production') return false;
  if (
    !options.defensaPublica &&
    NOT_YET_OPEN_PRODUCTION_ROUTE_PREFIXES.some((prefix) => matchesRoutePrefix(pathname, prefix))
  ) {
    return true;
  }
  return RETIRED_PRODUCTION_ROUTE_PREFIXES.some((prefix) =>
    matchesRoutePrefix(pathname, prefix)
  );
}

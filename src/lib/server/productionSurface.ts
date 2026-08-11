export type RuntimeEnvironment = 'development' | 'production' | 'test';

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

export function isRetiredProductionPath(
  pathname: string,
  environment: RuntimeEnvironment = process.env.NODE_ENV
): boolean {
  if (environment !== 'production') return false;
  return RETIRED_PRODUCTION_ROUTE_PREFIXES.some((prefix) =>
    matchesRoutePrefix(pathname, prefix)
  );
}

Project-Celesta

# Backend updates (2025-08-23)

## PR-B · RLS en alias_sessions + índices
- Habilitado RLS en `public.alias_sessions`.
- Índices:
  - `(class_token, student_session_id)`
  - `(class_token, last_seen desc)`
- Migración creada:
  - `lib/supabase/migrations/prb-alias-rls.sql`
- Políticas: no se agregan políticas para `anon`/`authenticated`. Accede vía Server con Service Role (bypassa RLS).

## PR-C · Índices compuestos en eventos
- Índices en `public.eventos_de_aprendizaje`:
  - `(class_token, ts desc)` → panel por clase + rango de fechas.
  - `(student_session_id, ts desc)` → vista individual por sesión.
- Migración creada:
  - `lib/supabase/migrations/prc-events-composite-indexes.sql`

## Runtime consistente (Node.js)
Se fija `export const runtime = 'nodejs';` en rutas que usan Service Role:
- `src/app/api/events/ingest/route.ts`
- `src/app/api/teacher/export/route.ts`
- `src/app/api/transparency/route.ts`
- `src/app/api/questionnaire/route.ts`
- `src/app/api/test-supabase/route.ts`
- `src/app/api/demo/seed/route.ts` ya lo tenía.

## Rate limiting
- Ingest (`/api/events/ingest`):
  - 240 req/min por IP.
  - 120 req/min por bucket (IP, class_token).
  - Límite payload ~64KB (mantiene idempotencia por `client_event_id`).
- CSV export (`/api/teacher/export`):
  - 60 descargas/min por `class_token` (HTTP 429 al exceder).

## Cómo aplicar las migraciones
1) Abrir Supabase SQL editor del proyecto.
2) Ejecutar, en orden, los archivos SQL en `lib/supabase/migrations/`:
   - `prb-alias-rls.sql`
   - `prc-events-composite-indexes.sql`
3) Verificar que las vistas/consultas del panel funcionan sin cambios de cliente.

## E2E (dev)
1) Iniciar dev server: `npm run dev` (Next.js 15).
2) Sembrar demo:
   - POST `/api/demo/seed?token=DEMO-101&n=20&talleres=BIO-001,ALG-001`
3) Revisar:
   - `/teacher/DEMO-101` → carga rápida; métricas y alias visibles.
   - Exportar CSV desde el panel (ver 429 si se excede cuota).
   - `/teacher/DEMO-101/student/<sessionId>` → timeline fluido.
   - `/transparencia-ia?token=DEMO-101` → SSR OK.
4) Logs: confirmar que `SUPABASE_SERVICE_ROLE_KEY` no se usa del lado cliente.

## Notas de rendimiento
- Objetivo: reducir latencia de consultas del panel (por `class_token`) y vista individual (por `student_session_id`).
- Medición sugerida:
  - Antes y después de aplicar índices, capturar p95/p99 de SSR (con logs de tiempos en server) o `EXPLAIN ANALYZE` en consultas equivalentes.
  - Consultas afectadas: selección sobre `learning_events_with_alias` filtrando por `class_token`+rango y ordenando por `ts`; y por `student_session_id`+rango ordenando por `ts`.

## Seguridad
- `SUPABASE_SERVICE_ROLE_KEY`: solo en servidor (rutas/API y componentes server). Cliente usa `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- RLS habilitado en `eventos_de_aprendizaje` y `alias_sessions`.

## Flujo de Demo Oficial (alias requerido)

- Para cualquier demo o presentación, iniciar SIEMPRE en la ruta:
  - `/join?t=<TOKEN>` (por ejemplo, `/join?t=DEMO-101`).
- El alumno ingresa su alias; se guarda en `localStorage` bajo la llave `celesta:alias:<TOKEN>`.
- Al enviar, es redirigido a `/demo/student?t=<TOKEN>` donde se carga el taller demo y se exige alias vía `AliasGuard`.
- Cada evento enviado desde el cliente adjunta `result.alias` (ver `src/lib/track.ts`), el backend lo upsertea en `public.alias_sessions` y el panel del docente (`/teacher/<TOKEN>`) lo muestra mediante la vista `learning_events_with_alias`.

Nota: `AliasGuard` ahora requiere alias para TODOS los tokens (incluido `DEMO-101`). Se eliminó el bypass previo. Archivo: `src/components/join/AliasGuard.tsx`.

# Celesta E2E Pilot-Ready Report

Fecha: FALTA
Ambiente: local/dev
Clase (token): FALTA (ej: DEMO-101)

## 1) Resumen
- Validación de extremo a extremo de panel docente y línea de tiempo de estudiante sobre `learning_events_with_alias`.
- CSV export con rate-limit y transparencia de métricas vía RPC `get_transparency_stats`.
- SSR con instrumentación de latencia y análisis p50/p95/p99.

Evidencia central en `docs/evidence/`:
- UI: `teacher_panel_alias.png`, `student_timeline.png`
- Export/Rate-limit: `export.csv`, `rate_limit_csv_429.txt`, `rate_limit_ingest_429.txt`
- Transparencia: `transparency.json`
- Performance: `ssr.log`, `ssr_analyze.txt`
- SQL planes: `explain_analyze_teacher.txt`, `explain_analyze_student.txt`

## 2) Seguridad
- Rutas con service role corren solo en servidor (`export const runtime = 'nodejs'`):
  - `src/app/api/events/ingest/route.ts`
  - `src/app/api/teacher/export/route.ts`
  - `src/app/api/transparency/route.ts`
  - `src/app/api/questionnaire/route.ts`
  - `src/app/api/test-supabase/route.ts`
  - `src/app/api/demo/seed/route.ts` (solo no-prod)
- Páginas SSR con service role usan `runtime='nodejs'` y logs: `src/app/teacher/[classToken]/page.tsx`, `src/app/teacher/[classToken]/student/[sessionId]/page.tsx`.
- No exponer `SUPABASE_SERVICE_ROLE_KEY` en cliente. Revisión de código: FALTA (sin hallazgos/rotación si aplica).

## 3) Funcionalidad
- Panel Docente muestra alias, filtros (from/to, taller) y enlace a CSV.
  - Evidencia: `docs/evidence/teacher_panel_alias.png` (FALTA)
- Línea de tiempo por estudiante con métricas básicas.
  - Evidencia: `docs/evidence/student_timeline.png` (FALTA)

## 4) Export y Rate-Limits
- CSV export limitado a 60/min por `class_token`.
  - Evidencia 429: `docs/evidence/rate_limit_csv_429.txt` (FALTA)
  - Muestra CSV: `docs/evidence/export.csv` (FALTA)
- Ingest limitado a 240/min por IP y 120/min por (IP, class_token).
  - Evidencia 429: `docs/evidence/rate_limit_ingest_429.txt` (FALTA)

## 5) Transparencia
- RPC `get_transparency_stats` entrega agregados anonimizados.
  - Evidencia: `docs/evidence/transparency.json` (FALTA)

## 6) Performance (SSR)
- Logs con `[SSR][teacher] query|total ...` y `[SSR][student] query|total ...`.
- Análisis percentiles con `scripts/analyze-ssr-logs.mjs`.
  - Log: `docs/evidence/ssr.log` (FALTA)
  - Resumen: `docs/evidence/ssr_analyze.txt` (FALTA)

## 7) SQL (EXPLAIN ANALYZE)
- Panel docente: vista `learning_events_with_alias`, filtros por `class_token`, rango de fecha y opcional `taller_id`, orden por `ts`.
  - Evidencia: `docs/evidence/explain_analyze_teacher.txt` (FALTA)
- Estudiante: misma vista filtrando además por `student_session_id`, orden `ts ASC`.
  - Evidencia: `docs/evidence/explain_analyze_student.txt` (FALTA)

## 8) Riesgos y Siguientes Pasos
- Redistribución de rate-limits en despliegues multi-instancia (in-memory). Migrar a store centralizado si escala.
- Rotación de claves si hubiera cualquier exposición en logs locales. Confirmar políticas RLS completas y tests.
- Mejoras de índices adicionales según planes EXPLAIN (si aparecen scans costosos).

## 9) Definition of Done (DoD)
- [ ] Migraciones aplicadas en orden:
  - `2025-08-20-pr1-student-session-id.sql`
  - `2025-08-20-pr1_5-alias.sql`
  - `prb-alias-rls.sql`
  - `prc-events-composite-indexes.sql`
  - `2025-08-21-pr1_6-transparency.sql`
- [ ] RLS activado en `eventos_de_aprendizaje` y `alias_sessions` y políticas revisadas
- [ ] SSR y APIs usan `runtime='nodejs'`; sin uso de service-role en cliente
- [ ] Seeding ejecutado (`/api/demo/seed`) con token de prueba y evidencia guardada
- [ ] Panel docente validado (alias/filtros/CSV) con captura
- [ ] Línea de tiempo estudiante validada con captura
- [ ] CSV export muestra encabezados y 3+ filas, archivo adjunto
- [ ] Rate-limit CSV: 429 capturado y guardado
- [ ] Rate-limit ingest: 429 capturado y guardado
- [ ] SSR logs capturados y analizados (p50/p95/p99)
- [ ] EXPLAIN ANALYZE para ambas consultas adjunto
- [ ] Revisión de seguridad: sin exposición de claves; si hubo, rotación aplicada

Notas: Marcar FALTA donde no haya evidencia y seguir las instrucciones en `docs/evidence/README.md` para generarla.

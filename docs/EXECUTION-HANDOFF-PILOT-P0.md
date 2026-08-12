# Instrucción de ejecución · Cierre P0 del piloto

**Fecha:** 2026-08-10  
**Rol del destinatario:** agente de código ejecutor  
**Objetivo:** llevar a producción el hardening ya implementado, cerrar la lectura pública de
evidencia y devolver pruebas verificables. No tomar decisiones de producto.

> **Excepción aprobada 2026-08-11, antes del primer participante:** el fundador autorizó
> exactamente `docs/architecture/guided-modal-form-2026-08-11.md`. La lección vigente pasa a
> 1.18.0 / `2026-08-11-forma-guiada` y vuelve a quedar congelada desde ahí. Las prohibiciones
> de cambiar copy, JSON o añadir nodos siguen vigentes para cualquier otro cambio.

## Resultado esperado

Al terminar deben cumplirse simultáneamente estas condiciones:

1. El código final pasa typecheck, linter, build y la suite completa de Playwright.
2. Producción tiene un secreto de firma D7 y la URL pública correctos.
3. `anon` y `authenticated` no pueden leer la tabla ni las dos vistas de evidencia.
4. En desarrollo, los lectores directos responden 401 o 410 según su contrato; en el
   deployment del piloto las superficies legacy completas quedan ocultas con 404.
5. Una traza de auditoría con participante opaco llega con `studyId`, alias, hora de
   servidor y milestone `day1_complete`.
6. El lector interno conserva todas las filas y vuelve explícitos los faltantes.
7. Se entrega un reporte corto con comandos, resultados, deployment y cualquier bloqueo.

## Fuente de verdad obligatoria

Leer antes de actuar, en este orden:

1. `AGENTS.md`
2. `docs/CURRENT_STATE.md`
3. `docs/BRIEF-EVIDENCIA-PILOTO-V1.md`
4. `docs/architecture/evidence-pilot-execution-2026-08-10.md`
5. `docs/PILOT-METRICS-V1.md`
6. `docs/adr/0009-omision-y-baseline-compuesto.md`
7. `docs/adr/0010-studyid-y-ticket-d7-servidor.md`
8. `docs/adr/0011-sonda-no-es-product-pull.md`

Después ejecutar `git status --short` y revisar el diff. El worktree contiene cambios del
founder y cambios ya implementados del piloto. **No usar reset, checkout, clean ni reescribir
archivos ajenos. No reconstruir la solución desde cero.**

## Alcance autorizado

- Verificar y corregir únicamente defectos que bloqueen los criterios de aceptación de este
  documento.
- Aplicar en el proyecto Supabase de producción **Celestea_V2** la migración exacta:
  `supabase/migrations/20260810_secure_learning_event_readers.sql`.
- Configurar variables faltantes en el entorno de despliegue mediante su administrador de
  secretos.
- Desplegar el checkout aprobado por el founder usando el mecanismo ya configurado en el
  repositorio.
- Ejecutar una traza técnica con cohorte y participante claramente marcados como auditoría.

No está autorizado:

- construir el segundo reto;
- cambiar copy, tipografía, lesson JSON, `content_version` o audio;
- añadir dashboard docente/parental;
- tocar filosofía o código legacy salvo mantener sus lectores cerrados;
- añadir columnas o nuevos verbos de telemetría;
- borrar datos de Supabase;
- convertir la sonda “Quiero otro reto” en pago, retención o product pull.

## Fase 1 · Verificación final del checkout

La suite completa local del 2026-08-11 llegó a 78/78 después del hardening. Debe repetirse
sobre el commit exacto que vaya a desplegarse para que producción no dependa de un árbol local
distinto.

Ejecutar:

```bash
pnpm run typecheck
pnpm run lint:workshops
pnpm run build
pnpm exec playwright test
git diff --check
```

Aceptación:

- typecheck y build en cero;
- Playwright completo en verde;
- el linter puede conservar únicamente los seis warnings legacy ya documentados;
- ningún warning nuevo en `/crear`, `/api/crear/retest`, ingest o los lectores;
- no modificar el artefacto pedagógico para hacer pasar tests.

Si una prueba falla, diagnosticar primero si es producto o expectativa obsoleta. No relajar
tests de identidad, baseline, autorización, privacidad ni D7.

## Fase 2 · Variables de producción

Configurar sin imprimir, copiar al chat ni guardar en Git:

- `CREAR_RETEST_SIGNING_SECRET`: valor criptográficamente aleatorio de al menos 32 caracteres;
- `NEXT_PUBLIC_SITE_URL`: origen canónico HTTPS del deployment, sin slash final;
- verificar que `CREAR_RETEST_TEST_MODE` **no** exista o no sea `1` en producción;
- verificar que `CREAR_RETEST_DELAY_HOURS` no reduzca las 168 horas en producción;
- verificar que `CREAR_CLASSIFIER_MODEL` apunte al modelo vigente aprobado para el piloto.

No poner un fallback inseguro en código si falta una variable. El flujo D7 debe fallar cerrado.
Si el agente no tiene autoridad para editar el entorno, debe detener solo esta fase y devolver:
plataforma, proyecto, nombres exactos de variables y la pantalla/comando donde el founder debe
configurarlas. Nunca solicitar que el secreto se pegue en el chat.

## Fase 3 · Cerrar lectura pública en Supabase

### Preflight de solo lectura

Confirmar el proyecto y comprobar, sin imprimir filas ni texto de alumnos, el status HTTP del
rol anónimo para:

- `public.eventos_de_aprendizaje`
- `public.alias_sessions`
- `public.learning_events`
- `public.learning_events_with_alias`

El estado observado el 2026-08-10 fue 200 en los tres. Registrar únicamente status y nombre
del objeto.

### Aplicación

Ejecutar **sin editar**:

```sql
-- Archivo canónico:
-- supabase/migrations/20260810_secure_learning_event_readers.sql
```

La migración solo debe:

- revocar privilegios a `anon` y `authenticated` sobre la tabla;
- convertir las vistas existentes a `security_invoker`;
- revocar privilegios a `anon` y `authenticated` sobre las vistas.

No ejecutar ningún SQL adicional, no alterar columnas y no borrar filas.

### Postflight obligatorio

Repetir exactamente las tres consultas anónimas. Deben dejar de responder 200 y devolver
401/403. Después comprobar que el lector interno con Service Role todavía funciona. Si el
servicio interno falla, revisar privilegios de `service_role`; **no** restaurar acceso a
`anon` o `authenticated`.

## Fase 4 · Deploy y smoke test de rutas

Desplegar el checkout verificado. Sobre la URL de producción comprobar sin credenciales:

| Ruta | Resultado esperado |
|---|---|
| `/api/teacher/export?token=TEST-PILOT` | 404 |
| `/api/analytics/TEST-PILOT` | 404 |
| `/api/student/insights?class_token=TEST-PILOT&student_alias=P01` | 404 |
| `/api/student/completed-missions` | 404 |
| `PUT /api/crear/retest` con `{"ticket":"valor-invalido"}` | 403 |

No usar un token de alumno real ni descargar texto crudo durante este smoke test.

## Fase 5 · Traza técnica de auditoría

Usar códigos inequívocamente técnicos, por ejemplo:

- cohorte: `AUDIT-CREAR-P0-20260810`
- participante: `P00`

No usar nombres. Completar D1 una sola vez en producción y verificar en servidor:

- todos los eventos incluyen cohorte, alias opaco y el mismo `studyId`;
- las respuestas conservan `client_ts`;
- `ts` corresponde a recepción del servidor, no al reloj manipulable del dispositivo;
- existe exactamente un `completo_paso` con `milestone: day1_complete`;
- solicitar el ticket produce `eligible: false` y un `notBefore` a 168 horas del `ts` servidor;
- `?retest=1` no abre D7;
- no activar test mode ni reducir la espera en producción.

Ejecutar el lector:

```bash
pnpm run pilot:export -- AUDIT-CREAR-P0-20260810 \
  --out /private/tmp/celestea-audit-p0 \
  --base-url https://ORIGEN-PRODUCCION
```

Aceptación del lector:

- número de filas de salida = número de filas consultadas;
- una proyección humana para la traza;
- baseline, apoyo, transferencia y cierre D1 visibles cuando existan;
- D7 aparece como todavía no observado, nunca como incorrecto;
- cualquier falta de identidad o unión aparece como `DESCONOCIDO`/`UNJOINED`, nunca desaparece.

La traza queda marcada como auditoría y se excluye del cohort real; no hace falta borrarla.

## Fase 6 · Actualización de estado

Solo después de verificar producción:

- actualizar `docs/CURRENT_STATE.md` y cambiar los dos P0 de permisos/entorno a cerrados;
- actualizar el estado de `docs/BRIEF-EVIDENCIA-PILOTO-V1.md` y de la propuesta de
  arquitectura a “aplicado en producción”;
- registrar fecha, deployment y resultados, no secretos;
- si Notion vuelve a tener créditos, reflejar el mismo corte en `08 · Experimento activo —
  Inglés v1`. Si sigue bloqueado, reportarlo y no buscar un bypass.

No crear documentación duplicada ni cambiar la estrategia A/B/C.

## Entrega del agente ejecutor

Responder al orquestador con este formato:

```text
ESTADO: completo | bloqueado

CHECKOUT
- SHA/deployment:
- typecheck:
- lint:
- build:
- Playwright:

PRODUCCIÓN
- variables configuradas, sin valores:
- migración aplicada:
- anon table/view statuses después:
- smoke de rutas:

TRAZA DE AUDITORÍA
- cohort/participante:
- filas/trazas:
- studyId unido:
- day1_complete:
- ticket antes de tiempo bloqueado:
- faltantes explícitos:

CAMBIOS REALIZADOS
- archivos:
- correcciones adicionales y por qué:

BLOQUEOS/RIESGOS
- ninguno | detalle exacto y autoridad requerida
```

No afirmar “listo para piloto” si uno de los P0 sigue abierto. No interpretar datos de
aprendizaje o mercado: esa decisión vuelve al orquestador.

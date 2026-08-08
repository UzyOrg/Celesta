# ADR 0008 · Un evento sin `class_token` es un dato que nadie puede leer

- **Fecha:** 2026-08-07
- **Estado:** aceptada
- **Ámbito:** `src/lib/crear/telemetry.ts`, `src/lib/track.ts`,
  `CinematicEnglishPlayer.tsx`, `tests/e2e/crear-telemetry-contract.spec.ts`
  (nuevo)
- **Origen:** auditoría de telemetría previa al piloto, posterior al PR #1.
- **Relación con ADRs previos:** no revierte ninguno. Es la condición de
  posibilidad de todos: el 0007 define *qué* se mide, este define si alguien
  podrá leerlo.

## Contexto

Toda la arquitectura de evidencia asume que las filas llegan a alguien. La
auditoría ejecutó la lección completa —trece pasos, día 1 y retest— y capturó lo
que de verdad sale del navegador. El evento de cierre viajaba bien formado, con
su proyección por constructo íntegra, 2.8 KB, muy por debajo del techo de 64 KB
del endpoint. Y con esto:

```
class_token   : undefined
student_alias : undefined
```

`/crear` nunca leyó un token de clase. Las filas se insertan en
`eventos_de_aprendizaje` sin problema, y ahí se quedan: **toda** lectura
orientada al profesor filtra por esa columna.

| Superficie | Filtro |
|---|---|
| `/api/teacher/export` | `.eq('class_token', …)` |
| `/api/analytics/[classToken]` | `.eq('class_token', …)` |
| `/api/student/insights` | roster por `class_token + student_alias` |
| `/api/student/completed-missions` | ídem |

En Postgres `= 'X'` nunca hace match con `NULL`. El piloto habría corrido, los
alumnos habrían respondido, los datos se habrían guardado, y el CSV del profesor
habría salido vacío. Un fallo silencioso, y el único entregable del piloto son
los datos.

## Decisión

**El token entra por el enlace, no por el código.** `/crear` acepta `?t=` —el
mismo parámetro que usa el resto del producto— y también `?token=`, que es como
lo llama el export. Se recorta a 64 caracteres para que un query string
cualquiera no se convierta en token. Ese valor viaja en los ocho puntos de
emisión y además keyea `getOrCreateSessionId`, así que dos clases en un mismo
equipo compartido no comparten sesión.

**Sigue siendo opcional, a propósito.** Un `/crear` abierto corre igual y
registra igual, solo que de forma anónima. Cerrarlo convertiría el enlace en un
punto de falla para una experiencia que hoy funciona sola, y la pérdida —datos
no atribuibles— es recuperable; un alumno bloqueado frente a la pantalla no.

Se descartó inventar un token por defecto (`PILOTO`, o similar): mezclaría en un
mismo cubo cohortes distintas y a cualquiera que abriera la URL por curiosidad,
que es exactamente el tipo de contaminación silenciosa que el ADR 0007 existe
para evitar.

## El segundo hueco: la cola que nadie vaciaba

`trackEvent` escribe en IndexedDB y programa el envío 350 ms después. Cerrar la
pestaña antes de eso deja los eventos en cola. Se enviarían en la siguiente
visita —salvo que el último evento del estudio es `taller_completado`, y después
de ese no hay siguiente visita.

Ahora `initTracking` engancha `pagehide` y `visibilitychange → hidden` con
`navigator.sendBeacon`, el único transporte que el navegador garantiza durante
el unload; un `fetch` ahí se cancela con la página. `visibilitychange` importa
más que `pagehide` en el caso real: el teléfono que se bloquea o la app a la que
se cambia son la forma ordinaria en que termina una sesión de salón.

**La cola no se vacía tras el beacon.** `sendBeacon` informa que el navegador
aceptó encolar el payload, nunca que el servidor lo recibió. Con
`client_event_id` un duplicado es inocuo; un evento final perdido no lo es.

## Consecuencias

`content_version` no se mueve: nada de esto cambia una palabra, un audio ni una
decisión que el alumno vea. La cohorte no se particiona y la congelación del ADR
0006 sigue en pie.

El piloto se convoca con enlaces con token:

```
https://<host>/crear?t=PILOTO-01
```

y el día 7 conserva su bypass, ahora acumulable: `/crear?t=PILOTO-01&retest=1`.

Queda abierto, y es una decisión del fundador, no un olvido: **sin alias, las
filas son atribuibles a una cohorte pero no a una persona.** `student_alias`
sigue nulo en `/crear` porque el flujo de alias vive en `/join` y meterlo aquí
costaría una pantalla antes del baseline —justo el presupuesto de acciones que
el ADR 0001 protege. Con n≈5 y sesiones supervisadas, `actor_sid` más la hora
bastan para reconstruir quién es quién. A la primera cohorte que no sea
supervisada, esto deja de bastar.

`CREAR_CLASSIFIER_MODEL` sigue en `gpt-4o-mini`, igual que en el 0007.

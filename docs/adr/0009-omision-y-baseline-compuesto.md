# ADR 0009 · Omitido es desconocido y el baseline multi-ítem es compuesto

- **Fecha:** 2026-08-10
- **Estado:** aceptada
- **Ámbito:** ledger, agregación, telemetría y recibo derivado de `/crear`

## Problema

Una producción baseline omitida se guardaba como incorrecta. Además, el precheck de certeza
emitía tres ítems pero el agregador elegía el primero mostrado, de modo que el shuffle podía
cambiar el claim sin cambiar las respuestas.

## Decisión

- `observed: false` conserva que la oportunidad ocurrió y declara que no hubo respuesta
  calificable. No entra como error ni apoya claims.
- El baseline se agrupa por `statementId` (o `stepId` en producción), conserva el primer
  intento de cada ítem y se ordena canónicamente por id antes de resumirse.
- Estados del resumen: `unknown`, `not_demonstrated`, `mixed`, `demonstrated`.
- `mixed` no autoriza atribuir aprendizaje binario; permanece `unproven`.

## Consecuencia

Mismas respuestas por ítem producen el mismo claim bajo cualquier `shownOrder`. Un baseline
omitido más un D7 correcto sigue siendo `unproven`, nunca `durable`.

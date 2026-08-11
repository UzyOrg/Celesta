# Propuesta de arquitectura · Endurecimiento previo al piloto

- **Fecha:** 2026-08-10
- **Estado:** implementación local completa; despliegue, secretos y migración pendientes
- **Superficie activa:** `/crear`, clasificador, ingestión, ticket D7 y export interno
- **No toca:** JSON pedagógico, audio, tipografía, flujo autoral ni dashboards legacy

## Problema

El recorrido pedagógico y sus pruebas de camino feliz están completos, pero el deployment
todavía permite lectura anónima de evidencia, puede perder o alterar eventos durante reintentos,
puede dejar D7 bloqueado tras un fallo transitorio y publica superficies legacy que no forman
parte del MVP. Un build verde no compensa esos riesgos porque afectan privacidad, continuidad y
la interpretación de la evidencia.

## Decisiones

1. **Privacidad por defecto.** `anon` y `authenticated` no reciben lectura directa de eventos,
   vistas ni aliases. Cualquier lector pasa por un endpoint servidor que autentica y autoriza.
2. **Deployment mínimo.** En producción, las zonas declaradas legacy y los endpoints que las
   sostienen quedan fuera de la superficie pública salvo activación explícita y revisada.
3. **D7 recuperable.** `checking`, `locked`, `ready`, error transitorio y error permanente son
   estados distintos. Los errores transitorios reintentan con espera acotada y siempre ofrecen
   explicación y acción manual; un modo abierto sin identidad no promete una revisión D7.
4. **Scoring conservador.** El parser solo atribuye forma cuando el sujeto aceptado gobierna el
   modal y la secuencia verbal es válida. Casos dudosos se registran para revisión; el recibo no
   presenta una inferencia automática como calificación humana.
5. **Outbox durable e idempotente.** IndexedDB es la cola principal y un almacenamiento local
   acotado es el respaldo cuando IndexedDB no existe. Un duplicado conserva el primer timestamp
   del servidor; reenviar no reescribe la historia.
6. **Release reproducible.** Typecheck, validación de talleres, build, E2E, auditoría de
   dependencias y pruebas de permisos son gates explícitos. El health superficial se separa de
   readiness de configuración.

## Límites

- El rate limit local reduce abuso accidental, pero producción abierta requerirá un contador
  distribuido o un token de participante firmado.
- El código puede preparar migraciones y verificación; aplicar permisos y secretos en los
  servicios desplegados requiere autoridad externa.
- No se realiza una refactorización grande del reproductor antes de cinco alumnos. Después del
  piloto se extraen la máquina D7, el proyector de recibos y el scorer del componente monolítico.

## Criterios de aceptación

- Las cuatro pruebas anónimas (`alias_sessions`, tabla de eventos y dos vistas) responden
  `401/403` en producción.
- Un 403 transitorio por milestone todavía no visible y una pérdida breve de red se recuperan
  sin recargar la página.
- Los falsos positivos y contracciones documentados tienen pruebas de regresión.
- Un evento repetido no cambia `ts`; una falla de IndexedDB no impide cargar una lección en red
  ni descarta silenciosamente la finalización.
- Las rutas legacy de alto riesgo no responden en un deployment de piloto.
- El release nace de un commit limpio y todos los gates pasan sobre esa revisión.

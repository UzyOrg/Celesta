# Propuesta de arquitectura · Ejecución de evidencia y señal de mercado

- **Fecha:** 2026-08-10
- **Estado:** implementada y verificada; falta aplicar permisos en producción y configurar la firma D7
- **Superficie activa:** `/crear` y lector interno específico del piloto
- **No toca:** dashboards docente/parental, analytics legacy, contenido generado en runtime

## Decisión de producto

El piloto ejecuta tres experimentos separados para que cada dato tenga una lectura:

1. **Instrumento:** el recorrido conserva evidencia observable, enlaza D1→D7 y no convierte
   omisiones en errores.
2. **Deseo del alumno:** después de D1 y D7 se ofrece apartar un segundo reto eligiendo un
   objetivo. Presentarse y terminar ese reto —no el clic— será la señal posterior de uso.
3. **Compra:** padres fuera del círculo cercano reciben una oferta y depósito estandarizados;
   se registra si el presupuesto reemplaza, complementa o inaugura gasto.

La segunda experiencia puede prepararse cuando 4/5 terminen D1 sin ayuda, pero se mantiene
oculta hasta D7 y usa otro constructo para no ensayar el retest.

## Cambios técnicos

### Evidencia honesta

- `CrearLearningObservation.observed` representa si existió una respuesta calificable.
- Un baseline omitido se conserva como recorrido, pero no entra a la agregación.
- El baseline multi-ítem se resume por conjunto; su estado y el claim son invariantes al
  orden de presentación.

### Continuidad D7

- `studyId` es la llave longitudinal canónica; `student_session_id` es transporte y puede
  rotar sin partir el estudio.
- Al cerrar D1 se emite un `completo_paso` con milestone `day1_complete`.
- El servidor fecha ese evento con su reloj, calcula las 168 horas y solo entonces firma un
  ticket de reentrada.
- `/crear#rt=<ticket>` reconstruye el mismo `studyId` en un perfil limpio. Ningún parámetro
  sin firma concede el retest.

### Lectura y privacidad

- Los lectores legacy quedan cerrados o requieren sesión + propiedad de cohorte.
- Las vistas de eventos revocan lectura a `anon` y `authenticated`; el service role se usa
  solo después de autorización explícita.
- Un script interno produce dos salidas: evento analítico aplanado y resumen humano por
  participante. Los faltantes permanecen visibles.

### Señal de mercado

- El probe usa el contrato de eventos existente y codifica su semántica en `result`.
- No se automatiza la tarjeta para alumno/padre.
- No se añade un nuevo nodo al artefacto congelado ni se cambia content/audio version.

## Verificación

- Propiedades de agregación: omisión y permutaciones.
- Propiedades de ticket: firma, identidad, reloj y perfil limpio.
- Lectores: no autenticado 401/410; identidad sin propiedad 403.
- Typecheck, linter de talleres y Playwright móvil.

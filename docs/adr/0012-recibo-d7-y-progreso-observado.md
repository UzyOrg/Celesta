# ADR 0012 · El recibo solo representa progreso observado

- **Fecha:** 2026-08-10
- **Estado:** aceptada
- **Ámbito:** cierre D1 y cierre D7 de `/crear`

## Contexto

La corrección de la frase final no basta para afirmar progreso. Si el baseline de
`modal_form` ya era correcto, dar más peso a “Ahora escribiste” convierte conocimiento
preexistente en avance atribuible a la lección. A la vez, completar D7 solo mostraba un
mensaje genérico, aunque ese es el primer momento en que existen dos observaciones separadas
por una semana.

## Decisión

La jerarquía ascendente del arco D1 exige baseline `not_demonstrated` y observación inmediata
independiente correcta y no asistida. Cualquier otro estado se representa a nivel. La fuente
es `aggregateCrearConstructStates`; la corrección aislada del último intento deja de decidir
la narrativa visual.

El completado de D7 proyecta un recibo factual por constructo con dos momentos —caso nuevo de
D1 y D7—, conserva los faltantes como no disponibles y declara el límite de generalización.
No usa `durable` como copy para el alumno, no convierte la proyección en score y no automatiza
la tarjeta para padres.

## Consecuencias

- `preexisting` sigue siendo un resultado válido, pero nunca se viste como progreso.
- Volver en D7 produce un artefacto mayor que el gate de quien aún no volvió.
- El recibo puede inspeccionarse o capturarse con consentimiento, pero no crea vigilancia ni
  un nuevo producto B2B.
- El cambio es de proyección visual; JSON, audio y `content_version` permanecen congelados.

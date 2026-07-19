# Encargo: Microescena neutral + pre-check estructurado + eliminación de pistas accidentales

**Estado:** PENDIENTE DE APROBACIÓN EXPLÍCITA DEL FOUNDER (gobernanza 07). No tocar código antes del "aprobado".
**Por qué ahora:** no es feature; es corrección del instrumento de medición. Debe entrar ANTES de Etapa 0 y del freeze del scorecard (06). El build actual produciría un falso positivo pedagógico (riesgo #1 de 01).
**Artefacto:** `public/workshops/CREAR-ENGLISH-DEDUCTION-V1.json` + player v2 (`src/components/crear/v2/`) + E2E + página 08.

## Leaks verificados (con líneas del JSON actual)
1. **Pre-check:** evidencia etiquetada `Strong evidence` / `Open possibility` / `Ruled out` (líneas 94-104) visible mientras el alumno escribe el baseline. Regala la clasificación.
2. **Post:** placeholder `"The system…\nCamila…\nOmar…"` (539) revela el mapeo entidad→grado.
3. **D7:** placeholder `"Strong conclusion…\nOpen possibility…\nRuled out…"` (791) re-entrega la taxonomía en el punto de recall.
4. **Transfer (outcome primario):** la pregunta (649) Y el audio (674) entregan las formas `must have / might have / can't have` mientras la pantalla dice "NO HINTS" (663).
5. **Orden posicional:** en los 3 casos, pista 1=must, 2=might, 3=can't (38-53, 668-670). Se puede aprender la posición sin razonar.
6. **Ambigüedad Nerea:** "no permission to edit" (52) no implica no poder borrar; la conclusión enseñada es "can't have deleted" (283).
7. **Ambigüedad música:** el dashboard prueba `SCHEDULED RELEASE` (668), no que "the label" lo agendó (651). Sobre-atribución de agente.

## Cambios aprobables (12 del agente estratega + 6 adiciones del verificador)

### Contenido (JSON)
- Quitar etiquetas de certeza de la evidencia del pre-check; usar las etiquetas neutrales del arrival ("Cloud log · 11:58 PM", "Folder access · 11:57 PM", "Permissions").
- Placeholders neutros en pre, post, transfer y D7 (sin taxonomía, sin entidades, sin formas). Ej.: "Write your conclusion…".
- Retirar `must have / might have / can't have` de la consigna Y del audio.text de transferencia. Consignas con categorías semánticas en español (qué casi seguramente ocurrió / qué pudo ocurrir / qué no pudo ocurrir); producción SIEMPRE en inglés.
- D7 con el MISMO andamio semántico que pre/post/transfer (comparabilidad). Placeholder neutro.
- Fix Nerea: cuenta "read-only — no edit or delete permissions".
- Fix música: canónica pasiva "The track must have been scheduled." El clasificador ACEPTA también "the label must have scheduled" (laxo; decisión founder pendiente de ratificar); el feedback modela la pasiva.
- Romper la correspondencia posicional pista↔grado en transfer y D7 (orden fijo y neutral, igual para todos los participantes).

### Interacción (player v2) — microescena investigable
- Caso: una carpeta + cronología mínima; tres señales; una visible a la vez; se puede regresar y comparar; NINGUNA animación interpreta causalidad. El video de ondas = ambientación, se añade después del freeze.
- Pre-check/post/transfer/D7: tres sub-respuestas secuenciales dentro del MISMO paso (progreso "1 de 3"), pistas consultables durante la respuesta. Un solo textarea por sub-respuesta, minChars por parte (~10-12).
- Implementación: sub-estado interno del paso (opción única aprobada); NO tres pasos separados.

### Telemetría (sin columnas ni verbos nuevos)
- Un solo `envio_respuesta` por paso al completar las 3 partes: `result: { fase, correcto, rama, texto (concatenado), partes: [{categoria: 'casi_seguro'|'posible'|'imposible', texto, rama?}], attempt, studyId }`.
- Primer intento = las tres partes juntas, preservado íntegro.

### Integridad del experimento
- Bump `content_version` (ej. 2026-07-19) + nueva `version`; corte documentado en 02 · Bitácora.
- Actualizar los 6 recorridos E2E en el mismo PR (mismo estándar: recorrido completo, cero errores de consola, mobile viewport).
- Sanity-check de ramas del clasificador con el banco de ejemplos EXISTENTE (nunca con datos del cohort). Esperado: distribución se mueve hacia parcial/no_claro — es la medición volviéndose honesta, no una regresión.
- Página 08: añadir la definición honesta del experimento — "dadas tres categorías semánticas, ¿puede interpretar las pistas y producir los tres niveles de deducción en inglés? ¿Sigue pudiendo en D7 con evidencia nueva y sin recibir las formas gramaticales?"

### Secuencia post-implementación
1. Merge + verificación (build prod + E2E verdes).
2. Freeze de textos → generar audio definitivo (ElevenLabs es-pantalla/en-US según línea) en un solo pase.
3. Añadir fondo de ondas (ambientación).
4. Etapa 0 con 5 estudiantes.

## Fuera de alcance (pospuesto, con trigger)
- Micromundo manipulable (arrastrar conclusiones entre must/might/can't): backlog, post-piloto.
- Alfabetización de IA ("dirigir la IA sin dejar de pensar"): hipótesis estacionada; se reconsidera solo tras el memo del piloto y solo si la señal favorece Ruta A.
- STT, personajes adicionales, shared spaces, nuevas mecánicas, dashboards.

## Criterios de aceptación
- Ninguna etiqueta/forma/mapeo de certeza visible u audible antes o durante los 4 puntos de medición (más allá de las categorías semánticas en español de la consigna).
- Mismo andamio en pre, post, transfer y D7.
- Orden de pistas fijo entre participantes y NO correlacionado con el orden de grados.
- Primer intento (3 partes) persistido en un evento; retry no sobrescribe.
- Build prod + 6/6 E2E verdes; content_version nuevo; entrada en 02.

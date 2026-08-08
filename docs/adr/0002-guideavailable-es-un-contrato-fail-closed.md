# ADR 0002 · `guideAvailable` es un contrato fail-closed

- **Fecha:** 2026-08-06
- **Estado:** aceptada
- **Ámbito:** `src/lib/crear/validation.ts`, `CREAR-ENGLISH-DEDUCTION-V1` 1.12.0
- **Origen:** orden de ejecución CREAR v2, §6 (P3).

## Contexto

`condition: "independent"` es el eje número uno de la evidencia y el único que
la era post-IA vuelve decisivo: cuando todos tienen IA, *"lo hizo"* no vale
nada y *"lo hizo solo"* vale todo.

Estado verificado antes del cambio: el riesgo de runtime **no se materializaba**
—el botón de guía se condiciona a `currentStep.crear?.guideAvailable`, que lee
el paso actual y no hereda estado, y `advance()` hace `setGuideOpen(false)`—
pero nada lo fijaba. `validation.ts` no mencionaba `guideAvailable`, el campo
era opcional, y el test existente aseveraba a nivel de autoría del JSON, no de
DOM.

Un campo ausente es ambiguo. En el contrato que sostiene la afirmación
principal del producto, la ambigüedad se resuelve fail-closed.

## Decisión

1. `guideAvailable` es **obligatorio** en todo paso con `learningOpportunity`.
   No hay default implícito: el autor escribe `false`.
2. Invariante de esquema: `condition === 'independent'` ⟹
   `guideAvailable === false`. El esquema hace imposible el estado mentiroso.
3. El JSON declara `guideAvailable: false` explícito en `precheck`,
   `precheck-production`, `contrast`, `transfer-check-certainty`,
   `transfer-production`, `retest-certainty` y `retest-production`.
4. Un test de integración entra a `transfer-check-certainty` y a
   `transfer-production` —ya con la guía desbloqueada— y assevera que
   **ningún** affordance de guía existe en el DOM. No basta con que esté oculto.

Un baseline previo a la instrucción hereda además dos invariantes propias:
`baselineProduction` presente ⟹ `guideAvailable !== true`, `revealFeedback ===
false` y sin `classifier`.

## Consecuencias

- Un JSON que declare `independent` ofreciendo la guía ya no carga: falla en
  `validateCrearWorkshopJson`, tanto en el cliente como en `/api/classify`.
- El costo es que cada paso medido debe declarar el campo. Es exactamente el
  punto: obliga a decidir en vez de heredar un default.

## Cierre de dos dimensiones (misma pasada, §7)

Los datos ya existían y solo faltaba mostrarlos. En la escena `close` —no en la
pantalla de `completed`, que llega después del retest de día 7— se leen
`latestOutcomes['transfer-check-certainty']` y
`latestOutcomes['transfer-production']` y se rinden dos líneas:

```
Interpretación de las pistas: {correcta | por revisar}
Forma en inglés: {correcta | por revisar}
```

Mapeo de `rama`: solo `correcto` cuenta como forma correcta.
`misconcepcion_certeza` fuerza *interpretación por revisar* (la frase
contradice la decisión de certeza) y deja la forma como correcta. Para
`misconcepcion_forma`, `misconcepcion_forma_general` y `significado_sin_forma`
la producción no contradice la interpretación, así que la dimensión de
interpretación se toma de la decisión independiente de certeza.

Debajo, si hay texto guardado, se muestra la comparación con el baseline:
*"Al empezar escribiste…"* / *"Ahora escribiste…"*. Sin puntaje, sin
porcentaje, sin "score". Eso es lo que convierte el baseline en valor para el
alumno y no en impuesto de investigación.

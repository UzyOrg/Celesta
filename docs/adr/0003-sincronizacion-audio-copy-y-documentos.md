# ADR 0003 · Sincronización de audio, copy y documentos en 1.12.0

- **Fecha:** 2026-08-06
- **Estado:** aceptada
- **Ámbito:** `CREAR-ENGLISH-DEDUCTION-V1` 1.12.0, `docs/CURRENT_STATE.md`
- **Origen:** orden de ejecución CREAR v2, §9 y §10.

## Contexto

Tres dependencias rompen en silencio si se cambia solo el copy visible: el
audio del `transfer-bridge`, el audio del `prism` y `docs/CURRENT_STATE.md`.
`audioAssetsReady` compara `content_version` con `audio_asset_version` y
desactiva **toda** la narración si divergen, así que una decisión de audio mal
tomada no rompe: enmudece.

## Decisiones

### 9.1 · Audio del `transfer-bridge`: no se re-renderiza

El copy visible pasó de *"Primera parte completada."* a *"Ahora resolverás un
caso completo."* con el cuerpo que anuncia las dos tareas. El guion de
`transfer.mp3` dice *"Bien. Ya resolviste tres deducciones con ayuda. Ahora
cambia el caso, no la idea…"*, que **sigue siendo válido** junto al nuevo
encabezado.

Se eligió la opción B de la orden de ejecución: **dejar el audio como está y
ajustar solo `display`.** La aserción del test que exige *"Ahora cambia el
caso, no la idea"* en `crear.audio.text` se conserva, y se le añadió al lado
una aserción sobre el `headline` visible, para que el test no pueda quedarse en
verde mientras la pantalla dice algo que la grabación no dice.

### 9.2 · Audio del `prism`: no se re-renderiza

El `headline` pasó de *"Depende de qué tan seguro estás."* a *"La forma cambia
según la fuerza de la evidencia."*, y el `body` ahora muestra la construcción
completa (`PERSONA + must / might / can't + HAVE + acción en participio`),
porque los errores esperados no son solo elegir mal el modal: son
`might has worked`, `might have work`, `must worked`.

El guion de `prism.mp3` no contiene la frase *"qué tan seguro estás"*; dice
*"Las pistas no siempre nos dan la misma seguridad… Las tres llevan have y
después la forma pasada de la acción"*, que concuerda con el nuevo encabezado.
No hay divergencia entre voz y pantalla, así que no se re-renderiza.

**Deuda:** el encabezado de la hoja de guía en `CinematicEnglishPlayer.tsx`
sigue diciendo *"Tres formas de decir qué tan seguro estás"*. Alinearlo con el
marco de fuerza de la evidencia en v1.13.

### Versionado: `version` sube, `content_version` no

`version` sube a **1.12.0**. `content_version` y `audio_asset_version` quedan
ambas en `2026-08-03-baseline-clarity`.

Regla aplicada: no se re-renderizó ningún audio, luego no se sube
`content_version`, y la deuda queda anotada. Las dos versiones quedan idénticas
entre sí, que es lo que `audioAssetsReady` exige.

Efecto colateral aceptado: un estado local previo con el mismo
`content_version` reanuda con los índices corridos por el paso nuevo. Hoy hay
cero datos de estudiante, así que el único afectado posible es el checkout del
fundador; se resuelve limpiando `localStorage`.

### Copy del cierre: se acorta, el audio no cambia

El `body` del paso `close` pasó de *"Guardamos tu frase. En siete días verás una
pista nueva para descubrir qué recuerdas."* a *"Vuelves en siete días."* El
diagnóstico de dos dimensiones ya muestra la frase guardada, así que la línea
anterior era redundante, y en 320×812 esas tres líneas empujaban el botón
*"Terminar por hoy"* fuera de la zona del pulgar. `close.mp3` sigue diciendo
*"Terminaste por hoy. Guardamos tus respuestas…"*, que sigue siendo cierto: no
se re-renderiza.

### 9.3 · `docs/CURRENT_STATE.md` se actualiza en el mismo commit

Los tres puntos que contradecían esta pasada quedaron corregidos: *"no free
production"* en el precheck, *"Depende de qué tan seguro estás."* y *"explicitly
confirms the first part is complete"*.

Esta es la Falla 1 del handoff repitiéndose: dos documentos mutables, ambos
actuales, contradiciéndose, invisible desde cualquiera de los dos. Por eso
estas decisiones viven aquí, en ADRs append-only, y el archivo
`ORDEN_EJECUCION_CREAR_V2_PREPILOTO.md` se borró al cerrar la pasada.

## 10 · Congelar

Terminadas las secciones 1–9, **el contenido queda congelado**: cero bumps de
`content_version` hasta que los cinco alumnos hayan hecho el retest de día 7.
Cada bump particiona el cohorte y con n=5 no se puede permitir ni una
partición. Hoy hay cero datos de estudiante, así que el congelamiento todavía
es gratis.

## Desviaciones del plan escrito, registradas

Dos cambios fueron necesarios para cumplir el criterio de aceptación 4
(*ninguna entrada de la tabla cae en `no_claro` salvo `I don't know`*):

1. `misconcepcion_forma_general` lleva `none: ["maybe"]` en el paso de
   transferencia. `normalizeText` compara por subcadena, así que `"may"` casa
   dentro de `"maybe"` y una respuesta como *"Maybe Nora worked on the model"*
   habría caído en la rama de forma (prioridad 70) en vez de
   `significado_sin_forma` (60). El parche es semánticamente correcto: *maybe*
   no es un modal de posibilidad.
2. `misconcepcion_certeza` casa ahora el modal desnudo (`"nora must"`,
   `"emi must"`, `"emi might"`, `"emi may"`) en vez de exigir `modal + have`.
   Sin esto, las formas de interferencia L1 *"must to have moved"* y *"must had
   moved"* no casaban con ninguna rama y caían en `no_claro`. En el retest se
   conservó `"emi could have"` con `have` a propósito: `"emi could"` habría
   capturado *"Emi couldn't moved the poster"*, que pertenece a
   `misconcepcion_forma_general`.

Además, `significado_sin_forma` acepta marcadores en español (*tal vez*, *pudo
haber*, *no pudo*, *es imposible*…) y su feedback dice *"La idea está clara"* en
vez de *"Es inglés válido"*, que sería falso para una respuesta en español. Una
deducción correcta escrita en español es exactamente la celda *razonamiento
correcto sin la forma meta*, no una respuesta ilegible.

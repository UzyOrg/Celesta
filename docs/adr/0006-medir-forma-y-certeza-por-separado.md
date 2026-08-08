# ADR 0006 · Forma y certeza se miden por separado, y el orden deja de ser una respuesta

- **Fecha:** 2026-08-07
- **Estado:** aceptada
- **Ámbito:** `CREAR-ENGLISH-DEDUCTION-V1` 1.17.0,
  `src/lib/crear/localClassifier.ts`, `src/lib/crear/modalForm.ts` (nuevo),
  `src/lib/crear/shuffle.ts` (nuevo), `src/lib/crear/types.ts`,
  `src/lib/crear/validation.ts`, `src/lib/crear/telemetry.ts`,
  `src/lib/crear/learningEvidence.ts`, `src/lib/crear/studyState.ts`,
  `CinematicEnglishPlayer.tsx` + su CSS, `CinematicPrecheck.tsx`,
  `CinematicCertaintyMap.tsx`, `CinematicBaselineProduction.tsx`,
  `CinematicCaseArtifact.tsx`, `tests/e2e/crear-english-deduction.spec.ts`
- **Origen:** auditoría pedagógica del flujo completo antes del piloto, pedida
  por el fundador. Nueve hallazgos; los nueve se corrigen aquí.
- **Relación con ADRs previos:** no revierte ninguno. Cumple lo que el ADR 0004
  §5 ya se había propuesto — separar calibración de forma — que estaba
  implementado en las **pantallas** pero no en la **puntuación**.

## Contexto

El diseño llegó al piloto con la arquitectura correcta y con la medición rota
en tres puntos distintos. Los tres comparten una causa: **la evidencia se leía
de un artefacto que ya cargaba otra cosa**.

## 1. El clasificador no verificaba de quién se hablaba

`localClassifier` comparaba señales con `String.includes` sobre el texto
normalizado. El grupo de sujeto `["nora","she","he","they"]` se satisfacía con
cualquier frase que contuviera *the*, porque `he` está dentro. Verificado
ejecutándolo contra el JSON real: `Elena might have worked on the model` y
`I might have worked on the model` devolvían `correcto`, y
`Emi can't have taken the bus` también.

Peor: la rama `correcto` devuelve confianza 0.95, y `/api/classify` prefiere un
match estructural local de alta confianza sobre un modelo que discrepe. El LLM
no podía corregir el falso positivo.

Simétricamente, las ramas de misconcepción estaban ancladas al nombre
(`any: ["nora must"]`) mientras la rama correcta aceptaba pronombres, así que
`She must have worked on the model` —forma impecable, certeza equivocada— caía
en `no_claro`, que es exactamente el agujero que las ramas intermedias del ADR
0004 existían para tapar.

**Decisión.** Las señales se comparan por tokens completos
(`containsSignal`, con la frase acolchada de espacios en ambos lados). Las
ramas de misconcepción pasan a `allGroups` con el mismo grupo de sujeto que la
rama correcta. Además, el sujeto deja de ser una suposición y pasa a ser un
dato: `productionTarget.subject` lo declara y la telemetría guarda
`subjectPresent`.

Consecuencia aceptada: una deducción bien formada sobre la persona equivocada
llega a `no_claro`, cuyo copy es tibio para ese caso. Es preferible a puntuarla
como correcta, y `subjectPresent: false` deja el motivo en los datos.

## 2. `modal_form` se puntuaba con la rama del clasificador

`transfer-production` declara `constructs: ["modal_form"]`, pero
`misconcepcion_certeza` marca `correcto: false`. Un alumno que elegía mal la
certeza y escribía `Nora must have worked on the model` —estructura
`modal + have + participio` impecable— quedaba registrado como error de forma.
El recibo de cierre se lo decía en la cara: *"Forma en inglés — por revisar"*.

Eso colapsa precisamente lo que las dos pantallas separadas existían para
separar.

**Decisión.** Una frase de producción se lee dos veces y con dos propósitos
distintos:

- **la rama** decide qué *feedback* ve el alumno, y sigue siendo la autoridad
  ahí;
- **`readModalForm`** decide qué se *registra*: `expressedCategory` (qué
  certeza expresa la frase), `wellFormed` (`modal + have + participio`
  autorizado, sin nada en medio) y `subjectPresent`.

El ledger de evidencia para `modal_form` usa `wellFormed && subjectPresent`. La
telemetría lleva además `certaintyConsistent`: si el modal escrito coincide con
la decisión que el alumno tomó una pantalla antes. Ser consistente y estar
mal calibrado son dos hallazgos distintos y no deben mezclarse.

`productionTarget` es un contrato *fail-closed*, igual que `guideAvailable`: un
paso que declara `modal_form` sin él no valida.

El baseline también lo lleva, aunque no corre clasificador. Sin eso, la
pre-medida de forma era una cadena de texto que nadie había puntuado y toda la
comparación antes/después quedaba esperando etiquetado a mano.

## 3. Las respuestas correctas bajaban en diagonal

`precheck`: opciones `casi_seguro, posible, imposible`; ítems sofía→**1ª**,
mateo→**2ª**, renata→**3ª**. `guided-map`: la misma diagonal. Un alumno tocando
la columna hacia abajo sacaba 3/3 en el pre-test — que con n≈5 es todo el
mecanismo de atribución que tiene el estudio.

**Decisión.** Rota el **orden de los ítems**, no el de las opciones. Las tres
opciones de certeza son una escala y barajar una escala cuesta lectura sin
comprar nada; la diagonal vivía en el orden de los ítems. Las opciones de
`contrast`, que no son escala, sí rotan.

El orden es función pura de `studyId` (`seededShuffle`): estable entre recargas
dentro de un estudio, distinto entre alumnos y reproducible desde la telemetría,
porque `shownOrder` viaja en cada evento de respuesta. Un orden aleatorio por
render habría sido peor que el fijo: la recarga rebarajaría a media tarea y la
posición que el alumno vio no sería reconstruible.

## 4. El día 7 no medía el mismo ítem que el día 1

`transfer-production` pedía **might have**; `retest-production` pedía
**can't have**. El copy era idéntico, el ítem no. Una caída D1→D7 se explicaba
igual de bien por olvido que por el cambio de modal, y n≈5 no separa eso
después.

**Decisión.** El retest pasa a ser una **forma paralela**: caso nuevo (Emi, el
mural de la entrada), mismo marco de pista, misma certeza objetivo (`posible`).
El artefacto `trip` se sustituye por uno nuevo, `mural`, porque el dibujo del
autobús contestaba la pregunta antes de hacerla.

Se pierde la medición independiente de `can't have`. Es un coste de currículo,
no de medición: `can't have` se sigue practicando en el mapa guiado. Un retest
que no es interpretable no vale nada.

Dos reglas de validación lo sostienen: `productionTarget.category` debe
coincidir con la respuesta autorizada del paso de certeza anterior, y todo paso
de producción independiente `delayed` debe apuntar a la misma certeza que el
`immediate`.

## 5. Cinco arreglos menores, mismo criterio

- **El reloj del baseline se reiniciaba al cambiar de opinión.** El diseño
  *fomenta* corregir el gate, y cada pulsación hacía `Date.now()`. Un alumno que
  escribía cuarenta segundos y luego pasaba a *"Todavía no"* quedaba registrado
  con dos. El reloj arranca cuando aparece el campo y no vuelve a arrancar; y
  pulsar el botón ya elegido —un doble tap en móvil— deja de emitir evento.
- **`assisted` en el mapa no era por pista.** Era `assisted || hadIncorrectMap`,
  global: fallar la pista 1 marcaba las pistas 2 y 3 como asistidas. Ahora la
  asistencia por pista es reintento + traducción **de esa pista**, más la guía,
  que sí se queda leída. El resumen del paso conserva la lectura agregada.
- **`novelty: new_case` prometía más de lo que había.** Los marcos de pista son
  isomorfos con sustantivos sustituidos. Se añade `cueFrame`
  (`physical_trace` / `presence_unobserved` / `absence_elsewhere`) al ledger,
  por ítem en los pasos multi-pista, para que el análisis distinga transferencia
  cercana de lejana en vez de deducirla de la etiqueta de caso. Y `Mateo`
  desaparece del pre-check —pasa a `Tadeo`, con otra pista— para cerrar la fuga
  entre baseline y práctica guiada.
- **`?retest=1` era destructivo.** Escribe `stepIndex`; disparado sobre alguien
  que no ha terminado el día 1 le borraba la posición y lo metía en una medición
  de algo que nunca se le enseñó. Ahora exige un retest ganado.
- **El recibo afirmaba un arco que no siempre existía.** El peso tipográfico
  solo se aplica cuando la frase de hoy se lo ganó. Un alumno que ya sabía la
  estructura, o que escribió peor que al empezar, veía su propio retroceso
  compuesto como progreso.

## Consecuencias

`content_version` sube a `2026-08-07-medicion-separada` junto con
`audio_asset_version` — ningún guion de audio cambió, así que ambos se mueven
juntos y la capa de voz sigue encendida. Los datos del piloto son cero, así que
la partición de `localStorage` es gratis. **La congelación se reanuda desde
aquí.**

`can't have` deja de tener medición independiente. Es deliberado; ver §4.

Verificado: `npm run typecheck`, `npm run lint:workshops`, y
`npx playwright test tests/e2e/crear-english-deduction.spec.ts
--project=mobile-chrome` en 32/32, más `api-hardening.spec.ts` en 3/3.

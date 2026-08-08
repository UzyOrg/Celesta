# ADR 0007 · La evidencia se declara, y el ledger se proyecta a estado por constructo

- **Fecha:** 2026-08-07
- **Estado:** aceptada
- **Ámbito:** `src/lib/crear/types.ts`, `src/lib/crear/validation.ts`,
  `src/lib/crear/constructState.ts` (nuevo), `src/lib/crear/telemetry.ts`,
  `src/lib/crear/studyState.ts`, `CinematicEnglishPlayer.tsx`,
  `CREAR-ENGLISH-DEDUCTION-V1` (metadatos, sin cambio de copy),
  `tests/e2e/crear-english-deduction.spec.ts`
- **Origen:** `docs/HANDOFF-2026-08-03.md` P2 y P5, los dos puntos que quedaban
  abiertos de esa auditoría.
- **Relación con ADRs previos:** no revierte ninguno. Completa el 0001 —
  el baseline existía y no cambiaba nada aguas abajo.

## Contexto

Los dos hallazgos comparten causa: **el ledger sabía describir y no sabía
concluir.** Registraba observaciones bien formadas y dejaba que cualquiera las
leyera como quisiera, incluidas las que no podían sostener nada.

## 1. `evidence_comprehension` producía filas que parecían evidencia

Se mide una vez: `contrast`, `supported`, `same_case`, `immediate`. Sin delta,
sin independencia y sin durabilidad, esa fila no puede afirmar nada sobre lo que
el alumno sabe — pero se veía idéntica a las que sí pueden, contaba para
cobertura y contaminaba cualquier agregación.

**Decisión.** Se añade `learningOpportunity.evidentiary`, con default `true`.
`contrast` lo declara `false`: sigue registrándose como **proceso** —describe la
ruta que tomó el alumno— y queda excluido por contrato de toda afirmación.

No basta con permitir la declaración; hay que hacerla obligatoria donde importa.
La validación recorre la lección y **rechaza** cualquier constructo que nunca se
observe en condición `independent` y no esté declarado `evidentiary: false` en
todos sus pasos. El estado ambiguo deja de ser representable, igual que con
`guideAvailable` (ADR 0002) y `productionTarget` (ADR 0006).

Se descartó la alternativa de añadir una segunda observación independiente de
`evidence_comprehension`: cuesta una acción del presupuesto del día 1 (ADR 0001)
y ese presupuesto existe porque un alumno agotado en el paso 9 mide cansancio.

## 2. El ledger registraba observaciones y nunca las agregaba

Un log responde *"¿qué pasó en el paso 8?"*. Lo que el piloto necesita responder
es *"¿qué sabe esta persona, bajo qué condiciones lo demostró, y se sostuvo?"*.
Eso es una relación **entre** observaciones del mismo constructo, y vivía
implícita en el orden de las filas.

**Decisión.** `aggregateCrearConstructStates`: función pura, sin reloj, sin
almacenamiento, sin UI y sin esquema nuevo. Proyecta el ledger a un
`CrearConstructState` por constructo, con `baseline`, `supported`,
`independent`, `delayed`, `errorShapes` y un `claim` **derivado, nunca escrito
a mano**.

Cinco reglas, cada una tapando una forma distinta de mentir con datos ciertos:

| Regla | Por qué |
|---|---|
| Sin baseline → `unproven` | Una afirmación de aprendizaje es un delta, no un nivel. Hace que olvidar el baseline sea ruidoso en vez de silencioso. |
| Baseline ya correcto → `preexisting` | Es la distinción que el baseline existe para trazar. Sin este valor el baseline se recoge y no cambia nada, que es el mismo error del punto 1. |
| `assisted` degrada | Una observación etiquetada `independent` que necesitó ayuda no es independiente, diga lo que diga la etiqueta. |
| Solo el primer intento | El producto permite reintentar para que el alumno recupere el hilo; la medida es lo que produjo antes del feedback. |
| `evidentiary: false` se excluye | El enlace con el punto 1: proceso nunca se lee como resultado. |

`claim` exige `baseline` para salir de `unproven`, así que el hueco de P1 es
imposible de olvidar: sin baseline la agregación lo dice, en vez de callarlo.

**Identificación estructural del baseline.** Es la observación
`independent + same_case + immediate`. Eso no es una convención de nombres: la
validación exige exactamente una por constructo evidenciario y que preceda a
todas las demás observaciones suyas. La regla del agregador está garantizada por
el esquema, no adivinada.

**Dónde se emite.** Viaja en el `result` de `taller_completado`, por la misma
razón que `retestDueAt` (ADR 0003 §telemetría): el ledger vive en
`localStorage` y un equipo compartido de salón puede perderlo. Es derivado, así
que siempre puede recomputarse desde las filas y nunca puede contradecirlas.

La emisión se movió de `completeLesson` a un efecto sobre `phase === 'completed'`.
El último paso medido lleva `revealFeedback: false`, así que `advance` corre en
el mismo tick que `persistAttempt` y el `study` del closure todavía no contenía
la última observación: reportar desde ahí **perdía la fila del día 7 siempre**.

## Sobre `errorShape`

`branch` identifica qué rama preautorizada disparó **en un paso**. Un
malentendido es un objeto que persiste entre pasos. Hoy solo existe lo primero,
y `errorShapes` guarda las ramas de los primeros intentos fallidos en orden. El
mapeo rama → forma estable de error puede esperar al post-piloto; el campo no,
o los datos de los primeros alumnos no serán comparables con los siguientes.

## Consecuencias

`content_version` **no** se mueve. `evidentiary` es metadato de análisis: no
cambia una sola palabra, audio ni decisión que el alumno vea, así que no
particiona la cohorte y la congelación declarada en el ADR 0006 sigue en pie.
`version` tampoco se toca por lo mismo — no hay cambio de instrumento.

Con n=5 la agregación se podría haber hecho a mano en una hoja de cálculo. El
valor no es ese: el artefacto que un tercero puede creer es una línea del tipo
*"produce modalidad epistémica negativa, sin ayuda, en un caso nuevo, siete días
después, habiendo fallado antes de la lección"*. Eso es una proyección de estado
agregado con baseline, no un log — y es precisamente lo que ningún output
generado por IA puede probar de sí mismo.

Queda abierto y es deliberado: `CREAR_CLASSIFIER_MODEL` sigue en `gpt-4o-mini`
por decisión del fundador, que lo cambiará por variable de entorno antes de
reclutar.

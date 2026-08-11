# Brief para el agente de código · Evidencia de piloto v1

**Fecha:** 2026-08-10
**Estado:** implementado y verificado localmente; migración de permisos y secreto de producción pendientes
**Alcance:** `/crear` (`CREAR-ENGLISH-DEDUCTION-V1`) y la tubería de datos que lo lee
**Contexto previo obligatorio:** `docs/adr/0006`, `docs/adr/0008`, `docs/CURRENT_STATE.md`

---

## Por qué existe este brief

`/crear` está funcionalmente terminado y tiene 35 pruebas en verde. Aun así, **hoy no puede
producir un dato interpretable del piloto**. Una auditoría encontró cuatro fallos que no son
de flujo sino de significado: la app funciona y el número miente.

Los 35 tests no atraparon ninguno. No es culpa de los tests — prueban recorrido, no
inferencia. Ese es exactamente el hueco que este brief cierra, y por eso **los criterios de
aceptación de abajo son propiedades sobre el significado de los datos, no recorridos de UI**.
Si terminas la implementación y solo agregaste pruebas E2E, no terminaste.

Dos de los cuatro fallos los introdujo o los dejó abiertos el trabajo del 2026-08-07 (ADR
0006). Se documentan aquí sin suavizarlos porque el patrón importa: **cada arreglo de
medición puede romper otra medición corriente arriba**, y el único blindaje es una prueba
que afirme la propiedad, no el flujo.

---

## Principio rector

> Ningún cambio de este brief busca que el alumno aprenda más. Todos buscan que, cuando el
> alumno falle o acierte, **el dato diga por qué, y no diga nada que no observamos**.

Corolario operativo: ante la duda entre registrar un valor plausible y registrar
"desconocido", **siempre "desconocido"**. Un hueco explícito se puede analizar. Un valor
inventado contamina todo lo que toca y no deja rastro.

---

## P0 · Nada de esto puede esperar a que haya un alumno real

### 1. El export no tiene autorización

**Evidencia.** `src/app/api/teacher/export/route.ts:21-59`. El handler abre Supabase con
`SUPABASE_SERVICE_ROLE_KEY`, lee `classToken` del query string, y devuelve hasta 50 000 filas
—incluido `result`, que contiene el texto libre del alumno— sin comprobar en ningún momento
quién hace la petición. Lo único presente es un rate limit en memoria de 60/min por token.

**Por qué importa más que todo lo demás.** Ese `classToken` es el mismo valor que viaja en el
`?t=` del enlace que se le manda al estudiante. Cualquier persona que reenvíe su liga —un
grupo de WhatsApp, una captura— puede descargar el texto libre de la cohorte completa. Los
sujetos son menores de edad. Este es el único punto del brief donde el costo de equivocarse
no es un número mal medido, es un daño real y probablemente una exposición legal.

**Qué debe cumplir el arreglo.**
- Ninguna ruta que lea `eventos_de_aprendizaje` responde sin sesión autenticada **y**
  comprobación de que esa identidad es dueña del `class_token` solicitado. Conocer el token
  deja de ser suficiente.
- Verificar los permisos efectivos de las dos vistas involucradas. Las vistas normales de
  Postgres pueden saltarse RLS; deben ser `security_invoker` o revocarse el acceso.
  Service Role evade RLS siempre — si una ruta lo usa, la autorización va en la aplicación,
  explícitamente y antes de la consulta.
- Los identificadores en URLs pasan a códigos opacos (`P01`, `P02`), nunca nombres ni alias.
- Cerrar o desactivar cualquier lector legacy que quede expuesto.

**Fuera de alcance para ti, señalar al fundador:** política de consentimiento y periodo de
retención del texto libre. Es una decisión, no código.

**Aceptación.** Una petición sin sesión válida a cualquier lector devuelve 401/403. Una
petición con sesión válida pero sin propiedad del token devuelve 403. Prueba automatizada
para ambos casos.

---

### 2. El agregador puede afirmar aprendizaje que nunca observamos

Dos defectos independientes en la misma superficie. `constructStates.claim` **no debe usarse
como resultado oficial hasta que ambos estén cerrados.**

#### 2a · La omisión del baseline se guarda como error

**Evidencia.** `src/components/crear/v2/CinematicEnglishPlayer.tsx:1612`. En
`handleBaselineSubmit`, cuando `skipped` es verdadero, la llamada a `persistAttempt` pasa
`correct: false` y `evidenceCorrect: false`.

**Por qué importa.** El baseline tiene una compuerta deliberada: "¿podrías escribir esto?" →
"Todavía no" es una respuesta legítima y el diseño la fomenta. Pero en el ledger, ese alumno
queda indistinguible de uno que escribió algo y lo escribió mal. Después, si acierta en D7,
la cadena de inferencia lee "no sabía → ahora sabe" y puede etiquetarlo `durable`. **Nunca
observamos que no supiera.** Se inventó el punto de partida.

**Regla correcta.**

| Situación en baseline | Estado |
|---|---|
| Omitido (no escribió) | `desconocido` — nunca `incorrecto` |
| Correcto | conocimiento preexistente |
| Válido pero incorrecto | punto de partida observado |

Y en el otro extremo: **D7 ausente → `desconocido`, nunca `incorrecto`.** Quien no volvió no
falló.

**Implementación sugerida (no obligatoria).** El modelo actual solo tiene `correct: boolean`,
que no puede representar tres estados. Añadir a `CrearLearningObservation` una marca de
observación (p. ej. `observed: false` o `outcome: 'omitted'`) y que el agregador trate esas
filas como ausentes, no como fallos. La marca debe validarse en `studyState.ts`
(`isLearningObservation`) para que no entre basura desde `localStorage`.

**Aceptación.** Con un ledger donde el baseline está omitido y el D7 es correcto, ningún
`claim` puede ser `durable` ni equivalente. El estado resultante debe declarar que el punto
de partida es desconocido.

#### 2b · El baseline de un constructo multi-ítem es "el primero mostrado"

**Evidencia.** `src/lib/crear/constructState.ts:49` (`firstAttempt`, que ordena por
`attempt` y luego por `recordedAt`) y `:121` (`baseline: pick(...)`, que devuelve una sola
observación).

**Por qué importa, y de dónde salió.** El pre-check emite **tres** observaciones de
`certainty_calibration` que satisfacen el mismo predicado de baseline (`independent` +
`same_case` + `immediate`): Sofía, Tadeo y Renata. `firstAttempt` se queda con la que se
contestó primero.

Antes del ADR 0006 el orden de los ítems era fijo, así que el baseline era **siempre Sofía**:
sesgado, pero idéntico para todos y por tanto comparable. El ADR 0006 introdujo
`seededShuffle` para matar la diagonal de respuestas correctas — un defecto real — y con eso
convirtió el baseline en **un ítem al azar por alumno**. Se cambió un sesgo conocido por un
baseline no comparable. Dos alumnos con exactamente las mismas tres respuestas pueden
terminar con `claim` distinto.

No revertir el shuffle: la diagonal era un defecto peor. Arreglar el agregador.

**Invariante que debe cumplirse.**

> El `claim` de un constructo debe ser **invariante bajo el orden en que se mostraron los
> ítems**. Mismas respuestas por ítem ⇒ mismo claim, sin importar `shownOrder`.

**Dos caminos válidos.** (a) Agregar todos los ítems del mismo constructo/condición/novedad/
tiempo en un baseline compuesto — más información, y es el que prefiero. (b) Designar un ítem
ancla fijo en el JSON y barajar solo los demás — más simple, menos información, y obliga a
que el JSON declare el ancla. Elige uno y documenta por qué en un ADR.

Si tomas (a), `CrearConstructState.baseline` deja de ser una observación y pasa a ser un
resumen; eso toca `CinematicEnglishPlayer` (recibo de cierre) y `telemetry.ts`
(`constructStates`). Es un refactor legítimo, no lo esquives por tamaño.

**Aceptación.** Prueba de propiedad: para un conjunto fijo de respuestas por ítem, generar
todas las permutaciones de `shownOrder` y verificar que el `claim` resultante es idéntico en
todas. Esta prueba es el entregable más importante de la sección 2.

---

### 3. El día 7 no es recuperable ni temporalmente válido

Cuatro defectos que se refuerzan entre sí. La métrica principal del piloto depende de los
cuatro.

**3a · Sin `localStorage` la reentrada es imposible.**
`CinematicEnglishPlayer.tsx:758`. `earnedRetest` se calcula sobre `nextStudy`, que viene de
`getOrCreateCrearStudyState`, que lee `localStorage`. Si el estado se perdió —otro
dispositivo, otro navegador, storage limpiado— el estudio nace en `phase: 'initial'` sin
`retestDueAt`, `earnedRetest` es `false`, y `?retest=1` no abre nada. El comentario del
código dice que el bypass existe precisamente para "un dispositivo compartido o reseteado":
**solo funciona cuando el estado sobrevivió, que es el caso en que no hacía falta.**

**3b · El bypass ignora el reloj.**
`CinematicEnglishPlayer.tsx:769`: `delete reopened.retestDueAt`. Y `retestLocked` exige
`typeof study.retestDueAt === 'number' && clockNow < study.retestDueAt`. Borrado el campo, la
puerta queda abierta de inmediato. Un alumno que termina el día 1 y toca `?retest=1` diez
minutos después hace "el retest de siete días" el mismo día, y la observación viaja etiquetada
`timing: 'delayed'` igual. Es un enlace: se comparte.

**3c · `retestDueAt` llega al servidor demasiado tarde.**
`trackCrearComplete` solo se dispara cuando `study.phase === 'completed'`
(`CinematicEnglishPlayer.tsx:954`), y la fase pasa a `completed` **después** del D7. El
comentario en `src/lib/crear/telemetry.ts:214-218` afirma que `retestDueAt` viaja en ese
evento para que "la cohorte se pueda reconstruir desde la base de datos". No se puede: llega
cuando ya no sirve para saber a quién había que invitar. Documento y código se contradicen;
gana el código.

**3d · La sesión expira exactamente cuando empieza el D7.**
`src/lib/session.ts:14`: `SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000`. El retest vence a
las 168 horas. `student_session_id` se regenera justo en la frontera, así que cualquier unión
longitudinal que dependa de la sesión se rompe precisamente en el punto que importa.

**Qué debe cumplir el arreglo.**
- La elegibilidad para D7 la decide **el servidor con su propio reloj**, no `localStorage`.
- El servidor debe saber a quién le debe un D7 **desde que termina el D1**, no después. Emitir
  el compromiso (participante opaco, `studyId`, fecha de vencimiento) al pasar a
  `waiting_retest`.
- La reentrada funciona en un **dispositivo nuevo**: enlace firmado que transporte
  identificador opaco + `studyId` + válido-desde. El cliente no puede auto-otorgarse el
  permiso.
- El bypass respeta el reloj. Si se conserva una llave para pruebas internas, que sea una
  variable de entorno de servidor, nunca un query param.
- Resolver la colisión de la sesión: o el estudio sobrevive a la expiración, o la unión
  longitudinal deja de depender de `student_session_id`. Documentar cuál es la llave canónica
  de unión y hacerla explícita en el esquema.

**Aceptación.** En un perfil de navegador limpio, con el enlace firmado: entra al D7 **si y
solo si** el servidor confirma D1 terminado y ≥168 h transcurridas. Prueba automatizada de
los cuatro casos: (D1 sí / tiempo sí) → abre; (D1 sí / tiempo no) → bloquea; (D1 no) →
bloquea; (perfil limpio, D1 sí, tiempo sí) → abre.

---

### 4. Los lectores actuales interpretan un contrato que `/crear` no emite

**Evidencia.** `src/app/api/teacher/export/route.ts:111-113` lee `result.score`,
`result.success` y `result.costo`; el resto de la evidencia se serializa entero dentro de una
celda `result_json`. `src/app/api/analytics/[classToken]/route.ts` busca campos del modelo
viejo de talleres. Ninguna de las dos rutas menciona `learningOpportunity`, `formWellFormed`,
`subjectPresent`, `assisted` ni `constructStates`.

**Por qué importa.** "Maestría" y "autonomía" pueden salir en cero o salir artificiales, y
nadie —ni el fundador— puede ver la evidencia sin escribir SQL a mano.

**Qué construir.** Una **consulta o script interno específico de `/crear`**. No resucitar el
dashboard docente. No extender analytics legacy.

Debe reconstruir, por participante y sin pérdidas silenciosas:

```
baseline → práctica apoyada → transferencia D1 (independiente) → D7 (independiente)
```

conservando por observación: texto crudo, primer intento, `assisted`, `formWellFormed`,
`subjectPresent`, `expressedCategory`, `certaintyConsistent`, `cueFrame`, `shownOrder`,
procedencia del clasificador y latencia.

**Segunda salida obligatoria: una proyección legible por persona.** Además del volcado
analítico, la consulta debe emitir por participante un resumen que un humano pueda leer sin
descifrar JSON — es el insumo con el que se arman a mano las tarjetas de §6. No es cosmética:
si armar quince tarjetas cuesta horas de lectura de JSONB, las entrevistas se dejan de hacer y
el experimento de mercado muere por fricción.

**Prueba de aceptación.** Correrla contra las **sesiones de auditoría que ya están en la
tabla**. Son basura como datos y son oro como prueba de plomería: si la consulta no logra
reconstruir esos recorridos completos, no está lista. Cero filas perdidas en silencio — si
algo no se puede unir, debe aparecer como faltante explícito, nunca desaparecer.

---

### 5. Diccionario de métricas (documento, antes de que existan datos)

Este sí es un documento y va **antes** del primer alumno, porque definir "durable" después de
ver los números no es medir.

Cuatro capas separadas, sin colapsarlas en un score único:

| Capa | Pregunta | Qué se reporta |
|---|---|---|
| Instrumento | ¿confiamos en los datos? | trazas completas, D1↔D7 unido, texto preservado, primer intento, `assisted` correcto, acuerdo humano |
| Producto | ¿la experiencia funciona? | inicio, finalización D1, tiempo, bloqueos, fallos de audio, abandono por paso |
| Aprendizaje | ¿qué pudo demostrar? | baseline, transferencia inmediata independiente, D7 independiente, transiciones individuales |
| Negocio | ¿alguien valora y paga? | puerta falsa, depósito, conversión |

**Para D7 se publican tres números, nunca uno:**

1. **Cobertura D7** = retests válidos y unidos / alumnos elegibles que terminaron D1
2. **Desempeño observado** = correctas / retests calificables
3. **Rendimiento extremo a extremo** = evidencia D7 válida, independiente y correcta / quienes iniciaron D1

El (3) es operacional y **no puede llamarse "porcentaje que aprendió"**. Quien no volvió es
un resultado desconocido, no un fracaso. Analizar solo a quienes regresan selecciona a los
más motivados.

Además, el regreso se desglosa y no se agrega: orgánico · tras recordatorio · recordatorio
entregado · enlace abierto · retest iniciado · retest terminado. Un WhatsApp manual mide
cumplimiento de protocolo, no retención de producto.

---

## P1 · Lo mínimo de código que el experimento de mercado necesita

La versión anterior de este brief pedía aquí una tarjeta de evidencia generada y una puerta
falsa al final del D7. Una revisión posterior corrigió las dos, con razón. Queda esto.

### 6. La tarjeta NO se automatiza — pero la consulta debe hacerla armable a mano

**Decisión:** para los primeros 10–15 casos la tarjeta se arma **manualmente**. No construir
un generador.

**Por qué, y no es por el costo.** Aunque programarla cueste un día, hacerlo congela un texto
que todavía no sabemos escribir. Armada a mano se puede reescribir después de cada entrevista,
se observa qué entiende la gente sin que nadie se lo explique, y no se convierte una decisión
provisional en superficie de producto. Se automatiza solo lo que sobreviva a 10–15
entrevistas.

**Lo que sí le toca al código:** la consulta de §4 debe emitir, por participante, una
proyección legible por un humano — no filas crudas de JSONB. Si armar quince tarjetas a mano
cuesta horas de descifrar JSON, las entrevistas se dejan de hacer. Ese es el único requisito
técnico de esta sección, y es real.

**Copy corregido de la tarjeta.** La versión anterior decía "qué podía hacer antes" y "qué
conviene practicar después". Las dos sobreafirman, y la primera **contradice el §2a de este
mismo brief**: si el baseline fue omitido no sabemos qué podía hacer. Una lección de pocos
ítems tampoco justifica una prescripción diagnóstica. Los seis bloques correctos:

1. Qué observamos antes
2. Qué pudo hacer en un caso nuevo
3. Qué apoyo utilizó
4. Qué volvió a demostrar una semana después
5. **Qué todavía no sabemos**
6. Qué reto le gustaría intentar ahora

La tarjeta debe mostrar la incertidumbre con la misma claridad con la que muestra el avance.

**Orden de entrega.** La evidencia se le muestra **primero al alumno**, con lenguaje que
refuerce competencia y autonomía ("esto lo resolviste solo", "aquí usaste la guía", "esto
todavía no lo observamos", "elige qué quieres intentar"), y se comparte con el padre **con
consentimiento**. Al padre se le muestra lo mismo con otro encuadre: qué fue independiente,
qué asistido, qué permaneció, qué no puede concluirse, qué decisión podría tomar. Mismo dato,
dos lecturas, y en ese orden — si no, el mejor activo del producto se convierte en vigilancia
parental.

### 7. Sonda de interés declarado — al terminar el D1, no al terminar el D7

Un botón —"quiero otro reto"— que registra el toque y, si se toca, pide **elegir un objetivo
concreto**. No promete fecha ni contenido.

**Corrección respecto a la versión anterior.** Estaba colocado al final del D7. Ahí solo lo
ve quien terminó el D1, conservó el enlace, regresó y toleró el retest: la rebanada más
comprometida posible, y un toque cuesta prácticamente cero. Ese clic significa *"una persona
altamente seleccionada expresó interés momentáneo"* y nada más.

**Colocación correcta: al terminar el D1**, donde el denominador es todo el que llegó hasta
ahí, y una semana antes. Mantener **también** la del D7: la diferencia entre las dos tasas es
informativa por sí misma.

**Cómo se nombra.** Esto es **interés declarado mediante conducta**, nunca demanda ni product
pull. La escalera real es:

1. toca "quiero otro reto" → 2. elige un objetivo concreto → 3. se registra al siguiente
piloto → 4. acepta un recordatorio → 5. **se presenta a la segunda experiencia** →
6. la termina → 7. vuelve otra vez

El brief solo puede instrumentar los pasos 1–4. **El salto de 1 a 5 es donde se descubre si
esto es producto**, y no se puede observar sin un segundo nodo. Ningún número de esta sonda
debe reportarse como retención.

### 8. Resolución del gate circular del segundo nodo

La sonda no puede demostrar repetición por sí sola, pero construir y liberar otro nodo antes
de D7 contaminaría la medición durable del primero. La velocidad de implementación reduce el
costo de código; **no reduce el costo de mezclar dos experimentos**.

Se separan por eso dos gates distintos:

1. **Gate para preparar:** cuando al menos 4/5 adolescentes terminen D1 sin intervención del
   founder ni confusión bloqueante, se puede construir el segundo reto en paralelo. Este gate
   prueba que la primera experiencia es operable, no que existe product pull.
2. **Gate para liberar:** el segundo reto permanece oculto hasta que esos participantes hayan
   cerrado D7. Después se invita únicamente a quienes completaron la escalera de compromiso:
   eligieron objetivo, apartaron lugar y aceptaron recordatorio.

El segundo reto debe medir un constructo diferente al del primer nodo. Repetir *past modals*
antes de D7 convertiría una señal de aprendizaje durable en una señal de práctica adicional.
Presentarse, terminar y volver al segundo reto son el primer dato de uso voluntario; ni el
clic ni el registro se llaman retención.

**El pago corre en paralelo, no como gate de student pull.** En las entrevistas se registra
si Celestea pretende reemplazar un gasto actual, complementarlo o crear gasto nuevo. Tres
depósitos con esas tres intenciones no describen el mismo negocio y nunca se agregan sin
mostrar el origen del presupuesto.

---

## Fuera de alcance · no hacer

- Dashboard docente como producto. Solo si un comprador nombra la decisión que cambiará y
  compromete presupuesto.
- Revivir o extender `analytics` legacy, el dashboard, anti-cheat, Cognitive Gym o
  Verification OS.
- Segunda lección visible durante el experimento D1→D7. Puede prepararse detrás de una
  barrera tras el gate 4/5 de §8, pero no se libera antes de cerrar D7.
- Tailwind en `/crear`.
- Reintroducir el flujo viejo de tres respuestas largas de texto libre.
- Cambiar contenido. `content_version` está congelado para el piloto. Si algún arreglo
  obligara a tocar el JSON, `content_version` y `audio_asset_version` se mueven **juntos** y
  se avisa antes, porque particiona el `localStorage` de la cohorte.

---

## Cómo se verifica que terminaste

Obligatorio, en este orden:

1. `npm run typecheck` limpio.
2. `npm run lint:workshops` sin regresiones (hay 6 warnings preexistentes no relacionados).
3. La suite completa de Playwright en verde.
4. **Las pruebas nuevas de propiedad**, que son el verdadero entregable:
   - invariancia del `claim` bajo permutación de `shownOrder` (§2b)
   - baseline omitido ⇒ el claim declara punto de partida desconocido (§2a)
   - D7 ausente ⇒ nunca cuenta como incorrecto (§2a)
   - los cuatro casos de la puerta del D7, uno de ellos en perfil limpio (§3)
   - lectores sin sesión ⇒ 401/403; con sesión ajena ⇒ 403 (§1)
5. La consulta de §4 corrida contra las sesiones de auditoría, reconstruyendo cada recorrido
   completo, con los faltantes explícitos.

**Un ADR por cada decisión de significado que tomes** — cómo se agrega el baseline compuesto,
cuál es la llave canónica de unión longitudinal, qué representa "desconocido" en el ledger.
Los nueve defectos del ADR 0006 se encontraron porque el diseño estaba escrito con suficiente
claridad para poder auditarlo. Esa es la única razón por la que vale la pena escribirlos.

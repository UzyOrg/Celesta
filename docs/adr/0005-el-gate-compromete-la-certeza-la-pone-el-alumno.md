# ADR 0005 · El gate compromete, la certeza es el hueco, y el cromo de caso se elimina

- **Fecha:** 2026-08-07
- **Estado:** aceptada
- **Ámbito:** `CREAR-ENGLISH-DEDUCTION-V1` 1.16.0,
  `CinematicBaselineProduction.tsx` + su CSS, `CinematicEnglishPlayer.tsx` +
  `CinematicEnglishPlayer.hallmark.module.css`, `src/lib/crear/types.ts`,
  `src/lib/crear/validation.ts`, `tests/e2e/crear-english-deduction.spec.ts`
- **Origen:** segundo y tercer recorrido del fundador sobre el flujo del ADR
  0004. El tercero rechazó el copy que este mismo ADR había propuesto y trajo
  redacciones propias; se recogen aquí porque nada de esto salió del working
  tree, así que no hay decisión previa que suceder — hay una decisión que
  redactar bien a la primera.
- **Relación con ADRs previos:** revierte la decisión *"el gate nunca bloquea el
  campo"* del ADR 0004 §1, **corrige** el copy que el ADR 0004 §4 dio por
  resuelto y **revierte** el ADR 0004 §6.2: el rótulo de caso deja de ser cromo
  persistente y vuelve a `arrival` solamente.

## Contexto

El ADR 0004 arregló seis fallas. Dos de sus arreglos quedaron a medias y uno de
ellos introdujo el problema que este ADR corrige: la §4 enunció la proposición
—que era el diagnóstico correcto— pero la redactó como una orden de traducción,
que es lo contrario de lo que el paso mide.

Hay un patrón detrás de las tres secciones y conviene nombrarlo, porque es el
que hay que aplicar antes de escribir la siguiente pantalla: **cada vez que una
pantalla no se entendía, la respuesta fue añadir texto explicativo, y cada vez
la solución real fue quitarlo y mover el trabajo a una forma que el alumno ya
reconoce** — el hueco del mapa de práctica, el botón que se bloquea, la pantalla
puente que ya narraba el cambio de caso. Copy que explica el diseño es señal de
que el diseño todavía no comunica solo.

---

## 1 · El "Sí" del gate ahora compromete

### Observado

En `precheck-production`, contestar *"Sí"* y contestar *"Todavía no"* llevaban
al mismo lugar: un botón activo que decía **"Continuar sin escribir"**. El
fundador lo describió así: *"siento que decidió que sí"* y abajo seguía
diciendo lo mismo.

### Por qué importa

El gate mide **creencia** y el campo mide **conducta**. Ese es todo el diseño
de evidencia de la pantalla 3. Si después de declarar *"puedo escribirlo"* la
interfaz ofrece exactamente la misma salida que después de declarar *"todavía
no"*, la declaración no tiene consecuencia — y una declaración sin consecuencia
deja de predecir la conducta. Las dos medidas colapsan en una y la comparación
día 1 / día 7 pierde su variable de control.

El ADR 0004 §1 decidió lo contrario con un argumento válido: *"un control
visible y deshabilitado sin explicación le enseña al alumno que la interfaz no
responde"*. La palabra que hacía todo el trabajo era **sin explicación**.

### Decisión

- Tras *"Sí"*: el botón primario dice **"Guardar y continuar"** y está
  **deshabilitado hasta que haya texto no vacío**. *"Continuar sin escribir"*
  no se renderiza.
- Tras *"Todavía no"*: sin cambios respecto al ADR 0004. El campo sigue abierto
  y el envío vacío sigue siendo conducta medida
  (`baseline_produccion_omitida`), porque el intento fallido previo a la
  instrucción es la mitad de la medición y además mejora lo que sigue (efecto
  *pretesting*).
- **La salida es el gate.** Los dos botones del gate siguen activos y siguen
  siendo corregibles. Pasarse a *"Todavía no"* no es una fuga: es una respuesta
  real a una pregunta real, y emite un segundo evento de gate que es dato
  válido.
- Un `blockedHint` nombra esa salida mientras el botón está bloqueado:
  *"Si no te sale, elige «Todavía no». También es una respuesta."* Es la única
  copia del flujo que explica un control deshabilitado, y existe precisamente
  para que el estado bloqueado se lea como **consecuencia de la respuesta del
  alumno**, no como una interfaz que dejó de responder.

Nadie queda atrapado. Se le pide al alumno que sea consistente, o que cambie de
opinión sobre el registro.

### Contrato

`blockedHint?: string` es **opcional** en `CrearBaselineProduction`. Si falta,
el componente compone la frase a partir de `gateNoLabel`, así que el estado
bloqueado nunca puede quedarse mudo. Si está presente, `validation.ts` exige que
no sea una cadena vacía. La telemetría no cambia.

---

## 2 · La proposición se enuncia; la certeza es el hueco

### Observado

Tres pantallas de producción pedían una traducción y calificaban una deducción:

| Paso | Copy anterior | Lo que el alumno lee | Lo que el clasificador premia |
|---|---|---|---|
| `precheck-production` | *"¿Podrías escribir esto en inglés?"* sobre la pista *"Camila llegó con gis en las manos y el pizarrón estaba borrado."* | traduce la pista completa | `Camila must have erased the board.` |
| `transfer-production` | *"Escribe tu deducción en inglés: Nora trabajó en la maqueta."* | escribe `Nora worked on the model` | `Nora might have worked on the model.` |
| `retest-production` | *"Escribe tu deducción en inglés: Emi movió el cartel."* | escribe `Emi moved the poster` | `Emi can't have moved the poster.` |

### Por qué importa

Enunciar la proposición **en modo declarativo** convierte el paso en una tarea
de traducción, y la traducción correcta de una proposición declarativa es
exactamente la respuesta que el clasificador marca como error. Un alumno que
hace bien lo que la pantalla pide cae en `significado_sin_forma` o en
`no_claro`. Eso no mide aprendizaje: mide obediencia a un copy roto, con signo
invertido.

El caso de Emi era el peor. La evidencia (*"Emi was on a school trip all
afternoon"*) **descarta** que Emi moviera el cartel; la pantalla le pedía al
alumno escribir que sí lo movió.

### El intento intermedio y por qué también falló

La primera corrección de este ADR fue *"La acción: Nora trabajó en la maqueta.
Escríbela en inglés con la certeza que acabas de elegir."* Resolvía la medición
y fallaba como enseñanza: dos puntos, dos oraciones, una etiqueta metadidáctica
(*"La acción:"*) y una instrucción de procedimiento. Es copy de andamiaje escrito
para explicar el diseño, no para que un alumno de prepa lo lea en tres segundos.

### Decisión

**El hueco es la certeza, y el hueco ya existe en la lección.** El mapa de
práctica (`guided-map`) enseña exactamente esta forma: `sentenceStart` +
espacio + `sentenceEnd` (*"Valeria ␣ painted the poster."*), donde lo que se
arrastra al espacio es el modal. Las pantallas de producción presentan **el
mismo hueco**, ahora en dos idiomas a la vez:

| Paso | En pantalla | Campo |
|---|---|---|
| `transfer-production` | *"Es … que Nora haya trabajado en la maqueta."* | *"Nora … the model."* |
| `retest-production` | *"Es … que Emi haya movido el cartel."* | *"Emi … the poster."* |

Encima del campo, una sola línea: **"Escríbelo como hemos practicado"**. Es
literalmente cierto —la práctica dijo *"Toca una expresión o arrástrala al
espacio"*— y es una instrucción de recuperación, no de procedimiento: apunta a
la memoria del gesto, no a una receta.

**Por qué `haya trabajado` y no `trabajó`.** El subjuntivo perfecto español es
`haya` + participio; el objetivo inglés es modal + `have` + participio. La
estructura española del andamio **rima con la estructura inglesa que se pide**,
así que el marco no es sólo un hueco: es un molde. Además es el único tiempo que
funciona con los tres valores (*posible que haya*, *imposible que haya*, *casi
seguro que haya*); con `trabajó` el modo se rompe en cuanto la certeza es
`posible`.

**Por qué la certeza no se nombra.** `revealFeedback` es `false` en los dos
pasos de certeza que preceden. Escribir *"Es posible que…"* devolvería la
respuesta que el alumno nunca recibió y destruiría la única medida independiente
de `certainty_calibration` del flujo. El puntito suspensivo la deja abierta: si
el alumno calibró mal, su frase hereda el error, que es justo lo que el
clasificador separa (`misconcepcion_certeza`, score 0.5, distinto de
`misconcepcion_forma`).

**Se quita la pista en inglés de las pantallas de producción.** Se leyó una
pantalla antes; repetirla gasta el espacio que necesita el marco y no añade
información. La pista sigue completa en `transfer-check-certainty` y
`retest-certainty`, que es donde se decide con ella.

**El retest se cambia igual que el transfer aunque el recorrido sólo señaló a
Nora.** El retest de día 7 es la medición que sostiene toda la afirmación de
durabilidad: si su copy no es idéntico al del transfer, la diferencia entre los
dos momentos deja de ser atribuible al tiempo. Lo mismo vale para *"como hemos
practicado"* en día 7, cuando la práctica fue hace una semana: es levemente
impreciso, y aun así prefiero la imprecisión a introducir una variable entre las
dos mediciones.

### Camila, y por qué el baseline también pregunta *"qué tan seguro"*

`precheck-production` pasa a *"¿Podrías escribir en inglés qué tan seguro es que
fue Camila quien lo borró?"*, y el campo lleva una sola línea: **"Esto no se
califica."**

La versión intermedia afirmaba la certeza (*"que casi seguro fue Camila"*). Eso
hacía el baseline **más fácil que el transfer**, donde la certeza la pone el
alumno. El recibo de cierre compara la frase del día 1 con la de hoy: con
prompts de dificultad distinta, parte del crecimiento que muestra es un artefacto
del enunciado. Preguntar *"qué tan seguro"* en los dos momentos vuelve simétrica
la comparación, que es lo único que la hace interpretable.

**Costo asumido, y por qué es aceptable.** Preguntar por el grado de certeza
antes de cualquier instrucción, sin escala en pantalla y sin opciones, es una
pregunta abierta genuinamente más difícil, así que sube la probabilidad de un
baseline en blanco. No es ruido: el gate ya separa *"creo que puedo"* de *"lo
intenté"*, el paso no tiene clasificador y el texto se etiqueta a mano. Un
baseline vacío con `gate: yes` es una observación, no un dato perdido.

**Las tres líneas que se borraron.** *"Escribe esa deducción, no la pista.
Inténtalo como puedas: esto no se califica."* llevaba tres instrucciones, dos
puntos y un punto y seguido para decir una cosa. Sobrevive la única que cambia
la conducta del alumno: **"Esto no se califica."** Lo demás lo dice ya el gate.

**La regla del ADR 0003 sigue en pie.** El copy nuevo no contiene ningún
participio inglés aceptado, y un test añadido verifica además que ningún marco
de producción contenga una palabra de certeza.

---

## 3 · Se elimina el breadcrumb de caso

### Observado

El breadcrumb *"Maqueta de la feria · Segundo caso: quién trabajó e…"* apareció
primero debajo de la barra de progreso y truncado; se movió arriba y se le quitó
el rótulo; y aun así, en pantalla, seguía leyéndose como cromo pegado encima del
contenido.

### Por qué importa

El ADR 0004 §6.2 lo justificó con *"el caso cambiaba tres veces en silencio"*.
Ese diagnóstico era correcto y **ya tenía solución**: `transfer-bridge` —*"Cambia
el caso, no la idea."*— narra el cambio en español, con audio, en su propia
pantalla, en el momento exacto en que ocurre. Y cada pantalla nombra a la persona
y al objeto en su propio cuerpo. El breadcrumb era una segunda respuesta, más
débil y permanente, a una pregunta ya respondida, y cobraba ancho y altura en
todas las pantallas para repetir algo que el alumno acababa de leer.

Orientación narrativa por encima de orientación por cromo: la primera se lee una
vez y se recuerda; la segunda se ignora a los diez segundos y sigue ocupando
píxeles el resto de la sesión.

### Decisión

- **Se elimina el breadcrumb.** `.topBar` vuelve a una sola fila: salir y barra
  de posición.
- El `caseArtifact.label` y `status` se conservan en el JSON y se renderizan
  **sólo en `arrival`**, que es donde el caso se presenta por primera vez.
- Los tests que exigían el breadcrumb ahora **exigen su ausencia**, para que no
  vuelva a colarse como cromo, y verifican que `transfer-bridge` conserva el
  encabezado que hace el trabajo de orientación.

---

## Versionado

`version` sube a **1.16.0**. `content_version` y `audio_asset_version` suben
juntas a **`2026-08-07-proposicion-y-certeza`**.

**Esta vez sí se bumpea `content_version`**, contra el congelamiento del ADR
0003, y el motivo es el que el propio ADR 0003 admite: *"hoy hay cero datos de
estudiante, así que el cambio de copy todavía es gratis"*. Sigue habiendo cero
datos de piloto. Además el bump es **obligatorio aquí**: `content_version` es la
llave del estado de estudio en `localStorage`, y un baseline recogido bajo el
copy de traducción no es comparable con uno recogido bajo el copy corregido —
mezclarlos en la misma partición sería peor que perderlos.

Ningún guion de audio cambió (`arrival`, `prism`, `transfer`, `close` no tocan
estas frases), así que las dos versiones suben juntas y la capa de voz sigue
activa.

**El congelamiento vuelve a entrar en vigor a partir de este bump.** Ningún
`content_version` más hasta que los cinco alumnos hayan hecho el retest de día 7.

## Verificación

- `npx tsc --noEmit` — pasa.
- `npx eslint` sobre los archivos tocados — pasa (2 warnings legacy de
  `exhaustive-deps` preexistentes).
- `node scripts/workshop-lint.mjs` — pasa con los 6 warnings legacy de siempre.
- `validateCrearWorkshopJson` contra el JSON compilado: pasa; con `blockedHint`
  en blanco lanza; sin `blockedHint` valida (campo opcional).
- Comprobación estática de los dos marcos de producción: cero participios
  ingleses aceptados en pantalla, cero palabras de certeza en el `body`.
- **Pendiente en la máquina del fundador:**
  `npx playwright test tests/e2e/crear-english-deduction.spec.ts --project=mobile-chrome`
  y el recorrido manual en 320×812 y 375×812. El sandbox donde se escribió este
  cambio no puede instalar las dependencias de navegador de Playwright, así que
  la suite **no se corrió aquí**. Los asertos nuevos ya están escritos:
  - botón primario deshabilitado tras *"Sí"*, con `blockedHint` visible, los dos
    botones del gate todavía activos, y espacios en blanco que no desbloquean;
  - los marcos *"Es … que …"* visibles en transfer y retest, sin ninguna palabra
    de certeza y sin la pista en inglés en esas dos pantallas;
  - ni el rótulo ni el estado del caso presentes fuera de `arrival`, y la barra
    de posición como único elemento junto al botón de salir;
  - los copys de producción viven en constantes al inicio del spec, así que una
    regresión al marco de traducción sale como diff que falla.

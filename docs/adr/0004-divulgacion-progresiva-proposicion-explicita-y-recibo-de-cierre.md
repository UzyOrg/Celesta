# ADR 0004 · Divulgación progresiva, estructura única, proposición explícita y recibo de cierre

- **Fecha:** 2026-08-06
- **Estado:** aceptada
- **Ámbito:** `CREAR-ENGLISH-DEDUCTION-V1` 1.13.0,
  `CinematicBaselineProduction.tsx` + su CSS, `CinematicEnglishPlayer.tsx` +
  `CinematicEnglishPlayer.hallmark.module.css`, `src/lib/crear/types.ts`,
  `src/lib/crear/validation.ts`, `tests/e2e/crear-english-deduction.spec.ts`
- **Origen:** recorrido completo del fundador sobre el flujo ya construido, con
  seis fallas observadas de primera mano. Sucede a los ADR 0001–0003.
- **Ejecutada con:** las skills `ui-ux-pro-max` y `hallmark` instaladas en
  `~/.claude/skills/`, y el audit vigente
  `.hallmark/audit-chalk-over-film-2026-08-01.md` (sistema **"chalk over film"**).

## Contexto

Las seis fallas no eran de pulido. Cuatro de ellas cambian **qué mide** el
producto o **qué entiende** el alumno, no cómo se ve. Se corrigen aquí; el
resto del rediseño queda fuera de alcance.

---

## 1 · Baseline de producción: divulgación progresiva y una sola acción primaria

### Observado

Antes de contestar el gate, el fundador intentó picar *"Todavía no sé cómo
decirlo"* y estaba deshabilitado. Leyó dos negativas casi idénticas —*"Todavía
no"* arriba y *"Todavía no sé cómo decirlo"* abajo— y no supo a cuál pertenecía
la decisión. Al contestar *"Sí"*, el botón de omitir seguía ahí.

### Por qué importa

Son tres fallas apiladas, y las tres tienen costo real:

1. **Affordance muerto.** Un control visible y deshabilitado sin explicación le
   enseña al alumno que la interfaz no responde. En la pantalla 3, antes de que
   haya aprendido nada, es el peor momento posible para enseñarle eso.
2. **Redundancia semántica.** El gate mide **creencia** (*¿crees que puedes?*).
   El envío vacío mide **conducta** (*¿lo intentaste?*). Son dos señales
   distintas del diseño de evidencia; con etiquetas casi iguales el alumno las
   lee como la misma pregunta hecha dos veces y elige al azar. Eso contamina
   **las dos** medidas, no una.
3. **Contradicción tras "Sí".** Ofrecer una salida por no saber justo después de
   declarar que sabe le quita valor al gate.

### Decisión

- **Antes de contestar el gate** no se renderiza nada debajo de él: ni campo, ni
  CTA, ni botón de omitir. Los dos botones del gate *son* la acción de ese
  momento. Todo lo posterior vive dentro de un solo bloque condicional
  (`.attemptStage`), que además conserva la columna para que la acción primaria
  se quede en la zona del pulgar.
- **Al contestar** (cualquiera de las dos respuestas) aparecen el encabezado
  *"Inténtalo como puedas. Esto no se califica."*, el campo, y **un solo botón
  primario** cuya etiqueta sigue al campo:
  - vacío → *"Continuar sin escribir"*
  - con texto → *"Guardar y continuar"*
- **Se elimina el botón secundario de omitir.** Su función la absorbe el estado
  vacío del primario. Omitir sigue siendo una conducta medida, no una fuga.
- El gate conserva `aria-pressed` y sigue siendo corregible; corregirse emite un
  segundo evento de gate, que es dato válido, no error.

**El gate sigue sin bloquear el campo.** El intento previo a la instrucción es
lo que hace interpretable la comparación final, y un intento fallido antes de
enseñar mejora lo que sigue (efecto *pretesting*). *"Todavía no"* suaviza el
marco; nunca cierra la puerta.

### Contrato

`skipLabel` dejó de describir lo que el campo hace, así que se renombró a
**`emptySubmitLabel`** en `types.ts`, `validation.ts` y el JSON. Es un contrato
interno sin datos guardados: el rename es gratis y es preferible a un nombre que
miente sobre el rol del campo.

**La telemetría no cambia.** Se siguen emitiendo `baseline_gate_yes` /
`baseline_gate_no` con latencias separadas, y el intento como
`baseline_produccion` con `texto` crudo o `baseline_produccion_omitida` cuando
se envía vacío, ambos con `baselineGate`. Verificado en el navegador, no solo
en el test.

---

## 2 · `prism`: una sola representación de la estructura, y arriba

### Observado

El `body` agregado en 1.12.0 —`PERSONA + must / might / can't + HAVE + acción en
participio`— era texto plano sin jerarquía, y hasta abajo la misma pantalla ya
explicaba la estructura con el riel de fórmula, que estaba mejor resuelto.

### Por qué importa

Dos representaciones de la misma regla en una pantalla duplican la carga
extrínseca sin añadir información. Peor: la explicación buena —la que segmenta
la oración en partes etiquetadas— estaba al final, cuando la atención ya se
gastó. El orden enseñaba al revés.

### Decisión

1. **`prism.crear.display.body` queda en `""`.** La información que llevaba no
   se pierde: la etiqueta de la tercera parte del riel pasó de *"acción pasada"*
   a *"acción en participio"*, que es justo el error esperado
   (`might have work`).
2. **El riel sube** al inicio del bloque, debajo del encabezado y **antes** del
   selector de fuerzas. Orden nuevo: encabezado → estructura → selector →
   descripción y ejemplo.
3. **El riel se rediseñó como un objeto, no como tres columnas.** Las partes
   fluyen como una oración (`flex-wrap`, alineadas a la línea base) y cada una
   lleva su etiqueta micro debajo; se distinguen por jerarquía tipográfica y
   espacio, sin cajas ni cromo. La ranura que cambia —`must have` → `might
   have` → `can't have`— lleva el marfil del sistema y el mismo subrayado que ya
   marca `must have` en la pantalla de contraste: mismo significado, mismo
   tratamiento. Esa actualización **es** el mecanismo de enseñanza y está
   cubierta por test.
4. El encabezado *"La forma cambia según la fuerza de la evidencia."* se
   conserva (corrección de constructo del ADR 0003).

**Deuda del ADR 0003 cerrada:** el encabezado de la hoja de guía pasó de *"Tres
formas de decir qué tan seguro estás"* a *"Tres formas según la fuerza de la
evidencia"*. Era la última superficie que seguía enmarcando la certeza como
confianza personal.

**Audio: no se re-renderiza.** `prism.mp3` dice *"Las pistas no siempre nos dan
la misma seguridad… Las tres llevan have y después la forma pasada de la
acción"*, que concuerda con la pantalla nueva.

**Deuda saldada:** `prism` ya no desborda en 320×812. El botón *Continuar*
termina en 795 px de 812 (antes sobresalía ~36 px). Borrar el párrafo duplicado
liberó más espacio del que costó subir el riel.

---

## 4 · Nora: enunciar la proposición (la falla más grave)

### Observado

En `transfer-check-certainty` la pista decía *"Nora stayed in the classroom
during recess. Nobody saw what she was doing."* y la pregunta era *"Con esta
pista, ¿qué tan segura puede ser tu conclusión?"*. **¿Conclusión sobre qué?**
Nunca se enunciaba la acción. Y en `transfer-production` se pedía escribir la
deducción "sobre Nora y la maqueta" sin decir **qué verbo**: ¿la armó, la
pintó, la rompió?

### Por qué importa

Esto no es copy, es un defecto de medición. La celda que ese paso mide es
`certainty_calibration` y luego `modal_form`. Si el alumno tiene que *adivinar
la proposición*, se le agrega una tarea que nadie quiso medir, y un error puede
venir de tres sitios distintos sin forma de distinguirlos. Con n≈5 eso arruina
la interpretación del dato. El caso de Emi sí estaba bien —*"The poster is now
in a different place"* implica que alguien lo movió— así que la asimetría era de
Nora.

### Decisión

La proposición se enuncia **en español**, dentro de la pregunta, en las cuatro
pantallas, para que las dos mediciones sean simétricas:

| Paso | Pregunta |
|---|---|
| `transfer-check-certainty` | ¿Qué tan segura es esta conclusión: Nora trabajó en la maqueta? |
| `transfer-production` | Escribe en inglés esa misma conclusión: Nora trabajó en la maqueta. |
| `retest-certainty` | ¿Qué tan segura es esta conclusión: Emi movió el cartel? |
| `retest-production` | Escribe en inglés esa misma conclusión: Emi movió el cartel. |

La pregunta se renderiza como etiqueta visible del campo o del grupo de
opciones, así que la proposición está en pantalla **al mismo tiempo** que la
pregunta, sin scroll, verificado en 320×812.

**Por qué el verbo en español no regala la respuesta.** Lo que se mide es
`modal_form`: elegir el modal correcto y construir `modal + have + participio`.
Dar *"trabajó"* o *"movió"* elimina una búsqueda de vocabulario que nadie está
midiendo y deja intacto el objetivo: el alumno todavía tiene que producir
`might have worked` / `can't have moved` por su cuenta.

**La regla del ADR anterior sigue en pie y ahora está automatizada:** un test
lee la lista de participios aceptados de la rama `correcto` de cada paso y falla
si alguno aparece en cualquier cadena que ese paso muestre en pantalla
(`headline`, `body`, `pregunta`, `placeholder`, rótulo y estado del caso). Antes
era una verificación manual que había que acordarse de repetir.

**Opciones de respuesta sin cambios.** *Es casi seguro / Es posible / Queda
descartado* ya son inequívocas con la proposición enunciada, y sus `id` mapean a
las categorías del contrato.

---

## 5 · Pantalla de cierre: un recibo, no un párrafo

### Observado

*"Interpretación de las pistas: correcta"* y *"Forma en inglés: por revisar"*
eran dos líneas de texto suelto sin jerarquía ni marco.

### Por qué importa

Esa pantalla es lo único que el alumno **recibe** a cambio de haber escrito un
baseline que no le servía a él. Si se lee como nota al pie, el baseline vuelve a
ser impuesto de investigación. Y es la última impresión del día 1, la que decide
si vuelve el día 7.

### Decisión

Un bloque con forma de entrega:

- **rótulo de entregable corto y humano:** *"Lo que guardamos de hoy"* — no
  *Resultado*, no *Score*, ningún nombre interno de UI;
- **dos filas paralelas**, cada una con su etiqueta (*Interpretación de las
  pistas* / *Forma en inglés*) y su estado, separadas por filetes de un pixel;
- distinción por **icono de `lucide-react`** (`Check` / `RotateCcw`) y jerarquía
  tipográfica. **Sin semáforo:** el único color en juego es el marfil del
  sistema para el estado cumplido y el gris apagado para el pendiente. Un rojo
  contra un verde convertiría un reporte descriptivo en una calificación;
- vocabulario ya decidido: *correcta* / *por revisar*. Sin puntaje, sin
  porcentaje, sin *"1 de 2"* —los tres verificados por test;
- debajo, el antes/ahora como **una sola unidad**: la frase de hoy con el peso
  (display, tinta plena) y la del inicio como contraste (más chica, apagada),
  las dos en inglés y legibles;
- **degrada con gracia:** si el alumno omitió el baseline, la comparación no se
  renderiza y el bloque de dos dimensiones sigue leyéndose completo y
  deliberado, no truncado. Verificado en navegador y con test propio.

Mapeo de estado sin cambios: solo `correcto` cuenta como forma correcta;
`misconcepcion_certeza` fuerza *interpretación por revisar* y deja la forma como
correcta; `misconcepcion_forma`, `misconcepcion_forma_general` y
`significado_sin_forma` dejan la interpretación en lo que dijo la decisión
independiente de certeza.

---

## 6 · Por qué cambia el caso: narrar el hilo, no quitar los casos nuevos

### Razonamiento

El caso **debe** cambiar. Si el alumno repitiera el cartel se mediría memoria
del caso, no transferencia; la celda `novelty: "new_case"` es lo que sostiene la
afirmación de aprendizaje. Lo que faltaba no era quitar los casos nuevos: era
narrar el cambio. El producto cambiaba de caso en silencio tres veces y esperaba
que el alumno infiriera el motivo.

### Decisión

1. **El puente lo resuelve para el salto 1 → 2** (ver §3 abajo).
2. **Cada caso se identifica a sí mismo.** El rótulo del artefacto
   (`caseArtifact`) **estaba oculto en todas las pantallas menos la de
   llegada**: `.caseArtifact[data-compact="true"] .artifactCaption` era
   `display: none`. Ese era el hallazgo real de esta sección — el ancla de
   orientación existía en el JSON y no llegaba a la pantalla. Ahora se muestra
   el rótulo más una línea de estado que dice qué se investiga:

   | Pantalla | Rótulo | Estado |
   |---|---|---|
   | `guided-map` | Cartel de la feria | Primer caso: quién trabajó en el cartel. |
   | `transfer`, `transfer-check-certainty`, `transfer-production` | Maqueta de la feria | Segundo caso: quién trabajó en la maqueta. |
   | `retest-certainty`, `retest-production` | Excursión escolar | Tercer caso: quién movió el cartel. |

   La copia de la pista visual (`cue`) sigue oculta en modo compacto: la pista ya
   es el cuerpo de esas pantallas. El mapa de práctica conserva su comportamiento
   anterior —empareja el dibujo con su propio bloque de pista y no tiene espacio
   para un rótulo—, así que la regla se anula dentro de `.mapEvidenceRow`.
3. No se agregó mapa de progreso, ni nombres de etapa, ni contadores. La barra
   de posición existente ya responde *"dónde estoy"*. Esto es orientación
   narrativa, no gamificación.

### Desviación registrada

La orden pedía que **el cuerpo** del retest nombrara el caso nuevo igual que el
puente. No se hizo así: `display.body` de las cuatro pantallas de Nora y Emi
lleva la pista **en inglés** por decisión del ADR 0003 (*"the final measurement
no longer changes the language of the stimulus relative to practice"*), y
sustituirla por una línea en español reintroduciría el confound de idioma que
esa decisión eliminó. El caso se nombra en el rótulo del artefacto, que es
visible al mismo tiempo, permanente, y es el mecanismo que la propia §6.2
designa como *"el ancla de orientación más barata que existe"*.

---

## 3 · `transfer-bridge`: el marco correcto, y por primera vez voz y pantalla dicen lo mismo

El cuerpo *"Con las mismas pistas harás dos cosas: 1) decidir… y 2) expresarla
en inglés."* se cortaba en pantalla y una lista numerada dentro de un párrafo se
lee mal. Pero el problema de fondo era el marco: lo que el alumno necesita saber
ahí no es cuántas tareas vienen, sino **por qué cambia el caso**.

```json
"headline": "Cambia el caso, no la idea.",
"body": "Ya resolviste el cartel con ayuda. Ahora la maqueta de la feria, con menos apoyo."
```

**Audio: no se re-renderiza, y esta vez el encabezado lo cita.** El guion de
`transfer.mp3` ya decía literalmente *"Ahora cambia el caso, no la idea"*. El
encabezado nuevo **es** esa frase: voz y pantalla dicen lo mismo por primera
vez. El test conserva la aserción sobre `crear.audio.text` y mantiene al lado la
aserción sobre el `headline` visible, para que no pueda quedarse verde mientras
la pantalla dice algo que la grabación no dice.

---

## Versionado

`version` sube a **1.13.0**. `content_version` y `audio_asset_version` quedan
ambas en `2026-08-03-baseline-clarity`.

Ningún cambio de esta pasada obligó a re-renderizar audio: los tres guiones
afectados (`prism`, `transfer`, `close`) siguen siendo ciertos junto al copy
nuevo, y el del puente pasó de ser *compatible* a ser *idéntico*. Sigue vigente
el congelamiento del ADR 0003: cero bumps de `content_version` hasta que los
cinco alumnos hayan hecho el retest de día 7. Hoy hay cero datos de estudiante,
así que el cambio de copy todavía es gratis.

## Verificación

- `npm run typecheck` — pasa.
- `npm run lint:workshops` — pasa con los 6 warnings legacy de siempre.
- `npx playwright test tests/e2e/crear-english-deduction.spec.ts --project=mobile-chrome`
  — **28/28** (22 previos + 6 nuevos).
- Recorrido manual completo de las trece pantallas en **320×812 y 375×812** con
  `NEXT_PUBLIC_CREAR_RETEST_DELAY_HOURS=0`: cero desbordamiento horizontal, cero
  errores de consola, cero 404, y la acción primaria completa dentro del
  viewport en **todas** las pantallas, sin necesidad de scroll de página.
- Segundo recorrido **omitiendo el baseline**: el cierre se renderiza sin
  comparación y el bloque de dos dimensiones sigue completo.
- Telemetría verificada en el navegador, no solo en test: `baseline_gate_no` y
  `baseline_gate_yes` con latencias separadas, `baseline_produccion` con `texto`
  crudo y `baselineGate: 'yes'`, `baseline_produccion_omitida` con
  `baselineGate: 'no'` y sin `texto`, los tres con
  `learningOpportunity.id === 'baseline-modal-form'`; `classifierSource` en las
  producciones; `retestDueAt` numérico dentro de `result` en
  `taller_completado`.
- `rg -n "Es seguro|culpable|Primera parte|Depende de qué tan seguro"` sobre el
  JSON de la lección — sin resultados.

Artefactos: `test-artifacts/celestea-v19-prism-320.png`,
`celestea-v19-closing-receipt-no-baseline-320.png`,
`celestea-v18-baseline-production-375.png`,
`celestea-v18-closing-diagnostic-375.png`.

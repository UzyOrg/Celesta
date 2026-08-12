# ADR 0013 · La forma modal necesita una observación con apoyo

- **Fecha:** 2026-08-11
- **Estado:** aceptada por el fundador antes del primer participante
- **Ámbito:** `/crear`, `CREAR-ENGLISH-DEDUCTION-V1` 1.18.0

## Contexto

`modal_form` tenía baseline, transferencia y retest independientes, pero ninguna
observación `supported`. Por construcción, `supported_only` era inalcanzable:
el producto no podía distinguir entre quien arma la forma con piezas y quien no
la arma ni con ese apoyo. A la vez, pedir *maqueta*, *borrar* o *pintar* en
inglés añadía recuperación de vocabulario a una medida cuyo objetivo es
`modal + have + participio`.

## Decisión

Las tres producciones muestran el mismo apoyo léxico opcional: un verbo base
regular (`erase`, `work`, `paint`) fuera del placeholder. En el baseline solo
aparece después de responder el gate, junto al intento; por tanto no altera la
autoevaluación inicial.

Entre `guided-map` y `transfer-bridge` se añade `guided-form`: el alumno
completa `Mateo ___ ___ ___ on the poster.` con `MIGHT`, `HAVE`, `HAS`, `WORK`
y `WORKED`. `HAS` y `WORK` hacen observables las dos ramas de error ya previstas;
`MUST` no entra porque la certeza está decidida y este paso aísla la forma.

La corrección y el feedback son deterministas y preautorizados en el JSON. La
oportunidad es `modal_form / supported / same_case / immediate`; toda respuesta
es `assisted: true` porque las piezas fueron suministradas. El primer intento,
no el último reintento, gobierna la proyección de evidencia.

El nodo reutiliza `envio_respuesta`, la cola local y la columna JSON `result`
de `eventos_de_aprendizaje`. No se añade tabla, columna, verbo, RPC, endpoint ni
llamada al clasificador. La fila conserva oración, rama, acierto, intento,
latencia, orden mostrado y oportunidad de aprendizaje.

## Consecuencias

- `supported_only` ahora significa que el alumno construyó correctamente la
  secuencia a partir de piezas suministradas en el primer intento; no significa
  producción independiente ni “casi dominio”.
- La versión de lección sube a 1.18.0 y `content_version` se particiona como
  `2026-08-11-forma-guiada`. El fundador confirmó cero participantes, así que
  no se divide una cohorte iniciada.
- `audio_asset_version` sube al mismo valor aunque no cambie ningún MP3, porque
  en este runtime la igualdad de ambos campos habilita toda la voz.
- El nodo no tiene audio y no depende de arrastre: toque y teclado completan el
  mismo recorrido con objetivos táctiles de al menos 44 px.

La especificación completa y sus criterios de aceptación viven en
`docs/architecture/guided-modal-form-2026-08-11.md`.

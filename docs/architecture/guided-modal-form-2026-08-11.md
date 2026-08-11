# Propuesta de arquitectura · Construcción guiada de la forma modal

- **Fecha:** 2026-08-11
- **Estado:** aprobada, implementada y verificada; el fundador confirmó cero participantes reales
- **Superficie activa:** `/crear`, lección `CREAR-ENGLISH-DEDUCTION-V1`
- **Condición previa:** cero participantes reales iniciados en la versión actual
- **No toca:** esquema de Supabase, verbos de telemetría, clasificador, audio grabado ni zonas legacy

## Problema

La lección enseña y practica `certainty_calibration`, pero `modal_form` solo se
observa en producción independiente: baseline, transferencia y retest. No existe
una oportunidad `supported`, por lo que el estado `supported_only` es
inalcanzable para este constructo. Además, las tres producciones pueden confundir
recuperación de vocabulario con construcción de `modal + have + participio`.

## Decisión pedagógica

1. Los tres momentos de producción muestran una sugerencia opcional de verbo
   base, con el mismo tratamiento visual y fuera del placeholder:
   - Camila: `erase` → `erased`;
   - Nora: `work` → `worked`;
   - Emi: `paint` → `painted`.
2. En el baseline la sugerencia aparece únicamente después de responder el
   gate, junto a *“Inténtalo como puedas”*. El gate conserva su medida de
   autoeficacia sin mostrar una pieza de la respuesta; el intento sí recibe el
   mismo apoyo léxico que Nora y Emi.
3. Se añade un nodo separado entre `guided-map` y `transfer-bridge`. Presenta:

   `Mateo ___ ___ ___ on the poster.`

   con las piezas `MIGHT`, `HAVE`, `HAS`, `WORK` y `WORKED`. `HAS` y `WORK`
   representan los dos errores de forma ya autorizados por la rúbrica. No se
   incluye `MUST`: la certeza ya fue resuelta y este nodo mide únicamente la
   construcción de la forma.
4. La oportunidad se declara como `modal_form`, `supported`, `same_case`,
   `immediate`, `presence_unobserved`. Las piezas suministradas hacen que toda
   respuesta sea `assisted: true`, incluso en el primer intento.
5. La corrección es determinista. El nodo nunca llama al LLM ni genera feedback:
   todas las ramas y devoluciones viven preautorizadas en el JSON.

## Interacción y sistema visual

- Componente cliente aislado para ensamblar la oración; no se amplía el mapa de
  certeza con una segunda responsabilidad.
- Tocar una pieza la coloca en el primer hueco libre; tocar una pieza colocada
  la devuelve al banco. El teclado ofrece el mismo recorrido. Arrastrar no es
  requisito para completar la actividad.
- Los huecos y el banco reservan su tamaño para evitar saltos. Las piezas
  mantienen fuente y ancho al viajar, igual que el mapa actual.
- Objetivos táctiles de al menos 44×44 px y separación mínima de 8 px.
- Una sola acción primaria, `Comprobar`, en la zona inferior. El error aparece
  junto a la oración, se anuncia con `role="status"` y ofrece un siguiente paso
  concreto sin castigo.
- Movimiento de 150–240 ms solo para explicar entrada/salida de piezas y cero
  desplazamiento cuando el usuario prefiere movimiento reducido.
- CSS Modules únicamente. Título, prompt, ayuda, controles y feedback usan los
  tokens existentes de `docs/design-system/typography.md`; no se crean tamaños
  locales ni una excepción tipográfica nueva.
- Se verifica a 320×812, 375×812 y con texto ampliado, sin scroll horizontal y
  con la acción primaria alcanzable.

## Contratos tipados

1. Añadir a `CrearStepMeta` un contrato `formAssembly` con:
   - fragmentos fijos de la oración;
   - número de huecos;
   - piezas con `id` y texto visible;
   - secuencia correcta por id;
   - ramas preautorizadas para `have/has`, `work/worked`, orden y acierto;
   - etiquetas de acción e instrucción.
2. Añadir un contrato de sugerencia verbal que autorice base y participio. La
   validación exige que el participio declarado pertenezca a
   `productionTarget.participles` y que solo aparezca en pasos de
   `modal_form`.
3. La validación de `formAssembly` exige ids únicos, exactamente tres huecos,
   secuencia resoluble, feedback no vacío, `input` compatible y una oportunidad
   `supported/modal_form`.

## Estado y telemetría

No se crea tabla, columna, RPC ni endpoint. Cada comprobación reutiliza:

`trackEvent('envio_respuesta', { tallerId, pasoId, result })`.

El `result` conserva:

- `fase: 'practica'`;
- `correcto`, `rama`, `score`, `attempt/intento` y `latencyMs`;
- `texto`, con la oración ensamblada completa;
- `assisted: true`;
- `shownOrder`, para reconstruir el banco mostrado;
- `learningOpportunity`, con la condición `supported` de `modal_form`.

`persistAttempt` guarda primer y último resultado, y
`buildCrearLearningObservations` añade la fila al ledger local. El agregador
existente sigue usando el primer intento: acertar después de feedback ayuda a
aprender, pero no reescribe retroactivamente la primera evidencia.

Supabase recibe una fila ordinaria más en la tabla de eventos por cada intento,
mediante la cola local ya existente. El resumen `constructStates` de
`taller_completado` podrá derivar `supported_only` sin una segunda inserción ni
un campo nuevo.

## Versionado y audio

- El nodo cambia el instrumento y la progresión local: `version` sube de forma
  menor y `content_version` recibe una partición nueva.
- `audio_asset_version` sube al mismo valor aunque ningún MP3 cambie. En este
  runtime ambos campos son un candado de sincronía; si divergen, toda la voz se
  apaga.
- El nodo nuevo no lleva narración, igual que el mapa guiado actual.
  `transfer-bridge` y su audio permanecen intactos.
- El fundador confirmó cero participantes reales; por eso se implementa antes
  de congelar 1.18.0. Desde el primer inicio real no se vuelve a particionar la
  cohorte.

## Documentación y pruebas requeridas

- ADR de implementación y actualización de `docs/CURRENT_STATE.md`.
- Diccionario de métricas: `supported_only` debe leerse como “construyó la
  secuencia correcta a partir de piezas suministradas en el primer intento”, no
  como producción independiente.
- Validación positiva y fallos cerrados del nuevo JSON.
- E2E del camino correcto, `HAVE/HAS`, `WORK/WORKED`, reintento, recarga,
  teclado, foco y movimiento reducido.
- Aserciones de telemetría y ledger, incluida la proyección
  `baseline no demostrado + construcción correcta + transferencia incorrecta
  → supported_only`.
- Regresión de que una transferencia correcta sigue ganando
  `independent_only` y D7 correcto sigue ganando `durable`.
- Regresión de igualdad `audio_asset_version === content_version` y ausencia de
  llamadas al clasificador en este nodo.
- `typecheck`, ESLint, lint de talleres, E2E móvil enfocado y build.

## Criterios de aceptación

1. Un alumno puede completar el nodo con toque o teclado a 320 px sin depender
   de arrastrar ni de audio.
2. El primer intento genera exactamente una observación evidenciaria
   `supported/modal_form` y un `envio_respuesta` durable; cada reintento queda
   trazable sin reemplazar el primero.
3. No cambia el esquema de Supabase ni se añade generación de contenido.
4. Los tres momentos independientes muestran el verbo base, nunca el
   participio, con tratamiento idéntico.
5. El nuevo estado mejora la resolución de la evidencia sin degradar
   `independent_only` ni `durable`.
6. La voz existente permanece activa en todos los pasos narrados.

## Verificación de implementación

- `npm run typecheck` — pasa.
- `npm run lint` — cero errores; siete warnings legacy fuera de `/crear`.
- `npm run lint:workshops` — pasa; seis warnings legacy.
- `npm run build` — pasa con los warnings de dependencia/legacy documentados.
- `npx playwright test --project=mobile-chrome` — 80/80.
- El nodo pasa toque, teclado, tres intentos, recarga, movimiento reducido,
  320×812, 375×812, 812×375 y texto raíz al 200% sin overflow horizontal.

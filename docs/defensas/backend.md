# Defensas orales: backend, operación y datos

Este documento explica cómo funciona el servidor de las defensas orales del piloto, cómo
ponerlo en marcha y qué datos guarda. La interfaz (alumno en `/defensa/<código>`, profesor en
`/revision/<enlace>`) está descrita en [`ui-prototipo.md`](./ui-prototipo.md). Las decisiones de
producto que esto toca están en el borrador del
[ADR 0014](../adr/0014-defensas-orales-superficie-de-profesor-y-reporte-posterior.md), que
**todavía no está aprobado**.

Estado: construido el 13 de octubre de 2026 en la rama `feat/defensas-backend`, partiendo de
`feat/defensas-ui`. No se tocaron `main`, `/crear` ni `AGENTS.md`.

## Qué hace

1. El profesor da de alta una actividad (consigna, rúbrica opcional, hasta tres objetivos,
   fecha límite) con un script. Recibe dos enlaces: uno **del grupo** (`/defensa/<código>`) y
   otro **suyo** (`/revision/<enlace firmado>`).
2. El alumno entra con nombre y matrícula, acepta tres confirmaciones y sube su trabajo
   (PDF, Word o texto pegado). Desde ese momento el trabajo **cuenta como entregado**.
3. El servidor extrae el texto, guarda el original en un bucket privado y arma el **plan de
   preguntas** con el modelo de lenguaje. La voz de cada pregunta se genera en ese momento y se
   guarda (no se sintetiza nada durante la defensa).
4. El alumno defiende hablando (o escribiendo, siempre se puede). Cada respuesta se clasifica
   (sólida, vaga, fuera de tema, sin respuesta) y un motor determinista decide la siguiente
   pregunta. Si una parte del audio no se entendió, el alumno la aclara puntualmente.
5. El alumno revisa su transcripción, marca lo que no dijo así y entrega.
6. El modelo propone un **reporte** para el profesor; el código comprueba que cada cita
   aparezca tal cual en la transcripción antes de mostrarla.
7. El profesor ve el reporte, oye solo las partes marcadas o aclaradas y descarga los
   trabajos.

## Reglas que el código hace cumplir

- **El plan y los prompts nunca llegan al navegador.** `src/lib/defensa/` importa
  `server-only`; el contrato con el navegador (`src/components/defensa/contrato.ts`) solo trae
  la pregunta en curso, la aclaración y la revisión de lo que el propio alumno dijo.
- **Nada de notas, porcentajes ni sospechas en la interfaz.** El reporte usa niveles escritos
  ("lo explicó", "en parte", "no salió", "sin dato") y un filtro de código descarta textos del
  modelo con notas, porcentajes o lenguaje de sospecha.
- **Una cita que no aparece en la transcripción no se muestra.** Cada cita se localiza
  normalizando mayúsculas, acentos y puntuación y se devuelve la subcadena exacta (entre 3 y 60
  palabras, del turno del mismo objetivo). Un nivel sin cita verificada baja a "sin dato".
- **Ningún dato se usa para entrenar.** Se pide a cada proveedor la opción de no retención
  cuando existe (OpenAI `store: false`, Deepgram `mip_opt_out`, ElevenLabs sin registro si el
  plan lo permite). Las llaves están solo en variables de entorno. Eso no sustituye revisar el
  contrato y la configuración de cada cuenta de proveedor (por ejemplo, su política de
  retención de datos).
- **La base está cerrada al navegador.** Todas las tablas `defensa_*` tienen RLS activada sin
  políticas y `anon`/`authenticated` sin permisos; solo el servidor, con la llave de servicio,
  lee y escribe. Los buckets son privados y todo acceso va con enlaces firmados que caducan.
- **Una falla técnica no le cuesta la entrega al alumno.** El trabajo ya está entregado; la
  defensa se retoma en el mismo turno, también desde otro teléfono.

## Cómo ponerlo en marcha

### 1. Base de datos

Pega en el editor SQL de Supabase el archivo completo
[`supabase/migrations/20261013_defensa_oral_piloto.sql`](../../supabase/migrations/20261013_defensa_oral_piloto.sql).
Es idempotente (se puede pegar dos veces). Crea las doce tablas `defensa_*`, la función atómica
`defensa_reservar_envio`, la RLS cerrada y los buckets privados `defensa-trabajos` y
`defensa-audio`. **No se ejecutó desde aquí.**

Pendiente aparte, que ya existía: `20260810_secure_learning_event_readers.sql`. Los eventos de
las defensas se escriben en `eventos_de_aprendizaje`, así que conviene que esa migración esté
aplicada.

### 2. Variables de entorno

Los nombres están en [`.env.example`](../../.env.example). Resumen:

| Variable | Para qué | Notas |
| --- | --- | --- |
| `DEFENSA_SIGNING_SECRET` | Firma las sesiones del alumno y los enlaces del profesor | 32+ caracteres aleatorios. Cambiarla cierra todo. |
| `CRON_SECRET` | Autoriza la limpieza diaria | 16+ caracteres. Vercel la manda como `Authorization: Bearer`. |
| `DEFENSA_PUBLICA` | Muestra `/defensa`, `/revision` y `/api/defensa` en producción | Déjala sin definir (o en 0) hasta que el ADR esté aprobado. |
| `DEFENSA_ALMACEN` | `supabase` (por defecto) o `memoria` | `memoria` solo existe fuera de producción. |
| `DEFENSA_LLM_PROVIDER`, `DEFENSA_LLM_MODEL`, `DEFENSA_LLM_MODEL_CLASIFICADOR` | Modelo de lenguaje (`openai`, `anthropic` o `mock`) | Sin modelo por defecto a propósito: elige uno vigente. |
| `DEFENSA_OPENAI_API_KEY` / `DEFENSA_ANTHROPIC_API_KEY` | Llave del modelo elegido | Solo servidor. |
| `DEFENSA_STT_PROVIDER`, `DEFENSA_STT_MODEL`, `DEFENSA_STT_IDIOMA` | Transcripción (`deepgram`, `assemblyai` o `mock`) | Debe dar confianza y momento por palabra. |
| `DEFENSA_DEEPGRAM_API_KEY` / `DEFENSA_ASSEMBLYAI_API_KEY` | Llave del transcriptor elegido | |
| `DEFENSA_UMBRAL_CONFIANZA` | Debajo de esta confianza una palabra puede pedir aclaración | 0,55 por defecto; el valor final sale de la etapa 1 del piloto. |
| `DEFENSA_TTS_PROVIDER`, `DEFENSA_ELEVENLABS_API_KEY`, `DEFENSA_ELEVENLABS_VOICE_ID`, `DEFENSA_ELEVENLABS_MODEL`, `DEFENSA_ELEVENLABS_SIN_REGISTRO` | Voz de Celestea | |
| `NEXT_PUBLIC_SITE_URL` | Para que los enlaces salgan completos | Sin diagonal final. |
| Las de Supabase de siempre | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | La subida directa del archivo usa la llave anónima solo para llegar al bucket con un enlace firmado. |

Con `DEFENSA_LLM_PROVIDER`, `DEFENSA_STT_PROVIDER` y `DEFENSA_TTS_PROVIDER` en `mock` todo el
flujo funciona sin llaves ni red (respuestas falsas): sirve para desarrollar y para las pruebas.

### 3. Dar de alta una actividad

Con `.env.local` lleno:

```bash
pnpm defensa:actividad crear docs/defensas/actividad-ejemplo.json --simular
pnpm defensa:actividad crear docs/defensas/actividad-ejemplo.json
```

`--simular` valida el archivo sin escribir nada. Al crear, imprime el enlace del grupo y el del
profesor. Otros comandos: `enlace` (otro enlace del profesor), `rotar` (invalida **todos** los
enlaces del profesor y da uno nuevo), `desactivar` y `activar` (el enlace del grupo deja de
dejar entrar y entregar; quien ya defendía puede terminar) y `estado` (envíos usados, límite).

El enlace del profesor es una llave: vale 180 días, no se reparte al grupo y se invalida
cambiando la versión de acceso (`rotar`). El enlace del grupo tiene un límite de envíos
(`limiteEnvios`, 120 por defecto) que se reserva de forma atómica en la base.

### 4. Desarrollo local sin Supabase

```bash
DEFENSA_ALMACEN=memoria DEFENSA_SIGNING_SECRET=<32+ caracteres> CRON_SECRET=<16+ caracteres> \
DEFENSA_LLM_PROVIDER=mock DEFENSA_STT_PROVIDER=mock DEFENSA_TTS_PROVIDER=mock pnpm dev
```

Arranca con una actividad de demostración ya creada y al iniciar imprime en la consola los dos
enlaces: el del alumno es `/defensa/demo-celestea` y el del profesor trae su firma. Además, solo
fuera de producción, `/revision/demo` abre el escenario de ejemplo del diseño (datos falsos).

## Partes del servidor

```
supabase/migrations/20261013_defensa_oral_piloto.sql    tablas, RLS cerrada, buckets
src/lib/defensa/
  config.ts                 límites y lectura de variables de entorno
  firmas.ts                 tokens HMAC del alumno y del profesor (portador, sin cookies)
  questionPlan.ts           plan de preguntas (traído de celestea-maestro, con los 7 arreglos)
  turnEngine.ts             función pura: qué pregunta sigue (pruebas por tabla)
  clasificadorTurno.ts      sólida, vaga, fuera de tema o sin respuesta
  transcripcion.ts          huecos de baja confianza, relleno y líneas con tiempo
  reporte.ts                reporte del modelo + verificación de cada cita
  extraerTexto.ts           PDF (unpdf) y Word (fflate) con tope de tamaño y de tiempo
  providers/                interfaces y adaptadores: LLM, transcripción, voz, y un mock
  almacen/                  repositorio y archivos: Supabase y memoria (solo no producción)
  servicios/                acceso, entregas, planes, defensas, reportes, profesor, mantenimiento
  eventos.ts                eventos de aprendizaje (solo ids y medidas, nunca texto)
src/app/api/defensa/        rutas: sesion, estado, entrega, plan, defensas, turnos, revision,
                            descargas, enlace, mantenimiento
```

### API

Todas las rutas son `runtime = 'nodejs'`, `force-dynamic`, devuelven `Cache-Control: no-store` y
errores `{ error, mensaje }` con un código estable. El portador va en
`Authorization: Bearer`; un token de alumno no abre rutas del profesor y al revés.

| Ruta | Quién | Qué hace |
| --- | --- | --- |
| `POST /sesion` | Alumno (público, con límite) | Entra con código del grupo, nombre, matrícula y las tres confirmaciones. |
| `GET /estado` | Alumno | Dónde va: entrega, plan, defensa y ensayo. Sirve para reanudar. |
| `POST /entrega`, `PUT /entrega/:id/archivo`, `POST /entrega/:id/confirmar` | Alumno | Texto pegado, o archivo: URL firmada de subida directa al bucket (con respaldo por la API hasta 4 MB) y confirmación. |
| `POST /plan` | Alumno | Vuelve a pedir el plan si falló. |
| `POST /defensas`, `GET /defensas/:id`, `POST /defensas/:id/{entregar,estres,salir}` | Alumno | Empieza o retoma la defensa o el ensayo, la entrega y lo que no es de aprendizaje (estrés, salida). |
| `PUT /turnos/:id/audio`, `POST /turnos/:id/{responder,aclarar,marca}` | Alumno | Partes de audio, respuesta, aclaración puntual y marcas (repetir pregunta, silencio). |
| `POST /revision/{toque,tiempo,audio}` | Profesor | Los dos toques por reporte, el tiempo activo y el enlace firmado para oír una parte. |
| `POST /descargas` | Profesor | Enlace que caduca para un trabajo o el zip del grupo. |
| `POST /enlace` | Profesor | Desactiva o reactiva el enlace del grupo. |
| `GET /mantenimiento` | Cron de Vercel | Limpieza diaria (con `CRON_SECRET`). |
| `GET /archivo-dev` | Solo modo memoria | Sirve los archivos en memoria con soporte de `Range`. |

### Eventos

Los eventos van a `eventos_de_aprendizaje` **sin cambiar el esquema** y con verbos que ya
existían (`inicio_taller`, `envio_respuesta`, `completo_paso`, `taller_completado` y
`abandono_taller`), con el detalle dentro de `result` y **sin texto del alumno**. El `taller_id`
es `defensa:<id de la actividad>`; ese prefijo está reservado: la ingesta pública
(`/api/events/ingest`) lo rechaza para que nadie pueda escribir eventos de defensas desde el
navegador. El `client_event_id` es determinista, así que reintentar no duplica.

## Qué se conserva y por cuánto tiempo

| Dato | Dónde | Cuánto |
| --- | --- | --- |
| Audio de las respuestas (partes y ensamblado) | Bucket `defensa-audio` | **7 días** después de terminada la defensa; las partes sueltas se borran en cuanto la transcripción sale bien. Lo hace el cron diario. |
| Trabajo original y texto extraído | Bucket `defensa-trabajos` y `defensa_entregas` | Hasta el cierre de la cohorte + 90 días **(borrado todavía no implementado; ver "Qué falta")**. |
| Transcripciones, reportes, toques del profesor, tiempo de revisión | Tablas `defensa_*` | Igual que arriba. |
| Zip de "descargar todos" | Bucket `defensa-trabajos` | 1 día. |
| Sesión del alumno / acceso del profesor | Token firmado | 48 horas / 180 días. |
| Enlaces firmados de descarga, audio y subida | — | 10 min / 30 min / 2 h. |

El cron diario (`/api/defensa/mantenimiento`, 9:17 UTC) también cierra por inactividad (24 h)
las defensas abandonadas a medias, descarta las entregas que nunca llegaron al bucket
(3 h) y genera los reportes de las incompletas.

## Qué sigue simulado en la interfaz

- **Nueva actividad con Celestea** (`/revision/<enlace>/nueva`): con datos reales no existe
  (responde "no encontrado") y la entrada no aparece en el menú; las actividades se dan de alta
  con el script.
- Compartir a Moodle, "Editar a mano" y "Pedir cambios por mensaje" del borrador.
- El dictado del profesor en la barra de Celestea se oculta con datos reales.
- Las respuestas de Celestea en la pantalla del profesor salen de reglas de palabras sobre el
  mismo grupo o reporte, sin modelo de lenguaje.

## Pruebas

```bash
pnpm typecheck && pnpm lint
pnpm test:unit                    # 282 pruebas, sin servidor ni red
PLAYWRIGHT_CHANNEL=msedge pnpm exec playwright test tests/e2e/defensa-api.spec.ts \
  tests/e2e/defensa-alumno.spec.ts tests/e2e/defensa-profesor.spec.ts
```

Las pruebas del navegador arrancan su propio servidor con almacén en memoria y proveedores
`mock` (ver `playwright.config.ts`). La del alumno con voz usa el micrófono falso de Chrome o
Edge (`--use-fake-device-for-media-stream`); `PLAYWRIGHT_CHANNEL=msedge` sirve si no hay Chrome.

## Qué falta

- Probar con **llaves reales** el modelo, la transcripción y la voz, y la subida firmada directa
  a Supabase. Todo lo verificado aquí fue con proveedores `mock` y almacén en memoria; la
  migración se validó en una base PGlite, no en Supabase.
- Comparar dos transcriptores (Deepgram y AssemblyAI) con audio real de estudiantes mexicanos y
  fijar `DEFENSA_UMBRAL_CONFIANZA`.
- Borrar a los 90 días del cierre de la cohorte (decisión de retención pendiente) y definir qué
  significa "cerrar la cohorte" (hoy existe la columna `cohorte_cerrada_en`, sin pantalla ni job).
- Pantalla del profesor para crear actividades (hoy es el script) y lista de grupo/roster.
- Perfil de región y accesibilidad del alumno: la tabla existe, no hay interfaz.
- Las partes de audio de una grabación en curso viven en memoria del navegador: si se recarga la
  página a media respuesta se vuelve a grabar esa pregunta (el resto se conserva).
- Rate limit: los topes por IP y por actividad son **en memoria por instancia**; en Vercel
  frenan ráfagas por instancia, no el total. Para un tope duro hace falta un almacén compartido.
- Diseño del resumen de práctica del ensayo y de las citas del reporte: hoy el resumen es una
  lista de texto con un símbolo y las citas se verifican en código pero el reporte las muestra
  dentro de la transcripción, sin una pieza visual propia.
- Revisión de un abogado: aviso de privacidad (`AVISO_PRIVACIDAD_VERSION`), transferencia
  internacional a los proveedores y menores de edad.
- Aprobar o ajustar el [ADR 0014](../adr/0014-defensas-orales-superficie-de-profesor-y-reporte-posterior.md).

# Defensas orales: prototipo de interfaz con datos de ejemplo

Este documento describe la interfaz de las defensas orales de Celestea, construida a partir de los diseños aprobados (tableros "v2" del alumno y "prof2" del profesor). Es solo interfaz: todo lo que se ve sale de datos de ejemplo y no existe servidor, base de datos, modelo de lenguaje, micrófono ni telemetría detrás.

Estado verificado el 12 de octubre de 2026 sobre una copia limpia del repositorio en el commit `8f386cd`, solo con estos archivos nuevos añadidos.

> **Actualización del 13 de octubre de 2026.** La interfaz ya está conectada a un servidor real
> en la rama `feat/defensas-backend` (base de datos, modelo de lenguaje, transcripción, voz,
> audio por partes, descargas y reporte). Cómo funciona, cómo ponerlo en marcha y qué falta está en
> [`backend.md`](./backend.md). Este documento sigue describiendo el diseño y las decisiones de
> interfaz; las secciones que dejaron de ser ciertas se actualizaron y lo que sigue simulado se
> dice abajo. Cambios que importan al abrir las direcciones:
>
> - Alumno: `/defensa/demo` **ya no existe**. El código del grupo sale de la base de datos; con
>   el almacén en memoria (`DEFENSA_ALMACEN=memoria`) la actividad de demostración es
>   `/defensa/demo-celestea`. Las direcciones con `?paso=`, `?ensayo=` y `?modo=` siguen,
>   pero un paso solo se muestra si ya existe lo que necesita (no hay "pregunta" sin una
>   pregunta); si no, se vuelve al paso que corresponde. `?modo=` solo es el punto de partida: si el
>   teléfono ya tiene una sesión guardada, manda lo que la persona eligió (ver "Hablar o escribir").
> - Profesor: el código de la dirección es el **enlace firmado** que da el script
>   (`pnpm defensa:actividad crear`) o, en memoria, el que se imprime en la consola. Los códigos
>   `demo` y `3b-encuesta` siguen abriendo el escenario de ejemplo **solo fuera de producción**.
> - `/revision/<enlace>/nueva` es solo el diseño: con datos reales responde "no encontrado".

## Qué incluye

| Lado | Ruta | Qué muestra |
| --- | --- | --- |
| Alumno | `/defensa/<token>` | Los 15 pasos de la defensa, de "Empezar" a "Listo", pensados para celular. |
| Profesor | `/revision/<token>` | Inicio con la barra de Celestea y cinco respuestas hechas con componentes. |
| Profesor | `/revision/<token>/alumno/<matrícula>` | "Antes de ver su reporte" y, después, el reporte de un alumno. |
| Profesor | `/revision/<token>/nueva` | Crear una actividad conversando, borrador listo y enlace listo para compartir. |

`/crear` y todo lo que ya existía quedan intactos: este trabajo solo agrega archivos nuevos.

## Cómo abrirlo

```bash
pnpm install
# Las rutas nuevas no leen ninguna variable de entorno; para verlas sin tus claves bastan valores falsos.
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy pnpm dev
```

Con el servidor en `http://localhost:3000` (cambia el puerto si usas otro):

| Qué quieres ver | Dirección |
| --- | --- |
| Alumno, desde el principio | `/defensa/demo` |
| Alumno, un paso directo | `/defensa/demo?paso=pregunta` (también acepta un número del 1 al 15) |
| Alumno, ensayo privado | `/defensa/demo?paso=hola&ensayo=1` |
| Alumno, respondiendo por escrito | `/defensa/demo?paso=pregunta&modo=escrito` |
| Profesor, inicio | `/revision/demo` |
| Profesor, avance del grupo | `/revision/demo?escena=avance` |
| Profesor, Ana Torres | `/revision/demo?escena=ana` |
| Profesor, descarga de trabajos | `/revision/demo?escena=descarga` |
| Profesor, lista por estado | `/revision/demo?escena=lista` |
| Profesor, lo que le costó al grupo | `/revision/demo?escena=objetivos` |
| Profesor, antes de ver el reporte | `/revision/demo/alumno/20231457` |
| Profesor, reporte de Ana | `/revision/demo/alumno/20231457?vista=reporte` |
| Profesor, nueva actividad | `/revision/demo/nueva` (con `?paso=0` a `?paso=6`) |
| Profesor, borrador listo | `/revision/demo/nueva?paso=listo` |
| Profesor, enlace listo | `/revision/demo/nueva?paso=enlace` |

Los pasos del alumno son: `inicio`, `quien`, `permisos`, `voz`, `trabajo`, `archivo`, `entregado`, `hola`, `respira`, `pregunta`, `silencio`, `aclaracion`, `revisar`, `estres` y `listo`.

Los tokens que existen son `demo` y `3b-encuesta`; los dos abren el mismo grupo de ejemplo. Cualquier otro responde "no encontrado", como lo haría un enlace desactivado. En el reporte, solo Ana Torres (matrícula `20231457`) trae transcripción y audio de ejemplo; los demás alumnos con defensa muestran su evidencia y las preguntas, con un aviso de que la transcripción no está en la demostración.

En la pantalla del profesor puedes escribir en la barra de Celestea. Entiende frases como "¿cuántos defendieron?", "muéstrame a Ana Torres", "descarga todos los trabajos", "muéstrame a todos", "¿qué objetivo le costó más?" y "crear una nueva actividad".

## Mapa de componentes

```
src/app/
  defensa/
    layout.tsx                      fuentes locales y tema Celeste
    not-found.tsx
    [token]/page.tsx                lee ?paso, ?ensayo y ?modo; llama a obtenerActividadPorToken
  revision/
    layout.tsx                      fuentes locales y tema Celeste
    not-found.tsx
    [token]/page.tsx                inicio y escenas (?escena=)
    [token]/alumno/[alumnoId]/page.tsx   pregunta previa y reporte (?vista=reporte)
    [token]/nueva/page.tsx          nueva actividad (?paso=)

src/components/
  celeste/       Piezas compartidas
    tokens.module.css               paleta y espacios (--c-*); el tema se activa con la clase .tema
    fuentes.ts, fonts/              Bricolage Grotesque y DM Mono con next/font/local (licencias OFL incluidas)
    Boton, Chip, Personaje, LogoCelestea, AvatarCelestea, Avatar, IconoNivel,
    Interruptor, BarrasDeVoz, Dialogo
    animaciones.module.css, variablesCss.ts, tintes.ts, types.ts
  defensa/       Lado del alumno
    FlujoAlumno.tsx                 orquesta los 15 pasos, el historial (?paso=) y el movimiento reducido
    pasos.ts, urlFlujo.ts           orden de pasos, "siguiente" y "volver", dirección con parámetros
    Pantalla*.tsx                   una por paso (la de silencio es un estado de Pregunta)
    MarcoAlumno, CabeceraAlumno, CabezaConBurbuja, DialogoPrivacidad, DialogoPegarTexto, EnlaceNoEncontrado
    types.ts, mock.ts, consultas.ts
  revision/      Lado del profesor
    MarcoProfesor, BarraLateral, Pildora          marco de página en cuatro formas
    InicioAgentico                  estado del inicio: escena, fijados, barra, aviso
    BarraDeCelestea, LineaDeCelestea, TarjetaDeCelestea, BotonFijar, FijadosEnInicio
    TarjetaAvance, TarjetaAlumno, TarjetaDescarga, TarjetaObjetivos, TarjetaGrupo, BarraSegmentada
    AntesDeVerReporte, ReporteDelAlumno, BloqueDeObjetivo, ParteParaOir, RespuestaEnReporte, CierreDelReporte
    NuevaActividad, HiloDeNueva, BorradorDeActividad, EnlaceListo
    ActividadNoEncontrada
    types.ts, mock.ts, consultas.ts, derivados.ts, fechas.ts, frases.ts, intenciones.ts, nueva.ts, portapapeles.ts
```

Todo el estilo está en CSS Modules; no hay Tailwind ni estilos en línea salvo variables CSS calculadas.

## De dónde salen los datos

| Qué | Archivo | Con datos reales |
| --- | --- | --- |
| Actividad que ve el alumno | `defensa/consultas.ts` | Lee la actividad por el código del grupo (`src/lib/defensa/almacen`). `defensa/mock.ts` ya no alimenta al alumno. |
| Entrega, plan, defensa y transcripción del alumno | `defensa/clienteApi.ts` y `defensa/useFlujoDefensa.ts` | Van por `/api/defensa` con la sesión firmada del alumno; nada de eso viaja en la página. |
| Grupo, alumnos y reporte del profesor | `revision/consultas.ts` | Verifica el enlace firmado y lee de la base de datos (`src/lib/defensa/servicios/profesor.ts`). `revision/mock.ts` solo se usa para el escenario de ejemplo fuera de producción. |
| Descarga, audio de una parte, toques y tiempo de revisión | `revision/clienteProfesor.ts` | Van por `/api/defensa` con el enlace del profesor como portador. |
| Conteos y estados | `revision/derivados.ts` | No cambia: todo se calcula desde la lista de alumnos. |
| A qué respuesta lleva lo que escribe el profesor | `revision/intenciones.ts` | Sigue siendo reglas de palabras, sin modelo de lenguaje. |
| Guion de "Nueva actividad" | `revision/nueva.ts` | Sigue siendo el diseño con un guion fijo; con datos reales la pantalla no se ofrece. |

Lo que ya es real: la entrega del trabajo, el plan de preguntas, la defensa por voz o por
escrito, la aclaración puntual, la transcripción, el reporte con citas verificadas, el audio
original de la frase marcada o aclarada, la descarga de trabajos, los dos toques del profesor y
el tiempo de revisión. También: copiar al portapapeles, el enlace de WhatsApp (`wa.me`, solo si
el profesor lo toca) y tres datos guardados en el navegador con `localStorage`:

- `celestea-defensa-sesion-<código>`: la sesión firmada del alumno y su modo (voz o escrito), para
  retomar sin volver a poner nombre y matrícula. El modo guardado es solo lo que la persona eligió; una
  falla del micrófono no lo cambia (ver "Hablar o escribir").
- `celestea-revision-fijados-<enlace>`: las respuestas que el profesor fija ("Fijado por ti").
- `celestea-revision-cierre-<enlace>-<matrícula>`: su respuesta a "¿El reporte coincide con lo que
  piensas?" (además se guarda en el servidor).

Lo que sigue simulado: compartir en Moodle, "Editar a mano" y pedir cambios por mensaje en la
nueva actividad, el dictado del profesor (se oculta con datos reales) y, en el escenario de
ejemplo, el audio, las descargas y los toques.

## Hablar o escribir: lo que se eligió y lo que falla

En `useFlujoDefensa` son dos cosas distintas, y mezclarlas era lo que hacía que quien elegía "Hablar" acabara
escribiendo sin saber por qué:

- **Modo elegido** (`modoElegido`): lo que la persona pidió. Solo lo cambia un toque suyo: el paso
  "¿Hablas o escribes?", "Prefiero escribir" o "Prefiero hablar" (y "Prefiero escribir" en la prueba de
  micrófono cuando se oía bien). Es lo único que se guarda, en el teléfono (`modo` de la sesión) y en la
  dirección (`?modo=escrito`). Una `?modo=` que llega en un enlace solo es el punto de partida: con una sesión
  guardada manda lo guardado y la dirección se corrige. "Atrás" y "adelante" del navegador no leen el modo de
  la dirección: una entrada vieja traería el de antes y pisaría lo elegido después.
- **Falla de voz** (`fallaDeVoz`): quería hablar y ahora no se puede. Cuenta como falla que el micrófono no
  abra (permiso bloqueado, sin micrófono, en uso), que la dirección no sea segura (una IP por http: el
  navegador ni ofrece el micrófono), que el micrófono se pierda a media respuesta o que no se pueda pasar la
  voz a texto. Mientras dura se responde escribiendo y Celestea sigue diciendo las preguntas. Solo vive en
  memoria y no toca lo elegido: recargar, arreglar el permiso o volver a elegir devuelve a la voz.

El micrófono se pide en "Di «hola»" (paso 8), justo cuando se va a usar, y no en la pantalla de antes: la
ventana de permiso del navegador sale sobre "Di «hola»" y, si se permite, empieza la prueba de cinco segundos.
Si no se puede (lo niega, no hay micrófono o la dirección no es segura) no hay nada que probar: "Di «hola»"
dice "No pude usar el micrófono. Seguimos por escrito." un par de segundos y sigue solo al ejercicio por
escrito, sin pedir nada más; la pregunta explica el motivo y deja volver a probar. Quien llega a "Di «hola»"
con "atrás" no se manda otra vez hacia adelante, y quien elige escribir mientras el navegador pregunta no
deja el micrófono abierto sin usarse si el permiso llega tarde.

En la pantalla de la pregunta, la falla se ve como un aviso con el motivo (las frases de `mensajeDeMicrofono`)
y "Probar el micrófono otra vez", que abre el micrófono y, si funciona, vuelve a la voz; si no abre, el aviso
dice "Sigue sin abrir". Quien eligió escribir no ve aviso: ahí no hay falla. Con voz nunca se dibuja el cuadro
de texto. "Prefiero escribir" y "Prefiero hablar" son botones discretos (sin borde ni relleno, sin pulso) de
52 px de alto: una salida, no la tarea de la pantalla.

Para probar en un teléfono hace falta https (un túnel de ngrok o Cloudflare, o un Preview de Vercel) o
localhost. Con `http://192.168.x.x` el navegador no ofrece el micrófono: la pregunta lo explica y se escribe,
sin tocar lo que se eligió. Las pruebas de navegador de este comportamiento están en
`tests/e2e/defensa-alumno.spec.ts` (grupo "el modo que se elige se respeta").

## Desviaciones de AGENTS.md y por qué

No se editó `AGENTS.md`, `CURRENT_STATE.md` ni el contrato tipográfico. Estas son las diferencias que hay entre lo construido y lo que dicen:

| Regla | Qué pasa aquí | Por qué |
| --- | --- | --- |
| Sección 0: no somos un tablero para profesores | Existe una superficie de profesor en `/revision`. | Los diseños aprobados la incluyen. No importa nada de las zonas heredadas (`(dashboard)`, `teacher*`, `grupos`, `cognitive-tools`, `workshop`), no hay calificaciones, porcentajes ni sospecha, y no se usa cámara. Falta el ADR 0014 que la autorice. |
| Sección 0: producto B2C | El enlace de grupo `/defensa/<token>` supone un profesor que reparte actividades. | Es el modelo de los diseños. Mismo ADR. |
| Sección 1.2: "chalk over film" | Se usa la paleta Celeste (fondo `#070B16`, acento `#8CC8FF`, evidencia `#8CC8FF`, `#5A93E6`, `#3D63AD`) con tarjetas y cápsulas, sin el video de olas. | Es lo que muestran los diseños aprobados. La regla pide evitar una interfaz de neón cian por defecto, "excessive cards" y "floating pills"; el diseño aprobado tiene azul cielo, tarjetas y cápsulas. |
| Sección 1.7: contrato tipográfico | Se usan Bricolage Grotesque y DM Mono locales y tamaños que no están en la escala 12, 14, 16, 18, 22, 28, 36 (por ejemplo 13, 13,5, 14,5, 15, 17, 19, 26, 30, 34, 40, 48, 54, 60 y 68 px). No se usan los tokens `--celestea-text-*`. | Los diseños fijan esos tamaños. DM Mono solo sale en horas, duraciones, matrículas, conteos y direcciones. Los tokens propios están en `celeste/tokens.module.css`. |
| Sección 1.1: CSS Modules y cero Tailwind | Se cumple. Pero el layout raíz sigue trayendo el preflight de Tailwind. | El CSS nuevo declara `box-sizing` donde el diseño lo necesita. No se tocó el layout raíz. |
| Sección 1.4: sin conexión | Las fuentes son locales, pero ahora la defensa necesita red: la entrega, cada respuesta y el reporte pasan por el servidor. | La grabación sale por partes y se reintenta con espera creciente, y la sesión se guarda en el teléfono para retomar; aun así, no funciona sin conexión. El layout raíz sigue pidiendo Google Fonts (ya estaba así y no se tocó). |
| Sección 1.5: movimiento | `framer-motion` solo se usa para el vuelo del personaje entre pantallas, con `MotionConfig reducedMotion="user"`. El resto son animaciones de CSS con `prefers-reduced-motion`. | Respetar movimiento reducido sin añadir dependencias. |
| Secciones 2, 3 y 5: voz, plomería y telemetría | Se graba y se transcribe la voz, un modelo escribe el plan y el reporte, la sesión es propia (`firmas.ts`) y los eventos los escribe el servidor (no `trackEvent`, `session.ts` ni `alias.ts`). | Los eventos sí ruedan sobre `eventos_de_aprendizaje` con los mismos verbos y el detalle en `result`, sin texto; el prefijo `defensa:` está reservado. El resto es lo que autorizaría el ADR 0014 (borrador). |
| Sección 2: en v1 la entrada del alumno es texto y la voz es opcional | El flujo es de voz con alternativa escrita siempre disponible. El audio solo empieza tras un toque y nunca se pide cámara. | Así son los diseños y las reglas de producto de la defensa. El micrófono solo se pide tras un toque y `next.config.js` lo permite únicamente en `/defensa` (`microphone=(self)`); en el resto del sitio sigue en `microphone=()`. La cámara nunca. |
| Sección 6: proponer antes de construir | Se construyó sobre diseños ya aprobados, sin propuesta de arquitectura. | El ADR 0014 está escrito como **borrador** (`docs/adr/0014-...`), con el cambio propuesto a `AGENTS.md`, sin aplicar. Mientras no se apruebe, las rutas están ocultas en producción. |
| Carpetas | Contratos (`types.ts`) y ejemplo (`mock.ts`) viven junto a los componentes, no en `src/lib/`. | Así lo pidió el encargo. Al conectar datos reales conviene mover `types.ts` y `consultas.ts` a `src/lib/defensas/`. |
| `productionSurface.ts` | `/defensa`, `/revision` y `/api/defensa` están en `NOT_YET_OPEN_PRODUCTION_ROUTE_PREFIXES`: en producción responden como retiradas hasta que `DEFENSA_PUBLICA=1`. | Mientras el ADR 0014 no esté aprobado. |

## Diferencias con los diseños

Estas son las decisiones que se tomaron a propósito, por accesibilidad o porque el diseño no cubría un caso.

Alumno:

- "Permisos" arranca con los tres interruptores apagados (consentimiento explícito) y dice "Activa los tres para seguir."; el diseño los muestra encendidos.
- En el ensayo aparece la píldora "Ensayo privado, nadie lo ve".
- "Listo" estrena la piel Celestia (de la animación V2) con el chip "Desbloqueaste Celestia".
- Al cambiar de paso el foco pasa al título, para lectores de pantalla y teclado.
- "Revisar" tiene un pie fijo; el diseño lo recorta.
- En modo de voz, si pasan 30 segundos sin responder (`segundosSilencio` en el ejemplo), la pregunta pasa a "Sin prisa" (el paso `silencio`).
- Además de `demo` existe el token `3b-encuesta`, el que muestra el diseño del enlace.

Profesor:

- Las barras de objetivos que no son "lo que más costó" se atenúan a opacidad .7 (el diseño usa .55) y sus cifras van en un gris más claro, para mantener 4,5:1 de contraste.
- El texto "Pendiente" del borrador usa `#7f8ca8` en lugar de `#5d6a88` por la misma razón.
- La barra lateral se queda fija al desplazarse en páginas largas.
- En pantallas angostas la barra lateral se apila arriba del contenido, como en el diseño; no hay menú compacto.
- Con ningún objetivo elegido, "Crear enlace" explica qué falta.
- "Antes de ver su reporte" es un diálogo que no se cierra con Escape; sus cuatro salidas llevan al reporte y, con datos reales, la respuesta se guarda sin frenar la navegación.
- "Revisar uno por uno" lleva al primero de la cola de revisión (en el ejemplo, a Ana, la única con transcripción).
- Con datos reales no se ofrece "Nueva actividad" y el menú muestra solo la actividad del enlace.
- Con datos reales, cada pregunta puede traer debajo una repregunta o una transferencia con su respuesta, y un aviso si el análisis de Celestea todavía se está preparando.
- La página "no encontrado" del profesor vuelve a `/revision/demo` (solo existe fuera de producción).
- El dominio del enlace que se comparte (`celestea.mx/d/<token>`) es ilustrativo; la ruta real es `/defensa/<token>`.

## Verificación del prototipo (12 de octubre, antes de conectar el servidor)

- `pnpm typecheck`: sin errores.
- `pnpm lint`: 0 errores y 7 advertencias que ya existían (en `components/grupos` y `components/workshop`); ninguna viene de los archivos nuevos.
- `pnpm build` (con variables falsas): compila. `/defensa/[token]` pesa 19,9 kB; las tres rutas de `/revision` pesan entre 7,5 y 11,3 kB.
- `pnpm test`: 13 de 13 pruebas pasan cuando existe `SUPABASE_SERVICE_ROLE_KEY` (se usó un valor falso). Sin esa variable, la prueba "raw evidence readers are closed without authorization" recibe 500 ("Server misconfigured") en vez de 401 desde `/api/teacher/export`, por falta de configuración y no por estos cambios.
- Capturas a 1440 por 900 de cada escena del profesor (Enlace a 1440 por 1097 y Reporte a 1440 por 1829, como los diseños) comparadas con el diseño: diferencia media de 0,03 a 0,08 sobre 255.
- Sin barra de desplazamiento horizontal en ninguna ruta (alumno y profesor, incluidas las páginas "no encontrado") a 390, 360 y 320 px de ancho.
- Contraste de texto revisado con un recorrido propio (no hay herramienta como axe en el entorno): sin textos por debajo de 4,5:1 fuera de los controles desactivados, del fondo inerte de "Antes de ver su reporte" y de los textos sobre degradados, que ese recorrido no calcula (el sello de "Entregado" lleva texto oscuro sobre azul claro).
- Ningún archivo existente se modificó; el commit solo agrega archivos nuevos.

## Mensajes de consola conocidos

- `fonts.googleapis.com` falla en entornos sin salida a internet: es la hoja de estilos del layout raíz (existente). En las páginas "no encontrado" de `/defensa` y `/revision` eso se ve además como `Uncaught (in promise) Event`; desaparece en cuanto la hoja carga.
- En desarrollo, Next avisa de `scroll-behavior: smooth` por los estilos globales existentes.
- Una página "no encontrado" registra "Failed to load resource: 404", que es lo normal del navegador.

## Siguientes pasos

Lo hecho y lo pendiente del servidor está en [`backend.md`](./backend.md). Del lado de la interfaz:

1. Aprobar o ajustar el ADR 0014 (borrador) y, solo entonces, abrir las rutas en producción con
   `DEFENSA_PUBLICA=1`.
2. Probar el flujo con llaves reales y con teléfonos de gama baja en datos móviles: la subida
   directa firmada a Supabase, la grabación por partes con una red que se cae y el audio que
   arranca tras un toque en iPhone.
3. Pantalla del profesor para crear actividades (hoy es el script `pnpm defensa:actividad`) y
   lista del grupo.
4. Diseñar el resumen de práctica del ensayo y la pieza visual de las citas del reporte; hoy son
   una lista de texto y la transcripción con la frase resaltada.
5. Diseñar el menú del profesor para celular y hacer una auditoría de accesibilidad con
   herramienta y lector de pantalla real.
6. Sustituir `localStorage` de "fijados" por almacenamiento del servidor si hace falta que
   sobrevivan a otro navegador.
7. Definir el dominio o acortador del enlace que se comparte.

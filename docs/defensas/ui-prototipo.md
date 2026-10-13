# Defensas orales: prototipo de interfaz con datos de ejemplo

Este documento describe la interfaz de las defensas orales de Celestea, construida a partir de los diseños aprobados (tableros "v2" del alumno y "prof2" del profesor). Es solo interfaz: todo lo que se ve sale de datos de ejemplo y no existe servidor, base de datos, modelo de lenguaje, micrófono ni telemetría detrás.

Estado verificado el 12 de octubre de 2026 sobre una copia limpia del repositorio en el commit `8f386cd`, solo con estos archivos nuevos añadidos.

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

## Dónde vive el ejemplo y cómo cambiarlo por datos reales

| Qué | Archivo | Qué hacer al conectar |
| --- | --- | --- |
| Actividad que ve el alumno | `defensa/mock.ts`, leída solo por `defensa/consultas.ts` | Reemplazar el cuerpo de `obtenerActividadPorToken`. |
| Grupo, alumnos y actividades del profesor | `revision/mock.ts`, leído solo por `revision/consultas.ts` | Reemplazar `obtenerGrupoPorToken`. |
| Reporte de un alumno | `revision/mock.ts` (`REPORTE_ANA`) | Reemplazar `obtenerReporte`. |
| Conteos y estados | `revision/derivados.ts` | No cambia: todo se calcula desde la lista de alumnos. |
| A qué respuesta lleva lo que escribe el profesor | `revision/intenciones.ts` | Reemplazar `interpretarPeticion` por un clasificador de servidor que solo pueda devolver una de `RAMAS_PERMITIDAS`; si falla, volver a las reglas locales. |
| Guion de "Nueva actividad" | `revision/nueva.ts` | Sustituir el guion fijo por el flujo real de borrador y por la creación del enlace. |

Las tres funciones de consulta son asíncronas a propósito, así que el cambio no altera ninguna página ni componente. Una versión real también debe comprobar en el servidor que la sesión es la dueña de la actividad: el token por sí solo no autoriza nada.

Lo que sí es real hoy: copiar al portapapeles, el enlace de WhatsApp (`wa.me`, solo si el profesor lo toca), y dos datos guardados en el navegador con `localStorage`:

- `celestea-revision-fijados-<token>`: las respuestas que el profesor fija ("Fijado por ti").
- `celestea-revision-cierre-<token>-<matrícula>`: su respuesta a "¿El reporte coincide con lo que piensas?".

Lo que está simulado: reproducir audio, dictado, grabación y micrófono del alumno, subir o pegar el trabajo (no se envía a ningún lado), descargas, compartir en Moodle, "Editar a mano" y pedir cambios por mensaje en la nueva actividad, y todas las respuestas de Celestea. Los textos de estado de esas acciones dicen que son de la demostración.

## Desviaciones de AGENTS.md y por qué

No se editó `AGENTS.md`, `CURRENT_STATE.md` ni el contrato tipográfico. Estas son las diferencias que hay entre lo construido y lo que dicen:

| Regla | Qué pasa aquí | Por qué |
| --- | --- | --- |
| Sección 0: no somos un tablero para profesores | Existe una superficie de profesor en `/revision`. | Los diseños aprobados la incluyen. No importa nada de las zonas heredadas (`(dashboard)`, `teacher*`, `grupos`, `cognitive-tools`, `workshop`), no hay calificaciones, porcentajes ni sospecha, y no se usa cámara. Falta el ADR 0014 que la autorice. |
| Sección 0: producto B2C | El enlace de grupo `/defensa/<token>` supone un profesor que reparte actividades. | Es el modelo de los diseños. Mismo ADR. |
| Sección 1.2: "chalk over film" | Se usa la paleta Celeste (fondo `#070B16`, acento `#8CC8FF`, evidencia `#8CC8FF`, `#5A93E6`, `#3D63AD`) con tarjetas y cápsulas, sin el video de olas. | Es lo que muestran los diseños aprobados. La regla pide evitar una interfaz de neón cian por defecto, "excessive cards" y "floating pills"; el diseño aprobado tiene azul cielo, tarjetas y cápsulas. |
| Sección 1.7: contrato tipográfico | Se usan Bricolage Grotesque y DM Mono locales y tamaños que no están en la escala 12, 14, 16, 18, 22, 28, 36 (por ejemplo 13, 13,5, 14,5, 15, 17, 19, 26, 30, 34, 40, 48, 54, 60 y 68 px). No se usan los tokens `--celestea-text-*`. | Los diseños fijan esos tamaños. DM Mono solo sale en horas, duraciones, matrículas, conteos y direcciones. Los tokens propios están en `celeste/tokens.module.css`. |
| Sección 1.1: CSS Modules y cero Tailwind | Se cumple. Pero el layout raíz sigue trayendo el preflight de Tailwind. | El CSS nuevo declara `box-sizing` donde el diseño lo necesita. No se tocó el layout raíz. |
| Sección 1.4: sin conexión | Las rutas no hacen peticiones y las fuentes son locales. | El layout raíz sigue pidiendo Google Fonts (ya estaba así y no se tocó). |
| Sección 1.5: movimiento | `framer-motion` solo se usa para el vuelo del personaje entre pantallas, con `MotionConfig reducedMotion="user"`. El resto son animaciones de CSS con `prefers-reduced-motion`. | Respetar movimiento reducido sin añadir dependencias. |
| Secciones 2, 3 y 5: voz, plomería y telemetría | No se graba audio, no hay `trackEvent`, ni `session.ts`, ni Supabase. | Es solo interfaz. Al conectar hay que reutilizar la plomería y definir el contrato de eventos sin inventar `verbo` nuevos. |
| Sección 2: en v1 la entrada del alumno es texto y la voz es opcional | El flujo es de voz con alternativa escrita siempre disponible. El audio solo empieza tras un toque y nunca se pide cámara. | Así son los diseños y las reglas de producto de la defensa. Hoy no se pide el micrófono; cuando se pida, `next.config.js` manda `Permissions-Policy: microphone=()` y habrá que abrirlo solo para `/defensa`. |
| Sección 6: proponer antes de construir | Se construyó sobre diseños ya aprobados, sin propuesta de arquitectura. | Queda pendiente el ADR 0014. |
| Carpetas | Contratos (`types.ts`) y ejemplo (`mock.ts`) viven junto a los componentes, no en `src/lib/`. | Así lo pidió el encargo. Al conectar datos reales conviene mover `types.ts` y `consultas.ts` a `src/lib/defensas/`. |
| `productionSurface.ts` | Las rutas nuevas no están en la lista de rutas retiradas, así que en producción se verían con datos de ejemplo. | No se modificó el archivo. Diff propuesto más abajo. |

### Diff propuesto (no aplicado) para ocultar las rutas en producción mientras sean un ejemplo

`src/lib/server/productionSurface.ts`, dentro de `RETIRED_PRODUCTION_ROUTE_PREFIXES`:

```diff
   '/dashboard',
   '/demo',
+  '/defensa',
   '/grupos',
   '/join',
   '/missions',
   '/pilot-login',
+  '/revision',
   '/transparencia-ia',
```

Las pruebas existentes (`tests/e2e/production-surface.spec.ts`) no listan estas rutas, así que no se rompen.

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
- "Antes de ver su reporte" es un diálogo que no se cierra con Escape; sus cuatro salidas llevan al reporte y la respuesta no se guarda.
- "Revisar uno por uno" lleva al reporte de Ana, el único con transcripción.
- Las otras actividades del menú llevan al mismo grupo de ejemplo.
- La página "no encontrado" del profesor vuelve a `/revision/demo`.
- El dominio del enlace que se comparte (`celestea.mx/d/<token>`) es ilustrativo; la ruta real es `/defensa/<token>`.

## Verificación hecha

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

1. Escribir y aprobar el ADR 0014 (superficie de profesor y enlaces de grupo dentro del producto).
2. Ocultar `/defensa` y `/revision` en producción con el diff de arriba mientras sean un ejemplo.
3. Conectar datos: reemplazar los tres cuerpos de `consultas.ts`, con sesión del profesor y comprobación de que es el dueño.
4. Guardar las respuestas del alumno y el audio (con borrado a los 7 días), pedir el micrófono solo tras un toque y abrir `Permissions-Policy` solo en `/defensa`.
5. Clasificar la evidencia ("lo explicó", "en parte", "no salió") en servidor, con un clasificador que solo elija ramas ya escritas, y que `interpretarPeticion` use el mismo principio. Nada de generar la interfaz con el modelo.
6. Decidir cómo se redactan los objetivos de una actividad nueva sin que el modelo escriba contenido de lecciones en tiempo de ejecución.
7. Sustituir `localStorage` (fijados y cierre del reporte) por almacenamiento del servidor.
8. Diseñar el menú del profesor para celular y hacer una auditoría de accesibilidad con herramienta y lector de pantalla real.
9. Agregar pruebas e2e de estas rutas en `tests/e2e/` (aquí no se tocó esa carpeta).
10. Definir el dominio o acortador del enlace que se comparte.

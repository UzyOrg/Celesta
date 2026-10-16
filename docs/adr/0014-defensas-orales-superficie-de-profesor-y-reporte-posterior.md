# ADR 0014 · Defensas orales: una superficie de profesor y un reporte posterior

- **Fecha:** 2026-10-13
- **Estado:** **BORRADOR. Pendiente de aprobación del fundador.** El cambio a `AGENTS.md` que
  propone este documento **no está aplicado**: `AGENTS.md` sigue diciendo lo que decía.
- **Ámbito:** `/defensa`, `/revision`, `/api/defensa`, `src/lib/defensa/`,
  `src/components/defensa/`, `src/components/revision/`, `src/components/celeste/`,
  `supabase/migrations/20261013_defensa_oral_piloto.sql`
- **Rama:** `feat/defensas-backend` (desde `feat/defensas-ui`)

## Contexto

El piloto de 90 días incluye **defensas orales**: después de entregar un trabajo, el alumno lo
explica con su voz (o por escrito) a Celestea durante unos minutos; un profesor lee luego un
reporte de lo que mostró en cada objetivo de su actividad. El documento de diseño del piloto
(etapa 1 y la aclaración puntual de la etapa 2) y los tableros aprobados ("v2" del alumno y
"prof2" del profesor) ya están construidos y conectados a un servidor real.

Esto choca con `AGENTS.md` en varios puntos. El documento dice que somos B2C y **no** somos un
tablero para profesores (§0), que un LLM solo clasifica y nunca genera contenido de lección
(§2), que el sistema visual es *chalk over film* (§1.2) y que los tamaños tipográficos salen de
un contrato (§1.7). La superficie nueva hace cuatro cosas que esas reglas hoy prohíben o no
prevén:

1. Tiene **una pantalla para el profesor** (`/revision`) y **enlaces de grupo**
   (`/defensa/<código>`): el profesor reparte una actividad, no el alumno la encuentra solo.
2. Un **modelo de lenguaje escribe texto en tiempo de ejecución**: el plan de preguntas a partir
   del trabajo de cada alumno y el reporte para el profesor.
3. Guarda **la voz del alumno** (7 días) y su transcripción.
4. Su interfaz usa la paleta y la tipografía de los diseños aprobados, no la de `/crear`.

Lo que **no** cambia: no hay cámara, ni seguimiento de pestañas, ni calificaciones, porcentajes
o sospechas en pantalla, ni "Verification OS". La defensa ocurre **después** de que el trabajo
ya cuenta como entregado; una falla técnica nunca se lo quita al alumno, y siempre se puede
escribir en vez de hablar.

## Decisión propuesta

### 1. Una superficie separada, que no toca `/crear`

`/defensa`, `/revision` y `/api/defensa` son una superficie propia con su propia sesión firmada
(token de portador de 48 horas para el alumno; enlace firmado de 180 días para el profesor,
invalidable con `rotar`). No reutiliza el runtime de lecciones de `/crear` ni sus zonas
heredadas, y no se extiende desde ellas. Mientras no se apruebe este ADR, `productionSurface.ts`
las **oculta en producción** (se abren con `DEFENSA_PUBLICA=1`).

### 2. El profesor lee, no vigila

La pantalla del profesor existe para **leer un reporte y bajar trabajos**: qué mostró el alumno
en cada objetivo (niveles escritos, nunca notas ni porcentajes), la transcripción de lo que
dijo, el audio **solo** de la frase que el propio alumno marcó o aclaró, y la descarga de los
trabajos. El profesor califica donde siempre. Se le pregunta qué cree antes de ver el reporte y
si coincidió al cerrarlo, como evidencia de si el reporte le sirve; el alumno nunca lo ve.
El alumno puede **marcar lo que no dijo así** antes de entregar y ver exactamente la
transcripción que verá el profesor.

### 3. Usos permitidos del modelo de lenguaje en esta superficie (lista cerrada)

- **Plan de preguntas**: antes de la defensa, a partir del trabajo que el alumno entregó, con
  la consigna y la rúbrica que mandó el profesor. Salida estructurada y validada en el servidor
  (cada ancla debe aparecer **tal cual** en el trabajo; tope de objetivos y de longitud). Se
  guarda. La voz de una pregunta se crea **después de elegirla**, no al armar el plan: al empezar
  cada defensa se crea la de las preguntas que su semilla ya eligió y, cuando hace falta, la de un
  seguimiento. Así solo se paga la voz de lo que se pregunta, y cada texto se crea una sola vez.
- **Clasificador de turno**: sólida, vaga, fuera de tema o sin respuesta. Solo devuelve una
  clase; con falla, cae a un clasificador local.
- **Reporte posterior para el profesor**: el modelo propone niveles y citas; el código
  **verifica que cada cita aparezca literalmente en la transcripción** (3 a 60 palabras, del
  turno del mismo objetivo) y degrada a "sin dato" cualquier nivel sin cita verificada. Un
  filtro descarta textos con notas, porcentajes o sospechas.

El modelo **nunca** genera la interfaz, **nunca** escribe preguntas durante la defensa (el motor
de turnos es una función pura que elige entre las del plan) y **nunca** recibe el plan ni los
prompts en el navegador: `src/lib/defensa/` importa `server-only`. Ningún dato se usa para
entrenar (se pide la opción de no retención a cada proveedor cuando existe).

### 4. Datos

| Dato | Retención |
| --- | --- |
| Audio de las respuestas | 7 días tras terminar la defensa (cron diario) |
| Trabajo original, texto extraído, transcripciones, reporte, toques del profesor | Hasta 90 días después de cerrar la cohorte (**borrado automático aún no implementado**) |
| Zip de descarga | 1 día |

Base de datos y buckets **cerrados al navegador** (RLS sin políticas; todo acceso por el
servidor con enlaces firmados que caducan). Los eventos de aprendizaje usan el contrato
existente (`eventos_de_aprendizaje`, mismos verbos, detalle en `result`, **sin texto del
alumno**); el prefijo `taller_id = defensa:<actividad>` queda **reservado** y la ingesta pública
lo rechaza.

### 5. Cambio propuesto a `AGENTS.md` (NO aplicado)

> Esto es lo que se propone escribir en `AGENTS.md` si se aprueba el ADR. Hoy no está ahí.

**§0, en "We ARE", añadir:**

> - una superficie separada de **defensas orales** (`/defensa`, `/revision`, `/api/defensa`):
>   el alumno explica con su voz un trabajo que ya entregó y un profesor lee un reporte
>   posterior. No reemplaza a `/crear`, no califica y no vigila (ver ADR 0014).

**§0, tras la lista de zonas heredadas, añadir:**

> **ZONA PROPIA — extender con cuidado:** `src/app/defensa/`, `src/app/revision/`,
> `src/app/api/defensa/`, `src/lib/defensa/`, `src/components/defensa/`,
> `src/components/revision/`, `src/components/celeste/`. No importan nada de `/crear` ni de las
> zonas heredadas, y `/crear` no importa nada de ellas.

**§1.2, añadir al final:**

> Excepción: la superficie de defensas usa el sistema visual Celeste de los tableros aprobados
> (`docs/defensas/ui-prototipo.md`), no *chalk over film*. Sigue sin Tailwind y con CSS Modules.

**§1.7, añadir:**

> Excepción: la superficie de defensas usa Bricolage Grotesque y DM Mono con los tamaños de los
> tableros aprobados, definidos en `src/components/celeste/tokens.module.css`.

**§2, añadir:**

> Excepción acotada para las defensas orales: el LLM puede (a) armar, antes de la defensa, el
> plan de preguntas a partir del trabajo entregado por el alumno, validado y guardado en el
> servidor; (b) clasificar cada respuesta en una clase fija; y (c) redactar el reporte
> posterior para el profesor, con cada cita verificada en código contra la transcripción. Nunca
> genera interfaz, nunca escribe preguntas durante la defensa y nada de eso llega al navegador.
> La salida del alumno puede ser voz; su transcripción pasa por un proveedor externo con la
> opción de no retención y el audio se borra a los 7 días.

**§3, añadir:**

> Las defensas usan su propia sesión firmada (`src/lib/defensa/firmas.ts`) y escriben sus
> eventos desde el servidor; no usan `session.ts`, `alias.ts` ni `track.ts`.

**§5, añadir:**

> `taller_id` con prefijo `defensa:` está reservado al servidor de defensas; la ingesta pública
> lo rechaza.

## Consecuencias

- La línea "no somos un tablero para profesores" deja de ser absoluta: hay **una** pantalla de
  profesor, acotada a leer y descargar. Hay que mantener esa frontera a propósito; cualquier
  calificación, ranking, porcentaje o señal de sospecha sería volver a la visión deprecada.
- Por primera vez el producto guarda **voz** de personas. Eso exige aviso de privacidad,
  consentimiento explícito (hay tres confirmaciones que empiezan apagadas) y la revisión de un
  abogado antes de abrir la superficie: transferencia internacional a los proveedores de
  modelo, transcripción y voz, y la edad de quienes participan.
- El LLM escribe texto en tiempo de ejecución, algo que `/crear` evita por costo, latencia y
  seguridad de menores. Aquí se acota con salida estructurada, validación en servidor, verificación
  literal de las citas, clasificación con respaldo local y ningún camino hacia el navegador.
- Hay dos sistemas visuales conviviendo hasta que se decida si se unifican.
- La superficie queda cerrada en producción por defecto; abrirla es una decisión explícita
  (`DEFENSA_PUBLICA=1`).

## Alternativas consideradas

- **Dejar `AGENTS.md` como está y tratar esto como excepción no documentada.** Descartada: es
  exactamente lo que el §6 pide evitar.
- **Que el profesor no tenga pantalla** y reciba el reporte por correo o PDF. Posible, pero
  pierde el audio acotado, la descarga y los dos toques que son la evidencia de si el reporte
  sirve; se puede reconsiderar si el ADR no se aprueba.
- **Plan de preguntas pre-escrito a mano por actividad** (alineado con §2). Descartada para el
  piloto: cada actividad trae un trabajo distinto de cada alumno y las preguntas deben anclarse
  en lo que ese alumno escribió.
- **Transcribir en el navegador** para no enviar audio a un tercero. Descartada por la
  confianza y los tiempos por palabra que necesita la aclaración puntual y por la calidad en
  teléfonos de gama baja.

## Preguntas abiertas para el fundador

1. ¿Se aprueba la excepción al §2 tal como está redactada, o se prefiere reducirla (por
   ejemplo, sin reporte generado por el modelo)?
2. ¿Quién cierra una cohorte y cuándo empieza a contar el borrado de 90 días?
3. ¿Los participantes del piloto son mayores de edad? La confirmación "soy mayor de edad" está
   en la entrada; si hay menores, el flujo de consentimiento cambia.
4. ¿Se unifica el sistema visual con `/crear` o se mantienen separados?
5. ¿Qué proveedor de transcripción se queda después de comparar audio real?

## Cómo deshacerlo

Dejar `DEFENSA_PUBLICA` sin definir oculta las tres rutas en producción. Para retirar la
superficie por completo, basta borrar las carpetas del ámbito, el cron de `vercel.json` y la
migración (las tablas `defensa_*` no tienen dependencias fuera de ellas). No hay cambios al
esquema de `eventos_de_aprendizaje`.

La descripción operativa y la lista de pendientes están en `docs/defensas/backend.md`.

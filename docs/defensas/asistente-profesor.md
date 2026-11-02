# Asistente del profesor con catálogo cerrado · Propuesta (fase 1)

- **Fecha:** 2026-11-02
- **Estado:** **PROPUESTA. Espera la aprobación de Hi.** No hay modelo, ruta ni servicio nuevos.
  Lo único construido son las **maquetas** (sección 6) y el contrato de las tarjetas que usan.
- **Encargo:** `03-panel-profesor-ia.md` (fase 1).
- **Base:** `feat/defensas-backend` en `4f243c3`. Rama de trabajo `Uziel/panel-profesor-ia-4d2f72`.
- **Modelo:** Claude Haiku 5.5, id `claude-haiku-5-5`. Lo verifiqué el 2026-11-02 en la página de
  modelos de la documentación de Claude: está activo (salió el 7 de octubre de 2026 y no se retira
  antes del 7 de octubre de 2027). Cuesta $0.10 por millón de tokens de entrada y $0.50 por millón
  de salida con prompts de menos de 100 mil tokens. Admite herramientas y trae el razonamiento
  adaptativo encendido por defecto (ver 4.7).

Qué se pide: el profesor escribe en lenguaje natural lo que quiere ver o hacer y Celestea contesta
con datos reales de su grupo, en tarjetas de un catálogo cerrado que nunca rompen la interfaz. Hoy
eso lo hacen reglas de palabras (`intenciones.ts`) que llevan a una de cinco escenas.

Lo esencial de la propuesta en tres líneas:

1. **El modelo solo elige.** Elige qué tarjetas mostrar y sus argumentos (un filtro, un
   objetivo, un alias). El servidor arma los datos de cada tarjeta con consultas tipadas del grupo
   del enlace. El modelo no escribe props, interfaz ni código.
2. **Al modelo le llega una hoja seudónima del grupo:** alias, estados y niveles. Nunca recibe
   nombres, matrículas, trabajos, transcripciones ni citas.
3. **Lo que él escribe se verifica:** cada cifra se coteja con los datos y cada alias se cambia
   por un nombre en el servidor. Si algo falla, la frase sale de una plantilla fija; si falla el
   modelo, contestan las reglas de siempre.

---

## 1. Inventario de datos

Sale de `src/lib/defensa/almacen/tipos.ts` y `servicios/profesor.ts`. Columnas: **Ve** = lo que el
profesor ya ve hoy en `/revision`; **Tarjeta** = lo puede mostrar una tarjeta del asistente;
**Modelo** = se le manda al modelo. Sensibilidad: 🔴 nunca sale del servidor o nunca se muestra,
🟠 dato personal o del alumno, 🟢 operativo.

### Por actividad (`ActividadRow`)

| Dato | Sens. | Ve | Tarjeta | Modelo |
| --- | --- | --- | --- | --- |
| nombre, curso, grupo, fecha límite | 🟢 | sí | sí | sí |
| objetivos (texto, corto, alias, tema) | 🟢 | sí | sí | sí (los escribió el profesor) |
| consigna, rúbrica, ejemplos, contexto del curso | 🟢 | no | no | no (no hace falta) |
| nombre del profesor | 🟠 | sí | saludo | no |
| enlace activo, envíos usados / límite | 🟢 | no (solo script) | sí (`enlace`, `pendientes`) | sí |
| `tokenGrupo`, `accesoVersion`, enlace firmado | 🔴 | — | no | no |
| `cohorteCerradaEn` | 🟢 | no | no | no |

### Por alumno (`AlumnoRow`, `EntregaRow`, consentimientos)

| Dato | Sens. | Ve | Tarjeta | Modelo |
| --- | --- | --- | --- | --- |
| nombre, iniciales | 🟠 | sí | sí | **no**: alias `A01…` |
| matrícula | 🟠 | sí (en la dirección) | sí (en enlaces) | **no** |
| entrega: día y hora, tardía, otra versión | 🟢 | sí | sí | día y banderas |
| nombre del archivo, bytes, páginas, palabras | 🟠 | descarga | `descarga` | no |
| **texto extraído del trabajo, archivo original, hash** | 🔴 | descarga | no (solo el botón de descarga) | **nunca** |
| modo preferido, dispositivo | 🟠 | no | no | no |
| consentimientos | 🔴 | no | no | no |

### Por defensa (`DefensaRow`, `PlanRow`, `ReporteRow`)

| Dato | Sens. | Ve | Tarjeta | Modelo |
| --- | --- | --- | --- | --- |
| estado (por revisar, revisado, incompleta), tardía | 🟢 | sí | sí | sí |
| día y hora de la defensa | 🟢 | sí | sí | solo el día |
| duración activa | 🟠 | ficha | solo la **típica del grupo** (`ritmo`) | no |
| partes para oír (cuántas) | 🟢 | sí | sí | sí (número) |
| audio y cuándo se borra | 🔴 / 🟢 | botón para oír | aviso "se borra el…" | no |
| nivel por objetivo (lo explicó, en parte, no salió, sin dato) | 🟠 | sí | sí | sí |
| resumen, razón y faltante del reporte | 🟠 | reporte | no en v1 (están en el reporte) | **no** |
| citas verificadas | 🟠 | reporte | sí (`citas`, tal cual) | **no** |
| **plan de preguntas, prompts, semilla** | 🔴 | — | no | no |
| **ensayo** | 🔴 | no | no | no |
| **nivel de estrés**, aclaración en ms | 🔴 | no | no (rechazo `privado`) | no |
| `citasDescartadas`, modelo, versión del prompt | 🔴 | no | no | no |

### Por turno (`TurnoRow`)

| Dato | Sens. | Ve | Tarjeta | Modelo |
| --- | --- | --- | --- | --- |
| pregunta (contexto y texto), tipo, objetivo | 🟢 | reporte | no en v1 | no |
| respuesta escrita y transcripción | 🟠 | reporte | solo citas verificadas | **no** |
| confianza por palabra, silencios, repeticiones | 🔴 | no | no | no |
| clase (sólida, vaga…) | 🟠 | etiqueta del reporte | no | no |
| marca y aclaración del alumno | 🟠 | reporte | número de partes para oír | número |

### Del profesor

| Dato | Sens. | Ve | Tarjeta | Modelo |
| --- | --- | --- | --- | --- |
| toques antes y después | 🔴 | el suyo | no | no |
| tiempo de revisión | 🔴 | no | no | no |

---

## 2. Catálogo de tarjetas

Las 11 tarjetas son las únicas que existen. La forma exacta de sus props está en
[`src/components/revision/catalogo.ts`](../../src/components/revision/catalogo.ts) y los topes en
`LIMITES_TARJETAS`. Hay **dos esquemas por tarjeta**:

- **Argumentos** (lo que devuelve el modelo): pequeños, cerrados y sin texto libre.
- **Props** (lo que arma el servidor con datos reales): se validan otra vez antes de mandarse.

Reglas comunes:

- Una respuesta lleva **máximo 3 tarjetas** y nunca dos del mismo tipo con los mismos argumentos.
- Las tarjetas se pintan con un `switch` exhaustivo; un `tipo` desconocido se ignora.
- Cada tarjeta va dentro de su propio límite de error: si una falla se lee "Esta parte no se pudo
  mostrar" y las demás siguen.
- **Cargando** se ve en los pasos visibles (sección 5): una tarjeta solo se pinta cuando ya tiene
  datos.
- **Error de datos:** la tarjeta no llega; Celestea dice "No pude traer esto ahora. Intenta otra
  vez." y ofrece sugerencias.
- **Móvil** (≤560 px): una columna, 16 px de margen, botones de 40–44 px y la barra en la zona del
  pulgar, como el inicio actual.
- **Ninguna tarjeta muestra** notas, puntos, porcentajes, promedios, rankings ("mejor" o "peor"),
  señales de copia o de uso de IA, el ensayo, el estrés, la confianza de la transcripción ni datos
  de otro grupo. Tampoco ordena a nadie por desempeño: el orden es por momento de entrega o
  defensa, o alfabético.

### Las que ya existen (cambian solo para aceptar argumentos)

| Tipo | Argumentos del modelo | Props (servidor) | Límites | Vacío | Escritorio / móvil |
| --- | --- | --- | --- | --- | --- |
| `avance` | `{}` | `ResumenGrupo` + `sinEntregar[]` + `sinDefensa[]` | listas completas (≤120) | "Todo el grupo ya defendió." | 2 columnas / 1 |
| `alumno` | `{ alias }` | `Alumno` | 1 persona; hoy solo `alumnoBuscado`, ahora cualquiera | alias inexistente: se descarta la tarjeta | igual |
| `grupo` | `{}` | `SeccionGrupo[]` | 4 secciones | (siempre hay secciones) | igual |
| `objetivos` | `{}` | `ConteoObjetivo[]` | 3 objetivos | sin defensas: "Nadie ha defendido todavía." | igual |
| `descarga` | `{ alcance: 'todos' }` o `{ alcance: 'uno', alias }` | `DescargaGrupo` + cuántos | zip ≤100 MB | "Nadie ha entregado todavía." | igual |

`descarga` mantiene lo de hoy: el zip se arma en cuanto el profesor lo pide, porque esa petición ya
es su toque. Con `uno`, la tarjeta `alumno` muestra el botón para bajar el trabajo; **nada se
descarga sin un toque**.

### Las nuevas (maquetas en `/revision/demo?escena=asistente`)

| Tipo | Argumentos del modelo | Props (servidor) | Límites | Vacío / error | Nunca muestra |
| --- | --- | --- | --- | --- | --- |
| `lista` | `{ filtros: [{ filtro, objetivo?, niveles? }] }` (1 a 3 filtros, se combinan con "y") | `PropsTarjetaLista`: título armado por el servidor, filas (persona, detalle, 3 etiquetas, acción), total | **40 filas**; "Y N más" + "Ver la lista completa"; detalle ≤70 caracteres | frase fija por filtro ("Nadie entregó ni defendió después del cierre.") | orden por desempeño |
| `objetivo` | `{ objetivo: 1-3 }` | `PropsTarjetaObjetivo`: conteo, barra, nombres por nivel (en parte, no salió, sin dato) | **12 nombres por nivel** + "Y N más" | "Nadie ha defendido todavía." | a quienes lo explicaron, con nombre (solo la cifra) |
| `citas` | `{ objetivo: 1-3, niveles? }` | `PropsTarjetaCitas`: frases **exactas ya verificadas** por `reporte.ts`, con persona, nivel, modo, minuto y enlace a su reporte | **5 citas**, ≤60 palabras cada una | "Todavía no hay frases verificadas sobre este objetivo." | texto parafraseado o resumido, citas sin verificar |
| `pendientes` | `{}` | por revisar, cuántos traen algo para oír, análisis preparándose o con error, audio que se borra pronto, estado del enlace | 1 tarjeta | "No te falta nada por ahora." | tiempo de revisión del profesor |
| `ritmo` | `{}` | entregas y defensas por día, cuántas tarde, duración **típica** (mediana, solo con 5 o más defensas medidas) | **14 días** | "Nadie ha entregado todavía." | la duración de una persona, quién fue más rápido |
| `enlace` | `{ propuesta: 'ver' \| 'desactivar' \| 'reactivar' }` | activo, envíos usados / límite | 1 tarjeta | — | el código del grupo ni el enlace firmado |

Filtros de `lista` (`FiltroLista`): `sin-entregar`, `sin-defensa`, `por-revisar`, `revisado`,
`tarde`, `incompleta`, `otra-version`, `partes-para-oir` y `nivel-en-objetivo`. Este último lleva
`objetivo` y `niveles` (uno o varios de `explico`, `en-parte`, `no-salio` y `sin-dato`).

**`enlace` nunca actúa solo:** muestra el efecto y pide "Sí, desactivarlo". El cambio va por la
ruta que ya existe (`POST /api/defensa/enlace`) con el toque del profesor. El modelo no tiene
ninguna herramienta que escriba.

Los **rechazos** no son tarjeta: son una frase fija por motivo (`FRASE_DE_RECHAZO`: `calificar`,
`comparar-personas`, `sospecha`, `privado`, `otro-grupo` y `fuera-de-alcance`). Pueden ir con una
tarjeta permitida como alternativa; por ejemplo, "ponle calificación a Ana" muestra la tarjeta
`alumno`.

---

## 3. Peticiones típicas

Las "herramientas" son las consultas tipadas del servidor detrás de cada tarjeta (sección 4.3).
Las cifras salen del grupo de ejemplo.

| # | Petición | Herramienta | Tarjeta | Respuesta corta |
| --- | --- | --- | --- | --- |
| 1 | ¿Cuántos defendieron? | `resumen_grupo` | avance | 27 de 38 ya defendieron. Faltan 11. |
| 2 | ¿Quién no ha entregado? | `lista(sin-entregar)` | lista | 7 no han entregado. |
| 3 | ¿Quién entregó pero no defendió? | `lista(sin-defensa)` | lista | 4 entregaron sin defender. |
| 4 | Muéstrame a Ana Torres | `ficha(A35)` | alumno | Ana entregó y defendió el viernes… |
| 5 | ¿Cómo le fue a Carlos Espinoza? | `ficha(A07)` | alumno | Carlos entregó y defendió el martes… |
| 6 | Muéstrame a todos | `resumen_grupo` | grupo | Este es el grupo por estado. |
| 7 | ¿Qué objetivo les costó más? | `conteo_objetivos` | objetivos | El de la muestra: 5 de 27 lo explicaron. |
| 8 | ¿Cómo les fue con la muestra? | `objetivo(2)` | objetivo | 5 lo explicaron, 16 en parte, 4 no lo mencionaron. |
| 9 | ¿Quiénes explicaron la muestra solo en parte? | `lista(nivel 2: en-parte)` | lista | 16 la explicaron en parte. |
| 10 | ¿Quién no mencionó los límites? | `lista(nivel 3: no-salio)` | lista | 4 no lo mencionaron. |
| 11 | ¿Quién explicó los tres objetivos? | `lista(nivel 1, 2 y 3: explico)` | lista | 3 explicaron los tres. |
| 12 | ¿Quién explicó el método pero no la muestra? | `lista(nivel 1: explico; nivel 2: en-parte o no-salio)` | lista | Son N. |
| 13 | ¿Qué dijeron sobre su muestra? | `citas(2)` | citas | Cuatro frases tal como las dijeron. |
| 14 | Dame ejemplos de cómo justificaron el método | `citas(1, explico)` | citas | Frases de quienes lo explicaron. |
| 15 | ¿Qué me falta? | `pendientes` | pendientes | Te esperan 19 reportes. |
| 16 | ¿Cuántos reportes me quedan? | `pendientes` | pendientes | 19 por revisar. |
| 17 | ¿Qué reportes traen algo para oír? | `lista(partes-para-oir ∧ por-revisar)` | lista | 9 traen algo para oír. |
| 18 | ¿Qué audio se borra pronto? | `pendientes` | pendientes | El de 4 reportes, el martes 13. |
| 19 | ¿Quién entregó tarde? | `lista(tarde)` | lista | Tres personas entregaron o defendieron tarde. |
| 20 | ¿Cuándo entregaron? | `ritmo` | ritmo | 31 entregaron; así se repartieron los días. |
| 21 | ¿Cuánto dura una defensa? | `ritmo` | ritmo | Por lo general, 3 min 40 s (solo con 5 o más defensas medidas). |
| 22 | ¿Quién subió otra versión? | `lista(otra-version)` | lista | Una persona subió otra versión. |
| 23 | ¿Hay defensas incompletas? | `lista(incompleta)` | lista | Una quedó incompleta. |
| 24 | ¿Cuáles ya revisé? | `lista(revisado)` | lista | Ya revisaste 8. |
| 25 | Descarga todos los trabajos | `descarga(todos)` | descarga | Junté los 31 trabajos en un archivo. |
| 26 | Bájame el trabajo de Diego Cruz | `ficha(A04)` + `descarga(uno)` | alumno | Aquí está Diego; toca "Descargar". |
| 27 | Cierra el enlace del grupo | `enlace(desactivar)` | enlace | Lo desactivo en cuanto me lo confirmes. |
| 28 | ¿Cuántos envíos quedan? | `enlace(ver)` | enlace | Van 33 de 120. |
| 29 | ¿Cómo va el grupo y qué me queda? | `resumen_grupo` + `pendientes` | avance + pendientes | 27 de 38 defendieron. Te esperan 19. |
| 30 | Crea una nueva actividad | extensión `crear_actividad` | (la del otro agente) | Hoy: "Por ahora las damos de alta nosotros." |

### Lo que rechaza con amabilidad

| Petición | Motivo | Respuesta (fija) | Alternativa |
| --- | --- | --- | --- |
| ¿Quién es el peor? / Ordénalos del mejor al peor | `comparar-personas` | No ordeno a nadie de mejor a peor… | `objetivos` |
| ¿Quién copió? | `sospecha` | No busco quién copió ni tengo señales de sospecha… | — |
| ¿Qué porcentaje usó IA? / ¿Quién usó ChatGPT? | `sospecha` | (la misma) | — |
| Ponle calificación a Ana / ¿Qué nota le pongo? | `calificar` | No pongo calificaciones ni puntos: eso lo decides tú… | `alumno` |
| Dame el promedio o el porcentaje de aprobados | `calificar` | (la misma) | `objetivos` (cuentas, no porcentajes) |
| ¿Cómo le fue al 3A? / Muéstrame otro grupo | `otro-grupo` | Solo veo el grupo de este enlace… | — |
| ¿Quién estaba nervioso? / Muéstrame su ensayo | `privado` | Eso queda entre Celestea y cada alumno… | `alumno` |
| Escríbele a Ana que repita la defensa | `fuera-de-alcance` | Eso no lo sé hacer… | — |

Los rechazos claros (copió, plagio, IA, ChatGPT, calificación, nota, promedio, porcentaje, peor,
mejor, ranking, otro grupo, estrés, nervios, ensayo) los atrapa **un filtro de palabras en el
servidor antes de llamar al modelo**: es más barato y siempre igual. El modelo es la segunda línea
para las formas que el filtro no ve.

---

## 4. Arquitectura

### 4.1 Recorrido de una petición

```
Barra (InicioAgentico)
  └─ POST /api/defensa/asistente   Authorization: Bearer <enlace del profesor>
       { peticion: string ≤300, historial: [{ peticion, tipos[] }] ≤2 }
     ├─ conAccesoProfesor → actividad del enlace firmado (no hay otra)
     ├─ límites: 30/min por actividad, 120/min por IP
     ├─ filtro de rechazos → si coincide: frase fija, sin modelo
     ├─ hoja seudónima del grupo (datosDelGrupo → alias)
     ├─ nombres y matrículas de la petición → alias (en el servidor)
     ├─ Haiku 5.5: una llamada con herramienta obligatoria `responder`
     │     → { texto, tarjetas: [{ tipo, argumentos }] ≤3, rechazo }
     ├─ validación (zod, discriminada por tipo; lo inválido se descarta)
     ├─ hidratación: consultas tipadas → props reales
     ├─ verificación del texto (cifras, alias, filtro de palabras)
     └─ respuesta en NDJSON: pasos… y al final { texto, tarjetas, sugerencias, fuente }
```

Servicio: `src/lib/defensa/servicios/asistenteProfesor.ts` (`server-only`). Las funciones que
arman los props ya existen y son puras: `tarjetasDelGrupo.ts` (lista, objetivo y ritmo) más
`derivados.ts` (avance, grupo y objetivos). El servidor usará las mismas que hoy usan las
maquetas.

### 4.2 Lo mínimo para el modelo: hoja seudónima

Una fila por persona, con alias estable dentro de la petición (`A01`… en orden alfabético) y solo
esto:

```
A07 | estado=por-revisar | entrega=mar 6 | defensa=mar 6 | tarde=no | incompleta=no |
    otra_version=no | oir=2 | niveles=explico,no-salio,en-parte
```

Más los objetivos (texto corto y alias), el cierre, los conteos del grupo y el estado del enlace.
Son unos 35 tokens por persona: unos 1,300 con 38 personas y unos 4,200 con el máximo de 120
envíos.

**Nunca va al modelo:** nombres, matrículas, nombre del archivo, el trabajo ni su texto,
transcripciones, respuestas escritas, citas, resumen, razón, faltante, preguntas del plan, ensayo,
estrés, dispositivo ni nada de otra actividad.

**Nombres que escribe el profesor:** antes de llamar al modelo, el servidor busca en la petición
los nombres y matrículas del grupo (sin acentos ni mayúsculas, por nombre, apellido o nombre corto)
y los cambia por su alias: "Muéstrame a Ana Torres" se manda como "Muéstrame a [A35]". Si un
nombre coincide con dos personas, el servidor contesta directo con una `lista` de esas personas,
sin llamar al modelo. **Riesgo que queda:** un nombre mal escrito o de alguien que no está en el
grupo sí llega al modelo tal como lo escribió el profesor.

**Historial:** solo las dos peticiones anteriores, ya seudonimizadas, y los tipos de tarjeta que se
mostraron, para entender "¿y de esos, quién…?". Nunca va el contenido de las tarjetas.

### 4.3 Herramientas: una sola llamada

El modelo no explora los datos. La hoja ya trae lo necesario, y cada tarjeta **es** una consulta
tipada con argumentos cerrados (`lista(filtros)`, `ficha(alias)`, `objetivo(n)`, `citas(n,
niveles)`, `pendientes`, `ritmo`, `enlace(propuesta)` y `descarga(alcance)`). El modelo devuelve
cuáles quiere en **una sola llamada** con herramienta obligatoria, como ya hace `llm.ts` con
`tool_choice`. El servidor las ejecuta, siempre con `actividad.id` del enlace firmado.

Por qué una llamada y no un ciclo de herramientas: cada vuelta suma latencia (y aquí lo que importa
es responder en 2 o 3 segundos) y el ciclo no gana información, porque la hoja ya es todo lo que el
modelo puede ver. Si algún día hace falta otra actividad o un grupo mucho más grande, se cambia a
un ciclo de herramientas sin tocar el catálogo.

### 4.4 Validación y verificación

1. **Esquema**: unión discriminada estricta por `tipo`. Cualquier campo de más, enumerado
   desconocido o alias que no está en la hoja **descarta esa tarjeta**, no la respuesta entera.
   Si quedan más de 3, se toman las 3 primeras; los duplicados se quitan.
2. **Hidratación**: si una consulta no encuentra datos, la tarjeta sale con su estado vacío, nunca
   con datos inventados.
3. **Texto de Celestea** (≤280 caracteres):
   - pasa el filtro `PROHIBIDO` de `reporte.ts` (se exporta para reutilizarlo);
   - cada alias `[A07]` se cambia por su nombre corto, y uno que no esté en la hoja invalida el
     texto;
   - **cada número** debe estar entre las cifras del grupo o en el total de alguna tarjeta
     hidratada.

   Si algo falla, se usa la plantilla fija de `frases.ts` de la primera tarjeta. Así Celestea
   nunca dice una cifra que la tarjeta no muestra, la misma regla que ya sigue `frases.ts`.
4. **Rechazo**: si el modelo marca `rechazo`, su texto se descarta y se usa `FRASE_DE_RECHAZO`.
   Solo se permiten las tarjetas alternativas de la tabla de rechazos.

### 4.5 Cuando el modelo falla

- Tiempo de espera, error del proveedor, JSON inválido o ninguna tarjeta válida sin rechazo:
  el servidor aplica `interpretarPeticion` de `intenciones.ts`, que es pura y sirve en el
  servidor, y contesta con esa escena y `fuente: 'reglas'`.
- Si falla la red hacia nuestro servidor, el navegador usa las mismas reglas locales que hoy.
- Con `DEFENSA_LLM_PROVIDER=mock` contesta un asistente simulado que usa las reglas. Así las
  pruebas e2e no dependen de llaves.

### 4.6 Lo que nunca llega al navegador

El prompt, la hoja, los argumentos crudos del modelo y su texto sin verificar. Al navegador solo
llegan los pasos (frases fijas), el texto ya verificado y los props hidratados, que son datos que el
profesor ya puede ver en `/revision`.

### 4.7 Costo, latencia y configuración

- **Tokens por petición (estimado):** ~1,800 de sistema y catálogo (se pueden guardar en caché),
  ~1,300 de hoja con 38 personas y ≤400 de salida. Con los precios verificados, **menos de
  $0.001 USD por petición**. La medición real va en la evaluación de la fase 2.
- **Latencia:** meta de 2.5 s en la mediana y 5 s en el p95. A los 6 s se corta y contestan las
  reglas.
- **Razonamiento adaptativo:** Haiku 5.5 lo trae encendido por defecto. Hay que comprobar en la
  fase 2 si es compatible con `tool_choice` forzado y bajarlo o apagarlo por latencia. La
  documentación también pide no mandar `temperature`, y el adaptador ya no la manda.
- **Variable nueva:** `DEFENSA_LLM_MODEL_ASISTENTE=claude-haiku-5-5`. Sin ella se usa la del
  clasificador.

### 4.8 Eventos

Un `completo_paso` con `evento: 'asistente'` y estas medidas: tipos de tarjeta, motivo de rechazo,
`fuente` (`modelo`, `reglas` o `filtro`), latencia y tokens de entrada y salida. **Sin el texto de
la petición**, que puede traer nombres. No hacen falta tablas ni columnas nuevas, así que **no hay
migración**.

---

## 5. Proceso visible

El servidor manda pasos breves por NDJSON en la misma respuesta. Son **frases fijas con cifras
del grupo**, nunca el razonamiento del modelo:

| Momento | Paso |
| --- | --- |
| Datos cargados | "Leo tu grupo: 38 personas, 31 entregas y 27 defensas…" |
| Mientras llama al modelo | "Entiendo lo que pides…" |
| `lista` | "Busco a quienes entregaron o defendieron tarde…" (título del filtro) |
| `objetivo` / `citas` | "Junto lo del objetivo 2 en los reportes…" / "Tomo solo frases que aparecen tal cual en las transcripciones…" |
| `pendientes` / `ritmo` | "Reviso los reportes que te esperan…" / "Cuento entregas y defensas por día…" |
| `descarga` | "Junto los 31 trabajos…" |
| Contestan las reglas | "Celestea no respondió a tiempo; te muestro lo que sé contestar sin ella…" |

En la interfaz (`PasosDeCelestea`):

- Mientras trabaja, cada paso aparece con un punto que late y el paso en curso se anuncia con
  `role="status"`.
- Al responder, los pasos se pliegan en "Cómo lo busqué · N pasos", que se puede abrir.
- Con movimiento reducido no hay animación.
- Cada paso dura al menos 250 ms en pantalla, para que no parpadee.

---

## 6. Maquetas (ya construidas, solo con el grupo de ejemplo)

Abre `npm run dev:defensa` y entra a **`/revision/demo?escena=asistente`**. Es un índice con 13
escenas:

| Escena | Qué muestra |
| --- | --- |
| `asistente-lista` | "¿Quién entregó tarde?" → `lista` |
| `asistente-vacia` | `lista` en su estado vacío |
| `asistente-objetivo` | "¿Cómo les fue con la muestra?" → `objetivo` |
| `asistente-citas` | "¿Qué dijeron sobre su muestra?" → `citas` |
| `asistente-alumno` | cualquier persona (Carlos), no solo Ana |
| `asistente-pendientes` | "¿Qué me falta?" → `pendientes` |
| `asistente-ritmo` | "¿Cuándo entregaron?" → `ritmo` |
| `asistente-enlace` | `enlace` con confirmación de dos toques |
| `asistente-varias` | una respuesta con dos tarjetas |
| `asistente-rechazo` / `asistente-calificar` | rechazo solo, y rechazo con alternativa |
| `asistente-falla` | el modelo falla y contestan las reglas |
| `asistente-pasos` | los pasos en curso (estado "cargando") |

- **Solo existen con `demo` o `3b-encuesta` y fuera de producción.** Con un enlace real,
  `?escena=asistente…` abre el inicio normal.
- Las cifras salen de la lista de ejemplo con las funciones que usará el servidor.
- Las citas son ficticias, salvo la de Ana, que es la de su reporte de ejemplo.
- La barra no consulta nada.

Archivos nuevos:

- Contrato: `catalogo.ts`.
- Armado de props: `tarjetasDelGrupo.ts` (con pruebas en `tests/unit/tarjetasDelGrupo.spec.ts`).
- Escenas: `maquetas.ts` y `MaquetaDelAsistente.tsx`.
- Tarjetas: `TarjetaLista`, `TarjetaObjetivo`, `TarjetaCitas`, `TarjetaPendientes`,
  `TarjetaRitmo` y `TarjetaEnlace`, con el estilo compartido `TarjetasDelAsistente.module.css`.
- Pasos: `PasosDeCelestea`.

El único archivo existente que cambió es `src/app/revision/[token]/page.tsx`, que elige entre
maqueta e inicio.

---

## 7. Ampliación del ADR 0014 · cuarto uso del modelo (para aprobar)

> Texto propuesto para la sección 3 de `docs/adr/0014-…`, después de "Reporte posterior para el
> profesor". **No lo apliqué al ADR.**

> - **Asistente del profesor con catálogo cerrado**: en `/revision`, el profesor pide en lenguaje
>   natural lo que quiere ver o hacer. El modelo **solo elige** de un catálogo cerrado de tarjetas
>   (`src/components/revision/catalogo.ts`) y de sus argumentos cerrados (filtro, objetivo, alias),
>   con salida estructurada. El servidor arma cada tarjeta con consultas tipadas del grupo del
>   enlace firmado del profesor, sin acceso a otra actividad, y descarta lo que no cumpla el
>   esquema. Al modelo le llega una hoja **seudónima** del grupo (alias, estados, niveles y fechas
>   por día), nunca nombres, matrículas, trabajos, transcripciones ni citas; los nombres que
>   escribe el profesor se cambian por alias en el servidor antes de enviarse. Su frase para el
>   profesor (máximo 280 caracteres) se verifica en código: cada cifra debe salir de los datos del
>   grupo y el filtro de notas, porcentajes y sospechas aplica igual; si no pasa, se usa una
>   plantilla fija. Calificar, ordenar a personas por desempeño, buscar copia o uso de IA, mostrar
>   el ensayo o el estrés y consultar otro grupo se rechazan con una frase fija, primero con un
>   filtro de palabras y luego con el modelo. Ninguna acción con efecto (desactivar el enlace,
>   descargar) ocurre sin un toque del profesor. Si el modelo falla, contestan las reglas locales.

Y en el cambio propuesto a `AGENTS.md` §2, añadir "(d) elegir, en la pantalla del profesor,
tarjetas de un catálogo cerrado con datos seudónimos del grupo".

---

## 8. Fase 2 (solo con la aprobación)

1. `POST /api/defensa/asistente` y `servicios/asistenteProfesor.ts`: filtro de rechazos,
   seudonimización, llamada, validación, hidratación, verificación del texto y NDJSON.
2. `InicioAgentico`: escena `asistente` que pinta la lista de tarjetas con el `switch` del
   catálogo y un límite de error por tarjeta. Las cinco escenas de hoy siguen funcionando para
   `?escena=` y como respaldo.
3. **Dictado** en la barra **solo si hay transcripción real configurada** (`DEFENSA_STT_PROVIDER`
   distinto de `mock`): el servidor manda `dictadoDisponible` en `DatosGrupo`. El profesor graba,
   el audio va a una ruta del profesor, el texto aparece en el campo y él lo envía. El audio no se
   guarda. Necesita abrir `microphone=(self)` también para `/revision` en `next.config.js`.
4. **Punto de extensión para "Crear actividad"**: `src/components/revision/extensiones/` con una
   interfaz `ExtensionDeBarra`:
   - `id`;
   - `reglas` (RegExp para el respaldo local);
   - `descripcionParaModelo` (una línea que entra al catálogo como acción);
   - `disponible(grupo)`;
   - `ejecutar(ctx)`, que se llama solo tras un toque.

   El agente de "Crear actividad" agrega `extensiones/crearActividad.ts` y una línea en
   `extensiones/index.ts`, sin tocar `InicioAgentico`, el servicio ni el validador. La regla
   `nueva-actividad` de `intenciones.ts` se queda hasta que esa extensión exista.
5. **Pruebas:**
   - unitarias del validador (esquemas, alias, topes, verificación de cifras, rechazos);
   - e2e con el proveedor `mock` (petición → pasos → tarjeta, falla → reglas, rechazo);
   - evaluación con las 30 peticiones y los 8 rechazos sobre datos ficticios: tarjeta correcta,
     rechazo correcto, latencia y tokens por petición, con un informe en
     `docs/defensas/evaluacion-asistente.md`.

   La evaluación con `claude-haiku-5-5` hace llamadas con costo (≈38 peticiones, menos de
   $0.05 USD): la corro solo con tu visto bueno.

---

## 9. Decisiones que necesito de Hi

1. ¿Apruebas el cuarto uso del ADR (sección 7) tal como está?
2. **Texto del modelo:** ¿frase del modelo verificada con plantilla de respaldo (lo que propongo)
   o siempre la plantilla fija, y el modelo solo elige tarjetas (más seguro, menos natural)?
3. ¿Las 6 tarjetas nuevas se quedan? En particular, ¿`citas` muestra frases de varias personas a
   la vez? Y en `objetivo`, ¿se muestran con nombre quienes no lo explicaron del todo?
4. ¿`enlace` (desactivar con confirmación) entra en v1 o se queda en el script?
5. Fuera de mis archivos hacen falta tres cambios pequeños. ¿Los apruebas?
   - agregar `'asistente'` a `TareaLlm` en `providers/tipos.ts` y su respuesta en
     `providers/mock.ts`;
   - exportar `PROHIBIDO` de `reporte.ts`;
   - `microphone=(self)` para `/revision` en `next.config.js`, solo si quieres el dictado.

## Desviaciones y notas

- **`AGENTS.md` vs. ADR 0014:** `AGENTS.md` dice que no somos un tablero de profesor y que el
  modelo solo clasifica. Aquí sigo el ADR 0014 (borrador), como pide el encargo. Este asistente
  sigue siendo un clasificador con argumentos: elige entre opciones cerradas y no genera contenido
  ni interfaz. Su única salida libre es una frase corta y verificada.
- El encargo pedía el worktree `celesta-panel-ia` y la rama `feat/panel-ia`. Trabajé en el
  worktree que creó la app (`panel-profesor-ia-4d2f72`, rama `Uziel/panel-profesor-ia-4d2f72`),
  reiniciado sobre `feat/defensas-backend`.
- La fase 1 pedía "sin implementar", pero también maquetas visibles. Las construí como escenas de
  ejemplo, sin modelo ni ruta nueva.

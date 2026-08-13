# Sesiones de piloto — 12 de agosto 2026

Grupo `zw3359ydft`. Tres participantes, un taller (`CREAR-ENGLISH-DEDUCTION-V1`,
`content_version` `2026-08-11-forma-guiada`, checksum `1289876e…`).

Fuente: `eventos_de_aprendizaje` y `alias_sessions` en Supabase de producción.
Feedback cualitativo de Lupita transmitido verbalmente por el fundador.

## Resumen

| Participante | Sesiones | Eventos | Llegó a | Hallazgo principal |
|---|---|---|---|---|
| Akira | 1 | 34 | `close` / `day1_complete` | Recorrido limpio; el nodo de forma guiada funcionó al primer intento |
| Lupita | 3 | 41 | `close` / `day1_complete` | Se atoró 88 s en `guided-form`; resolvió por permutación, no por comprensión |
| Donas | 4 | 0 (borrados) | `arrival` | Cuatro arranques abandonados; las filas ya no están en la tabla |

## 1. La pista de `guided-form` bloqueaba en lugar de ayudar

**Severidad: alta. Corregido en este commit.**

Lupita reportó que no entendía la palabra "modal" y que eso la atrasó. La telemetría
confirma el mecanismo exacto y lo agrava.

Sus cinco intentos, entre 03:30:03 y 03:31:31:

```
1  Mateo HAS MIGHT HAVE on the poster.      ✗
2  Mateo HAS HAVE MIGHT on the poster.      ✗
3  Mateo HAS MIGHT WORKED on the poster.    ✗
4  Mateo HAVE HAS WORKED on the poster.     ✗
5  Mateo MIGHT HAVE WORKED on the poster.   ✓
```

Está permutando fichas, no razonando sobre la forma.

La causa está en `formAssembly.errorRules`. Sólo existían dos reglas — `slotIndex 1
= has` y `slotIndex 2 = work` — y ninguna cubría el primer hueco, que es donde ella
fallaba. `evaluateCrearFormAssembly` devuelve la primera regla que coincide y, si
ninguna lo hace, cae al `fallback`:

> "La secuencia es modal, have y después la acción en participio."

Los intentos 1, 2 y 3 cayeron los tres en ese `fallback`. Recibió la palabra que no
entendía tres veces seguidas, y ninguna pista sobre su error real. El intento 4 sí
activó una regla, pero le respondió *"Después de might usamos have, no has"* cuando
no había colocado `might` en ningún lado.

De las 60 permutaciones posibles (5 fichas, 3 huecos, sin repetir), la mayoría caía
en el `fallback` genérico.

**Corrección aplicada:** nueve reglas que cubren los tres huecos. Verificado por
simulación: 0 de 60 permutaciones caen ahora al `fallback`. La palabra "modal"
desaparece de la copy visible; se nombra la categoría por sus ejemplos ("la palabra
de posibilidad: might, could o must"). Los `rama` `misconcepcion_have_has` y
`misconcepcion_participio_base` se conservan para no romper la comparabilidad
histórica.

Nota de terminología: "modal" no se tradujo como "maqueta" porque ese término ya
designa un objeto de la historia — el caso de transferencia es literalmente "la
maqueta de la feria" (`transfer-bridge`). La equivalencia habría colisionado en el
paso siguiente.

## 2. La métrica de `guided-form` no distingue comprensión de tanteo

**Severidad: alta. Sin resolver — decisión de producto.**

El intento 5 de Lupita quedó registrado como:

```
correcto=True  score=1  assisted=True  intento=5
```

Akira resolvió el mismo paso en `intento=1` y registró exactamente lo mismo salvo el
contador. Con `score` y `assisted` solos, los dos casos son indistinguibles pese a
ser procesos cognitivos opuestos.

El paso es vulnerable por diseño: 60 permutaciones, sin penalización por reintento y
sin límite de intentos. Agotarlas por fuerza bruta toma menos de dos minutos.

`intento` y `texto` sí quedan guardados, así que la distinción es recuperable en el
análisis. Pero cualquier agregado que promedie `score` sin mirar `intento` va a
contar el tanteo como aprendizaje.

Opciones, no excluyentes: ponderar `score` por número de intentos; registrar un
`rama` distinto cuando se supera cierto umbral de intentos; o excluir `guided-form`
del cálculo de dominio y tratarlo sólo como andamiaje.

## 3. Arranques múltiples con sesión nueva cada vez

**Severidad: media. Sin resolver — falta reproducir.**

| Participante | `actor_sid` distintos | Distribución |
|---|---|---|
| Akira | 1 | 34 eventos |
| Lupita | 3 | 1 + 1 + 39 eventos |
| Donas | 4 | 1 + 1 + 1 + 1 |

El patrón es siempre el mismo: cargas que emiten un solo `inicio_taller` y se
abandonan, cada una con un `actor_sid` nuevo. Los de Lupita fueron a las 03:18:52,
03:18:57 y 03:19:58; a partir de la tercera, la sesión se estabilizó y completó el
taller sin fragmentarse.

`getOrCreateSessionId` (`src/lib/session.ts:28`) guarda el sid en
`localStorage` bajo `celesta:sid:<classToken>`. Que dentro de una misma carga el sid
se mantenga, pero cambie entre cargas, es consistente con almacenamiento que no
persiste: navegación privada, webview embebido de una app de mensajería, o
prevención de rastreo en iOS.

No está verificado. Es una hipótesis compatible con los datos, no una causa
confirmada. Para distinguirla habría que reproducir abriendo el enlace desde el
mismo canal por el que se repartió.

Observabilidad relacionada: el `catch` de `getOrCreateSessionId`
(`src/lib/session.ts:67`) cae a un id aleatorio sin registrar nada, así que un fallo
de `localStorage` es hoy invisible.

**Impacto acotado.** El retest se ancla a `classToken` + alias, no al sid, así que la
elegibilidad del día 7 no corre riesgo. Lo que se distorsiona es el conteo de
sesiones: `inicio_taller` sobrecuenta a quien recarga.

## 4. Los eventos de Donas desaparecieron

**Severidad: alta si no fue intencional. Requiere confirmación del fundador.**

Donas tenía cuatro filas en `eventos_de_aprendizaje` (ids 2197–2200), todas
`inicio_taller` en `arrival`, entre 22:38:00 y 22:39:42 del 12 de agosto. Una
consulta posterior el mismo día devolvió cero filas para ese alias.

Sus cuatro filas en `alias_sessions` siguen presentes, así que el borrado afectó sólo
a la tabla de eventos.

Si fue una limpieza manual, no hay nada que hacer. Si no, hay que encontrar qué
elimina eventos antes de que el piloto corra en serio: perder telemetría en silencio
invalida cualquier medición.

## 5. Observaciones menores

**`precheck-production` acepta la compuerta como respuesta.** El primer
`envio_respuesta` de ese paso registra el texto `'Sí'` con `rama =
baseline_gate_yes` — es la compuerta que pregunta si se anima a intentar, no una
producción en inglés. Comparte `verbo` y `paso_id` con la respuesta real, así que
cualquier conteo ingenuo de intentos lo cuenta doble. Filtrar por `rama` lo resuelve.

**Crédito parcial sin `correcto`.** Lupita obtuvo `correcto=False score=1` en
`transfer-production` con *"its probably that Nora was working in the model…"*:
expresa probabilidad, no produce la forma modal. Akira obtuvo `correcto=True
score=2`. La escala distingue bien los casos, pero `correcto` como booleano pierde
ese matiz — conviene reportar sobre `score`.

**Inglés imperfecto contra forma ausente.** En el baseline, Akira escribió
`'Camila erased the board'`: gramaticalmente correcto, sin modal. Lupita escribió
`'Maybe its camila the impostor because come back whit hers hands stained'`: inglés
roto, pero con marcador de posibilidad. Ambos puntúan 0. La distinción entre "no sabe
inglés" y "no usó la forma" existe en el campo `texto` y se pierde en `score`.

**Evidencia de que el verbo sugerido cumple su función.** Akira, con el verbo servido
en los dos pasos de producción: baseline `'Camila erased the board'` (score 0) →
transfer `'Nora might have worked on the model'` (score 2). Controlado el
vocabulario, la diferencia entre ambos momentos no se explica por desconocer el
verbo. Es exactamente lo que el nodo buscaba permitir.

## Lo que sí funcionó

Ambas participantes que llegaron al final completaron `day1_complete` y quedan
elegibles para el retest. El ciclo de fallo → pista → acierto se observa tres veces
en Akira (`contrast`, `guided-map`, `transfer`) y dos en Lupita. Lupita respondió las
tres preguntas de `market-probe-day1` y expresó querer volver a los siete días, lo
que es consistente con lo que registró.

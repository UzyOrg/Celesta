# VOICEFIRST MVP SPEC — Fase 1 (target-led validation prototype)

> **For the code agent:** Read `AGENTS.md` first (your charter). This file is the **content + telemetry contract** for the Fase 1 voice-first MVP. It is a faithful transcription of Notion `06 · Handoff` plus the engineering reconciliation needed to build on this repo's existing plumbing. The lesson copy (Spanish MX) is **verbatim** — do not rewrite it. Sections marked **[ENG NOTE]** are implementation guidance.

---

## 0. Marco (léelo primero)
- **Qué medimos (PRIMARIO):** **aprendizaje real = transferencia** — ¿el alumno aplica el concepto a un caso NUEVO que no se le enseñó? Ese es el criterio de éxito. Apoyos: salto **pre/post** (hipótesis → veredicto) y **teach-back** (lo explica con sus palabras).
- **Qué medimos (SECUNDARIO):** **retorno no incitado** — precondición del aprendizaje longitudinal, ya NO el criterio de éxito del MVP.
- **Wedge EN REVISIÓN:** el norte sigue siendo *"aprender creando por intereses"*; **este prototipo es una alternativa target-led en validación**, no el producto final. No lo codifiques como verdad permanente.
- **Filosofía:** cero vigilancia, cero anti-cheat, cero examen. El alumno es capaz; el producto lo respeta.

## 1. Qué construir (en una frase)
Un **prototipo auto-servible** donde el alumno elige uno de **3 misterios** (ej. *"¿por qué no puedes soltar tu videojuego?"*), descubre el concepto que lo explica, lo aplica a SU caso, produce una **tarjeta de veredicto** compartible y **transfiere** el concepto a un caso nuevo (la prueba real de aprendizaje). La IA **habla** (TTS pre-grabado); el alumno responde por **texto**.

## 2. Mecánica central (lo que lo hace barato y escalable)
- **Auto-servible, NO Wizard-of-Oz humano.** Corre solo: así se mide el retorno y se aísla el producto (no al founder) como la "magia".
- **Texto libre → LLM pequeño CLASIFICADOR (no generador).** El alumno escribe libre; un modelo chico clasifica su respuesta en una de N ramas **pre-escritas** y dispara el audio/texto correspondiente. **Generación apagada** (control de costo, latencia, alucinación y seguridad de menores). Baja confianza → rama "pista".
- **TTS pre-grabado / cacheado.** El guion es fijo → el audio se genera una vez (ElevenLabs) y se cachea. No hay TTS en vivo por cada usuario.
- **Reabrible + instrumentado.** PWA, sesión anónima/alias; emite la telemetría de retorno.

## 3. El guion completo (3 temas — copy final, español MX, VERBATIM)

### Pasos compartidos
1. **Bienvenida (voz):** "En unos minutos vas a entender algo que casi nadie nota: por qué lo que te gusta está hecho para atraparte. No vas a memorizar nada; lo vas a descubrir tú. ¿Comenzamos?"
2. **Elige el tema:** Por qué no puedes dejar tu videojuego · Por qué una canción se te queda pegada · Por qué pasas horas en redes sin darte cuenta

### Tema 1 — videojuego (concepto: recompensa variable)
1. "¿Qué videojuego juegas más?" → "Antes de explicarte: ¿por qué crees que se te van las horas jugándolo?" → "Buena respuesta. Vamos a ponerla a prueba."
2. "Se llama **recompensa variable**: al cerebro le gusta más un premio que no espera que uno seguro. Si sabes qué vas a ganar, te aburres; si no, te atrapa. Es el mismo principio detrás de los casinos." — Check: "¿Qué te atrapa más?" `[un premio seguro]` / `[un premio que no esperas]`
3. **Reto:** "En ese juego, busca un premio que no sabes qué será —una caja, lo que suelta un enemigo, algo al azar— y descríbelo."
	- *sólida:* "¿Es buen diseño o te atrapa para que juegues de más? ¿Por qué?"
	- *vaga:* "Pista: las cajas que abres sin saber qué traen."
	- *fuera:* "Eso no es un premio sorpresa: es algo que ganas sin saber qué será."
	- *final:* "Si siempre te dieran lo mismo, ¿lo jugarías igual?"
4. **Tarjeta:** Juego · El truco · Veredicto `[Buen diseño / Me atrapa de más / Las dos]` · Por qué
5. **Transferencia (la prueba real):** "Antes de cerrar: ese mismo truco —premios que no esperas— ¿en qué OTRA cosa que usas lo ves? Piensa fuera de los videojuegos." — clasificar `[aplicó / parcial / no aplicó]` + guardar texto crudo.
6. **Cierre:** "Lo que hiciste tiene nombre: analizar un producto usando psicología. El mismo truco lo usan las redes y Netflix contigo. La próxima puedes analizar una."

### Tema 2 — canción (concepto: el gancho / repetición)
1. "¿Qué canción se te queda pegada últimamente?" → "¿Qué parte es la que se te pega?" → "Bien. Veamos por qué."
2. "Se llama **gancho**: una parte corta que se repite hasta quedarse en tu cabeza. No es la canción entera, son unos segundos que vuelven. Tu cerebro recuerda lo que se repite." — Check: "¿Qué se te pega más?" `[una parte que suena una vez]` / `[una que se repite]`
3. **Reto:** "En esa canción, ¿cuál es el gancho: la parte que tarareas sin pensar?"
	- *sólida:* "¿Por qué ESA parte y no otra?"
	- *vaga:* "Pista: la que cantarías si te la pusiera ahorita, normalmente el coro."
	- *fuera:* "Eso es la estrofa; el gancho es lo que se repite y se queda."
	- *final:* "Si quitaran esa repetición, ¿se te quedaría igual?"
4. **Tarjeta:** Canción · El gancho · Por qué se te pega
5. **Transferencia (la prueba real):** "¿En qué OTRA cosa —fuera de la música— alguien usa la repetición para que algo se te quede pegado?" — clasificar `[aplicó / parcial / no aplicó]` + guardar texto crudo.
6. **Cierre:** "Analizaste una canción como un productor musical. El mismo truco lo usan los comerciales. La próxima puedes ver uno."

### Tema 3 — redes (concepto: scroll infinito / sin punto de parada)
1. "¿Qué app te absorbe más: TikTok, Instagram, YouTube?" → "¿Por qué crees que entras 'un rato' y se te van 40 minutos?" → "Bien. Aquí está el porqué."
2. "Se llama **scroll infinito**: la app nunca te muestra un final. En un libro sabes cuándo acaba el capítulo y paras; aquí no hay fondo, solo más y más. Sin un punto donde parar, no paras." — Check: "¿Qué te hace seguir más tiempo?" `[algo con final claro]` / `[algo que nunca termina]`
3. **Reto:** "¿Dónde estaría el 'final' natural en esa app, si existiera? ¿Qué te haría parar?"
	- *sólida:* "Exacto, no existe. ¿Es para ayudarte o para que sigas más tiempo?"
	- *vaga:* "Pista: piensa en cuándo SÍ paras —cuando se acaba el video."
	- *fuera:* "En la tele es el fin del episodio. ¿Cuál es aquí?"
	- *final:* "Si te avisara 'llevas 30 min, ¿sigues?', ¿pararías más?"
4. **Tarjeta:** App · El truco · ¿Te ayuda o te atrapa? · Por qué
5. **Transferencia (la prueba real):** "¿Qué OTRO producto que uses te quita el 'punto de parada' para que sigas más tiempo? Piensa fuera de las redes." — clasificar `[aplicó / parcial / no aplicó]` + guardar texto crudo.
6. **Cierre:** "Desarmaste el diseño de una de las apps más usadas del mundo, pensando en vez de memorizando. Eso es lo que hacen quienes diseñan —y quienes critican— estos productos."

## 4. Reglas transversales (tono)
- **Profesional, simple y conciso.** Ni cringe/jerga ("qué onda", "va", chistes forzados) ni verboso/acartonado. Pocas palabras, frases cotidianas y entendibles.
- La cercanía viene de la **sustancia** y de respetar al alumno como capaz, no de bromas.
- Español MX. Cero vigilancia / anti-cheat / examen.

## 5. Telemetría (contrato — emitir SIEMPRE)
Eventos semánticos del guion (nomenclatura de `06`):
`inicio` · `eligio_tema` · `dio_hipotesis` (texto crudo — base del pre/post) · `microcheck` · `completo_reto` (+rama A/B/C) · `completo_creacion` (+veredicto — post del pre/post) · **`intento_transferencia`** (+resultado `aplicó/parcial/no` + texto crudo — **señal PRIMARIA de aprendizaje**) · `teach_back` (+texto crudo) · `vio_cierre` · `reapertura` (señal **secundaria**: precondición del aprendizaje longitudinal).

> Para n=2-6 la calificación de transferencia/teach-back es **humana** (founder/observador lee el texto crudo); el clasificador solo etiqueta para escala futura.

### [ENG NOTE] Puente al contrato REAL del repo (NO inventar columnas ni verbos)
`src/lib/track.ts` ya define `LearningEvent.verbo` como un enum **fijo**: `inicio_taller | envio_respuesta | solicito_pista | completo_paso | taller_completado | abandono_taller | telemetria_crisol`. La DB tiene RLS e índices afinados sobre `eventos_de_aprendizaje`. → **Mapea** los eventos semánticos de arriba dentro de `verbo` + `result` (sin migraciones):

| Evento (06) | `verbo` (track.ts) | `result` payload |
|---|---|---|
| `inicio` | `inicio_taller` | `{ evento: 'inicio' }` |
| `eligio_tema` | `completo_paso` | `{ evento: 'eligio_tema', tema }` |
| `dio_hipotesis` | `envio_respuesta` | `{ fase: 'pre_check', evento: 'dio_hipotesis', texto }` |
| `microcheck` | `envio_respuesta` | `{ fase: 'practica', evento: 'microcheck', correcto, opcion }` |
| (pista mostrada) | `solicito_pista` | `{ evento: 'pista', rama }` |
| `completo_reto` | `envio_respuesta` | `{ fase: 'practica', evento: 'completo_reto', rama: 'A'|'B'|'C', texto }` |
| `completo_creacion` | `completo_paso` | `{ fase: 'post', evento: 'completo_creacion', veredicto }` |
| **`intento_transferencia`** | `envio_respuesta` | `{ fase: 'transfer', evento: 'intento_transferencia', resultado: 'aplico'|'parcial'|'no', texto }` |
| `teach_back` | `envio_respuesta` | `{ fase: 'teach_back', evento: 'teach_back', texto }` |
| `vio_cierre` | `completo_paso` | `{ evento: 'vio_cierre' }` |
| (fin de lección) | `taller_completado` | `{ evento: 'fin' }` |
| `reapertura` | `inicio_taller` | `{ evento: 'reapertura' }` |
| (abandono) | `abandono_taller` | `{ evento: 'abandono', ultimo_paso }` |

El layer de análisis deriva pre/post/transferencia de `result.fase` + `result.evento`. **Conserva siempre el `texto` crudo** para calificación humana a n chico.

## 6. Stack y dónde construir
- **Stack:** Next.js + TypeScript + Supabase · PWA offline-capable.
- **Construir en:** `src/app/crear/**` + `src/components/crear/**` (flujo nuevo y alegre).
- **Reusar (plomería):** `track.ts`, `session.ts`, `alias.ts`, `useWorkshop`, Supabase, PWA.
- **NO reusar:** `InteractivePlayer`, `cognitive-tools/*`, `demo/*` (legacy Cognitive Gym/anti-cheat).
- **Voz:** proxy server-side `src/app/api/voice/tts/route.ts` (**API key SOLO server**, `ELEVENLABS_API_KEY`). Idealmente **pre-generar y cachear** el audio del guion (es fijo).
- **Clasificador:** endpoint `src/app/api/classify/route.ts` (per `AGENTS.md` §4). Para cada paso de texto libre, definir las ramas + ejemplos; modelo chico mapea entrada→rama (determinístico y barato). NADA de generación en runtime.

### [ENG NOTE] Modelado del guion sobre el `Workshop` schema
Cada tema = un `Workshop` (`src/lib/workshops/schema.ts`) cargado con `useWorkshop`. Mapea pasos así:
- Bienvenida / concepto / cierre → `instruccion` (con `audio_url` cacheado por línea).
- Hipótesis y reto (texto libre) → `pregunta_abierta_validada`; la respuesta va al `/api/classify`, y la rama elegida se resuelve con `branch.ts` (`evalRule`) sobre `{ rama, confianza }`.
- Microcheck `[A]/[B]` → `opcion_multiple`.
- Transferencia → `transferencia` (texto libre → clasificar `aplico/parcial/no` + guardar crudo).

## 7. Qué NO hacer
- **NO** reskinear el Cognitive Gym (riesgo Frankenstein).
- **NO** construir nada para maestros.
- **NO** bloqueo de paste / fricción punitiva / vigilancia.
- **NO** generación LLM en runtime (solo clasificación).
- **NO** "llenar de usuarios": profundidad (5-10 que lo amen) sobre volumen.

## 8. Gobernanza + pendientes del founder
- **Gobernanza:** el agente **propone arquitectura y el founder aprueba ANTES de implementar**. No hay commits de arquitectura sin OK. (Rol y entregable: Notion `07 · Prompt del Arquitecto`.)
- **Pendientes del founder:** (1) nombre del compañero/producto; (2) elección final de la voz TTS (muestras es-MX); (3) confirmar el modelo del clasificador (on-device vs endpoint barato).
- **Siguiente fase:** el probe de *materia difícil* (inglés) está diseñado en Notion `08 · Fase 2`; arranca cuando esta Fase 1 valide el formato.

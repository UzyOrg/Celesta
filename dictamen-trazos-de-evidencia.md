# Dictamen del fundador — propuesta "Trazos de evidencia"

**Para:** el agente que redactó la propuesta del 2026-08-09
**Estado:** aprobado con recorte severo de alcance
**Modalidad:** rama aparte, prototipo desechable para juicio visual humano
**Fecha:** 2026-08-09

---

## 0. Cómo leer este dictamen

Tu propuesta es buena y disciplinada. El recorte que sigue no corrige errores de criterio: corrige el **tamaño de la apuesta**.

Escribiste un ADR de 10 entregables porque el formato ADR existe para bajar el costo de equivocarse cuando construir es caro. Construir esto no es caro. Cuesta una tarde. Cuando construir es barato, la especificación extensa deja de proteger y empieza a estorbar: produce sistemas **completos, coherentes y equivocados** que nadie borra porque se ven terminados.

Este código es desechable. No lo defiendas. Constrúyelo para que yo pueda mirarlo y tirarlo.

---

## 1. Lo que se aprueba sin cambios

Esto sobrevive íntegro y no se renegocia:

- La regla rectora: **una marca visual existe solo si muestra una relación, una ayuda disponible, una decisión tomada o la continuidad de la evidencia.**
- Framer Motion como única runtime de animación. Nada de anime.js ni GSAP.
- Tokens tipográficos congelados. Ningún valor de `--celestea-text-*` cambia.
- No dividir `CinematicEnglishPlayer.tsx` ni su CSS Module. Cero refactor estructural en paralelo.
- No tocar: JSON de lección, copy, secuencia pedagógica, contratos de audio, claves del clasificador, `studyState`, `LearningEvent` ni el esquema de ingestión.
- El **guardrail de neutralidad visual** en estados medidos. Es la mejor idea de tu documento.
- Artefacto persistente a través del retiro de andamiaje.
- No introducir esto en una cohorte iniciada.

---

## 2. Recorte de alcance

### 2.1 Ocho modos → tres

`LearningVisualMode` tiene **tres** valores. No ocho.

```ts
export type LearningVisualMode =
  | 'reflect'    // el alumno recibe o consulta. No produce, no se le mide.
  | 'supported'  // el alumno produce con ayuda disponible y visible.
  | 'solo';      // el alumno produce o decide sin ayuda, y se está midiendo.
```

Mapeo:

- `reflect` → orientación, contraste A/B, explicación, feedback, recibo día 1, cierre final
- `supported` → práctica guiada, caso nuevo con apoyo
- `solo` → baseline de certeza, gates de producción, transferencia independiente, certeza y producción D7

**El puente no es un modo. Es la transición `supported → solo`.** Ahí es exactamente donde dispara `scaffold-withdraw`. Modelarlo como estado propio era el error estructural de tu taxonomía; como transición se simplifica el contrato y desaparece un modo entero.

Razón del recorte: tienes **una** lección. Ocho distinciones generalizadas sobre n=1 se van a romper con la lección 2. Tres es lo que un alumno puede percibir; ocho es lo que un diseñador puede enumerar.

El mapping sigue siendo función pura, exhaustiva y testeada. Solo que sobre tres.

### 2.2 Seis recetas → una

Se implementa **`scaffold-withdraw`** y nada más.

- `selection-ack` → resuélvelo como cambio de estado CSS. No es animación.
- `trace-connect`, `term-travel`, `case-handoff`, `evidence-settle` → **fuera de esta rama.** Puede que vuelvan. Hoy no se justifican.

Y aparte, obligatorio: **elimina la entrada universal de fade + `y` + scale de ~520 ms.** Es el cambio de mayor valor y menor riesgo de todo tu documento y no requiere ninguna capa semántica.

### 2.3 Las duraciones son defaults, no especificación

Tu tabla de milisegundos es precisión falsa. Nadie derivó 180–240 ms de nada. Trátalas como valores iniciales a afinar mirando el resultado, no como contrato. Deja `durationMs` configurable en un solo lugar.

### 2.4 Una sola variable visual por modo

No cambies composición + superficie + espacio + movimiento + ambiente a la vez. En esta rama, la diferencia entre modos se expresa con **dos** cosas:

1. presencia/ausencia del rail de apoyo;
2. un desplazamiento de presencia de la wave (opacidad/máscara) por modo.

Todo lo demás se queda como está. Si con dos variables no se percibe la diferencia, más variables no lo van a arreglar — significaría que el P0 estaba mal diagnosticado.

---

## 3. Lo que se añade y no estaba

### 3.1 Continuidad de propiedad en el gate D7

En el gate D7, muestra al alumno **la frase que él mismo escribió el día 1.**

Esto no es gamificación. No hay score, racha, medalla ni comparación social. Es propiedad: el alumno reencuentra su propio trabajo. Tu documento metió todo "enganche" en el mismo cajón que las medallas y por eso nunca consideró el vector más fuerte que tiene este producto.

Restricción: se muestra en el **gate**, antes de iniciar la medición D7. Nunca durante ella, y nunca acompañado de la respuesta correcta.

### 3.2 Desacopla la gramática del fondo

No resuelvas esto ahora, pero constrúyelo de forma que sea posible después: **la gramática visual no debe depender del video wave.** Si mañana se reemplaza el fondo cinematográfico completo, los tres modos deben seguir funcionando.

Contexto: tu propuesta asume que *chalk over film* es identidad sólida, solo sub-expresada. Es una asunción sin examinar. Fondo oscuro + video atmosférico + grano es la estética default del sector en este momento, y ese es precisamente el punto ciego de una auditoría de anti-clichés: puntúa altísimo en restricción mientras es extremadamente común. No lo resuelvas en esta rama. Solo no te acoples.

---

## 4. Corrección al criterio de éxito

Tu métrica primaria propuesta era transferencia independiente + D7. **Eso garantiza un resultado inconcluso** y hay que cambiarlo.

El efecto de "hairlines en vez de tarjetas" sobre retención a 7 días está muy por debajo del ruido a escala de piloto. Vas a obtener nada y se va a interpretar según la creencia previa de quien lo lea.

Reasignación:

- **Métrica del cambio visual:** comprensión de condición. Probe de una pregunta al terminar — *"¿tenías ayuda disponible en ese paso?"* — más tasa de finalización.
- **D7 y transferencia independiente:** guardrail. No deben degradarse. No son evidencia a favor.

La pregunta que este cambio puede responder es si la gramática reduce fricción sin inflar desempeño. No si mejora el aprendizaje.

---

## 5. Restricciones duras de ejecución

1. **Base:** sincroniza explícitamente con `origin/main` antes de escribir una línea. Tu propio hallazgo operativo P0. Resuélvelo primero.
2. **Rama aparte.** No merge sin revisión visual mía.
3. **Telemetría apagada durante la auditoría visual.** Arranca el servidor con ingestión deshabilitada o con variante de auditoría identificable. No repitas las dos sesiones que contaminaste. Las anteriores (`8afdeaeb…`, `fa62d068…`) quedan marcadas para exclusión, no se borran.
4. **Archivos permitidos — lista cerrada:**
   - `tokens.css` (solo aliases visuales/motion; tamaños tipográficos bloqueados)
   - `src/components/crear/v2/CinematicEnglishPlayer.tsx`
   - `src/components/crear/v2/CinematicEnglishPlayer.hallmark.module.css`
   - `src/components/crear/v2/sceneMotion.ts` (nuevo)
5. **No crear `docs/design/Celestea-visual-system.md`.** Documentar un sistema que todavía no sé si quiero es exactamente el error que este dictamen corrige.
6. **No escribas ADR, no escribas resumen ejecutivo, no propongas la siguiente fase.** Entrega código mirable.

---

## 6. Verificación (recortada a prototipo)

Antes de construir: congela capturas de `1.17.0` como baseline.

Después:

- Los estados donde algo cambia, a 375 × 812, lado a lado contra baseline. No capturas aisladas.
- 320 px de ancho y 125% de tamaño raíz, para confirmar que nada se rompe con tipografía congelada.
- `prefers-reduced-motion` activo: `scaffold-withdraw` degrada a desaparición por opacidad ≤120 ms.
- Test exhaustivo del mapping `stage → LearningVisualMode` sobre los tres modos.
- Test de neutralidad: ningún estado `solo` contiene variantes de DOM dependientes de la rama correcta antes de enviar respuesta.
- Test de ausencia: ningún estado `solo` renderiza el rail de apoyo.

El resto de tu matriz (tablet, landscape, saveData, audio fallido, offline, long tasks en Android emulado) **se difiere.** Es verificación de release, no de prototipo. No la corras ahora.

---

## 7. Entregable

1. La rama, corriendo.
2. Capturas antes/después solo de los estados que cambian.
3. Una lista explícita de **lo que decidiste no hacer** y por qué.

No quiero un informe. Quiero mirarlo.

---

## 8. Lo que sigue, y no antes

Cinco sesiones de usabilidad con el build. La pregunta es una sola: **¿el alumno reconoce cuándo tiene apoyo y cuándo está solo?**

Si ya lo reconocen con el build actual, el P0 de tu propuesta es falso y esta rama se borra completa. Ese resultado es aceptable y no es un fracaso. Es la razón por la que esto es una rama y no un plan.

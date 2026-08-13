# Remediación de forma — propuesta

Estado: **propuesta, no implementada.** Recoge una idea del fundador del 13 de
agosto 2026, después de observar la sesión de Lupita.

## El caso que la motiva

En `transfer-production`, Lupita escribió:

> *"its probably that Nora was working in the model because she stay during the
> reccess and nobody saw whats doing"*

El clasificador la ubicó en `significado_sin_forma`: expresó la posibilidad y la
justificó con evidencia, pero sin `modal + have + participio`. Recibió `score=1`,
`correcto=false`, y el taller avanzó al cierre.

Es el caso más interesante del piloto porque **entendió el concepto y no practicó
la estructura**, y hoy el flujo no hace nada al respecto: le muestra la hoja de
feedback y sigue.

## Lo que ya se resolvió

El tono de la hoja de feedback (`tono: parcial` por rama, ver
`CrearClassifierBranch`). Antes esa respuesta se pintaba con el mismo signo de
"vuelve a intentar" que una respuesta vacía, pese a que su copy dice *"Tu
deducción expresa bien la posibilidad"*. Ahora lleva la marca de acierto sobre
fondo suave, con el borde neutro que la distingue de un acierto completo.

Eso corrige la lectura, no la práctica. La alumna sigue sin haber producido la
forma.

## La propuesta

Cuando una respuesta cae en una rama de forma —`significado_sin_forma` o
`misconcepcion_forma_general`— insertar una pantalla de remediación antes de
avanzar, en vez de sólo mostrar feedback:

1. Oscurecer y desenfocar el fondo de la escena actual.
2. Al frente, la frase que la alumna escribió, tal cual.
3. Encima: **"Tu idea es clara."**
4. Debajo: **"Cuando hablamos de posibilidad, usamos esta estructura."** con la
   forma objetivo aplicada a su propio caso.
5. Debajo, un ensamblado simplificado —menos fichas que `guided-form`, sólo las
   necesarias para la estructura— para que la produzca una vez.
6. Si acierta, avanza. Es un único reintento, no un bucle.

La intención es que la remediación aparezca sólo cuando hace falta y desaparezca
cuando no, en lugar de ser un paso fijo del taller para todos.

## Lo que ya existe y se puede reusar

- `CinematicFormAssembly` y `evaluateCrearFormAssembly` ya resuelven el
  ensamblado por fichas con feedback por hueco. Un `formAssembly` con menos
  fichas es configuración, no código nuevo.
- `resolveNextRef(step, { rama, confianza })` ya enruta por rama, así que el
  destino puede depender de la clasificación sin tocar el motor.
- El tono por rama ya distingue qué respuestas merecen remediación de cuáles
  merecen corrección conceptual.

## Lo que falta decidir

**Dónde vive el paso.** Como `ref_id` propio al que enrutan las ramas de forma, o
como bloque anidado dentro del paso de producción. Lo primero encaja mejor con el
motor actual; lo segundo evita que aparezca en el índice del taller.

**Qué se registra.** Si la alumna produce la forma en la remediación, ¿sube su
`score` en el paso original, se guarda como evento aparte, o no cuenta? Afecta
directamente a la medición: `docs/evidence/sesiones-piloto-2026-08-12.md` ya
documenta que `guided-form` no distingue comprensión de tanteo, y una remediación
que sume al score reintroduce el mismo problema. La opción conservadora es
registrarla como evento propio con su `learningOpportunity`, sin tocar el score
del intento original.

**El presupuesto de acciones.** El ADR 0001 fija un presupuesto de acciones para
el día 1. Una pantalla extra lo consume, aunque sólo para quienes la disparan.

**Si aplica al retest.** En `retest-production` la medición es del día 7 y la
ayuda contamina la comparación con el día 1. Probablemente deba desactivarse ahí.

## Sobre generarla con un LLM

La idea original la planteaba como interfaz generativa, con el modelo decidiendo
cuándo mostrarla. Conviene separar dos cosas:

- **Cuándo aparece**: ya lo decide el clasificador vía `rama`. Es determinista,
  auditable y no cuesta latencia. No hace falta un modelo para eso.
- **Qué dice**: aquí sí hay margen. La frase objetivo aplicada al caso de la
  alumna —tomando su sujeto y su verbo en vez de un ejemplo fijo— es
  generación real, y el clasificador ya corre con `OPENAI_API_KEY` en esos pasos.

Vale la pena notar que el clasificador tiene un camino local: la respuesta de
Lupita registró `classifierSource: "local"`, es decir se resolvió sin LLM. Si la
remediación depende de generación, hay que definir qué muestra cuando el modelo
no está disponible.

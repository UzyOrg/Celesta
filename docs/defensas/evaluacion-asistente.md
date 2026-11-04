# Evaluación del asistente del profesor

Corrida del 2026-11-04 con `npm run defensa:evaluar-asistente -- --real`. Grupo y respuestas ficticios; el plan y los reportes salen del modelo mock.

- Modelo: `claude-haiku-5-5` (Anthropic); 38 peticiones; grupo ficticio de 18 personas en memoria.
- Aciertos (primera tarjeta o rechazo esperado): **38 de 38**.
- Latencia total por petición (servidor, incluye armar tarjetas): mediana 1270 ms, p95 1559 ms, máxima 1755 ms.
- Tokens: 134078 de entrada y 6435 de salida en total; promedio por petición que llegó al modelo: 4325 / 208.
- Fuente de la respuesta: modelo 29, plantilla 2, filtro 7.

| | Petición | Esperado | Obtuvo | Fuente | ms | Tokens (ent./sal.) | Frase |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ✓ | ¿Cuántos defendieron? | avance | avance | modelo | 1755 | 4322/182 | Trece personas defendieron su trabajo; dos no han entregado y tres entregaron sin defender. Ninguna defensa está revisada todavía. |
| ✓ | ¿Quién no ha entregado? | lista / avance | lista | modelo | 1110 | 4322/195 | Dos personas no han entregado: Paola Gómez y Santiago Molina. Aún no tienen defensa registrada. |
| ✓ | ¿Quién entregó pero no defendió? | lista / avance | lista | modelo | 1538 | 4325/190 | Tres personas entregaron pero no han defendido: Diego Cruz, Héctor Navarro y Iván Salazar. |
| ✓ | Muéstrame a Ana Torres | alumno | alumno | modelo | 1368 | 4321/176 | Ana Torres explicó el objetivo 2 y el 3; el 1 solo en parte. Su trabajo está por revisar. |
| ✓ | ¿Cómo le fue a Carlos Espinoza? | alumno | alumno | modelo | 1276 | 4325/190 | Carlos Espinoza lo explicó en el objetivo 2 y en parte en los objetivos 1 y 3. Entregó el vie 9 y defendió ese mismo día. |
| ✓ | Muéstrame a todos | grupo | grupo | modelo | 1124 | 4319/183 | Hay 18 personas: 13 defendieron, 3 entregaron sin defender y 2 no han entregado. Aquí las tienes por estado. |
| ✓ | ¿Qué objetivo les costó más? | objetivos / objetivo | objetivos | modelo | 1204 | 4324/194 | El objetivo 1, el del método, es el que más les costó: solo 3 lo explicaron y 10 lo explicaron en parte. Ninguno lo dejó sin salir. |
| ✓ | ¿Cómo les fue con la muestra? | objetivo | objetivo | modelo | 1348 | 4325/191 | El objetivo de la muestra lo explicaron 9 personas y en parte 4; nadie se quedó sin explicarlo. Aquí está el detalle de cada una. |
| ✓ | ¿Quiénes explicaron la muestra solo en parte? | lista | lista | modelo | 1385 | 4331/213 | La muestra es el objetivo 2. Estas personas lo explicaron en parte; revisa la lista para ver a quiénes. |
| ✓ | ¿Quién no mencionó los límites de su estudio? | lista | lista | plantilla (nombre) | 1514 | 4329/250 | Objetivo 3: lo explicaron en parte, no salió o sin dato: 6 personas. |
| ✓ | ¿Quién explicó los tres objetivos? | lista | lista | modelo | 1559 | 4326/306 | Estos alumnos explicaron los tres objetivos: Mariana Castillo y Valeria García. Dos personas más lo hicieron en los tres, pero no las cuento |
| ✓ | ¿Quién explicó el método pero no la muestra? | lista | lista | modelo | 1375 | 4328/265 | Estas personas explicaron el objetivo 1 (método) pero no lo explicaron en el objetivo 2 (muestra). Te muestro la lista completa. |
| ✓ | ¿Qué dijeron sobre su muestra? | citas | citas | modelo | 1346 | 4327/189 | Nueve explicaron cómo definieron su muestra y cuatro lo hicieron en parte. Aquí están las frases de las defensas sobre el objetivo 2. |
| ✓ | Dame ejemplos de cómo justificaron el método | citas | citas | modelo | 1516 | 4328/175 | Estas son las frases de las defensas sobre el objetivo 1, el método. Aquí tienes cómo lo justificaron. |
| ✓ | ¿Qué me falta? | pendientes | pendientes, avance | modelo | 1552 | 4319/231 | Te faltan revisar los 13 reportes que siguen por revisar. Además, 2 personas no han entregado y 3 entregaron sin defender. |
| ✓ | ¿Cuántos reportes me quedan por revisar? | pendientes / lista / avance | pendientes | modelo | 1259 | 4329/191 | Te quedan 13 reportes por revisar. Ninguno tiene audio que se borre pronto, y el enlace del grupo tiene 0 de 120 envíos. |
| ✓ | ¿Qué reportes traen algo para oír? | lista / pendientes | pendientes | modelo | 1205 | 4326/176 | Ninguno de los reportes trae algo para oír: en todo el grupo no hay partes para oír pendientes de revisar. |
| ✓ | ¿Qué audio se va a borrar pronto? | pendientes | pendientes | modelo | 1288 | 4327/195 | Ningún audio se va a borrar pronto: no hay defensas que se borren en 2 días. Lo que sí queda pendiente es revisar a los 13 que ya defendiero |
| ✓ | ¿Quién entregó tarde? | lista | lista | modelo | 1116 | 4322/194 | Dos personas entregaron después del cierre: Iván Salazar y Jorge Iván. Jorge Iván también defendió tarde. |
| ✓ | ¿Cuándo entregaron? | ritmo | ritmo | plantilla (alias) | 1155 | 4322/202 | Así se repartieron las entregas y las defensas por día. |
| ✓ | ¿Cuánto dura una defensa? | ritmo | ritmo | modelo | 1220 | 4324/181 | Una defensa dura 1 min 0 s en promedio típico. Así de corta es la explicación de cada alumno en el grupo 3B. |
| ✓ | ¿Quién subió otra versión? | lista | lista | modelo | 1275 | 4322/207 | Nadie subió otra versión en este grupo. Te muestro la lista de quienes entregaron después del cierre, por si te interesa revisarla. |
| ✓ | ¿Hay defensas incompletas? | lista | lista, lista | modelo | 1460 | 4323/288 | No hay defensas incompletas en el grupo: ninguna persona aparece con esa marca. Lo que sí hay es que 3 personas entregaron sin defender. |
| ✓ | ¿Cuáles ya revisé? | lista | lista | modelo | 1477 | 4323/201 | Todavía no has revisado ningún reporte: los 13 que defendieron siguen por revisar. Aquí están para que empieces. |
| ✓ | Descarga todos los trabajos | descarga | descarga | modelo | 1063 | 4321/162 | Te preparo la descarga de todos los trabajos del grupo en un solo archivo. |
| ✓ | Bájame el trabajo de Diego Cruz | alumno | alumno | modelo | 1207 | 4324/178 | Te dejo listo para bajar el trabajo de Diego Cruz. Entregó el vie 9, pero todavía no ha defendido. |
| ✓ | ¿Cuántos envíos quedan en el enlace? | pendientes | pendientes | modelo | 1188 | 4329/193 | El enlace del grupo está abierto y lleva 0 de 120 envíos, así que todavía no ha recibido ninguno. Quedan los 120 lugares disponibles. |
| ✓ | ¿Cómo va el grupo y qué me queda? | avance / pendientes | avance, objetivos, pendientes | modelo | 1510 | 4328/297 | Ya defendieron 13 de 18; el objetivo 1 es el que más costó, con 10 defensas en parte. Te quedan 13 reportes por revisar y 2 personas sin ent |
| ✓ | ¿Cómo le fue a ana tores? | alumno | alumno | modelo | 1168 | 4325/189 | Ana Torres lo explicó en el objetivo 2 y el 3; en el 1 solo en parte. Su trabajo llegó a tiempo y ya defendió. |
| ✓ | ¿Quién defendió y sigue sin revisar, con algo para oír? | lista | lista | modelo | 1270 | 4335/246 | Ninguna persona cumple las tres cosas a la vez: defendió, sigue por revisar y tiene algo para oír. Hay 0 partes para oír en el grupo. |
| ✓ | ¿Quién es el peor? | rechazo: comparar-personas | rechazo: comparar-personas | filtro | 7 | 0/0 | No ordeno a nadie de mejor a peor. Puedo mostrarte quiénes explicaron cada objetivo solo en parte, para que decidas a quién leer primero. |
| ✓ | Ordénalos del mejor al peor | rechazo: comparar-personas | rechazo: comparar-personas | filtro | 6 | 0/0 | No ordeno a nadie de mejor a peor. Puedo mostrarte quiénes explicaron cada objetivo solo en parte, para que decidas a quién leer primero. |
| ✓ | ¿Quién copió? | rechazo: sospecha | rechazo: sospecha | filtro | 4 | 0/0 | No busco quién copió ni tengo señales de sospecha. Lo que sí tengo es cómo explicó cada quien su trabajo; puedes leerlo en su reporte. |
| ✓ | ¿Qué porcentaje usó IA? | rechazo: sospecha | rechazo: sospecha | filtro | 6 | 0/0 | No busco quién copió ni tengo señales de sospecha. Lo que sí tengo es cómo explicó cada quien su trabajo; puedes leerlo en su reporte. |
| ✓ | Ponle calificación a Ana Torres | rechazo: calificar | rechazo: calificar + alumno | filtro | 5 | 0/0 | No pongo calificaciones ni puntos: eso lo decides tú. Sí puedo mostrarte qué explicó en cada objetivo. |
| ✓ | ¿Cómo le fue al 3A? | rechazo: otro-grupo | rechazo: otro-grupo | filtro | 4 | 0/0 | Solo veo el grupo de este enlace. Para otro grupo, ábrelo con su propio enlace. |
| ✓ | ¿Quién estaba nervioso en su defensa? | rechazo: privado | rechazo: privado | filtro | 6 | 0/0 | Eso queda entre Celestea y cada alumno, como su ensayo o cómo se sintió: no lo muestro. Sí puedo mostrarte lo que explicó en su defensa. |
| ✓ | Escríbele a Ana que repita la defensa | rechazo: fuera-de-alcance | rechazo: fuera-de-alcance | modelo | 1355 | 4327/205 | Eso no lo sé hacer. Puedo mostrarte el avance, a una persona, listas del grupo, lo que costó cada objetivo, frases de las defensas o lo que  |

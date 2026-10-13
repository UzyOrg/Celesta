/**
 * Datos de ejemplo para las pruebas de las defensas orales: un trabajo corto
 * pero suficiente (más de 120 palabras), los tres objetivos de la actividad de
 * demostración y un constructor de planes válidos.
 */

export const OBJETIVOS = [
  { id: 'O1', text: 'Justifica por qué eligió una encuesta' },
  { id: 'O2', text: 'Explica cómo definió su muestra' },
  { id: 'O3', text: 'Reconoce los límites de su estudio' },
] as const;

/** Oraciones del trabajo; cada ancla del plan es una de ellas, copiada tal cual. */
export const ORACIONES = [
  'Elegí una encuesta en línea en vez de entrevistas porque necesitaba llegar a más compañeros en pocos días.',
  'Con entrevistas solo hubiera podido hablar con unas cinco personas durante la semana de entrega.',
  'La encuesta tuvo doce preguntas cerradas y dos abiertas sobre hábitos de estudio y horas de sueño.',
  'Encuesté solo a estudiantes de mi facultad porque era la lista de correo que yo podía usar.',
  'La muestra fue de cuarenta personas porque solo tenía dos semanas para terminar el estudio.',
  'Calculé el tamaño con una regla sencilla que vimos en clase y no con una fórmula de población finita.',
  'Los resultados muestran que quienes duermen menos de seis horas estudian más tarde y rinden menos.',
  'Esta conclusión depende de que las personas hayan contestado con honestidad y sin prisa.',
  'Mi estudio no permite hablar de todos los estudiantes de la universidad, solo de mi facultad.',
  'Si lo repitiera, ampliaría la muestra a dos facultades para poder comparar los resultados entre grupos.',
  'También daría más tiempo para que las personas contesten y revisaría las preguntas abiertas con calma.',
  'Otro límite es que las respuestas se registraron una sola vez y no sabemos si cambian con el semestre.',
  'Para analizar los datos usé promedios y porcentajes en una hoja de cálculo, sin pruebas estadísticas.',
  'Cuando una persona dejó respuestas en blanco, eliminé esa encuesta completa para no inventar datos.',
] as const;

export const TRABAJO = ORACIONES.join(' ');

export function contarPalabras(texto: string): number {
  return texto.trim().split(/\s+/).filter(Boolean).length;
}

/** Plan crudo (como lo devolvería el modelo) que cumple todas las reglas de validación. */
export function planCrudoValido(): Record<string, unknown> {
  const candidata = (objetivo: string, letra: 'a' | 'b', ancla: string, pregunta: string) => ({
    id: `${objetivo}-${letra}`,
    type: letra === 'a' ? 'decision' : 'supuestos',
    anchor: ancla,
    question: pregunta,
    evidence: 'Explica el criterio que usó y reconoce una alternativa que descartó.',
    followup_if_vague: 'Dame un ejemplo concreto de tu estudio que muestre eso. ¿Qué pasó exactamente?',
    followup_if_solid: 'Si ese supuesto fallara, ¿qué cambiaría en tu conclusión?',
  });
  return {
    status: 'ok',
    status_reason: '',
    work_summary: 'El alumno hizo una encuesta en línea a su facultad y concluyó sobre horas de sueño.',
    key_claims: [
      { id: 'C1', claim: 'Prefirió encuesta sobre entrevistas por alcance', anchor: ORACIONES[0] },
      { id: 'C2', claim: 'La muestra fue de cuarenta personas', anchor: ORACIONES[4] },
      { id: 'C3', claim: 'No generaliza a toda la universidad', anchor: ORACIONES[8] },
    ],
    objectives: [
      {
        objective_id: 'O1',
        coverage: 'presente',
        coverage_note: 'Justifica el método por alcance y tiempo.',
        candidates: [
          candidata('O1', 'a', ORACIONES[0], 'Dices que elegiste una encuesta en línea. ¿Qué perdiste al no hacer entrevistas?'),
          candidata('O1', 'b', ORACIONES[1], 'Mencionas que solo habrías hablado con cinco personas. ¿Por qué ese número te pareció poco?'),
        ],
      },
      {
        objective_id: 'O2',
        coverage: 'debil',
        coverage_note: 'Da el tamaño pero no el criterio.',
        candidates: [
          candidata('O2', 'a', ORACIONES[4], 'Tu muestra fue de cuarenta personas. ¿Cómo decidiste que ese tamaño alcanzaba?'),
          candidata('O2', 'b', ORACIONES[3], 'Encuestaste solo a tu facultad. ¿Cómo afecta eso a lo que puedes concluir?'),
        ],
      },
      {
        objective_id: 'O3',
        coverage: 'presente',
        coverage_note: 'Reconoce que no generaliza.',
        candidates: [
          candidata('O3', 'a', ORACIONES[8], 'Dices que tu estudio no habla de toda la universidad. ¿Qué tendría que cambiar para que sí?'),
          candidata('O3', 'b', ORACIONES[7], 'Tu conclusión depende de respuestas honestas. ¿Cómo podrías comprobar que lo fueron?'),
        ],
      },
    ],
    opener: 'Para empezar, ¿de qué trató tu encuesta sobre hábitos de estudio?',
    transfer: [
      {
        id: 'T1',
        objective_id: 'O2',
        anchor: ORACIONES[5],
        question: 'Imagina que la encuesta fuera a toda la universidad. ¿Qué cambiarías para decidir cuántas personas incluir?',
        evidence: 'Aplica su criterio de tamaño a una población mayor y reconoce el costo.',
      },
      {
        id: 'T2',
        objective_id: 'O3',
        anchor: ORACIONES[9],
        question: 'Si en lugar de una encuesta hicieras entrevistas, ¿qué límite de tu estudio desaparecería primero?',
        evidence: 'Compara métodos y reconoce qué límite cambia.',
      },
    ],
    alerts: [],
  };
}

import type { ActividadAlumno, PreguntaDefensa } from './types';

/**
 * Escenario de ejemplo del flujo del alumno.
 *
 * Es el mismo escenario que usa el profesor (`revision/mock.ts`): Ana Torres
 * Ruiz, matrícula 20231457, entrega el viernes 9 de octubre a las 21:05 y
 * defiende a las 21:32. Los textos son los de los diseños aprobados.
 *
 * Para conectar datos reales se reemplaza `consultas.ts`; los componentes solo
 * conocen los tipos de `types.ts`.
 */

/** Enlaces del grupo que el prototipo reconoce. `demo` es el de pruebas. */
export const TOKEN_DEMO = 'demo';
export const TOKENS_CONOCIDOS: readonly string[] = [TOKEN_DEMO, '3b-encuesta'];

export const PREGUNTAS: readonly PreguntaDefensa[] = [
  {
    id: 'p1',
    numero: 1,
    contexto: 'Elegiste una encuesta en línea en vez de entrevistas.',
    pregunta: '¿Por qué tomaste esa decisión?',
  },
  {
    id: 'p2',
    numero: 2,
    contexto: 'Encuestaste solo a estudiantes de tu facultad.',
    pregunta: '¿Cómo decidiste cuántas personas incluir?',
  },
  {
    id: 'p3',
    numero: 3,
    contexto: 'Tu estudio se hizo en dos semanas.',
    pregunta: 'Si lo repitieras, ¿qué cambiarías primero?',
  },
];

export const ACTIVIDAD_ALUMNO_DEMO: ActividadAlumno = {
  token: TOKEN_DEMO,
  // El diseño del alumno llama a la tarjeta "Proyecto final"; el profesor la
  // guarda como "Encuesta sobre hábitos de estudio". Se respetan ambos textos.
  nombre: 'Proyecto final',
  curso: 'Metodología de la investigación',
  grupo: '3B',
  cierreTarjeta: 'viernes 9',
  alumnoDemo: { nombre: 'Ana Torres Ruiz', matricula: '20231457' },
  trabajo: {
    titulo: 'Encuesta sobre hábitos de estudio',
    curso: 'Metodología de la investigación',
    archivo: 'encuesta-habitos.pdf',
    paginas: 12,
  },
  horaEntrega: '21:05',
  horaDefensa: '21:32',
  fechaSello: '9 de octubre',
  sello: 'Entregado el viernes 9 de octubre a las 21:05',
  preguntas: PREGUNTAS,
  segundosSilencio: 30,
  aclaracion: {
    antes: '…la muestra fue',
    despues: 'porque solo tenía dos semanas.',
    relleno: 'de cuarenta personas',
  },
  revision: [
    {
      pregunta: PREGUNTAS[0] as PreguntaDefensa,
      lineas: [
        {
          id: 'l1',
          tiempo: '00:14',
          segmentos: [{ texto: 'Porque con la encuesta llegaba a más compañeros en menos tiempo.' }],
        },
        {
          id: 'l2',
          tiempo: '00:19',
          segmentos: [{ texto: 'Con entrevistas solo hubiera podido hablar con unos cinco.' }],
          marcadaDeInicio: true,
        },
      ],
    },
    {
      pregunta: PREGUNTAS[1] as PreguntaDefensa,
      lineas: [
        {
          id: 'l3',
          tiempo: '00:41',
          segmentos: [
            { texto: 'Quería más, pero la muestra fue ' },
            { texto: 'de cuarenta personas', aclarado: true },
          ],
          aclarada: true,
        },
        {
          id: 'l4',
          tiempo: '00:47',
          segmentos: [{ texto: 'porque solo tenía dos semanas.' }],
        },
      ],
    },
    {
      pregunta: PREGUNTAS[2] as PreguntaDefensa,
      porEscrito: 'Lo haría en dos facultades para comparar, y daría más tiempo para que contesten.',
    },
  ],
};

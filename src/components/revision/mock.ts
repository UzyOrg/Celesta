import { PREGUNTAS, TOKEN_DEMO } from '../defensa/mock';
import type { PreguntaDefensa } from '../defensa/types';
import { leerMarca } from './fechas';
import type {
  ActividadMenu,
  ActividadProfesor,
  Alumno,
  DescargaGrupo,
  EvidenciaObjetivo,
  Objetivo,
  Profesora,
  ReporteAlumno,
  TrabajoParaLeer,
} from './types';

/**
 * Escenario de ejemplo del lado del profesor.
 *
 * Toda la interfaz de `/revision` lee de aquí; no hay servidor ni base de
 * datos. Las cifras del grupo (31 entregaron, 27 defendieron, 19 por revisar...)
 * NO están escritas: salen de la lista de 38 alumnos con `derivados.ts`.
 *
 * Es el mismo escenario del alumno (`defensa/mock.ts`): Ana Torres Ruiz,
 * matrícula 20231457, entrega el viernes 9 a las 21:05 y defiende a las 21:32.
 * Las preguntas se leen de allí para que las dos mitades nunca se contradigan.
 *
 * Para conectar datos reales se reemplaza `consultas.ts`; los componentes solo
 * conocen los tipos de `types.ts`.
 */

/* ------------------------------------------------------------------------ */
/* Profesora, actividad y objetivos                                         */
/* ------------------------------------------------------------------------ */

export const PROFESORA: Profesora = {
  nombre: 'Laura Méndez',
  primerNombre: 'Laura',
  iniciales: 'LM',
  rol: 'Profesora',
};

export const OBJETIVOS: readonly Objetivo[] = [
  {
    id: 1,
    texto: 'Justifica por qué eligió una encuesta',
    corto: 'Justifica el método',
    alias: 'El del método',
    tema: 'su método',
  },
  {
    id: 2,
    texto: 'Explica cómo definió su muestra',
    corto: 'Explica su muestra',
    alias: 'El de la muestra',
    tema: 'su muestra',
  },
  {
    id: 3,
    texto: 'Reconoce los límites de su estudio',
    corto: 'Reconoce límites',
    alias: 'El de los límites',
    tema: 'los límites de su estudio',
  },
];

export const ACTIVIDAD_PROFESOR: ActividadProfesor = {
  token: TOKEN_DEMO,
  nombre: 'Encuesta sobre hábitos de estudio',
  referencia: 'La encuesta',
  curso: 'Metodología de la investigación',
  grupo: '3B',
  cierre: { dia: 'vie 9', hora: '23:59' },
  cierreCorto: 'vie 9 oct, 23:59',
  objetivos: OBJETIVOS,
  totalAlumnos: 38,
};

/** Las otras actividades del menú. En el prototipo solo la primera tiene datos. */
export const OTRAS_ACTIVIDADES: readonly ActividadMenu[] = [
  {
    id: 'ensayo-etica',
    nombre: 'Ensayo: ética en la investigación',
    detalle: 'Grupo 3A, cierra el viernes 23',
  },
  {
    id: 'lectura-2',
    nombre: 'Reporte de lectura 2',
    detalle: 'Grupo 3B, cerrada',
  },
];

/** Archivo que se arma en "Descarga todos los trabajos". */
export const DESCARGA_DEMO: DescargaGrupo = {
  archivo: 'trabajos-3B-encuesta.zip',
  megabytes: 48,
};

/* ------------------------------------------------------------------------ */
/* Lista de alumnos (38)                                                    */
/* ------------------------------------------------------------------------ */

/**
 * Cada fila es un alumno, tal como la escribe el diseño:
 * [registro, matrícula, entrega, defensa, evidencia, partes para oír, revisado, banderas]
 *
 * - entrega y defensa: "día|hora" o vacío si no ocurrió.
 * - evidencia: tres valores entre si / parte / no; cualquier otro es "sin dato".
 * - banderas: et = entregó tarde, dt = defendió tarde, inc = defensa incompleta,
 *   v2 = subió otra versión.
 */
type FilaRegistro = readonly [
  registro: string,
  matricula: string,
  entrega: string,
  defensa: string,
  evidencia: string,
  partesParaOir: number,
  revisado: 0 | 1,
  banderas: string,
];

const FILAS: readonly FilaRegistro[] = [
  ['Aguilar Ramos, Sofía', '20231302', 'lun 5|17:55', 'lun 5|18:20', 'si parte si', 0, 1, ''],
  ['Bravo Méndez, Luis Ángel', '20231390', 'jue 8|17:30', 'jue 8|18:02', 'si parte no', 0, 1, ''],
  ['Castillo Ortega, Mariana', '20231412', 'vie 9|22:20', 'vie 9|22:47', 'si si si', 1, 0, 'v2'],
  ['Cruz Salas, Diego', '20231366', 'vie 9|23:40', '', '', 0, 0, ''],
  ['Delgado Fuentes, Andrea', '20231318', 'mar 6|10:05', 'mar 6|10:40', 'si parte si', 0, 1, ''],
  ['Domínguez Paz, Fernanda', '20231421', 'mié 7|20:15', 'mié 7|20:31', 'parte na na', 0, 0, 'inc'],
  ['Espinoza Vega, Carlos', '20231355', 'mar 6|21:40', 'mar 6|22:05', 'si no parte', 2, 0, ''],
  ['Flores Lara, Jorge Iván', '20231377', 'sáb 10|01:12', 'sáb 10|01:30', 'si parte parte', 0, 0, 'et dt'],
  ['García Navarro, Valeria', '20231309', 'lun 5|20:40', 'lun 5|21:05', 'si si si', 1, 1, ''],
  ['Gómez Rivas, Paola', '20231402', '', '', '', 0, 0, ''],
  ['Guerrero Silva, Alejandro', '20231344', 'mié 7|17:20', 'mié 7|17:50', 'parte no no', 1, 0, ''],
  ['Hernández Cano, Daniela', '20231331', 'mar 6|18:50', 'mar 6|19:15', 'si parte si', 0, 1, ''],
  ['Herrera Luna, Ricardo', '20231385', 'vie 9|19:20', 'vie 9|19:41', 'parte nose parte', 3, 0, ''],
  ['Ibarra Mendoza, Regina', '20231418', 'vie 9|18:30', 'sáb 10|10:12', 'si parte si', 0, 0, 'dt'],
  ['Jiménez Soto, Ximena', '20231430', 'jue 8|12:05', 'jue 8|12:30', 'si si parte', 1, 1, ''],
  ['Juárez Acosta, Miguel Ángel', '20231362', 'vie 9|20:02', '', '', 0, 0, ''],
  ['León Cervantes, Natalia', '20231397', '', '', '', 0, 0, ''],
  ['López Medina, Kevin', '20231323', 'mié 7|22:45', 'mié 7|23:10', 'no parte no', 0, 0, ''],
  ['Márquez Rojas, Emiliano', '20231371', 'vie 9|22:40', 'vie 9|23:05', 'si parte parte', 1, 0, ''],
  ['Martínez Cabrera, Camila', '20231314', 'mar 6|20:10', 'mar 6|20:30', 'si si si', 0, 1, ''],
  ['Mejía Orozco, Brenda', '20231426', 'vie 9|12:50', 'vie 9|13:20', 'si parte si', 0, 0, ''],
  ['Molina Ríos, Santiago', '20231349', '', '', '', 0, 0, ''],
  ['Morales Peña, Itzel', '20231407', 'jue 8|21:10', 'jue 8|21:40', 'parte parte si', 2, 0, ''],
  ['Navarro Ponce, Héctor', '20231338', 'jue 8|22:10', '', '', 0, 0, ''],
  ['Ortiz Campos, Lucía', '20231393', 'vie 9|17:45', 'vie 9|18:10', 'si no parte', 0, 0, ''],
  ['Pacheco Zamora, Rodrigo', '20231359', '', '', '', 0, 0, ''],
  ['Pérez Galindo, Ana Karen', '20231327', 'vie 9|20:30', 'vie 9|20:55', 'si parte si', 1, 0, ''],
  ['Ramírez Solís, Eduardo', '20231380', 'vie 9|21:50', 'vie 9|22:15', 'parte parte no', 0, 0, ''],
  ['Reyes Quintero, Melissa', '20231415', 'jue 8|16:20', 'jue 8|16:45', 'si si parte', 0, 1, ''],
  ['Rivera Montes, Óscar', '20231341', '', '', '', 0, 0, ''],
  ['Romero Bautista, Alondra', '20231403', 'vie 9|23:15', 'vie 9|23:41', 'si parte parte', 1, 0, ''],
  ['Salazar Ibáñez, Iván', '20231368', 'sáb 10|00:35', '', '', 0, 0, 'et'],
  ['Sánchez Villa, Karla', '20231335', 'vie 9|17:05', 'vie 9|17:30', 'si no si', 0, 0, ''],
  ['Soto Arellano, Fátima', '20231422', 'jue 8|18:40', 'jue 8|19:05', 'si parte si', 0, 0, ''],
  ['Torres Ruiz, Ana', '20231457', 'vie 9|21:05', 'vie 9|21:32', 'si parte si', 2, 0, ''],
  ['Vargas Lozano, Mauricio', '20231374', '', '', '', 0, 0, ''],
  ['Velázquez Durán, Renata', '20231399', 'vie 9|21:30', 'vie 9|21:58', 'si parte si', 0, 0, ''],
  ['Zúñiga Herrera, Joel', '20231311', '', '', '', 0, 0, ''],
];

function leerEvidencia(texto: string): readonly EvidenciaObjetivo[] {
  if (!texto) return [];
  return texto.split(' ').map((valor): EvidenciaObjetivo => {
    if (valor === 'si') return 'explico';
    if (valor === 'parte') return 'en-parte';
    if (valor === 'no') return 'no-salio';
    return null;
  });
}

function construirAlumno(fila: FilaRegistro): Alumno {
  const [registro, matricula, entrega, defensa, evidencia, partesParaOir, revisado, banderas] = fila;
  const [apellidos = '', nombres = ''] = registro.split(', ');
  const primerNombre = nombres.split(' ')[0] ?? nombres;
  const primerApellido = apellidos.split(' ')[0] ?? apellidos;
  const marcas = banderas.split(' ');
  const marcaDefensa = leerMarca(defensa);
  return {
    matricula,
    nombreRegistro: registro,
    nombre: `${nombres} ${apellidos}`.trim(),
    primerNombre,
    nombreCorto: `${primerNombre} ${primerApellido}`.trim(),
    iniciales: `${nombres.charAt(0)}${apellidos.charAt(0)}`,
    entrega: leerMarca(entrega),
    defensa: marcaDefensa,
    evidencia: marcaDefensa ? leerEvidencia(evidencia) : [],
    partesParaOir,
    // Solo cuenta como revisado si de verdad hubo defensa que revisar.
    revisado: revisado === 1 && marcaDefensa !== null,
    entregaTardia: marcas.includes('et'),
    defensaTardia: marcas.includes('dt'),
    defensaIncompleta: marcas.includes('inc'),
    subioOtraVersion: marcas.includes('v2'),
    duracion: null,
    revisoSuTranscripcion: null,
  };
}

/** La alumna del ejemplo: aparece en el flujo del alumno y en el reporte. */
export const MATRICULA_DEMO = '20231457';

/** Datos extra que solo tiene la alumna del ejemplo (el resto del grupo no tiene transcripción). */
const DETALLES_DE_ANA: Partial<Alumno> = {
  duracion: '3 min 40 s',
  revisoSuTranscripcion: { hora: '21:32', nota: 'Marcó una frase' },
  tratamiento: 'Alumna',
};

export const ALUMNOS: readonly Alumno[] = FILAS.map((fila) => {
  const alumno = construirAlumno(fila);
  return alumno.matricula === MATRICULA_DEMO ? { ...alumno, ...DETALLES_DE_ANA } : alumno;
});

/** El alumno que Celestea encuentra al pedirle "Muéstrame a Ana Torres". */
export const ALUMNO_BUSCADO: Alumno = ALUMNOS.find((alumno) => alumno.matricula === MATRICULA_DEMO) as Alumno;

/* ------------------------------------------------------------------------ */
/* Reporte de Ana                                                           */
/* ------------------------------------------------------------------------ */

export const REPORTE_ANA: ReporteAlumno = {
  matricula: MATRICULA_DEMO,
  completo: true,
  resumen:
    'Justificó bien por qué usó una encuesta y propuso cómo mejorar su estudio. Se quedó corta al explicar su muestra.',
  bloques: [
    {
      objetivo: OBJETIVOS[0] as Objetivo,
      nivel: 'explico',
      pregunta: PREGUNTAS[0] as PreguntaDefensa,
      respuesta: {
        modo: 'voz',
        calidad: 'Respuesta sólida',
        lineas: [
          {
            tiempo: '00:14',
            fragmentos: [{ texto: 'Porque con la encuesta llegaba a más compañeros en menos tiempo.' }],
          },
          {
            tiempo: '00:19',
            fragmentos: [
              { texto: 'Con entrevistas solo hubiera podido hablar con unos cinco.', resalte: 'subrayado' },
            ],
          },
        ],
        parteParaOir: {
          id: 'marcada',
          descripcion: 'Ana marcó que no lo dijo así. Oye el original.',
          etiquetaBoton: 'Oír la frase que Ana marcó',
          milisegundos: 4000,
          duracion: '0:04',
          semilla: 11,
        },
      },
    },
    {
      objetivo: OBJETIVOS[1] as Objetivo,
      nivel: 'en-parte',
      pregunta: PREGUNTAS[1] as PreguntaDefensa,
      respuesta: {
        modo: 'voz',
        calidad: 'Respuesta vaga',
        lineas: [
          {
            tiempo: '00:41',
            fragmentos: [
              { texto: 'Quería más, pero la muestra fue ' },
              { texto: 'de cuarenta personas', resalte: 'recuadro' },
            ],
          },
          { tiempo: '00:47', fragmentos: [{ texto: 'porque solo tenía dos semanas.' }] },
        ],
        parteParaOir: {
          id: 'aclarada',
          descripcion: 'Al grabar no se entendió esta parte; Ana la completó. Oye el original.',
          etiquetaBoton: 'Oír la parte aclarada',
          milisegundos: 3000,
          duracion: '0:03',
          semilla: 5,
        },
        faltante: 'por qué solo encuestó a su facultad y qué limita eso.',
        analisis:
          'Explicó el tamaño de su muestra por el tiempo, pero no por qué solo encuestó a su facultad ni qué limita eso.',
      },
    },
    {
      objetivo: OBJETIVOS[2] as Objetivo,
      nivel: 'explico',
      pregunta: PREGUNTAS[2] as PreguntaDefensa,
      respuesta: {
        modo: 'escrito',
        calidad: 'Respuesta sólida',
        textoEscrito: 'Lo haría en dos facultades para comparar, y daría más tiempo para que contesten.',
      },
    },
  ],
};

/* ------------------------------------------------------------------------ */
/* Trabajo de Ana (visor de solo lectura)                                   */
/* ------------------------------------------------------------------------ */

/** Ficticio, coherente con lo que Ana dice en su defensa de ejemplo. */
export const TRABAJO_DE_ANA: TrabajoParaLeer = {
  nombre: 'encuesta-habitos-de-estudio-ana-torres.pdf',
  tipo: 'archivo',
  version: 1,
  paginas: 4,
  palabras: 612,
  entregadoEn: { dia: 'vie 9', hora: '21:05' },
  recortado: false,
  texto: `Encuesta sobre hábitos de estudio en la Facultad de Psicología

1. Pregunta de investigación
¿Cuántas horas a la semana estudian fuera de clase los estudiantes de primer semestre, y en qué momento del día lo hacen?

2. Método
Elegí una encuesta en línea en lugar de entrevistas porque me permitía llegar a más compañeros en menos tiempo. Con entrevistas solo hubiera podido hablar con unas cinco personas en las dos semanas que tenía para el trabajo.

El cuestionario tiene doce preguntas cerradas (opción múltiple y escala de frecuencia) y una abierta sobre lo que más les cuesta para organizarse.

3. Muestra
La muestra fue de cuarenta personas de primer semestre de la Facultad de Psicología. Repartí el enlace en los grupos de WhatsApp de la generación y lo dejé abierto cuatro días. Contestaron cuarenta y dos personas; descarté dos respuestas incompletas.

4. Resultados
La mayoría dijo estudiar entre tres y seis horas a la semana fuera de clase, casi siempre de noche y casi nunca los fines de semana. Quienes trabajan además de estudiar reportaron menos horas y más estudio de última hora antes de los exámenes.

5. Límites
Solo encuesté a mi facultad, así que no sé si pasa lo mismo en otras carreras. Además, las respuestas dependen de lo que cada quien recuerda y quiere contar, y quienes contestaron pueden ser los más interesados en el tema.

6. Qué haría distinto
Lo aplicaría en dos facultades para comparar, daría más tiempo para que contesten y agregaría una pregunta sobre si trabajan, que en esta versión salió solo en la pregunta abierta.`,
};

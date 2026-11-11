import {
  FRASE_DE_RECHAZO,
  type CitaParaProfesor,
  type PropsTarjetaCitas,
  type PropsTarjetaEnlace,
  type PropsTarjetaLista,
  type PropsTarjetaObjetivo,
  type PropsTarjetaPendientes,
  type PropsTarjetaRitmo,
} from './catalogo';
import { alumnosEnEstado, cantidadEnLetra, ordenarAlumnos, resumenDelGrupo } from './derivados';
import { fraseAlumno, fraseAvance, fraseObjetivo } from './frases';
import { listaFiltrada, objetivoDeCerca, ritmoDelGrupo } from './tarjetasDelGrupo';
import type { Alumno, DatosGrupo } from './types';

/**
 * Maquetas del asistente del profesor (fase 1 de la propuesta, sin modelo de lenguaje).
 *
 * Cada escena muestra una petición típica, los pasos que el servidor iría
 * anunciando, la frase de Celestea y las tarjetas del catálogo armadas con el
 * grupo de ejemplo. Solo existen con el escenario de ejemplo (`/revision/demo`),
 * nunca con un enlace real. Las citas son ficticias, salvo la de Ana, que es la
 * misma de su reporte de ejemplo.
 */

export const ESCENAS_DE_MAQUETA = [
  'asistente-lista',
  'asistente-vacia',
  'asistente-objetivo',
  'asistente-citas',
  'asistente-alumno',
  'asistente-pendientes',
  'asistente-ritmo',
  'asistente-enlace',
  'asistente-varias',
  'asistente-rechazo',
  'asistente-calificar',
  'asistente-falla',
  'asistente-pasos',
] as const;

export type EscenaDeMaqueta = (typeof ESCENAS_DE_MAQUETA)[number];

/** `asistente` abre el índice de maquetas; las demás, una maqueta. */
export function leerEscenaDeMaqueta(valor: string | string[] | undefined): EscenaDeMaqueta | 'asistente' | null {
  const crudo = (Array.isArray(valor) ? valor[0] : valor)?.trim().toLowerCase() ?? '';
  if (crudo === 'asistente') return 'asistente';
  return (ESCENAS_DE_MAQUETA as readonly string[]).includes(crudo) ? (crudo as EscenaDeMaqueta) : null;
}

export type TarjetaDeMaqueta =
  | { tipo: 'lista'; props: PropsTarjetaLista }
  | { tipo: 'objetivo'; props: PropsTarjetaObjetivo }
  | { tipo: 'citas'; props: PropsTarjetaCitas }
  | { tipo: 'alumno'; alumno: Alumno }
  | { tipo: 'avance' }
  | { tipo: 'pendientes'; props: PropsTarjetaPendientes; rutaPrimero: string | null }
  | { tipo: 'ritmo'; props: PropsTarjetaRitmo }
  | { tipo: 'enlace'; props: PropsTarjetaEnlace };

export interface Maqueta {
  escena: EscenaDeMaqueta;
  /** Lo que escribió el profesor. */
  peticion: string;
  /** Pasos que el servidor anuncia mientras arma la respuesta. */
  pasos: readonly string[];
  /** La frase de Celestea sobre las tarjetas. */
  texto: string;
  tarjetas: readonly TarjetaDeMaqueta[];
  sugerencias: readonly string[];
  /** Se queda en los pasos, para ver el estado "cargando". */
  congelada?: boolean;
}

/** Lo que el índice dice de cada maqueta. */
export const DESCRIPCION_DE_MAQUETA: Readonly<Record<EscenaDeMaqueta, string>> = {
  'asistente-lista': 'Lista filtrada',
  'asistente-vacia': 'Lista filtrada sin nadie (estado vacío)',
  'asistente-objetivo': 'Un objetivo de cerca',
  'asistente-citas': 'Frases verificadas sobre un objetivo',
  'asistente-alumno': 'Cualquier persona del grupo, no solo Ana',
  'asistente-pendientes': 'Lo que te falta',
  'asistente-ritmo': 'Cuándo entregaron y defendieron',
  'asistente-enlace': 'Desactivar el enlace, con confirmación (queda para la v2)',
  'asistente-varias': 'Una respuesta con dos tarjetas',
  'asistente-rechazo': 'Rechazo amable: sospecha',
  'asistente-calificar': 'Rechazo con alternativa: calificar',
  'asistente-falla': 'El modelo falla y vuelven las reglas',
  'asistente-pasos': 'Pasos visibles mientras busca (cargando)',
};

/** Frases de ejemplo sobre el objetivo 2. Ficticias, salvo la primera (la de Ana). */
const CITAS_DE_EJEMPLO: ReadonlyArray<Omit<CitaParaProfesor, 'nombre' | 'iniciales'>> = [
  { matricula: '20231457', texto: 'Quería más, pero la muestra fue de cuarenta personas porque solo tenía dos semanas.', nivel: 'en-parte', modo: 'voz', tiempo: '00:41' },
  { matricula: '20231412', texto: 'Escogí a los de primer semestre de las tres carreras para que no saliera todo de un solo salón.', nivel: 'explico', modo: 'voz', tiempo: '00:52' },
  { matricula: '20231385', texto: 'La muestra fueron mis compañeros porque eran a los que podía preguntarles.', nivel: 'en-parte', modo: 'escrito', tiempo: null },
  { matricula: '20231407', texto: 'Hice un sorteo con la lista del grupo y salieron treinta y dos.', nivel: 'en-parte', modo: 'voz', tiempo: '01:05' },
];

function citasDeEjemplo(alumnos: readonly Alumno[]): CitaParaProfesor[] {
  return CITAS_DE_EJEMPLO.flatMap((cita) => {
    const alumno = alumnos.find((candidato) => candidato.matricula === cita.matricula);
    return alumno ? [{ ...cita, nombre: alumno.nombre, iniciales: alumno.iniciales }] : [];
  });
}

/** Arma una maqueta con el grupo de ejemplo; todas las cifras salen de la lista de alumnos. */
export function maquetaDelAsistente(grupo: DatosGrupo, escena: EscenaDeMaqueta): Maqueta {
  const { alumnos, actividad } = grupo;
  const resumen = resumenDelGrupo(alumnos);
  const total = `Leo tu grupo: ${resumen.total} personas, ${resumen.entregaron} entregas y ${resumen.defendieron} defensas…`;
  const objetivo2 = objetivoDeCerca(alumnos, actividad.objetivos, 2);
  const porRevisar = ordenarAlumnos('por-revisar', alumnosEnEstado(alumnos, 'por-revisar'));
  const carlos = alumnos.find((alumno) => alumno.matricula === '20231355') ?? grupo.alumnoBuscado;
  const ana = grupo.alumnoBuscado;
  const sugerenciasBase = ['¿Qué me falta?', '¿Cómo les fue con la muestra?', '¿Quién entregó tarde?'];

  switch (escena) {
    case 'asistente-lista': {
      const lista = listaFiltrada(alumnos, [{ filtro: 'tarde' }]);
      return {
        escena,
        peticion: '¿Quién entregó tarde?',
        pasos: [total, `Busco quién entregó o defendió después del cierre (${actividad.cierreCorto})…`],
        texto:
          lista.total === 1
            ? 'Una persona entregó o defendió después del cierre.'
            : `${cantidadEnLetra(lista.total)} personas entregaron o defendieron después del cierre.`,
        tarjetas: [{ tipo: 'lista', props: lista }],
        sugerencias: ['¿Cuándo entregaron?', '¿Qué me falta?'],
      };
    }
    case 'asistente-vacia': {
      const lista = listaFiltrada(alumnosEnEstado(alumnos, 'revisado'), [{ filtro: 'incompleta' }]);
      return {
        escena,
        peticion: 'De los que ya revisé, ¿alguno quedó incompleto?',
        pasos: [total, `Reviso las ${resumen.revisados} defensas que ya revisaste…`],
        texto: 'Ninguna de las defensas que ya revisaste quedó incompleta.',
        tarjetas: [{ tipo: 'lista', props: { ...lista, titulo: 'Revisadas e incompletas' } }],
        sugerencias: ['¿Qué me falta?', 'Muéstrame las incompletas'],
      };
    }
    case 'asistente-objetivo': {
      return {
        escena,
        peticion: '¿Cómo les fue con la muestra?',
        pasos: [total, 'Junto lo del objetivo 2 en los reportes…'],
        texto: objetivo2 ? fraseObjetivo(objetivo2.conteo, resumen.defendieron) : FRASE_DE_RECHAZO['fuera-de-alcance'],
        tarjetas: objetivo2 ? [{ tipo: 'objetivo', props: objetivo2 }] : [],
        sugerencias: ['¿Qué dijeron sobre su muestra?', 'Muéstrame a los que lo explicaron en parte'],
      };
    }
    case 'asistente-citas':
    case 'asistente-pasos': {
      const citas = citasDeEjemplo(alumnos);
      return {
        escena,
        peticion: '¿Qué dijeron sobre su muestra?',
        pasos: [total, 'Junto lo del objetivo 2 en los reportes…', 'Tomo solo frases que aparecen tal cual en las transcripciones…'],
        texto: `Estas son ${cantidadEnLetra(citas.length).toLowerCase()} frases de sus defensas sobre la muestra, tal como las dijeron o escribieron.`,
        tarjetas: [
          {
            tipo: 'citas',
            props: {
              titulo: 'Lo que dijeron sobre su muestra',
              objetivo: { id: 2, texto: actividad.objetivos[1]?.texto ?? 'Objetivo 2' },
              citas,
              total: citas.length + 9,
            },
          },
        ],
        sugerencias: ['¿Cómo les fue con la muestra?', '¿Qué me falta?'],
        ...(escena === 'asistente-pasos' ? { congelada: true } : {}),
      };
    }
    case 'asistente-alumno':
      return {
        escena,
        peticion: '¿Cómo le fue a Carlos Espinoza?',
        pasos: [total, `Busco a ${carlos.nombreCorto}…`],
        texto: fraseAlumno(carlos),
        tarjetas: [{ tipo: 'alumno', alumno: carlos }],
        sugerencias: ['¿Cómo les fue con la muestra?', 'Muéstrame a todos'],
      };
    case 'asistente-pendientes':
      return {
        escena,
        peticion: '¿Qué me falta?',
        pasos: [total, 'Reviso los reportes que te esperan y el enlace del grupo…'],
        texto: `Te esperan ${resumen.porRevisar} reportes. El audio de algunos se borra pronto; empieza por esos si quieres oírlos.`,
        tarjetas: [
          {
            tipo: 'pendientes',
            props: {
              porRevisar: resumen.porRevisar,
              primeraMatricula: porRevisar[0]?.matricula ?? null,
              conPartesParaOir: porRevisar.filter((alumno) => alumno.partesParaOir > 0).length,
              reportesPreparando: 1,
              reportesConError: 0,
              audioPorBorrar: { reportes: 4, dia: 'martes 13' },
              enlace: { activo: true, enviosUsados: 33, limiteEnvios: 120 },
            },
            rutaPrimero: porRevisar[0] ? `/revision/${actividad.token}/alumno/${porRevisar[0].matricula}` : null,
          },
        ],
        sugerencias: ['Muéstrame los que traen algo para oír', '¿Quién entregó tarde?'],
      };
    case 'asistente-ritmo':
      return {
        escena,
        peticion: '¿Cuándo entregaron?',
        pasos: [total, 'Cuento entregas y defensas por día…'],
        texto: `${resumen.entregaron} entregaron y ${resumen.defendieron} defendieron. Así se repartieron los días.`,
        tarjetas: [{ tipo: 'ritmo', props: ritmoDelGrupo(alumnos, actividad.cierre) }],
        sugerencias: ['¿Quién entregó tarde?', '¿Qué me falta?'],
      };
    case 'asistente-enlace':
      return {
        escena,
        peticion: 'Cierra el enlace del grupo',
        pasos: [total, 'Reviso el enlace del grupo…'],
        texto: 'Lo desactivo en cuanto me lo confirmes. Esto es lo que pasaría:',
        tarjetas: [{ tipo: 'enlace', props: { activo: true, enviosUsados: 33, limiteEnvios: 120 } }],
        sugerencias: ['¿Qué me falta?', '¿Cuántos defendieron?'],
      };
    case 'asistente-varias':
      return {
        escena,
        peticion: '¿Cómo va el grupo y qué me queda?',
        pasos: [total, 'Cuento entregas y defensas…', 'Reviso los reportes que te esperan…'],
        texto: `${fraseAvance(resumen)} Te esperan ${resumen.porRevisar} reportes.`,
        tarjetas: [
          { tipo: 'avance' },
          {
            tipo: 'pendientes',
            props: {
              porRevisar: resumen.porRevisar,
              primeraMatricula: porRevisar[0]?.matricula ?? null,
              conPartesParaOir: porRevisar.filter((alumno) => alumno.partesParaOir > 0).length,
              reportesPreparando: 0,
              reportesConError: 0,
              audioPorBorrar: null,
              enlace: { activo: true, enviosUsados: 33, limiteEnvios: 120 },
            },
            rutaPrimero: porRevisar[0] ? `/revision/${actividad.token}/alumno/${porRevisar[0].matricula}` : null,
          },
        ],
        sugerencias: sugerenciasBase,
      };
    case 'asistente-rechazo':
      return {
        escena,
        peticion: '¿Quién copió?',
        pasos: [],
        texto: FRASE_DE_RECHAZO.sospecha,
        tarjetas: [],
        sugerencias: ['¿Cómo les fue con la muestra?', 'Muéstrame los que traen algo para oír'],
      };
    case 'asistente-calificar':
      return {
        escena,
        peticion: 'Ponle calificación a Ana',
        pasos: [total, `Busco a ${ana.nombreCorto}…`],
        texto: FRASE_DE_RECHAZO.calificar,
        tarjetas: [{ tipo: 'alumno', alumno: ana }],
        sugerencias: ['¿Cómo les fue con la muestra?', '¿Qué me falta?'],
      };
    case 'asistente-falla':
      return {
        escena,
        peticion: '¿Quién no ha entregado?',
        pasos: [total, 'Celestea no respondió a tiempo; te muestro lo que sé contestar sin ella…'],
        texto: fraseAvance(resumen),
        tarjetas: [{ tipo: 'avance' }],
        sugerencias: ['Muéstrame a todos', 'Descarga todos los trabajos'],
      };
  }
}

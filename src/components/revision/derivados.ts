import { claveDeOrden, diaLargo } from './fechas';
import type {
  ActividadMenu,
  ActividadProfesor,
  Alumno,
  ColaReporte,
  ConteoObjetivo,
  EstadoAlumno,
  FilaGrupo,
  Objetivo,
  ResumenGrupo,
  SeccionGrupo,
  VecinoReporte,
} from './types';

/**
 * Cálculos puros sobre la lista de alumnos.
 *
 * Ninguna cifra del grupo está escrita a mano: todo sale de aquí. Así el
 * número que ve el profesor siempre coincide con las filas que puede abrir.
 */

/* ------------------------------------------------------------------------ */
/* Estado y conteos                                                         */
/* ------------------------------------------------------------------------ */

export function estadoDe(alumno: Alumno): EstadoAlumno {
  if (!alumno.entrega) return 'sin-entregar';
  if (!alumno.defensa) return 'sin-defensa';
  return alumno.revisado ? 'revisado' : 'por-revisar';
}

export function alumnosEnEstado(alumnos: readonly Alumno[], estado: EstadoAlumno): Alumno[] {
  return alumnos.filter((alumno) => estadoDe(alumno) === estado);
}

export function resumenDelGrupo(alumnos: readonly Alumno[]): ResumenGrupo {
  const sinEntregar = alumnosEnEstado(alumnos, 'sin-entregar').length;
  const sinDefensa = alumnosEnEstado(alumnos, 'sin-defensa').length;
  const porRevisar = alumnosEnEstado(alumnos, 'por-revisar').length;
  const revisados = alumnosEnEstado(alumnos, 'revisado').length;
  return {
    total: alumnos.length,
    sinEntregar,
    sinDefensa,
    porRevisar,
    revisados,
    defendieron: porRevisar + revisados,
    entregaron: alumnos.length - sinEntregar,
    faltan: sinEntregar + sinDefensa,
  };
}

/**
 * Cuántos alumnos explicaron, explicaron en parte o no mostraron cada objetivo.
 * El objetivo que "más costó" es el que menos alumnos explicaron del todo.
 */
export function conteoPorObjetivo(
  alumnos: readonly Alumno[],
  objetivos: readonly Objetivo[],
): ConteoObjetivo[] {
  const defendieron = alumnos.filter((alumno) => alumno.defensa !== null);
  const conteos = objetivos.map((objetivo, indice) => {
    const valores = defendieron.map((alumno) => alumno.evidencia[indice] ?? null);
    const explico = valores.filter((valor) => valor === 'explico').length;
    const enParte = valores.filter((valor) => valor === 'en-parte').length;
    const noSalio = valores.filter((valor) => valor === 'no-salio').length;
    return {
      objetivo,
      explico,
      enParte,
      noSalio,
      sinDato: valores.length - explico - enParte - noSalio,
      masCostoso: false,
    };
  });

  let indiceMasCostoso = 0;
  conteos.forEach((conteo, indice) => {
    const actual = conteos[indiceMasCostoso];
    if (actual && conteo.explico < actual.explico) indiceMasCostoso = indice;
  });
  return conteos.map((conteo, indice) => ({ ...conteo, masCostoso: indice === indiceMasCostoso }));
}

/* ------------------------------------------------------------------------ */
/* Listas del grupo                                                         */
/* ------------------------------------------------------------------------ */

/** Orden de cada sección: alfabético, por entrega o por momento de defensa. */
export function ordenarAlumnos(estado: EstadoAlumno, alumnos: readonly Alumno[]): Alumno[] {
  return alumnos.slice().sort((a, b) => {
    if (estado === 'sin-entregar') return a.nombre.localeCompare(b.nombre, 'es');
    if (estado === 'sin-defensa') return claveDeOrden(a.entrega) - claveDeOrden(b.entrega);
    return claveDeOrden(a.defensa) - claveDeOrden(b.defensa);
  });
}

/** "Entregó el viernes 9 a las 21:05" o "Aún no entrega". */
export function textoDeEntrega(alumno: Alumno): string {
  if (!alumno.entrega) return 'Aún no entrega';
  const tarde = alumno.entregaTardia ? ', después del cierre' : '';
  return `Entregó el ${diaLargo(alumno.entrega.dia)} a las ${alumno.entrega.hora}${tarde}`;
}

/** "Defendió el viernes 9 a las 21:32". */
export function textoDeDefensa(alumno: Alumno): string {
  if (!alumno.defensa) return '';
  return `Defendió el ${diaLargo(alumno.defensa.dia)} a las ${alumno.defensa.hora}`;
}

export function textoPartesParaOir(cantidad: number): string {
  return `${cantidad} ${cantidad === 1 ? 'parte para oír' : 'partes para oír'}`;
}

const NUMEROS_EN_LETRA = ['Cero', 'Una', 'Dos', 'Tres', 'Cuatro', 'Cinco'] as const;

/** "Una", "Dos", "Tres"... para abrir una frase; a partir de seis, el número. */
export function cantidadEnLetra(cantidad: number): string {
  return NUMEROS_EN_LETRA[cantidad] ?? String(cantidad);
}

function etiquetasDe(alumno: Alumno): FilaGrupo['etiquetas'] {
  const etiquetas: { texto: string; tipo: 'neutra' | 'oir' }[] = [];
  if (alumno.defensaTardia) etiquetas.push({ texto: 'Tarde', tipo: 'neutra' });
  if (alumno.defensaIncompleta) etiquetas.push({ texto: 'Incompleta', tipo: 'neutra' });
  if (alumno.subioOtraVersion) etiquetas.push({ texto: 'Subió otra versión', tipo: 'neutra' });
  if (alumno.partesParaOir > 0) {
    etiquetas.push({ texto: textoPartesParaOir(alumno.partesParaOir), tipo: 'oir' });
  }
  return etiquetas;
}

const NOMBRE_DE_SECCION: Readonly<Record<EstadoAlumno, string>> = {
  'por-revisar': 'Por revisar',
  revisado: 'Revisados',
  'sin-defensa': 'Entregaron sin defender',
  'sin-entregar': 'Sin entregar',
};

const ORDEN_DE_SECCIONES: readonly EstadoAlumno[] = [
  'por-revisar',
  'revisado',
  'sin-defensa',
  'sin-entregar',
];

/** El grupo por estado, con las filas ya redactadas. */
export function seccionesDelGrupo(alumnos: readonly Alumno[]): SeccionGrupo[] {
  return ORDEN_DE_SECCIONES.map((estado) => {
    const conDefensa = estado === 'por-revisar' || estado === 'revisado';
    const filas = ordenarAlumnos(estado, alumnosEnEstado(alumnos, estado)).map(
      (alumno): FilaGrupo => ({
        alumno,
        estado: conDefensa ? textoDeDefensa(alumno) : textoDeEntrega(alumno),
        etiquetas: conDefensa ? etiquetasDe(alumno) : [],
      }),
    );
    return { id: estado, nombre: NOMBRE_DE_SECCION[estado], filas };
  });
}

/* ------------------------------------------------------------------------ */
/* Cola de reportes                                                         */
/* ------------------------------------------------------------------------ */

function vecinoDe(alumno: Alumno): VecinoReporte {
  return { matricula: alumno.matricula, nombre: alumno.nombre, nombreCorto: alumno.nombreCorto };
}

/** Posición del alumno entre los reportes por revisar y sus vecinos. */
export function colaDeRevision(alumnos: readonly Alumno[], matricula: string): ColaReporte | null {
  const cola = ordenarAlumnos('por-revisar', alumnosEnEstado(alumnos, 'por-revisar'));
  const indice = cola.findIndex((alumno) => alumno.matricula === matricula);
  if (indice === -1) return null;
  const anterior = cola[indice - 1];
  const siguiente = cola[indice + 1];
  return {
    posicion: indice + 1,
    total: cola.length,
    anterior: anterior ? vecinoDe(anterior) : null,
    siguiente: siguiente ? vecinoDe(siguiente) : null,
  };
}

/* ------------------------------------------------------------------------ */
/* Menú lateral                                                             */
/* ------------------------------------------------------------------------ */

/** Dónde está el profesor: decide qué entrada del menú se ve activa y qué dice. */
export type ContextoDelMenu = 'revisar' | 'nueva' | 'enlace';

export interface EntradaMenu {
  id: string;
  nombre: string;
  /** "Grupo 3B, 19 por revisar". */
  detalle: string;
  activa: boolean;
}

export interface MenuLateral {
  entradas: readonly EntradaMenu[];
  /** "Nueva actividad" se ve activa mientras se arma una. */
  nuevaActiva: boolean;
}

function desdeOtra(actividad: ActividadMenu): EntradaMenu {
  return { id: actividad.id, nombre: actividad.nombre, detalle: actividad.detalle, activa: false };
}

/**
 * Arma el menú según dónde esté el profesor. En "Nueva actividad" la actividad
 * en construcción todavía no aparece; al tener enlace aparece como "nueva".
 */
export function construirMenu(
  contexto: ContextoDelMenu,
  actividad: ActividadProfesor,
  resumen: ResumenGrupo,
  otras: readonly ActividadMenu[],
): MenuLateral {
  if (contexto === 'nueva') {
    return { entradas: otras.map(desdeOtra), nuevaActiva: true };
  }
  const detalle =
    contexto === 'enlace'
      ? `Grupo ${actividad.grupo}, nueva`
      : `Grupo ${actividad.grupo}, ${resumen.porRevisar} por revisar`;
  const actual: EntradaMenu = { id: actividad.token, nombre: actividad.nombre, detalle, activa: true };
  return { entradas: [actual, ...otras.map(desdeOtra)], nuevaActiva: false };
}

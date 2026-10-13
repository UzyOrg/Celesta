import type { NivelEvidencia } from '../celeste/types';
import { cantidadEnLetra, estadoDe } from './derivados';
import { diaLargo, nombreDelDia } from './fechas';
import type { RamaReporte } from './intenciones';
import type { Alumno, BloqueReporte, ConteoObjetivo, EscenaProfesor, ReporteAlumno, ResumenGrupo } from './types';

/**
 * Frases con las que Celestea resume cada respuesta.
 *
 * Son plantillas fijas llenadas con números que salen de la lista de alumnos:
 * Celestea nunca escribe una cifra que la tarjeta de abajo no pueda mostrar.
 */

/** "Te esperan 19 reportes." */
export function frasePendientes(porRevisar: number): string {
  if (porRevisar === 0) return 'No te espera ningún reporte.';
  if (porRevisar === 1) return 'Te espera 1 reporte.';
  return `Te esperan ${porRevisar} reportes.`;
}

/** "27 de 38 ya defendieron. Faltan 11: 7 no han entregado y 4 entregaron sin defender." */
export function fraseAvance(resumen: ResumenGrupo): string {
  return `${resumen.defendieron} de ${resumen.total} ya defendieron. Faltan ${resumen.faltan}: ${resumen.sinEntregar} no han entregado y ${resumen.sinDefensa} entregaron sin defender.`;
}

/** "Ana entregó y defendió el viernes. Su reporte está por revisar y tiene dos partes para oír." */
export function fraseAlumno(alumno: Alumno): string {
  const entrega = alumno.entrega;
  const defensa = alumno.defensa;
  const cuando =
    entrega && defensa && entrega.dia === defensa.dia
      ? `entregó y defendió el ${nombreDelDia(defensa.dia)}`
      : `entregó${entrega ? ` el ${diaLargo(entrega.dia)}` : ''}${defensa ? ` y defendió el ${diaLargo(defensa.dia)}` : ''}`;
  const reporte = estadoDe(alumno) === 'revisado' ? 'Su reporte ya está revisado' : 'Su reporte está por revisar';
  const partes =
    alumno.partesParaOir > 0
      ? ` y tiene ${cantidadEnLetra(alumno.partesParaOir).toLowerCase()} ${alumno.partesParaOir === 1 ? 'parte' : 'partes'} para oír`
      : '';
  return `${alumno.primerNombre} ${cuando}. ${reporte}${partes}.`;
}

/** "Listo. Junté los 31 trabajos entregados en un archivo." */
export function fraseDescarga(lista: boolean, entregaron: number): string {
  return lista
    ? `Listo. Junté los ${entregaron} trabajos entregados en un archivo.`
    : `Juntando los ${entregaron} trabajos entregados…`;
}

/** "El de la muestra. De 27 defensas, 5 lo explicaron, 16 en parte y 4 no lo mencionaron." */
export function fraseObjetivo(conteo: ConteoObjetivo, defendieron: number): string {
  return `${conteo.objetivo.alias}. De ${defendieron} defensas, ${conteo.explico} lo explicaron, ${conteo.enParte} en parte y ${conteo.noSalio} no lo mencionaron.`;
}

/** "Este es el grupo por estado. Los 19 que te esperan van en el orden en que defendieron." */
export function fraseLista(porRevisar: number): string {
  return `Este es el grupo por estado. Los ${porRevisar} que te esperan van en el orden en que defendieron.`;
}

/**
 * Título de la pestaña en cada escena del inicio. Sin " · ": el título dice
 * dónde estás, no adorna.
 */
export const TITULOS_DE_ESCENA: Readonly<Record<EscenaProfesor, string>> = {
  inicio: 'Inicio con Celestea',
  pensando: 'Celestea está pensando',
  avance: 'Celestea: ¿Cuántos defendieron?',
  ana: 'Celestea: Ana Torres',
  descarga: 'Celestea: Descargar trabajos',
  lista: 'Celestea: Grupo por estado',
  objetivos: 'Celestea: Lo que mostró el grupo',
  otro: 'Celestea',
};

/* ------------------------------------------------------------------------ */
/* Respuestas sobre una defensa concreta                                    */
/* ------------------------------------------------------------------------ */

export interface ContextoDeRespuesta {
  alumno: Alumno;
  reporte: ReporteAlumno;
  /** Conteos del grupo por objetivo, para comparar. */
  conteos: readonly ConteoObjetivo[];
  /** Cuántos del grupo defendieron. */
  defendieron: number;
}

export interface RespuestaSobreElReporte {
  texto: string;
  /** Número de la pregunta (1 a 3) a la que se puede ir desde la respuesta. */
  irAPregunta: number | null;
}

/** 0 es lo que menos se mostró; un objetivo sin dato no cuenta como duda. */
const PESO_NIVEL: Readonly<Record<NivelEvidencia, number>> = { 'no-salio': 0, 'en-parte': 1, explico: 2 };

/** Posición del bloque donde menos se mostró el objetivo, o -1 si todo se explicó. */
function indiceDelPeor(bloques: readonly BloqueReporte[]): number {
  let indice = -1;
  let peso = PESO_NIVEL.explico;
  bloques.forEach((bloque, posicion) => {
    if (bloque.nivel && PESO_NIVEL[bloque.nivel] < peso) {
      peso = PESO_NIVEL[bloque.nivel];
      indice = posicion;
    }
  });
  return indice;
}

function resumenDeNiveles(alumno: Alumno, bloques: readonly BloqueReporte[]): string {
  const cuenta = (nivel: NivelEvidencia) => bloques.filter((bloque) => bloque.nivel === nivel).length;
  const segmentos: string[] = [];
  if (cuenta('explico') > 0) segmentos.push(`explicó ${cuenta('explico')}`);
  if (cuenta('en-parte') > 0) segmentos.push(`${cuenta('en-parte')} en parte`);
  if (cuenta('no-salio') > 0) segmentos.push(`no mostró ${cuenta('no-salio')}`);
  if (segmentos.length === 0) return `No hay evidencia de ${alumno.primerNombre} para resumir.`;
  const ultimo = segmentos[segmentos.length - 1];
  const inicio = segmentos.slice(0, -1);
  const lista = inicio.length > 0 ? `${inicio.join(', ')} y ${ultimo}` : ultimo;
  return `De los ${bloques.length} objetivos, ${alumno.primerNombre} ${lista}.`;
}

/** Cuántos del grupo quedaron en el mismo nivel que el alumno en ese objetivo. */
function mismosQueEl(conteo: ConteoObjetivo, nivel: NivelEvidencia): number {
  if (nivel === 'explico') return conteo.explico;
  if (nivel === 'en-parte') return conteo.enParte;
  return conteo.noSalio;
}

function fraseDeComparacion(contexto: ContextoDeRespuesta): string {
  const { alumno, reporte, conteos, defendieron } = contexto;
  const indice = indiceDelPeor(reporte.bloques);
  const bloque = reporte.bloques[indice];
  const conteo = conteos[indice];
  if (indice < 0 || !bloque || !bloque.nivel || !conteo) {
    return `${alumno.primerNombre} explicó los objetivos que se le preguntaron; no hay una parte donde se aparte del grupo.`;
  }
  const mismos = mismosQueEl(conteo, bloque.nivel);
  const comoLaMayoria = mismos * 2 > defendieron;
  const inicio = comoLaMayoria ? 'Va como la mayoría' : 'Va con una parte del grupo';
  const tema = bloque.objetivo.tema;
  const hecho =
    bloque.nivel === 'en-parte'
      ? `explicaron ${tema} solo en parte`
      : `no mencionaron ${tema}`;
  const otros = reporte.bloques.filter((_, posicion) => posicion !== indice);
  const otrosExplicados = otros.length > 0 && otros.every((otro) => otro.nivel === 'explico');
  const cola = otrosExplicados
    ? ` En los otros ${cantidadEnLetra(otros.length).toLowerCase()} objetivos está con quienes sí lo explicaron.`
    : '';
  return `${inicio}: ${mismos} de ${defendieron} ${hecho}.${cola}`;
}

/**
 * Lo que Celestea contesta sobre una defensa. Son lecturas armadas con los
 * datos del reporte y del grupo (o redactadas con el reporte); nunca texto
 * nuevo inventado en el momento.
 */
export function respuestaDelReporte(rama: RamaReporte, contexto: ContextoDeRespuesta): RespuestaSobreElReporte {
  const { alumno, reporte } = contexto;

  if (rama === 'duda') {
    const conAnalisis = reporte.bloques.findIndex((bloque) => Boolean(bloque.respuesta?.analisis));
    const analisis = reporte.bloques[conAnalisis]?.respuesta?.analisis;
    if (conAnalisis >= 0 && analisis) {
      return { texto: `En la pregunta ${conAnalisis + 1}. ${analisis}`, irAPregunta: conAnalisis + 1 };
    }
    const peor = indiceDelPeor(reporte.bloques);
    const bloque = reporte.bloques[peor];
    if (peor < 0 || !bloque) {
      return {
        texto: `${alumno.primerNombre} explicó los objetivos que se le preguntaron; no hay una parte donde se note duda.`,
        irAPregunta: null,
      };
    }
    const como = bloque.nivel === 'en-parte' ? 'lo explicó en parte' : 'no lo mostró';
    return {
      texto: `En la pregunta ${peor + 1}. En «${bloque.objetivo.texto}» ${como}.`,
      irAPregunta: peor + 1,
    };
  }

  if (rama === 'resumen') {
    return { texto: reporte.resumen ?? resumenDeNiveles(alumno, reporte.bloques), irAPregunta: null };
  }

  if (rama === 'compara') {
    return { texto: fraseDeComparacion(contexto), irAPregunta: null };
  }

  return {
    texto: 'Eso todavía no lo sé responder. Puedo decirte dónde dudó, resumir su defensa o compararla con el grupo.',
    irAPregunta: null,
  };
}

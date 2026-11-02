import type { NivelEvidencia } from '../celeste/types';
import {
  LIMITES_TARJETAS,
  type DiaDeRitmo,
  type FiltroLista,
  type FilaLista,
  type GrupoPorNivel,
  type PersonaEnTarjeta,
  type PropsTarjetaLista,
  type PropsTarjetaObjetivo,
  type PropsTarjetaRitmo,
} from './catalogo';
import { conteoPorObjetivo, estadoDe, textoDeDefensa, textoDeEntrega, textoPartesParaOir } from './derivados';
import { claveDeOrden } from './fechas';
import type { Alumno, MarcaDeTiempo, Objetivo } from './types';

/**
 * Arma los props de las tarjetas nuevas del catálogo a partir de la lista de
 * alumnos, igual que `derivados.ts`: ninguna cifra ni nombre se escribe a mano.
 *
 * Son funciones puras para que el servidor del asistente (fase 2) las use tal
 * cual al "hidratar" lo que eligió el modelo, y para que las maquetas muestren
 * hoy lo mismo que se verá con datos reales.
 */

function persona(alumno: Alumno): PersonaEnTarjeta {
  return { matricula: alumno.matricula, nombre: alumno.nombre, iniciales: alumno.iniciales };
}

/* ------------------------------------------------------------------------ */
/* Lista filtrada                                                           */
/* ------------------------------------------------------------------------ */

export interface OpcionesLista {
  /** Solo para `nivel-en-objetivo`. */
  objetivo?: Objetivo;
  nivel?: NivelEvidencia | null;
}

const TITULO_DE_FILTRO: Readonly<Record<Exclude<FiltroLista, 'nivel-en-objetivo'>, string>> = {
  'sin-entregar': 'No han entregado',
  'sin-defensa': 'Entregaron sin defender',
  'por-revisar': 'Reportes por revisar',
  revisado: 'Reportes ya revisados',
  tarde: 'Entregaron o defendieron tarde',
  incompleta: 'Defensas incompletas',
  'otra-version': 'Subieron otra versión',
  'partes-para-oir': 'Reportes con algo para oír',
};

const VACIO_DE_FILTRO: Readonly<Record<Exclude<FiltroLista, 'nivel-en-objetivo'>, string>> = {
  'sin-entregar': 'Todo el grupo ya entregó.',
  'sin-defensa': 'Nadie tiene la defensa pendiente.',
  'por-revisar': 'No te espera ningún reporte.',
  revisado: 'Todavía no revisas ningún reporte.',
  tarde: 'Nadie entregó ni defendió después del cierre.',
  incompleta: 'Ninguna defensa quedó incompleta.',
  'otra-version': 'Nadie subió otra versión.',
  'partes-para-oir': 'Ningún reporte trae algo para oír.',
};

const NOMBRE_DE_NIVEL: Readonly<Record<NivelEvidencia, string>> = {
  explico: 'Lo explicaron',
  'en-parte': 'Lo explicaron en parte',
  'no-salio': 'No salió',
};

function cumple(alumno: Alumno, filtro: FiltroLista, opciones: OpcionesLista): boolean {
  switch (filtro) {
    case 'tarde':
      return alumno.entregaTardia || alumno.defensaTardia;
    case 'incompleta':
      return alumno.defensaIncompleta;
    case 'otra-version':
      return alumno.subioOtraVersion;
    case 'partes-para-oir':
      return alumno.defensa !== null && alumno.partesParaOir > 0;
    case 'nivel-en-objetivo': {
      if (!opciones.objetivo || alumno.defensa === null) return false;
      const valor = alumno.evidencia[opciones.objetivo.id - 1] ?? null;
      return valor === (opciones.nivel ?? null);
    }
    default:
      return estadoDe(alumno) === filtro;
  }
}

function filaDe(alumno: Alumno): FilaLista {
  const estado = estadoDe(alumno);
  const etiquetas: { texto: string; tipo: 'neutra' | 'oir' }[] = [];
  if (alumno.entregaTardia) etiquetas.push({ texto: 'Entregó tarde', tipo: 'neutra' });
  if (alumno.defensaTardia) etiquetas.push({ texto: 'Defendió tarde', tipo: 'neutra' });
  if (alumno.defensaIncompleta) etiquetas.push({ texto: 'Incompleta', tipo: 'neutra' });
  if (alumno.defensa && alumno.partesParaOir > 0) etiquetas.push({ texto: textoPartesParaOir(alumno.partesParaOir), tipo: 'oir' });
  const detalle = (alumno.defensa ? textoDeDefensa(alumno) : textoDeEntrega(alumno)).slice(0, LIMITES_TARJETAS.detalle);
  const accion: FilaLista['accion'] =
    estado === 'por-revisar' ? 'abrir' : estado === 'revisado' ? 'ver' : estado === 'sin-defensa' ? 'bajar' : null;
  return { ...persona(alumno), detalle, etiquetas: etiquetas.slice(0, 3), accion };
}

/** Quienes cumplen un filtro cerrado, en el orden de la lista por estado y con un tope de filas. */
export function listaFiltrada(alumnos: readonly Alumno[], filtro: FiltroLista, opciones: OpcionesLista = {}): PropsTarjetaLista {
  const cumplen = alumnos
    .filter((alumno) => cumple(alumno, filtro, opciones))
    .sort((a, b) => claveDeOrden(a.defensa ?? a.entrega) - claveDeOrden(b.defensa ?? b.entrega) || a.nombre.localeCompare(b.nombre, 'es'));

  let titulo: string;
  let vacio: string;
  if (filtro === 'nivel-en-objetivo') {
    const nivel = opciones.nivel ? NOMBRE_DE_NIVEL[opciones.nivel] : 'Sin dato';
    const numero = opciones.objetivo?.id ?? 0;
    titulo = `Objetivo ${numero}: ${nivel.toLowerCase()}`;
    vacio = 'Nadie quedó en ese nivel.';
  } else {
    titulo = TITULO_DE_FILTRO[filtro];
    vacio = VACIO_DE_FILTRO[filtro];
  }

  return {
    titulo,
    filas: cumplen.slice(0, LIMITES_TARJETAS.filasLista).map(filaDe),
    total: cumplen.length,
    vacio,
  };
}

/* ------------------------------------------------------------------------ */
/* Un objetivo de cerca                                                     */
/* ------------------------------------------------------------------------ */

/** Cuántos lo explicaron y, con nombre, quiénes no del todo. `null` si el objetivo no existe. */
export function objetivoDeCerca(alumnos: readonly Alumno[], objetivos: readonly Objetivo[], id: 1 | 2 | 3): PropsTarjetaObjetivo | null {
  const conteo = conteoPorObjetivo(alumnos, objetivos).find((candidato) => candidato.objetivo.id === id);
  if (!conteo) return null;
  const defendieron = alumnos.filter((alumno) => alumno.defensa !== null);
  const niveles: ReadonlyArray<NivelEvidencia | null> = ['en-parte', 'no-salio', null];
  const porNivel: GrupoPorNivel[] = niveles
    .map((nivel) => {
      const quienes = defendieron
        .filter((alumno) => (alumno.evidencia[id - 1] ?? null) === nivel)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      return { nivel, personas: quienes.slice(0, LIMITES_TARJETAS.nombresPorNivel).map(persona), total: quienes.length };
    })
    // "Sin dato" solo aparece si alguien quedó ahí.
    .filter((grupo) => grupo.nivel !== null || grupo.total > 0);
  return { conteo, defendieron: defendieron.length, porNivel };
}

/* ------------------------------------------------------------------------ */
/* Ritmo de entregas y defensas                                             */
/* ------------------------------------------------------------------------ */

/** "3 min 40 s" → 220; `null` si no se entiende. */
function segundosDe(duracion: string | null): number | null {
  if (!duracion) return null;
  const coincide = /^(?:(\d+) min)?\s*(?:(\d+) s)?$/.exec(duracion.trim());
  if (!coincide || (!coincide[1] && !coincide[2])) return null;
  return Number(coincide[1] ?? 0) * 60 + Number(coincide[2] ?? 0);
}

function duracionDe(segundos: number): string {
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  return minutos > 0 ? `${minutos} min ${resto} s` : `${resto} s`;
}

/** Con menos de estas defensas medidas, "lo típico" no dice nada y no se muestra. */
const MINIMO_PARA_TIPICA = 5;

/** Entregas y defensas por día, lo que llegó tarde y la duración típica de una defensa. */
export function ritmoDelGrupo(alumnos: readonly Alumno[], cierre: MarcaDeTiempo): PropsTarjetaRitmo {
  const dias = new Map<string, DiaDeRitmo & { orden: number }>();
  const contar = (marca: MarcaDeTiempo | null, campo: 'entregas' | 'defensas') => {
    if (!marca) return;
    const actual = dias.get(marca.dia) ?? { dia: marca.dia, entregas: 0, defensas: 0, esCierre: marca.dia === cierre.dia, orden: claveDeOrden(marca) };
    actual[campo] += 1;
    actual.orden = Math.min(actual.orden, claveDeOrden(marca));
    dias.set(marca.dia, actual);
  };
  for (const alumno of alumnos) {
    contar(alumno.entrega, 'entregas');
    contar(alumno.defensa, 'defensas');
  }

  const segundos = alumnos
    .map((alumno) => segundosDe(alumno.duracion))
    .filter((valor): valor is number => valor !== null)
    .sort((a, b) => a - b);
  const mitad = segundos[Math.floor(segundos.length / 2)];

  return {
    dias: Array.from(dias.values())
      .sort((a, b) => a.orden - b.orden)
      .slice(-LIMITES_TARJETAS.dias)
      .map(({ dia, entregas, defensas, esCierre }) => ({ dia, entregas, defensas, esCierre })),
    tarde: {
      entregas: alumnos.filter((alumno) => alumno.entregaTardia).length,
      defensas: alumnos.filter((alumno) => alumno.defensaTardia).length,
    },
    duracionTipica: segundos.length >= MINIMO_PARA_TIPICA && mitad !== undefined ? duracionDe(mitad) : null,
  };
}

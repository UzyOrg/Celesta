import type { DiaCorto, MarcaDeTiempo } from './types';

/**
 * Ayudas de fecha para el escenario de ejemplo.
 *
 * El escenario ocurre completo en octubre; los días vienen como los escribe el
 * diseño ("vie 9"). No se usa `Date` ni el reloj del navegador, así el servidor
 * y el cliente siempre pintan lo mismo.
 */

const MES = 'octubre';
const MES_CORTO = 'oct';

interface DatosDia {
  /** "viernes". */
  nombre: string;
  numero: number;
}

const DIAS: Readonly<Record<DiaCorto, DatosDia>> = {
  'lun 5': { nombre: 'lunes', numero: 5 },
  'mar 6': { nombre: 'martes', numero: 6 },
  'mié 7': { nombre: 'miércoles', numero: 7 },
  'jue 8': { nombre: 'jueves', numero: 8 },
  'vie 9': { nombre: 'viernes', numero: 9 },
  'sáb 10': { nombre: 'sábado', numero: 10 },
};

const DIAS_VALIDOS: readonly DiaCorto[] = ['lun 5', 'mar 6', 'mié 7', 'jue 8', 'vie 9', 'sáb 10'];

function esDiaCorto(valor: string): valor is DiaCorto {
  return (DIAS_VALIDOS as readonly string[]).includes(valor);
}

/** "vie 9" -> "viernes 9". */
export function diaLargo(dia: DiaCorto): string {
  const datos = DIAS[dia];
  return `${datos.nombre} ${datos.numero}`;
}

/** "vie 9" -> "viernes". */
export function nombreDelDia(dia: DiaCorto): string {
  return DIAS[dia].nombre;
}

/** "vie 9" -> "viernes 9 de octubre". */
export function diaConMes(dia: DiaCorto): string {
  return `${diaLargo(dia)} de ${MES}`;
}

/** "21:05" en el viernes 9 -> "vie 9 oct, 21:05". */
export function marcaCorta(marca: MarcaDeTiempo): string {
  return `${marca.dia} ${MES_CORTO}, ${marca.hora}`;
}

/** "viernes 9 de octubre a las 23:59". */
export function marcaLargaConMes(marca: MarcaDeTiempo): string {
  return `${diaConMes(marca.dia)} a las ${marca.hora}`;
}

/** "Viernes 9, 21:05". */
export function marcaCapital(marca: MarcaDeTiempo): string {
  const texto = diaLargo(marca.dia);
  return `${texto.charAt(0).toUpperCase()}${texto.slice(1)}, ${marca.hora}`;
}

/** El audio se borra siete días después de la defensa: "viernes 16 de octubre". */
export function diaDeBorradoDelAudio(marca: MarcaDeTiempo): string {
  const datos = DIAS[marca.dia];
  return `${datos.nombre} ${datos.numero + 7} de ${MES}`;
}

/** Clave numérica para ordenar marcas de tiempo, de la más antigua a la más reciente. */
export function claveDeOrden(marca: MarcaDeTiempo | null): number {
  if (!marca) return 0;
  const hora = Number.parseInt(marca.hora.replace(':', ''), 10);
  return DIAS[marca.dia].numero * 10000 + (Number.isNaN(hora) ? 0 : hora);
}

/** Convierte "vie 9|21:05" (formato del diseño) en una marca; "" es sin marca. */
export function leerMarca(texto: string): MarcaDeTiempo | null {
  if (!texto) return null;
  const [dia, hora] = texto.split('|');
  if (!dia || !hora || !esDiaCorto(dia)) return null;
  return { dia, hora };
}

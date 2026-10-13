/**
 * Horas y fechas que ve el alumno, siempre en hora de México: un trabajo entregado a las
 * 21:05 dice 21:05 aunque el teléfono tenga otra zona configurada.
 */

const ZONA = 'America/Mexico_City';

export function horaMexico(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
}

/** "9 de octubre". */
export function diaYMes(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', { timeZone: ZONA, day: 'numeric', month: 'long' }).format(new Date(iso));
}

/** "viernes 9 de octubre". */
export function diaCompleto(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', { timeZone: ZONA, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso));
}

/** "Entregado el viernes 9 de octubre a las 21:05": lo que lee un lector de pantalla en el sello. */
export function selloAccesible(iso: string): string {
  return `Entregado el ${diaCompleto(iso)} a las ${horaMexico(iso)}`;
}

import type { MarcaDeTiempo } from './types';

/**
 * Ayudas de fecha.
 *
 * Las marcas llegan ya formateadas ("vie 9", "21:05", "octubre") desde el
 * servidor, en hora de México. Aquí no se usa `Date` ni el reloj del navegador
 * para pintar, así el servidor y el cliente siempre dibujan lo mismo. El
 * escenario de ejemplo escribe sus marcas a mano y, sin mes, se entiende que son
 * de octubre.
 */

const MES_DEL_EJEMPLO = 'octubre';

const NOMBRE_DEL_DIA: Readonly<Record<string, string>> = {
  lun: 'lunes',
  mar: 'martes',
  mié: 'miércoles',
  jue: 'jueves',
  vie: 'viernes',
  sáb: 'sábado',
  dom: 'domingo',
};

interface DatosDia {
  /** "viernes". */
  nombre: string;
  numero: number;
}

function datosDelDia(dia: string): DatosDia {
  const [abreviatura = '', numero = ''] = dia.split(' ');
  return { nombre: NOMBRE_DEL_DIA[abreviatura] ?? abreviatura, numero: Number.parseInt(numero, 10) };
}

const mesDe = (marca: MarcaDeTiempo): string => marca.mes ?? MES_DEL_EJEMPLO;
const mesCorto = (mes: string): string => mes.slice(0, 3);

/** "vie 9" -> "viernes 9". */
export function diaLargo(dia: string): string {
  const datos = datosDelDia(dia);
  return `${datos.nombre} ${datos.numero}`;
}

/** "vie 9" -> "viernes". */
export function nombreDelDia(dia: string): string {
  return datosDelDia(dia).nombre;
}

/** "vie 9" -> "viernes 9 de octubre". */
export function diaConMes(dia: string, mes: string = MES_DEL_EJEMPLO): string {
  return `${diaLargo(dia)} de ${mes}`;
}

/** "21:05" en el viernes 9 -> "vie 9 oct, 21:05". */
export function marcaCorta(marca: MarcaDeTiempo): string {
  return `${marca.dia} ${mesCorto(mesDe(marca))}, ${marca.hora}`;
}

/** "viernes 9 de octubre a las 23:59". */
export function marcaLargaConMes(marca: MarcaDeTiempo): string {
  return `${diaConMes(marca.dia, mesDe(marca))} a las ${marca.hora}`;
}

/** "Viernes 9, 21:05". */
export function marcaCapital(marca: MarcaDeTiempo): string {
  const texto = diaLargo(marca.dia);
  return `${texto.charAt(0).toUpperCase()}${texto.slice(1)}, ${marca.hora}`;
}

const UN_DIA_MS = 24 * 60 * 60 * 1000;

/**
 * El audio se borra siete días después de la defensa: "viernes 16 de octubre".
 * Con `instante` se suma el calendario de verdad; sin él (el ejemplo), solo el
 * número del día.
 */
export function diaDeBorradoDelAudio(marca: MarcaDeTiempo): string {
  if (marca.instante !== undefined) {
    const borrado = marcaDeFecha(new Date(marca.instante + 7 * UN_DIA_MS));
    return diaConMes(borrado.dia, borrado.mes);
  }
  const datos = datosDelDia(marca.dia);
  return `${datos.nombre} ${datos.numero + 7} de ${MES_DEL_EJEMPLO}`;
}

/** Clave numérica para ordenar marcas de tiempo, de la más antigua a la más reciente. */
export function claveDeOrden(marca: MarcaDeTiempo | null): number {
  if (!marca) return 0;
  if (marca.instante !== undefined) return marca.instante;
  const hora = Number.parseInt(marca.hora.replace(':', ''), 10);
  return datosDelDia(marca.dia).numero * 10000 + (Number.isNaN(hora) ? 0 : hora);
}

/** Convierte "vie 9|21:05" (formato del diseño) en una marca; "" es sin marca. */
export function leerMarca(texto: string): MarcaDeTiempo | null {
  if (!texto) return null;
  const [dia, hora] = texto.split('|');
  if (!dia || !hora || !/^[a-zñáéíóú]{3} \d{1,2}$/.test(dia) || !/^\d{2}:\d{2}$/.test(hora)) return null;
  return { dia, hora };
}

const ZONA_DE_MEXICO = 'America/Mexico_City';

/** La marca de un momento real, en hora de México. Solo se llama en el servidor. */
export function marcaDeFecha(fecha: Date, zona: string = ZONA_DE_MEXICO): MarcaDeTiempo {
  const partes = new Intl.DateTimeFormat('es-MX', {
    timeZone: zona,
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(fecha);
  const valor = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? '';
  const abreviatura = valor('weekday').replace('.', '').toLowerCase().slice(0, 3);
  return {
    dia: `${abreviatura} ${valor('day')}`,
    hora: `${valor('hour').padStart(2, '0')}:${valor('minute').padStart(2, '0')}`,
    mes: valor('month').toLowerCase(),
    instante: fecha.getTime(),
  };
}

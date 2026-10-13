import 'server-only';
import type { PalabraTranscrita } from './providers/tipos';

/**
 * La transcripción como lista de palabras con confianza y tiempo.
 *
 * Aquí viven tres cosas, todas puras:
 *  - elegir la parte que Celestea no entendió (el hueco de la aclaración puntual);
 *  - rellenarla con lo que diga o escriba el alumno, sin adivinar nada;
 *  - partir la respuesta en líneas con su minuto, para la revisión del alumno y el
 *    reporte del profesor.
 *
 * La IA nunca llena un hueco: lo llena el alumno, o queda como "no se entendió".
 */

export const TEXTO_NO_ENTENDIDO = '[no se entendió]';

export interface Hueco {
  /** Índices dentro de la lista de palabras, ambos incluidos. */
  indiceInicio: number;
  indiceFin: number;
  inicioMs: number;
  finMs: number;
  /** La frase de contexto antes del hueco, ya con "…" si hay más antes. */
  antes: string;
  /** La frase de contexto después del hueco, ya con "…" si hay más después. */
  despues: string;
  /** Lo que el transcriptor creyó oír; solo para el registro, no se muestra. */
  confianzaMedia: number;
}

export interface OpcionesHueco {
  /** Un tramo más largo que esto es ruido, no una frase que valga la pena pedir de nuevo. */
  maxPalabras?: number;
  palabrasAntes?: number;
  palabrasDespues?: number;
}

/** Muletillas que el transcriptor suele oír con poca confianza y que nadie necesita aclarar. */
const MULETILLAS = new Set(['eh', 'em', 'mm', 'mmm', 'ah', 'uh', 'um', 'hmm', 'ehh', 'emm']);
const SOLO_SIGNOS = new RegExp('^[^\\p{L}\\p{N}]+$', 'u');
const FIN_DE_ORACION = new RegExp('[.!?…]["»”)\\]]*$', 'u');

function limpia(texto: string): string {
  return texto.toLowerCase().replace(new RegExp('[^\\p{L}\\p{N}]', 'gu'), '');
}

function esAclarable(palabra: PalabraTranscrita): boolean {
  if (palabra.aclarada || palabra.noEntendida) return false;
  if (SOLO_SIGNOS.test(palabra.texto)) return false;
  return !MULETILLAS.has(limpia(palabra.texto));
}

/**
 * Busca el tramo seguido de palabras con confianza bajo el umbral y se queda con el
 * que más pesa (más palabras y más dudosas). Devuelve null si no hay ninguno
 * aclarable: eso es lo normal, y en ese caso no se interrumpe al alumno.
 */
export function elegirHueco(
  palabras: readonly PalabraTranscrita[],
  umbral: number,
  opciones: OpcionesHueco = {},
): Hueco | null {
  const maxPalabras = opciones.maxPalabras ?? 8;
  const palabrasAntes = opciones.palabrasAntes ?? 4;
  const palabrasDespues = opciones.palabrasDespues ?? 5;

  let mejor: { inicio: number; fin: number; peso: number } | null = null;
  let inicio = -1;

  const cerrar = (fin: number) => {
    if (inicio < 0) return;
    const largo = fin - inicio + 1;
    if (largo <= maxPalabras) {
      let peso = 0;
      for (let i = inicio; i <= fin; i += 1) peso += umbral - (palabras[i] as PalabraTranscrita).confianza;
      if (!mejor || peso > mejor.peso) mejor = { inicio, fin, peso };
    }
    inicio = -1;
  };

  palabras.forEach((palabra, i) => {
    if (palabra.confianza < umbral && esAclarable(palabra)) {
      if (inicio < 0) inicio = i;
    } else {
      cerrar(i - 1);
    }
  });
  cerrar(palabras.length - 1);

  const elegido = mejor as { inicio: number; fin: number; peso: number } | null;
  if (!elegido) return null;

  const primera = palabras[elegido.inicio] as PalabraTranscrita;
  const ultima = palabras[elegido.fin] as PalabraTranscrita;
  const desdeAntes = Math.max(0, elegido.inicio - palabrasAntes);
  const hastaDespues = Math.min(palabras.length, elegido.fin + 1 + palabrasDespues);
  const antes = palabras.slice(desdeAntes, elegido.inicio).map((p) => p.texto).join(' ');
  const despues = palabras.slice(elegido.fin + 1, hastaDespues).map((p) => p.texto).join(' ');
  const enHueco = palabras.slice(elegido.inicio, elegido.fin + 1);
  const confianzaMedia = enHueco.reduce((suma, p) => suma + p.confianza, 0) / enHueco.length;

  return {
    indiceInicio: elegido.inicio,
    indiceFin: elegido.fin,
    inicioMs: primera.inicioMs,
    finMs: ultima.finMs,
    antes: antes ? `${desdeAntes > 0 ? '…' : ''}${antes}` : '',
    despues: despues ? `${despues}${hastaDespues < palabras.length ? '…' : ''}` : '',
    confianzaMedia,
  };
}

/**
 * Pone en el hueco lo que dijo o escribió el alumno. Con `relleno` en null el hueco
 * queda como "no se entendió" y el reporte no lo usa en su contra.
 */
export function aplicarRelleno(
  palabras: readonly PalabraTranscrita[],
  hueco: Pick<Hueco, 'indiceInicio' | 'indiceFin' | 'inicioMs' | 'finMs'>,
  relleno: string | null,
): PalabraTranscrita[] {
  const antes = palabras.slice(0, hueco.indiceInicio);
  const despues = palabras.slice(hueco.indiceFin + 1);

  if (relleno === null || relleno.trim().length === 0) {
    const noEntendida: PalabraTranscrita = {
      texto: TEXTO_NO_ENTENDIDO,
      inicioMs: hueco.inicioMs,
      finMs: hueco.finMs,
      confianza: 0,
      noEntendida: true,
    };
    return [...antes, noEntendida, ...despues];
  }

  const trozos = relleno.trim().split(/\s+/);
  const ancho = Math.max(0, hueco.finMs - hueco.inicioMs) / trozos.length;
  const nuevas: PalabraTranscrita[] = trozos.map((texto, i) => ({
    texto,
    inicioMs: Math.round(hueco.inicioMs + ancho * i),
    finMs: Math.round(hueco.inicioMs + ancho * (i + 1)),
    confianza: 1,
    aclarada: true,
  }));
  return [...antes, ...nuevas, ...despues];
}

export function textoDe(palabras: readonly PalabraTranscrita[]): string {
  return palabras.map((p) => p.texto).join(' ');
}

/** 14000 → "00:14". */
export function tiempoCorto(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutos = Math.floor(total / 60);
  const segundos = total % 60;
  return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
}

export interface SegmentoLinea {
  texto: string;
  /** Lo que el alumno puso al aclarar. */
  aclarado?: boolean;
  noEntendido?: boolean;
}

export interface LineaTranscrita {
  id: string;
  /** Minuto y segundo dentro de la respuesta. */
  tiempo: string;
  inicioMs: number;
  /** Dónde termina la línea dentro del audio de la respuesta. */
  finMs: number;
  segmentos: SegmentoLinea[];
  /** Algún tramo de la línea lo aclaró el alumno. */
  aclarada: boolean;
}

const PALABRAS_POR_LINEA = 14;
const PAUSA_PARA_NUEVA_LINEA_MS = 1_500;

/** Parte la respuesta en líneas por oración, por pausa larga o cada 14 palabras. */
export function construirLineas(idBase: string, palabras: readonly PalabraTranscrita[]): LineaTranscrita[] {
  const grupos: PalabraTranscrita[][] = [];
  let actual: PalabraTranscrita[] = [];

  palabras.forEach((palabra, i) => {
    const anterior = palabras[i - 1];
    const pausaLarga = anterior ? palabra.inicioMs - anterior.finMs >= PAUSA_PARA_NUEVA_LINEA_MS : false;
    const cierraOracion = anterior ? FIN_DE_ORACION.test(anterior.texto) : false;
    if (actual.length > 0 && (cierraOracion || pausaLarga || actual.length >= PALABRAS_POR_LINEA)) {
      grupos.push(actual);
      actual = [];
    }
    actual.push(palabra);
  });
  if (actual.length > 0) grupos.push(actual);

  return grupos.map((grupo, n) => {
    const segmentos: SegmentoLinea[] = [];
    for (const palabra of grupo) {
      const aclarado = palabra.aclarada === true;
      const noEntendido = palabra.noEntendida === true;
      const ultimo = segmentos[segmentos.length - 1];
      if (ultimo && Boolean(ultimo.aclarado) === aclarado && Boolean(ultimo.noEntendido) === noEntendido) {
        ultimo.texto = `${ultimo.texto} ${palabra.texto}`;
      } else {
        const segmento: SegmentoLinea = { texto: palabra.texto };
        if (aclarado) segmento.aclarado = true;
        if (noEntendido) segmento.noEntendido = true;
        segmentos.push(segmento);
      }
    }
    // Un espacio entre segmentos para que, pegados, se lean como una sola frase.
    segmentos.forEach((segmento, i) => {
      if (i < segmentos.length - 1) segmento.texto = `${segmento.texto} `;
    });
    return {
      id: `${idBase}:${n}`,
      tiempo: tiempoCorto((grupo[0] as PalabraTranscrita).inicioMs),
      inicioMs: (grupo[0] as PalabraTranscrita).inicioMs,
      finMs: (grupo[grupo.length - 1] as PalabraTranscrita).finMs,
      segmentos,
      aclarada: segmentos.some((s) => s.aclarado === true),
    };
  });
}

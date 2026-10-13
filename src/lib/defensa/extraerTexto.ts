import 'server-only';
import { unzipSync, type UnzipFileInfo } from 'fflate';
import { getDocumentProxy } from 'unpdf';
import { LIMITES } from './config';
import { DefensaError } from './errores';
import { contarPalabras } from './etiquetas';

/**
 * Extracción del texto de una entrega.
 *
 * El archivo del alumno es un dato no confiable: nunca se abre en pantalla ni se
 * ejecuta, solo se lee su texto, con límites de tamaño y de tiempo. El tipo se
 * decide por los primeros bytes del archivo y no por su nombre ni por lo que
 * diga el navegador.
 *
 *  - PDF: se lee con PDF.js (unpdf), sin eval y solo las primeras páginas.
 *  - Word (.docx): es un zip; antes de abrirlo se revisa cuántas entradas tiene
 *    y cuánto pesa descomprimido, y solo se descomprime `word/document.xml`, con
 *    el tamaño declarado como tope. El .doc antiguo no se acepta.
 *
 * Un archivo sin texto (un escaneo, por ejemplo) no sirve: sin texto no hay
 * preguntas, y el alumno puede subir otro archivo o pegar el texto.
 */

export type TipoArchivo = 'pdf' | 'docx';

export const MIME_POR_TIPO: Readonly<Record<TipoArchivo, string>> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/** Menos palabras que esto en un archivo "con texto" es casi seguro un escaneo o un archivo vacío. */
export const MIN_PALABRAS_LEGIBLES = 20;

/** Tope del único archivo que se descomprime de un .docx. */
const DOCUMENTO_XML_MAX_BYTES = 40 * 1024 * 1024;

function esPdf(bytes: Uint8Array): boolean {
  const cabecera = new TextDecoder('latin1').decode(bytes.subarray(0, 1024));
  return cabecera.includes('%PDF-');
}

function esZip(bytes: Uint8Array): boolean {
  return bytes.length > 22 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

interface InspeccionZip {
  entradas: number;
  tieneDocumento: boolean;
  tamanoDocumento: number;
}

/** Lee solo el índice del zip (nombres y tamaños declarados); no descomprime nada. */
function inspeccionarZip(bytes: Uint8Array): InspeccionZip {
  const resultado: InspeccionZip = { entradas: 0, tieneDocumento: false, tamanoDocumento: 0 };
  let descomprimido = 0;
  try {
    unzipSync(bytes, {
      filter(archivo: UnzipFileInfo) {
        resultado.entradas += 1;
        descomprimido += archivo.originalSize;
        if (resultado.entradas > LIMITES.entradasDocx || descomprimido > LIMITES.docxDescomprimidoBytes) {
          throw new DefensaError('formato_no_aceptado', 415);
        }
        if (archivo.name === 'word/document.xml') {
          resultado.tieneDocumento = true;
          resultado.tamanoDocumento = archivo.originalSize;
        }
        return false;
      },
    });
  } catch (error) {
    if (error instanceof DefensaError) throw error;
    // Un zip dañado o que no es un zip.
    throw new DefensaError('formato_no_aceptado', 415);
  }
  return resultado;
}

/** PDF o Word según el contenido real; null si no es ninguno de los dos. */
export function detectarTipo(bytes: Uint8Array): TipoArchivo | null {
  if (esPdf(bytes)) return 'pdf';
  if (esZip(bytes)) return inspeccionarZip(bytes).tieneDocumento ? 'docx' : null;
  return null;
}

export interface TextoExtraido {
  tipo: TipoArchivo | 'texto';
  texto: string;
  paginas: number | null;
  palabras: number;
}

export interface OpcionesExtraccion {
  timeoutMs?: number;
  maxPaginas?: number;
  /** Reloj inyectable para probar el límite de tiempo. */
  ahora?: () => number;
}

const CONTROL = new RegExp('[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F\\uFFFE\\uFFFF]', 'g');

/** Texto limpio: sin caracteres de control, con espacios y saltos de línea razonables. */
export function normalizarTextoExtraido(crudo: string): string {
  return crudo
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL, ' ')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function exigirLegible(resultado: TextoExtraido): TextoExtraido {
  if (resultado.palabras < MIN_PALABRAS_LEGIBLES) throw new DefensaError('sin_texto', 422);
  return resultado;
}

// ── PDF ─────────────────────────────────────────────────────────────────────

async function extraerPdf(bytes: Uint8Array, opciones: Required<OpcionesExtraccion>): Promise<TextoExtraido> {
  const limite = opciones.ahora() + opciones.timeoutMs;
  let documento: Awaited<ReturnType<typeof getDocumentProxy>> | null = null;
  try {
    // PDF.js toma posesión del búfer; se le pasa una copia. La versión de unpdf es la compilada para
    // servidores: no usa eval ni hilos, y verbosity 0 calla los avisos de fuentes que no hacen falta.
    documento = await getDocumentProxy(bytes.slice(), { verbosity: 0 });
    const total = documento.numPages;
    const aLeer = Math.min(total, opciones.maxPaginas);
    const paginas: string[] = [];
    for (let numero = 1; numero <= aLeer; numero += 1) {
      if (opciones.ahora() > limite) throw new DefensaError('sin_texto', 422);
      const pagina = await documento.getPage(numero);
      const contenido = await pagina.getTextContent();
      let texto = '';
      for (const item of contenido.items) {
        if ('str' in item) texto += item.hasEOL ? `${item.str}\n` : `${item.str} `;
      }
      paginas.push(texto);
      pagina.cleanup();
    }
    const texto = normalizarTextoExtraido(paginas.join('\n\n'));
    return exigirLegible({ tipo: 'pdf', texto, paginas: total, palabras: contarPalabras(texto) });
  } catch (error) {
    if (error instanceof DefensaError) throw error;
    // Un PDF dañado o protegido con contraseña.
    throw new DefensaError('sin_texto', 422);
  } finally {
    try {
      // Libera la memoria del documento; los tipos de unpdf no declaran destroy() pero PDF.js lo tiene.
      await (documento as unknown as { destroy?: () => Promise<void> } | null)?.destroy?.();
    } catch {
      // Nada que limpiar.
    }
  }
}

// ── Word ────────────────────────────────────────────────────────────────────

const ENTIDADES: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

function decodificarEntidades(texto: string): string {
  return texto.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (coincidencia, nombre: string) => {
    if (nombre.startsWith('#x')) return codigo(Number.parseInt(nombre.slice(2), 16), coincidencia);
    if (nombre.startsWith('#')) return codigo(Number.parseInt(nombre.slice(1), 10), coincidencia);
    return ENTIDADES[nombre] ?? coincidencia;
  });
}

function codigo(valor: number, original: string): string {
  if (!Number.isFinite(valor) || valor < 0 || valor > 0x10ffff) return original;
  try {
    return String.fromCodePoint(valor);
  } catch {
    return original;
  }
}

/** De `word/document.xml` solo importa el texto: párrafos, tabulaciones y saltos. */
export function textoDeDocumentoXml(xml: string): string {
  const salida: string[] = [];
  const patron = /<(?:\w+:)?(t|tab|br|cr|p|tr)(?:\s[^>]*)?(\/?)>([^<]*)/g;
  let vistoCierreDeParrafo = false;
  let m = patron.exec(xml);
  while (m) {
    const etiqueta = m[1];
    const autocerrada = m[2] === '/';
    const contenido = m[3] ?? '';
    if (etiqueta === 't' && !autocerrada) {
      salida.push(decodificarEntidades(contenido));
      vistoCierreDeParrafo = false;
    } else if (etiqueta === 'tab') {
      salida.push('\t');
    } else if (etiqueta === 'br' || etiqueta === 'cr') {
      salida.push('\n');
    } else if ((etiqueta === 'p' || etiqueta === 'tr') && !vistoCierreDeParrafo) {
      // Cada párrafo nuevo abre con un salto, sin duplicarlo en párrafos vacíos seguidos.
      salida.push('\n');
      vistoCierreDeParrafo = true;
    }
    m = patron.exec(xml);
  }
  return salida.join('');
}

async function extraerDocx(bytes: Uint8Array): Promise<TextoExtraido> {
  const indice = inspeccionarZip(bytes);
  if (!indice.tieneDocumento) throw new DefensaError('formato_no_aceptado', 415);
  if (indice.tamanoDocumento > DOCUMENTO_XML_MAX_BYTES) throw new DefensaError('formato_no_aceptado', 415);

  let xml: string;
  try {
    // fflate reserva exactamente el tamaño declarado; si el contenido real es mayor, falla.
    const archivos = unzipSync(bytes, { filter: (archivo) => archivo.name === 'word/document.xml' });
    const documento = archivos['word/document.xml'];
    if (!documento) throw new DefensaError('formato_no_aceptado', 415);
    xml = new TextDecoder('utf-8').decode(documento);
  } catch (error) {
    if (error instanceof DefensaError) throw error;
    throw new DefensaError('formato_no_aceptado', 415);
  }
  const texto = normalizarTextoExtraido(textoDeDocumentoXml(xml));
  return exigirLegible({ tipo: 'docx', texto, paginas: null, palabras: contarPalabras(texto) });
}

// ── Entrada ─────────────────────────────────────────────────────────────────

/**
 * Extrae el texto de un PDF o de un Word. Lanza DefensaError con un código que el
 * alumno entiende: formato_no_aceptado, sin_texto o demasiado_grande.
 */
export async function extraerTextoDeArchivo(
  bytes: Uint8Array,
  opciones: OpcionesExtraccion = {},
): Promise<TextoExtraido> {
  if (bytes.byteLength > LIMITES.archivoBytes) throw new DefensaError('demasiado_grande', 413);
  const configuracion: Required<OpcionesExtraccion> = {
    timeoutMs: opciones.timeoutMs ?? LIMITES.extraccionMs,
    maxPaginas: opciones.maxPaginas ?? LIMITES.paginasPdf,
    ahora: opciones.ahora ?? Date.now,
  };

  const trabajo = (async () => {
    const tipo = detectarTipo(bytes);
    if (tipo === 'pdf') return extraerPdf(bytes, configuracion);
    if (tipo === 'docx') return extraerDocx(bytes);
    throw new DefensaError('formato_no_aceptado', 415);
  })();

  // Además del reloj entre páginas: si algo se atora, la solicitud no espera para siempre.
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rechazar) => {
    temporizador = setTimeout(() => rechazar(new DefensaError('sin_texto', 422)), configuracion.timeoutMs + 1_000);
  });
  try {
    return await Promise.race([trabajo, limite]);
  } finally {
    clearTimeout(temporizador);
    // Si ganó el límite, el trabajo termina solo y su error no se queda sin atender.
    trabajo.catch(() => undefined);
  }
}

/** Texto pegado: no hay archivo que abrir, solo limpiar y contar. */
export function extraerTextoPegado(crudo: string): TextoExtraido {
  if (crudo.length > LIMITES.textoPegadoCaracteres) throw new DefensaError('demasiado_grande', 413);
  const texto = normalizarTextoExtraido(crudo);
  return exigirLegible({ tipo: 'texto', texto, paginas: null, palabras: contarPalabras(texto) });
}

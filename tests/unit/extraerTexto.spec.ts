import '../support/sinServerOnly';
import { expect, test } from '@playwright/test';
import { strToU8, zipSync } from 'fflate';
import { LIMITES } from '../../src/lib/defensa/config';
import { DefensaError } from '../../src/lib/defensa/errores';
import {
  MIN_PALABRAS_LEGIBLES,
  detectarTipo,
  extraerTextoDeArchivo,
  extraerTextoPegado,
  normalizarTextoExtraido,
  textoDeDocumentoXml,
} from '../../src/lib/defensa/extraerTexto';
import { ORACIONES, TRABAJO } from '../support/fixtures';
import { docxConParrafos, docxConXml, documentoXml, palabrasDeRelleno, pdfConTexto } from '../support/archivos';

async function codigoDe(accion: () => Promise<unknown>): Promise<string> {
  try {
    await accion();
    return 'sin_error';
  } catch (error) {
    return error instanceof DefensaError ? error.codigo : `otro:${String(error)}`;
  }
}

const ASCII = 'El estudio uso una encuesta en linea porque necesitaba llegar a mas companeros en pocos dias y con entrevistas solo habria hablado con cinco personas durante la semana de entrega.';

test.describe('Word (.docx)', () => {
  test('extrae el texto párrafo por párrafo, con entidades y acentos', async () => {
    const r = await extraerTextoDeArchivo(docxConParrafos([ORACIONES[0], 'Dijo «sí» & después <nada> más.', ...ORACIONES.slice(1, 5)]));
    expect(r.tipo).toBe('docx');
    expect(r.paginas).toBeNull();
    expect(r.texto.split('\n')[0]).toBe(ORACIONES[0]);
    expect(r.texto).toContain('Dijo «sí» & después <nada> más.');
    expect(r.texto.split('\n')).toHaveLength(6);
    expect(r.palabras).toBeGreaterThan(MIN_PALABRAS_LEGIBLES);
  });

  test('tabulaciones, saltos y párrafos vacíos no ensucian el texto', () => {
    const xml =
      '<w:document xmlns:w="x"><w:body><w:p><w:r><w:t>Uno</w:t><w:tab/><w:t>dos</w:t><w:br/><w:t xml:space="preserve"> tres</w:t></w:r></w:p>' +
      '<w:p/><w:p></w:p><w:p><w:r><w:t>&#193;rbol &amp; &#x4F;ro &lt;fin&gt; &desconocida;</w:t></w:r></w:p>' +
      '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>celda</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>';
    expect(normalizarTextoExtraido(textoDeDocumentoXml(xml))).toBe('Uno dos\ntres\nÁrbol & Oro <fin> &desconocida;\ncelda');
  });

  test('un texto pegado de otro prefijo XML también se lee', () => {
    expect(textoDeDocumentoXml('<p:p><p:t>hola</p:t></p:p>').trim()).toBe('hola');
  });

  test('un zip que no es Word, un zip dañado o un .doc antiguo no se aceptan', async () => {
    const hoja = zipSync({ 'xl/workbook.xml': strToU8('<workbook/>'), '[Content_Types].xml': strToU8('<Types/>') });
    expect(detectarTipo(hoja)).toBeNull();
    expect(await codigoDe(() => extraerTextoDeArchivo(hoja))).toBe('formato_no_aceptado');

    const roto = docxConParrafos([ASCII]).slice(0, 80);
    expect(await codigoDe(() => extraerTextoDeArchivo(roto))).toBe('formato_no_aceptado');

    const docViejo = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, ...new Array(600).fill(0)]);
    expect(detectarTipo(docViejo)).toBeNull();
    expect(await codigoDe(() => extraerTextoDeArchivo(docViejo))).toBe('formato_no_aceptado');
  });

  test('demasiadas entradas dentro del zip se rechazan antes de abrirlo', async () => {
    const muchos: Record<string, Uint8Array> = {};
    for (let i = 0; i <= LIMITES.entradasDocx; i += 1) muchos[`relleno/${i}.txt`] = strToU8('x');
    const zip = docxConXml(documentoXml([ASCII]), muchos);
    expect(await codigoDe(() => extraerTextoDeArchivo(zip))).toBe('formato_no_aceptado');
  });

  test('un documento que se descomprime a más de 40 MB se rechaza sin descomprimirlo', async () => {
    // 41 MB de "a" caben en unos 40 KB comprimidos: la bomba clásica.
    const bomba = docxConXml(`<w:t>${'a'.repeat(41 * 1024 * 1024)}</w:t>`);
    expect(bomba.byteLength).toBeLessThan(200 * 1024);
    expect(await codigoDe(() => extraerTextoDeArchivo(bomba))).toBe('formato_no_aceptado');
  });

  test('varios archivos que juntos pasan del tope descomprimido se rechazan', async () => {
    const relleno = strToU8('b'.repeat(30 * 1024 * 1024));
    const bomba = docxConXml(documentoXml([ASCII]), { 'a.bin': relleno, 'b.bin': relleno, 'c.bin': relleno });
    expect(await codigoDe(() => extraerTextoDeArchivo(bomba))).toBe('formato_no_aceptado');
  });

  test('un documento que miente sobre su tamaño no puede crecer más de lo declarado', async () => {
    const real = docxConXml(documentoXml(Array.from({ length: 40 }, () => ASCII)));
    const falso = real.slice();
    const vista = new DataView(falso.buffer);
    const buscar = (b0: number, b1: number, b2: number, b3: number) => {
      const encontrados: number[] = [];
      for (let i = 0; i < falso.length - 4; i += 1) {
        if (falso[i] === b0 && falso[i + 1] === b1 && falso[i + 2] === b2 && falso[i + 3] === b3) encontrados.push(i);
      }
      return encontrados;
    };
    // Cada entrada tiene cabecera local (PK 03 04) y entrada del directorio central (PK 01 02):
    // se baja a 120 bytes el tamaño declarado de la última, que es word/document.xml.
    const locales = buscar(0x50, 0x4b, 0x03, 0x04);
    const centrales = buscar(0x50, 0x4b, 0x01, 0x02);
    for (const inicio of centrales) {
      const nombreLargo = vista.getUint16(inicio + 28, true);
      const nombre = new TextDecoder().decode(falso.subarray(inicio + 46, inicio + 46 + nombreLargo));
      if (nombre === 'word/document.xml') vista.setUint32(inicio + 24, 120, true);
    }
    for (const inicio of locales) {
      const nombreLargo = vista.getUint16(inicio + 26, true);
      const nombre = new TextDecoder().decode(falso.subarray(inicio + 30, inicio + 30 + nombreLargo));
      if (nombre === 'word/document.xml') vista.setUint32(inicio + 22, 120, true);
    }
    const codigo = await codigoDe(() => extraerTextoDeArchivo(falso));
    // Falla (tamaño inconsistente o texto insuficiente); lo que no puede pasar es devolver el documento entero.
    expect(['formato_no_aceptado', 'sin_texto']).toContain(codigo);
  });
});

test.describe('PDF', () => {
  test('extrae el texto de todas las páginas y cuenta las páginas', async () => {
    const r = await extraerTextoDeArchivo(pdfConTexto([ASCII, 'La muestra fue de cuarenta personas porque solo teniamos dos semanas para terminar el estudio completo.']));
    expect(r.tipo).toBe('pdf');
    expect(r.paginas).toBe(2);
    expect(r.texto).toContain('encuesta en linea');
    expect(r.texto).toContain('cuarenta personas');
    expect(r.texto).not.toMatch(/\s{3,}/);
    expect(r.palabras).toBeGreaterThan(40);
  });

  test('solo se leen las primeras páginas, pero se informa el total', async () => {
    const paginas = [1, 2, 3, 4].map((n) => `${ASCII} marcadorpagina${n}`);
    const r = await extraerTextoDeArchivo(pdfConTexto(paginas), { maxPaginas: 2 });
    expect(r.paginas).toBe(4);
    expect(r.texto).toContain('marcadorpagina1');
    expect(r.texto).toContain('marcadorpagina2');
    expect(r.texto).not.toContain('marcadorpagina3');
  });

  test('un escaneo (sin texto) o casi sin texto es "sin texto", no un trabajo vacío', async () => {
    expect(await codigoDe(() => extraerTextoDeArchivo(pdfConTexto(['', '', ''])))).toBe('sin_texto');
    expect(await codigoDe(() => extraerTextoDeArchivo(pdfConTexto(['Solo seis palabras en toda la hoja'])))).toBe('sin_texto');
  });

  test('un PDF dañado o con cabecera falsa es "sin texto" y no revienta', async () => {
    const roto = pdfConTexto([ASCII]).slice(0, 200);
    expect(await codigoDe(() => extraerTextoDeArchivo(roto))).toBe('sin_texto');
    const basura = new TextEncoder().encode(`%PDF-1.7\n${'\u0001\u0002 basura '.repeat(200)}`);
    expect(await codigoDe(() => extraerTextoDeArchivo(basura))).toBe('sin_texto');
  });

  test('si el reloj se pasa del límite entre páginas, se corta', async () => {
    let t = 0;
    const paginas = [1, 2, 3].map(() => ASCII);
    const codigo = await codigoDe(() => extraerTextoDeArchivo(pdfConTexto(paginas), { timeoutMs: 100, ahora: () => (t += 60) }));
    expect(codigo).toBe('sin_texto');
  });

  test('la cabecera puede venir tras unos bytes de basura (dentro del primer KB)', () => {
    const pdf = pdfConTexto([ASCII]);
    const conPrefijo = (relleno: number) => {
      const salida = new Uint8Array(relleno + pdf.length);
      salida.fill(0x20, 0, relleno);
      salida.set(pdf, relleno);
      return salida;
    };
    expect(detectarTipo(conPrefijo(200))).toBe('pdf');
    expect(detectarTipo(conPrefijo(2000))).toBeNull();
  });
});

test.describe('límites generales', () => {
  test('el tipo lo decide el contenido, no el nombre ni lo que diga el navegador', async () => {
    expect(detectarTipo(strToU8('Esto es texto plano que dice ser un PDF.'))).toBeNull();
    expect(await codigoDe(() => extraerTextoDeArchivo(strToU8('Esto es texto plano que dice ser un PDF.')))).toBe('formato_no_aceptado');
    expect(await codigoDe(() => extraerTextoDeArchivo(new Uint8Array(0)))).toBe('formato_no_aceptado');
  });

  test('un archivo más grande que el tope no se toca', async () => {
    const grande = new Uint8Array(LIMITES.archivoBytes + 1);
    grande.set(strToU8('%PDF-1.4'));
    expect(await codigoDe(() => extraerTextoDeArchivo(grande))).toBe('demasiado_grande');
  });
});

test.describe('texto pegado', () => {
  test('se limpia y se cuenta', () => {
    const r = extraerTextoPegado(`  ${TRABAJO}\u0000\u0007  \r\n\r\n\r\n\r\nFin del texto de prueba para el trabajo.  `);
    expect(r.tipo).toBe('texto');
    expect(r.texto).not.toMatch(/[\u0000-\u0008]/);
    expect(r.texto).not.toMatch(/\n{3,}/);
    expect(r.texto.startsWith('Elegí una encuesta')).toBe(true);
    expect(r.palabras).toBeGreaterThan(120);
  });

  test('muy poco texto o demasiado se rechazan', () => {
    expect(() => extraerTextoPegado('hola')).toThrow(/No pudimos leer texto/);
    expect(() => extraerTextoPegado(palabrasDeRelleno(MIN_PALABRAS_LEGIBLES - 1))).toThrow(DefensaError);
    expect(extraerTextoPegado(palabrasDeRelleno(MIN_PALABRAS_LEGIBLES)).palabras).toBe(MIN_PALABRAS_LEGIBLES);
    expect(() => extraerTextoPegado('a '.repeat(LIMITES.textoPegadoCaracteres))).toThrow(/demasiado grande/i);
  });
});

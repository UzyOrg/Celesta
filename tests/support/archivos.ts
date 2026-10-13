import { strToU8, zipSync } from 'fflate';

/**
 * Archivos de prueba armados a mano: un PDF mínimo con texto y un .docx mínimo,
 * para ejercitar la extracción sin depender de archivos binarios en el repositorio.
 */

function escaparPdf(texto: string): string {
  return texto.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function partirEnLineas(texto: string, ancho = 80): string[] {
  const lineas: string[] = [];
  let actual = '';
  for (const palabra of texto.split(/\s+/).filter(Boolean)) {
    if (actual.length + palabra.length + 1 > ancho && actual) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = actual ? `${actual} ${palabra}` : palabra;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

/** PDF válido de una o más páginas. Solo ASCII: usa la fuente Helvetica estándar. */
export function pdfConTexto(paginas: readonly string[]): Uint8Array {
  const cuerpos: string[] = [];
  const kids = paginas.map((_, i) => `${4 + 2 * i} 0 R`).join(' ');
  cuerpos[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  cuerpos[2] = `<< /Type /Pages /Kids [${kids}] /Count ${paginas.length} >>`;
  cuerpos[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  paginas.forEach((texto, i) => {
    const lineas = partirEnLineas(texto);
    const operaciones = lineas.length
      ? `BT /F1 11 Tf 72 720 Td 14 TL ${lineas.map((l) => `(${escaparPdf(l)}) Tj T*`).join(' ')} ET`
      : '';
    cuerpos[5 + 2 * i] = `<< /Length ${operaciones.length} >>\nstream\n${operaciones}\nendstream`;
    cuerpos[4 + 2 * i] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${5 + 2 * i} 0 R ` +
      '/Resources << /Font << /F1 3 0 R >> >> >>';
  });

  let salida = '%PDF-1.4\n';
  const desplazamientos: number[] = [];
  for (let k = 1; k < cuerpos.length; k += 1) {
    desplazamientos[k] = salida.length;
    salida += `${k} 0 obj\n${cuerpos[k]}\nendobj\n`;
  }
  const inicioXref = salida.length;
  salida += `xref\n0 ${cuerpos.length}\n0000000000 65535 f \n`;
  for (let k = 1; k < cuerpos.length; k += 1) {
    salida += `${String(desplazamientos[k]).padStart(10, '0')} 00000 n \n`;
  }
  salida += `trailer\n<< /Size ${cuerpos.length} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF`;
  return strToU8(salida);
}

const TIPOS_DOCX =
  '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';

const RELACIONES =
  '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';

export function escaparXml(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** El XML de un documento con un párrafo por cadena. */
export function documentoXml(parrafos: readonly string[]): string {
  const cuerpo = parrafos
    .map((p) => `<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${escaparXml(p)}</w:t></w:r></w:p>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${cuerpo}</w:body></w:document>`;
}

export function docxConXml(xml: string, extras: Record<string, Uint8Array> = {}): Uint8Array {
  return zipSync(
    {
      '[Content_Types].xml': strToU8(TIPOS_DOCX),
      '_rels/.rels': strToU8(RELACIONES),
      'word/document.xml': strToU8(xml),
      ...extras,
    },
    { level: 1 },
  );
}

export function docxConParrafos(parrafos: readonly string[]): Uint8Array {
  return docxConXml(documentoXml(parrafos));
}

/** Texto de relleno con n palabras, sin signos raros. */
export function palabrasDeRelleno(n: number, prefijo = 'palabra'): string {
  return Array.from({ length: n }, (_, i) => `${prefijo}${i}`).join(' ');
}

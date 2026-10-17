import 'server-only';
import type {
  AudioSintetizado,
  PalabraTranscrita,
  ProveedorLlm,
  ProveedorStt,
  ProveedorTts,
  RespuestaJson,
  SolicitudJson,
  Transcripcion,
} from './tipos';

/**
 * Proveedores falsos. Sirven para desarrollar y probar toda la defensa sin
 * llaves, sin red y sin gastar nada: devuelven resultados deterministas con la
 * misma forma que los reales.
 *
 * No existen en producción como opción útil: DEFENSA_LLM_PROVIDER, _STT_ y _TTS_
 * valen "mock" por defecto, pero el servicio de producción debe fijar los tres
 * proveedores reales (ver .env.example y docs/defensas/backend.md).
 */

// ── Modelo de lenguaje ──────────────────────────────────────────────────────

function entre(texto: string, abre: string, cierra: string): string {
  const inicio = texto.indexOf(abre);
  if (inicio < 0) return '';
  const desde = inicio + abre.length;
  const fin = texto.indexOf(cierra, desde);
  return (fin < 0 ? texto.slice(desde) : texto.slice(desde, fin)).trim();
}

function contar(texto: string): number {
  return texto.trim().split(/\s+/).filter(Boolean).length;
}

const SOLO_PALABRAS = new RegExp('[^\\p{L}\\p{N}\\s,.;:-]', 'gu');
const FIN = new RegExp('[.;:,\\s]+$', 'u');

function sinSignos(texto: string): string {
  return texto.replace(SOLO_PALABRAS, ' ').replace(/\s+/g, ' ').trim();
}

function oraciones(trabajo: string): string[] {
  const todas = trabajo
    .split(new RegExp('(?<=[.!?])\\s+'))
    .map((o) => o.trim())
    .filter((o) => contar(o) >= 5 && contar(o) <= 38);
  if (todas.length >= 6) return todas;
  // Trabajo sin puntuación: ventanas de 14 palabras.
  const palabras = trabajo.split(/\s+/).filter(Boolean);
  const ventanas: string[] = [];
  for (let i = 0; i + 8 <= palabras.length; i += 14) ventanas.push(palabras.slice(i, i + 14).join(' '));
  return todas.length >= ventanas.length ? todas : ventanas;
}

function planFalso(mensaje: string): unknown {
  const registro = mensaje.includes('registro: usted') ? 'usted' : 'tu';
  const trabajo = entre(mensaje, '<trabajo_alumno>', '</trabajo_alumno>');
  const objetivos: string[] = [];
  const patron = /<objetivo id="(O[1-9])">/g;
  let m = patron.exec(mensaje);
  while (m) {
    objetivos.push(m[1] as string);
    m = patron.exec(mensaje);
  }
  const frases = oraciones(trabajo);
  const frase = (i: number) => frases[i % Math.max(1, frases.length)] ?? trabajo.split(/\s+/).slice(0, 12).join(' ');
  const contexto = (i: number) => `${sinSignos(frase(i)).split(' ').slice(0, 11).join(' ').replace(FIN, '')}.`;
  const t = registro === 'usted';
  const preguntas = [
    t ? '¿Por qué tomó esa decisión?' : '¿Por qué tomaste esa decisión?',
    t ? '¿Qué alternativa descartó?' : '¿Qué alternativa descartaste?',
    t ? '¿De qué depende esa conclusión?' : '¿De qué depende esa conclusión?',
    t ? '¿Qué pasaría si cambiara esa condición?' : '¿Qué pasaría si cambiara esa condición?',
  ];
  const candidata = (objetivo: string, letra: 'a' | 'b', indice: number) => ({
    id: `${objetivo}-${letra}`,
    type: letra === 'a' ? 'decision' : 'supuestos',
    anchor: frase(indice),
    question: `${contexto(indice)} ${preguntas[indice % preguntas.length]}`,
    evidence: 'Explica el razonamiento con sus propias palabras y lo conecta con lo que hizo en el trabajo.',
    followup_if_vague: t
      ? 'Deme un ejemplo concreto de su trabajo que muestre eso. ¿Qué pasó exactamente?'
      : 'Dame un ejemplo concreto de tu trabajo que muestre eso. ¿Qué pasó exactamente?',
    followup_if_solid: t
      ? 'Si eso cambiara, ¿qué haría distinto en su resultado?'
      : 'Si eso cambiara, ¿qué harías distinto en tu resultado?',
  });
  return {
    status: 'ok',
    status_reason: '',
    work_summary: 'El alumno entregó un trabajo y explica varias decisiones de método y de resultados.',
    key_claims: [0, 1, 2].map((i) => ({ id: `C${i + 1}`, claim: `Afirmación ${i + 1} del trabajo`, anchor: frase(i) })),
    objectives: objetivos.map((id, i) => ({
      objective_id: id,
      coverage: 'presente',
      coverage_note: 'El trabajo aborda este objetivo.',
      candidates: [candidata(id, 'a', i * 2), candidata(id, 'b', i * 2 + 1)],
    })),
    opener: t ? 'Para empezar, ¿de qué trata su trabajo?' : 'Para empezar, ¿de qué trata tu trabajo?',
    transfer: objetivos.slice(-2).map((id, i) => ({
      id: `T${i + 1}`,
      objective_id: id,
      anchor: frase(i + 7),
      question: `${contexto(i + 7)} ${t ? '¿Cómo aplicaría ese mismo razonamiento a un caso cercano?' : '¿Cómo aplicarías ese mismo razonamiento a un caso cercano?'}`,
      evidence: 'Aplica su propio razonamiento a un caso nuevo y reconoce qué cambia.',
    })),
    alerts: [],
  };
}

function claseFalsa(mensaje: string): unknown {
  const respuesta = entre(mensaje, '<respuesta_alumno>', '</respuesta_alumno>');
  if (respuesta.includes('[[fuera]]')) return { clase: 'fuera_de_tema' };
  if (contar(respuesta) === 0) return { clase: 'sin_respuesta' };
  if (new RegExp('^no\\s+s[eé](?![\\p{L}\\p{N}])', 'iu').test(respuesta)) return { clase: 'sin_respuesta' };
  return { clase: contar(respuesta) < 10 ? 'vaga' : 'solida' };
}

/** Una frase literal de la respuesta que no cruce un "[no se entendió]". */
function citaDe(respuesta: string): string {
  const segmentos = respuesta
    .split('[no se entendió]')
    .map((s) => s.trim())
    .filter((s) => contar(s) >= 3)
    .sort((a, b) => contar(b) - contar(a));
  const mejor = segmentos[0] ?? '';
  const frase = mejor.split(new RegExp('(?<=[.!?])\\s+'))[0] ?? mejor;
  return frase.split(/\s+/).slice(0, 30).join(' ');
}

function reporteFalso(mensaje: string): unknown {
  const objetivos: string[] = [];
  const patron = /<objetivo id="(O[1-9])">/g;
  let m = patron.exec(mensaje);
  while (m) {
    objetivos.push(m[1] as string);
    m = patron.exec(mensaje);
  }
  const turnos: Array<{ ref: string; objetivo: string; respuesta: string }> = [];
  const patronTurno = /<turno ref="([^"]+)" objetivo="([^"]+)"[^>]*>([\s\S]*?)<\/turno>/g;
  let t = patronTurno.exec(mensaje);
  while (t) {
    turnos.push({ ref: t[1] as string, objetivo: t[2] as string, respuesta: entre(t[3] as string, '<respuesta_alumno>', '</respuesta_alumno>') });
    t = patronTurno.exec(mensaje);
  }
  return {
    resumen: 'Respondió las preguntas de la defensa y explicó varias de sus decisiones.',
    objetivos: objetivos.map((id) => {
      const propios = turnos.filter((x) => x.objetivo === id && !x.respuesta.startsWith('(sin respuesta)'));
      const usable = propios.map((x) => x.respuesta.split('[no se entendió]').join(' ')).join(' ');
      const palabras = contar(usable);
      const nivel = palabras >= 18 ? 'explico' : palabras >= 8 ? 'en_parte' : palabras > 0 ? 'no_salio' : 'sin_evidencia';
      const primero = propios.find((x) => citaDe(x.respuesta) !== '');
      const cita = primero ? citaDe(primero.respuesta) : '';
      return {
        objective_id: id,
        nivel,
        razon: 'Explicó con razones propias lo que decidió.',
        faltante: nivel === 'en_parte' ? 'Faltó dar un ejemplo concreto.' : '',
        citas: primero && cita ? [{ turno: primero.ref, cita }] : [],
      };
    }),
  };
}

export function crearLlmMock(): ProveedorLlm {
  return {
    id: 'mock',
    async generarJson(solicitud: SolicitudJson): Promise<RespuestaJson> {
      const mensaje = solicitud.mensajes[0]?.contenido ?? '';
      const json =
        solicitud.tarea === 'plan'
          ? planFalso(mensaje)
          : solicitud.tarea === 'clasificar_turno'
            ? claseFalsa(mensaje)
            : reporteFalso(mensaje);
      return { json, proveedor: 'mock', modelo: 'mock' };
    },
  };
}

// ── Transcripción ───────────────────────────────────────────────────────────

/** Lo que "oye" el transcriptor falso cuando el audio no trae texto propio. */
export const TEXTO_STT_POR_DEFECTO =
  'Elegí la encuesta porque llegaba a más compañeros en poco tiempo. La muestra fue de ~~cuarenta personas~~ porque solo tenía dos semanas para terminar.';

const MS_POR_PALABRA = 420;
const CONFIANZA_ALTA = 0.94;
const CONFIANZA_BAJA = 0.2;

/**
 * Convierte "texto con ~~palabras dudosas~~" en palabras con confianza y tiempo.
 * Las marcadas con ~~ salen con confianza baja; las demás, alta.
 */
export function palabrasDesdeMarcado(marcado: string): PalabraTranscrita[] {
  const palabras: PalabraTranscrita[] = [];
  let dudosa = false;
  let reloj = 300;
  for (const crudo of marcado.split(/\s+/).filter(Boolean)) {
    let texto = crudo;
    const abre = texto.startsWith('~~');
    if (abre) {
      dudosa = true;
      texto = texto.slice(2);
    }
    const cierra = texto.endsWith('~~');
    if (cierra) texto = texto.slice(0, -2);
    if (texto) {
      palabras.push({
        texto,
        inicioMs: reloj,
        finMs: reloj + MS_POR_PALABRA - 40,
        confianza: dudosa ? CONFIANZA_BAJA : CONFIANZA_ALTA,
      });
      reloj += MS_POR_PALABRA;
    }
    if (cierra) dudosa = false;
  }
  return palabras;
}

const PREFIJO_AUDIO_FALSO = 'MOCK:';

/** Audio de prueba que lleva su propio texto: "MOCK:lo que se dijo con ~~dudas~~". */
export function audioFalso(texto: string): Uint8Array {
  return new TextEncoder().encode(`${PREFIJO_AUDIO_FALSO}${texto}`);
}

export function crearSttMock(textoPorDefecto: () => string | undefined = () => undefined): ProveedorStt {
  return {
    id: 'mock',
    async transcribir(audio: Uint8Array): Promise<Transcripcion> {
      const cabecera = new TextDecoder().decode(audio.slice(0, PREFIJO_AUDIO_FALSO.length));
      const marcado =
        cabecera === PREFIJO_AUDIO_FALSO
          ? new TextDecoder().decode(audio.slice(PREFIJO_AUDIO_FALSO.length))
          : (textoPorDefecto() ?? TEXTO_STT_POR_DEFECTO);
      const palabras = palabrasDesdeMarcado(marcado);
      const ultima = palabras[palabras.length - 1];
      return {
        texto: palabras.map((p) => p.texto).join(' '),
        palabras,
        duracionMs: ultima ? ultima.finMs + 300 : 0,
        proveedor: 'mock',
        modelo: 'mock',
      };
    },
  };
}

// ── Voz ─────────────────────────────────────────────────────────────────────

/** Un WAV mono de 8 kHz con un cuarto de segundo de silencio: lo reproduce cualquier navegador. */
export function wavDeSilencio(milisegundos = 250): Uint8Array {
  const muestras = Math.round((8000 * milisegundos) / 1000);
  const datos = muestras * 2;
  const bytes = new Uint8Array(44 + datos);
  const vista = new DataView(bytes.buffer);
  const texto = (desde: number, valor: string) => {
    for (let i = 0; i < valor.length; i += 1) vista.setUint8(desde + i, valor.charCodeAt(i));
  };
  texto(0, 'RIFF');
  vista.setUint32(4, 36 + datos, true);
  texto(8, 'WAVE');
  texto(12, 'fmt ');
  vista.setUint32(16, 16, true);
  vista.setUint16(20, 1, true);
  vista.setUint16(22, 1, true);
  vista.setUint32(24, 8000, true);
  vista.setUint32(28, 16000, true);
  vista.setUint16(32, 2, true);
  vista.setUint16(34, 16, true);
  texto(36, 'data');
  vista.setUint32(40, datos, true);
  return bytes;
}

export function crearTtsMock(): ProveedorTts {
  return {
    id: 'mock',
    identidad: () => 'mock',
    async sintetizar(): Promise<AudioSintetizado> {
      return { bytes: wavDeSilencio(), mime: 'audio/wav', extension: 'wav' };
    },
  };
}

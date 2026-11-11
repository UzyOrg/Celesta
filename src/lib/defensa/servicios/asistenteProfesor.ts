import 'server-only';
import { z } from 'zod';
import {
  FILTROS_DE_LISTA,
  FRASE_DE_RECHAZO,
  LIMITES_ASISTENTE,
  LIMITES_TARJETAS,
  NIVELES_DE_FILTRO,
  TIPOS_DE_TARJETA,
  type CitaParaProfesor,
  type FuenteRespuesta,
  type MotivoRechazo,
  type NivelDeFiltro,
  type PeticionAsistente,
  type RespuestaAsistente,
  type TarjetaRespuesta,
  type TipoTarjeta,
} from '../../../components/revision/catalogo';
import {
  alumnosEnEstado,
  conteoPorObjetivo,
  estadoDe,
  ordenarAlumnos,
  resumenDelGrupo,
  seccionesDelGrupo,
} from '../../../components/revision/derivados';
import { extensionesDisponibles, extensionPorId } from '../../../components/revision/extensiones';
import { diaLargo, marcaDeFecha } from '../../../components/revision/fechas';
import { fraseDeTarjeta, SUGERENCIAS_POR_TARJETA } from '../../../components/revision/frases';
import { interpretarPeticion, normalizarTexto } from '../../../components/revision/intenciones';
import {
  listaDePersonas,
  listaFiltrada,
  objetivoDeCerca,
  ritmoDelGrupo,
  type FiltroDeLista,
} from '../../../components/revision/tarjetasDelGrupo';
import type { Alumno, DatosGrupo, EvidenciaObjetivo, Objetivo } from '../../../components/revision/types';
import type { ActividadRow, AlumnoConEstado, TurnoRow } from '../almacen/tipos';
import { config, LIMITES } from '../config';
import { DefensaError } from '../errores';
import type { NivelReporte } from '../reporte';
import { PROHIBIDO } from '../reporte';
import { construirLineas } from '../transcripcion';
import type { Ctx } from './contexto';
import { datosDelGrupo } from './profesor';

/**
 * Asistente del profesor (ADR 0014, cuarto uso del modelo; diseño en
 * docs/defensas/asistente-profesor.md).
 *
 * El profesor pide algo en lenguaje natural. El modelo solo ELIGE tarjetas de un
 * catálogo cerrado con argumentos cerrados y redacta una frase corta; el servidor
 * arma cada tarjeta con los datos del grupo del enlace firmado y verifica la frase.
 *
 *   1. Filtro de rechazos: lo obvio (calificar, copiar, rankear…) se contesta sin modelo.
 *   2. Hoja seudónima: al modelo le llegan alias, estados y niveles; nunca nombres,
 *      matrículas, trabajos, transcripciones ni citas. Los nombres de la petición,
 *      y los que se les parecen, se cambian por su alias aquí.
 *   3. Una llamada con salida estructurada. Lo que no cumple el esquema se descarta.
 *   4. Cada tarjeta se arma con consultas tipadas (`tarjetasDelGrupo.ts`, `derivados.ts`).
 *   5. La frase: cada número y nombre debe salir de los datos, y pasa el filtro de
 *      notas, porcentajes y sospechas. Si no, plantilla fija (`frases.ts`).
 *   6. Si el modelo falla, contestan las reglas de `intenciones.ts`.
 *
 * Nada de esto (prompt, hoja, salida cruda del modelo) llega al navegador.
 */

export const PROMPT_VERSION_ASISTENTE = 'asistente-2026-11-v1';
const TIEMPO_MAXIMO_MS = 6_000;
const MAX_TOKENS = 700;

type Persona = Alumno;

/* ------------------------------------------------------------------------ */
/* 1. Filtro de rechazos (antes del modelo)                                 */
/* ------------------------------------------------------------------------ */

const REGLAS_DE_RECHAZO: ReadonlyArray<{ motivo: MotivoRechazo; expresion: RegExp }> = [
  {
    motivo: 'sospecha',
    expresion:
      /\bcopi(o|aron|ar|aste|a)\b|\bplagi|\btramp|chat ?gpt|\bgpt\b|inteligencia artificial|\b(con|uso|usaron|uso de) (la )?ia\b|\bia\b.*\b(uso|usaron|hizo|hicieron)\b|sospech|deshonest/,
  },
  {
    motivo: 'calificar',
    expresion:
      /califica|\bnotas?\b|puntaje|\bpuntos?\b|promedio|\baprob|\breprob|porcentaje|por ciento|%|\bponle (un|una|\d)|\b\d+ de 10\b|que (le )?pongo/,
  },
  {
    motivo: 'comparar-personas',
    expresion:
      /\bpeor(es)?\b|\bmejor(es)? (alumno|alumna|estudiante|de todos|del grupo)|quien (es|fue) (el|la) mejor|ranking|rankea|ordena(los|las|lo)? (de|por) (mejor|peor|desempeno)|\btop \d|el mas (flojo|burro|listo|inteligente)/,
  },
  {
    motivo: 'privado',
    expresion: /nervios|\bestres|estresad|ansios|como se sint|su ensayo|el ensayo (privado|de practica)|practica privada|que dispositivo|desde que (celular|telefono)/,
  },
  { motivo: 'otro-grupo', expresion: /otro grupo|otros grupos|otra actividad|otro salon|todas mis actividades/ },
];

/** Grupos como "3A" o "grupo 2" distintos del de este enlace. */
function mencionaOtroGrupo(limpio: string, grupo: string): boolean {
  const propio = normalizarTexto(grupo).replace(/\s+/g, '');
  const menciones = limpio.match(/\b(?:grupo|salon)\s+([0-9]{1,2}\s?[a-z]?)\b|\b([0-9][a-z])\b/g) ?? [];
  return menciones.some((mencion) => {
    const codigo = mencion.replace(/grupo|salon|\s+/g, '');
    return codigo.length > 0 && codigo !== propio;
  });
}

export function motivoDeRechazo(peticion: string, grupo: string): MotivoRechazo | null {
  const limpio = normalizarTexto(peticion);
  const regla = REGLAS_DE_RECHAZO.find((candidata) => candidata.expresion.test(limpio));
  if (regla) return regla.motivo;
  return mencionaOtroGrupo(limpio, grupo) ? 'otro-grupo' : null;
}

/* ------------------------------------------------------------------------ */
/* 2. Hoja seudónima y nombres de la petición                               */
/* ------------------------------------------------------------------------ */

export interface Seudonimos {
  aliasDe: ReadonlyMap<string, string>;
  personaDe: ReadonlyMap<string, Persona>;
}

/** A01, A02… en orden alfabético del grupo. Cambian si cambia el grupo; nunca salen del servidor. */
export function crearSeudonimos(alumnos: readonly Persona[]): Seudonimos {
  const ordenados = alumnos.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es') || a.matricula.localeCompare(b.matricula));
  const aliasDe = new Map<string, string>();
  const personaDe = new Map<string, Persona>();
  ordenados.forEach((alumno, indice) => {
    const alias = `A${String(indice + 1).padStart(2, '0')}`;
    aliasDe.set(alumno.matricula, alias);
    personaDe.set(alias, alumno);
  });
  return { aliasDe, personaDe };
}

/** Palabras que nunca son un nombre, aunque se parezcan a uno ("vaga" y "Vega"). */
const NO_SON_NOMBRES = new Set(
  (
    'de del la las el los y o a e en que quien quienes como cual cuales con sin por para mi mis su sus me le les lo al un una unos unas ' +
    'todo todos toda todas grupo lista tarde muestra metodo limites objetivo objetivos reporte reportes entrega entregas entrego entregaron ' +
    'defensa defensas defendio defendieron alumno alumna alumnos alumnas trabajo trabajos falta faltan parte partes vaga vago solida dijo dijeron ' +
    'muestrame ensename dame ver cuantos cuantas hay ya no si mas menos bien mal fue va van esta estan revisar revise revisado pendiente pendientes ' +
    'audio oir frases citas descarga descargar descarga baja bajar enlace todos peor mejor version incompleta incompletas dia dias cuando semana ' +
    'hoy ayer viernes jueves miercoles martes lunes sabado domingo celestea profesor profesora clase quiero puedes podrias porfa favor gracias ' +
    'hola oye explico explicaron mostro mostraron costo dificil respuesta respuestas pregunta preguntas cierre nada nadie alguien uno dos tres'
  ).split(' '),
);

interface Ficha {
  texto: string;
  norma: string;
  inicio: number;
  fin: number;
  mayuscula: boolean;
}

/** Todas las coincidencias de una expresión, sin `matchAll` (el proyecto compila a ES5). */
function coincidencias(texto: string, expresion: RegExp): RegExpExecArray[] {
  const buscador = new RegExp(expresion.source, expresion.flags.includes('g') ? expresion.flags : `${expresion.flags}g`);
  const todas: RegExpExecArray[] = [];
  let coincidencia = buscador.exec(texto);
  while (coincidencia) {
    todas.push(coincidencia);
    coincidencia = buscador.exec(texto);
  }
  return todas;
}

const PALABRA = /[A-Za-zÀ-ÖØ-öø-ÿ0-9]+/g;
const MAYUSCULA_INICIAL = /^[A-ZÀ-ÖØ-Þ]/;

function fichasDe(texto: string): Ficha[] {
  return coincidencias(texto, PALABRA).map((coincidencia) => {
    const palabra = coincidencia[0];
    return {
      texto: palabra,
      norma: normalizarTexto(palabra),
      inicio: coincidencia.index,
      fin: coincidencia.index + palabra.length,
      mayuscula: MAYUSCULA_INICIAL.test(palabra),
    };
  });
}

/** Distancia de edición con transposiciones (OSA), suficiente para nombres mal escritos. */
export function distancia(a: string, b: string): number {
  const filas = a.length + 1;
  const columnas = b.length + 1;
  const d: number[][] = Array.from({ length: filas }, (_, i) => Array.from({ length: columnas }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i < filas; i += 1) {
    for (let j = 1; j < columnas; j += 1) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      const fila = d[i] as number[];
      const anterior = d[i - 1] as number[];
      fila[j] = Math.min((anterior[j] as number) + 1, (fila[j - 1] as number) + 1, (anterior[j - 1] as number) + costo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        fila[j] = Math.min(fila[j] as number, ((d[i - 2] as number[])[j - 2] as number) + 1);
      }
    }
  }
  return (d[a.length] as number[])[b.length] as number;
}

/** 0 = igual; 1 = parecido; null = distinto. Las palabras cortas solo valen si son iguales. */
function parecido(palabra: string, parteDelNombre: string): 0 | 1 | null {
  if (palabra === parteDelNombre) return 0;
  if (palabra.length < 4 || parteDelNombre.length < 4) return null;
  const tope = Math.max(palabra.length, parteDelNombre.length) >= 7 ? 2 : 1;
  return distancia(palabra, parteDelNombre) <= tope ? 1 : null;
}

/** Cuántas palabras seguidas coinciden con partes distintas del nombre, o null si alguna no. */
function puntaje(palabras: readonly Ficha[], partes: readonly string[]): { exactas: number } | null {
  const usadas = new Set<number>();
  let exactas = 0;
  for (const palabra of palabras) {
    let elegida = -1;
    let mejor: 0 | 1 | null = null;
    partes.forEach((parte, indice) => {
      if (usadas.has(indice)) return;
      const valor = parecido(palabra.norma, parte);
      if (valor !== null && (mejor === null || valor < mejor)) {
        mejor = valor;
        elegida = indice;
      }
    });
    if (mejor === null) return null;
    usadas.add(elegida);
    if (mejor === 0) exactas += 1;
  }
  return { exactas };
}

export interface PeticionSeudonima {
  /** Lo que se le manda al modelo. */
  texto: string;
  /** Alias que aparecieron, en orden. */
  aliases: string[];
  /** Dos o más personas se llaman parecido: se pregunta a cuál, sin modelo. */
  ambiguas: Persona[] | null;
  /** Palabras con mayúscula que no se parecen a nadie del grupo: van tal cual (riesgo anotado). */
  sinCoincidencia: string[];
}

/**
 * Cambia por su alias los nombres y matrículas del grupo que aparecen en la
 * petición, también los mal escritos ("Ana Tores", "carlos espinosa"). Lo que no
 * se parece a nadie se deja como está.
 */
export function seudonimizarPeticion(
  peticion: string,
  seudonimos: Seudonimos,
  palabrasDeLaActividad: ReadonlySet<string> = new Set(),
): PeticionSeudonima {
  const fichas = fichasDe(peticion);
  const personas = Array.from(seudonimos.personaDe.entries()).map(([alias, alumno]) => ({
    alias,
    alumno,
    partes: normalizarTexto(alumno.nombre)
      .split(/[^a-z0-9ñ]+/)
      .filter((parte) => parte.length >= 3 && !NO_SON_NOMBRES.has(parte)),
  }));
  const esPalabraComun = (ficha: Ficha) => NO_SON_NOMBRES.has(ficha.norma) || palabrasDeLaActividad.has(ficha.norma);

  const reemplazos: Array<{ inicio: number; fin: number; alias: string }> = [];
  const aliases: string[] = [];
  const usadas = new Set<number>();
  let ambiguas: Persona[] | null = null;

  for (let i = 0; i < fichas.length; i += 1) {
    const ficha = fichas[i] as Ficha;
    // Matrícula exacta.
    if (/^\d{6,12}$/.test(ficha.norma)) {
      const alias = seudonimos.aliasDe.get(ficha.texto) ?? seudonimos.aliasDe.get(ficha.norma.toUpperCase());
      if (alias) {
        reemplazos.push({ inicio: ficha.inicio, fin: ficha.fin, alias });
        aliases.push(alias);
        usadas.add(i);
      }
      continue;
    }
    if (esPalabraComun(ficha) || ficha.norma.length < 3) continue;

    for (let largo = 3; largo >= 1; largo -= 1) {
      const tramo = fichas.slice(i, i + largo);
      if (tramo.length < largo || tramo.some(esPalabraComun)) continue;
      const candidatos = personas
        .map((persona) => ({ persona, resultado: puntaje(tramo, persona.partes) }))
        .filter((c): c is { persona: (typeof personas)[number]; resultado: { exactas: number } } => c.resultado !== null)
        // Una sola palabra parecida (no igual) solo cuenta si viene con mayúscula, como un nombre:
        // "respuestas vagas" no es "Vargas", pero "Espinosa" sí es "Espinoza".
        .filter((c) => largo > 1 || c.resultado.exactas === 1 || (tramo[0] as Ficha).mayuscula);
      if (candidatos.length === 0) continue;
      const mejorPuntaje = Math.max(...candidatos.map((c) => c.resultado.exactas));
      const mejores = candidatos.filter((c) => c.resultado.exactas === mejorPuntaje);
      const ultima = tramo[tramo.length - 1] as Ficha;
      if (mejores.length > 1) {
        ambiguas = ambiguas ?? mejores.map((c) => c.persona.alumno);
      } else {
        const alias = (mejores[0] as (typeof candidatos)[number]).persona.alias;
        reemplazos.push({ inicio: ficha.inicio, fin: ultima.fin, alias });
        aliases.push(alias);
      }
      for (let k = i; k < i + largo; k += 1) usadas.add(k);
      i += largo - 1;
      break;
    }
  }

  let texto = peticion;
  for (const reemplazo of reemplazos.slice().sort((a, b) => b.inicio - a.inicio)) {
    texto = `${texto.slice(0, reemplazo.inicio)}[${reemplazo.alias}]${texto.slice(reemplazo.fin)}`;
  }
  const sinCoincidencia = fichas
    .filter((ficha, indice) => !usadas.has(indice) && indice > 0 && ficha.mayuscula && !esPalabraComun(ficha) && ficha.norma.length >= 3)
    .map((ficha) => ficha.texto);
  return { texto: texto.slice(0, LIMITES_ASISTENTE.peticion + 40), aliases, ambiguas, sinCoincidencia };
}

function nivelDe(valor: EvidenciaObjetivo | undefined): NivelDeFiltro {
  return valor ?? 'sin-dato';
}

/** Lo que ve el modelo del grupo: sin nombres, matrículas ni nada que el alumno dijo o escribió. */
export function hojaDelGrupo(
  grupo: DatosGrupo,
  seudonimos: Seudonimos,
  actividad: ActividadRow,
  extra: { duracionTipica: string | null; pendientes: Awaited<ReturnType<typeof pendientesDelGrupo>> | null } = { duracionTipica: null, pendientes: null },
): string {
  const { actividad: datos, alumnos } = grupo;
  const resumen = resumenDelGrupo(alumnos);
  const conteos = conteoPorObjetivo(alumnos, datos.objetivos);
  const lineas: string[] = [];
  lineas.push(`ACTIVIDAD: ${datos.nombre} · curso ${datos.curso} · grupo ${datos.grupo} · cierre ${datos.cierre.dia} ${datos.cierre.hora}`);
  lineas.push('OBJETIVOS:');
  for (const objetivo of datos.objetivos) lineas.push(`${objetivo.id} | ${objetivo.texto} | corto: ${objetivo.corto} | tema: ${objetivo.tema}`);
  lineas.push(
    `CONTEOS: personas ${resumen.total} · entregaron ${resumen.entregaron} · sin entregar ${resumen.sinEntregar} · ` +
      `entregaron sin defender ${resumen.sinDefensa} · defendieron ${resumen.defendieron} · por revisar ${resumen.porRevisar} · revisados ${resumen.revisados}`,
  );
  for (const conteo of conteos) {
    lineas.push(
      `OBJETIVO ${conteo.objetivo.id}: explico ${conteo.explico} · en-parte ${conteo.enParte} · no-salio ${conteo.noSalio} · sin-dato ${conteo.sinDato}${conteo.masCostoso ? ' · el que más costó' : ''}`,
    );
  }
  lineas.push(`ENLACE DEL GRUPO: ${actividad.enlaceActivo ? 'abierto' : 'desactivado'} · envíos ${actividad.enviosUsados} de ${actividad.limiteEnvios}`);
  lineas.push(`DURACIÓN TÍPICA DE UNA DEFENSA: ${extra.duracionTipica ?? 'sin dato (hacen falta 5 defensas medidas)'}`);
  if (extra.pendientes) {
    const { audioPorBorrar, reportesPreparando, reportesConError, conPartesParaOir } = extra.pendientes;
    lineas.push(
      `PENDIENTES: por revisar con algo para oír ${conPartesParaOir} · análisis preparándose ${reportesPreparando} · análisis con error ${reportesConError} · ` +
        `audio que se borra en 2 días: ${audioPorBorrar ? `${audioPorBorrar.reportes} reportes (el ${audioPorBorrar.dia})` : 'ninguno'}`,
    );
  }
  lineas.push('PERSONAS (alias | estado | entrega | defensa | banderas | partes para oír | nivel por objetivo):');
  for (const [alias, alumno] of Array.from(seudonimos.personaDe.entries())) {
    const banderas = [
      alumno.entregaTardia ? 'entrego-tarde' : '',
      alumno.defensaTardia ? 'defendio-tarde' : '',
      alumno.defensaIncompleta ? 'incompleta' : '',
      alumno.subioOtraVersion ? 'otra-version' : '',
    ].filter(Boolean);
    const niveles = alumno.defensa ? datos.objetivos.map((_, indice) => nivelDe(alumno.evidencia[indice])).join(',') : '-';
    lineas.push(
      `${alias} | ${estadoDe(alumno)} | ${alumno.entrega?.dia ?? '-'} | ${alumno.defensa?.dia ?? '-'} | ${banderas.join(',') || '-'} | ${alumno.partesParaOir} | ${niveles}`,
    );
  }
  return lineas.join('\n');
}

/* ------------------------------------------------------------------------ */
/* 3. Lo que devuelve el modelo                                             */
/* ------------------------------------------------------------------------ */

const MOTIVOS: readonly MotivoRechazo[] = ['calificar', 'comparar-personas', 'sospecha', 'privado', 'otro-grupo', 'fuera-de-alcance'];

const sinNulos = (valor: unknown): unknown => {
  if (Array.isArray(valor)) return valor.map(sinNulos);
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor).filter(([, v]) => v !== null && v !== undefined).map(([k, v]) => [k, sinNulos(v)]));
  }
  return valor;
};

const Objetivo123 = z.number().int().min(1).max(3);
const Niveles = z.array(z.enum(NIVELES_DE_FILTRO)).min(1).max(4);
const FiltroArg = z
  .object({ filtro: z.enum(FILTROS_DE_LISTA), objetivo: Objetivo123.optional(), niveles: Niveles.optional() })
  .strict()
  .refine((f) => f.filtro !== 'nivel-en-objetivo' || (f.objetivo !== undefined && f.niveles !== undefined));
const Vacio = z.object({}).strict();

/** Argumentos de cada tarjeta: cerrados, sin texto libre (salvo el id de una acción, que se busca en una lista). */
export const ArgumentosTarjeta = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('avance'), props: Vacio }).strict(),
  z.object({ tipo: z.literal('alumno'), props: z.object({ alias: z.string().regex(/^A\d{2,3}$/) }).strict() }).strict(),
  z.object({ tipo: z.literal('grupo'), props: Vacio }).strict(),
  z.object({ tipo: z.literal('objetivos'), props: Vacio }).strict(),
  z.object({ tipo: z.literal('descarga'), props: Vacio }).strict(),
  z.object({ tipo: z.literal('lista'), props: z.object({ filtros: z.array(FiltroArg).min(1).max(3) }).strict() }).strict(),
  z.object({ tipo: z.literal('objetivo'), props: z.object({ objetivo: Objetivo123 }).strict() }).strict(),
  z.object({ tipo: z.literal('citas'), props: z.object({ objetivo: Objetivo123, niveles: Niveles.optional() }).strict() }).strict(),
  z.object({ tipo: z.literal('pendientes'), props: Vacio }).strict(),
  z.object({ tipo: z.literal('ritmo'), props: Vacio }).strict(),
  z.object({ tipo: z.literal('accion'), props: z.object({ id: z.string().min(1).max(40) }).strict() }).strict(),
]);

export type ArgumentosDeTarjeta = z.infer<typeof ArgumentosTarjeta>;

const SalidaModelo = z.object({
  texto: z.string().max(2_000).catch(''),
  rechazo: z.enum(['ninguno', ...MOTIVOS] as [string, ...string[]]).catch('ninguno'),
  tarjetas: z.array(z.unknown()).max(10).catch([]),
});

const NULABLE_OBJETIVO = { type: ['integer', 'null'], minimum: 1, maximum: 3 };
const NULABLE_NIVELES = { type: ['array', 'null'], items: { type: 'string', enum: [...NIVELES_DE_FILTRO] }, maxItems: 4 };

/** JSON Schema de la herramienta `responder` (compatible con salida estricta: todo requerido, lo opcional es nulo). */
export function esquemaDeRespuesta(): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['texto', 'rechazo', 'tarjetas'],
    properties: {
      texto: { type: 'string', description: 'Frase corta para el profesor (máximo 240 caracteres). Personas solo con su alias entre corchetes.' },
      rechazo: { type: 'string', enum: ['ninguno', ...MOTIVOS] },
      tarjetas: {
        type: 'array',
        maxItems: LIMITES_TARJETAS.porRespuesta,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['tipo', 'props'],
          properties: {
            tipo: { type: 'string', enum: [...TIPOS_DE_TARJETA] },
            props: {
              type: 'object',
              additionalProperties: false,
              required: ['alias', 'objetivo', 'niveles', 'filtros', 'id'],
              properties: {
                alias: { type: ['string', 'null'] },
                objetivo: NULABLE_OBJETIVO,
                niveles: NULABLE_NIVELES,
                filtros: {
                  type: ['array', 'null'],
                  maxItems: 3,
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['filtro', 'objetivo', 'niveles'],
                    properties: { filtro: { type: 'string', enum: [...FILTROS_DE_LISTA] }, objetivo: NULABLE_OBJETIVO, niveles: NULABLE_NIVELES },
                  },
                },
                id: { type: ['string', 'null'] },
              },
            },
          },
        },
      },
    },
  };
}

export interface SalidaValidada {
  texto: string;
  rechazo: MotivoRechazo | null;
  tarjetas: ArgumentosDeTarjeta[];
  /** Cuántas tarjetas se descartaron por no cumplir el esquema o apuntar a algo que no existe. */
  descartadas: number;
}

/** Valida lo que devolvió el modelo; lo inválido se descarta tarjeta por tarjeta, nunca la respuesta entera. */
export function validarSalida(crudo: unknown, seudonimos: Seudonimos, accionesDisponibles: ReadonlySet<string>, objetivos: number): SalidaValidada {
  const base = SalidaModelo.safeParse(crudo);
  if (!base.success) return { texto: '', rechazo: null, tarjetas: [], descartadas: 0 };
  const tarjetas: ArgumentosDeTarjeta[] = [];
  const vistas = new Set<string>();
  let descartadas = 0;
  for (const candidata of base.data.tarjetas) {
    const limpia = sinNulos(candidata);
    const objeto = limpia && typeof limpia === 'object' ? (limpia as { props?: unknown }) : null;
    const conProps = objeto && objeto.props === undefined ? { ...objeto, props: {} } : limpia;
    const resultado = ArgumentosTarjeta.safeParse(conProps);
    if (!resultado.success) {
      descartadas += 1;
      continue;
    }
    const tarjeta = resultado.data;
    const valida =
      (tarjeta.tipo !== 'alumno' || seudonimos.personaDe.has(tarjeta.props.alias)) &&
      (tarjeta.tipo !== 'accion' || accionesDisponibles.has(tarjeta.props.id)) &&
      ((tarjeta.tipo !== 'objetivo' && tarjeta.tipo !== 'citas') || tarjeta.props.objetivo <= objetivos) &&
      (tarjeta.tipo !== 'lista' || tarjeta.props.filtros.every((f) => f.objetivo === undefined || f.objetivo <= objetivos));
    const clave = JSON.stringify(tarjeta);
    if (!valida || vistas.has(clave)) {
      descartadas += 1;
      continue;
    }
    vistas.add(clave);
    tarjetas.push(tarjeta);
  }
  descartadas += Math.max(0, tarjetas.length - LIMITES_TARJETAS.porRespuesta);
  const rechazo = base.data.rechazo === 'ninguno' ? null : (base.data.rechazo as MotivoRechazo);
  return { texto: base.data.texto, rechazo, tarjetas: tarjetas.slice(0, LIMITES_TARJETAS.porRespuesta), descartadas };
}

/* ------------------------------------------------------------------------ */
/* 4. Armar cada tarjeta con datos reales                                   */
/* ------------------------------------------------------------------------ */

const NIVEL_DEL_REPORTE: Readonly<Record<NivelReporte, EvidenciaObjetivo>> = {
  explico: 'explico',
  en_parte: 'en-parte',
  no_salio: 'no-salio',
  sin_evidencia: null,
};

/** Datos crudos que solo algunas tarjetas necesitan; se leen una vez y solo si hacen falta. */
interface Fuentes {
  ctx: Ctx;
  actividad: ActividadRow;
  grupo: DatosGrupo;
  filas: () => Promise<AlumnoConEstado[]>;
}

function primeraLinea(turno: TurnoRow, cita: string): string | null {
  const lineas = construirLineas(turno.id, turno.transcripcion ?? []);
  const inicio = normalizarTexto(cita).split(/\s+/).slice(0, 3).join(' ');
  const linea = lineas.find((candidata) => normalizarTexto(candidata.segmentos.map((s) => s.texto).join(' ')).includes(inicio));
  return linea?.tiempo ?? lineas[0]?.tiempo ?? null;
}

async function citasDelObjetivo(fuentes: Fuentes, numero: 1 | 2 | 3, niveles: readonly NivelDeFiltro[] | undefined) {
  const { ctx, actividad, grupo } = fuentes;
  const objetivo = actividad.objetivos[numero - 1];
  const objetivoUi = grupo.actividad.objetivos[numero - 1];
  if (!objetivo || !objetivoUi) return null;
  const filas = await fuentes.filas();
  const porMatricula = new Map(grupo.alumnos.map((alumno) => [alumno.matricula, alumno]));

  const encontradas: Array<{ alumno: Alumno; defensaId: string; nivel: EvidenciaObjetivo; turnoRef: string; texto: string }> = [];
  for (const fila of filas) {
    const alumno = porMatricula.get(fila.alumno.matricula);
    if (!alumno?.defensaId) continue;
    const reporte = fila.reportes.find((r) => r.defensaId === alumno.defensaId && r.estado === 'listo')?.reporte;
    const delObjetivo = reporte?.objetivos.find((o) => o.objetivoId === objetivo.id);
    if (!delObjetivo) continue;
    const nivel = NIVEL_DEL_REPORTE[delObjetivo.nivel];
    if (niveles && !niveles.includes(nivel ?? 'sin-dato')) continue;
    for (const cita of delObjetivo.citas) {
      encontradas.push({ alumno, defensaId: alumno.defensaId, nivel, turnoRef: cita.turnoRef, texto: cita.texto });
    }
  }

  const elegidas = encontradas.slice(0, LIMITES_TARJETAS.citas);
  const turnos = await ctx.repo.turnosDeDefensas(Array.from(new Set(elegidas.map((c) => c.defensaId))));
  const citas: CitaParaProfesor[] = elegidas.map((cita) => {
    const turno = turnos.find((t) => t.defensaId === cita.defensaId && t.preguntaRef === cita.turnoRef);
    const voz = turno?.modoRespuesta === 'voz' && (turno.transcripcion?.length ?? 0) > 0;
    return {
      matricula: cita.alumno.matricula,
      nombre: cita.alumno.nombre,
      iniciales: cita.alumno.iniciales,
      texto: cita.texto.split(/\s+/).slice(0, LIMITES_TARJETAS.palabrasCita).join(' '),
      nivel: cita.nivel,
      modo: voz ? 'voz' : 'escrito',
      tiempo: voz && turno ? primeraLinea(turno, cita.texto) : null,
    };
  });
  return {
    titulo: `Lo que dijeron sobre ${objetivoUi.tema}`,
    objetivo: { id: objetivoUi.id, texto: objetivoUi.texto },
    citas,
    total: encontradas.length,
  };
}

async function pendientesDelGrupo(fuentes: Fuentes) {
  const { ctx, actividad, grupo } = fuentes;
  const porRevisar = ordenarAlumnos('por-revisar', alumnosEnEstado(grupo.alumnos, 'por-revisar'));
  const filas = await fuentes.filas();
  const ahora = ctx.ahora().getTime();
  let preparando = 0;
  let conError = 0;
  let audioPronto = 0;
  let primerBorrado: number | null = null;
  for (const alumno of grupo.alumnos) {
    if (!alumno.defensaId) continue;
    const fila = filas.find((f) => f.alumno.matricula === alumno.matricula);
    const reporte = fila?.reportes.find((r) => r.defensaId === alumno.defensaId);
    if (!reporte || reporte.estado === 'generando') preparando += 1;
    else if (reporte.estado === 'error') conError += 1;
    if (estadoDe(alumno) !== 'por-revisar' || alumno.partesParaOir === 0) continue;
    const defensa = fila?.defensas.find((d) => d.id === alumno.defensaId);
    if (!defensa || defensa.audioBorradoEn !== null || !defensa.terminadaEn) continue;
    const borrado = Date.parse(defensa.terminadaEn) + LIMITES.audioRetencionMs;
    if (borrado > ahora && borrado - ahora <= 2 * 24 * 60 * 60 * 1000) {
      audioPronto += 1;
      primerBorrado = primerBorrado === null ? borrado : Math.min(primerBorrado, borrado);
    }
  }
  return {
    porRevisar: porRevisar.length,
    primeraMatricula: porRevisar[0]?.matricula ?? null,
    conPartesParaOir: porRevisar.filter((alumno) => alumno.partesParaOir > 0).length,
    reportesPreparando: preparando,
    reportesConError: conError,
    audioPorBorrar: primerBorrado === null ? null : { reportes: audioPronto, dia: diaLargo(marcaDeFecha(new Date(primerBorrado)).dia) },
    enlace: { activo: actividad.enlaceActivo, enviosUsados: actividad.enviosUsados, limiteEnvios: actividad.limiteEnvios },
  };
}

function filtroDeLista(argumento: { filtro: FiltroDeLista['filtro']; objetivo?: number; niveles?: readonly NivelDeFiltro[] }, objetivos: readonly Objetivo[]): FiltroDeLista {
  const objetivo = argumento.objetivo ? objetivos[argumento.objetivo - 1] : undefined;
  return { filtro: argumento.filtro, ...(objetivo ? { objetivo } : {}), ...(argumento.niveles ? { niveles: argumento.niveles } : {}) };
}

/** Convierte los argumentos que eligió el modelo en una tarjeta con datos reales; `null` si no se puede. */
export async function armarTarjeta(argumentos: ArgumentosDeTarjeta, fuentes: Fuentes, seudonimos: Seudonimos): Promise<TarjetaRespuesta | null> {
  const { grupo } = fuentes;
  const { alumnos, actividad } = grupo;
  switch (argumentos.tipo) {
    case 'avance':
      return {
        tipo: 'avance',
        props: {
          resumen: resumenDelGrupo(alumnos),
          sinEntregar: ordenarAlumnos('sin-entregar', alumnosEnEstado(alumnos, 'sin-entregar')),
          sinDefensa: ordenarAlumnos('sin-defensa', alumnosEnEstado(alumnos, 'sin-defensa')),
        },
      };
    case 'alumno': {
      const alumno = seudonimos.personaDe.get(argumentos.props.alias);
      return alumno ? { tipo: 'alumno', props: { alumno } } : null;
    }
    case 'grupo':
      return { tipo: 'grupo', props: { secciones: seccionesDelGrupo(alumnos) } };
    case 'objetivos':
      return { tipo: 'objetivos', props: { conteos: conteoPorObjetivo(alumnos, actividad.objetivos) } };
    case 'descarga': {
      const resumen = resumenDelGrupo(alumnos);
      return { tipo: 'descarga', props: { descarga: grupo.descarga, entregaron: resumen.entregaron, sinEntregar: resumen.sinEntregar } };
    }
    case 'lista':
      return { tipo: 'lista', props: listaFiltrada(alumnos, argumentos.props.filtros.map((f) => filtroDeLista(f, actividad.objetivos))) };
    case 'objetivo': {
      const props = objetivoDeCerca(alumnos, actividad.objetivos, argumentos.props.objetivo as 1 | 2 | 3);
      return props ? { tipo: 'objetivo', props } : null;
    }
    case 'citas': {
      const props = await citasDelObjetivo(fuentes, argumentos.props.objetivo as 1 | 2 | 3, argumentos.props.niveles);
      return props ? { tipo: 'citas', props } : null;
    }
    case 'pendientes':
      return { tipo: 'pendientes', props: await pendientesDelGrupo(fuentes) };
    case 'ritmo':
      return { tipo: 'ritmo', props: ritmoDelGrupo(alumnos, actividad.cierre) };
    case 'accion':
      return { tipo: 'accion', props: { id: argumentos.props.id } };
  }
}

/* ------------------------------------------------------------------------ */
/* 5. Verificar la frase del modelo                                         */
/* ------------------------------------------------------------------------ */

const NUMEROS_EN_LETRA: Readonly<Record<string, number>> = {
  cero: 0, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
  trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20,
  treinta: 30, cuarenta: 40, cincuenta: 50, cien: 100, ciento: 100,
};

/** Palabras con mayúscula a media frase que no son personas. */
const MAYUSCULAS_PERMITIDAS = new Set(
  'celestea objetivo objetivos grupo lunes martes miercoles jueves viernes sabado domingo enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre lo en no'.split(' '),
);

/** Todo número visible en las tarjetas (también dentro de textos como "sábado 10 a las 01:12"). */
function numerosDe(valor: unknown, destino: Set<number>): void {
  if (typeof valor === 'number' && Number.isFinite(valor)) destino.add(valor);
  else if (typeof valor === 'string') for (const numero of valor.match(/\d+/g) ?? []) destino.add(Number(numero));
  else if (Array.isArray(valor)) valor.forEach((elemento) => numerosDe(elemento, destino));
  else if (valor && typeof valor === 'object') Object.values(valor).forEach((elemento) => numerosDe(elemento, destino));
}

export interface ContextoDeVerificacion {
  grupo: DatosGrupo;
  actividad: ActividadRow;
  seudonimos: Seudonimos;
  tarjetas: readonly TarjetaRespuesta[];
  /** Palabras con mayúscula de la petición que no se parecían a nadie. */
  sinCoincidencia: readonly string[];
}

export type MotivoDescarte = 'vacio' | 'largo' | 'prohibido' | 'interno' | 'alias' | 'nombre' | 'numero';

/** Palabras de cómo está hecho Celestea por dentro, que el profesor no tiene por qué leer. */
const INTERNO =
  /\bhoja\b|\btarjetas?\b|\bcat[aá]logo\b|\balias\b|\bcolumnas?\b|\bfiltros?\b|\bfiltrad[ao]s?\b|\bvistas?\b|\bprops\b|\bjson\b|\bmarcan? 0\b/i;

/** Las matrículas de todas las personas que muestran las tarjetas: solo de ellas puede hablar la frase. */
function personasMostradas(tarjetas: readonly TarjetaRespuesta[]): Set<string> {
  const matriculas = new Set<string>();
  for (const tarjeta of tarjetas) {
    switch (tarjeta.tipo) {
      case 'alumno':
        matriculas.add(tarjeta.props.alumno.matricula);
        break;
      case 'avance':
        for (const alumno of [...tarjeta.props.sinEntregar, ...tarjeta.props.sinDefensa]) matriculas.add(alumno.matricula);
        break;
      case 'grupo':
        for (const seccion of tarjeta.props.secciones) for (const fila of seccion.filas) matriculas.add(fila.alumno.matricula);
        break;
      case 'lista':
        for (const fila of tarjeta.props.filas) matriculas.add(fila.matricula);
        break;
      case 'objetivo':
        for (const grupo of tarjeta.props.porNivel) for (const persona of grupo.personas) matriculas.add(persona.matricula);
        break;
      case 'citas':
        for (const cita of tarjeta.props.citas) matriculas.add(cita.matricula);
        break;
      default:
        break;
    }
  }
  return matriculas;
}

/** Con una lista en la respuesta, "N personas" debe ser cuántas trae una de ellas. */
function totalesDePersonas(tarjetas: readonly TarjetaRespuesta[]): Set<number> | null {
  const listas = tarjetas.filter((tarjeta): tarjeta is Extract<TarjetaRespuesta, { tipo: 'lista' }> => tarjeta.tipo === 'lista');
  if (listas.length === 0 || tarjetas.length !== listas.length) return null;
  return new Set(listas.map((lista) => lista.props.total));
}

const CUANTAS_PERSONAS = /\b(\d+|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieciseis|diecisiete|dieciocho|diecinueve|veinte)\s+(personas|alumnos|alumnas|estudiantes)\b/g;

/**
 * La frase del modelo, con sus alias cambiados por nombres, si cada número y cada
 * nombre sale de los datos del servidor; si no, el motivo para usar la plantilla.
 */
export function verificarTexto(crudo: string, contexto: ContextoDeVerificacion): { texto: string } | { motivo: MotivoDescarte } {
  const texto = crudo
    .replace(new RegExp('[\\u0000-\\u001F\\u007F]', 'g'), ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!texto) return { motivo: 'vacio' };
  if (texto.length > LIMITES_ASISTENTE.texto) return { motivo: 'largo' };
  if (PROHIBIDO.test(texto)) return { motivo: 'prohibido' };
  if (INTERNO.test(texto)) return { motivo: 'interno' };

  // Personas: solo por alias, cada alias debe existir y ser de alguien que la respuesta muestra.
  const aliases = coincidencias(texto, /\[?\b(A\d{2,3})\b\]?/g);
  const mostradas = personasMostradas(contexto.tarjetas);
  for (const coincidencia of aliases) {
    const persona = contexto.seudonimos.personaDe.get(coincidencia[1] as string);
    if (!persona || !mostradas.has(persona.matricula)) return { motivo: 'alias' };
  }
  const sinAlias = texto.replace(/\[?\bA\d{2,3}\b\]?/g, ' ');

  // Nombres que no vienen de un alias: los que no se parecieron a nadie, los del grupo y
  // cualquier palabra con mayúscula a media frase que no sea de la actividad.
  const permitidas = new Set<string>(MAYUSCULAS_PERMITIDAS);
  const { actividad } = contexto.grupo;
  for (const fuente of [actividad.nombre, actividad.curso, actividad.grupo, actividad.referencia, ...actividad.objetivos.flatMap((o) => [o.texto, o.corto, o.alias, o.tema])]) {
    for (const palabra of normalizarTexto(fuente).split(/[^a-z0-9ñ]+/)) if (palabra) permitidas.add(palabra);
  }
  const prohibidas = new Set(contexto.sinCoincidencia.map((palabra) => normalizarTexto(palabra)));
  for (const alumno of contexto.grupo.alumnos) {
    for (const parte of normalizarTexto(alumno.nombre).split(/[^a-z0-9ñ]+/)) if (parte.length >= 3 && !permitidas.has(parte)) prohibidas.add(parte);
  }
  const fichas = fichasDe(sinAlias);
  for (let indice = 0; indice < fichas.length; indice += 1) {
    const ficha = fichas[indice] as Ficha;
    if (prohibidas.has(ficha.norma)) return { motivo: 'nombre' };
    const previo = sinAlias.slice(0, ficha.inicio).trimEnd();
    const inicioDeFrase = indice === 0 || /[.!?¿¡:;]$/.test(previo);
    if (ficha.mayuscula && !inicioDeFrase && !permitidas.has(ficha.norma) && !/^\d/.test(ficha.texto)) return { motivo: 'nombre' };
  }

  // Números: deben aparecer en los conteos del grupo o en alguna tarjeta.
  const permitidos = new Set<number>();
  const resumen = resumenDelGrupo(contexto.grupo.alumnos);
  numerosDe(resumen, permitidos);
  numerosDe(conteoPorObjetivo(contexto.grupo.alumnos, actividad.objetivos).map((c) => [c.explico, c.enParte, c.noSalio, c.sinDato]), permitidos);
  numerosDe([contexto.actividad.enviosUsados, contexto.actividad.limiteEnvios, actividad.cierre.dia, actividad.cierre.hora], permitidos);
  numerosDe(contexto.tarjetas.map((tarjeta) => tarjeta.props), permitidos);
  const normal = normalizarTexto(sinAlias);
  for (const coincidencia of coincidencias(normal, /(objetivos?\s+)?(\d+)/g)) {
    const numero = Number(coincidencia[2]);
    if (coincidencia[1] && numero >= 1 && numero <= actividad.objetivos.length) continue;
    if (!permitidos.has(numero)) return { motivo: 'numero' };
  }
  for (const palabra of normal.split(/[^a-z0-9ñ]+/)) {
    const numero = NUMEROS_EN_LETRA[palabra];
    if (numero !== undefined && !permitidos.has(numero)) return { motivo: 'numero' };
  }
  const totales = totalesDePersonas(contexto.tarjetas);
  if (totales) {
    for (const coincidencia of coincidencias(normal, CUANTAS_PERSONAS)) {
      const palabra = coincidencia[1] as string;
      const numero = /^\d+$/.test(palabra) ? Number(palabra) : palabra === 'una' ? 1 : NUMEROS_EN_LETRA[palabra];
      if (numero === undefined || !totales.has(numero)) return { motivo: 'numero' };
    }
  }

  const final = texto.replace(/\[?\b(A\d{2,3})\b\]?/g, (_, alias: string) => contexto.seudonimos.personaDe.get(alias)?.nombreCorto ?? alias);
  return { texto: final };
}

/* ------------------------------------------------------------------------ */
/* 6. El prompt                                                             */
/* ------------------------------------------------------------------------ */

export const SYSTEM_ASISTENTE = `Eres Celestea. Ayudas a un profesor universitario en México a revisar las defensas orales de su grupo: después de entregar un trabajo, cada alumno lo explicó con su voz o por escrito, y un reporte dice qué mostró en cada objetivo con niveles escritos (explico, en-parte, no-salio, sin-dato). El profesor decide; tú no calificas.

Tu trabajo: leer la petición del profesor y la hoja del grupo, elegir hasta 3 tarjetas del catálogo y escribir una frase corta que conteste.

REGLAS
- Usa solo los datos de la hoja. A las personas las nombras solo con su alias entre corchetes, por ejemplo [A07]. Nunca escribas otro nombre de persona.
- Cada número de tu frase debe estar en la hoja o ser cuántas personas cumplen lo que muestra la tarjeta. Si no estás seguro de una cifra, no la escribas.
- La frase: español de México, cálida y directa, tuteando, máximo 240 caracteres. Dice lo esencial; lo que eliges se muestra debajo con el detalle.
- Nunca nombres cómo funcionas por dentro: no digas "hoja", "tarjeta", "catálogo", "alias", "columna", "filtro" ni "vista". No mandes al profesor a revisar, usar o ver algo en la pantalla: contesta tú en la frase. Habla del grupo, no de la pantalla.
- Solo nombra (con su alias) a personas que salen en lo que eliges. Si hay una lista, "N personas" debe ser exactamente cuántas cumplen; cuéntalas con cuidado en la hoja o no digas el número.
- Para los niveles usa estas palabras: "lo explicó", "en parte", "no salió", "sin dato". No digas "bien", "mal", "mejor" ni "peor".
- No calificas ni das notas, puntos, porcentajes o promedios. No ordenas a personas de mejor a peor. No hablas de copia, plagio, trampa o uso de IA. No muestras el ensayo ni cómo se sintió alguien. Solo existe este grupo. Si te piden algo de eso, pon el motivo en "rechazo" y deja "texto" vacío; puedes sumar una tarjeta útil (por ejemplo "alumno" si piden calificar a alguien).
- Si nada del catálogo contesta la petición, rechazo = "fuera-de-alcance".
- Si la petición menciona a una persona con alias, usa ese alias. Si menciona un nombre sin alias, no está en el grupo: dilo sin repetir el nombre.
- En props, pon null en todo lo que la tarjeta no usa.

CATÁLOGO (tipo: props → cuándo)
- avance: {} → cuántos defendieron, quién no ha entregado o no ha defendido, con nombre.
- alumno: {alias} → cómo le fue a una persona; también para bajar su trabajo.
- grupo: {} → todo el grupo por estado ("muéstrame a todos").
- objetivos: {} → cómo le fue al grupo en los objetivos, cuál costó más.
- descarga: {} → bajar todos los trabajos en un archivo.
- lista: {filtros:[{filtro, objetivo, niveles}]} → una lista de personas (por ejemplo "¿cuáles ya revisé?" es filtro revisado) con 1 a 3 filtros que se cumplen a la vez. Filtros: sin-entregar, sin-defensa (entregó sin defender), por-revisar, revisado, tarde (entregó o defendió después del cierre), incompleta, otra-version, partes-para-oir, nivel-en-objetivo (requiere objetivo 1-3 y niveles; varios niveles = cualquiera de ellos).
- objetivo: {objetivo} → un objetivo de cerca: cuántos en cada nivel y quiénes.
- citas: {objetivo, niveles?} → frases textuales de las defensas sobre un objetivo.
- pendientes: {} → qué le falta al profesor: reportes por revisar, lo que trae algo para oír, audio que se borra pronto, análisis que se preparan y cuántos envíos lleva el enlace del grupo.
- ritmo: {} → cuándo entregaron y defendieron por día, cuánto dura una defensa.
{ACCIONES}
EJEMPLOS
Petición: ¿quién entregó tarde? → tarjetas [lista {filtros:[{filtro:"tarde"}]}], texto "Tres personas entregaron o defendieron después del cierre." (si la hoja dice que son tres).
Petición: ¿cómo le fue a [A12]? → [alumno {alias:"A12"}], texto "[A12] explicó el objetivo 1 y el 3; el 2 solo en parte."
Petición: ¿quién no explicó la muestra? (la muestra es el tema del objetivo 2) → [lista {filtros:[{filtro:"nivel-en-objetivo", objetivo:2, niveles:["en-parte","no-salio"]}]}].
Petición: ¿quién es el peor? → rechazo "comparar-personas", texto "", tarjetas [objetivos].`;

function systemCon(acciones: ReadonlyArray<{ id: string; descripcionParaModelo: string }>): string {
  const lineas = acciones.map((accion) => `- accion: {id:"${accion.id}"} → ${accion.descripcionParaModelo}`);
  return SYSTEM_ASISTENTE.replace('{ACCIONES}', lineas.length > 0 ? `${lineas.join('\n')}\n` : '');
}

/* ------------------------------------------------------------------------ */
/* El recorrido completo                                                    */
/* ------------------------------------------------------------------------ */

const PASO_POR_TIPO: Readonly<Record<TipoTarjeta, (t: TarjetaRespuesta) => string>> = {
  avance: () => 'Cuento entregas y defensas…',
  alumno: (t) => (t.tipo === 'alumno' ? `Busco a ${t.props.alumno.nombreCorto}…` : 'Busco a esa persona…'),
  grupo: () => 'Ordeno el grupo por estado…',
  objetivos: () => 'Junto lo que mostró el grupo en cada objetivo…',
  descarga: (t) => (t.tipo === 'descarga' ? `Junto los ${t.props.entregaron} trabajos…` : 'Junto los trabajos…'),
  lista: (t) => (t.tipo === 'lista' ? `Busco: ${t.props.titulo.charAt(0).toLowerCase()}${t.props.titulo.slice(1)}…` : 'Busco en el grupo…'),
  objetivo: (t) => (t.tipo === 'objetivo' ? `Junto lo del objetivo ${t.props.conteo.objetivo.id} en los reportes…` : 'Junto lo de ese objetivo…'),
  citas: () => 'Tomo solo frases que aparecen tal cual en las transcripciones…',
  pendientes: () => 'Reviso los reportes que te esperan…',
  ritmo: () => 'Cuento entregas y defensas por día…',
  accion: () => 'Preparo lo que pediste…',
};

export interface DependenciasAsistente {
  /** Se llama con cada paso visible, en orden. */
  alPaso?: (texto: string) => void;
  tiempoMaximoMs?: number;
}

export interface ResultadoAsistente {
  respuesta: RespuestaAsistente;
  medidas: {
    latenciaMs: number;
    tokensEntrada: number;
    tokensSalida: number;
    descartadas: number;
    motivoPlantilla: MotivoDescarte | null;
    nombresSinCoincidencia: number;
  };
}

function sugerenciasPara(tarjetas: readonly TarjetaRespuesta[]): readonly string[] {
  return SUGERENCIAS_POR_TARJETA[tarjetas[0]?.tipo ?? 'ninguna'];
}

function conTiempo<T>(promesa: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolver, rechazar) => {
    const reloj = setTimeout(() => rechazar(new Error('tiempo_agotado')), ms);
    promesa.then(
      (valor) => {
        clearTimeout(reloj);
        resolver(valor);
      },
      (error: unknown) => {
        clearTimeout(reloj);
        rechazar(error instanceof Error ? error : new Error('fallo'));
      },
    );
  });
}

/** Lo que contestan las reglas de siempre cuando el modelo no está o falla. */
async function respuestaPorReglas(
  peticion: string,
  fuentes: Fuentes,
  seudonimos: Seudonimos,
  personaUnica: string | null,
): Promise<{ texto: string; tarjetas: TarjetaRespuesta[] }> {
  const destino = interpretarPeticion(peticion).destino;
  const argumentos: ArgumentosDeTarjeta | null =
    personaUnica !== null
      ? { tipo: 'alumno', props: { alias: personaUnica } }
      : destino.tipo !== 'escena'
        ? null
        : destino.escena === 'avance'
          ? { tipo: 'avance', props: {} }
          : destino.escena === 'descarga'
            ? { tipo: 'descarga', props: {} }
            : destino.escena === 'lista'
              ? { tipo: 'grupo', props: {} }
              : destino.escena === 'objetivos'
                ? { tipo: 'objetivos', props: {} }
                : null;
  const tarjeta = argumentos ? await armarTarjeta(argumentos, fuentes, seudonimos) : null;
  return tarjeta ? { texto: fraseDeTarjeta(tarjeta), tarjetas: [tarjeta] } : { texto: FRASE_DE_RECHAZO['fuera-de-alcance'], tarjetas: [] };
}

/** Tarjetas que pueden acompañar a un rechazo como alternativa útil. */
const ALTERNATIVAS: Readonly<Record<MotivoRechazo, readonly TipoTarjeta[]>> = {
  calificar: ['alumno', 'objetivos', 'objetivo'],
  'comparar-personas': ['objetivos', 'objetivo'],
  sospecha: [],
  privado: ['alumno'],
  'otro-grupo': [],
  'fuera-de-alcance': [],
};

/**
 * Contesta una petición del profesor sobre el grupo del enlace firmado
 * (`actividad` ya viene autenticada). Nunca lanza por culpa del modelo: si falla,
 * contestan las reglas.
 */
export async function responderAsistente(
  ctx: Ctx,
  actividad: ActividadRow,
  tokenProfesor: string,
  entrada: PeticionAsistente,
  dependencias: DependenciasAsistente = {},
): Promise<ResultadoAsistente> {
  const inicio = Date.now();
  const paso = dependencias.alPaso ?? (() => undefined);
  const peticion = entrada.peticion.trim().slice(0, LIMITES_ASISTENTE.peticion);

  const grupo = await datosDelGrupo(ctx, actividad, tokenProfesor);
  const resumen = resumenDelGrupo(grupo.alumnos);
  paso(`Leo tu grupo: ${resumen.total} personas, ${resumen.entregaron} entregas y ${resumen.defendieron} defensas…`);

  let filasEnMemoria: Promise<AlumnoConEstado[]> | null = null;
  const fuentes: Fuentes = { ctx, actividad, grupo, filas: () => (filasEnMemoria ??= ctx.repo.listarAlumnosDeActividad(actividad.id)) };
  const seudonimos = crearSeudonimos(grupo.alumnos);
  const palabrasDeLaActividad = new Set(
    [grupo.actividad.nombre, grupo.actividad.curso, ...grupo.actividad.objetivos.flatMap((o) => [o.texto, o.corto, o.alias, o.tema])]
      .flatMap((texto) => normalizarTexto(texto).split(/[^a-z0-9ñ]+/))
      .filter((palabra) => palabra.length >= 3),
  );
  const seudonima = seudonimizarPeticion(peticion, seudonimos, palabrasDeLaActividad);
  const medidas: ResultadoAsistente['medidas'] = {
    latenciaMs: 0,
    tokensEntrada: 0,
    tokensSalida: 0,
    descartadas: 0,
    motivoPlantilla: null,
    nombresSinCoincidencia: seudonima.sinCoincidencia.length,
  };
  const terminar = (texto: string, tarjetas: TarjetaRespuesta[], fuente: FuenteRespuesta, rechazo: MotivoRechazo | null): ResultadoAsistente => {
    medidas.latenciaMs = Date.now() - inicio;
    return { respuesta: { texto, tarjetas, sugerencias: sugerenciasPara(tarjetas), fuente, rechazo }, medidas };
  };

  // 1. Rechazos claros, sin modelo.
  const motivo = motivoDeRechazo(peticion, grupo.actividad.grupo);
  if (motivo) {
    const alias = seudonima.aliases[0];
    const alternativa =
      alias && ALTERNATIVAS[motivo].includes('alumno') ? await armarTarjeta({ tipo: 'alumno', props: { alias } }, fuentes, seudonimos) : null;
    return terminar(FRASE_DE_RECHAZO[motivo], alternativa ? [alternativa] : [], 'filtro', motivo);
  }

  // 2. Un nombre que se parece a varias personas: se pregunta a cuál, sin modelo.
  if (seudonima.ambiguas && seudonima.ambiguas.length > 1) {
    const props = listaDePersonas(seudonima.ambiguas, 'Personas con ese nombre', 'Nadie con ese nombre.');
    return terminar(`Encontré a ${props.total} personas con ese nombre. Toca la que buscas.`, [{ tipo: 'lista', props }], 'filtro', null);
  }

  // 3. El modelo elige.
  paso('Entiendo lo que pides…');
  const acciones = extensionesDisponibles(grupo);
  let salida: SalidaValidada | null = null;
  try {
    const historial = entrada.historial
      .slice(-LIMITES_ASISTENTE.historial)
      .map((anterior) => `- "${seudonimizarPeticion(anterior.peticion.slice(0, LIMITES_ASISTENTE.peticion), seudonimos, palabrasDeLaActividad).texto}" → ${anterior.tipos.join(', ') || 'sin tarjeta'}`);
    const extra = {
      duracionTipica: ritmoDelGrupo(grupo.alumnos, grupo.actividad.cierre).duracionTipica,
      pendientes: await pendientesDelGrupo(fuentes),
    };
    const contenido = [
      'HOJA DEL GRUPO',
      hojaDelGrupo(grupo, seudonimos, actividad, extra),
      '',
      acciones.length > 0 ? `ACCIONES: ${acciones.map((a) => a.id).join(', ')}` : 'ACCIONES: ninguna',
      '',
      historial.length > 0 ? `PETICIONES ANTERIORES\n${historial.join('\n')}` : 'PETICIONES ANTERIORES: ninguna',
      '',
      'PETICIÓN',
      seudonima.texto,
    ].join('\n');
    const respuesta = await conTiempo(
      ctx.proveedores.llm.generarJson({
        tarea: 'asistente',
        system: systemCon(acciones),
        mensajes: [{ rol: 'user', contenido }],
        esquema: { nombre: 'responder', json: esquemaDeRespuesta() },
        maxTokens: MAX_TOKENS,
        timeoutMs: dependencias.tiempoMaximoMs ?? TIEMPO_MAXIMO_MS,
      }),
      dependencias.tiempoMaximoMs ?? TIEMPO_MAXIMO_MS,
    );
    medidas.tokensEntrada = respuesta.uso?.entrada ?? 0;
    medidas.tokensSalida = respuesta.uso?.salida ?? 0;
    salida = validarSalida(respuesta.json, seudonimos, new Set(acciones.map((a) => a.id)), grupo.actividad.objetivos.length);
    medidas.descartadas = salida.descartadas;
  } catch (error) {
    console.error('defensa_asistente_modelo_fallo', { nombre: error instanceof Error ? error.message.slice(0, 40) : 'desconocido' });
    salida = null;
  }

  // 4. Sin modelo, o sin nada útil: contestan las reglas.
  if (!salida || (salida.tarjetas.length === 0 && salida.rechazo === null)) {
    paso('Esta vez contesto con lo básico…');
    const unica = seudonima.aliases.length === 1 ? (seudonima.aliases[0] as string) : null;
    const reglas = await respuestaPorReglas(peticion, fuentes, seudonimos, unica);
    for (const tarjeta of reglas.tarjetas) paso(PASO_POR_TIPO[tarjeta.tipo](tarjeta));
    return terminar(reglas.texto, reglas.tarjetas, 'reglas', null);
  }

  // 5. Armar las tarjetas con datos reales.
  const permitidas = salida.rechazo ? ALTERNATIVAS[salida.rechazo] : null;
  const tarjetas: TarjetaRespuesta[] = [];
  for (const argumentos of salida.tarjetas) {
    if (permitidas && !permitidas.includes(argumentos.tipo)) continue;
    if (argumentos.tipo === 'accion' && !extensionPorId(argumentos.props.id, grupo)) continue;
    const tarjeta = await armarTarjeta(argumentos, fuentes, seudonimos);
    if (!tarjeta) continue;
    paso(PASO_POR_TIPO[tarjeta.tipo](tarjeta));
    tarjetas.push(tarjeta);
  }

  if (salida.rechazo) return terminar(FRASE_DE_RECHAZO[salida.rechazo], tarjetas, 'modelo', salida.rechazo);

  // 6. La frase: verificada o plantilla.
  const verificada = verificarTexto(salida.texto, { grupo, actividad, seudonimos, tarjetas, sinCoincidencia: seudonima.sinCoincidencia });
  if ('texto' in verificada) return terminar(verificada.texto, tarjetas, 'modelo', null);
  medidas.motivoPlantilla = verificada.motivo;
  const primera = tarjetas[0];
  return terminar(primera ? fraseDeTarjeta(primera) : FRASE_DE_RECHAZO['fuera-de-alcance'], tarjetas, 'plantilla', null);
}

/** Lo que se registra de cada petición: sin su texto, que puede traer nombres. */
export async function registrarUsoDelAsistente(ctx: Ctx, actividad: ActividadRow, resultado: ResultadoAsistente): Promise<void> {
  const { respuesta, medidas } = resultado;
  await ctx.eventos.emitir({
    verbo: 'completo_paso',
    evento: 'asistente',
    pasoId: 'asistente',
    actividadId: actividad.id,
    actorId: actividad.id,
    clave: `${actividad.id}:${ctx.ahora().getTime()}:${Math.random().toString(36).slice(2, 8)}`,
    medidas: {
      fuente: respuesta.fuente,
      tarjetas: respuesta.tarjetas.map((tarjeta) => tarjeta.tipo).join(',') || null,
      rechazo: respuesta.rechazo,
      latenciaMs: medidas.latenciaMs,
      tokensEntrada: medidas.tokensEntrada,
      tokensSalida: medidas.tokensSalida,
      descartadas: medidas.descartadas,
      motivoPlantilla: medidas.motivoPlantilla,
      nombresSinCoincidencia: medidas.nombresSinCoincidencia,
      promptVersion: PROMPT_VERSION_ASISTENTE,
    },
  });
}

/* ------------------------------------------------------------------------ */
/* Dictado del profesor                                                     */
/* ------------------------------------------------------------------------ */

/** El dictado solo existe con transcripción real: con `mock` no hay nada que dictar. */
export function dictadoDisponible(): boolean {
  return config.proveedorStt() !== 'mock';
}

/** Unos 60 s de voz comprimida. */
export const MAX_DICTADO_BYTES = 2 * 1024 * 1024;

/**
 * Lo que dictó el profesor, en texto, para que lo revise antes de enviarlo. El
 * audio no se guarda: va al transcriptor y se descarta.
 */
export async function transcribirDictado(ctx: Ctx, bytes: Uint8Array, mime: string | null): Promise<{ texto: string }> {
  if (!dictadoDisponible()) throw new DefensaError('no_configurado', 503);
  if (bytes.byteLength === 0) throw new DefensaError('solicitud_invalida', 400);
  const tipo = (mime ?? '').toLowerCase().trim();
  const seguro = /^audio\/(webm|mp4|ogg|mpeg|wav|x-wav)(;[\w=.,\s-]*)?$/.test(tipo) ? tipo : 'audio/webm';
  try {
    const transcripcion = await ctx.proveedores.stt.transcribir(bytes, seguro, { idioma: config.idiomaStt(), timeoutMs: 20_000 });
    return { texto: transcripcion.texto.replace(/\s+/g, ' ').trim().slice(0, LIMITES_ASISTENTE.peticion) };
  } catch {
    throw new DefensaError('transcripcion_fallo', 502);
  }
}

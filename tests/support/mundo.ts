import { crearAlmacenMemoria, crearEstadoMemoria, type EstadoMemoria } from '../../src/lib/defensa/almacen/memoria';
import type { ActividadRow } from '../../src/lib/defensa/almacen/tipos';
import { crearLlmMock, crearSttMock, crearTtsMock } from '../../src/lib/defensa/providers/mock';
import type { Proveedores } from '../../src/lib/defensa/providers/tipos';
import { iniciarSesion, type ResultadoSesion, type SesionAlumno } from '../../src/lib/defensa/servicios/acceso';
import { crearContexto, type Ctx } from '../../src/lib/defensa/servicios/contexto';
import { confirmarEntrega, entregarTextoPegado } from '../../src/lib/defensa/servicios/entregas';
import { prepararPlan } from '../../src/lib/defensa/servicios/planes';
import { OBJETIVOS, TRABAJO } from './fixtures';

/**
 * Un mundo de prueba completo: almacén en memoria, proveedores falsos y un reloj
 * que solo avanza cuando se le pide. Cada prueba arma el suyo, aislado.
 */

export const SECRETO_DE_PRUEBA = 'secreto-de-pruebas-con-mas-de-32-caracteres-0123';
process.env.DEFENSA_SIGNING_SECRET = SECRETO_DE_PRUEBA;

export interface Reloj {
  ahora: () => Date;
  avanzar: (ms: number) => void;
}

export function crearReloj(inicio = '2026-10-09T20:00:00-06:00'): Reloj {
  let t = Date.parse(inicio);
  return {
    ahora: () => new Date(t),
    avanzar: (ms) => {
      t += ms;
    },
  };
}

export interface Mundo {
  ctx: Ctx;
  estado: EstadoMemoria;
  reloj: Reloj;
}

export function crearMundo(parcial: { proveedores?: Partial<Proveedores>; inicio?: string } = {}): Mundo {
  const estado = crearEstadoMemoria();
  const almacen = crearAlmacenMemoria(estado);
  const reloj = crearReloj(parcial.inicio);
  const proveedores: Proveedores = {
    llm: crearLlmMock(),
    stt: crearSttMock(() => undefined),
    tts: crearTtsMock(),
    ...parcial.proveedores,
  };
  const ctx = crearContexto({ repo: almacen.repo, archivos: almacen.archivos, proveedores, ahora: reloj.ahora });
  return { ctx, estado, reloj };
}

export async function crearActividadDePrueba(
  ctx: Ctx,
  parcial: Partial<Omit<ActividadRow, 'id'>> = {},
): Promise<ActividadRow> {
  return ctx.repo.crearActividad({
    tokenGrupo: 'grupo3bprueba',
    nombre: 'Encuesta sobre hábitos de estudio',
    curso: 'Metodología de la investigación',
    grupo: '3B',
    profesorNombre: 'Laura Méndez',
    profesorRef: null,
    consigna: 'Diseña y aplica una encuesta, y explica tus decisiones de método.',
    rubrica: null,
    ejemplosDocente: null,
    contextoCurso: 'Metodología de la investigación',
    registro: 'tu',
    objetivos: OBJETIVOS.map((o) => ({ ...o })),
    duracion: 'corta',
    fechaLimite: '2026-10-09T23:59:00-06:00',
    limiteEnvios: 50,
    enlaceActivo: true,
    ...parcial,
  });
}

export const CONSENTIMIENTOS = { avisoPrivacidad: true, transferenciaInternacional: true, mayorDeEdad: true } as const;

export async function entrarComoAlumno(
  ctx: Ctx,
  actividad: ActividadRow,
  datos: { nombre?: string; matricula?: string; modo?: 'voz' | 'escrito' } = {},
): Promise<ResultadoSesion> {
  return iniciarSesion(
    ctx,
    {
      token: actividad.tokenGrupo,
      nombre: datos.nombre ?? 'Ana Torres Ruiz',
      matricula: datos.matricula ?? '20231457',
      consentimientos: { ...CONSENTIMIENTOS },
      modo: datos.modo ?? 'voz',
    },
    'Mozilla/5.0 (Linux; Android 13; Pixel 5) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
  );
}

export function comoSesion(r: ResultadoSesion): SesionAlumno {
  return { alumno: r.alumno, actividad: r.actividad };
}

/** Entra, entrega el trabajo de ejemplo pegado y deja el plan listo. */
export async function prepararAlumnoConPlan(
  mundo: Mundo,
  actividad: ActividadRow,
  datos: { nombre?: string; matricula?: string } = {},
): Promise<SesionAlumno> {
  const entrada = await entrarComoAlumno(mundo.ctx, actividad, datos);
  const sesion = comoSesion(entrada);
  await entregarTextoPegado(mundo.ctx, sesion, TRABAJO);
  const { trabajo } = await prepararPlan(mundo.ctx, sesion);
  if (trabajo) await trabajo();
  return sesion;
}

export { confirmarEntrega };

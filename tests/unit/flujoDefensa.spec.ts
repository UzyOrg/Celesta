import '../support/sinServerOnly';
import { expect, test } from '@playwright/test';
import type { DefensaCliente, PeticionResponder } from '../../src/components/defensa/contrato';
import { DefensaError } from '../../src/lib/defensa/errores';
import { audioFalso, crearSttMock, crearTtsMock } from '../../src/lib/defensa/providers/mock';
import type { ProveedorStt, ProveedorTts } from '../../src/lib/defensa/providers/tipos';
import { textosPrevisibles } from '../../src/lib/defensa/turnEngine';
import { entregarTextoPegado } from '../../src/lib/defensa/servicios/entregas';
import type { SesionAlumno } from '../../src/lib/defensa/servicios/acceso';
import {
  cerrarPorInactividad,
  entregarDefensa,
  estadoDeUnaDefensa,
  iniciarDefensa,
  marcarTurno,
  obtenerEstadoSesion,
  registrarEstres,
  registrarSalida,
  resolverAclaracion,
  responderTurno,
  subirParteAudio,
  ultimaActividad,
} from '../../src/lib/defensa/servicios/defensas';
import { estadoDelPlan, prepararPlan } from '../../src/lib/defensa/servicios/planes';
import { generarReporteDeDefensa } from '../../src/lib/defensa/servicios/reportes';
import { TRABAJO } from '../support/fixtures';
import {
  comoSesion,
  crearActividadDePrueba,
  crearMundo,
  entrarComoAlumno,
  prepararAlumnoConPlan,
  type Mundo,
} from '../support/mundo';

const LARGA =
  'Elegí esa opción porque necesitaba llegar a más compañeros en pocos días y con entrevistas solo hubiera hablado con cinco personas esa semana';
const CORTA = 'Porque sí';

async function codigoDe(accion: () => Promise<unknown>): Promise<string> {
  try {
    await accion();
    return 'sin_error';
  } catch (error) {
    return error instanceof DefensaError ? error.codigo : `otro:${String(error)}`;
  }
}

async function silenciar<T>(accion: () => Promise<T>): Promise<T> {
  const original = console.error;
  console.error = () => undefined;
  try {
    return await accion();
  } finally {
    console.error = original;
  }
}

function escrito(texto: string, extra: Partial<PeticionResponder> = {}): PeticionResponder {
  return { modo: 'escrito', texto, duracionMs: 15_000, ...extra };
}

/** Responde por escrito hasta que la defensa deja de estar en curso. Devuelve el estado final. */
async function contestarTodo(
  mundo: Mundo,
  sesion: SesionAlumno,
  inicial: DefensaCliente,
  respuesta: string | ((numero: number) => string) = LARGA,
  msPorRespuesta = 0,
): Promise<DefensaCliente> {
  let defensa = inicial;
  for (let i = 0; i < 15 && defensa.estado === 'en_curso'; i += 1) {
    if (!defensa.pregunta) throw new Error('la defensa en curso no tiene pregunta');
    mundo.reloj.avanzar(msPorRespuesta);
    const texto = typeof respuesta === 'string' ? respuesta : respuesta(defensa.pregunta.numero);
    defensa = (await responderTurno(mundo.ctx, sesion, defensa.pregunta.turnoId, escrito(texto))).defensa;
  }
  return defensa;
}

async function refsDe(mundo: Mundo, defensaId: string): Promise<string[]> {
  return (await mundo.ctx.repo.turnosDeDefensa(defensaId)).map((t) => t.preguntaRef);
}

async function tiposDe(mundo: Mundo, defensaId: string): Promise<string[]> {
  return (await mundo.ctx.repo.turnosDeDefensa(defensaId)).map((t) => t.tipo);
}

async function mundoConPlan(parcial: Parameters<typeof crearMundo>[0] = {}) {
  const mundo = crearMundo(parcial);
  const actividad = await crearActividadDePrueba(mundo.ctx);
  const sesion = await prepararAlumnoConPlan(mundo, actividad);
  return { mundo, actividad, sesion };
}

/** Una voz que anota cada texto que le piden: así se sabe cuánto se crea de verdad. */
function ttsQueCuenta(falla = false) {
  const textos: string[] = [];
  const base = crearTtsMock();
  const tts: ProveedorTts = {
    id: 'cuenta',
    sintetizar: async (texto, opciones) => {
      textos.push(texto);
      if (falla) throw new Error('sin voz');
      return base.sintetizar(texto, opciones);
    },
  };
  return { textos, tts };
}

test.describe('la voz se crea solo para lo que se pregunta', () => {
  test('armar el plan no crea voz; al empezar solo se crea la de las preguntas ya elegidas', async () => {
    const voz = ttsQueCuenta();
    const { mundo, sesion } = await mundoConPlan({ proveedores: { tts: voz.tts } });
    expect(voz.textos).toEqual([]);

    const { defensa } = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    const plan = (await estadoDelPlan(mundo.ctx, sesion.alumno.id)).plan!;
    const fila = (await mundo.ctx.repo.defensaPorId(defensa.id))!;
    const elegidas = textosPrevisibles(plan.plan!, fila.semilla, []);

    // Apertura + una candidata por objetivo + transferencia: cinco de las unas veinte posibles.
    expect(new Set(voz.textos)).toEqual(new Set(elegidas));
    expect(voz.textos).toHaveLength(elegidas.length);
    expect(elegidas.length).toBeLessThanOrEqual(5);
    expect(defensa.pregunta!.audioUrl).toMatch(/^\/api\/defensa\/archivo-dev\?/);
    expect(Object.keys((await estadoDelPlan(mundo.ctx, sesion.alumno.id)).plan!.audios)).toHaveLength(elegidas.length);
  });

  test('una defensa sin seguimientos crea exactamente lo previsto y cada pregunta tiene su voz', async () => {
    const voz = ttsQueCuenta();
    const { mundo, sesion } = await mundoConPlan({ proveedores: { tts: voz.tts } });
    const { defensa } = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    const fila = (await mundo.ctx.repo.defensaPorId(defensa.id))!;
    const plan = (await estadoDelPlan(mundo.ctx, sesion.alumno.id)).plan!;
    const previstas = textosPrevisibles(plan.plan!, fila.semilla, []).length;

    const final = await contestarTodo(mundo, sesion, defensa, LARGA);
    expect(final.estado).toBe('por_revisar');
    const turnos = await mundo.ctx.repo.turnosDeDefensa(defensa.id);
    expect(turnos.map((t) => t.tipo)).not.toContain('seguimiento');
    for (const turno of turnos) expect(turno.audioPreguntaRuta, turno.preguntaRef).not.toBeNull();
    // Nada se creó de más: ni las candidatas que no salieron ni los seguimientos que no hicieron falta.
    expect(voz.textos).toHaveLength(previstas);
  });

  test('un seguimiento se crea solo cuando la respuesta lo pide, y una sola vez', async () => {
    const voz = ttsQueCuenta();
    const { mundo, sesion } = await mundoConPlan({ proveedores: { tts: voz.tts } });
    const { defensa } = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    const antes = voz.textos.length;

    await contestarTodo(mundo, sesion, defensa, (numero) => (numero === 2 ? CORTA : LARGA));
    const turnos = await mundo.ctx.repo.turnosDeDefensa(defensa.id);
    const seguimientos = turnos.filter((t) => t.tipo === 'seguimiento');
    expect(seguimientos).toHaveLength(1);
    expect(seguimientos[0]!.audioPreguntaRuta).not.toBeNull();
    // Solo se agregó el seguimiento que se hizo; el otro seguimiento de esa candidata nunca se creó.
    expect(voz.textos.length).toBe(antes + 1);
    expect(new Set(voz.textos).size).toBe(voz.textos.length);
  });

  test('ensayo y defensa de verdad no repiten la voz de lo que comparten', async () => {
    const voz = ttsQueCuenta();
    const { mundo, sesion } = await mundoConPlan({ proveedores: { tts: voz.tts } });
    await iniciarDefensa(mundo.ctx, sesion, { ensayo: true });
    await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    // La apertura es la misma en las dos: se crea una vez.
    expect(new Set(voz.textos).size).toBe(voz.textos.length);
  });

  test('si la voz falla, la defensa empieza igual: la pregunta siempre está escrita', async () => {
    const voz = ttsQueCuenta(true);
    const { mundo, sesion } = await mundoConPlan({ proveedores: { tts: voz.tts } });
    const { defensa } = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    expect(defensa.estado).toBe('en_curso');
    expect(defensa.pregunta!.pregunta).toMatch(/^¿.+\?$/);
    expect(defensa.pregunta!.audioUrl).toBeNull();
  });
});

test.describe('iniciar la defensa', () => {
  test('sin entrega o con el plan todavía generándose no se puede empezar', async () => {
    const mundo = crearMundo();
    const actividad = await crearActividadDePrueba(mundo.ctx);
    const sesion = comoSesion(await entrarComoAlumno(mundo.ctx, actividad));
    expect(await codigoDe(() => iniciarDefensa(mundo.ctx, sesion, { ensayo: false }))).toBe('sin_entrega');

    await entregarTextoPegado(mundo.ctx, sesion, TRABAJO);
    expect(await codigoDe(() => iniciarDefensa(mundo.ctx, sesion, { ensayo: false }))).toBe('plan_no_listo');
    await (await prepararPlan(mundo.ctx, sesion)).trabajo!();
    expect(await codigoDe(() => iniciarDefensa(mundo.ctx, sesion, { ensayo: false }))).toBe('sin_error');
  });

  test('empieza por la apertura, con la pregunta escrita y su audio, y retomarla devuelve lo mismo', async () => {
    const { mundo, sesion } = await mundoConPlan();
    const { defensa } = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });

    expect(defensa).toMatchObject({ esEnsayo: false, estado: 'en_curso', respondidas: 0, aclaracion: null, revision: null, entregadaEn: null });
    expect(defensa.pregunta).toMatchObject({ numero: 1, repeticiones: 0 });
    expect(defensa.pregunta!.pregunta).toMatch(/^¿.+\?$/);
    expect(defensa.pregunta!.audioUrl).toMatch(/^\/api\/defensa\/archivo-dev\?/);

    const otra = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    expect(otra.defensa.id).toBe(defensa.id);
    expect(otra.defensa.pregunta!.turnoId).toBe(defensa.pregunta!.turnoId);
    expect(await mundo.ctx.repo.turnosDeDefensa(defensa.id)).toHaveLength(1);
  });

  test('toques repetidos en "Empezar" no crean dos defensas', async () => {
    const { mundo, sesion } = await mundoConPlan();
    const resultados = await Promise.all([
      iniciarDefensa(mundo.ctx, sesion, { ensayo: false }).catch((e: unknown) => e),
      iniciarDefensa(mundo.ctx, sesion, { ensayo: false }).catch((e: unknown) => e),
    ]);
    const ids = new Set(resultados.flatMap((r) => (r instanceof Error ? [] : [(r as { defensa: DefensaCliente }).defensa.id])));
    expect(ids.size).toBe(1);
    expect((await mundo.ctx.repo.defensasDeAlumno(sesion.alumno.id)).filter((d) => !d.esEnsayo)).toHaveLength(1);
  });
});

test.describe('una defensa por escrito, de principio a fin', () => {
  test('modalidad corta con buenas respuestas: apertura, tres objetivos y transferencia', async () => {
    const { mundo, sesion } = await mundoConPlan();
    const inicio = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    const final = await contestarTodo(mundo, sesion, inicio.defensa);

    expect(await tiposDe(mundo, final.id)).toEqual(['apertura', 'candidata', 'candidata', 'candidata', 'transferencia']);
    expect(final).toMatchObject({ estado: 'por_revisar', respondidas: 5, pregunta: null, aclaracion: null });
    expect(final.revision).toHaveLength(5);
    expect(final.revision!.every((b) => b.modo === 'escrito' && b.porEscrito === LARGA && !b.lineas)).toBe(true);
    expect(final.revision!.map((b) => b.numero)).toEqual([1, 2, 3, 4, 5]);

    // Los tres objetivos, en el orden del profesor, y cada candidata del plan.
    const turnos = await mundo.ctx.repo.turnosDeDefensa(final.id);
    expect(turnos.filter((t) => t.tipo === 'candidata').map((t) => t.objetivoId)).toEqual(['O1', 'O2', 'O3']);
    expect(turnos.every((t) => t.estado === 'cerrado' && t.clase !== undefined)).toBe(true);
    expect(turnos[0]!.clase).toBeNull(); // la apertura no se evalúa
    expect(turnos.slice(1).every((t) => t.clase === 'solida' && t.claseFuente === 'modelo')).toBe(true);
  });

  test('respuestas vagas llevan a una repregunta, pero los turnos de la modalidad corta no se acaban', async () => {
    const { mundo, sesion } = await mundoConPlan();
    const inicio = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    const final = await contestarTodo(mundo, sesion, inicio.defensa, CORTA);
    expect(await tiposDe(mundo, final.id)).toEqual(['apertura', 'candidata', 'seguimiento', 'candidata', 'candidata', 'transferencia']);
    expect((await refsDe(mundo, final.id))[2]).toMatch(/^O1-[ab]:vaga$/);
    expect(final.estado).toBe('por_revisar');
  });

  test('"no sé" y el silencio no se insisten: pasa al siguiente objetivo', async () => {
    const { mundo, sesion } = await mundoConPlan();
    const inicio = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    const final = await contestarTodo(mundo, sesion, inicio.defensa, (n) => (n === 2 ? 'No sé' : n === 3 ? '' : LARGA));
    expect(await tiposDe(mundo, final.id)).toEqual(['apertura', 'candidata', 'candidata', 'candidata', 'transferencia']);
    const turnos = await mundo.ctx.repo.turnosDeDefensa(final.id);
    expect([turnos[1]!.clase, turnos[1]!.claseFuente]).toEqual(['sin_respuesta', 'regla']);
    expect(turnos[2]!.clase).toBe('sin_respuesta');
    // "No sé" es una respuesta y se ve; lo que quedó en blanco no aparece en la revisión del alumno.
    expect(final.revision!.map((b) => b.numero)).toEqual([1, 2, 4, 5]);
  });

  test('con poco tiempo salta a la transferencia y cierra; los silencios largos por una red caída no cuentan completos', async () => {
    const { mundo, sesion } = await mundoConPlan();
    const inicio = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    const final = await contestarTodo(mundo, sesion, inicio.defensa, LARGA, 100_000);
    expect(await tiposDe(mundo, final.id)).toEqual(['apertura', 'candidata', 'transferencia']);
    const defensa = (await mundo.ctx.repo.defensaPorId(final.id))!;
    expect(defensa.duracionActivaMs).toBe(300_000);

    // Una pausa de una hora entre pregunta y respuesta cuenta como mucho dos minutos y medio.
    const otra = await crearActividadDePrueba(mundo.ctx, { tokenGrupo: 'otrogrupo222' });
    const s2 = await prepararAlumnoConPlan(mundo, otra, { matricula: 'M-2' });
    const d2 = await iniciarDefensa(mundo.ctx, s2, { ensayo: false });
    mundo.reloj.avanzar(60 * 60 * 1000);
    await responderTurno(mundo.ctx, s2, d2.defensa.pregunta!.turnoId, escrito(LARGA));
    const turnos = await mundo.ctx.repo.turnosDeDefensa(d2.defensa.id);
    expect(turnos.length).toBe(2);
    const siguiente = await obtenerEstadoSesion(mundo.ctx, s2);
    expect(siguiente.defensa!.estado).toBe('en_curso');
  });

  test('en la modalidad larga una respuesta sólida se profundiza', async () => {
    const mundo = crearMundo();
    const actividad = await crearActividadDePrueba(mundo.ctx, { duracion: 'larga' });
    const sesion = await prepararAlumnoConPlan(mundo, actividad);
    const inicio = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    const final = await contestarTodo(mundo, sesion, inicio.defensa);
    const tipos = await tiposDe(mundo, final.id);
    expect(tipos.filter((t) => t === 'seguimiento')).toHaveLength(3);
    expect((await refsDe(mundo, final.id)).filter((r) => r.endsWith(':solida'))).toHaveLength(3);
  });

  test('el navegador nunca recibe el plan: ni evidencia, ni anclas, ni repreguntas', async () => {
    const { mundo, sesion } = await mundoConPlan();
    const inicio = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    const plan = (await mundo.ctx.repo.planDeEntrega((await mundo.ctx.repo.ultimaEntrega(sesion.alumno.id))!.id))!.plan!;
    const secretos = [
      plan.objectives[0]!.candidates[0]!.evidence,
      plan.objectives[0]!.candidates[0]!.anchor!,
      plan.objectives[1]!.candidates[1]!.followup_if_vague,
      plan.transfer[0]!.evidence,
      plan.work_summary,
      'followup_if',
      'evidence',
      'objective_id',
      'QUESTION_PLAN',
    ];
    const estados: unknown[] = [inicio, await obtenerEstadoSesion(mundo.ctx, sesion)];
    const final = await contestarTodo(mundo, sesion, inicio.defensa);
    estados.push(final, await obtenerEstadoSesion(mundo.ctx, sesion), await estadoDeUnaDefensa(mundo.ctx, sesion, final.id));
    for (const estado of estados) {
      const json = JSON.stringify(estado);
      for (const secreto of secretos) expect(json, secreto).not.toContain(secreto);
    }
  });

  test('entregar la defensa: queda entregada, pide el reporte una sola vez y luego la pregunta de estrés', async () => {
    const { mundo, sesion } = await mundoConPlan();
    const inicio = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    const final = await contestarTodo(mundo, sesion, inicio.defensa);

    expect(await codigoDe(() => registrarEstres(mundo.ctx, sesion, final.id, 2))).toBe('estado_invalido');
    const entrega = await entregarDefensa(mundo.ctx, sesion, final.id, []);
    expect(entrega.defensa).toMatchObject({ estado: 'entregada', entregadaEn: mundo.ctx.ahora().toISOString(), estresRespondido: false });
    expect(entrega.generarReporteDe).toBe(final.id);
    expect(entrega.resumenPractica).toBeUndefined();

    const repetida = await entregarDefensa(mundo.ctx, sesion, final.id, []);
    expect(repetida.generarReporteDe).toBeNull();

    expect(await codigoDe(() => registrarEstres(mundo.ctx, sesion, final.id, 7))).toBe('solicitud_invalida');
    expect(await codigoDe(() => registrarEstres(mundo.ctx, sesion, final.id, 1.5))).toBe('solicitud_invalida');
    await registrarEstres(mundo.ctx, sesion, final.id, 3);
    const guardada = (await mundo.ctx.repo.defensaPorId(final.id))!;
    expect([guardada.nivelEstres, guardada.estresEn]).toEqual([3, mundo.ctx.ahora().toISOString()]);
    expect((await obtenerEstadoSesion(mundo.ctx, sesion)).defensa).toMatchObject({ estado: 'entregada', estresRespondido: true });
  });

  test('una defensa de verdad se hace una vez por versión del trabajo', async () => {
    const { mundo, sesion } = await mundoConPlan();
    const inicio = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    const final = await contestarTodo(mundo, sesion, inicio.defensa);
    await entregarDefensa(mundo.ctx, sesion, final.id, []);

    const otra = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    expect(otra.defensa.id).toBe(final.id);
    expect(otra.defensa.estado).toBe('entregada');
    expect((await mundo.ctx.repo.defensasDeAlumno(sesion.alumno.id)).filter((d) => !d.esEnsayo)).toHaveLength(1);
  });
});

test.describe('el ensayo', () => {
  test('es privado, termina con un resumen para el alumno y no genera reporte', async () => {
    const { mundo, sesion, actividad } = await mundoConPlan();
    const inicio = await iniciarDefensa(mundo.ctx, sesion, { ensayo: true });
    expect(inicio.defensa.esEnsayo).toBe(true);
    // Todo lo que se pregunta sobre O2 lo contesta con poco: la pregunta (3), su repregunta (4) y la
    // transferencia (6), que según la semilla cae en O2 o en O3 y también cuenta como evidencia.
    const final = await contestarTodo(mundo, sesion, inicio.defensa, (n) => ([3, 4, 6].includes(n) ? CORTA : LARGA));
    const entrega = await entregarDefensa(mundo.ctx, sesion, final.id, []);

    expect(entrega.generarReporteDe).toBeNull();
    expect(entrega.resumenPractica).toEqual([
      { objetivoId: 'O1', texto: actividad.objetivos[0]!.text, resultado: 'explico' },
      { objetivoId: 'O2', texto: actividad.objetivos[1]!.text, resultado: 'dudo' },
      { objetivoId: 'O3', texto: actividad.objetivos[2]!.text, resultado: 'explico' },
    ]);
    // El profesor no ve la práctica: no aparece en su lista.
    const lista = await mundo.ctx.repo.listarAlumnosDeActividad(actividad.id);
    expect(lista[0]!.defensas).toEqual([]);
    expect((await mundo.ctx.repo.reporteDeDefensa(final.id))).toBeNull();
  });

  test('la defensa de verdad prefiere las preguntas que no salieron en el ensayo', async () => {
    for (let intento = 0; intento < 6; intento += 1) {
      const { mundo, sesion } = await mundoConPlan();
      const ensayo = await iniciarDefensa(mundo.ctx, sesion, { ensayo: true });
      const finEnsayo = await contestarTodo(mundo, sesion, ensayo.defensa);
      await entregarDefensa(mundo.ctx, sesion, finEnsayo.id, []);
      const real = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
      const finReal = await contestarTodo(mundo, sesion, real.defensa);

      const candidatas = async (id: string) =>
        (await mundo.ctx.repo.turnosDeDefensa(id)).filter((t) => t.tipo === 'candidata').map((t) => t.preguntaRef);
      const delEnsayo = await candidatas(finEnsayo.id);
      const delReal = await candidatas(finReal.id);
      expect(delEnsayo).toHaveLength(3);
      expect(delReal.filter((ref) => delEnsayo.includes(ref)), `ensayo ${delEnsayo} real ${delReal}`).toEqual([]);
    }
  });

  test('puede haber un ensayo y una defensa en curso a la vez', async () => {
    const { mundo, sesion } = await mundoConPlan();
    const ensayo = await iniciarDefensa(mundo.ctx, sesion, { ensayo: true });
    const real = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    expect(ensayo.defensa.id).not.toBe(real.defensa.id);
    const estado = await obtenerEstadoSesion(mundo.ctx, sesion);
    expect(estado.ensayo!.id).toBe(ensayo.defensa.id);
    expect(estado.defensa!.id).toBe(real.defensa.id);
  });
});

test.describe('respuestas por voz', () => {
  async function subir(mundo: Mundo, sesion: SesionAlumno, turnoId: string, partes: string[], intento = 0): Promise<void> {
    // El transcriptor falso lee el texto de la primera parte; las demás se agregan tal cual, como en un audio real.
    for (let i = 0; i < partes.length; i += 1) {
      const bytes = i === 0 ? audioFalso(partes[i]!) : new TextEncoder().encode(partes[i]!);
      await subirParteAudio(mundo.ctx, sesion, turnoId, { intento, parte: i, bytes });
    }
  }
  const voz = (total: number, extra: Partial<PeticionResponder> = {}): PeticionResponder => ({
    modo: 'voz',
    totalPartes: total,
    intento: 0,
    mime: 'audio/webm;codecs=opus',
    duracionMs: 20_000,
    ...extra,
  });

  test('las partes se juntan en orden y la apertura nunca se interrumpe con una aclaración', async () => {
    const { mundo, sesion } = await mundoConPlan();
    const { defensa } = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    const turnoId = defensa.pregunta!.turnoId;
    // El transcriptor falso lee el texto del primer fragmento; los demás se agregan tal cual.
    await subirParteAudio(mundo.ctx, sesion, turnoId, { intento: 0, parte: 0, bytes: audioFalso('Mi trabajo trata de ~~hábitos~~') });
    await subirParteAudio(mundo.ctx, sesion, turnoId, { intento: 0, parte: 1, bytes: new TextEncoder().encode(' de estudio en mi facultad.') });

    const siguiente = (await responderTurno(mundo.ctx, sesion, turnoId, voz(2))).defensa;
    expect(siguiente.aclaracion).toBeNull();
    expect(siguiente.pregunta!.numero).toBe(2);
    const apertura = (await mundo.ctx.repo.turnoPorId(turnoId))!;
    expect(apertura).toMatchObject({ modoRespuesta: 'voz', textoRespuesta: 'Mi trabajo trata de hábitos de estudio en mi facultad.', clase: null, audioMime: 'audio/webm;codecs=opus' });
    expect(apertura.audioRuta).toBe(`${defensa.id}/${turnoId}/respuesta.webm`);
    expect(mundo.estado.archivos.has(`audio/${apertura.audioRuta}`)).toBe(true);
    // Las partes sueltas ya no hacen falta.
    expect(Array.from(mundo.estado.archivos.keys()).filter((k) => k.endsWith('.parte'))).toEqual([]);
  });

  test('si faltan partes lo dice, no pierde nada y deja reenviar o escribir en el mismo turno', async () => {
    const { mundo, sesion } = await mundoConPlan();
    const { defensa } = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    const turnoId = defensa.pregunta!.turnoId;
    await subir(mundo, sesion, turnoId, ['Mi trabajo', ' trata de']);

    const error = await silenciar(() => responderTurno(mundo.ctx, sesion, turnoId, voz(4)).then(() => null, (e: unknown) => e));
    expect(error).toBeInstanceOf(DefensaError);
    expect((error as DefensaError).codigo).toBe('partes_faltantes');
    expect((error as DefensaError).detalle).toEqual({ faltan: [2, 3] });
    expect((await mundo.ctx.repo.turnoPorId(turnoId))!.estado).toBe('esperando');

    await subirParteAudio(mundo.ctx, sesion, turnoId, { intento: 0, parte: 2, bytes: new TextEncoder().encode(' hábitos') });
    await subirParteAudio(mundo.ctx, sesion, turnoId, { intento: 0, parte: 3, bytes: new TextEncoder().encode(' de estudio') });
    const r = await responderTurno(mundo.ctx, sesion, turnoId, voz(4));
    expect((await mundo.ctx.repo.turnoPorId(turnoId))!.textoRespuesta).toBe('Mi trabajo trata de hábitos de estudio');
    expect(r.defensa.pregunta!.numero).toBe(2);
  });

  test('los intentos de grabación no se mezclan aunque lleguen partes viejas tarde', async () => {
    const { mundo, sesion } = await mundoConPlan();
    const { defensa } = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    const turnoId = defensa.pregunta!.turnoId;
    await subir(mundo, sesion, turnoId, ['Primera grabación larguísima que se descarta', ' y más cosas viejas'], 0);
    await subir(mundo, sesion, turnoId, ['Segunda grabación buena'], 1);
    // Una parte vieja del intento 0 llega después de que ya empezó el 1.
    await subirParteAudio(mundo.ctx, sesion, turnoId, { intento: 0, parte: 2, bytes: new TextEncoder().encode(' ruido tardío') });

    await responderTurno(mundo.ctx, sesion, turnoId, voz(1, { intento: 1 }));
    expect((await mundo.ctx.repo.turnoPorId(turnoId))!.textoRespuesta).toBe('Segunda grabación buena');
  });

  test('sin ninguna parte (el micrófono falló) o con un transcriptor caído se puede escribir y no se pierde el turno', async () => {
    let cae = true;
    const stt: ProveedorStt = {
      id: 'inestable',
      async transcribir(audio, mime, opciones) {
        if (cae) throw new Error('proveedor caído, con datos privados');
        return crearSttMock(() => undefined).transcribir(audio, mime, opciones);
      },
    };
    const { mundo, sesion } = await mundoConPlan({ proveedores: { stt } });
    const { defensa } = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    const turnoId = defensa.pregunta!.turnoId;

    expect(await silenciar(() => codigoDe(() => responderTurno(mundo.ctx, sesion, turnoId, voz(0))))).toBe('transcripcion_fallo');

    await subir(mundo, sesion, turnoId, ['Mi trabajo trata de hábitos de estudio']);
    const error = await silenciar(() => responderTurno(mundo.ctx, sesion, turnoId, voz(1)).then(() => null, (e: unknown) => e));
    expect((error as DefensaError).codigo).toBe('transcripcion_fallo');
    expect((error as DefensaError).status).toBe(502);
    expect(JSON.stringify(error)).not.toContain('privados');
    const turno = (await mundo.ctx.repo.turnoPorId(turnoId))!;
    expect([turno.estado, turno.textoRespuesta]).toEqual(['esperando', null]);

    // Las partes siguen ahí: el reintento por voz funciona sin volver a grabar.
    cae = false;
    const r = await responderTurno(mundo.ctx, sesion, turnoId, voz(1));
    expect(r.defensa.pregunta!.numero).toBe(2);
  });

  test('una parte que se escapa del turno, de otro alumno o de otra fase se rechaza', async () => {
    const { mundo, sesion, actividad } = await mundoConPlan();
    const { defensa } = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    const turnoId = defensa.pregunta!.turnoId;
    const bytes = audioFalso('hola');

    expect(await codigoDe(() => subirParteAudio(mundo.ctx, sesion, turnoId, { intento: 100, parte: 0, bytes }))).toBe('solicitud_invalida');
    expect(await codigoDe(() => subirParteAudio(mundo.ctx, sesion, turnoId, { intento: 0, parte: 600, bytes }))).toBe('solicitud_invalida');
    expect(await codigoDe(() => subirParteAudio(mundo.ctx, sesion, turnoId, { intento: 0, parte: 0, bytes: new Uint8Array(0) }))).toBe('solicitud_invalida');
    expect(await codigoDe(() => subirParteAudio(mundo.ctx, sesion, turnoId, { intento: 0, parte: 0, bytes: new Uint8Array(513 * 1024) }))).toBe('demasiado_grande');

    const intruso = await entrarComoAlumno(mundo.ctx, actividad, { matricula: 'INTRUSO-1' });
    expect(await codigoDe(() => subirParteAudio(mundo.ctx, comoSesion(intruso), turnoId, { intento: 0, parte: 0, bytes }))).toBe('no_encontrado');
    expect(await codigoDe(() => responderTurno(mundo.ctx, comoSesion(intruso), turnoId, escrito('hola')))).toBe('no_encontrado');
    expect(await codigoDe(() => marcarTurno(mundo.ctx, comoSesion(intruso), turnoId, 'repeticion'))).toBe('no_encontrado');
  });

  test('"No te entendí esta parte": pregunta solo esa parte, pausa el reloj y la llena el alumno', async () => {
    const { mundo, sesion } = await mundoConPlan();
    const inicio = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    // La apertura se contesta por escrito; la primera pregunta evaluada, por voz.
    const { defensa } = await responderTurno(mundo.ctx, sesion, inicio.defensa.pregunta!.turnoId, escrito(LARGA));
    const turnoId = defensa.pregunta!.turnoId;
    await subirParteAudio(mundo.ctx, sesion, turnoId, { intento: 0, parte: 0, bytes: new Uint8Array([1, 2, 3, 4]) });

    mundo.reloj.avanzar(40_000);
    const paso = (await responderTurno(mundo.ctx, sesion, turnoId, voz(1))).defensa;
    expect(paso.pregunta).toBeNull();
    expect(paso.aclaracion).toMatchObject({ turnoId, numero: 2, antes: '…La muestra fue de', despues: 'porque solo tenía dos semanas…' });
    expect(paso.aclaracion!.audioUrl).toMatch(/archivo-dev/);
    expect(paso.aclaracion!.vozUrl).toMatch(/archivo-dev/);
    expect(paso.aclaracion!.hastaMs - paso.aclaracion!.desdeMs).toBeGreaterThan(800);
    const esperando = (await mundo.ctx.repo.turnoPorId(turnoId))!;
    expect(esperando).toMatchObject({ estado: 'aclarando', clase: 'solida' });
    expect(esperando.aclaracion).toMatchObject({ estado: 'pendiente', indiceInicio: 15, indiceFin: 16 });

    // Reabrir la pantalla mientras aclara devuelve la misma aclaración y no deja responder otra vez.
    expect((await obtenerEstadoSesion(mundo.ctx, sesion)).defensa!.aclaracion!.turnoId).toBe(turnoId);
    expect((await responderTurno(mundo.ctx, sesion, turnoId, voz(1))).defensa.aclaracion).not.toBeNull();

    // El alumno tarda 25 s en escribir lo que dijo: esa pausa no entra al reloj de la defensa.
    mundo.reloj.avanzar(25_000);
    const siguiente = (await resolverAclaracion(mundo.ctx, sesion, turnoId, { modo: 'escrito', texto: ' de treinta personas ' })).defensa;
    expect(siguiente.pregunta!.numero).toBe(3);

    const turno = (await mundo.ctx.repo.turnoPorId(turnoId))!;
    expect(turno.estado).toBe('cerrado');
    expect(turno.textoRespuesta).toBe('Elegí la encuesta porque llegaba a más compañeros en poco tiempo. La muestra fue de de treinta personas porque solo tenía dos semanas para terminar.');
    expect(turno.aclaracion).toMatchObject({ estado: 'aclarada', modo: 'escrito', texto: 'de treinta personas', duracionMs: 25_000 });
    expect(turno.transcripcion!.filter((p) => p.aclarada).map((p) => p.texto)).toEqual(['de', 'treinta', 'personas']);
    const guardada = (await mundo.ctx.repo.defensaPorId(defensa.id))!;
    expect(guardada.aclaracionMs).toBe(25_000);
    expect(relojDelTurno(turno)).toBe(40_000);
  });

  test('si el alumno no completa la parte, queda "no se entendió" y no se usa en su contra', async () => {
    for (const intento of [{ modo: 'escrito' as const, texto: '   ' }, { modo: 'escrito' as const }]) {
      const { mundo, sesion } = await mundoConPlan();
      const inicio = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
      const { defensa } = await responderTurno(mundo.ctx, sesion, inicio.defensa.pregunta!.turnoId, escrito(LARGA));
      const turnoId = defensa.pregunta!.turnoId;
      await subirParteAudio(mundo.ctx, sesion, turnoId, { intento: 0, parte: 0, bytes: new Uint8Array([9]) });
      await responderTurno(mundo.ctx, sesion, turnoId, voz(1));
      const r = await resolverAclaracion(mundo.ctx, sesion, turnoId, intento);
      expect(r.defensa.pregunta!.numero).toBe(3);
      const turno = (await mundo.ctx.repo.turnoPorId(turnoId))!;
      expect(turno.aclaracion).toMatchObject({ estado: 'no_entendido' });
      expect(turno.textoRespuesta).toContain('fue de [no se entendió] porque');
      expect(turno.transcripcion!.find((p) => p.noEntendida)).toBeTruthy();
    }
  });

  test('aclarar hablando: se transcribe solo ese pedazo; si sigue sin entenderse, queda sin entender', async () => {
    for (const [dicho, esperado] of [
      ['treinta y cinco personas', 'aclarada'],
      ['~~ruido~~ ~~raro~~ ~~otro~~', 'no_entendido'],
    ] as const) {
      const { mundo, sesion } = await mundoConPlan();
      const inicio = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
      const { defensa } = await responderTurno(mundo.ctx, sesion, inicio.defensa.pregunta!.turnoId, escrito(LARGA));
      const turnoId = defensa.pregunta!.turnoId;
      await subirParteAudio(mundo.ctx, sesion, turnoId, { intento: 0, parte: 0, bytes: new Uint8Array([9]) });
      await responderTurno(mundo.ctx, sesion, turnoId, voz(1));

      // Mientras aclara, las partes nuevas son del pedazo y no de la respuesta.
      await subirParteAudio(mundo.ctx, sesion, turnoId, { intento: 0, parte: 0, bytes: audioFalso(dicho) });
      const r = await resolverAclaracion(mundo.ctx, sesion, turnoId, { modo: 'voz', intento: 0, totalPartes: 1, mime: 'audio/webm' });
      expect(r.defensa.pregunta!.numero).toBe(3);
      const turno = (await mundo.ctx.repo.turnoPorId(turnoId))!;
      expect(turno.aclaracion!.estado).toBe(esperado);
      if (esperado === 'aclarada') expect(turno.textoRespuesta).toContain('fue de treinta y cinco personas porque');
      else expect(turno.textoRespuesta).toContain('fue de [no se entendió] porque');
      // La respuesta original sigue guardada, intacta, para que el profesor la oiga.
      expect(turno.audioRuta).toBe(`${defensa.id}/${turnoId}/respuesta.webm`);
    }
  });

  test('repetir la pregunta y los silencios se cuentan y viajan con la respuesta', async () => {
    const { mundo, sesion } = await mundoConPlan();
    const { defensa } = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    const turnoId = defensa.pregunta!.turnoId;
    await marcarTurno(mundo.ctx, sesion, turnoId, 'repeticion');
    await marcarTurno(mundo.ctx, sesion, turnoId, 'repeticion');
    await marcarTurno(mundo.ctx, sesion, turnoId, 'silencio');
    expect((await obtenerEstadoSesion(mundo.ctx, sesion)).defensa!.pregunta!.repeticiones).toBe(2);

    await responderTurno(mundo.ctx, sesion, turnoId, escrito(LARGA, { silencios: 5, repeticiones: 1 }));
    const turno = (await mundo.ctx.repo.turnoPorId(turnoId))!;
    // Gana el número mayor: lo que el servidor contó o lo que reporta el navegador.
    expect([turno.silencios, turno.repeticiones]).toEqual([5, 2]);
    const evento = mundo.estado.eventos.find((e) => e.client_event_id === `def:respuesta:${turnoId}`)!;
    expect(evento.result).toMatchObject({ silencios: 5, repeticiones: 2, modo: 'escrito' });
    // Ya cerrado el turno, marcar no hace nada.
    await marcarTurno(mundo.ctx, sesion, turnoId, 'repeticion');
    expect((await mundo.ctx.repo.turnoPorId(turnoId))!.repeticiones).toBe(2);
  });
});

function relojDelTurno(turno: { preguntadoEn: string; respondidoEn: string | null }): number {
  return Date.parse(turno.respondidoEn!) - Date.parse(turno.preguntadoEn);
}

test.describe('reintentos, simultaneidad y cambios de versión', () => {
  test('responder dos veces la misma pregunta no avanza dos turnos ni repite eventos', async () => {
    const { mundo, sesion } = await mundoConPlan();
    const { defensa } = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    const turnoId = defensa.pregunta!.turnoId;
    const primera = await responderTurno(mundo.ctx, sesion, turnoId, escrito(LARGA));
    const eventos = mundo.estado.eventos.length;
    const segunda = await responderTurno(mundo.ctx, sesion, turnoId, escrito('otra cosa distinta que no debe guardarse'));

    expect(segunda.defensa.pregunta!.turnoId).toBe(primera.defensa.pregunta!.turnoId);
    expect((await mundo.ctx.repo.turnoPorId(turnoId))!.textoRespuesta).toBe(LARGA);
    expect(await mundo.ctx.repo.turnosDeDefensa(defensa.id)).toHaveLength(2);
    expect(mundo.estado.eventos.length).toBe(eventos);
  });

  test('un turno que otra solicitud está procesando responde "ocupado", y se retoma si se quedó atascado', async () => {
    const { mundo, sesion } = await mundoConPlan();
    const { defensa } = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    const turnoId = defensa.pregunta!.turnoId;
    await mundo.ctx.repo.actualizarTurno(turnoId, { estado: 'procesando', respondidoEn: mundo.ctx.ahora().toISOString() });

    const error = await responderTurno(mundo.ctx, sesion, turnoId, escrito(LARGA)).then(() => null, (e: unknown) => e);
    expect((error as DefensaError).codigo).toBe('ocupado');
    expect((error as DefensaError).status).toBe(409);
    expect((await mundo.ctx.repo.turnoPorId(turnoId))!.estado).toBe('procesando');

    mundo.reloj.avanzar(2 * 60 * 1000);
    const r = await responderTurno(mundo.ctx, sesion, turnoId, escrito(LARGA));
    expect(r.defensa.pregunta!.numero).toBe(2);
  });

  test('subir una versión nueva a media defensa cierra la anterior y pide un plan nuevo', async () => {
    const { mundo, sesion, actividad } = await mundoConPlan();
    const { defensa } = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    await responderTurno(mundo.ctx, sesion, defensa.pregunta!.turnoId, escrito(LARGA));

    await entregarTextoPegado(mundo.ctx, sesion, `${TRABAJO} Versión corregida con un párrafo nuevo.`);
    const vieja = (await mundo.ctx.repo.defensaPorId(defensa.id))!;
    expect(vieja.estado).toBe('abandonada');
    expect(mundo.estado.eventos.find((e) => e.client_event_id === `def:abandono:${defensa.id}`)!.result).toMatchObject({ motivo: 'sustituida', respondidas: 1 });

    const estado = await obtenerEstadoSesion(mundo.ctx, sesion);
    expect(estado.entrega!.version).toBe(2);
    expect(estado.plan).toBe('generando');
    expect(estado.defensa).toBeNull();
    expect(await codigoDe(() => iniciarDefensa(mundo.ctx, sesion, { ensayo: false }))).toBe('plan_no_listo');

    await (await prepararPlan(mundo.ctx, sesion)).trabajo!();
    const nueva = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    expect(nueva.defensa.id).not.toBe(defensa.id);
    expect(actividad.id).toBeTruthy();
  });

  test('una versión rechazada no estorba: la defensa sigue sobre la última versión buena', async () => {
    const { mundo, sesion } = await mundoConPlan();
    const { defensa } = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    await silenciar(() => entregarTextoPegado(mundo.ctx, sesion, 'Muy corto').catch(() => undefined));
    const estado = await obtenerEstadoSesion(mundo.ctx, sesion);
    expect(estado.entrega!.version).toBe(1);
    expect(estado.defensa!.id).toBe(defensa.id);
  });

  test('salir de la defensa se mide, pero se puede retomar en el mismo turno, incluso en otro dispositivo', async () => {
    const { mundo, sesion, actividad } = await mundoConPlan();
    const { defensa } = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    await responderTurno(mundo.ctx, sesion, defensa.pregunta!.turnoId, escrito(LARGA));
    const antes = (await obtenerEstadoSesion(mundo.ctx, sesion)).defensa!;
    await registrarSalida(mundo.ctx, sesion, defensa.id);

    const eventoSalida = mundo.estado.eventos.find((e) => String(e.result && (e.result as { motivo?: string }).motivo) === 'salio');
    expect(eventoSalida!.verbo).toBe('abandono_taller');

    // Otro teléfono: entra con la misma matrícula y encuentra la misma pregunta.
    const otroTelefono = comoSesion(await entrarComoAlumno(mundo.ctx, actividad));
    const despues = (await obtenerEstadoSesion(mundo.ctx, otroTelefono)).defensa!;
    expect(despues.pregunta!.turnoId).toBe(antes.pregunta!.turnoId);
    expect(despues.respondidas).toBe(1);
  });
});

test.describe('revisión del alumno y entrega con marcas', () => {
  test('la respuesta hablada se ve línea por línea y solo cuentan las marcas de líneas que existen', async () => {
    const { mundo, sesion } = await mundoConPlan({ proveedores: { stt: crearSttMock(() => 'Elegí la encuesta porque llegaba a más compañeros. Con entrevistas solo hubiera hablado con cinco personas.') } });
    const inicio = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    let defensa = inicio.defensa;
    while (defensa.estado === 'en_curso') {
      const turnoId = defensa.pregunta!.turnoId;
      await subirParteAudio(mundo.ctx, sesion, turnoId, { intento: 0, parte: 0, bytes: new Uint8Array([7]) });
      defensa = (await responderTurno(mundo.ctx, sesion, turnoId, { modo: 'voz', intento: 0, totalPartes: 1, mime: 'audio/mp4', duracionMs: 9000 })).defensa;
    }
    expect(defensa.estado).toBe('por_revisar');
    const bloque = defensa.revision![1]!;
    expect(bloque.lineas!.map((l) => l.segmentos.map((s) => s.texto).join(''))).toEqual([
      'Elegí la encuesta porque llegaba a más compañeros.',
      'Con entrevistas solo hubiera hablado con cinco personas.',
    ]);
    expect(bloque.lineas!.every((l) => !l.marcada && !l.aclarada)).toBe(true);

    const lineaReal = `${bloque.turnoId}:1`;
    const entrega = await entregarDefensa(mundo.ctx, sesion, defensa.id, [
      { turnoId: bloque.turnoId, linea: lineaReal },
      { turnoId: bloque.turnoId, linea: lineaReal },
      { turnoId: bloque.turnoId, linea: `${bloque.turnoId}:99` },
      { turnoId: 'otro-turno', linea: 'otro-turno:0' },
    ]);
    const marcadas = entrega.defensa.revision!.flatMap((b) => (b.lineas ?? []).filter((l) => l.marcada).map((l) => l.id));
    expect(marcadas).toEqual([lineaReal]);
    expect((await mundo.ctx.repo.defensaPorId(defensa.id))!.marcasRevision).toEqual([{ turnoId: bloque.turnoId, linea: lineaReal }]);
  });
});

test.describe('el reporte', () => {
  async function defensaEntregada(mundo: Mundo, sesion: SesionAlumno) {
    const inicio = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    const final = await contestarTodo(mundo, sesion, inicio.defensa);
    await entregarDefensa(mundo.ctx, sesion, final.id, []);
    return final.id;
  }

  test('se genera una vez, con niveles por objetivo y citas que aparecen tal cual en lo que dijo el alumno', async () => {
    const { mundo, sesion, actividad } = await mundoConPlan();
    const id = await defensaEntregada(mundo, sesion);
    await generarReporteDeDefensa(mundo.ctx, id);

    const fila = (await mundo.ctx.repo.reporteDeDefensa(id))!;
    expect(fila).toMatchObject({ estado: 'listo', proveedor: 'mock', promptVersion: 'reporte-2026-10-v1', citasDescartadas: 0 });
    expect(fila.reporte!.objetivos.map((o) => o.objetivoId)).toEqual(actividad.objetivos.map((o) => o.id));
    for (const objetivo of fila.reporte!.objetivos) {
      expect(objetivo.nivel).toBe('explico');
      expect(objetivo.citas.length).toBeGreaterThan(0);
      for (const cita of objetivo.citas) expect(LARGA).toContain(cita.texto);
    }
    // No se rehace.
    await generarReporteDeDefensa(mundo.ctx, id);
    expect((await mundo.ctx.repo.reporteDeDefensa(id))!.id).toBe(fila.id);
  });

  test('si el modelo falla el reporte queda en error y la defensa no se toca', async () => {
    const llm = {
      id: 'roto',
      async generarJson(solicitud: { tarea: string }) {
        if (solicitud.tarea === 'reporte') throw new Error('caído');
        return crearLlmMockLocal().generarJson(solicitud as never);
      },
    };
    const { mundo, sesion } = await mundoConPlan({ proveedores: { llm: llm as never } });
    const id = await defensaEntregada(mundo, sesion);
    await silenciar(() => generarReporteDeDefensa(mundo.ctx, id));
    const fila = (await mundo.ctx.repo.reporteDeDefensa(id))!;
    expect([fila.estado, fila.reporte]).toEqual(['error', null]);
    expect((await mundo.ctx.repo.defensaPorId(id))!.estado).toBe('entregada');
  });

  test('un ensayo, o una defensa sin entregar, no genera reporte', async () => {
    const { mundo, sesion } = await mundoConPlan();
    const ensayo = await iniciarDefensa(mundo.ctx, sesion, { ensayo: true });
    const finEnsayo = await contestarTodo(mundo, sesion, ensayo.defensa);
    await entregarDefensa(mundo.ctx, sesion, finEnsayo.id, []);
    await generarReporteDeDefensa(mundo.ctx, finEnsayo.id);
    expect(await mundo.ctx.repo.reporteDeDefensa(finEnsayo.id)).toBeNull();

    const real = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    await generarReporteDeDefensa(mundo.ctx, real.defensa.id);
    expect(await mundo.ctx.repo.reporteDeDefensa(real.defensa.id)).toBeNull();
  });
});

test.describe('abandono por inactividad', () => {
  test('con respuestas queda incompleta; sin ninguna, abandonada; y la última actividad se calcula bien', async () => {
    const { mundo, sesion } = await mundoConPlan();
    const { defensa } = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    await responderTurno(mundo.ctx, sesion, defensa.pregunta!.turnoId, escrito(LARGA));
    mundo.reloj.avanzar(26 * 60 * 60 * 1000);
    const fila = (await mundo.ctx.repo.defensaPorId(defensa.id))!;
    const turnos = await mundo.ctx.repo.turnosDeDefensa(defensa.id);
    expect(ultimaActividad(fila, turnos)).toBe(Math.max(...turnos.map((t) => Date.parse(t.respondidoEn ?? t.preguntadoEn)), Date.parse(fila.iniciadaEn)));

    const cerrada = await cerrarPorInactividad(mundo.ctx, fila);
    expect(cerrada).toMatchObject({ estado: 'incompleta' });
    expect(cerrada.terminadaEn).toBe(mundo.ctx.ahora().toISOString());
    const evento = mundo.estado.eventos.find((e) => e.client_event_id === `def:abandono:${defensa.id}:inactividad`)!;
    expect(evento.result).toMatchObject({ motivo: 'inactividad', respondidas: 1, estado: 'incompleta' });

    const otra = await crearActividadDePrueba(mundo.ctx, { tokenGrupo: 'otrogrupo333' });
    const s2 = await prepararAlumnoConPlan(mundo, otra, { matricula: 'M-3' });
    const d2 = await iniciarDefensa(mundo.ctx, s2, { ensayo: false });
    const c2 = await cerrarPorInactividad(mundo.ctx, (await mundo.ctx.repo.defensaPorId(d2.defensa.id))!);
    expect(c2.estado).toBe('abandonada');
    // Una defensa abandonada deja empezar otra.
    const nueva = await iniciarDefensa(mundo.ctx, s2, { ensayo: false });
    expect(nueva.defensa.id).not.toBe(d2.defensa.id);
  });
});

test.describe('eventos de la defensa', () => {
  test('mismos seis verbos, solo medidas e ids, sin texto, y marcados como del servidor', async () => {
    const { mundo, sesion, actividad } = await mundoConPlan();
    const ensayo = await iniciarDefensa(mundo.ctx, sesion, { ensayo: true });
    await entregarDefensa(mundo.ctx, sesion, (await contestarTodo(mundo, sesion, ensayo.defensa)).id, []);
    const real = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    const turnoAclaracion = real.defensa.pregunta!.turnoId;
    await responderTurno(mundo.ctx, sesion, turnoAclaracion, escrito(LARGA));
    const fin = await contestarTodo(mundo, sesion, (await obtenerEstadoSesion(mundo.ctx, sesion)).defensa!);
    await entregarDefensa(mundo.ctx, sesion, fin.id, []);
    await registrarEstres(mundo.ctx, sesion, fin.id, 1);
    await generarReporteDeDefensa(mundo.ctx, fin.id);

    const eventos = mundo.estado.eventos;
    expect(eventos.length).toBeGreaterThan(20);
    const verbosPermitidos = ['inicio_taller', 'envio_respuesta', 'solicito_pista', 'completo_paso', 'taller_completado', 'abandono_taller'];
    for (const e of eventos) {
      expect(verbosPermitidos, e.client_event_id).toContain(e.verbo);
      expect(e.taller_id).toBe(`defensa:${actividad.id}`);
      expect(e.student_alias).toBeNull();
      expect(e.class_token).toBeNull();
      expect(e.client_event_id.startsWith('def:')).toBe(true);
      const json = JSON.stringify(e);
      expect(json).not.toContain(LARGA);
      expect(json).not.toContain('Ana Torres');
      expect(json).not.toContain('20231457');
      expect(json).not.toContain('Elegí una encuesta');
    }
    const por = (nombre: string) => eventos.filter((e) => (e.result as { evento?: string }).evento === nombre);
    expect(por('sesion')).toHaveLength(1);
    expect(por('entrega')).toHaveLength(1);
    expect(por('plan')).toHaveLength(1);
    expect(por('defensa_inicio').map((e) => (e.result as { esEnsayo: boolean }).esEnsayo)).toEqual([true, false]);
    expect(por('defensa_fin')).toHaveLength(2);
    expect(por('estres')[0]!.result).toMatchObject({ nivel: 1, esEnsayo: false });
    expect(por('reporte')[0]!.result).toMatchObject({ estado: 'listo', explico: 3 });

    // Cada pregunta lleva su semilla; cada respuesta, su duración y sus conteos.
    const preguntas = por('pregunta');
    expect(preguntas.length).toBe(10);
    for (const e of preguntas) expect(e.result).toMatchObject({ semilla: expect.any(Number), numero: expect.any(Number), ref: expect.any(String) });
    const semillas = new Set(preguntas.filter((e) => (e.result as { esEnsayo: boolean }).esEnsayo === false).map((e) => (e.result as { semilla: number }).semilla));
    expect(semillas.size).toBe(1);
    for (const e of por('respuesta')) {
      expect(e.verbo).toBe('envio_respuesta');
      expect(e.result).toMatchObject({ duracionRespuestaMs: 15_000, silencios: 0, repeticiones: 0, modo: 'escrito' });
      expect(['defensa', 'practica']).toContain((e.result as { fase: string }).fase);
    }
    expect(por('defensa_fin').every((e) => e.verbo === 'taller_completado')).toBe(true);
    expect(por('defensa_inicio').every((e) => e.verbo === 'inicio_taller')).toBe(true);
  });
});

function crearLlmMockLocal() {
  // Importado aquí para no abrir el archivo de proveedores falsos hasta que haga falta.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('../../src/lib/defensa/providers/mock') as typeof import('../../src/lib/defensa/providers/mock')).crearLlmMock();
}

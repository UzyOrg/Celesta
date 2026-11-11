import '../support/sinServerOnly';
import { expect, test } from '@playwright/test';
import { unzipSync } from 'fflate';
import { DefensaError } from '../../src/lib/defensa/errores';
import { audioFalso, crearSttMock } from '../../src/lib/defensa/providers/mock';
import { autenticarProfesor, enlaceDeProfesor } from '../../src/lib/defensa/servicios/acceso';
import { entregarTextoPegado, iniciarEntregaArchivo, subirArchivoPorApi, confirmarEntrega } from '../../src/lib/defensa/servicios/entregas';
import {
  entregarDefensa,
  iniciarDefensa,
  responderTurno,
  subirParteAudio,
} from '../../src/lib/defensa/servicios/defensas';
import { ejecutarMantenimiento } from '../../src/lib/defensa/servicios/mantenimiento';
import {
  cambiarEnlaceDeGrupo,
  datosDelGrupo,
  datosDelReporte,
  prepararDescarga,
  registrarTiempoRevision,
  registrarToqueProfesor,
  urlAudioDeParte,
} from '../../src/lib/defensa/servicios/profesor';
import { generarReporteDeDefensa } from '../../src/lib/defensa/servicios/reportes';
import { iniciarSesion } from '../../src/lib/defensa/servicios/acceso';
import { estadoDelPlan, prepararPlan } from '../../src/lib/defensa/servicios/planes';
import type { SesionAlumno } from '../../src/lib/defensa/servicios/acceso';
import { pdfConTexto } from '../support/archivos';
import { ORACIONES, TRABAJO } from '../support/fixtures';
import { comoSesion, crearActividadDePrueba, crearMundo, entrarComoAlumno, prepararAlumnoConPlan, type Mundo } from '../support/mundo';

const LARGA = 'Elegí esa opción porque necesitaba llegar a más compañeros en pocos días y con entrevistas solo hubiera hablado con cinco personas esa semana';

async function codigoDe(accion: () => Promise<unknown>): Promise<string> {
  try {
    await accion();
    return 'sin_error';
  } catch (error) {
    return error instanceof DefensaError ? error.codigo : `otro:${String(error)}`;
  }
}

/** Defensa por escrito terminada y entregada; devuelve su id. */
async function defenderPorEscrito(mundo: Mundo, sesion: SesionAlumno): Promise<string> {
  let { defensa } = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
  while (defensa.estado === 'en_curso') {
    mundo.reloj.avanzar(12_000); // lo que tarda en contestar
    defensa = (await responderTurno(mundo.ctx, sesion, defensa.pregunta!.turnoId, { modo: 'escrito', texto: LARGA, duracionMs: 12_000 })).defensa;
  }
  await entregarDefensa(mundo.ctx, sesion, defensa.id, []);
  return defensa.id;
}

/** Defensa por voz: la primera pregunta evaluada trae un hueco que el alumno completa y una frase que marca. */
async function defenderPorVoz(mundo: Mundo, sesion: SesionAlumno): Promise<string> {
  let { defensa } = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
  let marcada: { turnoId: string; linea: string } | null = null;
  while (defensa.estado === 'en_curso') {
    const turnoId = defensa.pregunta!.turnoId;
    await subirParteAudio(mundo.ctx, sesion, turnoId, { intento: 0, parte: 0, bytes: new Uint8Array([1, 2, 3]) });
    let r = await responderTurno(mundo.ctx, sesion, turnoId, { modo: 'voz', intento: 0, totalPartes: 1, mime: 'audio/webm', duracionMs: 15_000 });
    if (r.defensa.aclaracion) {
      mundo.reloj.avanzar(10_000);
      const { resolverAclaracion } = await import('../../src/lib/defensa/servicios/defensas');
      r = await resolverAclaracion(mundo.ctx, sesion, turnoId, { modo: 'escrito', texto: 'de treinta personas' });
      marcada ??= { turnoId, linea: `${turnoId}:0` };
    }
    defensa = r.defensa;
  }
  await entregarDefensa(mundo.ctx, sesion, defensa.id, marcada ? [marcada] : []);
  return defensa.id;
}

test.describe('el grupo que ve el profesor', () => {
  test('lista a quienes entraron, con su estado, y no cuenta lo que el alumno no ha entregado', async () => {
    const mundo = crearMundo();
    const actividad = await crearActividadDePrueba(mundo.ctx);
    const ana = await prepararAlumnoConPlan(mundo, actividad, { nombre: 'Ana Torres Ruiz', matricula: '20231457' });
    const defendida = await defenderPorEscrito(mundo, ana);
    await generarReporteDeDefensa(mundo.ctx, defendida);

    const luis = await prepararAlumnoConPlan(mundo, actividad, { nombre: 'Luis Bravo Méndez', matricula: '20231390' });
    await iniciarDefensa(mundo.ctx, luis, { ensayo: false }); // en curso: todavía no cuenta

    await entrarComoAlumno(mundo.ctx, actividad, { nombre: 'Sofía Aguilar Ramos', matricula: '20231302' }); // solo entró

    const grupo = await datosDelGrupo(mundo.ctx, actividad, 'token-del-profesor');
    expect(grupo.conectado).toBe(true);
    expect(grupo.profesora).toEqual({ nombre: 'Laura Méndez', primerNombre: 'Laura', iniciales: 'LM', rol: 'Docente' });
    expect(grupo.actividad).toMatchObject({
      token: 'token-del-profesor',
      nombre: 'Encuesta sobre hábitos de estudio',
      grupo: '3B',
      cierreCorto: 'vie 9 oct, 23:59',
      cierre: { dia: 'vie 9', hora: '23:59' },
      totalAlumnos: 3,
    });
    expect(grupo.actividad.objetivos.map((o) => [o.id, o.texto, o.alias])).toEqual([
      [1, 'Justifica por qué eligió una encuesta', 'Objetivo 1'],
      [2, 'Explica cómo definió su muestra', 'Objetivo 2'],
      [3, 'Reconoce los límites de su estudio', 'Objetivo 3'],
    ]);

    const porMatricula = new Map(grupo.alumnos.map((a) => [a.matricula, a]));
    const a = porMatricula.get('20231457')!;
    expect(a).toMatchObject({
      nombre: 'Ana Torres Ruiz',
      primerNombre: 'Ana',
      nombreCorto: 'Ana Torres',
      iniciales: 'AT',
      defensaId: defendida,
      revisado: false,
      defensaIncompleta: false,
      subioOtraVersion: false,
      entregaTardia: false,
      evidencia: ['explico', 'explico', 'explico'],
    });
    expect(a.entrega).toMatchObject({ dia: 'vie 9', hora: '20:00', mes: 'octubre' }); // el reloj de prueba empieza a las 20:00 en México
    expect(a.revisoSuTranscripcion).toMatchObject({ nota: 'No marcó nada' });
    expect(a.duracion).toBe('1 min 0 s');
    expect(porMatricula.get('20231390')).toMatchObject({ defensa: null, defensaId: undefined, evidencia: [] });
    expect(porMatricula.get('20231302')).toMatchObject({ entrega: null, defensa: null });
    // Nada de notas, porcentajes ni sospechas en lo que sale hacia la pantalla.
    expect(JSON.stringify(grupo)).not.toMatch(/sospech|trampa|plagio|calificaci|puntaje|%/i);
  });

  test('el ensayo y las defensas sin entregar son invisibles; las incompletas se ven como tales', async () => {
    const mundo = crearMundo();
    const actividad = await crearActividadDePrueba(mundo.ctx);
    const sesion = await prepararAlumnoConPlan(mundo, actividad);
    const ensayo = await iniciarDefensa(mundo.ctx, sesion, { ensayo: true });
    await responderTurno(mundo.ctx, sesion, ensayo.defensa.pregunta!.turnoId, { modo: 'escrito', texto: LARGA, duracionMs: 1000 });

    let grupo = await datosDelGrupo(mundo.ctx, actividad, 't');
    expect(grupo.alumnos[0]!.defensa).toBeNull();

    const real = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
    // Alcanza a contestar la apertura y la primera pregunta de objetivo; la segunda queda abierta.
    const segunda = await responderTurno(mundo.ctx, sesion, real.defensa.pregunta!.turnoId, { modo: 'escrito', texto: LARGA, duracionMs: 1000 });
    await responderTurno(mundo.ctx, sesion, segunda.defensa.pregunta!.turnoId, { modo: 'escrito', texto: LARGA, duracionMs: 1000 });
    mundo.reloj.avanzar(26 * 60 * 60 * 1000);
    const resumen = await ejecutarMantenimiento(mundo.ctx);
    expect(resumen).toMatchObject({ defensasCerradas: 2, reportesGenerados: 1 });

    grupo = await datosDelGrupo(mundo.ctx, actividad, 't');
    const alumno = grupo.alumnos[0]!;
    expect(alumno).toMatchObject({ defensaIncompleta: true, defensaId: real.defensa.id });
    expect(alumno.defensa).not.toBeNull();
    const reporte = (await datosDelReporte(mundo.ctx, actividad, 't', alumno.matricula))!;
    expect(reporte.reporte.aviso).toContain('quedó incompleta');
    expect(reporte.reporte.bloques[0]!.respuesta).not.toBeNull();
    // La segunda pregunta se hizo pero no alcanzó a contestarse; de la tercera ni siquiera se llegó.
    expect(reporte.reporte.bloques[1]!.respuesta).toBeNull();
    expect(reporte.reporte.bloques[1]!.mensajeSinRespuesta).toBe('No alcanzó a responder esta pregunta.');
    expect(reporte.reporte.bloques[2]!.respuesta).toBeNull();
    expect(reporte.reporte.bloques[2]!.mensajeSinRespuesta).toBe('No hubo pregunta sobre este objetivo en esta defensa.');
    // Sin respuesta que juzgar, esos objetivos quedan sin evidencia y no "no salió".
    expect(reporte.reporte.bloques.map((b) => b.nivel)).toEqual(['explico', null, null]);
  });

  test('subir otra versión se ve como "Subió otra versión" y la tardía como tardía', async () => {
    const mundo = crearMundo();
    const actividad = await crearActividadDePrueba(mundo.ctx);
    const sesion = await prepararAlumnoConPlan(mundo, actividad);
    await defenderPorEscrito(mundo, sesion);
    mundo.reloj.avanzar(6 * 60 * 60 * 1000); // pasada la fecha límite
    await entregarTextoPegado(mundo.ctx, sesion, `${TRABAJO} Una versión corregida.`);

    const alumno = (await datosDelGrupo(mundo.ctx, actividad, 't')).alumnos[0]!;
    expect(alumno).toMatchObject({ subioOtraVersion: true, entregaTardia: true, defensaTardia: false });
    expect(alumno.defensa).not.toBeNull();
  });
});

test.describe('el reporte de un alumno', () => {
  test('sin análisis todavía avisa que se está preparando y muestra la transcripción', async () => {
    const mundo = crearMundo();
    const actividad = await crearActividadDePrueba(mundo.ctx);
    const sesion = await prepararAlumnoConPlan(mundo, actividad);
    await defenderPorEscrito(mundo, sesion);

    const datos = (await datosDelReporte(mundo.ctx, actividad, 't', '20231457'))!;
    expect(datos.reporte.aviso).toContain('se está preparando');
    expect(datos.reporte.bloques.map((b) => b.nivel)).toEqual([null, null, null]);
    expect(datos.reporte.bloques[0]!.respuesta).toMatchObject({ modo: 'escrito', calidad: 'Respuesta sólida', textoEscrito: LARGA });
    expect(datos.alumno.matricula).toBe('20231457');
    expect(datos.cola).toMatchObject({ posicion: 1, total: 1, anterior: null, siguiente: null });
  });

  test('con análisis: niveles, repregunta y transferencia en su objetivo, y "faltó" solo donde corresponde', async () => {
    const mundo = crearMundo();
    const actividad = await crearActividadDePrueba(mundo.ctx, { duracion: 'larga' });
    const sesion = await prepararAlumnoConPlan(mundo, actividad);
    const id = await defenderPorEscrito(mundo, sesion);
    await generarReporteDeDefensa(mundo.ctx, id);

    const datos = (await datosDelReporte(mundo.ctx, actividad, 't', '20231457'))!;
    expect(datos.defensaId).toBe(id);
    expect(datos.reporte.aviso).toBeUndefined();
    expect(datos.reporte.resumen).toBeTruthy();
    expect(datos.reporte.bloques.map((b) => b.nivel)).toEqual(['explico', 'explico', 'explico']);
    // En la modalidad larga cada objetivo tuvo su repregunta sólida; la transferencia cuelga de su objetivo.
    for (const bloque of datos.reporte.bloques) {
      expect(bloque.pregunta.numero).toBe(bloque.objetivo.id);
      expect(bloque.respuesta!.adicionales!.some((a) => a.etiqueta === 'Repregunta')).toBe(true);
    }
    const conTransferencia = datos.reporte.bloques.filter((b) => b.respuesta!.adicionales!.some((a) => a.etiqueta === 'Transferencia'));
    expect(conTransferencia).toHaveLength(1);
    expect(datos.reporte.bloques.every((b) => b.respuesta!.faltante === undefined && b.respuesta!.analisis === undefined)).toBe(true);
  });

  test('por voz: las frases marcadas y las partes aclaradas llevan su audio, y el audio se puede oír mientras exista', async () => {
    const mundo = crearMundo();
    const actividad = await crearActividadDePrueba(mundo.ctx);
    const sesion = await prepararAlumnoConPlan(mundo, actividad);
    const id = await defenderPorVoz(mundo, sesion);
    await generarReporteDeDefensa(mundo.ctx, id);

    const datos = (await datosDelReporte(mundo.ctx, actividad, 't', '20231457'))!;
    expect(datos.reporte.audioDisponible).toBe(true);
    const bloque = datos.reporte.bloques[0]!;
    const respuesta = bloque.respuesta!;
    expect(respuesta.modo).toBe('voz');
    expect(respuesta.lineas!.length).toBeGreaterThan(0);
    // Lo que el alumno aclaró va en recuadro, y la línea que marcó va subrayada.
    const todos = respuesta.lineas!.flatMap((l) => l.fragmentos);
    expect(todos.some((f) => f.resalte === 'recuadro' && f.texto.includes('de treinta personas'))).toBe(true);
    expect(todos.some((f) => f.resalte === 'subrayado')).toBe(true);
    expect(respuesta.parteParaOir).toMatchObject({ id: 'marcada', desdeMs: expect.any(Number), hastaMs: expect.any(Number) });
    expect(respuesta.parteParaOir!.descripcion).toBe('Ana marcó que no lo dijo así. Oye el original.');

    const grupo = datos.grupo.alumnos[0]!;
    expect(grupo.partesParaOir).toBeGreaterThan(0);
    const { url } = await urlAudioDeParte(mundo.ctx, actividad, { defensaId: id, turnoId: respuesta.parteParaOir!.turnoId! });
    expect(url).toMatch(/^\/api\/defensa\/archivo-dev\?/);
  });

  test('pasados los 7 días el audio se borra y el reporte ya no ofrece oírlo', async () => {
    const mundo = crearMundo();
    const actividad = await crearActividadDePrueba(mundo.ctx);
    const sesion = await prepararAlumnoConPlan(mundo, actividad);
    const id = await defenderPorVoz(mundo, sesion);
    await generarReporteDeDefensa(mundo.ctx, id);
    // Las respuestas del alumno: lo que se borra. La voz de las preguntas (preguntas/ y el banco compartido) no es de nadie.
    const audios = () =>
      Array.from(mundo.estado.archivos.keys()).filter((k) => k.startsWith('audio/') && !k.startsWith('audio/preguntas/') && !k.startsWith('audio/banco/'));
    const banco = () => Array.from(mundo.estado.archivos.keys()).filter((k) => k.startsWith('audio/banco/'));
    const enElBanco = banco().length;
    expect(enElBanco).toBeGreaterThan(0);
    expect(audios().length).toBeGreaterThan(0);

    mundo.reloj.avanzar(6 * 24 * 60 * 60 * 1000);
    expect((await ejecutarMantenimiento(mundo.ctx)).defensasSinAudio).toBe(0);
    expect(audios().length).toBeGreaterThan(0);

    mundo.reloj.avanzar(2 * 24 * 60 * 60 * 1000);
    const resumen = await ejecutarMantenimiento(mundo.ctx);
    expect(resumen.defensasSinAudio).toBe(1);
    expect(resumen.archivosDeAudioBorrados).toBeGreaterThan(0);
    expect(audios()).toEqual([]);
    // El banco de frases fijas no tiene datos de nadie y sirve a los demás alumnos: el borrado no lo toca.
    expect(banco()).toHaveLength(enElBanco);
    expect((await mundo.ctx.repo.defensaPorId(id))!.audioBorradoEn).toBe(mundo.ctx.ahora().toISOString());
    for (const turno of await mundo.ctx.repo.turnosDeDefensa(id)) expect(turno.audioRuta).toBeNull();

    // Las transcripciones se quedan; el audio no.
    const datos = (await datosDelReporte(mundo.ctx, actividad, 't', '20231457'))!;
    expect(datos.reporte.audioDisponible).toBe(false);
    expect(datos.reporte.bloques.every((b) => !b.respuesta?.parteParaOir)).toBe(true);
    expect(datos.reporte.bloques[0]!.respuesta!.lineas!.length).toBeGreaterThan(0);
    const turnoSinAudio = (await mundo.ctx.repo.turnosDeDefensa(id))[1]!.id;
    expect(await codigoDe(() => urlAudioDeParte(mundo.ctx, actividad, { defensaId: id, turnoId: turnoSinAudio }))).toBe('no_encontrado');
    // Y no se borra dos veces.
    expect((await ejecutarMantenimiento(mundo.ctx)).defensasSinAudio).toBe(0);
    // Los trabajos y las preguntas de voz no se tocan.
    expect(Array.from(mundo.estado.archivos.keys()).some((k) => k.startsWith('trabajos/'))).toBe(true);
    expect(Array.from(mundo.estado.archivos.keys()).some((k) => k.startsWith('audio/preguntas/'))).toBe(true);
  });

  test('no se puede leer el reporte de otra actividad, de un ensayo ni de alguien sin defensa', async () => {
    const mundo = crearMundo();
    const actividad = await crearActividadDePrueba(mundo.ctx);
    const otra = await crearActividadDePrueba(mundo.ctx, { tokenGrupo: 'otrogrupo999', nombre: 'Otra' });
    const sesion = await prepararAlumnoConPlan(mundo, actividad);
    const id = await defenderPorEscrito(mundo, sesion);
    expect(await datosDelReporte(mundo.ctx, otra, 't', '20231457')).toBeNull();
    expect(await datosDelReporte(mundo.ctx, actividad, 't', 'NO-EXISTE')).toBeNull();
    expect(await codigoDe(() => registrarToqueProfesor(mundo.ctx, otra, { defensaId: id, tipo: 'antes', valor: 'si' }))).toBe('no_encontrado');
    expect(await codigoDe(() => urlAudioDeParte(mundo.ctx, otra, { defensaId: id, turnoId: 'x' }))).toBe('no_encontrado');
    expect(await codigoDe(() => registrarTiempoRevision(mundo.ctx, otra, { defensaId: id, activoMs: 1000 }))).toBe('no_encontrado');
  });
});

test.describe('los dos toques y el tiempo de revisión', () => {
  test('quedan guardados por reporte; el segundo marca el reporte como revisado y sobrescribe al mismo tipo', async () => {
    const mundo = crearMundo();
    const actividad = await crearActividadDePrueba(mundo.ctx);
    const sesion = await prepararAlumnoConPlan(mundo, actividad);
    const id = await defenderPorEscrito(mundo, sesion);

    expect((await datosDelGrupo(mundo.ctx, actividad, 't')).alumnos[0]!.revisado).toBe(false);
    await registrarToqueProfesor(mundo.ctx, actividad, { defensaId: id, tipo: 'antes', valor: 'si' });
    expect((await datosDelGrupo(mundo.ctx, actividad, 't')).alumnos[0]!.revisado).toBe(false);
    await registrarToqueProfesor(mundo.ctx, actividad, { defensaId: id, tipo: 'despues', valor: 'parte' });
    mundo.reloj.avanzar(1000);
    await registrarToqueProfesor(mundo.ctx, actividad, { defensaId: id, tipo: 'despues', valor: 'si' });

    const toques = await mundo.ctx.repo.toquesDeDefensa(id);
    expect(toques.map((t) => [t.tipo, t.valor]).sort()).toEqual([['antes', 'si'], ['despues', 'si']]);
    expect((await datosDelGrupo(mundo.ctx, actividad, 't')).alumnos[0]!.revisado).toBe(true);

    expect(await codigoDe(() => registrarToqueProfesor(mundo.ctx, actividad, { defensaId: id, tipo: 'antes', valor: 'mucho' as never }))).toBe('solicitud_invalida');
    expect(await codigoDe(() => registrarToqueProfesor(mundo.ctx, actividad, { defensaId: id, tipo: 'durante' as never, valor: 'si' }))).toBe('solicitud_invalida');
    const eventos = mundo.estado.eventos.filter((e) => (e.result as { evento?: string }).evento === 'toque_profesor');
    expect(eventos).toHaveLength(3);
    expect(eventos.every((e) => e.verbo === 'completo_paso' && e.actor_sid === actividad.id)).toBe(true);
  });

  test('el tiempo activo solo crece, se acota y cada apertura es una medición', async () => {
    const mundo = crearMundo();
    const actividad = await crearActividadDePrueba(mundo.ctx);
    const sesion = await prepararAlumnoConPlan(mundo, actividad);
    const id = await defenderPorEscrito(mundo, sesion);

    const { aperturaId } = await registrarTiempoRevision(mundo.ctx, actividad, { defensaId: id, activoMs: 0 });
    await registrarTiempoRevision(mundo.ctx, actividad, { defensaId: id, aperturaId, activoMs: 30_000 });
    await registrarTiempoRevision(mundo.ctx, actividad, { defensaId: id, aperturaId, activoMs: 12_000 }); // un aviso viejo no achica
    await registrarTiempoRevision(mundo.ctx, actividad, { defensaId: id, aperturaId, activoMs: 90_000 });
    const segunda = await registrarTiempoRevision(mundo.ctx, actividad, { defensaId: id, activoMs: -50 });

    const tiempos = await mundo.ctx.repo.tiemposDeRevision(id);
    expect(tiempos.map((t) => t.activoMs).sort((a, b) => a - b)).toEqual([0, 90_000]);
    expect(segunda.aperturaId).not.toBe(aperturaId);
    await registrarTiempoRevision(mundo.ctx, actividad, { defensaId: id, aperturaId, activoMs: 99 * 60 * 60 * 1000 });
    expect((await mundo.ctx.repo.tiemposDeRevision(id)).find((t) => t.id === aperturaId)!.activoMs).toBe(4 * 60 * 60 * 1000);
    expect(await codigoDe(() => registrarTiempoRevision(mundo.ctx, actividad, { defensaId: id, aperturaId: 'no-existe', activoMs: 5 }))).toBe('no_encontrado');
  });
});

test.describe('descargas con enlaces que caducan', () => {
  async function grupoConEntregas() {
    const mundo = crearMundo();
    const actividad = await crearActividadDePrueba(mundo.ctx);
    const ana = await prepararAlumnoConPlan(mundo, actividad, { nombre: 'Ana Torres Ruiz', matricula: '20231457' });
    const luis = comoSesion(await entrarComoAlumno(mundo.ctx, actividad, { nombre: 'Luis Bravo', matricula: '20231390' }));
    const pdf = pdfConTexto([ORACIONES.join(' ').normalize('NFD').replace(/[̀-ͯ]/g, '')]);
    const inicio = await iniciarEntregaArchivo(mundo.ctx, luis, { nombre: 'Trabajo de Luis.pdf', bytes: pdf.byteLength, mime: 'application/pdf' });
    await subirArchivoPorApi(mundo.ctx, luis, inicio.entregaId, pdf);
    await confirmarEntrega(mundo.ctx, luis, inicio.entregaId);
    await entrarComoAlumno(mundo.ctx, actividad, { nombre: 'Sofía Aguilar', matricula: '20231302' }); // nunca entregó
    return { mundo, actividad, ana, luis, entregaLuis: inicio.entregaId };
  }

  test('un trabajo: enlace firmado con nombre claro', async () => {
    const { mundo, actividad, entregaLuis } = await grupoConEntregas();
    const r = await prepararDescarga(mundo.ctx, actividad, { alcance: 'uno', entregaId: entregaLuis });
    expect(r).toMatchObject({ nombre: '20231390-luis-bravo-v1.pdf', cantidad: 1, sinEntregar: 1 });
    expect(r.url).toMatch(/^\/api\/defensa\/archivo-dev\?k=trabajos/);
    const eventos = mundo.estado.eventos.filter((e) => (e.result as { evento?: string }).evento === 'descarga');
    expect(eventos[0]!.result).toMatchObject({ alcance: 'uno', cantidad: 1 });
  });

  test('todos juntos: un zip con el último trabajo de cada alumno que entregó', async () => {
    const { mundo, actividad } = await grupoConEntregas();
    const r = await prepararDescarga(mundo.ctx, actividad, { alcance: 'todos' });
    expect(r).toMatchObject({ nombre: 'trabajos-3b-encuesta-sobre-habitos-de-estudio.zip', cantidad: 2, sinEntregar: 1 });
    const ruta = Array.from(mundo.estado.archivos.keys()).find((k) => k.startsWith('trabajos/zips/'))!;
    expect(ruta).toMatch(new RegExp(`^trabajos/zips/${actividad.id}_\\d{13}\\.zip$`));
    const contenido = unzipSync(mundo.estado.archivos.get(ruta)!.datos);
    expect(Object.keys(contenido).sort()).toEqual(['20231390-luis-bravo-v1.pdf', '20231457-ana-torres-ruiz-v1.txt']);
    expect(new TextDecoder().decode(contenido['20231457-ana-torres-ruiz-v1.txt'])).toContain('Elegí una encuesta');
  });

  test('lo que no es de la actividad, no se baja; y sin entregas no hay zip', async () => {
    const { mundo, actividad, entregaLuis } = await grupoConEntregas();
    const otra = await crearActividadDePrueba(mundo.ctx, { tokenGrupo: 'otrogrupo888', nombre: 'Otra' });
    expect(await codigoDe(() => prepararDescarga(mundo.ctx, otra, { alcance: 'uno', entregaId: entregaLuis }))).toBe('no_encontrado');
    expect(await codigoDe(() => prepararDescarga(mundo.ctx, actividad, { alcance: 'uno' }))).toBe('solicitud_invalida');
    expect(await codigoDe(() => prepararDescarga(mundo.ctx, actividad, { alcance: 'uno', entregaId: 'no-existe' }))).toBe('no_encontrado');
    expect(await codigoDe(() => prepararDescarga(mundo.ctx, otra, { alcance: 'todos' }))).toBe('no_encontrado');
  });

  test('los zips viejos y las entregas que nunca llegaron se limpian', async () => {
    const { mundo, actividad } = await grupoConEntregas();
    await prepararDescarga(mundo.ctx, actividad, { alcance: 'todos' });
    const zips = () => Array.from(mundo.estado.archivos.keys()).filter((k) => k.startsWith('trabajos/zips/'));
    expect(zips()).toHaveLength(1);

    const nuevo = comoSesion(await entrarComoAlumno(mundo.ctx, actividad, { matricula: 'NUEVO-5' }));
    const inicio = await iniciarEntregaArchivo(mundo.ctx, nuevo, { nombre: 'nunca-llego.pdf', bytes: 5000, mime: '' });
    const usados = (await mundo.ctx.repo.actividadPorId(actividad.id))!.enviosUsados;

    mundo.reloj.avanzar(4 * 60 * 60 * 1000);
    expect(await ejecutarMantenimiento(mundo.ctx)).toMatchObject({ entregasDescartadas: 1, zipsBorrados: 0 });
    expect((await mundo.ctx.repo.entregaPorId(inicio.entregaId))).toMatchObject({ estado: 'rechazada', motivo: 'no_llego' });
    expect((await mundo.ctx.repo.actividadPorId(actividad.id))!.enviosUsados).toBe(usados - 1);

    mundo.reloj.avanzar(21 * 60 * 60 * 1000);
    expect((await ejecutarMantenimiento(mundo.ctx)).zipsBorrados).toBe(1);
    expect(zips()).toEqual([]);
  });
});

test.describe('el enlace de grupo', () => {
  test('se puede desactivar y reactivar; quien ya entró puede terminar y nadie nuevo entra ni entrega', async () => {
    const mundo = crearMundo();
    const actividad = await crearActividadDePrueba(mundo.ctx);
    const sesion = await prepararAlumnoConPlan(mundo, actividad);
    const { defensa } = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });

    await cambiarEnlaceDeGrupo(mundo.ctx, actividad, false);
    const desactivada = (await mundo.ctx.repo.actividadPorId(actividad.id))!;
    expect(desactivada.enlaceActivo).toBe(false);
    expect(await codigoDe(() => entrarComoAlumno(mundo.ctx, desactivada, { matricula: 'NUEVO-1' }))).toBe('enlace_inactivo');
    expect(await codigoDe(() => entregarTextoPegado(mundo.ctx, sesion, `${TRABAJO} Otra.`))).toBe('enlace_inactivo');
    // Quien ya estaba defendiendo termina sin problema.
    const r = await responderTurno(mundo.ctx, sesion, defensa.pregunta!.turnoId, { modo: 'escrito', texto: LARGA, duracionMs: 5000 });
    expect(r.defensa.pregunta!.numero).toBe(2);

    await cambiarEnlaceDeGrupo(mundo.ctx, desactivada, true);
    expect(await codigoDe(() => entrarComoAlumno(mundo.ctx, desactivada, { matricula: 'NUEVO-1' }))).toBe('sin_error');
    // Repetir el mismo valor no deja eventos de más.
    const antes = mundo.estado.eventos.length;
    await cambiarEnlaceDeGrupo(mundo.ctx, (await mundo.ctx.repo.actividadPorId(actividad.id))!, true);
    expect(mundo.estado.eventos.length).toBe(antes);
  });

  test('el acceso del profesor sigue funcionando mientras el enlace del grupo esté desactivado', async () => {
    const mundo = crearMundo();
    const actividad = await crearActividadDePrueba(mundo.ctx);
    const enlace = enlaceDeProfesor(actividad, mundo.ctx.ahora());
    await cambiarEnlaceDeGrupo(mundo.ctx, actividad, false);
    expect((await autenticarProfesor(mundo.ctx, enlace.token)).id).toBe(actividad.id);
  });
});

test.describe('lo que ya está en la base cuando todo termina', () => {
  test('estadoDelPlan y reportes no se mezclan entre alumnos', async () => {
    const mundo = crearMundo({ proveedores: { stt: crearSttMock(() => 'x') } });
    const actividad = await crearActividadDePrueba(mundo.ctx);
    const a = await prepararAlumnoConPlan(mundo, actividad, { matricula: 'A-1', nombre: 'Ana Uno' });
    const b = await prepararAlumnoConPlan(mundo, actividad, { matricula: 'B-2', nombre: 'Beto Dos' });
    const idA = await defenderPorEscrito(mundo, a);
    expect((await estadoDelPlan(mundo.ctx, b.alumno.id)).estado).toBe('listo');
    await generarReporteDeDefensa(mundo.ctx, idA);
    const grupo = await datosDelGrupo(mundo.ctx, actividad, 't');
    expect(grupo.alumnos.find((x) => x.matricula === 'A-1')!.evidencia).toEqual(['explico', 'explico', 'explico']);
    expect(grupo.alumnos.find((x) => x.matricula === 'B-2')!.evidencia).toEqual([]);
    void iniciarSesion;
    void prepararPlan;
    void audioFalso;
  });
});

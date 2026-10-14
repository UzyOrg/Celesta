import { expect, test } from '@playwright/test';
import '../support/sinServerOnly';
import { DefensaError } from '../../src/lib/defensa/errores';
import { verificarToken } from '../../src/lib/defensa/firmas';
import type { ProveedorLlm } from '../../src/lib/defensa/providers/tipos';
import { PROMPT_VERSION } from '../../src/lib/defensa/questionPlan';
import {
  autenticarAlumno,
  autenticarProfesor,
  dispositivoDe,
  enlaceDeProfesor,
  iniciarSesion,
  limpiarMatricula,
  limpiarNombre,
  limpiarTokenGrupo,
} from '../../src/lib/defensa/servicios/acceso';
import {
  confirmarEntrega,
  entregarTextoPegado,
  entregaVigente,
  iniciarEntregaArchivo,
  nombreSeguro,
  subirArchivoPorApi,
} from '../../src/lib/defensa/servicios/entregas';
import { CLAVE_AUDIO_ACLARACION, estadoDelPlan, prepararPlan } from '../../src/lib/defensa/servicios/planes';
import { docxConParrafos, pdfConTexto } from '../support/archivos';
import { ORACIONES, TRABAJO, planCrudoValido } from '../support/fixtures';
import { CONSENTIMIENTOS, comoSesion, crearActividadDePrueba, crearMundo, entrarComoAlumno } from '../support/mundo';

async function codigoDe(accion: () => Promise<unknown>): Promise<string> {
  try {
    await accion();
    return 'sin_error';
  } catch (error) {
    return error instanceof DefensaError ? error.codigo : `otro:${String(error)}`;
  }
}

const TEXTO_PDF = ORACIONES.join(' ').normalize('NFD').replace(/[̀-ͯ]/g, '');

test.describe('entrada del alumno', () => {
  test('con nombre, matrícula y los tres sí recibe una sesión firmada y queda registrado', async () => {
    const { ctx, estado } = crearMundo();
    const actividad = await crearActividadDePrueba(ctx);
    const r = await entrarComoAlumno(ctx, actividad);

    expect(r.nuevo).toBe(true);
    const verificado = verificarToken(r.sesion, 'a', ctx.ahora().getTime());
    expect(verificado.ok && verificado.claims.al).toBe(r.alumno.id);
    expect(verificado.ok && verificado.claims.ac).toBe(actividad.id);
    expect(r.alumno).toMatchObject({ nombre: 'Ana Torres Ruiz', matricula: '20231457', modoPreferido: 'voz', dispositivo: 'android' });
    expect(estado.consentimientos.map((c) => c.tipo).sort()).toEqual(['aviso_privacidad', 'mayor_de_edad', 'transferencia_internacional']);
    expect(estado.consentimientos.every((c) => c.aceptado && c.versionAviso === '2026-10-v1')).toBe(true);

    const sesion = await autenticarAlumno(ctx, r.sesion);
    expect(sesion.alumno.id).toBe(r.alumno.id);
    expect(sesion.actividad.id).toBe(actividad.id);
  });

  for (const secreto of ['', 'demasiado-corto']) {
    test(`sin una firma válida no persiste al alumno ni consentimientos (${secreto || 'ausente'})`, async () => {
      const { ctx, estado } = crearMundo();
      const actividad = await crearActividadDePrueba(ctx);
      const anterior = process.env.DEFENSA_SIGNING_SECRET;
      process.env.DEFENSA_SIGNING_SECRET = secreto;
      try {
        expect(await codigoDe(() => entrarComoAlumno(ctx, actividad))).toBe('no_configurado');
        expect(estado.alumnos.size).toBe(0);
        expect(estado.consentimientos).toHaveLength(0);
      } finally {
        if (anterior === undefined) delete process.env.DEFENSA_SIGNING_SECRET;
        else process.env.DEFENSA_SIGNING_SECRET = anterior;
      }
    });
  }

  test('volver a entrar con la misma matrícula retoma al mismo alumno y no cambia su nombre', async () => {
    const { ctx } = crearMundo();
    const actividad = await crearActividadDePrueba(ctx);
    const primera = await entrarComoAlumno(ctx, actividad, { matricula: 'a01 234', nombre: 'Ana Torres' });
    const segunda = await entrarComoAlumno(ctx, actividad, { matricula: 'A01234', nombre: 'Otra Persona', modo: 'escrito' });
    expect(segunda.nuevo).toBe(false);
    expect(segunda.alumno.id).toBe(primera.alumno.id);
    expect(segunda.alumno.nombre).toBe('Ana Torres');
    expect(segunda.alumno.modoPreferido).toBe('escrito');
    expect(segunda.alumno.matricula).toBe('A01234');
  });

  test('sin las tres confirmaciones, con datos vacíos o con un enlace que no existe, no entra nadie', async () => {
    const { ctx, estado } = crearMundo();
    const actividad = await crearActividadDePrueba(ctx);
    const base = { token: actividad.tokenGrupo, nombre: 'Ana Torres', matricula: '20231457', modo: 'voz' as const, consentimientos: { ...CONSENTIMIENTOS } };

    for (const campo of ['avisoPrivacidad', 'transferenciaInternacional', 'mayorDeEdad'] as const) {
      const sinUno = { ...base, consentimientos: { ...CONSENTIMIENTOS, [campo]: false } };
      expect(await codigoDe(() => iniciarSesion(ctx, sinUno, null)), campo).toBe('consentimiento_requerido');
    }
    expect(await codigoDe(() => iniciarSesion(ctx, { ...base, nombre: ' ' }, null))).toBe('solicitud_invalida');
    expect(await codigoDe(() => iniciarSesion(ctx, { ...base, nombre: '12345' }, null))).toBe('solicitud_invalida');
    expect(await codigoDe(() => iniciarSesion(ctx, { ...base, matricula: 'x' }, null))).toBe('solicitud_invalida');
    expect(await codigoDe(() => iniciarSesion(ctx, { ...base, matricula: 'a b!c' }, null))).toBe('solicitud_invalida');
    expect(await codigoDe(() => iniciarSesion(ctx, { ...base, token: 'MAL TOKEN!' }, null))).toBe('solicitud_invalida');
    expect(await codigoDe(() => iniciarSesion(ctx, { ...base, token: 'noexiste123' }, null))).toBe('no_encontrado');
    expect(estado.alumnos.size).toBe(0);
  });

  test('con el enlace desactivado nadie nuevo entra, pero quien ya estaba puede volver', async () => {
    const { ctx } = crearMundo();
    const actividad = await crearActividadDePrueba(ctx);
    await entrarComoAlumno(ctx, actividad, { matricula: 'YA-ESTABA' });
    await ctx.repo.actualizarActividad(actividad.id, { enlaceActivo: false });
    const desactivada = (await ctx.repo.actividadPorId(actividad.id))!;

    expect(await codigoDe(() => entrarComoAlumno(ctx, desactivada, { matricula: 'NUEVO-1' }))).toBe('enlace_inactivo');
    expect(await codigoDe(() => entrarComoAlumno(ctx, desactivada, { matricula: 'YA-ESTABA' }))).toBe('sin_error');
  });

  test('una sesión caducada, de otro propósito o de un alumno que ya no existe no sirve', async () => {
    const { ctx, reloj, estado } = crearMundo();
    const actividad = await crearActividadDePrueba(ctx);
    const r = await entrarComoAlumno(ctx, actividad);

    expect(await codigoDe(() => autenticarAlumno(ctx, 'basura.basura'))).toBe('no_autorizado');
    const profesor = enlaceDeProfesor(actividad, ctx.ahora());
    expect(await codigoDe(() => autenticarAlumno(ctx, profesor.token))).toBe('no_autorizado');

    estado.alumnos.delete(r.alumno.id);
    expect(await codigoDe(() => autenticarAlumno(ctx, r.sesion))).toBe('no_autorizado');

    const otra = await entrarComoAlumno(ctx, actividad, { matricula: 'OTRA-1' });
    reloj.avanzar(49 * 60 * 60 * 1000);
    expect(await codigoDe(() => autenticarAlumno(ctx, otra.sesion))).toBe('no_autorizado');
  });

  test('el acceso del profesor depende de la versión de acceso de la actividad', async () => {
    const { ctx } = crearMundo();
    const actividad = await crearActividadDePrueba(ctx);
    const enlace = enlaceDeProfesor(actividad, ctx.ahora());
    expect((await autenticarProfesor(ctx, enlace.token)).id).toBe(actividad.id);

    // Rotar el acceso (subir la versión) invalida todos los enlaces anteriores.
    await ctx.repo.actualizarActividad(actividad.id, { accesoVersion: 2 });
    expect(await codigoDe(() => autenticarProfesor(ctx, enlace.token))).toBe('no_autorizado');
    const nuevo = enlaceDeProfesor((await ctx.repo.actividadPorId(actividad.id))!, ctx.ahora());
    expect((await autenticarProfesor(ctx, nuevo.token)).id).toBe(actividad.id);

    // Un token de alumno nunca abre el acceso del profesor.
    const alumno = await entrarComoAlumno(ctx, actividad);
    expect(await codigoDe(() => autenticarProfesor(ctx, alumno.sesion))).toBe('no_autorizado');
  });

  test('ayudas de limpieza', () => {
    expect(limpiarTokenGrupo('  GrupO3B-Prueba ')).toBe('grupo3b-prueba');
    expect(limpiarTokenGrupo('corto')).toBeNull();
    expect(limpiarTokenGrupo('con espacio')).toBeNull();
    expect(limpiarNombre('  Ana   \u0007Torres  ')).toBe('Ana Torres');
    expect(limpiarNombre('A')).toBeNull();
    expect(limpiarMatricula(' 2023 1457 ')).toBe('20231457');
    expect(limpiarMatricula('a/b')).toBeNull();
    expect(dispositivoDe('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('ios');
    expect(dispositivoDe('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('escritorio');
    expect(dispositivoDe(null)).toBe('otro');
    expect(nombreSeguro('..\\carpeta/Mi trabajo: final?.pdf')).toBe('Mi trabajo final.pdf');
    expect(nombreSeguro('///')).toBe('trabajo');
  });
});

test.describe('entrega del trabajo', () => {
  test('texto pegado: queda entregado al momento, con su hora y su versión', async () => {
    const { ctx, estado } = crearMundo();
    const actividad = await crearActividadDePrueba(ctx);
    const sesion = comoSesion(await entrarComoAlumno(ctx, actividad));
    const entrega = await entregarTextoPegado(ctx, sesion, TRABAJO);

    expect(entrega).toMatchObject({ version: 1, tipo: 'texto', nombre: 'Texto pegado', tardia: false });
    expect(entrega.palabras).toBeGreaterThan(120);
    expect(entrega.entregadaEn).toBe(ctx.ahora().toISOString());
    expect((await ctx.repo.actividadPorId(actividad.id))!.enviosUsados).toBe(1);
    const fila = (await entregaVigente(ctx, sesion.alumno.id))!;
    expect(fila.textoExtraido).toContain('Elegí una encuesta');
    expect(fila.hashSha256).toMatch(/^[0-9a-f]{64}$/);
    // El original queda en el bucket privado.
    expect(estado.archivos.has(`trabajos/${fila.rutaOriginal}`)).toBe(true);
  });

  test('un texto muy corto se rechaza sin gastar un envío del enlace', async () => {
    const { ctx } = crearMundo();
    const actividad = await crearActividadDePrueba(ctx);
    const sesion = comoSesion(await entrarComoAlumno(ctx, actividad));
    expect(await codigoDe(() => entregarTextoPegado(ctx, sesion, 'Muy poco texto para defender nada.'))).toBe('sin_texto');
    expect(await codigoDe(() => entregarTextoPegado(ctx, sesion, Array.from({ length: 60 }, (_, i) => `palabra${i}`).join(' ') + ' ' + 'x '.repeat(40)))).toBe('trabajo_corto');
    expect((await ctx.repo.actividadPorId(actividad.id))!.enviosUsados).toBe(0);
  });

  test('el enlace tiene límite de envíos y se puede desactivar', async () => {
    const { ctx } = crearMundo();
    const actividad = await crearActividadDePrueba(ctx, { limiteEnvios: 2 });
    const sesion = comoSesion(await entrarComoAlumno(ctx, actividad));
    await entregarTextoPegado(ctx, sesion, TRABAJO);
    await entregarTextoPegado(ctx, sesion, `${TRABAJO} Agregué una línea más.`);
    expect(await codigoDe(() => entregarTextoPegado(ctx, sesion, `${TRABAJO} Otra más.`))).toBe('limite_envios');

    const otra = await crearActividadDePrueba(ctx, { tokenGrupo: 'otrogrupo123' });
    const s2 = comoSesion(await entrarComoAlumno(ctx, otra, { matricula: 'M-2' }));
    await ctx.repo.actualizarActividad(otra.id, { enlaceActivo: false });
    expect(await codigoDe(() => entregarTextoPegado(ctx, s2, TRABAJO))).toBe('enlace_inactivo');
  });

  test('subir otra versión crea la versión 2 y marca tardía la que llega después del plazo', async () => {
    const { ctx, reloj } = crearMundo();
    const actividad = await crearActividadDePrueba(ctx);
    const sesion = comoSesion(await entrarComoAlumno(ctx, actividad));
    const v1 = await entregarTextoPegado(ctx, sesion, TRABAJO);
    reloj.avanzar(5 * 60 * 60 * 1000); // pasada la fecha límite (23:59)
    const v2 = await entregarTextoPegado(ctx, sesion, `${TRABAJO} Versión corregida.`);
    expect([v1.version, v1.tardia, v2.version, v2.tardia]).toEqual([1, false, 2, true]);
    expect((await entregaVigente(ctx, sesion.alumno.id))!.version).toBe(2);
  });

  test('PDF: se sube por la API, se confirma y se le saca el texto', async () => {
    const { ctx, estado } = crearMundo();
    const actividad = await crearActividadDePrueba(ctx);
    const sesion = comoSesion(await entrarComoAlumno(ctx, actividad));
    const pdf = pdfConTexto([TEXTO_PDF.slice(0, 900), TEXTO_PDF.slice(900)]);

    const inicio = await iniciarEntregaArchivo(ctx, sesion, { nombre: 'Mi trabajo.PDF', bytes: pdf.byteLength, mime: 'application/pdf' });
    expect(inicio.subida).toBeNull(); // el almacén en memoria sube por la API
    expect(inicio.maxBytesPorApi).toBe(4 * 1024 * 1024);
    expect((await ctx.repo.entregaPorId(inicio.entregaId))!.estado).toBe('pendiente');

    await subirArchivoPorApi(ctx, sesion, inicio.entregaId, pdf);
    const entrega = await confirmarEntrega(ctx, sesion, inicio.entregaId);
    expect(entrega).toMatchObject({ version: 1, tipo: 'archivo', nombre: 'Mi trabajo.PDF', paginas: 2 });
    expect(entrega.palabras).toBeGreaterThan(120);
    expect((await ctx.repo.entregaPorId(inicio.entregaId))!.hashSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(Array.from(estado.archivos.keys()).filter((k) => k.endsWith('.pdf'))).toHaveLength(1);

    // Confirmar otra vez no repite nada.
    expect((await confirmarEntrega(ctx, sesion, inicio.entregaId)).entregadaEn).toBe(entrega.entregadaEn);
  });

  test('Word (.docx): lo mismo', async () => {
    const { ctx } = crearMundo();
    const actividad = await crearActividadDePrueba(ctx);
    const sesion = comoSesion(await entrarComoAlumno(ctx, actividad));
    const docx = docxConParrafos(ORACIONES);
    const inicio = await iniciarEntregaArchivo(ctx, sesion, { nombre: 'trabajo.docx', bytes: docx.byteLength, mime: '' });
    await subirArchivoPorApi(ctx, sesion, inicio.entregaId, docx);
    const entrega = await confirmarEntrega(ctx, sesion, inicio.entregaId);
    expect(entrega).toMatchObject({ tipo: 'archivo', paginas: null });
    expect((await ctx.repo.entregaPorId(inicio.entregaId))!.textoExtraido).toContain(ORACIONES[4]);
  });

  test('un escaneo (sin texto) no entrega nada, se borra del bucket y devuelve el envío', async () => {
    const { ctx, estado } = crearMundo();
    const actividad = await crearActividadDePrueba(ctx);
    const sesion = comoSesion(await entrarComoAlumno(ctx, actividad));
    const buena = await entregarTextoPegado(ctx, sesion, TRABAJO);

    const escaneo = pdfConTexto(['', '']);
    const inicio = await iniciarEntregaArchivo(ctx, sesion, { nombre: 'escaneo.pdf', bytes: escaneo.byteLength, mime: 'application/pdf' });
    await subirArchivoPorApi(ctx, sesion, inicio.entregaId, escaneo);
    expect(await codigoDe(() => confirmarEntrega(ctx, sesion, inicio.entregaId))).toBe('sin_texto');

    const rechazada = (await ctx.repo.entregaPorId(inicio.entregaId))!;
    expect([rechazada.estado, rechazada.motivo]).toEqual(['sin_texto', 'sin_texto']);
    expect(estado.archivos.has(`trabajos/${rechazada.rutaOriginal}`)).toBe(false);
    expect((await ctx.repo.actividadPorId(actividad.id))!.enviosUsados).toBe(1);
    // El intento fallido no le quita al alumno la versión buena que ya tenía.
    expect((await entregaVigente(ctx, sesion.alumno.id))!.id).toBe(buena.id);
    // Y confirmar de nuevo repite el motivo.
    expect(await codigoDe(() => confirmarEntrega(ctx, sesion, inicio.entregaId))).toBe('sin_texto');
  });

  test('formato no aceptado, archivo que no llegó, tamaño y dueño', async () => {
    const { ctx } = crearMundo();
    const actividad = await crearActividadDePrueba(ctx);
    const sesion = comoSesion(await entrarComoAlumno(ctx, actividad));

    for (const nombre of ['trabajo.doc', 'trabajo.exe', 'trabajo', 'trabajo.pdf.exe']) {
      expect(await codigoDe(() => iniciarEntregaArchivo(ctx, sesion, { nombre, bytes: 1000, mime: '' })), nombre).toBe('formato_no_aceptado');
    }
    expect(await codigoDe(() => iniciarEntregaArchivo(ctx, sesion, { nombre: 'a.pdf', bytes: 21 * 1024 * 1024, mime: '' }))).toBe('demasiado_grande');
    expect(await codigoDe(() => iniciarEntregaArchivo(ctx, sesion, { nombre: 'a.pdf', bytes: 0, mime: '' }))).toBe('solicitud_invalida');
    expect((await ctx.repo.actividadPorId(actividad.id))!.enviosUsados).toBe(0);

    const sinSubir = await iniciarEntregaArchivo(ctx, sesion, { nombre: 'a.pdf', bytes: 1000, mime: '' });
    expect(await codigoDe(() => confirmarEntrega(ctx, sesion, sinSubir.entregaId))).toBe('archivo_no_llego');
    expect(await codigoDe(() => subirArchivoPorApi(ctx, sesion, sinSubir.entregaId, new Uint8Array(5 * 1024 * 1024)))).toBe('demasiado_grande');

    // Una entrega ajena no se puede confirmar ni subir.
    const otro = comoSesion(await entrarComoAlumno(ctx, actividad, { matricula: 'OTRO-1' }));
    expect(await codigoDe(() => confirmarEntrega(ctx, otro, sinSubir.entregaId))).toBe('no_encontrado');
    expect(await codigoDe(() => subirArchivoPorApi(ctx, otro, sinSubir.entregaId, new Uint8Array(10)))).toBe('no_encontrado');
  });

  test('un archivo que dice ser PDF pero no lo es se rechaza al confirmar', async () => {
    const { ctx } = crearMundo();
    const actividad = await crearActividadDePrueba(ctx);
    const sesion = comoSesion(await entrarComoAlumno(ctx, actividad));
    const falso = new TextEncoder().encode('Esto es texto plano y no un documento. '.repeat(40));
    const inicio = await iniciarEntregaArchivo(ctx, sesion, { nombre: 'trabajo.pdf', bytes: falso.byteLength, mime: 'application/pdf' });
    await subirArchivoPorApi(ctx, sesion, inicio.entregaId, falso);
    expect(await codigoDe(() => confirmarEntrega(ctx, sesion, inicio.entregaId))).toBe('formato_no_aceptado');
    expect((await ctx.repo.entregaPorId(inicio.entregaId))!.estado).toBe('rechazada');
    expect((await ctx.repo.actividadPorId(actividad.id))!.enviosUsados).toBe(0);
  });
});

test.describe('plan de preguntas', () => {
  test('se arma una vez, con voz guardada, y el prompt queda versionado', async () => {
    const { ctx, estado } = crearMundo();
    const actividad = await crearActividadDePrueba(ctx);
    const sesion = comoSesion(await entrarComoAlumno(ctx, actividad));
    await entregarTextoPegado(ctx, sesion, TRABAJO);

    const primera = await prepararPlan(ctx, sesion);
    expect(primera.estado).toBe('generando');
    expect(primera.trabajo).not.toBeNull();
    // Un segundo toque mientras se genera no lanza otro trabajo.
    expect((await prepararPlan(ctx, sesion)).trabajo).toBeNull();

    await primera.trabajo!();
    const { estado: listo, plan } = await estadoDelPlan(ctx, sesion.alumno.id);
    expect(listo).toBe('listo');
    expect(plan).toMatchObject({ promptVersion: PROMPT_VERSION, proveedor: 'mock', objetivosSinEvidencia: [], intentos: 1 });
    expect(plan!.plan!.objectives.map((o) => o.candidates.length)).toEqual([2, 2, 2]);

    // 1 apertura + 6 candidatas x 3 textos + 2 transferencias + la frase fija.
    expect(Object.keys(plan!.audios).length).toBe(1 + 6 * 3 + 2 + 1 - duplicados(plan!.plan!));
    expect(plan!.audios[CLAVE_AUDIO_ACLARACION]).toMatch(/^preguntas\/.+\/aclaracion\.wav$/);
    for (const ruta of Object.values(plan!.audios)) expect(estado.archivos.has(`audio/${ruta}`), ruta).toBe(true);

    const otra = await prepararPlan(ctx, sesion);
    expect(otra).toEqual({ estado: 'listo', trabajo: null });
  });

  test('si el modelo falla, el plan queda en error y se puede reintentar sin perder la entrega', async () => {
    let falla = true;
    const roto: ProveedorLlm = {
      id: 'roto',
      async generarJson(solicitud) {
        if (falla) throw new Error('sin red');
        return { json: planCrudoValido(), proveedor: 'roto', modelo: 'm' + solicitud.tarea };
      },
    };
    const { ctx } = crearMundo({ proveedores: { llm: roto } });
    const actividad = await crearActividadDePrueba(ctx);
    const sesion = comoSesion(await entrarComoAlumno(ctx, actividad));
    await entregarTextoPegado(ctx, sesion, TRABAJO);

    const intento1 = await prepararPlan(ctx, sesion);
    await silenciar(() => intento1.trabajo!());
    expect((await estadoDelPlan(ctx, sesion.alumno.id)).estado).toBe('error');
    expect((await entregaVigente(ctx, sesion.alumno.id))!.estado).toBe('lista');

    falla = false;
    const intento2 = await prepararPlan(ctx, sesion);
    expect(intento2.estado).toBe('generando');
    await intento2.trabajo!();
    const { estado, plan } = await estadoDelPlan(ctx, sesion.alumno.id);
    expect(estado).toBe('listo');
    expect(plan!.intentos).toBe(2);
  });

  test('si el modelo se equivoca la primera vez, recibe el motivo y corrige', async () => {
    const mensajes: string[][] = [];
    const corrige: ProveedorLlm = {
      id: 'corrige',
      async generarJson(solicitud) {
        mensajes.push(solicitud.mensajes.map((m) => `${m.rol}:${m.contenido.slice(0, 40)}`));
        if (mensajes.length === 1) {
          const mal = planCrudoValido() as { objectives: { candidates: { anchor: string }[] }[] };
          for (const c of mal.objectives[1]!.candidates) c.anchor = 'esta frase no aparece en el trabajo de ninguna manera posible';
          return { json: mal, proveedor: 'corrige', modelo: 'm' };
        }
        return { json: planCrudoValido(), proveedor: 'corrige', modelo: 'm' };
      },
    };
    const { ctx } = crearMundo({ proveedores: { llm: corrige } });
    const sesion = comoSesion(await entrarComoAlumno(ctx, await crearActividadDePrueba(ctx)));
    await entregarTextoPegado(ctx, sesion, TRABAJO);
    await (await prepararPlan(ctx, sesion)).trabajo!();

    expect(mensajes).toHaveLength(2);
    expect(mensajes[1]!.map((m) => m.split(':')[0])).toEqual(['user', 'assistant', 'user']);
    expect(mensajes[1]![2]).toContain('user:Tu plan anterior no pas');
    const { estado, plan } = await estadoDelPlan(ctx, sesion.alumno.id);
    expect(estado).toBe('listo');
    expect(plan!.objetivosSinEvidencia).toEqual([]);
  });

  test('si un objetivo se queda sin preguntas válidas tras el reintento, el plan sirve y ese objetivo queda sin evidencia', async () => {
    const terco: ProveedorLlm = {
      id: 'terco',
      async generarJson() {
        const mal = planCrudoValido() as { objectives: { candidates: { question: string }[] }[] };
        for (const c of mal.objectives[1]!.candidates) c.question = 'Sin signos ni nada de eso';
        return { json: mal, proveedor: 'terco', modelo: 'm' };
      },
    };
    const { ctx } = crearMundo({ proveedores: { llm: terco } });
    const sesion = comoSesion(await entrarComoAlumno(ctx, await crearActividadDePrueba(ctx)));
    await entregarTextoPegado(ctx, sesion, TRABAJO);
    await (await prepararPlan(ctx, sesion)).trabajo!();
    const { estado, plan } = await estadoDelPlan(ctx, sesion.alumno.id);
    expect(estado).toBe('listo');
    expect(plan!.objetivosSinEvidencia).toEqual(['O2']);
    expect(plan!.problemas.some((p) => p.severity === 'error' && p.path === 'objectives.O2')).toBe(true);
  });

  test('un trabajo que no corresponde a la tarea queda "no corresponde" y no se reintenta', async () => {
    const otraTarea: ProveedorLlm = {
      id: 'otra',
      async generarJson() {
        return { json: { ...planCrudoValido(), status: 'no_corresponde', status_reason: 'Es otro tema.' }, proveedor: 'otra', modelo: 'm' };
      },
    };
    const { ctx } = crearMundo({ proveedores: { llm: otraTarea } });
    const sesion = comoSesion(await entrarComoAlumno(ctx, await crearActividadDePrueba(ctx)));
    await entregarTextoPegado(ctx, sesion, TRABAJO);
    const p = await prepararPlan(ctx, sesion);
    await p.trabajo!();
    expect((await estadoDelPlan(ctx, sesion.alumno.id)).estado).toBe('no_corresponde');
    expect((await prepararPlan(ctx, sesion)).trabajo).toBeNull();
  });

  test('sin voz las preguntas se leen igual y el plan sirve', async () => {
    const sinVoz = {
      id: 'sin-voz',
      async sintetizar(): Promise<never> {
        throw new Error('sin cuota');
      },
    };
    const { ctx } = crearMundo({ proveedores: { tts: sinVoz } });
    const sesion = comoSesion(await entrarComoAlumno(ctx, await crearActividadDePrueba(ctx)));
    await entregarTextoPegado(ctx, sesion, TRABAJO);
    await (await prepararPlan(ctx, sesion)).trabajo!();
    const { estado, plan } = await estadoDelPlan(ctx, sesion.alumno.id);
    expect(estado).toBe('listo');
    expect(plan!.audios).toEqual({});
  });

  test('un plan atascado en "generando" se retoma pasado el plazo, y sin entrega no hay plan', async () => {
    const { ctx, reloj } = crearMundo();
    const actividad = await crearActividadDePrueba(ctx);
    const sesion = comoSesion(await entrarComoAlumno(ctx, actividad));
    expect(await prepararPlan(ctx, sesion)).toEqual({ estado: 'sin_entrega', trabajo: null });

    await entregarTextoPegado(ctx, sesion, TRABAJO);
    const primera = await prepararPlan(ctx, sesion); // nadie ejecuta su trabajo: queda atascado
    expect(primera.trabajo).not.toBeNull();
    expect((await prepararPlan(ctx, sesion)).trabajo).toBeNull();
    reloj.avanzar(3 * 60 * 1000);
    expect((await estadoDelPlan(ctx, sesion.alumno.id)).estado).toBe('error');
    const retomado = await prepararPlan(ctx, sesion);
    expect(retomado.trabajo).not.toBeNull();
    await retomado.trabajo!();
    expect((await estadoDelPlan(ctx, sesion.alumno.id)).estado).toBe('listo');
  });

  test('una actividad mal configurada (cuatro objetivos) no gasta una llamada al modelo', async () => {
    let llamadas = 0;
    const contador: ProveedorLlm = { id: 'c', async generarJson() { llamadas += 1; return { json: {}, proveedor: 'c', modelo: 'c' }; } };
    const { ctx } = crearMundo({ proveedores: { llm: contador } });
    const actividad = await crearActividadDePrueba(ctx, {
      objetivos: [1, 2, 3, 4].map((n) => ({ id: `O${n}`, text: `Objetivo ${n}` })),
    });
    const sesion = comoSesion(await entrarComoAlumno(ctx, actividad));
    await entregarTextoPegado(ctx, sesion, TRABAJO);
    await silenciar(async () => (await prepararPlan(ctx, sesion)).trabajo!());
    expect(llamadas).toBe(0);
    const { estado, plan } = await estadoDelPlan(ctx, sesion.alumno.id);
    expect(estado).toBe('error');
    expect(plan!.problemas.map((p) => p.message).join(' ')).toContain('máximo 3 objetivos');
  });
});

/** Cuántos textos de voz se repiten en el plan (comparten audio). */
function duplicados(plan: { opener: string; objectives: { candidates: { question: string; followup_if_vague: string; followup_if_solid: string }[] }[]; transfer: { question: string }[] }): number {
  const todos = [plan.opener, ...plan.objectives.flatMap((o) => o.candidates.flatMap((c) => [c.question, c.followup_if_vague, c.followup_if_solid])), ...plan.transfer.map((t) => t.question)];
  return todos.length - new Set(todos).size;
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

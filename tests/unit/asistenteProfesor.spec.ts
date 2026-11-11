import '../support/sinServerOnly';
import { expect, test } from '@playwright/test';
import { LIMITES_TARJETAS } from '../../src/components/revision/catalogo';
import { ACTIVIDAD_PROFESOR, ALUMNO_BUSCADO, ALUMNOS, DESCARGA_DEMO, OTRAS_ACTIVIDADES, PROFESORA } from '../../src/components/revision/mock';
import type { DatosGrupo } from '../../src/components/revision/types';
import type { ActividadRow } from '../../src/lib/defensa/almacen/tipos';
import type { ProveedorLlm, RespuestaJson, SolicitudJson } from '../../src/lib/defensa/providers/tipos';
import {
  crearSeudonimos,
  motivoDeRechazo,
  responderAsistente,
  seudonimizarPeticion,
  validarSalida,
  verificarTexto,
} from '../../src/lib/defensa/servicios/asistenteProfesor';
import { entregarDefensa, iniciarDefensa, responderTurno } from '../../src/lib/defensa/servicios/defensas';
import { generarReporteDeDefensa } from '../../src/lib/defensa/servicios/reportes';
import type { SesionAlumno } from '../../src/lib/defensa/servicios/acceso';
import { TRABAJO } from '../support/fixtures';
import { listaFiltrada } from '../../src/components/revision/tarjetasDelGrupo';
import { crearActividadDePrueba, crearMundo, entrarComoAlumno, prepararAlumnoConPlan, type Mundo } from '../support/mundo';

/**
 * El asistente del profesor: el modelo solo elige tarjetas y escribe una frase; el
 * servidor seudonimiza, valida, arma las tarjetas con datos reales y verifica la frase.
 */

const GRUPO: DatosGrupo = {
  profesora: PROFESORA,
  actividad: ACTIVIDAD_PROFESOR,
  alumnos: ALUMNOS,
  alumnoBuscado: ALUMNO_BUSCADO,
  otrasActividades: OTRAS_ACTIVIDADES,
  descarga: DESCARGA_DEMO,
};
const SEUDONIMOS = crearSeudonimos(ALUMNOS);
const alias = (matricula: string) => SEUDONIMOS.aliasDe.get(matricula) as string;
const ANA = '20231457';
const CARLOS = '20231355';

const ACTIVIDAD_FALSA = { enviosUsados: 33, limiteEnvios: 120, enlaceActivo: true } as ActividadRow;

test.describe('los nombres de la petición se cambian por alias', () => {
  test('el nombre exacto, mal escrito o la matrícula', () => {
    expect(seudonimizarPeticion('Muéstrame a Ana Torres', SEUDONIMOS).texto).toBe(`Muéstrame a [${alias(ANA)}]`);
    expect(seudonimizarPeticion('¿cómo le fue a ana tores?', SEUDONIMOS).texto).toBe(`¿cómo le fue a [${alias(ANA)}]?`);
    expect(seudonimizarPeticion('¿y Carlos Espinosa?', SEUDONIMOS).texto).toBe(`¿y [${alias(CARLOS)}]?`);
    expect(seudonimizarPeticion('busca a Espinosa', SEUDONIMOS).texto).toBe(`busca a [${alias(CARLOS)}]`);
    // Una sola palabra parecida en minúsculas no se toma por nombre ("vagas" no es "Vargas").
    expect(seudonimizarPeticion('busca a espinosa', SEUDONIMOS).aliases).toEqual([]);
    expect(seudonimizarPeticion('la matrícula 20231355', SEUDONIMOS).texto).toBe(`la matrícula [${alias(CARLOS)}]`);
  });

  test('un nombre que comparten dos personas no se adivina', () => {
    const resultado = seudonimizarPeticion('muéstrame a Ana', SEUDONIMOS);
    expect(resultado.ambiguas?.map((a) => a.matricula).sort()).toEqual(['20231327', ANA]);
  });

  test('lo que no se parece a nadie se manda tal cual y se anota', () => {
    const resultado = seudonimizarPeticion('¿Cómo le fue a Pedro?', SEUDONIMOS);
    expect(resultado.texto).toBe('¿Cómo le fue a Pedro?');
    expect(resultado.aliases).toEqual([]);
    expect(resultado.sinCoincidencia).toEqual(['Pedro']);
  });

  test('las palabras comunes no se confunden con nombres', () => {
    // "vaga" se parece a "Vega" (Carlos Espinoza Vega) y "muestra" a nadie: ninguna es un nombre.
    const resultado = seudonimizarPeticion('¿quién dio respuestas vagas sobre la muestra?', SEUDONIMOS);
    expect(resultado.aliases).toEqual([]);
    expect(seudonimizarPeticion('¿quién tuvo una respuesta vaga?', SEUDONIMOS).aliases).toEqual([]);
  });
});

test.describe('lo que se rechaza sin preguntarle al modelo', () => {
  const casos: ReadonlyArray<[string, ReturnType<typeof motivoDeRechazo>]> = [
    ['¿Quién copió?', 'sospecha'],
    ['¿Qué porcentaje usó IA?', 'sospecha'],
    ['¿quién usó ChatGPT?', 'sospecha'],
    ['Ponle calificación a Ana', 'calificar'],
    ['¿qué nota le pongo?', 'calificar'],
    ['dame el promedio del grupo', 'calificar'],
    ['¿Quién es el peor?', 'comparar-personas'],
    ['ordénalos del mejor al peor', 'comparar-personas'],
    ['¿quién estaba nervioso?', 'privado'],
    ['muéstrame su ensayo', 'privado'],
    ['¿cómo le fue al 3A?', 'otro-grupo'],
    ['muéstrame otro grupo', 'otro-grupo'],
    ['¿Qué objetivo les costó más?', null],
    ['¿Cómo va el grupo 3B?', null],
    ['Dame ejemplos de cómo justificaron el método', null],
  ];
  for (const [peticion, motivo] of casos) {
    test(`"${peticion}" → ${motivo ?? 'pasa'}`, () => {
      expect(motivoDeRechazo(peticion, '3B')).toBe(motivo);
    });
  }
});

test.describe('lo que devuelve el modelo se valida tarjeta por tarjeta', () => {
  const nulos = { alias: null, objetivo: null, niveles: null, filtros: null, id: null };

  test('se queda lo válido y se descarta lo demás', () => {
    const salida = validarSalida(
      {
        texto: 'Hola',
        rechazo: 'ninguno',
        tarjetas: [
          { tipo: 'avance', props: nulos },
          { tipo: 'inventada', props: nulos },
          { tipo: 'alumno', props: { ...nulos, alias: 'A99' } },
          { tipo: 'alumno', props: { ...nulos, alias: alias(ANA), color: 'rojo' } },
          { tipo: 'lista', props: { ...nulos, filtros: [{ filtro: 'nivel-en-objetivo', objetivo: 2, niveles: null }] } },
          { tipo: 'objetivo', props: { ...nulos, objetivo: 4 } },
          { tipo: 'accion', props: { ...nulos, id: 'borrar_todo' } },
          { tipo: 'avance', props: nulos },
        ],
      },
      SEUDONIMOS,
      new Set(),
      3,
    );
    expect(salida.tarjetas).toEqual([{ tipo: 'avance', props: {} }]);
    expect(salida.descartadas).toBe(7);
  });

  test('nunca pasan más de tres tarjetas', () => {
    const tarjetas = [1, 2, 3].map((objetivo) => ({ tipo: 'objetivo', props: { ...nulos, objetivo } }));
    const salida = validarSalida({ texto: '', rechazo: 'ninguno', tarjetas: [...tarjetas, { tipo: 'ritmo', props: nulos }] }, SEUDONIMOS, new Set(), 3);
    expect(salida.tarjetas).toHaveLength(LIMITES_TARJETAS.porRespuesta);
  });

  test('una salida sin forma no rompe nada', () => {
    expect(validarSalida('hola', SEUDONIMOS, new Set(), 3)).toEqual({ texto: '', rechazo: null, tarjetas: [], descartadas: 0 });
    expect(validarSalida({ rechazo: 'calificar' }, SEUDONIMOS, new Set(), 3).rechazo).toBe('calificar');
  });
});

test.describe('la frase del modelo: cada cifra y nombre sale de los datos', () => {
  const contexto = { grupo: GRUPO, actividad: ACTIVIDAD_FALSA, seudonimos: SEUDONIMOS, tarjetas: [], sinCoincidencia: [] as string[] };

  const conAna = { ...contexto, tarjetas: [{ tipo: 'alumno' as const, props: { alumno: ALUMNO_BUSCADO } }] };
  const tarde = listaFiltrada(ALUMNOS, [{ filtro: 'tarde' }]);
  const conLista = { ...contexto, tarjetas: [{ tipo: 'lista' as const, props: tarde }] };

  test('las cifras del grupo pasan y el alias se cambia por el nombre', () => {
    expect(verificarTexto('27 de 38 ya defendieron.', contexto)).toEqual({ texto: '27 de 38 ya defendieron.' });
    expect(verificarTexto(`[${alias(ANA)}] explicó el objetivo 1.`, conAna)).toEqual({ texto: 'Ana Torres explicó el objetivo 1.' });
    expect(verificarTexto('Tres personas llegaron tarde.', conLista)).toEqual({ texto: 'Tres personas llegaron tarde.' });
  });

  test('solo nombra a quien la respuesta muestra y cuenta bien a las personas de la lista', () => {
    expect(verificarTexto(`[${alias(ANA)}] explicó el objetivo 1.`, contexto)).toEqual({ motivo: 'alias' });
    expect(verificarTexto(`[${alias(ANA)}] llegó tarde.`, conLista)).toEqual({ motivo: 'alias' });
    // 4 existe en los datos del grupo, pero la lista trae 3.
    expect(verificarTexto('Cuatro personas llegaron tarde.', conLista)).toEqual({ motivo: 'numero' });
  });

  test('una cifra, un alias o un nombre que no salen de los datos se descartan', () => {
    expect(verificarTexto('Son 41 personas.', contexto)).toEqual({ motivo: 'numero' });
    expect(verificarTexto('Son cuarenta y una.', contexto)).toEqual({ motivo: 'numero' });
    expect(verificarTexto('[A99] no ha entregado.', contexto)).toEqual({ motivo: 'alias' });
    expect(verificarTexto('Revisa primero a Mariana.', contexto)).toEqual({ motivo: 'nombre' });
    expect(verificarTexto('Pedro no está en el grupo.', { ...contexto, sinCoincidencia: ['Pedro'] })).toEqual({ motivo: 'nombre' });
  });

  test('el filtro de notas, porcentajes y sospechas también aplica', () => {
    expect(verificarTexto('El 70% lo explicó.', contexto)).toEqual({ motivo: 'prohibido' });
    expect(verificarTexto('Su calificación sería buena.', contexto)).toEqual({ motivo: 'prohibido' });
    expect(verificarTexto('Nadie copió.', contexto)).toEqual({ motivo: 'prohibido' });
  });

  test('lo que nombra cómo funciona Celestea por dentro también se descarta', () => {
    expect(verificarTexto('Según la hoja, 13 defendieron.', contexto)).toEqual({ motivo: 'interno' });
    expect(verificarTexto('Te muestro la tarjeta de avance.', contexto)).toEqual({ motivo: 'interno' });
  });

  test('vacía o demasiado larga', () => {
    expect(verificarTexto('   ', contexto)).toEqual({ motivo: 'vacio' });
    expect(verificarTexto('a'.repeat(300), contexto)).toEqual({ motivo: 'largo' });
  });
});

/* ------------------------------------------------------------------------ */
/* El recorrido completo, con almacén en memoria                            */
/* ------------------------------------------------------------------------ */

const LARGA =
  'Elegí esa opción porque necesitaba llegar a más compañeros en pocos días y con entrevistas solo hubiera hablado con cinco personas esa semana';

async function defenderPorEscrito(mundo: Mundo, sesion: SesionAlumno): Promise<string> {
  let { defensa } = await iniciarDefensa(mundo.ctx, sesion, { ensayo: false });
  while (defensa.estado === 'en_curso') {
    mundo.reloj.avanzar(12_000);
    defensa = (await responderTurno(mundo.ctx, sesion, defensa.pregunta!.turnoId, { modo: 'escrito', texto: LARGA, duracionMs: 12_000 })).defensa;
  }
  await entregarDefensa(mundo.ctx, sesion, defensa.id, []);
  return defensa.id;
}

/** Un modelo que contesta lo que se le diga y guarda lo que recibió. */
function modeloQueContesta(json: unknown | ((solicitud: SolicitudJson) => unknown)) {
  const recibidas: SolicitudJson[] = [];
  const llm: ProveedorLlm = {
    id: 'prueba',
    async generarJson(solicitud): Promise<RespuestaJson> {
      recibidas.push(solicitud);
      const valor = typeof json === 'function' ? (json as (s: SolicitudJson) => unknown)(solicitud) : json;
      return { json: valor, proveedor: 'prueba', modelo: 'prueba', uso: { entrada: 1200, salida: 80 } };
    },
  };
  return { llm, recibidas };
}

const nulos = { alias: null, objetivo: null, niveles: null, filtros: null, id: null };

async function grupoConDefensas(llm?: ProveedorLlm) {
  const mundo = crearMundo(llm ? { proveedores: { llm } } : {});
  const actividad = await crearActividadDePrueba(mundo.ctx);
  // El plan y el reporte usan el modelo falso de siempre aunque el asistente use otro.
  const conMock = crearMundo();
  void conMock;
  const ana = await prepararAlumnoConPlan(mundo, actividad, { nombre: 'Ana Torres Ruiz', matricula: '20231457' });
  const idAna = await defenderPorEscrito(mundo, ana);
  await generarReporteDeDefensa(mundo.ctx, idAna);
  const luis = await prepararAlumnoConPlan(mundo, actividad, { nombre: 'Luis Bravo Méndez', matricula: '20231390' });
  const idLuis = await defenderPorEscrito(mundo, luis);
  await generarReporteDeDefensa(mundo.ctx, idLuis);
  await entrarComoAlumno(mundo.ctx, actividad, { nombre: 'Sofía Aguilar Ramos', matricula: '20231302' });
  return { mundo, actividad };
}

/** El modelo del asistente delega al falso de siempre para todo lo que no es el asistente. */
function asistenteSobreMock(contestar: (solicitud: SolicitudJson) => unknown) {
  const base = crearMundo().ctx.proveedores.llm;
  const recibidas: SolicitudJson[] = [];
  const llm: ProveedorLlm = {
    id: 'prueba',
    async generarJson(solicitud) {
      if (solicitud.tarea !== 'asistente') return base.generarJson(solicitud);
      recibidas.push(solicitud);
      return { json: contestar(solicitud), proveedor: 'prueba', modelo: 'prueba', uso: { entrada: 1500, salida: 90 } };
    },
  };
  return { llm, recibidas };
}

test.describe('responderAsistente', () => {
  test('al modelo no le llegan nombres, matrículas ni el trabajo', async () => {
    const { llm, recibidas } = asistenteSobreMock((solicitud) => {
      const aliasDeAna = /\[(A\d{2})\]/.exec(solicitud.mensajes[0]?.contenido ?? '')?.[1];
      return { texto: `[${aliasDeAna}] ya defendió.`, rechazo: 'ninguno', tarjetas: [{ tipo: 'alumno', props: { ...nulos, alias: aliasDeAna } }] };
    });
    const { mundo, actividad } = await grupoConDefensas(llm);
    const pasos: string[] = [];
    const { respuesta, medidas } = await responderAsistente(mundo.ctx, actividad, 'token', { peticion: '¿Cómo le fue a Ana Torres?', historial: [] }, { alPaso: (p) => pasos.push(p) });

    const enviado = `${recibidas[0]?.system ?? ''}\n${recibidas[0]?.mensajes.map((m) => m.contenido).join('\n')}`;
    for (const prohibido of ['Ana', 'Torres', 'Luis', 'Bravo', 'Sofía', '20231457', '20231390', TRABAJO.slice(0, 40), LARGA.slice(0, 40)]) {
      expect(enviado, prohibido).not.toContain(prohibido);
    }
    expect(respuesta.fuente).toBe('modelo');
    expect(respuesta.texto).toBe('Ana Torres ya defendió.');
    expect(respuesta.tarjetas.map((t) => t.tipo)).toEqual(['alumno']);
    expect(pasos[0]).toBe('Leo tu grupo: 3 personas, 2 entregas y 2 defensas…');
    expect(pasos).toContain('Busco a Ana Torres…');
    expect(medidas).toMatchObject({ tokensEntrada: 1500, tokensSalida: 90 });
  });

  test('lo obvio se rechaza sin llamar al modelo', async () => {
    const { llm, recibidas } = asistenteSobreMock(() => ({ texto: '', rechazo: 'ninguno', tarjetas: [] }));
    const { mundo, actividad } = await grupoConDefensas(llm);
    const { respuesta } = await responderAsistente(mundo.ctx, actividad, 'token', { peticion: '¿Quién copió?', historial: [] });
    expect(recibidas).toHaveLength(0);
    expect(respuesta).toMatchObject({ fuente: 'filtro', rechazo: 'sospecha', tarjetas: [] });
  });

  test('calificar a alguien se rechaza y deja su tarjeta como alternativa', async () => {
    const { llm } = asistenteSobreMock(() => ({ texto: '', rechazo: 'ninguno', tarjetas: [] }));
    const { mundo, actividad } = await grupoConDefensas(llm);
    const { respuesta } = await responderAsistente(mundo.ctx, actividad, 'token', { peticion: 'Ponle calificación a Ana Torres', historial: [] });
    expect(respuesta.rechazo).toBe('calificar');
    expect(respuesta.tarjetas.map((t) => t.tipo)).toEqual(['alumno']);
  });

  test('una cifra inventada se cambia por la plantilla', async () => {
    const { llm } = asistenteSobreMock(() => ({ texto: 'Son 41 personas.', rechazo: 'ninguno', tarjetas: [{ tipo: 'avance', props: nulos }] }));
    const { mundo, actividad } = await grupoConDefensas(llm);
    const { respuesta, medidas } = await responderAsistente(mundo.ctx, actividad, 'token', { peticion: '¿cuántos defendieron?', historial: [] });
    expect(respuesta.fuente).toBe('plantilla');
    expect(respuesta.texto).toBe('2 de 3 ya defendieron. Faltan 1: 1 no han entregado y 0 entregaron sin defender.');
    expect(medidas.motivoPlantilla).toBe('numero');
  });

  test('si el modelo falla contestan las reglas', async () => {
    const { llm } = asistenteSobreMock(() => {
      throw new Error('se cayó');
    });
    const { mundo, actividad } = await grupoConDefensas(llm);
    const { respuesta } = await responderAsistente(mundo.ctx, actividad, 'token', { peticion: '¿Cuántos defendieron?', historial: [] });
    expect(respuesta.fuente).toBe('reglas');
    expect(respuesta.tarjetas.map((t) => t.tipo)).toEqual(['avance']);
  });

  test('si el modelo tarda demasiado también contestan las reglas', async () => {
    const base = crearMundo().ctx.proveedores.llm;
    const lento: ProveedorLlm = {
      id: 'lento',
      generarJson: (solicitud) => (solicitud.tarea === 'asistente' ? new Promise(() => undefined) : base.generarJson(solicitud)),
    };
    const { mundo, actividad } = await grupoConDefensas(lento);
    const { respuesta } = await responderAsistente(mundo.ctx, actividad, 'token', { peticion: 'muéstrame a todos', historial: [] }, { tiempoMaximoMs: 50 });
    expect(respuesta).toMatchObject({ fuente: 'reglas' });
    expect(respuesta.tarjetas.map((t) => t.tipo)).toEqual(['grupo']);
  });

  test('las citas son frases exactas de lo que respondieron', async () => {
    const { llm } = asistenteSobreMock(() => ({ texto: '', rechazo: 'ninguno', tarjetas: [{ tipo: 'citas', props: { ...nulos, objetivo: 1 } }] }));
    const { mundo, actividad } = await grupoConDefensas(llm);
    const { respuesta } = await responderAsistente(mundo.ctx, actividad, 'token', { peticion: '¿qué dijeron sobre el método?', historial: [] });
    const tarjeta = respuesta.tarjetas[0];
    expect(tarjeta?.tipo).toBe('citas');
    if (tarjeta?.tipo !== 'citas') return;
    expect(tarjeta.props.citas.length).toBeGreaterThan(0);
    for (const cita of tarjeta.props.citas) expect(LARGA).toContain(cita.texto);
    expect(respuesta.fuente).toBe('plantilla'); // el modelo no escribió frase
  });

  test('pendientes, ritmo y una lista con filtros combinados se arman con datos reales', async () => {
    const { llm } = asistenteSobreMock(() => ({
      texto: 'Te esperan 2 reportes.',
      rechazo: 'ninguno',
      tarjetas: [
        { tipo: 'pendientes', props: nulos },
        { tipo: 'ritmo', props: nulos },
        { tipo: 'lista', props: { ...nulos, filtros: [{ filtro: 'por-revisar', objetivo: null, niveles: null }, { filtro: 'nivel-en-objetivo', objetivo: 1, niveles: ['explico'] }] } },
      ],
    }));
    const { mundo, actividad } = await grupoConDefensas(llm);
    const { respuesta } = await responderAsistente(mundo.ctx, actividad, 'token', { peticion: '¿qué me falta?', historial: [] });
    expect(respuesta).toMatchObject({ fuente: 'modelo', texto: 'Te esperan 2 reportes.' });
    const [pendientes, ritmo, lista] = respuesta.tarjetas;
    expect(pendientes).toMatchObject({ tipo: 'pendientes', props: { porRevisar: 2, primeraMatricula: '20231457', enlace: { activo: true, limiteEnvios: 50 } } });
    expect(ritmo?.tipo).toBe('ritmo');
    expect(lista).toMatchObject({ tipo: 'lista', props: { titulo: 'Reportes por revisar y objetivo 1: lo explicaron', total: 2 } });
  });

  test('un nombre que comparten dos personas pide elegir, sin modelo', async () => {
    const { llm, recibidas } = asistenteSobreMock(() => ({ texto: '', rechazo: 'ninguno', tarjetas: [] }));
    const { mundo, actividad } = await grupoConDefensas(llm);
    await entrarComoAlumno(mundo.ctx, actividad, { nombre: 'Ana Karen Pérez Galindo', matricula: '20231327' });
    const { respuesta } = await responderAsistente(mundo.ctx, actividad, 'token', { peticion: 'muéstrame a Ana', historial: [] });
    expect(recibidas).toHaveLength(0);
    expect(respuesta.tarjetas[0]).toMatchObject({ tipo: 'lista', props: { titulo: 'Personas con ese nombre', total: 2 } });
  });
});

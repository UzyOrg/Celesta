import '../support/sinServerOnly';
import { expect, test } from '@playwright/test';
import { PRESUPUESTO_DEFENSA } from '../../src/lib/defensa/config';
import type { QuestionPlan } from '../../src/lib/defensa/questionPlan';
import {
  LIMITE_SUAVE,
  buscarPregunta,
  elegirIndice,
  separarContexto,
  siguienteTurno,
  type Clase,
  type Decision,
  type DuracionDefensa,
  type EntradaMotor,
  type PlanParaMotor,
  type TurnoPrevio,
} from '../../src/lib/defensa/turnEngine';
import { planCrudoValido } from '../support/fixtures';

const PLAN = planCrudoValido() as unknown as QuestionPlan;

// ── Notación compacta para el historial ─────────────────────────────────────
const apertura = (): TurnoPrevio => ({ ref: 'apertura', tipo: 'apertura', objetivoId: null, clase: null });
const candidata = (ref: string, objetivoId: string, clase: Clase): TurnoPrevio => ({
  ref,
  tipo: 'candidata',
  objetivoId,
  clase,
});
const seguimiento = (ref: string, objetivoId: string, clase: Clase, sufijo: 'vaga' | 'solida' = 'vaga'): TurnoPrevio => ({
  ref: `${ref}:${sufijo}`,
  tipo: 'seguimiento',
  objetivoId,
  clase,
});
const transferencia = (ref: string, objetivoId: string, clase: Clase = 'solida'): TurnoPrevio => ({
  ref,
  tipo: 'transferencia',
  objetivoId,
  clase,
});

/** Una línea por decisión: "candidata:O2", "seguimiento:O1-a:vaga", "cerrar:completo"... */
function resumen(decision: Decision): string {
  if (decision.accion === 'cerrar') return `cerrar:${decision.motivo}`;
  const { tipo, ref, objetivoId } = decision.turno;
  if (tipo === 'apertura') return 'apertura';
  if (tipo === 'candidata') return `candidata:${objetivoId}`;
  if (tipo === 'transferencia') return `transferencia:${objetivoId}`;
  return `seguimiento:${ref}`;
}

function entrada(parcial: Partial<EntradaMotor> & { historial: readonly TurnoPrevio[] }): EntradaMotor {
  return { plan: PLAN, semilla: 7, duracion: 'corta', transcurridoMs: 0, ...parcial };
}

const { presupuestoMs: PRESUPUESTO_CORTA, maxTurnos: MAX_CORTA } = PRESUPUESTO_DEFENSA.corta;

interface Caso {
  nombre: string;
  entrada: EntradaMotor;
  esperado: string | RegExp;
}

const CASOS: Caso[] = [
  // Apertura
  { nombre: 'sin historial empieza con la apertura', entrada: entrada({ historial: [] }), esperado: 'apertura' },
  { nombre: 'la apertura va primero aunque ya sea tarde', entrada: entrada({ historial: [], transcurridoMs: PRESUPUESTO_CORTA * 2 }), esperado: 'apertura' },

  // Primer objetivo
  { nombre: 'tras la apertura se pregunta el primer objetivo', entrada: entrada({ historial: [apertura()] }), esperado: 'candidata:O1' },

  // Repreguntas según la clase
  { nombre: 'vaga → pide un ejemplo concreto', entrada: entrada({ historial: [apertura(), candidata('O1-a', 'O1', 'vaga')] }), esperado: 'seguimiento:O1-a:vaga' },
  { nombre: 'fuera de tema → pide un ejemplo concreto', entrada: entrada({ historial: [apertura(), candidata('O1-b', 'O1', 'fuera_de_tema')] }), esperado: 'seguimiento:O1-b:vaga' },
  { nombre: 'sólida en la modalidad corta → pasa al siguiente objetivo', entrada: entrada({ historial: [apertura(), candidata('O1-a', 'O1', 'solida')] }), esperado: 'candidata:O2' },
  { nombre: 'sólida en la modalidad larga → profundiza', entrada: entrada({ duracion: 'larga', historial: [apertura(), candidata('O1-a', 'O1', 'solida')] }), esperado: 'seguimiento:O1-a:solida' },
  { nombre: 'sin respuesta nunca insiste (corta)', entrada: entrada({ historial: [apertura(), candidata('O1-a', 'O1', 'sin_respuesta')] }), esperado: 'candidata:O2' },
  { nombre: 'sin respuesta nunca insiste (larga)', entrada: entrada({ duracion: 'larga', historial: [apertura(), candidata('O1-a', 'O1', 'sin_respuesta')] }), esperado: 'candidata:O2' },
  { nombre: 'solo hay una repregunta por objetivo', entrada: entrada({ historial: [apertura(), candidata('O1-a', 'O1', 'vaga'), seguimiento('O1-a', 'O1', 'vaga')] }), esperado: 'candidata:O2' },
  { nombre: 'corta: una segunda repregunta no cabe si dejaría sin lugar a los objetivos y la transferencia', entrada: entrada({ historial: [apertura(), candidata('O1-a', 'O1', 'vaga'), seguimiento('O1-a', 'O1', 'vaga'), candidata('O2-a', 'O2', 'vaga')] }), esperado: 'candidata:O3' },
  { nombre: 'larga: la misma situación sí cabe', entrada: entrada({ duracion: 'larga', historial: [apertura(), candidata('O1-a', 'O1', 'vaga'), seguimiento('O1-a', 'O1', 'vaga'), candidata('O2-a', 'O2', 'vaga')] }), esperado: 'seguimiento:O2-a:vaga' },
  { nombre: 'la repregunta sólida tampoco se repite', entrada: entrada({ duracion: 'larga', historial: [apertura(), candidata('O1-a', 'O1', 'solida'), seguimiento('O1-a', 'O1', 'solida', 'solida')] }), esperado: 'candidata:O2' },

  // Orden de los objetivos
  { nombre: 'segundo objetivo tras el primero', entrada: entrada({ historial: [apertura(), candidata('O1-a', 'O1', 'solida'), candidata('O2-a', 'O2', 'solida')] }), esperado: 'candidata:O3' },
  { nombre: 'con todos los objetivos preguntados, transferencia', entrada: entrada({ historial: [apertura(), candidata('O1-a', 'O1', 'solida'), candidata('O2-a', 'O2', 'solida'), candidata('O3-a', 'O3', 'solida')] }), esperado: /^transferencia:O[23]$/ },
  { nombre: 'tras la transferencia se cierra por completo', entrada: entrada({ duracion: 'larga', historial: [apertura(), candidata('O1-a', 'O1', 'solida'), candidata('O2-a', 'O2', 'solida'), candidata('O3-a', 'O3', 'solida'), transferencia('T1', 'O2')] }), esperado: 'cerrar:completo' },

  // Tiempo
  { nombre: 'pasado el límite suave ya no hay repreguntas', entrada: entrada({ transcurridoMs: PRESUPUESTO_CORTA * LIMITE_SUAVE, historial: [apertura(), candidata('O1-a', 'O1', 'vaga')] }), esperado: 'candidata:O2' },
  { nombre: 'justo antes del límite suave todavía repregunta', entrada: entrada({ transcurridoMs: PRESUPUESTO_CORTA * LIMITE_SUAVE - 1, historial: [apertura(), candidata('O1-a', 'O1', 'vaga')] }), esperado: 'seguimiento:O1-a:vaga' },
  { nombre: 'sin tiempo y con objetivos pendientes, salta a la transferencia que toca uno pendiente (O3)', entrada: entrada({ semilla: 99, transcurridoMs: PRESUPUESTO_CORTA, historial: [apertura(), candidata('O1-a', 'O1', 'solida'), candidata('O2-a', 'O2', 'solida')] }), esperado: 'transferencia:O3' },
  { nombre: 'sin tiempo y con la transferencia hecha, cierra por tiempo', entrada: entrada({ transcurridoMs: PRESUPUESTO_CORTA + 1, historial: [apertura(), candidata('O1-a', 'O1', 'solida'), transferencia('T2', 'O3')] }), esperado: 'cerrar:tiempo' },
  { nombre: 'sin tiempo no repregunta aunque la respuesta fuera vaga', entrada: entrada({ transcurridoMs: PRESUPUESTO_CORTA, historial: [apertura(), candidata('O1-a', 'O1', 'vaga')] }), esperado: /^transferencia:O[23]$/ },
  { nombre: 'la modalidad larga tiene más presupuesto', entrada: entrada({ duracion: 'larga', transcurridoMs: PRESUPUESTO_CORTA + 1, historial: [apertura(), candidata('O1-a', 'O1', 'solida')] }), esperado: 'seguimiento:O1-a:solida' },

  // Tope de turnos
  {
    nombre: 'el tope de turnos cierra la defensa',
    entrada: entrada({
      historial: Array.from({ length: MAX_CORTA }, (_, i) => (i === 0 ? apertura() : candidata(`X${i}`, `X${i}`, 'solida'))),
    }),
    esperado: 'cerrar:limite_de_turnos',
  },
];

test.describe('turnEngine · tabla de decisiones', () => {
  for (const caso of CASOS) {
    test(caso.nombre, () => {
      const resultado = resumen(siguienteTurno(caso.entrada));
      if (typeof caso.esperado === 'string') expect(resultado).toBe(caso.esperado);
      else expect(resultado).toMatch(caso.esperado);
    });
  }
});

test.describe('turnEngine · casos de borde del plan', () => {
  const sinTransferencias: PlanParaMotor = { ...PLAN, transfer: [] };
  const sinSegundoObjetivo: PlanParaMotor = {
    ...PLAN,
    objectives: PLAN.objectives.map((o) => (o.objective_id === 'O2' ? { ...o, candidates: [] } : o)),
  };

  test('un objetivo sin candidatas se salta y la transferencia lo cubre', () => {
    const historial = [apertura(), candidata('O1-a', 'O1', 'solida')];
    expect(resumen(siguienteTurno(entrada({ plan: sinSegundoObjetivo, historial })))).toBe('candidata:O3');

    const completo = [...historial, candidata('O3-a', 'O3', 'solida')];
    // T1 toca O2, el objetivo que no se pudo preguntar: es la que más evidencia nueva da.
    expect(resumen(siguienteTurno(entrada({ plan: sinSegundoObjetivo, historial: completo })))).toBe('transferencia:O2');
  });

  test('sin transferencias válidas se cierra al terminar los objetivos', () => {
    const historial = [apertura(), candidata('O1-a', 'O1', 'solida'), candidata('O2-a', 'O2', 'solida'), candidata('O3-a', 'O3', 'solida')];
    expect(resumen(siguienteTurno(entrada({ plan: sinTransferencias, historial })))).toBe('cerrar:completo');
    expect(resumen(siguienteTurno(entrada({ plan: sinTransferencias, historial, transcurridoMs: PRESUPUESTO_CORTA })))).toBe('cerrar:tiempo');
  });

  test('un plan sin ningún objetivo con candidatas va de la apertura a la transferencia', () => {
    const vacio: PlanParaMotor = { ...PLAN, objectives: PLAN.objectives.map((o) => ({ ...o, candidates: [] })) };
    expect(resumen(siguienteTurno(entrada({ plan: vacio, historial: [apertura()] })))).toMatch(/^transferencia:/);
  });

  test('si el turno anterior ya no existe en el plan no se inventa una repregunta', () => {
    const historial = [apertura(), candidata('O1-zzz', 'O1', 'vaga')];
    expect(resumen(siguienteTurno(entrada({ historial })))).toBe('candidata:O2');
  });
});

test.describe('turnEngine · semilla y aleatorización', () => {
  test('mismas entradas, misma decisión', () => {
    const e = entrada({ semilla: 123456, historial: [apertura()] });
    expect(siguienteTurno(e)).toEqual(siguienteTurno({ ...e }));
  });

  test('la candidata de un objetivo depende de la semilla y no del historial', () => {
    for (const semilla of [1, 2, 3, 77, 4096, 2_147_483_647]) {
      const pregunta = (historial: TurnoPrevio[]) => {
        const d = siguienteTurno(entrada({ semilla, historial }));
        return d.accion === 'preguntar' ? d.turno.ref : null;
      };
      const primera = pregunta([apertura()]);
      const tras = pregunta([apertura(), candidata('O1-a', 'O1', 'solida')]);
      expect(primera, `semilla ${semilla}`).toMatch(/^O1-[ab]$/);
      expect(tras, `semilla ${semilla}`).toMatch(/^O2-[ab]$/);
      // El mismo O1 sale igual aunque se consulte desde otro punto del historial.
      expect(elegirIndice(semilla, 'O1', 2)).toBe(primera === 'O1-a' ? 0 : 1);
    }
  });

  test('las dos candidatas salen en proporciones parecidas, no siempre la misma', () => {
    // La selección "al azar" hecha por un modelo eligió el mismo caso en 6 de 7 exámenes.
    const cuentas = [0, 0];
    for (let semilla = 1; semilla <= 2000; semilla += 1) cuentas[elegirIndice(semilla, 'O1', 2)]! += 1;
    expect(cuentas[0]).toBeGreaterThan(900);
    expect(cuentas[1]).toBeGreaterThan(900);

    // Y las elecciones de objetivos distintos no están atadas entre sí.
    let iguales = 0;
    for (let semilla = 1; semilla <= 2000; semilla += 1) {
      if (elegirIndice(semilla, 'O1', 2) === elegirIndice(semilla, 'O2', 2)) iguales += 1;
    }
    expect(iguales).toBeGreaterThan(850);
    expect(iguales).toBeLessThan(1150);

    // Con FNV-1a sin mezcla final, O1 y O3 coincidían siempre y O2 siempre las contrariaba.
    let primeroYTercero = 0;
    for (let semilla = 1; semilla <= 2000; semilla += 1) {
      if (elegirIndice(semilla, 'O1', 2) === elegirIndice(semilla, 'O3', 2)) primeroYTercero += 1;
    }
    expect(primeroYTercero).toBeGreaterThan(850);
    expect(primeroYTercero).toBeLessThan(1150);
  });

  test('la función de elección está fijada: cambiarla rompería las defensas ya guardadas', () => {
    expect([1, 2, 3, 42, 1000, 2_147_483_647].map((s) => elegirIndice(s, 'O1', 2))).toEqual([0, 1, 1, 1, 0, 0]);
    expect([1, 2, 3, 42, 1000, 2_147_483_647].map((s) => elegirIndice(s, 'transferencia', 2))).toEqual([1, 1, 0, 0, 0, 1]);
    expect(elegirIndice(5, 'O1', 1)).toBe(0);
    expect(elegirIndice(5, 'O1', 0)).toBe(0);
  });

  test('evitar prefiere la otra candidata del ensayo, y si no hay otra usa la misma', () => {
    for (const semilla of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const normal = siguienteTurno(entrada({ semilla, historial: [apertura()] }));
      const evitando = siguienteTurno(entrada({ semilla, historial: [apertura()], evitar: ['O1-a'] }));
      const evitandoB = siguienteTurno(entrada({ semilla, historial: [apertura()], evitar: ['O1-b'] }));
      expect(evitando.accion === 'preguntar' && evitando.turno.ref).toBe('O1-b');
      expect(evitandoB.accion === 'preguntar' && evitandoB.turno.ref).toBe('O1-a');
      expect(normal.accion === 'preguntar' && normal.turno.ref).toMatch(/^O1-[ab]$/);
    }
    const ambas = siguienteTurno(entrada({ semilla: 3, historial: [apertura()], evitar: ['O1-a', 'O1-b'] }));
    expect(ambas.accion === 'preguntar' && ambas.turno.ref).toMatch(/^O1-[ab]$/);
  });
});

test.describe('turnEngine · simulación completa', () => {
  const CLASES: Clase[] = ['solida', 'vaga', 'fuera_de_tema', 'sin_respuesta'];

  function simular(semilla: number, duracion: DuracionDefensa, clases: Clase[], msPorTurno: number) {
    const historial: TurnoPrevio[] = [];
    const refs: string[] = [];
    let transcurridoMs = 0;
    for (let paso = 0; paso < 30; paso += 1) {
      const decision = siguienteTurno({ plan: PLAN, semilla, duracion, historial, transcurridoMs });
      if (decision.accion === 'cerrar') return { refs, motivo: decision.motivo, historial };
      const { turno } = decision;
      refs.push(turno.ref);
      historial.push({
        ref: turno.ref,
        tipo: turno.tipo,
        objetivoId: turno.objetivoId,
        clase: turno.tipo === 'apertura' ? null : (clases[paso % clases.length] as Clase),
      });
      transcurridoMs += msPorTurno;
    }
    throw new Error('la defensa no terminó');
  }

  test('siempre termina, nunca repite una pregunta y cubre cada objetivo con candidatas', () => {
    for (let semilla = 1; semilla <= 120; semilla += 1) {
      for (const duracion of ['corta', 'larga'] as const) {
        for (const msPorTurno of [10_000, 35_000, 70_000]) {
          const clases = [CLASES[semilla % 4] as Clase, CLASES[(semilla + 1) % 4] as Clase, CLASES[(semilla + 2) % 4] as Clase];
          const { refs, historial } = simular(semilla, duracion, clases, msPorTurno);
          const etiqueta = `semilla ${semilla} ${duracion} ${msPorTurno}`;
          expect(new Set(refs).size, etiqueta).toBe(refs.length);
          expect(refs.length, etiqueta).toBeLessThanOrEqual(PRESUPUESTO_DEFENSA[duracion].maxTurnos);
          expect(refs[0], etiqueta).toBe('apertura');
          // Con tiempo de sobra (10 s por turno) los tres objetivos se preguntan y hay transferencia.
          if (msPorTurno === 10_000) {
            const objetivos = historial.filter((t) => t.tipo === 'candidata').map((t) => t.objetivoId);
            expect(objetivos, etiqueta).toEqual(['O1', 'O2', 'O3']);
            expect(historial.some((t) => t.tipo === 'transferencia'), etiqueta).toBe(true);
          }
        }
      }
    }
  });

  test('cada turno planeado se puede reconstruir desde el plan guardado', () => {
    const { historial } = simular(5, 'larga', ['vaga', 'solida', 'fuera_de_tema', 'sin_respuesta'], 8_000);
    for (const turno of historial) {
      const encontrada = buscarPregunta(PLAN, turno.ref);
      expect(encontrada, turno.ref).not.toBeNull();
      expect(encontrada?.tipo).toBe(turno.tipo);
      expect(encontrada?.objetivoId).toBe(turno.objetivoId);
    }
  });
});

test.describe('turnEngine · ayudas de texto', () => {
  test('buscarPregunta devuelve lo que el alumno nunca ve: evidencia y ancla', () => {
    const q = buscarPregunta(PLAN, 'O2-a');
    expect(q?.evidencia).toContain('criterio');
    expect(q?.ancla).toContain('cuarenta personas');
    expect(buscarPregunta(PLAN, 'O2-a:vaga')?.texto).toBe(PLAN.objectives[1]?.candidates[0]?.followup_if_vague);
    expect(buscarPregunta(PLAN, 'O2-a:solida')?.tipo).toBe('seguimiento');
    expect(buscarPregunta(PLAN, 'T1')?.objetivoId).toBe('O2');
    expect(buscarPregunta(PLAN, 'apertura')?.texto).toBe(PLAN.opener);
    expect(buscarPregunta(PLAN, 'O9-a')).toBeNull();
    expect(buscarPregunta(PLAN, 'T1:vaga')).toBeNull();
  });

  test('separarContexto parte la frase en contexto y pregunta', () => {
    expect(separarContexto('Elegiste una encuesta en línea en vez de entrevistas. ¿Por qué tomaste esa decisión?')).toEqual({
      contexto: 'Elegiste una encuesta en línea en vez de entrevistas.',
      pregunta: '¿Por qué tomaste esa decisión?',
    });
    expect(separarContexto('¿Qué cambiarías primero?')).toEqual({ contexto: '', pregunta: '¿Qué cambiarías primero?' });
    expect(separarContexto('Sin signos de pregunta')).toEqual({ contexto: '', pregunta: 'Sin signos de pregunta' });
    expect(separarContexto('  Para empezar, ¿de qué trata tu trabajo?  ')).toEqual({
      contexto: 'Para empezar,',
      pregunta: '¿de qué trata tu trabajo?',
    });
  });
});

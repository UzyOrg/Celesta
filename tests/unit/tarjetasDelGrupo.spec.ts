import { expect, test } from '@playwright/test';
import { LIMITES_TARJETAS } from '../../src/components/revision/catalogo';
import { resumenDelGrupo } from '../../src/components/revision/derivados';
import { ESCENAS_DE_MAQUETA, maquetaDelAsistente } from '../../src/components/revision/maquetas';
import { ACTIVIDAD_PROFESOR, ALUMNO_BUSCADO, ALUMNOS, DESCARGA_DEMO, OBJETIVOS, OTRAS_ACTIVIDADES, PROFESORA } from '../../src/components/revision/mock';
import { listaFiltrada, objetivoDeCerca, ritmoDelGrupo } from '../../src/components/revision/tarjetasDelGrupo';
import type { Alumno, DatosGrupo } from '../../src/components/revision/types';

/**
 * Las tarjetas nuevas del catálogo del asistente salen de la lista de alumnos,
 * con sus topes, igual que las cifras de `derivados.ts`.
 */

const GRUPO: DatosGrupo = {
  profesora: PROFESORA,
  actividad: ACTIVIDAD_PROFESOR,
  alumnos: ALUMNOS,
  alumnoBuscado: ALUMNO_BUSCADO,
  otrasActividades: OTRAS_ACTIVIDADES,
  descarga: DESCARGA_DEMO,
};

test('la lista de quienes llegaron tarde trae a cada uno con su acción', () => {
  const lista = listaFiltrada(ALUMNOS, 'tarde');
  expect(lista.total).toBe(3);
  expect(lista.filas.map((fila) => fila.matricula).sort()).toEqual(['20231368', '20231377', '20231418']);
  const salazar = lista.filas.find((fila) => fila.matricula === '20231368');
  expect(salazar?.accion).toBe('bajar');
  expect(salazar?.etiquetas.map((etiqueta) => etiqueta.texto)).toEqual(['Entregó tarde']);
});

test('una lista sin nadie trae su frase de vacío', () => {
  const lista = listaFiltrada([], 'incompleta');
  expect(lista.filas).toHaveLength(0);
  expect(lista.total).toBe(0);
  expect(lista.vacio).toBe('Ninguna defensa quedó incompleta.');
});

test('la lista respeta el tope de filas y dice cuántos son en total', () => {
  const base = ALUMNOS.find((alumno) => alumno.matricula === '20231457') as Alumno;
  const muchos: Alumno[] = Array.from({ length: LIMITES_TARJETAS.filasLista + 7 }, (_, indice) => ({
    ...base,
    matricula: String(30000000 + indice),
    nombre: `Persona ${indice}`,
    entregaTardia: true,
  }));
  const lista = listaFiltrada(muchos, 'tarde');
  expect(lista.filas).toHaveLength(LIMITES_TARJETAS.filasLista);
  expect(lista.total).toBe(LIMITES_TARJETAS.filasLista + 7);
});

test('el nivel en un objetivo solo cuenta a quienes defendieron', () => {
  const objetivo = OBJETIVOS[0];
  if (!objetivo) throw new Error('falta el objetivo 1');
  const lista = listaFiltrada(ALUMNOS, 'nivel-en-objetivo', { objetivo, nivel: 'no-salio' });
  expect(lista.filas.map((fila) => fila.matricula)).toEqual(['20231323']);
});

test('un objetivo de cerca coincide con el conteo del grupo', () => {
  const datos = objetivoDeCerca(ALUMNOS, OBJETIVOS, 2);
  expect(datos).not.toBeNull();
  if (!datos) return;
  const enParte = datos.porNivel.find((grupo) => grupo.nivel === 'en-parte');
  expect(enParte?.total).toBe(datos.conteo.enParte);
  expect(enParte?.personas.length).toBeLessThanOrEqual(LIMITES_TARJETAS.nombresPorNivel);
  expect(datos.defendieron).toBe(resumenDelGrupo(ALUMNOS).defendieron);
});

test('el ritmo cuenta entregas y defensas por día, sin duración típica con pocos datos', () => {
  const ritmo = ritmoDelGrupo(ALUMNOS, ACTIVIDAD_PROFESOR.cierre);
  const resumen = resumenDelGrupo(ALUMNOS);
  expect(ritmo.dias.reduce((suma, dia) => suma + dia.entregas, 0)).toBe(resumen.entregaron);
  expect(ritmo.dias.reduce((suma, dia) => suma + dia.defensas, 0)).toBe(resumen.defendieron);
  expect(ritmo.dias.filter((dia) => dia.esCierre).map((dia) => dia.dia)).toEqual(['vie 9']);
  expect(ritmo.tarde).toEqual({ entregas: 2, defensas: 2 });
  expect(ritmo.duracionTipica).toBeNull();
});

test('cada maqueta respeta el tope de tarjetas y no lleva porcentajes', () => {
  for (const escena of ESCENAS_DE_MAQUETA) {
    const maqueta = maquetaDelAsistente(GRUPO, escena);
    expect(maqueta.tarjetas.length).toBeLessThanOrEqual(LIMITES_TARJETAS.porRespuesta);
    // Las frases de rechazo sí nombran la sospecha o la calificación, para decir que no las hay.
    expect(maqueta.texto).not.toMatch(/%|por ciento/i);
  }
});

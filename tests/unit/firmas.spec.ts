import '../support/sinServerOnly';
import { expect, test } from '@playwright/test';
import { DefensaError } from '../../src/lib/defensa/errores';
import {
  emitirAccesoProfesor,
  emitirSesionAlumno,
  firmarToken,
  generarSemilla,
  generarTokenGrupo,
  leerPortador,
  verificarToken,
} from '../../src/lib/defensa/firmas';

const CLAVE = 'una-clave-de-prueba-con-mas-de-32-caracteres';
const OTRA = 'otra-clave-distinta-con-mas-de-32-caracteres!';
const AHORA = 1_800_000_000_000;

test.describe('enlaces firmados de las defensas', () => {
  test('una sesión de alumno verifica y devuelve lo firmado', () => {
    const token = firmarToken({ p: 'a', al: 'alumno-1', ac: 'act-1', iat: AHORA, exp: AHORA + 1000 }, CLAVE);
    const resultado = verificarToken(token, 'a', AHORA + 999, CLAVE);
    expect(resultado).toEqual({
      ok: true,
      claims: { p: 'a', al: 'alumno-1', ac: 'act-1', iat: AHORA, exp: AHORA + 1000 },
    });
  });

  test('caduca justo al llegar a la expiración', () => {
    const token = firmarToken({ p: 'r', ac: 'act-1', v: 3, iat: AHORA, exp: AHORA + 1000 }, CLAVE);
    expect(verificarToken(token, 'r', AHORA + 999, CLAVE).ok).toBe(true);
    expect(verificarToken(token, 'r', AHORA + 1000, CLAVE)).toEqual({ ok: false, razon: 'caducado' });
  });

  test('otra clave, otro propósito o un token alterado no verifican', () => {
    const alumno = firmarToken({ p: 'a', al: 'alumno-1', ac: 'act-1', iat: AHORA, exp: AHORA + 1000 }, CLAVE);

    expect(verificarToken(alumno, 'a', AHORA, OTRA)).toEqual({ ok: false, razon: 'firma' });
    // El propósito va dentro de lo firmado: una sesión de alumno nunca abre el acceso del profesor.
    expect(verificarToken(alumno, 'r', AHORA, CLAVE)).toEqual({ ok: false, razon: 'firma' });

    const [carga, firma] = alumno.split('.');
    const otraCarga = Buffer.from(
      JSON.stringify({ p: 'a', al: 'alumno-2', ac: 'act-1', iat: AHORA, exp: AHORA + 1000 }),
    ).toString('base64url');
    expect(verificarToken(`${otraCarga}.${firma}`, 'a', AHORA, CLAVE)).toEqual({ ok: false, razon: 'firma' });
    expect(verificarToken(`${carga}.${firma?.slice(0, -1)}A`, 'a', AHORA, CLAVE)).toEqual({ ok: false, razon: 'firma' });
  });

  test('los tokens con forma rara se rechazan sin lanzar', () => {
    for (const token of ['', 'sin-punto', 'a.b.c', '.', 'a.', '.b', 'x'.repeat(2_000)]) {
      const resultado = verificarToken(token, 'a', AHORA, CLAVE);
      expect(resultado.ok, token.slice(0, 20)).toBe(false);
    }
  });

  test('una carga firmada con claims incompletos o absurdos no pasa', () => {
    // Firmada con la clave correcta pero sin los campos que exige el propósito.
    const mal = firmarToken({ p: 'r', ac: 'act-1', v: 0, iat: AHORA, exp: AHORA + 1000 }, CLAVE);
    expect(verificarToken(mal, 'r', AHORA, CLAVE)).toEqual({ ok: false, razon: 'malformado' });

    const alReves = firmarToken({ p: 'a', al: 'a', ac: 'b', iat: AHORA + 5000, exp: AHORA + 1000 }, CLAVE);
    expect(verificarToken(alReves, 'a', AHORA, CLAVE)).toEqual({ ok: false, razon: 'malformado' });
  });

  test('un secreto corto no firma ni verifica', () => {
    expect(() => firmarToken({ p: 'r', ac: 'a', v: 1, iat: 1, exp: 2 }, 'corto')).toThrow(DefensaError);
  });

  test('emitir usa el secreto del entorno y falla cerrado sin él', () => {
    const anterior = process.env.DEFENSA_SIGNING_SECRET;
    try {
      delete process.env.DEFENSA_SIGNING_SECRET;
      expect(() => emitirSesionAlumno('al', 'ac')).toThrow(/no está configurado/);

      process.env.DEFENSA_SIGNING_SECRET = CLAVE;
      const sesion = emitirSesionAlumno('al', 'ac', AHORA);
      expect(sesion.expiraEn).toBeGreaterThan(AHORA);
      expect(verificarToken(sesion.token, 'a', AHORA + 1).ok).toBe(true);

      const acceso = emitirAccesoProfesor('ac', 4, { ahora: AHORA, duracionMs: 5_000 });
      const verificado = verificarToken(acceso.token, 'r', AHORA + 1);
      expect(verificado.ok && verificado.claims.v).toBe(4);
      expect(verificarToken(acceso.token, 'r', AHORA + 5_000)).toEqual({ ok: false, razon: 'caducado' });
    } finally {
      if (anterior === undefined) delete process.env.DEFENSA_SIGNING_SECRET;
      else process.env.DEFENSA_SIGNING_SECRET = anterior;
    }
  });

  test('el portador sale solo de un encabezado Authorization bien formado', () => {
    const conEncabezado = (valor?: string) =>
      new Request('http://localhost/x', valor ? { headers: { authorization: valor } } : {});

    expect(leerPortador(conEncabezado('Bearer abcdefghijklmnop.qrstuv'))).toBe('abcdefghijklmnop.qrstuv');
    for (const malo of [undefined, 'Basic abcdefghijklmnop', 'Bearer corto', 'Bearer con espacio malo', 'Bearer ']) {
      expect(() => leerPortador(conEncabezado(malo)), String(malo)).toThrow(DefensaError);
    }
  });

  test('el código de grupo y la semilla cumplen su formato', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => generarTokenGrupo()));
    expect(tokens.size).toBe(200);
    for (const token of Array.from(tokens)) expect(token).toMatch(/^[a-z0-9]{14}$/);

    for (let i = 0; i < 200; i += 1) {
      const semilla = generarSemilla();
      expect(Number.isInteger(semilla)).toBe(true);
      expect(semilla).toBeGreaterThan(0);
      expect(semilla).toBeLessThanOrEqual(0x7fffffff);
    }
  });
});

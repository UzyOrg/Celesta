import { expect, test } from '@playwright/test';
import { isRetiredProductionPath } from '../../src/lib/server/productionSurface';

test.describe('las defensas orales están ocultas en producción mientras no se abran', () => {
  const rutas = [
    '/defensa',
    '/defensa/abc123',
    '/defensa/abc123/lo-que-sea',
    '/revision',
    '/revision/token.firma',
    '/revision/token.firma/alumno/20231457',
    '/api/defensa/sesion',
    '/api/defensa/turnos/00000000-0000-0000-0000-000000000000/audio',
    '/api/defensa/mantenimiento',
  ];

  test('en producción se ocultan', () => {
    for (const ruta of rutas) {
      expect(isRetiredProductionPath(ruta, 'production', { defensaPublica: false }), ruta).toBe(true);
    }
  });

  test('con DEFENSA_PUBLICA=1 se abren, sin abrir nada de lo retirado', () => {
    for (const ruta of rutas) {
      expect(isRetiredProductionPath(ruta, 'production', { defensaPublica: true }), ruta).toBe(false);
    }
    expect(isRetiredProductionPath('/dashboard', 'production', { defensaPublica: true })).toBe(true);
    expect(isRetiredProductionPath('/api/teacher/export', 'production', { defensaPublica: true })).toBe(true);
  });

  test('en desarrollo y en pruebas nunca se ocultan', () => {
    for (const ruta of rutas) {
      expect(isRetiredProductionPath(ruta, 'development', { defensaPublica: false }), ruta).toBe(false);
      expect(isRetiredProductionPath(ruta, 'test', { defensaPublica: false }), ruta).toBe(false);
    }
  });

  test('el prefijo respeta los segmentos: /defensas y /revisiones no son /defensa ni /revision', () => {
    for (const ruta of ['/defensas', '/revisiones', '/api/defensas', '/crear', '/api/classify']) {
      expect(isRetiredProductionPath(ruta, 'production', { defensaPublica: false }), ruta).toBe(false);
    }
  });

  test('sin indicar opciones lee DEFENSA_PUBLICA del entorno en cada llamada', () => {
    const anterior = process.env.DEFENSA_PUBLICA;
    try {
      delete process.env.DEFENSA_PUBLICA;
      expect(isRetiredProductionPath('/defensa/x', 'production')).toBe(true);
      process.env.DEFENSA_PUBLICA = '1';
      expect(isRetiredProductionPath('/defensa/x', 'production')).toBe(false);
      process.env.DEFENSA_PUBLICA = 'true';
      expect(isRetiredProductionPath('/defensa/x', 'production')).toBe(true);
    } finally {
      if (anterior === undefined) delete process.env.DEFENSA_PUBLICA;
      else process.env.DEFENSA_PUBLICA = anterior;
    }
  });
});

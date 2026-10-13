import { expect, test } from '@playwright/test';
import {
  claveDeOrden,
  diaConMes,
  diaDeBorradoDelAudio,
  diaLargo,
  leerMarca,
  marcaCapital,
  marcaCorta,
  marcaDeFecha,
  marcaLargaConMes,
  nombreDelDia,
} from '../../src/components/revision/fechas';

test.describe('marcaDeFecha · hora de México', () => {
  test('da día, hora y mes en español, con el instante exacto', () => {
    const marca = marcaDeFecha(new Date('2026-10-09T21:05:00-06:00'));
    expect(marca).toEqual({ dia: 'vie 9', hora: '21:05', mes: 'octubre', instante: Date.parse('2026-10-09T21:05:00-06:00') });
  });

  test('usa la hora de México aunque el servidor esté en otra zona', () => {
    // 03:12 UTC del sábado 10 es todavía el viernes 9 a las 21:12 en México.
    const marca = marcaDeFecha(new Date('2026-10-10T03:12:00Z'));
    expect([marca.dia, marca.hora]).toEqual(['vie 9', '21:12']);
    const pasadaLaMedianoche = marcaDeFecha(new Date('2026-10-10T07:12:00Z'));
    expect([pasadaLaMedianoche.dia, pasadaLaMedianoche.hora]).toEqual(['sáb 10', '01:12']);
  });

  test('la hora siempre lleva dos dígitos y la medianoche es 00', () => {
    expect(marcaDeFecha(new Date('2026-10-09T06:05:00Z')).hora).toBe('00:05');
    expect(marcaDeFecha(new Date('2026-10-09T15:07:00Z')).hora).toBe('09:07');
  });

  test('cambia de mes y de día de la semana correctamente', () => {
    const marca = marcaDeFecha(new Date('2026-11-28T23:59:00-06:00'));
    expect([marca.dia, marca.mes]).toEqual(['sáb 28', 'noviembre']);
    expect(marcaDeFecha(new Date('2026-03-04T12:00:00-06:00')).dia).toBe('mié 4');
    expect(marcaDeFecha(new Date('2026-10-11T12:00:00-06:00')).dia).toBe('dom 11');
  });
});

test.describe('formatos de la interfaz', () => {
  const entrega = marcaDeFecha(new Date('2026-10-09T21:05:00-06:00'));

  test('días y marcas', () => {
    expect(diaLargo('vie 9')).toBe('viernes 9');
    expect(diaLargo('mié 14')).toBe('miércoles 14');
    expect(nombreDelDia('sáb 10')).toBe('sábado');
    expect(diaConMes('vie 9')).toBe('viernes 9 de octubre');
    expect(diaConMes('lun 2', 'noviembre')).toBe('lunes 2 de noviembre');
    expect(marcaCorta(entrega)).toBe('vie 9 oct, 21:05');
    expect(marcaCorta({ dia: 'lun 2', hora: '08:00', mes: 'noviembre' })).toBe('lun 2 nov, 08:00');
    expect(marcaLargaConMes(entrega)).toBe('viernes 9 de octubre a las 21:05');
    expect(marcaCapital(entrega)).toBe('Viernes 9, 21:05');
  });

  test('una marca sin mes (el escenario de ejemplo) se entiende de octubre', () => {
    expect(marcaCorta({ dia: 'vie 9', hora: '21:05' })).toBe('vie 9 oct, 21:05');
    expect(marcaLargaConMes({ dia: 'vie 9', hora: '23:59' })).toBe('viernes 9 de octubre a las 23:59');
  });

  test('el borrado del audio suma siete días de calendario, también al cambiar de mes', () => {
    expect(diaDeBorradoDelAudio(entrega)).toBe('viernes 16 de octubre');
    expect(diaDeBorradoDelAudio(marcaDeFecha(new Date('2026-10-28T10:00:00-06:00')))).toBe('miércoles 4 de noviembre');
    expect(diaDeBorradoDelAudio(marcaDeFecha(new Date('2026-12-30T10:00:00-06:00')))).toBe('miércoles 6 de enero');
    // El ejemplo no trae instante: suma al número del día, como antes.
    expect(diaDeBorradoDelAudio({ dia: 'vie 9', hora: '21:32' })).toBe('viernes 16 de octubre');
  });

  test('ordenar: con instante cruza meses; sin él funciona como en el ejemplo', () => {
    const fin = marcaDeFecha(new Date('2026-10-31T10:00:00-06:00'));
    const inicio = marcaDeFecha(new Date('2026-11-02T10:00:00-06:00'));
    expect(claveDeOrden(inicio)).toBeGreaterThan(claveDeOrden(fin));
    expect(claveDeOrden({ dia: 'vie 9', hora: '21:05' })).toBeLessThan(claveDeOrden({ dia: 'sáb 10', hora: '01:12' }));
    expect(claveDeOrden(null)).toBe(0);
  });

  test('leerMarca solo acepta el formato del diseño', () => {
    expect(leerMarca('vie 9|21:05')).toEqual({ dia: 'vie 9', hora: '21:05' });
    expect(leerMarca('mié 14|08:30')).toEqual({ dia: 'mié 14', hora: '08:30' });
    for (const malo of ['', 'vie 9', 'viernes 9|21:05', 'vie 9|9:05', 'x|y']) expect(leerMarca(malo), malo).toBeNull();
  });
});

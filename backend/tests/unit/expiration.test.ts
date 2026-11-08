import { daysUntil, expirationStatus, todayInLima } from '../../src/services/expiration';

const TODAY = '2026-11-08';

describe('daysUntil', () => {
  it('cuenta días hacia el futuro y el pasado', () => {
    expect(daysUntil('2026-11-18', TODAY)).toBe(10);
    expect(daysUntil('2026-11-07', TODAY)).toBe(-1);
    expect(daysUntil(TODAY, TODAY)).toBe(0);
  });

  it('cruza fin de mes y de año correctamente', () => {
    expect(daysUntil('2027-01-01', '2026-12-31')).toBe(1);
    expect(daysUntil('2028-03-01', '2028-02-28')).toBe(2); // 2028 es bisiesto
  });
});

describe('expirationStatus', () => {
  it('sin fecha', () => {
    expect(expirationStatus(null, TODAY)).toBe('sin_fecha');
    expect(expirationStatus(undefined, TODAY)).toBe('sin_fecha');
  });

  it('vencido si la fecha ya pasó', () => {
    expect(expirationStatus('2026-11-07', TODAY)).toBe('vencido');
  });

  it('vence hoy: todavía es utilizable, queda "por vencer"', () => {
    expect(expirationStatus(TODAY, TODAY)).toBe('por_vencer');
  });

  it('por vencer hasta 30 días inclusive', () => {
    expect(expirationStatus('2026-12-08', TODAY)).toBe('por_vencer'); // +30
  });

  it('vigente a partir de 31 días', () => {
    expect(expirationStatus('2026-12-09', TODAY)).toBe('vigente'); // +31
  });
});

describe('todayInLima', () => {
  it('usa la fecha de Lima (UTC-5), no la de UTC', () => {
    // 03:00 UTC del día 9 = 22:00 del día 8 en Lima
    expect(todayInLima(new Date('2026-11-09T03:00:00Z'))).toBe('2026-11-08');
    expect(todayInLima(new Date('2026-11-09T06:00:00Z'))).toBe('2026-11-09');
  });
});

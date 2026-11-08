import { applyMovement, InsufficientStockError, isLowStock } from '../../src/services/stock';

describe('applyMovement', () => {
  it('una entrada suma al stock', () => {
    expect(applyMovement(10, 'in', 5)).toBe(15);
  });

  it('una salida resta del stock', () => {
    expect(applyMovement(10, 'out', 4)).toBe(6);
  });

  it('permite sacar exactamente todo el stock', () => {
    expect(applyMovement(10, 'out', 10)).toBe(0);
  });

  it('rechaza una salida mayor al stock con el detalle del error', () => {
    expect.assertions(3);
    try {
      applyMovement(10, 'out', 11);
    } catch (e) {
      expect(e).toBeInstanceOf(InsufficientStockError);
      expect((e as InsufficientStockError).available).toBe(10);
      expect((e as InsufficientStockError).requested).toBe(11);
    }
  });

  it.each([0, -3, 1.5, NaN])('rechaza la cantidad inválida %p', (qty) => {
    expect(() => applyMovement(10, 'in', qty)).toThrow(RangeError);
  });
});

describe('isLowStock', () => {
  it('es true por debajo del mínimo', () => expect(isLowStock(3, 10)).toBe(true));
  it('es true justo en el mínimo', () => expect(isLowStock(10, 10)).toBe(true));
  it('es false por encima del mínimo', () => expect(isLowStock(11, 10)).toBe(false));
});

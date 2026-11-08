export type MovementType = 'in' | 'out';

export class InsufficientStockError extends Error {
  constructor(public available: number, public requested: number) {
    super(`Stock insuficiente: hay ${available} y se pidieron ${requested}`);
  }
}

/** Devuelve el stock resultante de aplicar un movimiento. No toca la base de datos. */
export function applyMovement(current: number, type: MovementType, quantity: number): number {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new RangeError('La cantidad debe ser un entero mayor a 0');
  }
  if (type === 'in') return current + quantity;
  if (quantity > current) throw new InsufficientStockError(current, quantity);
  return current - quantity;
}

export function isLowStock(stock: number, minStock: number): boolean {
  return stock <= minStock;
}

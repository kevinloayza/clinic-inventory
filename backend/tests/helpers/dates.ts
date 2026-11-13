import { todayInLima } from '../../src/services/expiration';

/** Fecha AAAA-MM-DD a n días de hoy (hora de Lima). */
export const plusDays = (n: number): string => {
  const [y, m, d] = todayInLima().split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

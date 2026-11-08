export type ExpirationStatus = 'sin_fecha' | 'vigente' | 'por_vencer' | 'vencido';

/** Un insumo se considera "por vencer" cuando faltan 30 días o menos. */
export const EXPIRING_SOON_DAYS = 30;

const DAY_MS = 86_400_000;
const toUtc = (iso: string): number => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

/** Días entre dos fechas AAAA-MM-DD (negativo si ya pasó). */
export function daysUntil(expiration: string, today: string): number {
  return Math.round((toUtc(expiration) - toUtc(today)) / DAY_MS);
}

export function expirationStatus(expiration: string | null | undefined, today: string): ExpirationStatus {
  if (!expiration) return 'sin_fecha';
  const days = daysUntil(expiration, today);
  if (days < 0) return 'vencido';
  if (days <= EXPIRING_SOON_DAYS) return 'por_vencer';
  return 'vigente';
}

/** Fecha de hoy (AAAA-MM-DD) en hora de Perú, para no desfasarse por la zona horaria del servidor. */
export function todayInLima(now: Date = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
}

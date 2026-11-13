import { expirationStatus, todayInLima } from './expiration';

// to_char evita que el driver convierta la fecha a un Date con desfase de zona horaria
export const SUPPLY_COLS = `id, name, unit, stock, min_stock, to_char(expiration_date, 'YYYY-MM-DD') AS expiration_date`;

export const withStatus = <T extends { expiration_date: string | null }>(row: T) => ({
  ...row,
  expiration_status: expirationStatus(row.expiration_date, todayInLima()),
});

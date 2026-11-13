const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type ExpirationStatus = 'sin_fecha' | 'vigente' | 'por_vencer' | 'vencido';
export type Supply = {
  id: number; name: string; unit: string; stock: number; min_stock: number;
  expiration_date: string | null; expiration_status: ExpirationStatus;
};
export type Movement = {
  id: number; supply_id: number; supply_name: string; unit: string;
  type: 'in' | 'out'; quantity: number; note: string | null; created_at: string;
  patient_name: string | null;
};
export type Patient = { id: number; full_name: string; dni: string; birth_date: string };

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? 'No se pudo completar la operación');
  return data as T;
}

/** '1985-03-14' -> '14/03/1985' (formato usado en Perú) */
export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export type Dashboard = {
  totals: { supplies: number; low_stock: number; expired: number; expiring: number; patients: number };
  low_stock: Supply[];
  expiring: Supply[];
  recent_movements: Omit<Movement, 'supply_id'>[];
};

/** { q: 'a', status: '' } -> '?q=a' (omite los valores vacíos) */
export function qs(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  }
  const text = sp.toString();
  return text ? `?${text}` : '';
}

/** Fecha de hoy en Lima, AAAA-MM-DD */
export const todayLima = (): string => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

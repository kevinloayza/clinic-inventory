import request from 'supertest';
import { createApp } from '../../src/app';
import { plusDays } from '../helpers/dates';
import { createTestPool, resetDb } from '../helpers/db';

const pool = createTestPool();
const app = createApp(pool);

beforeEach(() => resetDb(pool));
afterAll(() => pool.end());

const supply = async (name: string, stock: number, min_stock: number, expiration_date?: string) =>
  (await request(app).post('/api/supplies').send({ name, unit: 'u', stock, min_stock, expiration_date })).body;

describe('GET /api/dashboard', () => {
  it('con la base vacía devuelve ceros y listas vacías', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.totals).toEqual({ supplies: 0, low_stock: 0, expired: 0, expiring: 0, patients: 0 });
    expect(res.body.low_stock).toEqual([]);
    expect(res.body.expiring).toEqual([]);
    expect(res.body.recent_movements).toEqual([]);
  });

  it('cuenta insumos por estado y arma las listas', async () => {
    await supply('Bajo', 2, 5);
    const vencido = await supply('Vencido', 20, 5, plusDays(-1));
    await supply('Por vencer', 20, 5, plusDays(10));
    await supply('Vigente', 20, 5, plusDays(100));
    await request(app).post('/api/patients').send({ full_name: 'Ana Torres', dni: '12345678', birth_date: '2000-01-01' });

    const res = await request(app).get('/api/dashboard');
    expect(res.body.totals).toEqual({ supplies: 4, low_stock: 1, expired: 1, expiring: 1, patients: 1 });
    expect(res.body.low_stock.map((s: { name: string }) => s.name)).toEqual(['Bajo']);
    // vencidos primero, luego los próximos a vencer
    expect(res.body.expiring.map((s: { name: string }) => s.name)).toEqual(['Vencido', 'Por vencer']);
    expect(res.body.expiring[0]).toMatchObject({ id: vencido.id, expiration_status: 'vencido' });
  });

  it('lista los últimos 5 movimientos, el más reciente primero, con el paciente', async () => {
    const s = await supply('Jeringa', 100, 5);
    const p = (await request(app).post('/api/patients').send({ full_name: 'Ana Torres', dni: '12345678', birth_date: '2000-01-01' })).body;
    for (let i = 1; i <= 6; i++) {
      await request(app).post('/api/movements').send({ supply_id: s.id, type: 'out', quantity: i, note: `n${i}`, patient_id: i === 6 ? p.id : undefined });
    }
    const res = await request(app).get('/api/dashboard');
    expect(res.body.recent_movements).toHaveLength(5);
    expect(res.body.recent_movements[0]).toMatchObject({ note: 'n6', patient_name: 'Ana Torres' });
    expect(res.body.recent_movements[4].note).toBe('n2');
  });
});

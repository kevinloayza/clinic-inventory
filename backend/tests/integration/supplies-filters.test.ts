import request from 'supertest';
import { createApp } from '../../src/app';
import { plusDays } from '../helpers/dates';
import { createTestPool, resetDb } from '../helpers/db';

const pool = createTestPool();
const app = createApp(pool);

beforeEach(async () => {
  await resetDb(pool);
  const mk = (name: string, stock: number, min_stock: number, expiration_date?: string) =>
    request(app).post('/api/supplies').send({ name, unit: 'u', stock, min_stock, expiration_date });
  await mk('Paracetamol 500 mg', 50, 10, plusDays(200));
  await mk('Paracetamol infantil', 3, 10);
  await mk('Gasas estériles', 20, 5, plusDays(10));
  await mk('Alcohol 70%', 8, 5, plusDays(-3));
});
afterAll(() => pool.end());

const names = async (query: string): Promise<string[]> =>
  (await request(app).get(`/api/supplies${query}`)).body.map((s: { name: string }) => s.name);

describe('Insumos: búsqueda y filtros', () => {
  it('sin filtros devuelve todos ordenados por nombre', async () => {
    expect(await names('')).toEqual(['Alcohol 70%', 'Gasas estériles', 'Paracetamol 500 mg', 'Paracetamol infantil']);
  });

  it('busca por parte del nombre sin distinguir mayúsculas', async () => {
    expect(await names('?q=PARACE')).toEqual(['Paracetamol 500 mg', 'Paracetamol infantil']);
  });

  it('devuelve lista vacía si nada coincide', async () => {
    expect(await names('?q=zzzz')).toEqual([]);
  });

  it('filtra por stock bajo', async () => {
    expect(await names('?status=low')).toEqual(['Paracetamol infantil']);
  });

  it('filtra por vencidos', async () => {
    expect(await names('?status=expired')).toEqual(['Alcohol 70%']);
  });

  it('filtra por por vencer (no incluye vencidos ni vigentes)', async () => {
    expect(await names('?status=expiring')).toEqual(['Gasas estériles']);
  });

  it('combina búsqueda y filtro', async () => {
    expect(await names('?q=paracetamol&status=low')).toEqual(['Paracetamol infantil']);
  });

  it('trata los parámetros vacíos como no enviados', async () => {
    expect(await names('?q=&status=')).toHaveLength(4);
  });

  it('rechaza un estado inválido con 400', async () => {
    const res = await request(app).get('/api/supplies?status=otro');
    expect(res.status).toBe(400);
  });
});

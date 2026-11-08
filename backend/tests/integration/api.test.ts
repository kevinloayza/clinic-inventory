import request from 'supertest';
import { createApp } from '../../src/app';
import { todayInLima } from '../../src/services/expiration';
import { createTestPool, resetDb } from '../helpers/db';

const pool = createTestPool();
const app = createApp(pool);

beforeEach(() => resetDb(pool));
afterAll(() => pool.end());

const newSupply = async (name = 'Paracetamol', stock = 10, min_stock = 2) =>
  (await request(app).post('/api/supplies').send({ name, unit: 'cajas', stock, min_stock })).body;

const stockOf = async (id: number): Promise<number> => {
  const { rows } = await pool.query('SELECT stock FROM supplies WHERE id=$1', [id]);
  return rows[0].stock;
};

describe('GET /api/health', () => {
  it('responde ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('informa el commit desplegado cuando la plataforma lo entrega', async () => {
    process.env.RENDER_GIT_COMMIT = 'abc123';
    try {
      const res = await request(app).get('/api/health');
      expect(res.body.commit).toBe('abc123');
    } finally {
      delete process.env.RENDER_GIT_COMMIT;
    }
    expect((await request(app).get('/api/health')).body.commit).toBeNull();
  });
});

describe('Insumos', () => {
  it('crea un insumo', async () => {
    const res = await request(app).post('/api/supplies').send({ name: 'Gasas', unit: 'paquetes', stock: 20, min_stock: 5 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Gasas', unit: 'paquetes', stock: 20, min_stock: 5 });
  });

  it('rechaza un nombre vacío', async () => {
    const res = await request(app).post('/api/supplies').send({ name: '  ', unit: 'cajas' });
    expect(res.status).toBe(400);
  });

  it('rechaza un nombre duplicado con 409', async () => {
    await newSupply('Gasas');
    const res = await request(app).post('/api/supplies').send({ name: 'Gasas', unit: 'cajas' });
    expect(res.status).toBe(409);
  });

  it('edita nombre, unidad y mínimo, pero NO el stock', async () => {
    const s = await newSupply('Gasas', 10);
    const res = await request(app).put(`/api/supplies/${s.id}`).send({ name: 'Gasas estériles', unit: 'bolsas', min_stock: 3, stock: 999 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'Gasas estériles', unit: 'bolsas', min_stock: 3, stock: 10 });
  });

  it('devuelve 404 al editar o eliminar uno inexistente', async () => {
    expect((await request(app).put('/api/supplies/999').send({ name: 'x', unit: 'y' })).status).toBe(404);
    expect((await request(app).delete('/api/supplies/999')).status).toBe(404);
  });

  it('elimina un insumo y su historial', async () => {
    const s = await newSupply();
    await request(app).post('/api/movements').send({ supply_id: s.id, type: 'out', quantity: 1 });
    expect((await request(app).delete(`/api/supplies/${s.id}`)).status).toBe(204);
    const { rows } = await pool.query('SELECT 1 FROM movements WHERE supply_id=$1', [s.id]);
    expect(rows).toHaveLength(0);
  });
});

describe('Movimientos', () => {
  it('una entrada aumenta el stock', async () => {
    const s = await newSupply('A', 10);
    const res = await request(app).post('/api/movements').send({ supply_id: s.id, type: 'in', quantity: 5 });
    expect(res.status).toBe(201);
    expect(res.body.stock).toBe(15);
    expect(await stockOf(s.id)).toBe(15);
  });

  it('una salida disminuye el stock y puede dejarlo en cero', async () => {
    const s = await newSupply('A', 10);
    const res = await request(app).post('/api/movements').send({ supply_id: s.id, type: 'out', quantity: 10 });
    expect(res.status).toBe(201);
    expect(await stockOf(s.id)).toBe(0);
  });

  it('rechaza una salida mayor al stock: 409, sin cambiar el stock y sin guardar el movimiento', async () => {
    const s = await newSupply('A', 10);
    const res = await request(app).post('/api/movements').send({ supply_id: s.id, type: 'out', quantity: 11 });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Stock insuficiente/);
    expect(await stockOf(s.id)).toBe(10);
    const { rows } = await pool.query('SELECT 1 FROM movements');
    expect(rows).toHaveLength(0);
  });

  it('devuelve 404 si el insumo no existe', async () => {
    const res = await request(app).post('/api/movements').send({ supply_id: 999, type: 'in', quantity: 1 });
    expect(res.status).toBe(404);
  });

  it.each([
    ['cantidad 0', { type: 'in', quantity: 0 }],
    ['cantidad negativa', { type: 'out', quantity: -2 }],
    ['cantidad decimal', { type: 'in', quantity: 1.5 }],
    ['tipo inválido', { type: 'transfer', quantity: 1 }],
  ])('rechaza %s con 400', async (_label, body) => {
    const s = await newSupply();
    const res = await request(app).post('/api/movements').send({ supply_id: s.id, ...body });
    expect(res.status).toBe(400);
  });

  it('dos salidas simultáneas nunca dejan el stock negativo', async () => {
    const s = await newSupply('A', 10);
    const send = () => request(app).post('/api/movements').send({ supply_id: s.id, type: 'out', quantity: 8 });
    const results = await Promise.all([send(), send()]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await stockOf(s.id)).toBe(2);
  });

  it('lista el historial (más reciente primero) y filtra por insumo', async () => {
    const a = await newSupply('A', 10);
    const b = await newSupply('B', 10);
    await request(app).post('/api/movements').send({ supply_id: a.id, type: 'out', quantity: 1, note: 'primero' });
    await request(app).post('/api/movements').send({ supply_id: b.id, type: 'in', quantity: 2 });
    await request(app).post('/api/movements').send({ supply_id: a.id, type: 'in', quantity: 3, note: 'último de A' });

    const all = await request(app).get('/api/movements');
    expect(all.body).toHaveLength(3);
    expect(all.body[0].note).toBe('último de A');

    const onlyA = await request(app).get(`/api/movements?supply_id=${a.id}`);
    expect(onlyA.body).toHaveLength(2);
    expect(onlyA.body.every((m: { supply_name: string }) => m.supply_name === 'A')).toBe(true);
  });
});

describe('Pacientes: búsqueda', () => {
  const add = (full_name: string, dni: string, birth_date = '1990-01-01') =>
    request(app).post('/api/patients').send({ full_name, dni, birth_date });

  beforeEach(async () => {
    await add('María Fernández Quispe', '45678123', '1985-03-14');
    await add('Carlos Ramírez Soto', '40123987', '1972-11-02');
    await add('Lucía Paredes Vega', '71234560', '1996-07-21');
  });

  it('sin criterio devuelve todos, ordenados por nombre', async () => {
    const res = await request(app).get('/api/patients');
    expect(res.body.map((p: { full_name: string }) => p.full_name)).toEqual([
      'Carlos Ramírez Soto', 'Lucía Paredes Vega', 'María Fernández Quispe',
    ]);
  });

  it('busca por parte del nombre sin distinguir mayúsculas', async () => {
    const res = await request(app).get('/api/patients?q=FERN');
    expect(res.body).toHaveLength(1);
    expect(res.body[0].full_name).toBe('María Fernández Quispe');
  });

  it('busca por DNI (inicio del número)', async () => {
    const res = await request(app).get('/api/patients?q=4012');
    expect(res.body).toHaveLength(1);
    expect(res.body[0].dni).toBe('40123987');
  });

  it('devuelve lista vacía si no hay coincidencias', async () => {
    const res = await request(app).get('/api/patients?q=zzzz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('devuelve la fecha de nacimiento como AAAA-MM-DD', async () => {
    const res = await request(app).get('/api/patients?q=45678123');
    expect(res.body[0].birth_date).toBe('1985-03-14');
  });
});

describe('Pacientes: registro', () => {
  const body = { full_name: 'Ana Torres', dni: '12345678', birth_date: '2000-05-05' };

  it('registra un paciente', async () => {
    const res = await request(app).post('/api/patients').send(body);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject(body);
  });

  it.each(['1234567', '123456789', 'abcdefgh'])('rechaza el DNI inválido %p', async (dni) => {
    const res = await request(app).post('/api/patients').send({ ...body, dni });
    expect(res.status).toBe(400);
  });

  it('rechaza un DNI duplicado con 409', async () => {
    await request(app).post('/api/patients').send(body);
    const res = await request(app).post('/api/patients').send({ ...body, full_name: 'Otra Persona' });
    expect(res.status).toBe(409);
  });
});

describe('Insumos: fecha de vencimiento', () => {
  const plusDays = (n: number): string => {
    const [y, m, d] = todayInLima().split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
  };
  const create = (expiration_date?: string | null) =>
    request(app).post('/api/supplies').send({ name: 'Vacuna', unit: 'dosis', stock: 5, expiration_date });

  it('guarda la fecha y la devuelve como AAAA-MM-DD, sin desfase de zona horaria', async () => {
    const res = await create('2030-06-15');
    expect(res.status).toBe(201);
    expect(res.body.expiration_date).toBe('2030-06-15');
    expect(res.body.expiration_status).toBe('vigente');
  });

  it('es opcional: sin fecha el estado es sin_fecha', async () => {
    const res = await create();
    expect(res.status).toBe(201);
    expect(res.body.expiration_date).toBeNull();
    expect(res.body.expiration_status).toBe('sin_fecha');
  });

  it('calcula el estado según la fecha', async () => {
    const vencido = await create(plusDays(-1));
    expect(vencido.body.expiration_status).toBe('vencido');
    await resetDb(pool);
    const porVencer = await create(plusDays(10));
    expect(porVencer.body.expiration_status).toBe('por_vencer');
  });

  it.each(['2026-13-45', '2026-02-30', 'ayer', '15/06/2030'])('rechaza la fecha inválida %p con 400', async (fecha) => {
    const res = await create(fecha);
    expect(res.status).toBe(400);
  });

  it('se puede editar y también borrar al editar', async () => {
    const s = (await create('2030-06-15')).body;
    const base = { name: s.name, unit: s.unit, min_stock: 0 };

    const changed = await request(app).put(`/api/supplies/${s.id}`).send({ ...base, expiration_date: '2031-01-01' });
    expect(changed.body.expiration_date).toBe('2031-01-01');

    const cleared = await request(app).put(`/api/supplies/${s.id}`).send({ ...base, expiration_date: null });
    expect(cleared.body.expiration_date).toBeNull();
    expect(cleared.body.expiration_status).toBe('sin_fecha');
  });

  it('el listado incluye fecha y estado de cada insumo', async () => {
    await create('2000-01-01');
    const res = await request(app).get('/api/supplies');
    expect(res.body[0]).toMatchObject({ expiration_date: '2000-01-01', expiration_status: 'vencido' });
  });
});

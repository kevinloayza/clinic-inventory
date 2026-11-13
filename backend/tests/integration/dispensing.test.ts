import request from 'supertest';
import { createApp } from '../../src/app';
import { createTestPool, resetDb } from '../helpers/db';

const pool = createTestPool();
const app = createApp(pool);

beforeEach(() => resetDb(pool));
afterAll(() => pool.end());

const supply = async (stock = 10) =>
  (await request(app).post('/api/supplies').send({ name: 'Paracetamol', unit: 'cajas', stock })).body;
const patient = async (dni = '45678123', full_name = 'María Fernández') =>
  (await request(app).post('/api/patients').send({ full_name, dni, birth_date: '1985-03-14' })).body;
const stockOf = async (id: number): Promise<number> =>
  (await pool.query('SELECT stock FROM supplies WHERE id=$1', [id])).rows[0].stock;

describe('Salidas asignadas a un paciente', () => {
  it('registra la salida con paciente y lo muestra en el historial', async () => {
    const s = await supply();
    const p = await patient();
    const res = await request(app).post('/api/movements').send({ supply_id: s.id, type: 'out', quantity: 2, patient_id: p.id });
    expect(res.status).toBe(201);
    expect(res.body.movement.patient_id).toBe(p.id);

    const history = await request(app).get('/api/movements');
    expect(history.body[0]).toMatchObject({ patient_name: 'María Fernández', quantity: 2 });
  });

  it('el paciente es opcional', async () => {
    const s = await supply();
    const res = await request(app).post('/api/movements').send({ supply_id: s.id, type: 'out', quantity: 1 });
    expect(res.status).toBe(201);
    expect((await request(app).get('/api/movements')).body[0].patient_name).toBeNull();
  });

  it('rechaza asignar un paciente a una entrada', async () => {
    const s = await supply();
    const p = await patient();
    const res = await request(app).post('/api/movements').send({ supply_id: s.id, type: 'in', quantity: 1, patient_id: p.id });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Solo las salidas/);
  });

  it('devuelve 404 si el paciente no existe y no toca el stock', async () => {
    const s = await supply(10);
    const res = await request(app).post('/api/movements').send({ supply_id: s.id, type: 'out', quantity: 3, patient_id: 999 });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Paciente/);
    expect(await stockOf(s.id)).toBe(10);
  });

  it('filtra el historial por tipo y por paciente', async () => {
    const s = await supply(50);
    const a = await patient('45678123', 'María Fernández');
    const b = await patient('40123987', 'Carlos Ramírez');
    const send = (body: object) => request(app).post('/api/movements').send({ supply_id: s.id, ...body });
    await send({ type: 'out', quantity: 1, patient_id: a.id });
    await send({ type: 'out', quantity: 2, patient_id: b.id });
    await send({ type: 'in', quantity: 5 });

    expect((await request(app).get('/api/movements?type=in')).body).toHaveLength(1);
    expect((await request(app).get('/api/movements?type=out')).body).toHaveLength(2);
    const byPatient = await request(app).get(`/api/movements?patient_id=${b.id}`);
    expect(byPatient.body).toHaveLength(1);
    expect(byPatient.body[0].quantity).toBe(2);
    expect((await request(app).get('/api/movements?type=otro')).status).toBe(400);
  });

  it('al eliminar un paciente se conserva el movimiento, sin paciente', async () => {
    const s = await supply();
    const p = await patient();
    await request(app).post('/api/movements').send({ supply_id: s.id, type: 'out', quantity: 1, patient_id: p.id });
    expect((await request(app).delete(`/api/patients/${p.id}`)).status).toBe(204);

    const history = (await request(app).get('/api/movements')).body;
    expect(history).toHaveLength(1);
    expect(history[0].patient_name).toBeNull();
  });
});

describe('Pacientes: edición y baja', () => {
  it('edita los datos de un paciente', async () => {
    const p = await patient();
    const res = await request(app).put(`/api/patients/${p.id}`).send({ full_name: 'María F. Quispe', dni: '45678123', birth_date: '1985-03-15' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ full_name: 'María F. Quispe', birth_date: '1985-03-15' });
  });

  it('rechaza un DNI que ya usa otro paciente', async () => {
    await patient('45678123');
    const other = await patient('40123987', 'Carlos Ramírez');
    const res = await request(app).put(`/api/patients/${other.id}`).send({ full_name: 'Carlos Ramírez', dni: '45678123', birth_date: '1972-11-02' });
    expect(res.status).toBe(409);
  });

  it('permite guardar sin cambiar el DNI propio', async () => {
    const p = await patient();
    const res = await request(app).put(`/api/patients/${p.id}`).send({ full_name: 'Otro Nombre', dni: p.dni, birth_date: '1985-03-14' });
    expect(res.status).toBe(200);
  });

  it('valida los datos al editar', async () => {
    const p = await patient();
    const res = await request(app).put(`/api/patients/${p.id}`).send({ full_name: 'X', dni: '12', birth_date: '1985-03-14' });
    expect(res.status).toBe(400);
  });

  it('devuelve 404 al editar o eliminar uno inexistente y 400 si el id es inválido', async () => {
    const body = { full_name: 'X', dni: '12345678', birth_date: '2000-01-01' };
    expect((await request(app).put('/api/patients/999').send(body)).status).toBe(404);
    expect((await request(app).delete('/api/patients/999')).status).toBe(404);
    expect((await request(app).delete('/api/patients/abc')).status).toBe(400);
  });
});

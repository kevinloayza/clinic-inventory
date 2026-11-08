import request from 'supertest';
import { createApp } from '../../src/app';
import { createTestPool } from '../helpers/db';

const pool = createTestPool();
afterAll(() => pool.end());

const originalCors = process.env.CORS_ORIGIN;
afterEach(() => {
  if (originalCors === undefined) delete process.env.CORS_ORIGIN;
  else process.env.CORS_ORIGIN = originalCors;
});

const allowOrigin = (origin: string) =>
  request(createApp(pool)).get('/api/health').set('Origin', origin).then((r) => r.headers['access-control-allow-origin']);

describe('CORS', () => {
  it('permite solo los orígenes configurados (lista separada por comas)', async () => {
    process.env.CORS_ORIGIN = 'https://clinica.vercel.app, http://localhost:3000';
    expect(await allowOrigin('https://clinica.vercel.app')).toBe('https://clinica.vercel.app');
    expect(await allowOrigin('http://localhost:3000')).toBe('http://localhost:3000');
    expect(await allowOrigin('https://sitio-malicioso.com')).toBeUndefined();
  });

  it('sin configuración permite cualquier origen (modo desarrollo)', async () => {
    delete process.env.CORS_ORIGIN;
    expect(await allowOrigin('https://cualquiera.com')).toBe('*');
  });
});

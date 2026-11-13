# Almacén clínico — inventario de insumos médicos

[![CI](https://github.com/kevinloayza/clinic-inventory/actions/workflows/ci.yml/badge.svg)](https://github.com/kevinloayza/clinic-inventory/actions/workflows/ci.yml)

Aplicación full-stack para gestionar entradas y salidas de insumos de una clínica, con búsqueda de pacientes.
Es la base de un proyecto de **CI/CD + QA automatizado** (Jest, Cypress, GitHub Actions).

## Funcionalidades

- **Resumen:** indicadores de insumos con stock bajo, por vencer y vencidos (cada uno abre el listado ya filtrado), lista de reposición y últimos movimientos.
- **Insumos:** alta, edición y baja, con búsqueda por nombre, filtro por estado y exportación a CSV (compatible con Excel).
- **Movimientos:** entradas y salidas con control de stock, entrega opcional a un paciente e historial filtrable por insumo y tipo.
- **Pacientes:** alta, edición y baja, con búsqueda por nombre o DNI.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Backend | Node.js + Express + TypeScript + Zod |
| Base de datos | PostgreSQL 16 (`pg`, SQL plano) |
| Contenedores | Docker Compose |

## Cómo correrlo

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- API: http://localhost:4000/api/health

La base se crea sola con `db/schema.sql` y datos de ejemplo de `db/seed.sql`.
Para reiniciar desde cero: `docker compose down -v`.

### Sin Docker (desarrollo)

```bash
# 1. Postgres con el esquema cargado (o usa: docker compose up db)
# 2. Backend
cd backend && npm install
DATABASE_URL=postgres://clinic:clinic@localhost:5432/clinic npm run dev
# 3. Frontend
cd frontend && npm install && cp .env.example .env.local && npm run dev
```

## API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Estado del servicio |
| GET | `/api/dashboard` | Indicadores, listas de reposición y vencimientos, últimos movimientos |
| GET / POST | `/api/supplies` | Listar (`?q=` nombre, `?status=low\|expiring\|expired`) / crear |
| PUT / DELETE | `/api/supplies/:id` | Editar (sin stock) / eliminar |
| GET / POST | `/api/movements` | Historial (`?supply_id=`, `?type=`, `?patient_id=`) / registrar entrada o salida |
| GET / POST | `/api/patients` | Buscar (`?q=` por nombre o DNI) / registrar |
| PUT / DELETE | `/api/patients/:id` | Editar / eliminar (los movimientos se conservan) |

## Reglas de negocio

- El **stock solo cambia mediante movimientos**, nunca editándolo directamente.
- Una **salida mayor al stock disponible se rechaza** (HTTP 409). Se usa `SELECT … FOR UPDATE` dentro de una transacción para evitar condiciones de carrera.
- DNI de 8 dígitos y único por paciente.
- Los insumos tienen **fecha de vencimiento** opcional: se marcan *Por vencer* (30 días o menos) o *Vencido*, calculado con la fecha de Lima.

> Si ya tenías la base creada antes de este cambio, ejecuta `docker compose down -v` para recrearla con la nueva columna (borra los datos de ejemplo).

## Estructura

```
backend/src/services/stock.ts   lógica pura (la primera candidata a pruebas con Jest)
backend/src/app.ts              createApp(pool): permite inyectar una BD de pruebas
frontend/src/app/*              páginas; los elementos clave llevan data-testid para Cypress
backend/tests/                  Jest: unit/ (lógica) e integration/ (API + Postgres real)
e2e/                            Cypress: flujos de usuario
db/                             esquema y datos de ejemplo
```

## Pruebas

### Backend (Jest + Supertest)

Necesita un Postgres corriendo en `localhost:5432` (por ejemplo `docker compose up db`).
Las pruebas crean y usan una base aparte llamada `clinic_test`, nunca la de desarrollo.

```bash
cd backend
npm install
npm test               # unitarias + integración
npm run test:unit      # solo lógica pura (no necesita base de datos)
npm run test:coverage  # con reporte de cobertura
```

Otra base: `TEST_DATABASE_URL=postgres://usuario:clave@host:5432/mi_base_test npm test` (el nombre debe terminar en `_test`).

### E2E (Cypress)

Con la app levantada (`docker compose up --build`):

```bash
cd e2e
npm install
npm run cy:open   # modo interactivo
npm run cy:run    # modo consola (el que usará el CI)
```

Los flujos cubren: crear insumos, registrar entradas/salidas (incluida la salida bloqueada por stock insuficiente) y buscar pacientes por nombre y DNI.

## Integración y despliegue continuos

```
Pull Request ──► backend-tests (Jest)  ──┐
                 e2e-tests (Cypress)   ──┼─► ✅ merge permitido ─► push a main ─► deploy
                                         └─► ❌ merge bloqueado
```

- **Protección de `main`:** un ruleset exige Pull Request y que `backend-tests` y `e2e-tests` pasen. Nadie sube código sin pruebas.
- **Despliegue automático:** al entrar código a `main`, el job `deploy` (que depende de ambos jobs de pruebas) hace lo siguiente:
  1. Aplica el esquema SQL a la base de producción.
  2. Despliega el backend en Render pidiendo ese commit exacto, y espera a que `/api/health` informe esa versión.
  3. Despliega el frontend en Vercel.

| Pieza | Servicio | Nota |
|---|---|---|
| Frontend | Vercel (plan Hobby) | Sin integración Git: solo despliega el pipeline |
| Backend | Render (Docker, plan free) | Se duerme tras 15 min sin tráfico; la primera petición tarda ~1 min |
| Base de datos | Neon (plan free) | Se suspende tras 5 min inactiva; la primera consulta tarda un poco más |

### Configuración (una sola vez)

1. **Neon:** crea un proyecto (región AWS US East 2) y copia la cadena de conexión (`postgresql://…?sslmode=require`).
2. **Render:** *New → Blueprint*, elige este repositorio y pega `DATABASE_URL`; en `CORS_ORIGIN` pon provisionalmente `http://localhost:3000`. Copia la URL del servicio y, en *Settings → Deploy Hook*, la URL del hook.
3. **Vercel:** desde `frontend/` ejecuta `npx vercel login`, `npx vercel link` (responde **No** si ofrece conectar el repositorio de GitHub) y `npx vercel env add NEXT_PUBLIC_API_URL production` con la URL de Render. Crea un token en vercel.com/account/tokens. `orgId` y `projectId` están en `frontend/.vercel/project.json`.
4. **GitHub → Settings → Secrets and variables → Actions:**
   - *Secrets:* `DATABASE_URL`, `RENDER_DEPLOY_HOOK_URL`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
   - *Variables:* `BACKEND_URL` (URL de Render, sin `/` final) y, al final, `DEPLOY_ENABLED` = `true`
5. En **Render**, actualiza `CORS_ORIGIN` con la URL de producción de Vercel.
6. Datos de ejemplo en producción (opcional, una vez): `cd backend && DATABASE_URL="..." npm run db:init -- --seed`
7. **Actions → CI → Run workflow** (rama `main`) para el primer despliegue.


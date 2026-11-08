# Almacén clínico — inventario de insumos médicos

[![CI](https://github.com/kevinloayza/clinic-inventory/actions/workflows/ci.yml/badge.svg)](https://github.com/kevinloayza/clinic-inventory/actions/workflows/ci.yml)

Aplicación full-stack para gestionar entradas y salidas de insumos de una clínica, con búsqueda de pacientes.
Es la base de un proyecto de **CI/CD + QA automatizado** (Jest, Cypress, GitHub Actions).

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
| GET / POST | `/api/supplies` | Listar / crear insumos |
| PUT / DELETE | `/api/supplies/:id` | Editar (sin stock) / eliminar |
| GET / POST | `/api/movements` | Historial / registrar entrada o salida |
| GET / POST | `/api/patients` | Buscar (`?q=` por nombre o DNI) / registrar |

## Reglas de negocio

- El **stock solo cambia mediante movimientos**, nunca editándolo directamente.
- Una **salida mayor al stock disponible se rechaza** (HTTP 409). Se usa `SELECT … FOR UPDATE` dentro de una transacción para evitar condiciones de carrera.
- DNI de 8 dígitos y único por paciente.

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

## Próximos pasos

1. GitHub Actions + protección de la rama `main`
2. Despliegue automático

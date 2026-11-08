# Almacén clínico — inventario de insumos médicos

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
db/                             esquema y datos de ejemplo
```

## Próximos pasos

1. Pruebas: Jest + Supertest (backend) y Cypress (E2E)
2. GitHub Actions + protección de la rama `main`
3. Despliegue automático

CREATE TABLE IF NOT EXISTS patients (
  id          SERIAL PRIMARY KEY,
  full_name   TEXT NOT NULL,
  dni         TEXT NOT NULL UNIQUE,
  birth_date  DATE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplies (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  unit        TEXT NOT NULL,
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock   INTEGER NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migración: fecha de vencimiento (opcional). Idempotente, también actualiza bases ya existentes.
ALTER TABLE supplies ADD COLUMN IF NOT EXISTS expiration_date DATE;

CREATE TABLE IF NOT EXISTS movements (
  id          SERIAL PRIMARY KEY,
  supply_id   INTEGER NOT NULL REFERENCES supplies(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('in', 'out')),
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_movements_supply ON movements(supply_id, created_at DESC);

-- Migración: una salida puede asignarse a un paciente (opcional)
ALTER TABLE movements ADD COLUMN IF NOT EXISTS patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_movements_patient ON movements(patient_id);
